package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/application/services"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/infrastructure"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/infrastructure/persistence"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/interface/route"
	"go.mongodb.org/mongo-driver/mongo"
)

var mongodb *mongo.Database
var kvsLogChannels *infrastructure.LogChannels[entity.KVSLog]

func initializeApp(app *fiber.App) {
	app.Static("/", "./public")

	var err error
	mongodb, err = persistence.NewMongoDatabase()
	if err != nil {
		panic(err)
	}

	kvsLogChannels = infrastructure.NewLogChannels()

	initializeKVSLog(app)
	initializeLogViewer(app)
}

func initializeKVSLog(app *fiber.App) {
	repoImpl := persistence.NewKVSLogRepositoryImpl(mongodb)
	service := services.NewKVSLogService(repoImpl, kvsLogChannels)

	route.KVSLogRoutes(app, service)
}

func initializeLogViewer(app *fiber.App) {
	service := services.NewLogViewerService(kvsLogChannels)

	route.KVSLogViewerRoutes(app, service)
}
