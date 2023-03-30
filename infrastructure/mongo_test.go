package infrastructure

import (
	"fmt"
	"github.com/joho/godotenv"
	"os"
	"testing"
)

func Test_NewMongoClient(t *testing.T) {
	err := godotenv.Load("../dev.env")
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
