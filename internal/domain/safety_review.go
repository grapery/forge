package domain

type SafetyAssetItem struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	UserName  string `json:"userName"`
	Type      string `json:"type"`
	Name      string `json:"name"`
	URL       string `json:"url"`
	Thumbnail string `json:"thumbnail"`
	MimeType  string `json:"mimeType"`
	Size      int64  `json:"size"`
	CreatedAt int64  `json:"createdAt"`
}

type SafetyAssetQuery struct {
	Page     int
	PageSize int
	UserID   string
	Type     string
}

type SafetyConversationItem struct {
	ID            string `json:"id"`
	OwnerUserID   string `json:"ownerUserId"`
	OwnerUserName string `json:"ownerUserName"`
	SessionType   string `json:"sessionType"`
	PeerUserID    string `json:"peerUserId"`
	CharacterID   string `json:"characterId"`
	Title         string `json:"title"`
	LastMessage   string `json:"lastMessage"`
	LastMessageAt int64  `json:"lastMessageAt"`
}

type SafetyConversationQuery struct {
	Page, PageSize int
	UserID         string
	SessionType    string
}
