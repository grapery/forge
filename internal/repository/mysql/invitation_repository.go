package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListInvitationCodes(query *domain.InvitationCodeListQuery) ([]*domain.InvitationCodeItem, int64, error) {
	var items []*domain.InvitationCodeItem
	var total int64

	q := rr.db.Table("invitation_codes")
	if query.IsActive != nil {
		q = q.Where("is_active = ?", *query.IsActive)
	}
	if query.CreatedBy != "" {
		q = q.Where("created_by = ?", query.CreatedBy)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count invitation codes: %w", err)
	}

	type row struct {
		ID          string `gorm:"column:id"`
		Code        string `gorm:"column:code"`
		CreatedBy   string `gorm:"column:created_by"`
		UsedBy      string `gorm:"column:used_by"`
		UsedAt      int64  `gorm:"column:used_at"`
		IsActive    bool   `gorm:"column:is_active"`
		MaxUses     int    `gorm:"column:max_uses"`
		CurrentUses int    `gorm:"column:current_uses"`
		ExpiresAt   int64  `gorm:"column:expires_at"`
		Description string `gorm:"column:description"`
		CreatedAt   int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, code, COALESCE(created_by, '') as created_by, COALESCE(used_by, '') as used_by, "+
		"COALESCE(used_at, 0) as used_at, is_active, COALESCE(max_uses, 0) as max_uses, "+
		"COALESCE(current_uses, 0) as current_uses, COALESCE(expires_at, 0) as expires_at, "+
		"COALESCE(description, '') as description, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list invitation codes: %w", err)
	}

	ids := make([]string, 0, len(rows)*2)
	for _, r := range rows {
		if r.CreatedBy != "" {
			ids = append(ids, r.CreatedBy)
		}
		if r.UsedBy != "" {
			ids = append(ids, r.UsedBy)
		}
	}
	names, _ := batchUserNames(rr, ids)

	items = make([]*domain.InvitationCodeItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.InvitationCodeItem{
			ID: r.ID, Code: r.Code, CreatedBy: r.CreatedBy, CreatedByName: names[r.CreatedBy],
			UsedBy: r.UsedBy, UsedByName: names[r.UsedBy], UsedAt: r.UsedAt,
			IsActive: r.IsActive, MaxUses: r.MaxUses, CurrentUses: r.CurrentUses,
			ExpiresAt: r.ExpiresAt, Description: r.Description, CreatedAt: r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) ListReferrals(query *domain.ReferralListQuery) ([]*domain.ReferralItem, int64, error) {
	var items []*domain.ReferralItem
	var total int64

	q := rr.db.Table("user_referrals")
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count referrals: %w", err)
	}

	type row struct {
		ID           string `gorm:"column:id"`
		ReferrerID   string `gorm:"column:referrer_id"`
		RefereeID    string `gorm:"column:referee_id"`
		ReferralCode string `gorm:"column:referral_code"`
		PointsEarned int    `gorm:"column:points_earned"`
		Status       string `gorm:"column:status"`
		CreatedAt    int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, referrer_id, referee_id, COALESCE(referral_code, '') as referral_code, "+
		"COALESCE(points_earned, 0) as points_earned, COALESCE(status, '') as status, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list referrals: %w", err)
	}

	ids := make([]string, 0, len(rows)*2)
	for _, r := range rows {
		ids = append(ids, r.ReferrerID, r.RefereeID)
	}
	names, _ := batchUserNames(rr, ids)

	items = make([]*domain.ReferralItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.ReferralItem{
			ID: r.ID, ReferrerID: r.ReferrerID, ReferrerName: names[r.ReferrerID],
			RefereeID: r.RefereeID, RefereeName: names[r.RefereeID],
			ReferralCode: r.ReferralCode, PointsEarned: r.PointsEarned,
			Status: r.Status, CreatedAt: r.CreatedAt,
		}
	}

	return items, total, nil
}

func (wr *WriteRepository) CreateInvitationCode(code string, maxUses int, expiresAt int64, description string) error {
	return wr.db.Table("invitation_codes").Create(map[string]any{
		"code": code, "max_uses": maxUses, "current_uses": 0,
		"expires_at": expiresAt, "description": description,
		"is_active": true, "created_at": time.Now(), "updated_at": time.Now(),
	}).Error
}

func (wr *WriteRepository) ToggleInvitationCode(id string, isActive bool) error {
	return wr.db.Table("invitation_codes").Where("id = ?", id).
		Updates(map[string]any{"is_active": isActive, "updated_at": time.Now()}).Error
}
