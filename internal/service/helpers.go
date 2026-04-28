package service

import (
	"time"

	"github.com/google/uuid"
)

func newUUID() string { return uuid.New().String() }

// NowFunc returns current unix timestamp. Package-level for testability.
var NowFunc = func() int64 { return time.Now().Unix() }
