package domain

type CharacterItem struct {
	ID                      string `json:"id"`
	Name                    string `json:"name"`
	StoryID                 string `json:"storyId"`
	AuthorID                string `json:"authorId"`
	AuthorName              string `json:"authorName"`
	Description             string `json:"description"`
	Avatar                  string `json:"avatar"`
	Poster                  string `json:"poster"`
	Portrait                string `json:"portrait"`
	PortraitGenerationStatus string `json:"portraitGenerationStatus"`
	IsPublic                bool   `json:"isPublic"`
	AIGenerated             bool   `json:"aiGenerated"`
	SourceType              string `json:"sourceType"`
	AIStyle                 string `json:"aiStyle"`
	Likes                   int    `json:"likes"`
	Comments                int    `json:"comments"`
	Shares                  int    `json:"shares"`
	Followers               int    `json:"followers"`
	Stories                 int    `json:"stories"`
	CreatedAt               int64  `json:"createdAt"`
	UpdatedAt               int64  `json:"updatedAt"`
}

type CharacterListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Search   string `form:"search,omitempty"`
	IsPublic *bool  `form:"isPublic,omitempty"`
	AuthorID string `form:"authorId,omitempty"`
}

type CharacterStatusCount struct {
	Total       int64 `json:"total"`
	Public      int64 `json:"public"`
	Private     int64 `json:"private"`
	AIGenerated int64 `json:"aiGenerated"`
}

type CharacterActionRequest struct {
	Action string `json:"action" binding:"required"`
	Reason string `json:"reason,omitempty"`
}
