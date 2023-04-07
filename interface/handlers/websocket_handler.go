package handlers

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/interface/dto"
)

type wsData struct {
	Data interface{} `json:"data"`
}

func NewWebsocketHandler[T dto.LogType](f func(T)) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		defer func() {
			c.Close()
		}()

		for {
			var message dto.LogDTO[T]
			err := c.ReadJSON(&message)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					fmt.Println(err)
				} else {
					fmt.Println(err)
				}
				return
			} else {
				f(message.Data)
			}
		}
	})
}
