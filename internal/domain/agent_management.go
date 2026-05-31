package domain

type AgentItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CharacterID string `json:"characterId"`
	CharacterName string `json:"characterName"`
	Provider    string `json:"provider"`
	Model       string `json:"model"`
	Status      string `json:"status"`
	UserID      string `json:"userId"`
	UserName    string `json:"userName"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type AgentListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Status   string `form:"status,omitempty"`
	Provider string `form:"provider,omitempty"`
}

type AgentSkillItem struct {
	ID          string `json:"id"`
	AgentID     string `json:"agentId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	CreatedAt   int64  `json:"createdAt"`
}

type AgentSkillQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
}

type AgentInteractionItem struct {
	ID        string `json:"id"`
	AgentID   string `json:"agentId"`
	UserID    string `json:"userId"`
	UserName  string `json:"userName"`
	Type      string `json:"type"`
	Input     string `json:"input"`
	Output    string `json:"output"`
	Tokens    int    `json:"tokens"`
	CreatedAt int64  `json:"createdAt"`
}

type AgentInteractionQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
}

type AgentStats struct {
	TotalAgents    int64 `json:"totalAgents"`
	ActiveAgents   int64 `json:"activeAgents"`
	TotalSkills    int64 `json:"totalSkills"`
	TotalInteractions int64 `json:"totalInteractions"`
}

type UpdateAgentStatusRequest struct {
	Status string `json:"status" binding:"required"`
}
