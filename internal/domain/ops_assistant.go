package domain

// OpsAssistantSession is an admin-owned chat session.
type OpsAssistantSession struct {
	ID        string `json:"id"`
	AdminID   string `json:"adminId"`
	Title     string `json:"title"`
	Status    string `json:"status"` // active | archived
	Provider  string `json:"provider,omitempty"`
	Model     string `json:"model,omitempty"`
	SkillID   string `json:"skillId,omitempty"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// OpsAssistantToolCall stores a tool invocation attached to an assistant message.
type OpsAssistantToolCall struct {
	ID           string `json:"id"`
	MessageID    string `json:"messageId"`
	SessionID    string `json:"sessionId"`
	Name         string `json:"name"`
	InputJSON    string `json:"input,omitempty"`
	OutputJSON   string `json:"output,omitempty"`
	Error        string `json:"error,omitempty"`
	CitationJSON string `json:"citation,omitempty"`
	CreatedAt    int64  `json:"createdAt"`
}

// OpsAssistantMessage is a persisted chat turn.
type OpsAssistantMessage struct {
	ID        string                  `json:"id"`
	SessionID string                  `json:"sessionId"`
	AdminID   string                  `json:"adminId"`
	Role      string                  `json:"role"` // user | assistant
	Content   string                  `json:"content"`
	Seq       int                     `json:"seq"`
	CreatedAt int64                   `json:"createdAt"`
	Tools     []OpsAssistantToolCall  `json:"tools,omitempty"`
}

// OpsAssistantSessionDetail includes messages for resume.
type OpsAssistantSessionDetail struct {
	Session  *OpsAssistantSession  `json:"session"`
	Messages []OpsAssistantMessage `json:"messages"`
}

// OpsAssistantSessionQuery lists sessions for an admin.
type OpsAssistantSessionQuery struct {
	AdminID  string
	Status   string
	Page     int
	PageSize int
}
