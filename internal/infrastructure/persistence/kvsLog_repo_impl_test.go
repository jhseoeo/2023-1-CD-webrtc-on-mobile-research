package persistence

import (
	"context"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
	"testing"
	"time"

	"github.com/joho/godotenv"
)

func Test_KVSLogRepositoryImpl(t *testing.T) {
	err := godotenv.Load("../../.env.local")
	if err != nil {
		t.Error(err)
	}

	database, err := NewMongoDatabase()
	if err != nil {
		t.Error(err)
	}

	kvsLog := entity.KVSLog{
		UserID:  "asd",
		Class:   "asd",
		Type:    "asd",
		Date:    time.Now(),
		Content: "asd",
	}
	coll := database.Collection("kvs_logs")
	k := KVSLogRepositoryImpl{coll}

	err = k.Insert(context.Background(), kvsLog)
	if err != nil {
		t.Error(err)
	}

	logs, err := k.GetAll(context.Background())
	if err != nil {
		t.Error(err)
	}
	t.Log(logs)
}
