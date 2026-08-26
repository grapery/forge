package mysql

import (
	"time"

	"gorm.io/gorm"
)

type WriteRepository struct {
	db *gorm.DB
}

func NewWriteRepository(db *gorm.DB) *WriteRepository {
	return &WriteRepository{db: db}
}

func (wr *WriteRepository) SoftDeleteStory(id string) error {
	return wr.db.Table("stories").Where("id = ?", id).Update("deleted_at", time.Now()).Error
}

func (wr *WriteRepository) UnpublishStory(id string) error {
	return wr.db.Table("stories").Where("id = ?", id).Update("status", "draft").Error
}

func (wr *WriteRepository) SoftDeleteStoryboard(id string) error {
	return wr.db.Table("storyboards").Where("id = ?", id).Update("deleted_at", time.Now()).Error
}

func (wr *WriteRepository) UnpublishStoryboard(id string) error {
	return wr.db.Table("storyboards").Where("id = ?", id).Update("workflow_status", "draft").Error
}

func (wr *WriteRepository) SoftDeleteFragment(id string) error {
	return wr.db.Table("fragments").Where("id = ?", id).Update("deleted_at", time.Now()).Error
}

func (wr *WriteRepository) UnpublishFragment(id string) error {
	return wr.db.Table("fragments").Where("id = ?", id).Update("visibility", "private").Error
}

func (wr *WriteRepository) PublishStory(id string) error {
	return wr.db.Table("stories").Where("id = ?", id).Updates(map[string]any{"status": "published", "deleted_at": nil}).Error
}

func (wr *WriteRepository) PublishStoryboard(id string) error {
	return wr.db.Table("storyboards").Where("id = ?", id).Updates(map[string]any{"workflow_status": "published", "deleted_at": nil}).Error
}

func (wr *WriteRepository) PublishFragment(id string) error {
	return wr.db.Table("fragments").Where("id = ?", id).Updates(map[string]any{"visibility": "public", "deleted_at": nil}).Error
}

func (wr *WriteRepository) RestoreStory(id string) error {
	return wr.db.Table("stories").Where("id = ?", id).Update("deleted_at", nil).Error
}

func (wr *WriteRepository) RestoreStoryboard(id string) error {
	return wr.db.Table("storyboards").Where("id = ?", id).Update("deleted_at", nil).Error
}

func (wr *WriteRepository) RestoreFragment(id string) error {
	return wr.db.Table("fragments").Where("id = ?", id).Update("deleted_at", nil).Error
}
