package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListSafetyAssets(q *domain.SafetyAssetQuery) ([]*domain.SafetyAssetItem, int64, error) {
	db := rr.db.Table("assets").Where("deleted_at IS NULL")
	if q.UserID != "" {
		db = db.Where("user_id = ?", q.UserID)
	}
	if q.Type != "" {
		db = db.Where("type = ?", q.Type)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count assets: %w", err)
	}
	type row struct {
		ID, UserID, Type, Name, URL, Thumbnail, MimeType string
		Size                                             int64
		CreatedAt                                        int64
	}
	var rows []row
	if err := db.Select("id, user_id, type, name, url, COALESCE(thumbnail, '') as thumbnail, COALESCE(mime_type, '') as mime_type, size, UNIX_TIMESTAMP(created_at) as created_at").Order("created_at DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list assets: %w", err)
	}
	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.UserID)
	}
	names, _ := batchUserNames(rr, ids)
	items := make([]*domain.SafetyAssetItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.SafetyAssetItem{ID: r.ID, UserID: r.UserID, UserName: names[r.UserID], Type: r.Type, Name: r.Name, URL: r.URL, Thumbnail: r.Thumbnail, MimeType: r.MimeType, Size: r.Size, CreatedAt: r.CreatedAt}
	}
	return items, total, nil
}

func (rr *ReadRepository) ListSafetyConversations(q *domain.SafetyConversationQuery) ([]*domain.SafetyConversationItem, int64, error) {
	db := rr.db.Table("chat_sessions")
	if q.UserID != "" {
		db = db.Where("owner_user_id = ? OR peer_user_id = ?", q.UserID, q.UserID)
	}
	if q.SessionType != "" {
		db = db.Where("session_type = ?", q.SessionType)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count conversations: %w", err)
	}
	type row struct {
		ID, OwnerUserID, SessionType, PeerUserID, CharacterID, Title, LastMessage string
		LastMessageAt                                                             int64
	}
	var rows []row
	if err := db.Select("id, owner_user_id, session_type, COALESCE(peer_user_id, '') as peer_user_id, COALESCE(character_id, '') as character_id, COALESCE(title, '') as title, COALESCE(last_message, '') as last_message, last_message_at").Order("last_message_at DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list conversations: %w", err)
	}
	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.OwnerUserID)
	}
	names, _ := batchUserNames(rr, ids)
	items := make([]*domain.SafetyConversationItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.SafetyConversationItem{ID: r.ID, OwnerUserID: r.OwnerUserID, OwnerUserName: names[r.OwnerUserID], SessionType: r.SessionType, PeerUserID: r.PeerUserID, CharacterID: r.CharacterID, Title: r.Title, LastMessage: r.LastMessage, LastMessageAt: r.LastMessageAt}
	}
	return items, total, nil
}
