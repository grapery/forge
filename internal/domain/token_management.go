package domain

type TokenTransactionItem struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	UserName    string `json:"userName"`
	Type        string `json:"type"`
	Amount      int    `json:"amount"`
	Balance     int    `json:"balance"`
	Description string `json:"description"`
	ReferenceID string `json:"referenceId"`
	CreatedAt   int64  `json:"createdAt"`
}

type TokenSummary struct {
	TotalConsumed  int64 `json:"totalConsumed"`
	TotalRecharged int64 `json:"totalRecharged"`
	TotalRefunded  int64 `json:"totalRefunded"`
	TotalGifted    int64 `json:"totalGifted"`
}

type TokenListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	UserID   string `form:"userId,omitempty"`
	Type     string `form:"type,omitempty"`
	DateFrom string `form:"dateFrom,omitempty"`
	DateTo   string `form:"dateTo,omitempty"`
	Keyword  string `form:"keyword,omitempty"`
}
