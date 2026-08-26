package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func RequireRole(roles ...string) gin.HandlerFunc {
	roleSet := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		roleSet[r] = struct{}{}
	}
	return func(c *gin.Context) {
		ctx := auth.GetAdminContext(c)
		if ctx == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": -2, "message": "unauthorized"})
			return
		}
		if _, ok := roleSet[ctx.Role]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"code": -3, "message": "insufficient role"})
			return
		}
		c.Next()
	}
}

func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := auth.GetAdminContext(c)
		if ctx == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": -2, "message": "unauthorized"})
			return
		}
		if domain.IsAdminRole(domain.AdminRole(ctx.Role)) {
			c.Next()
			return
		}
		for _, p := range ctx.Permissions {
			if domain.PermissionGrants(p, permission) {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"code": -3, "message": "no permission"})
	}
}
