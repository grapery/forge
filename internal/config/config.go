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
	return fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&collation=utf8mb4_unicode_ci&parseTime=True&loc=Local",
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
		Env:          getEnv("APP_ENV", "development"),
		HTTPPort:     getEnv("HTTP_PORT", "9010"),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
		LogLevel:     getEnv("LOG_LEVEL", "info"),
		AllowOrigins: parseOrigins(getEnv("ALLOW_ORIGINS", "http://localhost:3000")),
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
			AccessTokenExp:  24 * time.Hour,
			RefreshTokenExp: 7 * 24 * time.Hour,
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
