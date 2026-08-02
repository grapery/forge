package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// --- MembershipService ---

type MembershipService struct {
	db        *gorm.DB
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
	logger    *zap.Logger
}

func NewMembershipService(db *gorm.DB, readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository, logger *zap.Logger) *MembershipService {
	return &MembershipService{db: db, readRepo: readRepo, writeRepo: writeRepo, logger: logger}
}

func (s *MembershipService) List(query *domain.PaymentListQuery) ([]*domain.MembershipItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListMemberships(query)
}

func (s *MembershipService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetMembershipDetail(id)
}

func (s *MembershipService) Summary() (*domain.MembershipSummary, error) {
	return s.readRepo.CountMembershipsByTier()
}

var errValidation = errors.New("validation error")
var errNotFound = errors.New("not found")
var errInvalidState = errors.New("invalid state")

func IsValidationError(err error) bool { return errors.Is(err, errValidation) }
func IsNotFound(err error) bool        { return errors.Is(err, errNotFound) }
func IsInvalidState(err error) bool    { return errors.Is(err, errInvalidState) }

// Upsert creates or updates the user's active membership inside a single transaction.
// Token grant flow: first-time creation grants full quota; updates grant only the
// positive delta (downgrades do not claw back).
func (s *MembershipService) Upsert(req *domain.MembershipUpsertRequest) error {
	if !domain.IsValidMembershipTier(req.Tier) {
		return fmt.Errorf("%w: invalid tier %q", errValidation, req.Tier)
	}
	if req.EndDate <= time.Now().Unix() {
		return fmt.Errorf("%w: endDate must be in the future", errValidation)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		active, err := s.readRepo.GetActiveMembershipByUserIDTx(tx, req.UserID)
		if err != nil {
			return err
		}

		if active == nil {
			newID, err := s.writeRepo.CreateMembershipTx(tx, req)
			if err != nil {
				return err
			}
			if err := s.writeRepo.InsertTokenGrantTx(tx, req.UserID, newID,
				"admin gift: "+req.Reason, req.TokenQuota); err != nil {
				return err
			}
			return s.writeRepo.InsertAdminGiftOrderTx(tx, req.UserID, "create", req.EndDate)
		}

		// Update existing active membership. Reject downgrade below tokenUsed — would put the row
		// into an inconsistent state (used > quota).
		if req.TokenQuota < active.TokenUsed {
			return fmt.Errorf("%w: tokenQuota (%d) cannot be less than already-used tokens (%d)", errValidation, req.TokenQuota, active.TokenUsed)
		}
		tokenDelta := req.TokenQuota - active.TokenQuota
		if err := s.writeRepo.UpdateMembershipTx(tx, active.ID, req); err != nil {
			return err
		}
		if tokenDelta > 0 {
			if err := s.writeRepo.InsertTokenGrantTx(tx, req.UserID, active.ID,
				"admin adjust: "+req.Reason, tokenDelta); err != nil {
				return err
			}
		}
		return s.writeRepo.InsertAdminGiftOrderTx(tx, req.UserID, "update", req.EndDate)
	})
}

// Renew extends end_date on the membership identified by id. Optionally tops up tokens.
func (s *MembershipService) Renew(id string, req *domain.MembershipRenewRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		m, err := s.readRepo.GetMembershipByIDTx(tx, id)
		if err != nil {
			return err
		}
		if m == nil {
			return fmt.Errorf("%w: membership %s", errNotFound, id)
		}
		if m.Status != "active" {
			return fmt.Errorf("%w: membership is %s, not active", errInvalidState, m.Status)
		}

		now := time.Now().Unix()
		base := max(m.EndDate, now)
		newEndDate := base + int64(req.ExtendDays)*86400

		if err := s.writeRepo.RenewMembershipTx(tx, id, newEndDate); err != nil {
			return err
		}
		if req.TopUpTokens > 0 {
			if err := s.writeRepo.InsertTokenGrantTx(tx, m.UserID, id,
				"admin renew: "+req.Reason, req.TopUpTokens); err != nil {
				return err
			}
		}
		return s.writeRepo.InsertAdminGiftOrderTx(tx, m.UserID, "renew", newEndDate)
	})
}

// Cancel marks the membership cancelled. Already-consumed tokens are not refunded.
func (s *MembershipService) Cancel(id string, req *domain.MembershipCancelRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		m, err := s.readRepo.GetMembershipByIDTx(tx, id)
		if err != nil {
			return err
		}
		if m == nil {
			return fmt.Errorf("%w: membership %s", errNotFound, id)
		}
		if m.Status != "active" {
			return fmt.Errorf("%w: membership is %s, not active", errInvalidState, m.Status)
		}

		if err := s.writeRepo.CancelMembershipTx(tx, id); err != nil {
			return err
		}
		return s.writeRepo.InsertAdminGiftOrderTx(tx, m.UserID, "cancel", time.Now().Unix())
	})
}

// --- PlanService ---

type PlanService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
	logger    *zap.Logger
}

func NewPlanService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository, logger *zap.Logger) *PlanService {
	return &PlanService{readRepo: readRepo, writeRepo: writeRepo, logger: logger}
}

func (s *PlanService) List() ([]*domain.SubscriptionPlanItem, error) {
	return s.readRepo.ListPlans()
}

func (s *PlanService) Create(req *domain.PlanCreateRequest) error {
	return s.writeRepo.CreatePlan(req)
}

func (s *PlanService) Update(id string, req *domain.PlanUpdateRequest) error {
	return s.writeRepo.UpdatePlan(id, req)
}

// --- OrderService ---

type OrderService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
	logger    *zap.Logger
}

func NewOrderService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository, logger *zap.Logger) *OrderService {
	return &OrderService{readRepo: readRepo, writeRepo: writeRepo, logger: logger}
}

func (s *OrderService) List(query *domain.PaymentListQuery) ([]*domain.SubscriptionOrderItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListOrders(query)
}

func (s *OrderService) GetDetail(id string) (*domain.SubscriptionOrderItem, error) {
	return s.readRepo.GetOrderDetail(id)
}

func (s *OrderService) Summary() (*domain.OrderSummary, error) {
	return s.readRepo.GetOrderSummary()
}

func (s *OrderService) Refund(id string, req *domain.RefundRequest) error {
	return s.writeRepo.RefundOrder(id, req.Reason)
}
