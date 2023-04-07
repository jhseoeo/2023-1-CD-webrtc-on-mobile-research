package infrastructure

import (
	"fmt"
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

	_, err = NewMongoDatabase()
	if err != nil {
		t.Error(err)
	}
}
