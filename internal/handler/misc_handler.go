package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

// --- Tag Handler ---

type TagHandler struct {
	svc    *service.TagService
	logger *zap.Logger
}

func NewTagHandler(svc *service.TagService, logger *zap.Logger) *TagHandler {
	return &TagHandler{svc: svc, logger: logger}
}

func (h *TagHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.TagListQuery
	query.Page = page
	query.PageSize = pageSize
	query.Category = c.Query("category")
	query.Search = c.Query("search")

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *TagHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "tag not found")
		return
	}
	Success(c, detail)
}

func (h *TagHandler) Create(c *gin.Context) {
	var req domain.TagCreateRequest
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

func (h *TagHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.TagUpdateRequest
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

func (h *TagHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(id); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

// --- Style Handler ---

type StyleHandler struct {
	svc    *service.StyleService
	logger *zap.Logger
}

func NewStyleHandler(svc *service.StyleService, logger *zap.Logger) *StyleHandler {
	return &StyleHandler{svc: svc, logger: logger}
}

func (h *StyleHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.StyleListQuery
	query.Page = page
	query.PageSize = pageSize
	query.Search = c.Query("search")
	query.UserID = c.Query("userId")

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *StyleHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "style not found")
		return
	}
	Success(c, detail)
}

func (h *StyleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.StyleUpdateRequest
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

func (h *StyleHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(id); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

// --- Genre Handler ---

type GenreHandler struct {
	svc    *service.GenreService
	logger *zap.Logger
}

func NewGenreHandler(svc *service.GenreService, logger *zap.Logger) *GenreHandler {
	return &GenreHandler{svc: svc, logger: logger}
}

func (h *GenreHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.GenreListQuery
	query.Page = page
	query.PageSize = pageSize
	query.Search = c.Query("search")

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *GenreHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.GenreUpdateRequest
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

// --- Invitation Handler ---

type InvitationHandler struct {
	svc    *service.InvitationService
	logger *zap.Logger
}

func NewInvitationHandler(svc *service.InvitationService, logger *zap.Logger) *InvitationHandler {
	return &InvitationHandler{svc: svc, logger: logger}
}

func (h *InvitationHandler) ListCodes(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.InvitationCodeListQuery
	query.Page = page
	query.PageSize = pageSize
	if v := c.Query("isActive"); v == "true" {
		b := true
		query.IsActive = &b
	} else if v == "false" {
		b := false
		query.IsActive = &b
	}
	query.CreatedBy = c.Query("createdBy")

	items, total, err := h.svc.ListCodes(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *InvitationHandler) CreateCode(c *gin.Context) {
	var req domain.InvitationCodeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.CreateCode(&req); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

func (h *InvitationHandler) ToggleCode(c *gin.Context) {
	id := c.Param("id")
	isActive := c.Query("isActive") == "true"
	if err := h.svc.ToggleCode(id, isActive); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

func (h *InvitationHandler) ListReferrals(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.ReferralListQuery
	query.Page = page
	query.PageSize = pageSize

	items, total, err := h.svc.ListReferrals(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

// --- Device Handler ---

type DeviceHandler struct {
	svc    *service.DeviceService
	logger *zap.Logger
}

func NewDeviceHandler(svc *service.DeviceService, logger *zap.Logger) *DeviceHandler {
	return &DeviceHandler{svc: svc, logger: logger}
}

func (h *DeviceHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.DeviceListQuery
	query.Page = page
	query.PageSize = pageSize
	query.UserID = c.Query("userId")
	query.Platform = c.Query("platform")
	if v := c.Query("isActive"); v == "true" {
		b := true
		query.IsActive = &b
	} else if v == "false" {
		b := false
		query.IsActive = &b
	}

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *DeviceHandler) PlatformCounts(c *gin.Context) {
	counts, err := h.svc.PlatformCounts()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, counts)
}

// --- Notification Handler ---

type NotificationHandler struct {
	svc    *service.NotificationService
	logger *zap.Logger
}

func NewNotificationHandler(svc *service.NotificationService, logger *zap.Logger) *NotificationHandler {
	return &NotificationHandler{svc: svc, logger: logger}
}

func (h *NotificationHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.NotificationListQuery
	query.Page = page
	query.PageSize = pageSize
	query.UserID = c.Query("userId")
	query.Type = c.Query("type")

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *NotificationHandler) Broadcast(c *gin.Context) {
	var req domain.BroadcastNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	result, err := h.svc.Broadcast(&req)
	if err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	Success(c, result)
}

// --- Search Analytics Handler ---

type SearchAnalyticsHandler struct {
	svc    *service.SearchAnalyticsService
	logger *zap.Logger
}

func NewSearchAnalyticsHandler(svc *service.SearchAnalyticsService, logger *zap.Logger) *SearchAnalyticsHandler {
	return &SearchAnalyticsHandler{svc: svc, logger: logger}
}

func (h *SearchAnalyticsHandler) History(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.SearchHistoryQuery
	query.Page = page
	query.PageSize = pageSize
	query.Type = c.Query("type")
	query.UserID = c.Query("userId")

	items, total, err := h.svc.ListHistory(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *SearchAnalyticsHandler) Trends(c *gin.Context) {
	limit := 20
	if v := c.Query("limit"); v != "" {
		if n, err := parseInt(v); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}
	trends, err := h.svc.GetTrends(limit)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, trends)
}

type ShareAnalyticsHandler struct {
	svc    *service.ShareAnalyticsService
	logger *zap.Logger
}

func NewShareAnalyticsHandler(svc *service.ShareAnalyticsService, logger *zap.Logger) *ShareAnalyticsHandler {
	return &ShareAnalyticsHandler{svc: svc, logger: logger}
}

func (h *ShareAnalyticsHandler) Overview(c *gin.Context) {
	days := 30
	switch c.Query("range") {
	case "7d":
		days = 7
	case "90d":
		days = 90
	}
	out, err := h.svc.Overview(days)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, out)
}

func (h *ShareAnalyticsHandler) Events(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := domain.ShareEventQuery{
		Page:      page,
		PageSize:  pageSize,
		EventType: c.Query("eventType"),
		Kind:      c.Query("kind"),
	}
	items, total, err := h.svc.ListEvents(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}
