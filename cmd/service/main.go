package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/interface/routes"
	"log"
)

func main() {
	// Load .env file
	err := godotenv.Load("config/.env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Create a new Fiber app
	app := fiber.New()

	// Define your routes here
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	routes.KVSLogRoutes(app)

	// Start the server and listen on port 3000
	err = app.Listen(":3000")
	if err != nil {
		log.Fatal(err)
	}
}
