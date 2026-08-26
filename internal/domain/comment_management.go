package domain

type CommentItem struct {
	ID         string `json:"id"`
	AuthorID   string `json:"authorId"`
	AuthorName string `json:"authorName"`
	Content    string `json:"content"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	ParentID   string `json:"parentId"`
	RootID     string `json:"rootId"`
	Likes      int    `json:"likes"`
	Dislikes   int    `json:"dislikes"`
	ReplyCount int    `json:"replyCount"`
	CreatedAt  int64  `json:"createdAt"`
	IsRemoved  bool   `json:"isRemoved"`
}

type CommentListQuery struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"pageSize"`
	TargetType string `form:"targetType,omitempty"`
	TargetID   string `form:"targetId,omitempty"`
	AuthorID   string `form:"authorId,omitempty"`
	Search     string `form:"search,omitempty"`
	Lifecycle  string `form:"lifecycle,omitempty"` // active / removed / all
}

type CommentStatusCount struct {
	Total             int64 `json:"total"`
	StoryComments     int64 `json:"storyComments"`
	FragmentComments  int64 `json:"fragmentComments"`
	CharacterComments int64 `json:"characterComments"`
	Removed           int64 `json:"removed"`
}
