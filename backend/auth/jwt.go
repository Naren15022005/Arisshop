package auth

import (
	"errors"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	jwtSecret = []byte(getEnvSecret())
	blacklist = struct {
		sync.RWMutex
		revoked map[string]int64
	}{revoked: make(map[string]int64)}

	externalRevocationCheck   func(jti string) bool
	externalRevocationPersist func(jti string, exp int64)
)

// SetExternalRevocationHooks enlaza la persistencia externa (Firestore)
func SetExternalRevocationHooks(check func(jti string) bool, persist func(jti string, exp int64)) {
	externalRevocationCheck = check
	externalRevocationPersist = persist
}

func getEnvSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret != "" {
		return secret
	}
	return "arisshop_local_dev_jwt_secret_key_2026"
}

// CustomClaims contiene los claims del JWT para ArisShop
type CustomClaims struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
	JTI   string `json:"jti"`
	jwt.RegisteredClaims
}

// GenerateToken emite un nuevo JWT con TTL de 2 horas y JTI único
func GenerateToken(id, email, name, role string) (string, error) {
	jti := uuid.New().String()
	now := time.Now()
	claims := CustomClaims{
		ID:    id,
		Email: email,
		Name:  name,
		Role:  role,
		JTI:   jti,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(2 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "arisshop-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken comprueba la firma, vigencia y si el token ha sido revocado en logout
func ValidateToken(tokenStr string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &CustomClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("método de firma no válido")
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, errors.New("token inválido o expirado")
	}

	// Comprobar si fue revocado
	blacklist.RLock()
	revokedExp, isRevoked := blacklist.revoked[claims.JTI]
	blacklist.RUnlock()

	if isRevoked {
		if time.Now().Unix() < revokedExp {
			return nil, errors.New("sesión finalizada: token revocado")
		}
		// Limpieza de token vencido
		blacklist.Lock()
		delete(blacklist.revoked, claims.JTI)
		blacklist.Unlock()
	} else if externalRevocationCheck != nil {
		// Comprobar persistencia distribuida en Firestore
		if externalRevocationCheck(claims.JTI) {
			blacklist.Lock()
			if claims.ExpiresAt != nil {
				blacklist.revoked[claims.JTI] = claims.ExpiresAt.Unix()
			}
			blacklist.Unlock()
			return nil, errors.New("sesión finalizada: token revocado")
		}
	}

	return claims, nil
}

// RevokeToken añade el JTI a la lista negra
func RevokeToken(jti string, exp int64) {
	if jti == "" {
		return
	}
	blacklist.Lock()
	blacklist.revoked[jti] = exp
	blacklist.Unlock()

	// Persistir de forma distribuida en Firestore
	if externalRevocationPersist != nil {
		go externalRevocationPersist(jti, exp)
	}
}
