package service

import (
	"fmt"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"go.uber.org/zap"
)

const (
	notificationTypeModerationReportResolved = "moderation_report_resolved"
)

func moderationOutcomeCopy(status, remarks, targetLabel string) (title, content string, ok bool) {
	status = strings.ToLower(strings.TrimSpace(status))
	remarks = strings.TrimSpace(remarks)
	switch status {
	case "resolved":
		title = "举报已处理"
		content = fmt.Sprintf("我们已完成对你所提交%s的审核", targetLabel)
		if remarks != "" {
			content += "。\n\n处理说明：" + remarks
		} else {
			content += "，相关内容或用户已按规定处置。"
		}
		return title, content, true
	case "dismissed":
		title = "举报审核结果"
		content = fmt.Sprintf("我们已审核你提交的%s。", targetLabel)
		if remarks != "" {
			content += "\n\n" + remarks
		} else {
			content += " 暂未发现明确违规，感谢你的关注与反馈。"
		}
		return title, content, true
	default:
		return "", "", false
	}
}

func contentReportLink(contentType, contentID string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "story":
		return fmt.Sprintf("/stories/%s", contentID)
	case "storyboard":
		return fmt.Sprintf("/storyboards/%s", contentID)
	case "fragment":
		return fmt.Sprintf("/fragments/%s", contentID)
	case "character":
		return fmt.Sprintf("/characters/%s", contentID)
	case "comment":
		return "/notifications"
	default:
		if contentID == "" {
			return "/notifications"
		}
		return fmt.Sprintf("/%s/%s", contentType, contentID)
	}
}

func (s *ReportService) notifyContentReportOutcome(report *domain.ContentReport) bool {
	if report == nil {
		return false
	}
	label := "内容举报"
	if t := strings.TrimSpace(report.ContentType); t != "" {
		label = fmt.Sprintf("「%s」内容举报", t)
	}
	return s.notifyReporterOutcome(
		report.ReporterID,
		report.Status,
		report.ReviewRemarks,
		contentReportLink(report.ContentType, report.ContentID),
		label,
	)
}

func (s *ReportService) notifyReporterOutcome(reporterID, status, remarks, link, targetLabel string) bool {
	if reporterID == "" {
		return false
	}
	title, content, ok := moderationOutcomeCopy(status, remarks, targetLabel)
	if !ok {
		return false
	}
	if err := s.writeRepo.CreateSystemNotification(reporterID, notificationTypeModerationReportResolved, title, content, link); err != nil {
		s.logger.Warn("failed to create moderation outcome notification",
			zap.String("reporterId", reporterID),
			zap.String("status", status),
			zap.Error(err))
		return false
	}
	return true
}
