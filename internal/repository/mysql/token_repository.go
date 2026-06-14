package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListTokenTransactions(query *domain.TokenListQuery) ([]*domain.TokenTransactionItem, int64, error) {
	var total int64

	q := rr.db.Table("token_transactions")

	if query.UserID != "" {
		q = q.Where("token_transactions.user_id = ?", query.UserID)
	}
	if query.Type != "" {
		switch query.Type {
		case "consumed":
			q = q.Where("token_transactions.type IN ?", []string{"consume", "deduct"})
		case "recharged":
			q = q.Where("token_transactions.type IN ?", []string{"grant", "purchase"})
		case "gifted":
			q = q.Where("token_transactions.type IN ?", []string{"bonus", "gift"})
		case "refunded":
			q = q.Where("token_transactions.type = ?", "refund")
		default:
			q = q.Where("token_transactions.type = ?", query.Type)
		}
	}
	if query.DateFrom != "" {
		q = q.Where("token_transactions.created_at >= ?", query.DateFrom)
	}
	if query.DateTo != "" {
		q = q.Where("token_transactions.created_at <= ?", query.DateTo)
	}
	if query.Keyword != "" {
		like := "%" + query.Keyword + "%"
		q = q.Where("token_transactions.description LIKE ?", like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count token transactions: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	type row struct {
		ID          string `gorm:"column:id"`
		UserID      string `gorm:"column:user_id"`
		Type        string `gorm:"column:type"`
		Amount      int    `gorm:"column:amount"`
		Balance     int    `gorm:"column:balance"`
		Description string `gorm:"column:description"`
		ReferenceID string `gorm:"column:related_id"`
		CreatedAt   int64  `gorm:"column:created_at"`
	}

	var rows []row
	if err := q.Select("id, user_id, type, "+
		"COALESCE(amount, 0) as amount, COALESCE(balance, 0) as balance, "+
		"COALESCE(description, '') as description, COALESCE(related_id, '') as related_id, "+
		"created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list token transactions: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items := make([]*domain.TokenTransactionItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.TokenTransactionItem{
			ID:          r.ID,
			UserID:      r.UserID,
			UserName:    names[r.UserID],
			Type:        r.Type,
			Amount:      r.Amount,
			Balance:     r.Balance,
			Description: r.Description,
			ReferenceID: r.ReferenceID,
			CreatedAt:   r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetTokenSummary() (*domain.TokenSummary, error) {
	var summary domain.TokenSummary

	type sumRow struct {
		Total int64 `gorm:"column:total"`
	}

	var consumed sumRow
	rr.db.Table("token_transactions").
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type IN ?", []string{"consume", "deduct"}).
		Take(&consumed)
	summary.TotalConsumed = consumed.Total

	var recharged sumRow
	rr.db.Table("token_transactions").
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type IN ?", []string{"grant", "purchase"}).
		Take(&recharged)
	summary.TotalRecharged = recharged.Total

	var refunded sumRow
	rr.db.Table("token_transactions").
		Select("COALESCE(SUM(ABS(amount)), 0) as total").
		Where("type = ?", "refund").
		Take(&refunded)
	summary.TotalRefunded = refunded.Total

	var gifted sumRow
	rr.db.Table("token_transactions").
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type IN ?", []string{"bonus", "gift"}).
		Take(&gifted)
	summary.TotalGifted = gifted.Total

	return &summary, nil
}
