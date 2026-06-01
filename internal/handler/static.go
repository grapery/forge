package handler

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/frontend"
)

// RegisterStaticRoutes serves the embedded Next.js static assets.
// API routes take priority; everything else falls through to SPA index.html.
func RegisterStaticRoutes(r *gin.Engine) {
	sub, err := fs.Sub(frontend.DistFS, "dist")
	if err != nil {
		return
	}
	fileServer := http.FileServer(http.FS(sub))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Skip API routes
		if strings.HasPrefix(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"code": -4, "message": "not found"})
			return
		}

		// Try serving static export files (Next.js output: route.html at dist root)
		if path != "/" {
			cleanPath := strings.TrimPrefix(path, "/")
			if fileExists(sub, cleanPath) {
				c.Request.URL.Path = path
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
			htmlPath := cleanPath + ".html"
			if fileExists(sub, htmlPath) {
				c.Request.URL.Path = "/" + htmlPath
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}

		// Fallback to index.html for unknown client routes
		c.Request.URL.Path = "/index.html"
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}

func fileExists(fsys fs.FS, name string) bool {
	if name == "" {
		return false
	}
	stat, err := fs.Stat(fsys, name)
	if err != nil {
		return false
	}
	return !stat.IsDir()
}
