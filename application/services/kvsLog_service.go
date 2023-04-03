package services

import (
	"context"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/domain/entity"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/domain/repository"
	"log"
	"os"
)

type KVSLogService struct {
	KVSLogRepository repository.KVSLogRepository
}

func (k KVSLogService) SaveLog(ctx context.Context, kvsLog model.KVSLog) error {
	if os.Getenv("PRINT_CONSOLE") == "True" {
		log.Println(kvsLog)
	}
	return k.KVSLogRepository.Insert(ctx, kvsLog)
}

func (k KVSLogService) GetAllLogs(ctx context.Context) ([]model.KVSLog, error) {
	return k.KVSLogRepository.GetAll(ctx)
}

func (k KVSLogService) GetLogsByUserId(ctx context.Context, userId string) ([]model.KVSLog, error) {
	return k.KVSLogRepository.GetByUserId(ctx, userId)
}
