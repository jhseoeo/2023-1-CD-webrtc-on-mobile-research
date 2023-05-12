package dto

import (
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
)

type LogResponse[T entity.LogType] struct {
	Data T `json:"data"`
}
