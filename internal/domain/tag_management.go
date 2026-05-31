package domain

type TagItem struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Category   string `json:"category"`
	UsageCount int    `json:"usageCount"`
	CreatedAt  int64  `json:"createdAt"`
}

type TagListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Category string `form:"category,omitempty"`
	Search   string `form:"search,omitempty"`
}

type TagCreateRequest struct {
	Name     string `json:"name" binding:"required"`
	Category string `json:"category"`
}

type TagUpdateRequest struct {
	Name     string `json:"name"`
	Category string `json:"category"`
}
