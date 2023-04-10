package entity

import "time"

type KVSLog struct {
	Channel string    `json:"channel" ,bson:"channel"`
	UserID  string    `json:"userID" ,bson:"user_id"`
	Class   string    `json:"class" ,bson:"class"` // "Master", "Viewer"
	Type    string    `json:"type" ,bson:"type"`   // "SDP", "ICE", and so on..
	Date    time.Time `json:"date" ,bson:"date"`
	Content string    `json:"content" ,bson:"content"`
}
