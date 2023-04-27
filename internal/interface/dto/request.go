package dto

import (
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
)

type LogRequest[T entity.LogType] struct {
	Save bool `json:"save"`
	Data T    `json:"data"`
}
