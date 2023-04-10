package persistence

import (
	"context"
	"github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research/backend/internal/domain/entity"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type KVSLogRepositoryImpl struct {
	kvsLogs *mongo.Collection
}

func NewKVSLogRepositoryImpl(database *mongo.Database) KVSLogRepositoryImpl {
	return KVSLogRepositoryImpl{
		kvsLogs: database.Collection("kvsLogs"),
	}
}

func (k KVSLogRepositoryImpl) Insert(ctx context.Context, kvsLog entity.KVSLog) error {
	_, err := k.kvsLogs.InsertOne(ctx, kvsLog)
	return err
}

func (k KVSLogRepositoryImpl) GetAll(ctx context.Context) ([]entity.KVSLog, error) {
	filter := bson.D{}
	cursor, err := k.kvsLogs.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var result []entity.KVSLog
	for cursor.Next(ctx) {
		var kvsLog entity.KVSLog
		if err := cursor.Decode(&kvsLog); err != nil {
			return nil, err
		}
		result = append(result, kvsLog)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (k KVSLogRepositoryImpl) GetByUserId(ctx context.Context, userId string) ([]entity.KVSLog, error) {
	filter := bson.D{{"user_id", userId}}
	cursor, err := k.kvsLogs.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var result []entity.KVSLog
	for cursor.Next(ctx) {
		var kvsLog entity.KVSLog
		if err := cursor.Decode(&kvsLog); err != nil {
			return nil, err
		}
		result = append(result, kvsLog)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
