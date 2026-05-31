package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

// --- MembershipService ---

type MembershipService struct {
	readRepo *mysql.ReadRepository
	logger   *zap.Logger
}

func NewMembershipService(readRepo *mysql.ReadRepository, logger *zap.Logger) *MembershipService {
	return &MembershipService{readRepo: readRepo, logger: logger}
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

func (s *OrderService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetOrderDetail(id)
}

func (s *OrderService) Summary() (*domain.OrderSummary, error) {
	return s.readRepo.GetOrderSummary()
}

func (s *OrderService) Refund(id string, req *domain.RefundRequest) error {
	return s.writeRepo.RefundOrder(id, req.Reason)
}
