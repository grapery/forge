package handler

import (
	"time"

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

// Upsert creates or updates a user's active membership.
// Token grant: full quota on first-time creation, positive delta on updates.
func (h *MembershipHandler) Upsert(c *gin.Context) {
	var req domain.MembershipUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if !domain.IsValidMembershipTier(req.Tier) {
		Error(c, CodeInvalidParams, "tier must be one of basic/pro/premium")
		return
	}
	if req.EndDate <= time.Now().Unix() {
		Error(c, CodeInvalidParams, "endDate must be in the future")
		return
	}
	if err := h.svc.Upsert(&req); err != nil {
		if service.IsValidationError(err) {
			Error(c, CodeInvalidParams, err.Error())
			return
		}
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

// Renew extends the end_date of an active membership. Optionally tops up tokens.
func (h *MembershipHandler) Renew(c *gin.Context) {
	id := c.Param("id")
	var req domain.MembershipRenewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Renew(id, &req); err != nil {
		if service.IsNotFound(err) {
			Error(c, CodeNotFound, "membership not found")
			return
		}
		if service.IsInvalidState(err) {
			Error(c, CodeInvalidParams, err.Error())
			return
		}
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

// Cancel marks a membership cancelled. Already-consumed tokens are not refunded.
func (h *MembershipHandler) Cancel(c *gin.Context) {
	id := c.Param("id")
	var req domain.MembershipCancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Cancel(id, &req); err != nil {
		if service.IsNotFound(err) {
			Error(c, CodeNotFound, "membership not found")
			return
		}
		if service.IsInvalidState(err) {
			Error(c, CodeInvalidParams, err.Error())
			return
		}
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
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
