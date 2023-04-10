package infrastructure

import (
	"fmt"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/infrastructure/persistence"
	"os"
	"testing"

	"github.com/joho/godotenv"
)

func Test_NewMongoClient(t *testing.T) {
	err := godotenv.Load("../.env.local")
	if err != nil {
		t.Error(err)
	}

	uri := os.Getenv("MONGO_HOST")
	fmt.Println(uri)

	_, err = persistence.NewMongoDatabase()
	if err != nil {
		t.Error(err)
	}
}
