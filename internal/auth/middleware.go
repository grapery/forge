package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	AdminContextKey = "admin_context"
)

type AdminContext struct {
	AdminID  string
	Username string
	Role     string
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": -2, "message": "missing authorization header"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": -2, "message": "invalid authorization format"})
			return
		}

		claims, err := ParseToken(tokenStr)
		if err != nil {
			if err == ErrExpiredToken {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": -8, "message": "token expired"})
				return
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": -9, "message": "invalid token"})
			return
		}

		ctx := AdminContext{
			AdminID:  claims.AdminID,
			Username: claims.Username,
			Role:     claims.Role,
		}
		c.Set(AdminContextKey, ctx)
		c.Next()
	}
}

func GetAdminContext(c *gin.Context) *AdminContext {
	val, exists := c.Get(AdminContextKey)
	if !exists {
		return nil
	}
	ctx, ok := val.(AdminContext)
	if !ok {
		return nil
	}
	return &ctx
}
