package routes

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/application/services"
	model "github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/domain/entity"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/infrastructure"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/infrastructure/persistence"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/interface/dto"
)

func KVSLogRoutes(a *fiber.App) {
	route := a.Group("/kvslog")

	database, err := infrastructure.NewMongoDatabase()
	if err != nil {
		panic(err)
	}

	repoImpl := persistence.NewKVSLogRepositoryImpl(database)
	service := services.KVSLogService{KVSLogRepository: repoImpl}

	route.Post("/log", func(c *fiber.Ctx) error {
		body := c.Body()
		var data dto.LogRequest[model.KVSLog]
		err := json.Unmarshal(body, &data)
		if err != nil {
			return err
		}

		err = service.SaveLog(c.Context(), data.Data)
		if err != nil {
			return err
		}

		return nil
	})

	route.Get("/log", func(c *fiber.Ctx) error {
		userId := c.Query("userId")
		logs, err := service.GetLogsByUserId(c.Context(), userId)
		if err != nil {
			return err
		}

		data, err := json.Marshal(logs)
		if err != nil {
			return err
		}

		err = c.Status(200).Send(data)
		if err != nil {
			return err
		}

		return nil
	})

	route.Get("/ws", websocket.New(func(c *websocket.Conn) {
		defer func() {
			c.Close()
		}()

		for {
			var message dto.LogRequest[model.KVSLog]
			err := c.ReadJSON(&message)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					fmt.Println(err)
				} else {
					fmt.Println(err)
				}
				return
			}

			err = service.SaveLog(context.Background(), message.Data)
			fmt.Println(err)
		}
	}))
}
