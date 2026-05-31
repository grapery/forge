package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

// --- MembershipHandler ---

type MembershipHandler struct {
	svc    *service.MembershipService
	logger *zap.Logger
}

func NewMembershipHandler(svc *service.MembershipService, logger *zap.Logger) *MembershipHandler {
	return &MembershipHandler{svc: svc, logger: logger}
}

func (h *MembershipHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.PaymentListQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   c.Query("status"),
		Tier:     c.Query("tier"),
		UserID:   c.Query("userId"),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	items, total, err := h.svc.List(query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *MembershipHandler) Summary(c *gin.Context) {
	summary, err := h.svc.Summary()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, summary)
}

// --- PlanHandler ---

type PlanHandler struct {
	svc    *service.PlanService
	logger *zap.Logger
}

func NewPlanHandler(svc *service.PlanService, logger *zap.Logger) *PlanHandler {
	return &PlanHandler{svc: svc, logger: logger}
}

func (h *PlanHandler) List(c *gin.Context) {
	items, err := h.svc.List()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, items)
}

func (h *PlanHandler) Create(c *gin.Context) {
	var req domain.PlanCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Create(&req); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

func (h *PlanHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.PlanUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Update(id, &req); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

// --- OrderHandler ---

type OrderHandler struct {
	svc    *service.OrderService
	logger *zap.Logger
}

func NewOrderHandler(svc *service.OrderService, logger *zap.Logger) *OrderHandler {
	return &OrderHandler{svc: svc, logger: logger}
}

func (h *OrderHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.PaymentListQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   c.Query("status"),
		Tier:     c.Query("tier"),
		UserID:   c.Query("userId"),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	items, total, err := h.svc.List(query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *OrderHandler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "order not found")
		return
	}
	Success(c, detail)
}

func (h *OrderHandler) Summary(c *gin.Context) {
	summary, err := h.svc.Summary()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, summary)
}

func (h *OrderHandler) Refund(c *gin.Context) {
	id := c.Param("id")
	var req domain.RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Refund(id, &req); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}
