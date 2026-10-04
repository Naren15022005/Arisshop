package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"arisshop-backend/models"
)

type productCacheEntry struct {
	products  []models.Product
	total     int
	expiresAt time.Time
}

type singleProductCacheEntry struct {
	product   *models.Product
	expiresAt time.Time
}

type Storage struct {
	pool            *pgxpool.Pool
	poolConfig      *pgxpool.Config
	isSupabaseReady bool
	dataDir         string
	mu              sync.RWMutex
	stopMonitor     chan struct{}

	// Respaldo en memoria / caché local
	users    []models.User
	products []models.Product
	orders   []models.Order
	sales    []models.SalesInvoice

	// Caché L1 Read-Through de Alto Rendimiento para Productos
	prodCacheMu sync.RWMutex
	prodCache   map[string]productCacheEntry
	singleCache map[string]singleProductCacheEntry
}

var DB *Storage
var once sync.Once

// InvalidateProductCache purga de inmediato la memoria L1 de productos
func (s *Storage) InvalidateProductCache() {
	s.prodCacheMu.Lock()
	s.prodCache = make(map[string]productCacheEntry)
	s.singleCache = make(map[string]singleProductCacheEntry)
	s.prodCacheMu.Unlock()
}

// InitDB inicializa el pool de conexiones a Supabase PostgreSQL y sincroniza el respaldo
func InitDB(projectRoot string) *Storage {
	once.Do(func() {
		s := &Storage{
			dataDir:     filepath.Join(projectRoot, "backend", "data"),
			stopMonitor: make(chan struct{}),
			prodCache:   make(map[string]productCacheEntry),
			singleCache: make(map[string]singleProductCacheEntry),
		}

		// 1. Cargar respaldo local y garantizar administradores
		s.loadLocalData()
		s.ensureDefaultAdmins()

		// 2. Conectar al pool de Supabase PostgreSQL vía variables de entorno
		connStr := os.Getenv("DATABASE_URL")
		if connStr == "" {
			connStr = os.Getenv("SUPABASE_DATABASE_URL")
		}

		if connStr == "" {
			log.Println("ℹ️ DATABASE_URL no configurada. Servidor operando con respaldo local en memoria.")
			DB = s
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		poolConfig, err := pgxpool.ParseConfig(connStr)
		if err == nil {
			poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

			maxConns := 50
			if v := os.Getenv("MAX_CONNS"); v != "" {
				if n, err := strconv.Atoi(v); err == nil && n > 0 {
					maxConns = n
				}
			}
			minConns := 5
			if v := os.Getenv("MIN_CONNS"); v != "" {
				if n, err := strconv.Atoi(v); err == nil && n > 0 {
					minConns = n
				}
			}

			poolConfig.MaxConns = int32(maxConns)
			poolConfig.MinConns = int32(minConns)
			poolConfig.MaxConnLifetime = 30 * time.Minute
			poolConfig.MaxConnLifetimeJitter = 5 * time.Minute
			poolConfig.MaxConnIdleTime = 5 * time.Minute
			poolConfig.HealthCheckPeriod = 1 * time.Minute

			s.poolConfig = poolConfig

			pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
			if err == nil && pool.Ping(ctx) == nil {
				s.pool = pool
				s.isSupabaseReady = true
				log.Printf("🐘 Supabase PostgreSQL conectado exitosamente con pgxpool (Pool: %d max conex).", maxConns)
			} else {
				log.Printf("⚠️ No se pudo conectar a Supabase inicialmente: %v, operando con almacenamiento local.", err)
			}
		}

		// 3. Iniciar monitor de salud y auto-reconexión en background
		go s.startHealthMonitor()

		DB = s
	})
	return DB
}

func (s *Storage) IsSupabaseConnected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.isSupabaseReady
}

// startHealthMonitor supervisa la conexión a Supabase y auto-reconecta si hay interrupciones
func (s *Storage) startHealthMonitor() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopMonitor:
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			if s.pool != nil {
				if err := s.pool.Ping(ctx); err != nil {
					s.mu.Lock()
					if s.isSupabaseReady {
						s.isSupabaseReady = false
						log.Printf("⚠️ Interrupción detectada con Supabase: %v. Conmutando a caché local.", err)
					}
					s.mu.Unlock()
				} else {
					s.mu.Lock()
					if !s.isSupabaseReady {
						s.isSupabaseReady = true
						log.Printf("🐘 Conexión con Supabase reestablecida exitosamente.")
					}
					s.mu.Unlock()
				}
			} else if s.poolConfig != nil {
				if pool, err := pgxpool.NewWithConfig(ctx, s.poolConfig); err == nil && pool.Ping(ctx) == nil {
					s.mu.Lock()
					s.pool = pool
					s.isSupabaseReady = true
					log.Printf("🐘 Supabase PostgreSQL reconectado exitosamente.")
					s.mu.Unlock()
				}
			}
			cancel()
		}
	}
}

// Close drena ordenadamente el pool de conexiones y detiene monitores
func (s *Storage) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()

	select {
	case <-s.stopMonitor:
	default:
		close(s.stopMonitor)
	}

	if s.pool != nil {
		s.pool.Close()
		log.Println("🐘 Conexiones del pool de Supabase cerradas ordenadamente.")
	}
}

func (s *Storage) loadLocalData() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if data, err := os.ReadFile(filepath.Join(s.dataDir, "users.json")); err == nil {
		json.Unmarshal(data, &s.users)
	}
	if data, err := os.ReadFile(filepath.Join(s.dataDir, "products.json")); err == nil {
		json.Unmarshal(data, &s.products)
	}
	if data, err := os.ReadFile(filepath.Join(s.dataDir, "orders.json")); err == nil {
		json.Unmarshal(data, &s.orders)
	}
}

func (s *Storage) atomicWriteJSON(filename string, v interface{}) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return
	}
	targetPath := filepath.Join(s.dataDir, filename)
	tmpPath := targetPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return
	}
	os.Rename(tmpPath, targetPath)
}

func (s *Storage) saveUsersToDisk() {
	s.atomicWriteJSON("users.json", s.users)
}
func (s *Storage) saveProductsToDisk() {
	s.atomicWriteJSON("products.json", s.products)
}
func (s *Storage) saveOrdersToDisk() {
	s.atomicWriteJSON("orders.json", s.orders)
}

func (s *Storage) ensureDefaultAdmins() {
	adminEmails := []string{"admin@arisshop.co", "alfonsonavarroch@gmail.com"}
	defaultHash, _ := bcrypt.GenerateFromPassword([]byte("AdminAris2026!"), 10)

	for _, email := range adminEmails {
		user, _ := s.FindUserByEmail(email)
		if user == nil {
			name := "Administrador ArisShop"
			if email == "alfonsonavarroch@gmail.com" {
				name = "Alfonso Navarro"
			}
			newAdmin := models.User{
				ID:        fmt.Sprintf("usr_admin_%d", time.Now().UnixNano()),
				Name:      name,
				Email:     email,
				Password:  string(defaultHash),
				Role:      "admin",
				CreatedAt: time.Now(),
			}
			s.SaveUser(newAdmin)
			log.Printf("🛡️ Administrador garantizado en Supabase: %s", email)
		}
	}
}

// ── USUARIOS ──

func (s *Storage) FindUserByEmail(email string) (*models.User, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var u models.User
		row := s.pool.QueryRow(ctx,
			"SELECT id, name, email, password, role, created_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
			cleanEmail,
		)
		err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt)
		if err == nil {
			return &u, nil
		}
		if err != pgx.ErrNoRows {
			log.Printf("Advertencia consultando Supabase para usuario: %v", err)
		}
	}

	// Respaldo en memoria local
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.users {
		if strings.ToLower(u.Email) == cleanEmail {
			copyUser := u
			return &copyUser, nil
		}
	}
	return nil, nil
}

func (s *Storage) SaveUser(user models.User) (*models.User, error) {
	s.mu.Lock()
	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.ID == "" {
		user.ID = fmt.Sprintf("usr_%d", time.Now().UnixNano())
	}

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		_, err := s.pool.Exec(ctx,
			`INSERT INTO users (id, name, email, password, role, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password`,
			user.ID, user.Name, user.Email, user.Password, user.Role, user.CreatedAt,
		)
		if err != nil {
			log.Printf("Error persistiendo usuario en Supabase: %v", err)
		}
	}

	s.users = append(s.users, user)
	s.saveUsersToDisk()
	s.mu.Unlock()

	return &user, nil
}

// ── PRODUCTOS ──

func (s *Storage) GetProducts(page, limit int, category, status string) ([]models.Product, int) {
	cacheKey := fmt.Sprintf("p:%d:%d:%s:%s", page, limit, category, status)

	// 1. Consultar Caché L1 en memoria (0.001ms)
	s.prodCacheMu.RLock()
	if entry, found := s.prodCache[cacheKey]; found && time.Now().Before(entry.expiresAt) {
		s.prodCacheMu.RUnlock()
		return entry.products, entry.total
	}
	s.prodCacheMu.RUnlock()

	var result []models.Product
	total := 0

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		baseQuery := "FROM products WHERE 1=1"
		var args []interface{}
		argIdx := 1

		if category != "" && category != "Todos" {
			baseQuery += fmt.Sprintf(" AND category = $%d", argIdx)
			args = append(args, category)
			argIdx++
		}
		if status != "" {
			baseQuery += fmt.Sprintf(" AND status = $%d", argIdx)
			args = append(args, status)
			argIdx++
		}

		// Count
		s.pool.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total)

		// Pagination
		offset := (page - 1) * limit
		selectQuery := fmt.Sprintf(
			"SELECT id, name, category, price, original_price, stock, status, badge, image, description, features, created_at, updated_at %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
			baseQuery, argIdx, argIdx+1,
		)
		args = append(args, limit, offset)

		rows, err := s.pool.Query(ctx, selectQuery, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var p models.Product
				if err := rows.Scan(
					&p.ID, &p.Name, &p.Category, &p.Price, &p.OriginalPrice,
					&p.Stock, &p.Status, &p.Badge, &p.Image,
					&p.Description, &p.Features, &p.CreatedAt, &p.UpdatedAt,
				); err == nil {
					result = append(result, p)
				}
			}

			// Guardar en Caché L1 por 30 segundos
			s.prodCacheMu.Lock()
			s.prodCache[cacheKey] = productCacheEntry{
				products:  result,
				total:     total,
				expiresAt: time.Now().Add(30 * time.Second),
			}
			s.prodCacheMu.Unlock()

			return result, total
		}
	}

	// Fallback local
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.products {
		if category != "" && category != "Todos" && p.Category != category {
			continue
		}
		if status != "" && p.Status != status {
			continue
		}
		result = append(result, p)
	}

	total = len(result)
	start := (page - 1) * limit
	if start >= total {
		return []models.Product{}, total
	}
	end := start + limit
	if end > total {
		end = total
	}
	return result[start:end], total
}

func (s *Storage) GetProductByID(id string) (*models.Product, error) {
	// Consultar Caché L1 de producto individual
	s.prodCacheMu.RLock()
	if entry, found := s.singleCache[id]; found && time.Now().Before(entry.expiresAt) {
		s.prodCacheMu.RUnlock()
		return entry.product, nil
	}
	s.prodCacheMu.RUnlock()

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		var p models.Product
		row := s.pool.QueryRow(ctx,
			"SELECT id, name, category, price, original_price, stock, status, badge, image, description, features, created_at, updated_at FROM products WHERE id = $1 LIMIT 1",
			id,
		)
		err := row.Scan(
			&p.ID, &p.Name, &p.Category, &p.Price, &p.OriginalPrice,
			&p.Stock, &p.Status, &p.Badge, &p.Image,
			&p.Description, &p.Features, &p.CreatedAt, &p.UpdatedAt,
		)
		if err == nil {
			s.prodCacheMu.Lock()
			s.singleCache[id] = singleProductCacheEntry{
				product:   &p,
				expiresAt: time.Now().Add(60 * time.Second),
			}
			s.prodCacheMu.Unlock()
			return &p, nil
		}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.products {
		if p.ID == id {
			copyP := p
			return &copyP, nil
		}
	}
	return nil, fmt.Errorf("producto con ID %s no encontrado", id)
}

func (s *Storage) SaveProduct(p models.Product) (*models.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	defer s.InvalidateProductCache()

	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now
	if p.ID == "" {
		p.ID = fmt.Sprintf("PROD-%d", time.Now().UnixMilli())
	}

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		_, err := s.pool.Exec(ctx,
			`INSERT INTO products (id, name, category, price, original_price, stock, status, badge, image, description, features, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			 ON CONFLICT (id) DO UPDATE SET
			   name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price,
			   stock = EXCLUDED.stock, status = EXCLUDED.status, updated_at = NOW()`,
			p.ID, p.Name, p.Category, p.Price, p.OriginalPrice, p.Stock, p.Status,
			p.Badge, p.Image, p.Description, p.Features, p.CreatedAt, p.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error insertando producto en Supabase: %v", err)
		}
	}

	s.products = append([]models.Product{p}, s.products...)
	s.saveProductsToDisk()
	return &p, nil
}

func (s *Storage) UpdateProduct(id string, updates map[string]interface{}) (*models.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	defer s.InvalidateProductCache()

	var updated *models.Product
	for i, p := range s.products {
		if p.ID == id {
			if name, ok := updates["name"].(string); ok && name != "" {
				s.products[i].Name = name
			}
			if cat, ok := updates["category"].(string); ok && cat != "" {
				s.products[i].Category = cat
			}
			if price, ok := updates["price"].(float64); ok {
				s.products[i].Price = price
			}
			if stock, ok := updates["stock"].(float64); ok {
				s.products[i].Stock = int(stock)
			}
			if status, ok := updates["status"].(string); ok && status != "" {
				s.products[i].Status = status
			}
			if badge, ok := updates["badge"].(string); ok {
				s.products[i].Badge = badge
			}
			if img, ok := updates["image"].(string); ok && img != "" {
				s.products[i].Image = img
			}
			s.products[i].UpdatedAt = time.Now()
			updated = &s.products[i]
			break
		}
	}

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var setClauses []string
		var args []interface{}
		argIdx := 1

		for k, v := range updates {
			col := k
			if k == "originalPrice" {
				col = "original_price"
			}
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, argIdx))
			args = append(args, v)
			argIdx++
		}
		setClauses = append(setClauses, "updated_at = NOW()")
		args = append(args, id)

		query := fmt.Sprintf("UPDATE products SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argIdx)
		s.pool.Exec(ctx, query, args...)
	}

	s.saveProductsToDisk()
	if updated != nil {
		return updated, nil
	}
	return s.GetProductByID(id)
}

func (s *Storage) DeleteProduct(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	defer s.InvalidateProductCache()

	newProducts := make([]models.Product, 0, len(s.products))
	for _, p := range s.products {
		if p.ID != id {
			newProducts = append(newProducts, p)
		}
	}
	s.products = newProducts

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		s.pool.Exec(ctx, "DELETE FROM products WHERE id = $1", id)
	}

	s.saveProductsToDisk()
	return nil
}

// ── ÓRDENES (CON TRANSACCIÓN ATÓMICA Y CONTROL DE STOCK ACID) ──

func (s *Storage) GetOrders(page, limit int, email, role string) ([]models.Order, int) {
	var result []models.Order
	total := 0
	cleanEmail := strings.ToLower(strings.TrimSpace(email))

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		baseQuery := "FROM orders WHERE 1=1"
		var args []interface{}
		argIdx := 1

		if role != "admin" && cleanEmail != "" {
			baseQuery += fmt.Sprintf(" AND LOWER(email) = LOWER($%d)", argIdx)
			args = append(args, cleanEmail)
			argIdx++
		}

		s.pool.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total)

		offset := (page - 1) * limit
		selectQuery := fmt.Sprintf(
			"SELECT id, order_id, name, email, phone, address, payment_method, total, status, created_at, updated_at %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
			baseQuery, argIdx, argIdx+1,
		)
		args = append(args, limit, offset)

		rows, err := s.pool.Query(ctx, selectQuery, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var o models.Order
				if err := rows.Scan(
					&o.ID, &o.OrderID, &o.Name, &o.Email, &o.Phone,
					&o.Address, &o.PaymentMethod, &o.Total, &o.Status,
					&o.CreatedAt, &o.UpdatedAt,
				); err == nil {
					// Cargar ítems de la orden
					itemRows, _ := s.pool.Query(ctx, "SELECT product_id, name, price, qty FROM order_items WHERE order_id = $1", o.OrderID)
					if itemRows != nil {
						for itemRows.Next() {
							var item models.OrderItem
							if err := itemRows.Scan(&item.ID, &item.Name, &item.Price, &item.Qty); err == nil {
								o.Items = append(o.Items, item)
							}
						}
						itemRows.Close()
					}
					result = append(result, o)
				}
			}
			return result, total
		}
	}

	// Fallback local
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, o := range s.orders {
		if role != "admin" && cleanEmail != "" && strings.ToLower(o.Email) != cleanEmail {
			continue
		}
		result = append(result, o)
	}

	total = len(result)
	start := (page - 1) * limit
	if start >= total {
		return []models.Order{}, total
	}
	end := start + limit
	if end > total {
		end = total
	}
	return result[start:end], total
}

func (s *Storage) GetOrderByID(id string) (*models.Order, error) {
	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var o models.Order
		row := s.pool.QueryRow(ctx,
			"SELECT id, order_id, name, email, phone, address, payment_method, total, status, created_at, updated_at FROM orders WHERE order_id = $1 OR id = $1 LIMIT 1",
			id,
		)
		err := row.Scan(
			&o.ID, &o.OrderID, &o.Name, &o.Email, &o.Phone,
			&o.Address, &o.PaymentMethod, &o.Total, &o.Status,
			&o.CreatedAt, &o.UpdatedAt,
		)
		if err == nil {
			itemRows, _ := s.pool.Query(ctx, "SELECT product_id, name, price, qty FROM order_items WHERE order_id = $1", o.OrderID)
			if itemRows != nil {
				defer itemRows.Close()
				for itemRows.Next() {
					var item models.OrderItem
					if err := itemRows.Scan(&item.ID, &item.Name, &item.Price, &item.Qty); err == nil {
						o.Items = append(o.Items, item)
					}
				}
			}
			return &o, nil
		}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, o := range s.orders {
		if o.OrderID == id || o.ID == id {
			copyO := o
			return &copyO, nil
		}
	}
	return nil, fmt.Errorf("orden %s no encontrada", id)
}

func (s *Storage) SaveOrder(o models.Order) (*models.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = now
	}
	o.UpdatedAt = now
	if o.OrderID == "" {
		o.OrderID = fmt.Sprintf("ORD-%d", time.Now().UnixMilli())
	}
	if o.ID == "" {
		o.ID = o.OrderID
	}
	if o.Status == "" {
		o.Status = "PENDING"
	}

	for i := range o.Items {
		if o.Items[i].Qty <= 0 {
			o.Items[i].Qty = 1
		}
	}
	if o.Total <= 0 {
		for _, item := range o.Items {
			o.Total += item.Price * float64(item.Qty)
		}
	}

	// ── TRANSACCIÓN ACID EN POSTGRESQL (SUPABASE) ──
	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		tx, err := s.pool.Begin(ctx)
		if err == nil {
			// 1. Insertar orden principal
			_, err = tx.Exec(ctx,
				`INSERT INTO orders (id, order_id, name, email, phone, address, payment_method, total, status, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
				o.ID, o.OrderID, o.Name, o.Email, o.Phone, o.Address, o.PaymentMethod, o.Total, o.Status, o.CreatedAt, o.UpdatedAt,
			)

			// 2. Insertar renglones y descontar stock
			if err == nil {
				for _, item := range o.Items {
					tx.Exec(ctx,
						`INSERT INTO order_items (order_id, product_id, name, price, qty)
						 VALUES ($1, $2, $3, $4, $5)`,
						o.OrderID, item.ID, item.Name, item.Price, item.Qty,
					)
					// Descontar inventario de forma segura
					if item.ID != "" {
						tx.Exec(ctx, "UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2", item.Qty, item.ID)
					}
				}

				// 3. Crear factura de venta automática
				subtotal := float64(int(o.Total / 1.19))
				tax := o.Total - subtotal
				invNum := fmt.Sprintf("FAC-2026-%d", time.Now().UnixMilli()%10000000)
				rcptCode := fmt.Sprintf("COMP-ONLINE-%d", 100000+time.Now().UnixNano()%900000)

				_, err = tx.Exec(ctx,
					`INSERT INTO sales_invoices (id, invoice_number, order_id, client_name, client_email, client_nit, payment_method, receipt_code, receipt_status, status, subtotal, tax, total, created_at)
					 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
					invNum, invNum, o.OrderID, o.Name, o.Email, "222222222-2", o.PaymentMethod, rcptCode, "VERIFICADO", "PAGADA", subtotal, tax, o.Total, now,
				)
				if err != nil {
					log.Printf("⚠️ Error insertando factura en Supabase: %v", err)
				}

				if commitErr := tx.Commit(ctx); commitErr != nil {
					log.Printf("⚠️ Error haciendo commit de la orden en Supabase: %v", commitErr)
				} else {
					log.Printf("✅ Orden %s y factura %s confirmadas con éxito en Supabase", o.OrderID, invNum)
				}
			} else {
				log.Printf("⚠️ Error en transacción de orden: %v", err)
				tx.Rollback(ctx)
			}
		}
	}

	// Sincronizar inventario en memoria y respaldo local
	for _, item := range o.Items {
		for j, p := range s.products {
			if p.ID == item.ID {
				newStock := p.Stock - item.Qty
				if newStock < 0 {
					newStock = 0
				}
				s.products[j].Stock = newStock
			}
		}
	}
	s.saveProductsToDisk()
	s.InvalidateProductCache()

	s.orders = append([]models.Order{o}, s.orders...)
	s.saveOrdersToDisk()

	return &o, nil
}

func (s *Storage) UpdateOrderStatus(orderID, status string) (*models.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var updated *models.Order
	for i, o := range s.orders {
		if o.OrderID == orderID || o.ID == orderID {
			s.orders[i].Status = status
			s.orders[i].UpdatedAt = time.Now()
			updated = &s.orders[i]
			break
		}
	}

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		s.pool.Exec(ctx, "UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 OR id = $2", status, orderID)
	}

	s.saveOrdersToDisk()
	if updated != nil {
		return updated, nil
	}
	return s.GetOrderByID(orderID)
}

// ── VENTAS Y FACTURACIÓN ──

func (s *Storage) GetSales(page, limit int) ([]models.SalesInvoice, int) {
	var result []models.SalesInvoice
	total := 0

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM sales_invoices").Scan(&total)

		offset := (page - 1) * limit
		rows, err := s.pool.Query(ctx,
			"SELECT id, invoice_number, order_id, client_name, client_email, client_nit, payment_method, receipt_code, receipt_status, status, subtotal, tax, total, created_at FROM sales_invoices ORDER BY created_at DESC LIMIT $1 OFFSET $2",
			limit, offset,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var sale models.SalesInvoice
				if err := rows.Scan(
					&sale.ID, &sale.InvoiceNumber, &sale.OrderID, &sale.ClientName,
					&sale.ClientEmail, &sale.ClientNit, &sale.PaymentMethod,
					&sale.ReceiptCode, &sale.ReceiptStatus, &sale.Status,
					&sale.Subtotal, &sale.Tax, &sale.Total, &sale.CreatedAt,
				); err == nil {
					result = append(result, sale)
				}
			}
			return result, total
		}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	total = len(s.sales)
	start := (page - 1) * limit
	if start >= total {
		return []models.SalesInvoice{}, total
	}
	end := start + limit
	if end > total {
		end = total
	}
	return s.sales[start:end], total
}

func (s *Storage) GetSaleByID(id string) (*models.SalesInvoice, error) {
	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var sale models.SalesInvoice
		row := s.pool.QueryRow(ctx,
			"SELECT id, invoice_number, order_id, client_name, client_email, client_nit, payment_method, receipt_code, receipt_status, status, subtotal, tax, total, created_at FROM sales_invoices WHERE id = $1 OR invoice_number = $1 OR order_id = $1 LIMIT 1",
			id,
		)
		if err := row.Scan(
			&sale.ID, &sale.InvoiceNumber, &sale.OrderID, &sale.ClientName,
			&sale.ClientEmail, &sale.ClientNit, &sale.PaymentMethod,
			&sale.ReceiptCode, &sale.ReceiptStatus, &sale.Status,
			&sale.Subtotal, &sale.Tax, &sale.Total, &sale.CreatedAt,
		); err == nil {
			return &sale, nil
		}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, sale := range s.sales {
		if sale.ID == id || sale.InvoiceNumber == id || sale.OrderID == id {
			copyS := sale
			return &copyS, nil
		}
	}
	return nil, fmt.Errorf("venta o factura %s no encontrada", id)
}

func (s *Storage) SaveSale(sale models.SalesInvoice) (*models.SalesInvoice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sale.ID == "" {
		sale.ID = fmt.Sprintf("FAC-2026-%03d", len(s.sales)+1)
		sale.InvoiceNumber = sale.ID
	}
	if sale.CreatedAt.IsZero() {
		sale.CreatedAt = time.Now()
	}

	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		s.pool.Exec(ctx,
			`INSERT INTO sales_invoices (id, invoice_number, order_id, client_name, client_email, client_nit, payment_method, receipt_code, receipt_status, status, subtotal, tax, total, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			 ON CONFLICT (invoice_number) DO NOTHING`,
			sale.ID, sale.InvoiceNumber, sale.OrderID, sale.ClientName, sale.ClientEmail,
			sale.ClientNit, sale.PaymentMethod, sale.ReceiptCode, sale.ReceiptStatus,
			sale.Status, sale.Subtotal, sale.Tax, sale.Total, sale.CreatedAt,
		)
	}

	s.sales = append([]models.SalesInvoice{sale}, s.sales...)
	return &sale, nil
}

// ── REVOCACIÓN DISTRIBUIDA DE TOKENS (SUPABASE POSTGRESQL) ──

func (s *Storage) RevokeToken(jti string, expiresAt int64) error {
	if jti == "" {
		return nil
	}
	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		_, err := s.pool.Exec(ctx,
			"INSERT INTO revoked_tokens (jti, expires_at, revoked_at) VALUES ($1, $2, $3) ON CONFLICT (jti) DO NOTHING",
			jti, expiresAt, time.Now().Unix(),
		)
		return err
	}
	return nil
}

func (s *Storage) IsTokenRevoked(jti string) bool {
	if jti == "" {
		return false
	}
	if s.isSupabaseReady {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		var exp int64
		err := s.pool.QueryRow(ctx, "SELECT expires_at FROM revoked_tokens WHERE jti = $1 LIMIT 1", jti).Scan(&exp)
		if err == nil {
			if time.Now().Unix() < exp {
				return true
			}
			// Limpieza asíncrona de token vencido
			go func(id string) {
				delCtx, delCancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer delCancel()
				s.pool.Exec(delCtx, "DELETE FROM revoked_tokens WHERE jti = $1", id)
			}(jti)
		}
	}
	return false
}

func (s *Storage) StartRevocationPruner(interval time.Duration) {
	if !s.isSupabaseReady {
		return
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			tag, err := s.pool.Exec(ctx, "DELETE FROM revoked_tokens WHERE expires_at < $1", time.Now().Unix())
			if err == nil && tag.RowsAffected() > 0 {
				log.Printf("🧹 Limpieza Supabase: %d tokens JWT expirados eliminados automáticamente.", tag.RowsAffected())
			}
			cancel()
		}
	}()
}
