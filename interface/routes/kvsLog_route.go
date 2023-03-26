package routes

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func KVSLogRoutes(a *fiber.App) {
	route := a.Group("/kvsLog")

	route.Get("/log", websocket.New(func(c *websocket.Conn) {
		var aa = struct {
			Data string `json:"data"`
		}{}
		err := c.ReadJSON(&aa)
		if err != nil {
			fmt.Println(err)
		} else {
			fmt.Println(aa)
		}
	}))
}
