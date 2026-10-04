package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/go-chi/chi/v5"

	"arisshop-backend/database"
	"arisshop-backend/models"
	ws "arisshop-backend/websocket"
)

func setupTestRouter(t *testing.T) (*chi.Mux, *database.Storage) {
	tempDir, err := os.MkdirTemp("", "arisshop-handler-test-*")
	if err != nil {
		t.Fatalf("Error creando tempDir: %v", err)
	}

	dataDir := filepath.Join(tempDir, "backend", "data")
	os.MkdirAll(dataDir, 0755)

	storage := database.InitDB(tempDir)
	hub := ws.GetHub()

	authHandler := NewAuthHandler(storage, hub)
	productsHandler := NewProductsHandler(storage, hub)
	ordersHandler := NewOrdersHandler(storage, hub)

	r := chi.NewRouter()

	r.Get("/api/health", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":            "OK",
			"engine":            "Go 1.23 Chi High-Performance Engine",
			"supabaseConnected": storage.IsSupabaseConnected(),
		})
	})

	r.Post("/api/auth/login", authHandler.Login)
	r.Get("/api/products", productsHandler.List)
	r.Post("/api/orders", ordersHandler.Create)

	return r, storage
}

func TestHealthEndpoint(t *testing.T) {
	r, _ := setupTestRouter(t)

	req := httptest.NewRequest("GET", "/api/health", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Código de estado esperado 200, obtenido %d", rr.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("Error decodificando respuesta JSON: %v", err)
	}

	if res["status"] != "OK" {
		t.Errorf("Estado esperado 'OK', obtenido '%v'", res["status"])
	}
}

func TestAuthValidation(t *testing.T) {
	r, _ := setupTestRouter(t)

	// Intento de login sin credenciales
	body, _ := json.Marshal(map[string]string{"email": "", "password": ""})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Esperado HTTP 400 Bad Request por credenciales vacías, obtenido %d", rr.Code)
	}

	// Login con admin correcto
	validBody, _ := json.Marshal(map[string]string{
		"email":    "alfonsonavarroch@gmail.com",
		"password": "admin123",
	})
	reqValid := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(validBody))
	reqValid.Header.Set("Content-Type", "application/json")
	rrValid := httptest.NewRecorder()
	r.ServeHTTP(rrValid, reqValid)

	if rrValid.Code != http.StatusOK {
		t.Errorf("Esperado HTTP 200 OK para admin válido, obtenido %d", rrValid.Code)
	}

	var authRes models.AuthResponse
	if err := json.Unmarshal(rrValid.Body.Bytes(), &authRes); err == nil {
		if authRes.Token == "" {
			t.Error("El login exitoso debe emitir un token JWT no vacío")
		}
	}
}

func TestOrderValidation(t *testing.T) {
	r, _ := setupTestRouter(t)

	// Pedido sin productos debe fallar
	emptyOrder, _ := json.Marshal(map[string]interface{}{
		"name":  "Alfonso",
		"email": "alfonso@test.co",
		"items": []interface{}{},
	})
	req := httptest.NewRequest("POST", "/api/orders", bytes.NewBuffer(emptyOrder))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Esperado HTTP 400 por pedido sin items, obtenido %d", rr.Code)
	}
}
