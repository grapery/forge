package domain

type TopicStats struct {
	Topic          string `json:"topic"`
	FragmentCount  int64  `json:"fragmentCount"`
	StoryCount     int64  `json:"storyCount"`
	LatestActivity int64  `json:"latestActivity"`
}

type TopicListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Search   string `form:"search,omitempty"`
}
