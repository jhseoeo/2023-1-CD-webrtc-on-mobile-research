package infrastructure

type channelName string
type userName string
type channelsSet map[channelName]map[userName]chan string

var ChannelsSet channelsSet

func init() {
	ChannelsSet = make(channelsSet)
}

func (c *channelsSet) Get(channel string, user string) chan string {
	cn := channelName(channel)
	un := userName(user)

	if (*c)[cn] == nil {
		(*c)[cn] = make(map[userName]chan string)
	}

	if (*c)[cn][un] == nil {
		(*c)[cn] = make(map[userName]chan string)
	}

	return (*c)[cn][un]
}

func (c *channelsSet) Send(channel string, user string, data string) {
	cn := channelName(channel)
	un := userName(user)

	if (*c)[cn] != nil && (*c)[cn][un] != nil {
		(*c)[cn][un] <- data
	}
}

func (c *channelsSet) Close(channel string, user string) {
	cn := channelName(channel)
	un := userName(user)

	close((*c)[cn][un])
}
