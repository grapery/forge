package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Env          string
	HTTPPort     string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
	LogLevel     string
	AllowOrigins []string
	Database     DatabaseConfig
	JWT          JWTConfig
}

type DatabaseConfig struct {
	Database string
	Username string
	Password string
	Address  string
	MaxIdle  int
	MaxOpen  int
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&collate=utf8mb4_unicode_ci&parseTime=True&loc=Local",
		d.Username, d.Password, d.Address, d.Database)
}

type JWTConfig struct {
	Secret          string
	AccessTokenExp  time.Duration
	RefreshTokenExp time.Duration
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		Env:          getEnv("FORGE_ENV", "development"),
		HTTPPort:     getEnv("FORGE_HTTP_PORT", "9010"),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
		LogLevel:     getEnv("FORGE_LOG_LEVEL", "info"),
		AllowOrigins: parseOrigins(getEnv("FORGE_ALLOW_ORIGINS", "http://localhost:3000")),
		Database: DatabaseConfig{
			Database: getEnv("DB_DATABASE", "grapery"),
			Username: getEnv("DB_USERNAME", "root"),
			Password: getEnv("DB_PASSWORD", ""),
			Address:  getEnv("DB_ADDRESS", "127.0.0.1:3306"),
			MaxIdle:  10,
			MaxOpen:  100,
		},
		JWT: JWTConfig{
			Secret:          getEnv("FORGE_JWT_SECRET", "forge-admin-secret-change-me"),
			AccessTokenExp:  mustParseDuration(getEnv("FORGE_JWT_ACCESS_EXPIRY", "24h")),
			RefreshTokenExp: mustParseDuration(getEnv("FORGE_JWT_REFRESH_EXPIRY", "168h")),
		},
	}

	return cfg
}

func (c *Config) Addr() string {
	return ":" + c.HTTPPort
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustParseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 24 * time.Hour
	}
	return d
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
