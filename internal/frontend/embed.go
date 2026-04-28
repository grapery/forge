// Package frontend embeds the built Next.js static assets.
// Build with: make frontend && make build
package frontend

import "embed"

//go:embed all:dist
var DistFS embed.FS

// SubDir returns the embedded filesystem rooted at "dist".
// This is needed because embed includes the "dist" prefix.
// func SubDir() fs.FS {
// 	sub, _ := fs.Sub(DistFS, "dist")
// 	return sub
// }
