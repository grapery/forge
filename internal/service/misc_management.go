package service

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type TagService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewTagService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *TagService {
	return &TagService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *TagService) List(query *domain.TagListQuery) ([]*domain.TagItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListTags(query)
}

func (s *TagService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetTagDetail(id)
}

func (s *TagService) Create(req *domain.TagCreateRequest) error {
	return s.writeRepo.CreateTag(req.Name, req.Category)
}

func (s *TagService) Update(id string, req *domain.TagUpdateRequest) error {
	return s.writeRepo.UpdateTag(id, req.Name, req.Category)
}

func (s *TagService) Delete(id string) error {
	return s.writeRepo.DeleteTag(id)
}

type StyleService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewStyleService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *StyleService {
	return &StyleService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *StyleService) List(query *domain.StyleListQuery) ([]*domain.StyleConfigItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListStyles(query)
}

func (s *StyleService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetStyleDetail(id)
}

func (s *StyleService) Update(id string, req *domain.StyleUpdateRequest) error {
	updates := map[string]any{}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.SampleImageURL != "" {
		updates["sample_image_url"] = req.SampleImageURL
	}
	if len(updates) == 0 {
		return fmt.Errorf("no fields to update")
	}
	return s.writeRepo.UpdateStyle(id, updates)
}

func (s *StyleService) Delete(id string) error {
	return s.writeRepo.DeleteStyle(id)
}

type GenreService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewGenreService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *GenreService {
	return &GenreService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *GenreService) List(query *domain.GenreListQuery) ([]*domain.GenreCatalogItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListGenres(query)
}

func (s *GenreService) Update(id string, req *domain.GenreUpdateRequest) error {
	updates := map[string]any{}
	if req.TitleZh != "" {
		updates["title_zh"] = req.TitleZh
	}
	if req.TitleEn != "" {
		updates["title_en"] = req.TitleEn
	}
	if req.TitleJa != "" {
		updates["title_ja"] = req.TitleJa
	}
	if req.Emoji != "" {
		updates["emoji"] = req.Emoji
	}
	updates["sort_order"] = req.SortOrder
	return s.writeRepo.UpdateGenre(id, updates)
}

type InvitationService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewInvitationService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *InvitationService {
	return &InvitationService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *InvitationService) ListCodes(query *domain.InvitationCodeListQuery) ([]*domain.InvitationCodeItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListInvitationCodes(query)
}

func (s *InvitationService) CreateCode(req *domain.InvitationCodeCreateRequest) error {
	code := fmt.Sprintf("INV-%s", newUUID()[:8])
	return s.writeRepo.CreateInvitationCode(code, req.MaxUses, req.ExpiresAt, req.Description)
}

func (s *InvitationService) ToggleCode(id string, isActive bool) error {
	return s.writeRepo.ToggleInvitationCode(id, isActive)
}

func (s *InvitationService) ListReferrals(query *domain.ReferralListQuery) ([]*domain.ReferralItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListReferrals(query)
}

type DeviceService struct {
	readRepo *mysql.ReadRepository
}

func NewDeviceService(readRepo *mysql.ReadRepository) *DeviceService {
	return &DeviceService{readRepo: readRepo}
}

func (s *DeviceService) List(query *domain.DeviceListQuery) ([]*domain.UserDeviceItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListDevices(query)
}

func (s *DeviceService) PlatformCounts() (*domain.DevicePlatformCount, error) {
	return s.readRepo.CountDevicesByPlatform()
}

type NotificationService struct {
	readRepo *mysql.ReadRepository
}

func NewNotificationService(readRepo *mysql.ReadRepository) *NotificationService {
	return &NotificationService{readRepo: readRepo}
}

func (s *NotificationService) List(query *domain.NotificationListQuery) ([]*domain.NotificationItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListNotifications(query)
}

type SearchAnalyticsService struct {
	readRepo *mysql.ReadRepository
}

func NewSearchAnalyticsService(readRepo *mysql.ReadRepository) *SearchAnalyticsService {
	return &SearchAnalyticsService{readRepo: readRepo}
}

func (s *SearchAnalyticsService) ListHistory(query *domain.SearchHistoryQuery) ([]*domain.SearchHistoryItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListSearchHistory(query)
}

func (s *SearchAnalyticsService) GetTrends(limit int) ([]*domain.SearchTrend, error) {
	return s.readRepo.GetSearchTrends(limit)
}
