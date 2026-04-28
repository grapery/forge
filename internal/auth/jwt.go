package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
	ErrSecretNotSet = errors.New("jwt secret not set")
)

var jwtSecret []byte

type AdminClaims struct {
	AdminID   string `json:"adminId"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

func SetJWTSecret(secret string) {
	jwtSecret = []byte(secret)
}

func GenerateAccessToken(adminID, username, role string, expiry time.Duration) (string, error) {
	if len(jwtSecret) == 0 {
		return "", ErrSecretNotSet
	}
	now := time.Now()
	claims := AdminClaims{
		AdminID:  adminID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "forge-admin",
			Subject:   adminID,
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func GenerateRefreshToken(adminID string, expiry time.Duration) (string, error) {
	if len(jwtSecret) == 0 {
		return "", ErrSecretNotSet
	}
	now := time.Now()
	claims := AdminClaims{
		AdminID: adminID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "forge-admin-refresh",
			Subject:   adminID,
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ParseToken(tokenString string) (*AdminClaims, error) {
	if len(jwtSecret) == 0 {
		return nil, ErrSecretNotSet
	}
	token, err := jwt.ParseWithClaims(tokenString, &AdminClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return jwtSecret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}
	claims, ok := token.Claims.(*AdminClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
