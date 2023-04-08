package repository

import (
	"context"
	model "github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/domain/entity"
)

type KVSLogRepository interface {
	Insert(context.Context, model.KVSLog) error
	GetAll(context.Context) ([]model.KVSLog, error)
	GetByUserId(context.Context, string) ([]model.KVSLog, error)
}
