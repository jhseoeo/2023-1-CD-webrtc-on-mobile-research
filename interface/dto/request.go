package dto

import model "github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/domain/entity"

type LogType interface {
	model.KVSLog
}

type LogRequest[T LogType] struct {
	Data T `json:"data"`
}
