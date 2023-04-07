package routes

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/application/services"
	model "github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/domain/entity"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/infrastructure"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/infrastructure/persistence"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/interface/handlers"
)

func KVSLogRoutes(a *fiber.App) {
	route := a.Group("/kvsLog")

	database, err := infrastructure.NewMongoDatabase()
	if err != nil {
		panic(err)
	}

	repoImpl := persistence.NewKVSLogRepositoryImpl(database)
	service := services.KVSLogService{KVSLogRepository: repoImpl}

	route.Get("/ws", handlers.NewWebsocketHandler(func(log model.KVSLog) {
		err := service.SaveLog(context.Background(), log)
		if err != nil {
			fmt.Println(err)
		}
	}))
}
