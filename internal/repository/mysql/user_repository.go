package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListUsers(query *domain.UserListQuery) ([]*domain.PlatformUser, int64, error) {
	var users []*domain.PlatformUser
	var total int64

	q := rr.db.Table("users").
		Select("id, username, email, display_name, avatar, background, bio, location, website, phone, status, email_verified, followers, following, storyboard_count, fragments_count, points, referral_code, last_login_at, created_at, updated_at")

	if query.Search != "" {
		search := "%" + query.Search + "%"
		q = q.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?", search, search, search)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	} else {
		q = q.Where("status != ?", "deleted")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(query.PageSize).Find(&users).Error; err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}

	return users, total, nil
}

func (rr *ReadRepository) GetUserDetail(userID string) (*domain.PlatformUser, error) {
	var user domain.PlatformUser
	if err := rr.db.Table("users").
		Select("id, username, email, display_name, avatar, background, bio, location, website, phone, status, email_verified, followers, following, storyboard_count, fragments_count, points, referral_code, last_login_at, created_at, updated_at").
		Where("id = ?", userID).
		First(&user).Error; err != nil {
		return nil, fmt.Errorf("get user detail: %w", err)
	}
	return &user, nil
}

func (rr *ReadRepository) CountUsersByStatus() (*domain.UserStatusCount, error) {
	var counts domain.UserStatusCount
	rows, err := rr.db.Table("users").
		Select("status, COUNT(*) as cnt").
		Where("status != ?", "deleted").
		Group("status").Rows()
	if err != nil {
		return nil, fmt.Errorf("count users by status: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var cnt int64
		if err := rows.Scan(&status, &cnt); err != nil {
			continue
		}
		switch status {
		case "active":
			counts.Active = cnt
		case "suspended":
			counts.Suspended = cnt
		case "deleted":
			counts.Deleted = cnt
		}
	}
	return &counts, nil
}

func (wr *WriteRepository) SuspendUser(userID string) error {
	return wr.db.Table("users").Where("id = ?", userID).
		Updates(map[string]any{"status": "suspended"}).Error
}

func (wr *WriteRepository) ActivateUser(userID string) error {
	return wr.db.Table("users").Where("id = ?", userID).
		Updates(map[string]any{"status": "active"}).Error
}
