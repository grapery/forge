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
	TotalTransactions int64 `json:"totalTransactions"`
	TotalGranted      int64 `json:"totalGranted"`
	TotalConsumed     int64 `json:"totalConsumed"`
	TotalPurchased    int64 `json:"totalPurchased"`
}

type TokenListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	UserID   string `form:"userId,omitempty"`
	Type     string `form:"type,omitempty"`
	DateFrom string `form:"dateFrom,omitempty"`
	DateTo   string `form:"dateTo,omitempty"`
}
