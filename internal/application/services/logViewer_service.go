package services

import (
	"fmt"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/infrastructure"
)

type LogViewerService struct {
	kvsLogChannels *infrastructure.LogChannels[entity.KVSLog]
}

func NewLogViewerService(kvsLogChannels *infrastructure.LogChannels[entity.KVSLog]) LogViewerService {
	return LogViewerService{kvsLogChannels: kvsLogChannels}
}

func (l LogViewerService) DescribeKVSLogs(channel string, user string, f func(kvsLog entity.KVSLog) error) func() {
	logChannel := l.kvsLogChannels.Get(channel, user)
	done := make(chan struct{})

	go func() {
		defer func() {
			l.kvsLogChannels.Close(channel, user)
		}()

		for {
			select {
			case data := <-logChannel:
				fmt.Println(data)
				err := f(data)
				if err != nil {
					fmt.Println(err)
					return
				}
			case <-done:
				return
			}
		}
	}()

	return func() {
		close(done)
	}
}
