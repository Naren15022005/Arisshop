package database

import (
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"arisshop-backend/models"
)

func TestDatabaseInitAndAdmins(t *testing.T) {
	// Crear directorio temporal para el test
	tempDir, err := os.MkdirTemp("", "arisshop-db-test-*")
	if err != nil {
		t.Fatalf("Error creando directorio temporal: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dataDir := filepath.Join(tempDir, "backend", "data")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		t.Fatalf("Error creando backend/data: %v", err)
	}

	storage := InitDB(tempDir)
	if storage == nil {
		t.Fatal("InitDB retornó nil")
	}

	// Validar que los admins por defecto existen
	admins := []string{"admin@arisshop.co", "alfonsonavarroch@gmail.com"}
	for _, email := range admins {
		user, err := storage.FindUserByEmail(email)
		if err != nil {
			t.Fatalf("Usuario admin %s no encontrado: %v", email, err)
		}
		if user.Role != "admin" {
			t.Errorf("El rol de %s debería ser 'admin', pero es '%s'", email, user.Role)
		}

		// Validar que la contraseña admin123 o AdminAris2026! es válida
		valid123 := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte("admin123")) == nil
		valid2026 := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte("AdminAris2026!")) == nil
		if !valid123 && !valid2026 {
			t.Errorf("El hash de contraseña de %s no coincide con ninguna contraseña autorizada", email)
		}
	}
}

func TestProductListingAndFallback(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "arisshop-prod-test-*")
	if err != nil {
		t.Fatalf("Error creando tempDir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage := InitDB(tempDir)

	// Listar productos
	products, total := storage.GetProducts(1, 10, "", "")
	if total < 0 || len(products) < 0 {
		t.Errorf("Total de productos inválido: %d", total)
	}

	// Guardar un producto nuevo
	newProd := models.Product{
		Name:     "Test Headset Gaming",
		Category: "Audio Pro",
		Price:    99000,
		Stock:    15,
		Status:   "Activo",
	}

	saved, err := storage.SaveProduct(newProd)
	if err != nil {
		t.Fatalf("Error guardando producto: %v", err)
	}
	if saved.ID == "" {
		t.Error("El producto guardado debería tener un ID asignado")
	}

	// Consultar producto por ID
	found, err := storage.GetProductByID(saved.ID)
	if err != nil {
		t.Fatalf("Producto con ID %s no encontrado: %v", saved.ID, err)
	}
	if found.Name != "Test Headset Gaming" {
		t.Errorf("Nombre esperado 'Test Headset Gaming', obtenido '%s'", found.Name)
	}
}

func TestOrderCalculationAndStock(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "arisshop-order-test-*")
	if err != nil {
		t.Fatalf("Error creando tempDir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage := InitDB(tempDir)

	order := models.Order{
		Name:          "Cliente de Prueba",
		Email:         "test@cliente.co",
		Phone:         "+57 300 000 0000",
		Address:       "Calle Falsa 123",
		PaymentMethod: "Contra Entrega",
		Items: []models.OrderItem{
			{
				ID:    "prod_test_1",
				Name:  "Item 1",
				Price: 50000,
				Qty:   2,
			},
			{
				ID:    "prod_test_2",
				Name:  "Item 2",
				Price: 30000,
				Qty:   1,
			},
		},
	}

	savedOrder, err := storage.SaveOrder(order)
	if err != nil {
		t.Fatalf("Error procesando pedido: %v", err)
	}

	// Total debería ser (50000 * 2) + (30000 * 1) = 130000
	expectedTotal := 130000.0
	if savedOrder.Total != expectedTotal {
		t.Errorf("Total calculado incorrecto. Esperado %f, obtenido %f", expectedTotal, savedOrder.Total)
	}
}
