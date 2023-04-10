package main

import (
	"flag"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	var mod string
	flag.StringVar(&mod, "mod", "DEV", "DEV || PROD")
	log.Println(mod)

	envPath := map[string]string{
		"DEV":  "./.env.local",
		"PROD": "./.env.production",
	}

	err := godotenv.Load(envPath[mod])
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	app := fiber.New()
	initializeApp(app)

	err = app.Listen(":8484")
	if err != nil {
		log.Fatal(err)
	}
}
