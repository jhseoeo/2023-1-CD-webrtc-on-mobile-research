package model

import "time"

type KVSLog struct {
	UserID string
	Class  string
	Type   string
	Date   time.Time
	Log    string
}
