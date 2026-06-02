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
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/forge/api/") {
			c.JSON(http.StatusNotFound, gin.H{"code": -4, "message": "not found"})
			return
		}

		// Only serve under /forge/ prefix (matches Next.js basePath)
		if !strings.HasPrefix(path, "/forge/") && path != "/forge" {
			c.JSON(http.StatusNotFound, gin.H{"code": -4, "message": "not found"})
			return
		}

		// Strip /forge prefix to get the filesystem path
		fsPath := strings.TrimPrefix(path, "/forge")
		if fsPath == "" || fsPath == "/" {
			fsPath = "/index.html"
		}

		// Try serving the exact file
		if fsPath != "/index.html" {
			cleanPath := strings.TrimPrefix(fsPath, "/")
			if fileExists(sub, cleanPath) {
				c.Request.URL.Path = fsPath
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

		// Fallback to index.html for SPA client-side routing
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
