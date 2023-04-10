package route

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/application/services"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
)

func KVSLogViewerRoutes(a *fiber.App, service services.LogViewerService) {
	route := a.Group("/logviewer")

	route.Get("/kvslog/ws", websocket.New(func(c *websocket.Conn) {
		channel := c.Query("channel")
		user := c.Query("user")

		closeFunc := service.DescribeKVSLogs(channel, user, func(kvsLog entity.KVSLog) error {
			err := c.WriteJSON(kvsLog)
			return err
		})
		defer closeFunc()

		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					fmt.Println(err)
				} else {
					fmt.Println(err)
				}
				break
			}
		}
	}))
}
