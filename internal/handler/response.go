package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	CodeSuccess       = 1
	CodeError         = 0
	CodeInvalidParams = -1
	CodeUnauthorized  = -2
	CodeForbidden     = -3
	CodeNotFound      = -4
	CodeInternalError = -5
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{Code: CodeSuccess, Message: "success", Data: data})
}

func SuccessWithMessage(c *gin.Context, msg string, data interface{}) {
	c.JSON(http.StatusOK, Response{Code: CodeSuccess, Message: msg, Data: data})
}

func Error(c *gin.Context, code int, msg string) {
	httpStatus := http.StatusBadRequest
	switch code {
	case CodeUnauthorized:
		httpStatus = http.StatusUnauthorized
	case CodeForbidden:
		httpStatus = http.StatusForbidden
	case CodeNotFound:
		httpStatus = http.StatusNotFound
	case CodeInternalError:
		httpStatus = http.StatusInternalServerError
	}
	c.JSON(httpStatus, Response{Code: code, Message: msg})
}

func Paginated(c *gin.Context, items interface{}, total int64, page, pageSize int) {
	if pageSize <= 0 {
		pageSize = 20
	}
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	Success(c, gin.H{
		"items":      items,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": totalPages,
	})
}
