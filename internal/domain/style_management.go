package domain

type StyleConfigItem struct {
	ID            string `json:"id"`
	Style         string `json:"style"`
	Description   string `json:"description"`
	SampleImageURL string `json:"sampleImageUrl"`
	UserID        string `json:"userId"`
	UserName      string `json:"userName"`
	CreatedAt     int64  `json:"createdAt"`
	UpdatedAt     int64  `json:"updatedAt"`
}

type StyleListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Search   string `form:"search,omitempty"`
	UserID   string `form:"userId,omitempty"`
}

type StyleUpdateRequest struct {
	Description   string `json:"description"`
	SampleImageURL string `json:"sampleImageUrl"`
}
