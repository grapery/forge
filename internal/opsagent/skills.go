package opsagent

import (
	"fmt"
	"strings"
)

// AnalysisSkill is a reusable ops analysis playbook (business process + how to analyze).
type AnalysisSkill struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	TitleZh        string   `json:"titleZh"`
	Process        string   `json:"process"`
	ProcessZh      string   `json:"processZh"`
	HowToAnalyze   string   `json:"howToAnalyze"`
	HowToAnalyzeZh string   `json:"howToAnalyzeZh"`
	SuggestedTools []string `json:"suggestedTools"`
	ChipPrompt     string   `json:"chipPrompt"`
	ChipPromptZh   string   `json:"chipPromptZh"`
}

var analysisSkills = []AnalysisSkill{
	{
		ID:      "growth",
		Title:   "Growth health check",
		TitleZh: "增长健康度",
		Process: "Daily ops reviews whether user acquisition and content creation are healthy versus the prior window, then flags anomalies for UA and content teams.",
		ProcessZh: "日常运营对照近期窗口检查获客与内容生产是否健康，异常再分发给增长/内容团队。",
		HowToAnalyze: "1) Call get_dashboard_overview with days=7 (and optionally 30). 2) Compare newUsers / newStories / newFragments trends. 3) Call get_user_status_counts for suspended ratio. 4) Call get_search_trends for demand signals. 5) Summarize: growth direction, content throughput, risks.",
		HowToAnalyzeZh: "1) 拉取 7 日（可选 30 日）总览；2) 对比新增用户/故事/碎片趋势；3) 看用户状态分布；4) 看搜索热词；5) 总结增长方向、内容产能与风险。",
		SuggestedTools: []string{"get_dashboard_overview", "get_user_status_counts", "get_search_trends", "get_content_status_counts"},
		ChipPrompt:     "Run a growth health check for the last 7 days using the growth skill.",
		ChipPromptZh:   "按增长健康度技能，分析过去 7 天增长与内容产能。",
	},
	{
		ID:      "ai_health",
		Title:   "AI pipeline health",
		TitleZh: "AI 链路健康度",
		Process: "Ops monitors AI task queue and generation volume so failed/pending jobs do not block creator experience.",
		ProcessZh: "运营监控 AI 任务队列与生成量，避免失败/积压影响创作者体验。",
		HowToAnalyze: "1) get_ai_task_summary — note pending vs failed vs completed. 2) list_failed_ai_tasks for concrete failures. 3) get_ai_generation_summary — volume and failures. 4) get_agent_stats if agents are used. 5) Compute failure rate; call out backlog risk if pending is high. 6) Recommend which queue to inspect first.",
		HowToAnalyzeZh: "1) 看任务汇总；2) 列出失败任务明细；3) 看生成汇总；4) 如有智能体再看 agent 统计；5) 计算失败率并标出积压；6) 指出应优先排查的队列。",
		SuggestedTools: []string{"get_ai_task_summary", "list_failed_ai_tasks", "get_ai_generation_summary", "get_agent_stats", "get_token_summary"},
		ChipPrompt:     "Analyze AI task and generation health using the ai_health skill.",
		ChipPromptZh:   "按 AI 链路健康度技能，分析任务失败率与积压。",
	},
	{
		ID:      "moderation",
		Title:   "Trust & safety backlog",
		TitleZh: "审核与客服积压",
		Process: "Support and moderation triage open reports and feedback against SLA (reports ~24h, feedback first-touch ~24h / escalate ~72h).",
		ProcessZh: "客服与审核对照 SLA（举报约 24h、反馈首响约 24h / 升级约 72h）处理积压。",
		HowToAnalyze: "1) get_moderation_summary for pending/overdue reports and blocks. 2) list_pending_reports with overdueOnly=true for the worst backlog. 3) get_feedback_summary + list_overdue_feedback. 4) Prioritize overdue items. 5) State whether SLA is breached and which queue is worse.",
		HowToAnalyzeZh: "1) 看举报/拉黑积压；2) 列出超时待处理举报；3) 看反馈汇总并列出超时反馈；4) 优先超时单；5) 判断 SLA 是否破线及哪条队列更严重。",
		SuggestedTools: []string{"get_moderation_summary", "list_pending_reports", "get_feedback_summary", "list_overdue_feedback"},
		ChipPrompt:     "Check moderation and feedback backlog against SLA using the moderation skill.",
		ChipPromptZh:   "按审核与客服积压技能，检查举报与反馈是否超时。",
	},
	{
		ID:      "revenue",
		Title:   "Monetization pulse",
		TitleZh: "变现脉搏",
		Process: "Finance/ops reviews orders, memberships, and token economy for revenue health and refund risk.",
		ProcessZh: "财务/运营查看订单、会员与代币经济，判断收入健康与退款风险。",
		HowToAnalyze: "1) get_orders_membership_summary. 2) get_token_summary. 3) get_dashboard_overview(days=7) for newOrders trend. 4) Highlight pending/refunded orders and membership mix. 5) Flag anomalies vs typical volume if visible in the data.",
		HowToAnalyzeZh: "1) 订单+会员汇总；2) 代币汇总；3) 7 日总览看新订单趋势；4) 标出待支付/退款与会员结构；5) 结合数据标出异常。",
		SuggestedTools: []string{"get_orders_membership_summary", "get_token_summary", "get_dashboard_overview"},
		ChipPrompt:     "Summarize orders, memberships, and tokens using the revenue skill.",
		ChipPromptZh:   "按变现脉搏技能，汇总订单、会员与代币情况。",
	},
	{
		ID:      "growth_share",
		Title:   "Share & virality",
		TitleZh: "分享与传播",
		Process: "Growth team reviews share issue/open funnel to see which content kinds drive discovery.",
		ProcessZh: "增长团队看分享发起/打开漏斗，判断哪类内容带动发现。",
		HowToAnalyze: "1) get_share_overview with days=7 or 30. 2) Compare totalIssues vs totalOpens and openRate. 3) Break down byKindIssues/byKindOpens. 4) Relate to get_content_status_counts and search trends if useful.",
		HowToAnalyzeZh: "1) 拉取分享总览；2) 对比发起/打开与打开率；3) 按内容类型拆分；4) 必要时结合内容状态与搜索趋势。",
		SuggestedTools: []string{"get_share_overview", "get_content_status_counts", "get_search_trends"},
		ChipPrompt:     "Analyze share funnel and open rate using the growth_share skill.",
		ChipPromptZh:   "按分享与传播技能，分析分享漏斗与打开率。",
	},
	{
		ID:      "audit_security",
		Title:   "Admin action review",
		TitleZh: "管理操作复核",
		Process: "Security/ops periodically reviews recent admin mutations for unusual activity.",
		ProcessZh: "安全/运营定期复核近期管理员写操作，发现异常行为。",
		HowToAnalyze: "1) get_recent_audit with limit=20. 2) Group by action/resource. 3) Call out destructive or high-impact actions. 4) Do not invent actors or times — only use returned rows.",
		HowToAnalyzeZh: "1) 拉取最近审计；2) 按 action/resource 归类；3) 标出高影响操作；4) 不编造操作者或时间。",
		SuggestedTools: []string{"get_recent_audit"},
		ChipPrompt:     "Review recent admin audit actions using the audit_security skill.",
		ChipPromptZh:   "按管理操作复核技能，梳理最近审计日志。",
	},
}

// ListAnalysisSkills returns all playbooks.
func ListAnalysisSkills() []AnalysisSkill {
	out := make([]AnalysisSkill, len(analysisSkills))
	copy(out, analysisSkills)
	return out
}

// GetAnalysisSkill returns a playbook by id (case-insensitive).
func GetAnalysisSkill(id string) *AnalysisSkill {
	id = strings.ToLower(strings.TrimSpace(id))
	for i := range analysisSkills {
		if analysisSkills[i].ID == id {
			s := analysisSkills[i]
			return &s
		}
	}
	return nil
}

func (s AnalysisSkill) promptBlock() string {
	return fmt.Sprintf(`Active analysis skill: %s (%s)
Business process: %s
How to analyze:
%s
Preferred tools (call these first): %s`,
		s.Title, s.ID, s.Process, s.HowToAnalyze, strings.Join(s.SuggestedTools, ", "))
}

func skillsCatalogPrompt() string {
	var b strings.Builder
	b.WriteString("Available analysis skills (you may call list_analysis_skills / get_analysis_skill, or follow SuggestedTools):\n")
	for _, s := range analysisSkills {
		b.WriteString(fmt.Sprintf("- %s: %s → tools [%s]\n", s.ID, s.Title, strings.Join(s.SuggestedTools, ", ")))
	}
	return b.String()
}
