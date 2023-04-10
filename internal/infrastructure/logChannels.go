package infrastructure

import (
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
)

type channelName string
type userName string
type LogChannels[T entity.LogType] map[channelName]map[userName]chan T

func NewLogChannels[T entity.LogType]() *LogChannels[T] {
	channelsSet := make(LogChannels[T])
	return &channelsSet
}

func (c *LogChannels[T]) Get(channel string, user string) chan T {
	cn := channelName(channel)
	un := userName(user)

	if _, ok := (*c)[cn]; !ok {
		(*c)[cn] = make(map[userName]chan T)
	}

	if _, ok := (*c)[cn][un]; !ok {
		(*c)[cn][un] = make(chan T)
	}

	return (*c)[cn][un]
}

func (c *LogChannels[T]) Send(channel string, user string, data T) {
	cn := channelName(channel)
	un := userName(user)

	if (*c)[cn] != nil && (*c)[cn][un] != nil {
		(*c)[cn][un] <- data
	}
}

func (c *LogChannels[T]) Close(channel string, user string) {
	cn := channelName(channel)
	un := userName(user)

	if (*c)[cn] != nil && (*c)[cn][un] != nil {
		close((*c)[cn][un])
		delete((*c)[cn], un)
	}
}
