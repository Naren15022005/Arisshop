package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/time/rate"

	"arisshop-backend/auth"
	"arisshop-backend/database"
	"arisshop-backend/handlers"
	"arisshop-backend/middleware"
	ws "arisshop-backend/websocket"
)

func main() {
	// Detectar raíz del proyecto
	cwd, err := os.Getwd()
	if err != nil {
		cwd = "."
	}
	projectRoot := cwd
	if filepath.Base(cwd) == "backend" {
		projectRoot = filepath.Dir(cwd)
	}

	log.Printf("🚀 Iniciando ArisShop Core Server (Go v1.23 High Performance Engine)...")
	log.Printf("📁 Directorio raíz: %s", projectRoot)

	// 0. Cargar variables de entorno desde .env local si existe
	loadEnvFile(filepath.Join(projectRoot, ".env"))
	loadEnvFile(".env")

	// 1. Inicializar base de datos (Firestore + Local Sync)
	db := database.InitDB(projectRoot)

	// 2. Enlazar persistencia distribuida de lista negra JWT en Firestore
	auth.SetExternalRevocationHooks(
		func(jti string) bool { return db.IsTokenRevoked(jti) },
		func(jti string, exp int64) { db.RevokeToken(jti, exp) },
	)
	db.StartRevocationPruner(30 * time.Minute)

	// 3. Inicializar WebSocket Hub
	hub := ws.GetHub()

	// 4. Inicializar Handlers
	authHandler := handlers.NewAuthHandler(db, hub)
	productsHandler := handlers.NewProductsHandler(db, hub)
	ordersHandler := handlers.NewOrdersHandler(db, hub)
	salesHandler := handlers.NewSalesHandler(db)

	// 5. Inicializar Rate Limiters por IP
	authRateLimiter := middleware.NewIPRateLimiter(rate.Every(6*time.Second), 5)     // 10 req/min, burst 5
	orderRateLimiter := middleware.NewIPRateLimiter(rate.Every(4*time.Second), 5)    // 15 req/min, burst 5
	generalRateLimiter := middleware.NewIPRateLimiter(rate.Every(500*time.Millisecond), 50) // 120 req/min

	r := chi.NewRouter()

	// Middlewares globales de seguridad e integridad
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Compress(5))
	r.Use(chiMiddleware.Timeout(60 * time.Second))
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.BodyLimit(1 * 1024 * 1024)) // Límite estricto de 1MB por petición

	// Configuración CORS integral
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:*",
			"https://localhost:*",
			"https://*.trycloudflare.com",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "If-None-Match"},
		ExposedHeaders:   []string{"Link", "X-Cache", "Content-Length", "Retry-After", "ETag"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Endpoint WebSocket nativo
	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWS(hub, w, r)
	})

	// Compatibilidad Socket.io (handshake y polling)
	r.HandleFunc("/socket.io/*", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") == "websocket" {
			ws.ServeWS(hub, w, r)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=UTF-8")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`0{"sid":"aris-go-ws-session","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}`))
	})

	// Health check
	healthHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":            "OK",
			"engine":            "Go 1.23 Chi High-Performance Engine",
			"database":          "Supabase PostgreSQL (ACID Relational Engine)",
			"supabaseConnected": db.IsSupabaseConnected(),
			"timestamp":         time.Now().Format(time.RFC3339),
			"version":           "3.0.0-supabase",
			"security": map[string]string{
				"rateLimiting":   "Activo (Token Bucket)",
				"tokenBlacklist": "Distribuido (Supabase + L1 Cache)",
				"payloadMax":     "1MB",
				"sanitization":   "Anti-XSS Activo",
				"transactions":   "ACID en Órdenes e Inventario",
			},
		})
	}
	r.Get("/health", healthHandler)
	r.Get("/api/health", healthHandler)

	// ── RUTAS API CON PROTECCIÓN DE RATE LIMITING ──
	r.Route("/api", func(api chi.Router) {
		api.Use(generalRateLimiter.Middleware)

		// Autenticación (Protegido con rate limiter estricto anti-fuerza bruta)
		api.Route("/auth", func(authRouter chi.Router) {
			authRouter.With(authRateLimiter.Middleware).Post("/login", authHandler.Login)
			authRouter.With(authRateLimiter.Middleware).Post("/register", authHandler.Register)
			authRouter.Post("/logout", authHandler.Logout)
			authRouter.With(middleware.AuthMiddleware).Get("/me", authHandler.Me)
		})

		// Catálogo de Productos
		api.Route("/products", func(prodRouter chi.Router) {
			prodRouter.Get("/", productsHandler.List)
			prodRouter.Get("/{id}", productsHandler.Get)

			// Operaciones administrativas
			prodRouter.Group(func(admin chi.Router) {
				admin.Use(middleware.AuthMiddleware)
				admin.Use(middleware.RequireAdmin)

				admin.Post("/", productsHandler.Create)
				admin.Put("/{id}", productsHandler.Update)
				admin.Patch("/{id}/toggle-status", productsHandler.ToggleStatus)
				admin.Delete("/{id}", productsHandler.Delete)
			})
		})

		// Pedidos y Órdenes (Protegido contra spam de compras)
		api.Route("/orders", func(orderRouter chi.Router) {
			orderRouter.With(orderRateLimiter.Middleware).Post("/", ordersHandler.Create)

			orderRouter.Group(func(auth chi.Router) {
				auth.Use(middleware.AuthMiddleware)
				auth.Get("/", ordersHandler.List)
				auth.Get("/{id}", ordersHandler.Get)
			})

			orderRouter.Group(func(admin chi.Router) {
				admin.Use(middleware.AuthMiddleware)
				admin.Use(middleware.RequireAdmin)
				admin.Put("/{id}/status", ordersHandler.UpdateStatus)
			})
		})

		// Ventas y Facturas
		api.Route("/sales", func(salesRouter chi.Router) {
			salesRouter.Use(middleware.AuthMiddleware)
			salesRouter.Use(middleware.RequireAdmin)

			salesRouter.Get("/", salesHandler.List)
			salesRouter.Get("/{id}", salesHandler.Get)
			salesRouter.Post("/", salesHandler.Create)
		})
	})

	// Compatibilidad directa para /orders POST
	r.With(orderRateLimiter.Middleware).Post("/orders", ordersHandler.Create)

	// Servir archivos estáticos con cabeceras de caché inmutable para assets y multimedia
	distPath := filepath.Join(projectRoot, "frontend", "dist")
	if _, err := os.Stat(distPath); err == nil {
		fileServer := http.FileServer(http.Dir(distPath))
		r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")

			// Soporte directo para panel administrativo (/admin, /admin/, /admin.html y /src/pages/admin.html)
			if req.URL.Path == "/admin" || req.URL.Path == "/admin/" || req.URL.Path == "/admin.html" || req.URL.Path == "/src/pages/admin.html" {
				adminFile := filepath.Join(projectRoot, "src", "pages", "admin.html")
				if info, err := os.Stat(adminFile); err == nil && !info.IsDir() {
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					w.Header().Set("Cache-Control", "no-cache, must-revalidate")
					w.Header().Set("X-Frame-Options", "SAMEORIGIN")
					http.ServeFile(w, req, adminFile)
					return
				}
			}

			// Soporte seguro para archivos estáticos bajo /src/ (css, js, img, fonts)
			if strings.HasPrefix(req.URL.Path, "/src/") {
				cleanPath := filepath.Clean(req.URL.Path)
				srcRoot := filepath.Join(projectRoot, "src")
				target := filepath.Join(projectRoot, cleanPath)

				rel, err := filepath.Rel(srcRoot, target)
				if err == nil && !strings.HasPrefix(rel, "..") && !strings.HasPrefix(rel, "/") {
					ext := strings.ToLower(filepath.Ext(target))
					var contentType string
					switch ext {
					case ".js":
						contentType = "application/javascript; charset=utf-8"
					case ".css":
						contentType = "text/css; charset=utf-8"
					case ".png":
						contentType = "image/png"
					case ".jpg", ".jpeg":
						contentType = "image/jpeg"
					case ".svg":
						contentType = "image/svg+xml"
					case ".webp":
						contentType = "image/webp"
					case ".ico":
						contentType = "image/x-icon"
					case ".woff2":
						contentType = "font/woff2"
					case ".woff":
						contentType = "font/woff"
					case ".ttf":
						contentType = "font/ttf"
					case ".html":
						if rel == "pages/admin.html" {
							contentType = "text/html; charset=utf-8"
						}
					}

					if contentType != "" {
						if info, err := os.Stat(target); err == nil && !info.IsDir() {
							w.Header().Set("Content-Type", contentType)
							if ext == ".js" || ext == ".css" || ext == ".html" {
								w.Header().Set("Cache-Control", "no-cache, must-revalidate")
							} else {
								w.Header().Set("Cache-Control", "public, max-age=86400")
							}
							http.ServeFile(w, req, target)
							return
						}
					}
				}
				http.NotFound(w, req)
				return
			}

			requestedPath := filepath.Join(distPath, filepath.Clean(req.URL.Path))
			rel, err := filepath.Rel(distPath, requestedPath)
			if err != nil || strings.HasPrefix(rel, "..") {
				http.NotFound(w, req)
				return
			}

			// Si es un activo inmutable (assets compilados con hash o imágenes), aplicar caché CDN duradera
			if strings.HasPrefix(req.URL.Path, "/assets/") || strings.HasPrefix(req.URL.Path, "/img/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			} else {
				w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
			}

			if _, err := os.Stat(requestedPath); os.IsNotExist(err) {
				// Solo hacer fallback a index.html para rutas SPA de navegación (sin extensión de archivo)
				// Si la petición pide un archivo específico con extensión (.js, .css, .go, .env, .png, etc.), responder 404
				ext := filepath.Ext(req.URL.Path)
				if ext != "" && ext != ".html" {
					http.NotFound(w, req)
					return
				}

				// Fallback a index.html para SPA routing
				w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
				http.ServeFile(w, req, filepath.Join(distPath, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, req)
		}))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3005"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("✨ ArisShop Server listo y escuchando en http://localhost:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Error crítico en el servidor: %v", err)
		}
	}()

	<-stop
	log.Println("🛑 Apagando servidor de forma segura (Graceful Shutdown)...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("⚠️ Error durante apagado del servidor HTTP: %v", err)
	} else {
		log.Println("✅ Servidor HTTP y WebSockets drenados exitosamente.")
	}

	// Cerrar conexiones del pool de Supabase y monitores
	db.Close()

	log.Println("👋 ArisShop detenido de forma 100% segura. Integridad de datos garantizada.")
}

// loadEnvFile lee un archivo .env si existe y define variables de entorno no presentes en el sistema
func loadEnvFile(envPath string) {
	data, err := os.ReadFile(envPath)
	if err != nil {
		return
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}
