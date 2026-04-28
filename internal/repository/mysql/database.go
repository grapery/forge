package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/grapestree/fgrapery/forge/internal/config"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func InitDB(cfg config.DatabaseConfig, logger *zap.Logger) (*gorm.DB, error) {
	sqlDB, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	sqlDB.SetMaxIdleConns(cfg.MaxIdle)
	sqlDB.SetMaxOpenConns(cfg.MaxOpen)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	gormDB, err := gorm.Open(mysql.New(mysql.Config{Conn: sqlDB}), &gorm.Config{
		Logger: newZapAdapter(logger, gormlogger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("open gorm: %w", err)
	}

	return gormDB, nil
}

type zapAdapter struct {
	logger *zap.Logger
	level  gormlogger.LogLevel
}

func newZapAdapter(logger *zap.Logger, level gormlogger.LogLevel) gormlogger.Interface {
	return &zapAdapter{logger: logger, level: level}
}

func (z *zapAdapter) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	return &zapAdapter{logger: z.logger, level: level}
}

func (z *zapAdapter) Info(_ context.Context, msg string, args ...any) {
	z.logger.Sugar().Infof("[gorm] "+msg, args...)
}

func (z *zapAdapter) Warn(_ context.Context, msg string, args ...any) {
	z.logger.Sugar().Warnf("[gorm] "+msg, args...)
}

func (z *zapAdapter) Error(_ context.Context, msg string, args ...any) {
	z.logger.Sugar().Errorf("[gorm] "+msg, args...)
}

func (z *zapAdapter) Trace(_ context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	if err != nil && err != gorm.ErrRecordNotFound {
		sql, rows := fc()
		z.logger.Sugar().Errorf("[gorm] %.3fms | rows=%d | err=%v | sql=%s", float64(elapsed.Nanoseconds())/1e6, rows, err, sql)
	} else if z.level >= gormlogger.Info {
		sql, rows := fc()
		z.logger.Sugar().Infof("[gorm] %.3fms | rows=%d | sql=%s", float64(elapsed.Nanoseconds())/1e6, rows, sql)
	}
}
