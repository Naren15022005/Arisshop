package models

import "time"

// User representa a un usuario registrado en ArisShop
type User struct {
	ID        string    `json:"id" firestore:"id,omitempty"`
	Name      string    `json:"name" firestore:"name"`
	Email     string    `json:"email" firestore:"email"`
	Password  string    `json:"password,omitempty" firestore:"password"`
	Role      string    `json:"role" firestore:"role"` // "admin" o "customer"
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
}

// UserSafe omite el hash de contraseña en respuestas públicas
type UserSafe struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// LoginRequest carga las credenciales de ingreso
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest datos para alta de usuario
type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse payload estándar emitido tras login o registro
type AuthResponse struct {
	Message string   `json:"message"`
	Token   string   `json:"token"`
	User    UserSafe `json:"user"`
}

// Product representa un artículo en el catálogo de ArisShop
type Product struct {
	ID               string    `json:"id" firestore:"id,omitempty"`
	Name             string    `json:"name" firestore:"name"`
	Category         string    `json:"category" firestore:"category"`
	Price            float64   `json:"price" firestore:"price"`
	OriginalPrice    float64   `json:"originalPrice" firestore:"originalPrice"`
	Stock            int       `json:"stock" firestore:"stock"`
	Status           string    `json:"status" firestore:"status"` // "Activo" o "Oculto"
	Badge            string    `json:"badge" firestore:"badge"`
	Image            string    `json:"image" firestore:"image"`
	AdditionalImages []string  `json:"additionalImages" firestore:"additionalImages"`
	Description      string    `json:"description" firestore:"description"`
	Features         string    `json:"features" firestore:"features"`
	CreatedAt        time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt" firestore:"updatedAt"`
}

// OrderItem renglón individual dentro de un pedido
type OrderItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Qty   int     `json:"qty"`
}

// Order pedido realizado por un cliente
type Order struct {
	ID            string      `json:"id" firestore:"id,omitempty"`
	OrderID       string      `json:"orderId" firestore:"orderId"`
	Name          string      `json:"name" firestore:"name"`
	Email         string      `json:"email" firestore:"email"`
	Phone         string      `json:"phone" firestore:"phone"`
	Address       string      `json:"address" firestore:"address"`
	PaymentMethod string      `json:"paymentMethod" firestore:"paymentMethod"`
	Total         float64     `json:"total" firestore:"total"`
	Status        string      `json:"status" firestore:"status"` // PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
	Items         []OrderItem `json:"items" firestore:"items"`
	CreatedAt     time.Time   `json:"createdAt" firestore:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt" firestore:"updatedAt"`
}

// SalesInvoice comprobante fiscal generado automáticamente o por el administrador
type SalesInvoice struct {
	ID            string      `json:"id"`
	InvoiceNumber string      `json:"invoiceNumber"`
	OrderID       string      `json:"orderId"`
	ClientName    string      `json:"clientName"`
	ClientEmail   string      `json:"clientEmail"`
	ClientNit     string      `json:"clientNit"`
	PaymentMethod string      `json:"paymentMethod"`
	ReceiptCode   string      `json:"receiptCode"`
	ReceiptStatus string      `json:"receiptStatus"`
	Status        string      `json:"status"`
	Subtotal      float64     `json:"subtotal"`
	Tax           float64     `json:"tax"`
	Total         float64     `json:"total"`
	CreatedAt     time.Time   `json:"createdAt"`
	Items         []OrderItem `json:"items"`
}
