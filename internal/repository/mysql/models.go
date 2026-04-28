package mysql

import "time"

type AdminUser struct {
	ID           string     `gorm:"column:id;primaryKey;size:36"`
	Username     string     `gorm:"column:username;uniqueIndex;size:50"`
	Email        string     `gorm:"column:email;uniqueIndex;size:100"`
	PasswordHash string     `gorm:"column:password_hash;size:255"`
	DisplayName  string     `gorm:"column:display_name;size:100"`
	Role         string     `gorm:"column:role;size:20;index"`
	Status       string     `gorm:"column:status;size:20;default:active"`
	LastLoginAt  *int64     `gorm:"column:last_login_at"`
	LastLoginIP  string     `gorm:"column:last_login_ip;size:45"`
	CreatedAt    int64      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    int64      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt    *time.Time `gorm:"column:deleted_at;index"`
}

func (AdminUser) TableName() string { return "admin_users" }

type AdminOperationLog struct {
	ID          string `gorm:"column:id;primaryKey;size:36"`
	AdminID     string `gorm:"column:admin_id;index;size:36"`
	AdminName   string `gorm:"column:admin_name;size:100"`
	Action      string `gorm:"column:action;index;size:50"`
	Resource    string `gorm:"column:resource;index;size:50"`
	ResourceID  string `gorm:"column:resource_id;index;size:36"`
	BeforeValue string `gorm:"column:before_value;type:text"`
	AfterValue  string `gorm:"column:after_value;type:text"`
	IP          string `gorm:"column:ip;size:45"`
	UserAgent   string `gorm:"column:user_agent;type:text"`
	CreatedAt   int64  `gorm:"column:created_at;index;autoCreateTime"`
}

func (AdminOperationLog) TableName() string { return "admin_operation_logs" }
