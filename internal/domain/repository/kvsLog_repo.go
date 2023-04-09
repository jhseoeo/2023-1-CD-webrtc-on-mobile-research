package repository

import (
	"context"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
)

type KVSLogRepository interface {
	Insert(context.Context, entity.KVSLog) error
	GetAll(context.Context) ([]entity.KVSLog, error)
	GetByUserId(context.Context, string) ([]entity.KVSLog, error)
}
