package infrastructure

import (
	"context"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func NewMongoDatabase() (*mongo.Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var uri = os.Getenv("MONGO_HOST")
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	database := client.Database("logs")
	if err != nil {
		return nil, err
	}

	return database, nil
}
