package mysql

import "time"

type AdminUser struct {
	ID           string     `gorm:"column:id;primaryKey;size:36"`
	Username     string     `gorm:"column:username;uniqueIndex;size:50"`
	Email        string     `gorm:"column:email;uniqueIndex;size:100"`
	PasswordHash string     `gorm:"column:password_hash;size:255"`
	DisplayName  string     `gorm:"column:display_name;size:100"`
	Role         string     `gorm:"column:role;size:20;index"`
	Permissions  string     `gorm:"column:permissions;type:text"`
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

type DailyStat struct {
	ID                uint    `gorm:"column:id;primaryKey;autoIncrement"`
	Date              string  `gorm:"column:date;uniqueIndex;size:10"`
	TotalUsers        int64   `gorm:"column:total_users"`
	NewUsers          int64   `gorm:"column:new_users"`
	TotalStories      int64   `gorm:"column:total_stories"`
	NewStories        int64   `gorm:"column:new_stories"`
	TotalCharacters   int64   `gorm:"column:total_characters"`
	NewCharacters     int64   `gorm:"column:new_characters"`
	TotalFragments    int64   `gorm:"column:total_fragments"`
	NewFragments      int64   `gorm:"column:new_fragments"`
	TotalStoryboards  int64   `gorm:"column:total_storyboards"`
	NewStoryboards    int64   `gorm:"column:new_storyboards"`
	ActiveMemberships int64   `gorm:"column:active_memberships"`
	TotalOrders       int64   `gorm:"column:total_orders"`
	NewOrders         int64   `gorm:"column:new_orders"`
	TotalRevenue      float64 `gorm:"column:total_revenue"`
	NewRevenue        float64 `gorm:"column:new_revenue"`
	TotalAITasks      int64   `gorm:"column:total_ai_tasks"`
	NewAITasks        int64   `gorm:"column:new_ai_tasks"`
	TotalTokenTx      int64   `gorm:"column:total_token_tx"`
	NewTokenTx        int64   `gorm:"column:new_token_tx"`
	TokenConsumed     int64   `gorm:"column:token_consumed"`
	ForkEvents        int64   `gorm:"column:fork_events"`
	CreatedAt         int64   `gorm:"column:created_at;autoCreateTime"`
}

func (DailyStat) TableName() string { return "daily_stats" }

type OpsAssistantSession struct {
	ID        string `gorm:"column:id;primaryKey;size:36"`
	AdminID   string `gorm:"column:admin_id;index;size:36"`
	Title     string `gorm:"column:title;size:200"`
	Status    string `gorm:"column:status;size:20;index;default:active"`
	Provider  string `gorm:"column:provider;size:50"`
	Model     string `gorm:"column:model;size:100"`
	CreatedAt int64  `gorm:"column:created_at;index"`
	UpdatedAt int64  `gorm:"column:updated_at;index"`
}

func (OpsAssistantSession) TableName() string { return "ops_assistant_sessions" }

type OpsAssistantMessage struct {
	ID        string `gorm:"column:id;primaryKey;size:36"`
	SessionID string `gorm:"column:session_id;index;size:36"`
	AdminID   string `gorm:"column:admin_id;index;size:36"`
	Role      string `gorm:"column:role;size:20"`
	Content   string `gorm:"column:content;type:mediumtext"`
	Seq       int    `gorm:"column:seq;index"`
	CreatedAt int64  `gorm:"column:created_at"`
}

func (OpsAssistantMessage) TableName() string { return "ops_assistant_messages" }

type OpsAssistantToolCall struct {
	ID           string `gorm:"column:id;primaryKey;size:36"`
	MessageID    string `gorm:"column:message_id;index;size:36"`
	SessionID    string `gorm:"column:session_id;index;size:36"`
	Name         string `gorm:"column:name;size:100"`
	InputJSON    string `gorm:"column:input_json;type:mediumtext"`
	OutputJSON   string `gorm:"column:output_json;type:mediumtext"`
	Error        string `gorm:"column:error;type:text"`
	CitationJSON string `gorm:"column:citation_json;type:text"`
	CreatedAt    int64  `gorm:"column:created_at"`
}

func (OpsAssistantToolCall) TableName() string { return "ops_assistant_tool_calls" }
