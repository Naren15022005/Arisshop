package middleware

import (
	"context"
	"html"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"arisshop-backend/auth"
)

type contextKey string

const ClaimsKey contextKey = "claims"

// AuthMiddleware extrae el JWT de la cabecera Authorization o de la cookie aris_token
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var tokenStr string

		// 1. Authorization: Bearer <token>
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// 2. Cookie de respaldo
		if tokenStr == "" {
			if cookie, err := r.Cookie("aris_token"); err == nil {
				tokenStr = cookie.Value
			}
		}

		if tokenStr == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"Acceso denegado: Token no proporcionado"}`))
			return
		}

		claims, err := auth.ValidateToken(tokenStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"Token inválido o expirado"}`))
			return
		}

		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		ctx = context.WithValue(ctx, "claims", claims) // compatibilidad
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAdmin restringe el acceso únicamente a usuarios con rol admin
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(ClaimsKey).(*auth.CustomClaims)
		if !ok || claims == nil || claims.Role != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"Acceso denegado: Se requieren permisos de administrador"}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders inyecta cabeceras recomendadas de protección web y caché CDN
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

// BodyLimit limita el tamaño del cuerpo de la petición para mitigar DoS por payload gigante
func BodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ── RATE LIMITING POR IP CON PURGA DE MEMORIA ──

type ipClient struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type IPRateLimiter struct {
	mu      sync.Mutex
	clients map[string]*ipClient
	rate    rate.Limit
	burst   int
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		clients: make(map[string]*ipClient),
		rate:    r,
		burst:   b,
	}

	// Rutina de purga periódica para evitar fugas de memoria con millones de IPs
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			limiter.mu.Lock()
			now := time.Now()
			for ip, client := range limiter.clients {
				if now.Sub(client.lastSeen) > 10*time.Minute {
					delete(limiter.clients, ip)
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return limiter
}

func (i *IPRateLimiter) getClient(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	client, exists := i.clients[ip]
	if !exists {
		client = &ipClient{
			limiter:  rate.NewLimiter(i.rate, i.burst),
			lastSeen: time.Now(),
		}
		i.clients[ip] = client
		return client.limiter
	}

	client.lastSeen = time.Now()
	return client.limiter
}

// GetIP extrae la IP real considerando proxies y Cloudflare
func GetIP(r *http.Request) string {
	cfIP := r.Header.Get("CF-Connecting-IP")
	if cfIP != "" {
		return cfIP
	}
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

// Middleware genera un middleware HTTP a partir del limitador
func (i *IPRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := GetIP(r)
		limiter := i.getClient(ip)

		if !limiter.Allow() {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "30")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"Demasiadas solicitudes. Por favor espere unos segundos."}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ── SANITIZACIÓN DE CADENAS DE TEXTO CONTRA XSS / INYECCIONES ──

var htmlTagRegex = regexp.MustCompile(`<(?i:script|iframe|object|embed|style|meta|svg|link)[^>]*>.*?</(?i:script|iframe|object|embed|style|meta|svg|link)>|<[^>]+>`)

// SanitizeString limpia etiquetas maliciosas y escapa caracteres de inyección
func SanitizeString(s string, maxLength int) string {
	cleaned := strings.TrimSpace(s)
	// Eliminar tags scripts o embeds
	cleaned = htmlTagRegex.ReplaceAllString(cleaned, "")
	// Escapar caracteres html especiales
	cleaned = html.EscapeString(cleaned)
	if maxLength > 0 && len(cleaned) > maxLength {
		cleaned = cleaned[:maxLength]
	}
	return cleaned
}
