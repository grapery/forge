package mysql

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// --- Membership queries ---

func (rr *ReadRepository) ListMemberships(query *domain.PaymentListQuery) ([]*domain.MembershipItem, int64, error) {
	var items []*domain.MembershipItem
	var total int64

	q := rr.db.Table("memberships")

	if query.Status != "" {
		q = q.Where("memberships.status = ?", query.Status)
	}
	if query.Tier != "" {
		q = q.Where("memberships.tier = ?", query.Tier)
	}
	if query.UserID != "" {
		q = q.Where("memberships.user_id = ?", query.UserID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count memberships: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	type row struct {
		ID         string `gorm:"column:id"`
		UserID     string `gorm:"column:user_id"`
		Tier       string `gorm:"column:tier"`
		Status     string `gorm:"column:status"`
		StartDate  int64  `gorm:"column:start_date"`
		EndDate    int64  `gorm:"column:end_date"`
		AutoRenew  bool   `gorm:"column:auto_renew"`
		TokenQuota int    `gorm:"column:token_quota"`
		TokenUsed  int    `gorm:"column:token_used"`
		CreatedAt  int64  `gorm:"column:created_at"`
		UpdatedAt  int64  `gorm:"column:updated_at"`
	}

	var rows []row
	if err := q.Select("memberships.id, memberships.user_id, memberships.tier, memberships.status, " +
		"COALESCE(UNIX_TIMESTAMP(memberships.start_date), 0) as start_date, COALESCE(UNIX_TIMESTAMP(memberships.end_date), 0) as end_date, " +
		"COALESCE(memberships.auto_renew, false) as auto_renew, " +
		"COALESCE(memberships.token_quota, 0) as token_quota, COALESCE(memberships.token_used, 0) as token_used, " +
		"memberships.created_at, memberships.updated_at").
		Order("memberships.created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list memberships: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items = make([]*domain.MembershipItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.MembershipItem{
			ID:         r.ID,
			UserID:     r.UserID,
			UserName:   names[r.UserID],
			Tier:       r.Tier,
			Status:     r.Status,
			StartDate:  r.StartDate,
			EndDate:    r.EndDate,
			AutoRenew:  r.AutoRenew,
			TokenQuota: r.TokenQuota,
			TokenUsed:  r.TokenUsed,
			CreatedAt:  r.CreatedAt,
			UpdatedAt:  r.UpdatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetMembershipDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("memberships").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get membership detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) CountMembershipsByTier() (*domain.MembershipSummary, error) {
	var summary domain.MembershipSummary
	base := rr.db.Table("memberships").Where("status = ?", "active")
	base.Count(&summary.TotalActive)
	base.Where("tier = ?", "free").Count(&summary.FreeCount)
	base.Where("tier = ?", "basic").Count(&summary.BasicCount)
	base.Where("tier = ?", "pro").Count(&summary.ProCount)
	base.Where("tier = ?", "premium").Count(&summary.PremiumCount)
	return &summary, nil
}

// --- Plan queries ---

func (rr *ReadRepository) ListPlans() ([]*domain.SubscriptionPlanItem, error) {
	type row struct {
		ID             string  `gorm:"column:id"`
		Name           string  `gorm:"column:name"`
		MembershipTier string  `gorm:"column:membership_tier"`
		BillingPeriod  string  `gorm:"column:billing_period"`
		Price          float64 `gorm:"column:price"`
		Currency       string  `gorm:"column:currency"`
		TokenQuota     int     `gorm:"column:token_quota"`
		MaxStories     int     `gorm:"column:max_stories"`
		MaxCharacters  int     `gorm:"column:max_characters"`
		Features       string  `gorm:"column:features"`
		IsActive       bool    `gorm:"column:is_active"`
		SortOrder      int     `gorm:"column:sort_order"`
		CreatedAt      int64   `gorm:"column:created_at"`
		UpdatedAt      int64   `gorm:"column:updated_at"`
	}

	var rows []row
	if err := rr.db.Table("subscription_plans").
		Select("id, name, membership_tier, billing_period, price, currency, "+
			"COALESCE(token_quota, 0) as token_quota, COALESCE(max_stories, 0) as max_stories, "+
			"COALESCE(max_characters, 0) as max_characters, COALESCE(features, '') as features, "+
			"COALESCE(is_active, true) as is_active, COALESCE(sort_order, 0) as sort_order, "+
			"created_at, updated_at").
		Order("sort_order ASC, created_at DESC").
		Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}

	items := make([]*domain.SubscriptionPlanItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.SubscriptionPlanItem{
			ID:             r.ID,
			Name:           r.Name,
			MembershipTier: r.MembershipTier,
			BillingPeriod:  r.BillingPeriod,
			Price:          r.Price,
			Currency:       r.Currency,
			TokenQuota:     r.TokenQuota,
			MaxStories:     r.MaxStories,
			MaxCharacters:  r.MaxCharacters,
			Features:       r.Features,
			IsActive:       r.IsActive,
			SortOrder:      r.SortOrder,
			CreatedAt:      r.CreatedAt,
			UpdatedAt:      r.UpdatedAt,
		}
	}

	return items, nil
}

func (rr *ReadRepository) GetPlanDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("subscription_plans").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get plan detail: %w", err)
	}
	return result, nil
}

// --- Order queries ---

func (rr *ReadRepository) ListOrders(query *domain.PaymentListQuery) ([]*domain.SubscriptionOrderItem, int64, error) {
	var total int64

	q := rr.db.Table("subscription_orders")

	if query.Status != "" {
		q = q.Where("subscription_orders.status = ?", query.Status)
	}
	if query.UserID != "" {
		q = q.Where("subscription_orders.user_id = ?", query.UserID)
	}
	if query.DateFrom != "" {
		q = q.Where("subscription_orders.created_at >= ?", query.DateFrom)
	}
	if query.DateTo != "" {
		q = q.Where("subscription_orders.created_at <= ?", query.DateTo)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count orders: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	type row struct {
		ID            string  `gorm:"column:id"`
		UserID        string  `gorm:"column:user_id"`
		PlanID        string  `gorm:"column:plan_id"`
		Amount        float64 `gorm:"column:amount"`
		Currency      string  `gorm:"column:currency"`
		Status        string  `gorm:"column:status"`
		PaymentMethod string  `gorm:"column:payment_method"`
		PaymentID     string  `gorm:"column:payment_id"`
		StartDate     int64   `gorm:"column:start_date"`
		EndDate       int64   `gorm:"column:end_date"`
		CreatedAt     int64   `gorm:"column:created_at"`
		UpdatedAt     int64   `gorm:"column:updated_at"`
	}

	var rows []row
	if err := q.Select("subscription_orders.id, subscription_orders.user_id, "+
		"COALESCE(subscription_orders.plan_id, '') as plan_id, "+
		"COALESCE(subscription_orders.amount, 0) as amount, "+
		"COALESCE(subscription_orders.currency, 'USD') as currency, "+
		"subscription_orders.status, "+
		"COALESCE(subscription_orders.payment_method, '') as payment_method, "+
		"COALESCE(subscription_orders.payment_id, '') as payment_id, "+
		"COALESCE(UNIX_TIMESTAMP(subscription_orders.start_date), 0) as start_date, "+
		"COALESCE(UNIX_TIMESTAMP(subscription_orders.end_date), 0) as end_date, "+
		"subscription_orders.created_at, subscription_orders.updated_at").
		Order("subscription_orders.created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list orders: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	// Batch fetch plan names
	planIDs := make([]string, 0)
	for _, r := range rows {
		if r.PlanID != "" {
			planIDs = append(planIDs, r.PlanID)
		}
	}
	planNames := make(map[string]string)
	if len(planIDs) > 0 {
		type planRow struct {
			ID   string `gorm:"column:id"`
			Name string `gorm:"column:name"`
		}
		var pRows []planRow
		rr.db.Table("subscription_plans").Select("id, name").Where("id IN ?", planIDs).Find(&pRows)
		for _, p := range pRows {
			planNames[p.ID] = p.Name
		}
	}

	items := make([]*domain.SubscriptionOrderItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.SubscriptionOrderItem{
			ID:            r.ID,
			UserID:        r.UserID,
			UserName:      names[r.UserID],
			PlanID:        r.PlanID,
			PlanName:      planNames[r.PlanID],
			Amount:        r.Amount,
			Currency:      r.Currency,
			Status:        r.Status,
			PaymentMethod: r.PaymentMethod,
			PaymentID:     r.PaymentID,
			StartDate:     r.StartDate,
			EndDate:       r.EndDate,
			CreatedAt:     r.CreatedAt,
			UpdatedAt:     r.UpdatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetOrderDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("subscription_orders").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get order detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) GetOrderSummary() (*domain.OrderSummary, error) {
	var summary domain.OrderSummary
	base := rr.db.Table("subscription_orders")
	base.Count(&summary.TotalOrders)
	base.Where("status = ?", "completed").Count(&summary.CompletedCount)
	base.Where("status = ?", "pending").Count(&summary.PendingCount)
	base.Where("status = ?", "refunded").Count(&summary.RefundedCount)

	type revenueRow struct {
		Total float64 `gorm:"column:total"`
	}
	var rev revenueRow
	rr.db.Table("subscription_orders").
		Select("COALESCE(SUM(amount), 0) as total").
		Where("status = ?", "completed").
		Take(&rev)
	summary.TotalRevenue = rev.Total

	return &summary, nil
}

// --- Write operations ---

func (wr *WriteRepository) CreatePlan(plan *domain.PlanCreateRequest) error {
	isActive := true
	if plan.IsActive != nil {
		isActive = *plan.IsActive
	}
	return wr.db.Table("subscription_plans").Create(map[string]any{
		"name":            plan.Name,
		"membership_tier": plan.MembershipTier,
		"billing_period":  plan.BillingPeriod,
		"price":           plan.Price,
		"currency":        plan.Currency,
		"token_quota":     plan.TokenQuota,
		"max_stories":     plan.MaxStories,
		"max_characters":  plan.MaxCharacters,
		"features":        plan.Features,
		"is_active":       isActive,
		"sort_order":      plan.SortOrder,
		"created_at":      now(),
		"updated_at":      now(),
	}).Error
}

func (wr *WriteRepository) UpdatePlan(id string, plan *domain.PlanUpdateRequest) error {
	updates := map[string]any{
		"name":            plan.Name,
		"membership_tier": plan.MembershipTier,
		"billing_period":  plan.BillingPeriod,
		"price":           plan.Price,
		"currency":        plan.Currency,
		"token_quota":     plan.TokenQuota,
		"max_stories":     plan.MaxStories,
		"max_characters":  plan.MaxCharacters,
		"features":        plan.Features,
		"sort_order":      plan.SortOrder,
		"updated_at":      now(),
	}
	if plan.IsActive != nil {
		updates["is_active"] = *plan.IsActive
	}
	return wr.db.Table("subscription_plans").Where("id = ?", id).Updates(updates).Error
}

func (wr *WriteRepository) RefundOrder(id string, reason string) error {
	return wr.db.Table("subscription_orders").Where("id = ?", id).
		Updates(map[string]any{
			"status":     "refunded",
			"updated_at": now(),
		}).Error
}

// --- Membership write operations (transactional) ---

// GetActiveMembershipByUserIDTx returns the user's current active membership, or nil if none.
// Accepts a *gorm.DB so it can run within a caller transaction; locks the row with FOR UPDATE
// to prevent two concurrent admin requests from both seeing "no active" and creating duplicates.
func (rr *ReadRepository) GetActiveMembershipByUserIDTx(db *gorm.DB, userID string) (*domain.MembershipItem, error) {
	type row struct {
		ID         string `gorm:"column:id"`
		UserID     string `gorm:"column:user_id"`
		Tier       string `gorm:"column:tier"`
		Status     string `gorm:"column:status"`
		StartDate  int64  `gorm:"column:start_date"`
		EndDate    int64  `gorm:"column:end_date"`
		AutoRenew  bool   `gorm:"column:auto_renew"`
		TokenQuota int    `gorm:"column:token_quota"`
		TokenUsed  int    `gorm:"column:token_used"`
	}
	var r row
	err := db.Table("memberships").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id, user_id, tier, status, "+
			"COALESCE(UNIX_TIMESTAMP(start_date), 0) as start_date, "+
			"COALESCE(UNIX_TIMESTAMP(end_date), 0) as end_date, "+
			"COALESCE(auto_renew, false) as auto_renew, "+
			"COALESCE(token_quota, 0) as token_quota, "+
			"COALESCE(token_used, 0) as token_used").
		Where("user_id = ? AND status = ?", userID, "active").
		Order("created_at DESC").
		Take(&r).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("get active membership: %w", err)
	}
	return &domain.MembershipItem{
		ID: r.ID, UserID: r.UserID, Tier: r.Tier, Status: r.Status,
		StartDate: r.StartDate, EndDate: r.EndDate, AutoRenew: r.AutoRenew,
		TokenQuota: r.TokenQuota, TokenUsed: r.TokenUsed,
	}, nil
}

// GetMembershipByIDTx returns a membership by id (any status), or nil if not found.
// Accepts a *gorm.DB so it can run within a caller transaction; locks the row with FOR UPDATE.
func (rr *ReadRepository) GetMembershipByIDTx(db *gorm.DB, id string) (*domain.MembershipItem, error) {
	type row struct {
		ID         string `gorm:"column:id"`
		UserID     string `gorm:"column:user_id"`
		Tier       string `gorm:"column:tier"`
		Status     string `gorm:"column:status"`
		StartDate  int64  `gorm:"column:start_date"`
		EndDate    int64  `gorm:"column:end_date"`
		AutoRenew  bool   `gorm:"column:auto_renew"`
		TokenQuota int    `gorm:"column:token_quota"`
		TokenUsed  int    `gorm:"column:token_used"`
	}
	var r row
	err := db.Table("memberships").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id, user_id, tier, status, "+
			"COALESCE(UNIX_TIMESTAMP(start_date), 0) as start_date, "+
			"COALESCE(UNIX_TIMESTAMP(end_date), 0) as end_date, "+
			"COALESCE(auto_renew, false) as auto_renew, "+
			"COALESCE(token_quota, 0) as token_quota, "+
			"COALESCE(token_used, 0) as token_used").
		Where("id = ?", id).
		Take(&r).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("get membership: %w", err)
	}
	return &domain.MembershipItem{
		ID: r.ID, UserID: r.UserID, Tier: r.Tier, Status: r.Status,
		StartDate: r.StartDate, EndDate: r.EndDate, AutoRenew: r.AutoRenew,
		TokenQuota: r.TokenQuota, TokenUsed: r.TokenUsed,
	}, nil
}

// CreateMembershipTx inserts a new active membership row. Returns the new id.
func (wr *WriteRepository) CreateMembershipTx(db *gorm.DB, req *domain.MembershipUpsertRequest) (string, error) {
	id := uuid.New().String()
	err := db.Table("memberships").Create(map[string]any{
		"id":          id,
		"user_id":     req.UserID,
		"tier":        req.Tier,
		"status":      "active",
		"start_date":  time.Now(),
		"end_date":    time.Unix(req.EndDate, 0),
		"auto_renew":  req.AutoRenew,
		"token_quota": req.TokenQuota,
		"token_used":  0,
		"created_at":  time.Now(),
		"updated_at":  time.Now(),
	}).Error
	if err != nil {
		return "", fmt.Errorf("create membership: %w", err)
	}
	return id, nil
}

// UpdateMembershipTx updates tier/quota/end_date/auto_renew on an existing membership.
func (wr *WriteRepository) UpdateMembershipTx(db *gorm.DB, id string, req *domain.MembershipUpsertRequest) error {
	return db.Table("memberships").Where("id = ?", id).Updates(map[string]any{
		"tier":        req.Tier,
		"end_date":    time.Unix(req.EndDate, 0),
		"auto_renew":  req.AutoRenew,
		"token_quota": req.TokenQuota,
		"updated_at":  time.Now(),
	}).Error
}

// RenewMembershipTx extends end_date to newEndDate (already computed by caller).
func (wr *WriteRepository) RenewMembershipTx(db *gorm.DB, id string, newEndDate int64) error {
	return db.Table("memberships").Where("id = ?", id).Updates(map[string]any{
		"end_date":   time.Unix(newEndDate, 0),
		"updated_at": time.Now(),
	}).Error
}

// CancelMembershipTx marks a membership cancelled and sets end_date to now.
func (wr *WriteRepository) CancelMembershipTx(db *gorm.DB, id string) error {
	return db.Table("memberships").Where("id = ?", id).Updates(map[string]any{
		"status":     "cancelled",
		"end_date":   time.Now(),
		"auto_renew": false,
		"updated_at": time.Now(),
	}).Error
}

// InsertTokenGrantTx inserts a grant row into token_transactions. No-op when amount <= 0.
func (wr *WriteRepository) InsertTokenGrantTx(db *gorm.DB, userID, refID, description string, amount int) error {
	if amount <= 0 {
		return nil
	}
	return db.Table("token_transactions").Create(map[string]any{
		"id":          uuid.New().String(),
		"user_id":     userID,
		"type":        "grant",
		"amount":      amount,
		"balance":     0,
		"description": description,
		"related_id":  refID,
		"created_at":  time.Now(),
	}).Error
}

// InsertAdminGiftOrderTx inserts a $0 completed order as an audit-trail voucher.
// reason is not persisted here: the audit middleware already captures the full request
// body (including reason) in admin_operation_logs keyed by this admin's session.
func (wr *WriteRepository) InsertAdminGiftOrderTx(db *gorm.DB, userID, action string, endDateUnix int64) error {
	endDate := time.Now()
	if endDateUnix > 0 {
		endDate = time.Unix(endDateUnix, 0)
	}
	return db.Table("subscription_orders").Create(map[string]any{
		"id":             uuid.New().String(),
		"user_id":        userID,
		"plan_id":        "",
		"amount":         0,
		"currency":       "USD",
		"status":         "completed",
		"payment_method": "admin_gift",
		"payment_id":     "admin:" + action,
		"start_date":     time.Now(),
		"end_date":       endDate,
		"created_at":     time.Now(),
		"updated_at":     time.Now(),
	}).Error
}
