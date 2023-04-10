package services

import (
	"context"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/repository"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/infrastructure"
	"log"
	"os"
)

type KVSLogService struct {
	kvsLogRepository repository.KVSLogRepository
	logChannels      *infrastructure.LogChannels[entity.KVSLog]
}

func NewKVSLogService(repoImpl repository.KVSLogRepository, kvsLogChannels *infrastructure.LogChannels[entity.KVSLog]) KVSLogService {
	return KVSLogService{kvsLogRepository: repoImpl, logChannels: kvsLogChannels}
}

func (k KVSLogService) SaveLog(ctx context.Context, kvsLog entity.KVSLog) error {
	if os.Getenv("PRINT_CONSOLE") == "True" {
		log.Println(kvsLog)
	}
	k.logChannels.Send(kvsLog.Channel, kvsLog.UserID, kvsLog)
	return k.kvsLogRepository.Insert(ctx, kvsLog)
}

func (k KVSLogService) GetAllLogs(ctx context.Context) ([]entity.KVSLog, error) {
	return k.kvsLogRepository.GetAll(ctx)
}

func (k KVSLogService) GetLogsByUserId(ctx context.Context, userId string) ([]entity.KVSLog, error) {
	return k.kvsLogRepository.GetByUserId(ctx, userId)
}
