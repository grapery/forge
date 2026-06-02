package handler

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/frontend"
)

func RegisterStaticRoutes(r *gin.Engine) {
	sub, err := fs.Sub(frontend.DistFS, "dist")
	if err != nil {
		return
	}
	fileServer := http.FileServer(http.FS(sub))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

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

		// Try exact file match
		cleanPath := strings.TrimPrefix(fsPath, "/")
		if cleanPath != "" && cleanPath != "index.html" {
			if fileExists(sub, cleanPath) {
				c.Request.URL.Path = "/" + cleanPath
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

		// SPA fallback: serve index.html directly
		f, err := sub.Open("index.html")
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"code": -4, "message": "not found"})
			return
		}
		defer f.Close()
		stat, _ := f.Stat()
		c.DataFromReader(http.StatusOK, stat.Size(), "text/html; charset=utf-8", f, nil)
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
