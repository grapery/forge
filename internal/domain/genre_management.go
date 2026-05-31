package domain

type GenreCatalogItem struct {
	ID        string `json:"id"`
	Slug      string `json:"slug"`
	PageIndex int    `json:"pageIndex"`
	SortOrder int    `json:"sortOrder"`
	TitleZh   string `json:"titleZh"`
	TitleEn   string `json:"titleEn"`
	TitleJa   string `json:"titleJa"`
	Emoji     string `json:"emoji"`
	Source    string `json:"source"`
	CreatedAt int64  `json:"createdAt"`
}

type GenreListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Search   string `form:"search,omitempty"`
}

type GenreUpdateRequest struct {
	TitleZh   string `json:"titleZh"`
	TitleEn   string `json:"titleEn"`
	TitleJa   string `json:"titleJa"`
	Emoji     string `json:"emoji"`
	SortOrder int    `json:"sortOrder"`
}
