package repository

type KVSLogRepository interface {
	save()
	getAll()
}
