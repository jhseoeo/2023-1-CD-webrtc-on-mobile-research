package main

import (
	"flag"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/interface/routes"
)

func main() {
	var mod string
	flag.StringVar(&mod, "mod", "DEV", "DEV || PROD")

	envPath := map[string]string{
		"DEV":  "./.env.local",
		"PROD": "./.env.production",
	}

	err := godotenv.Load(envPath[mod])
	if err != nil {
		log.Fatalf("Error loading dev.env file: %v", err)
	}

	// Create a new Fiber app
	app := fiber.New()

	routes.KVSLogRoutes(app)

	// Start the server and listen on port 3000
	err = app.Listen(":3000")
	if err != nil {
		log.Fatal(err)
	}
}
