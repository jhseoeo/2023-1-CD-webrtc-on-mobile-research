import {
	PUBLIC_KINESIS_REGION,
	PUBLIC_KINESIS_ACCESS_KEY_ID,
	PUBLIC_KINESIS_SECRET_ACCESS_KEY,
	PUBLIC_LOG_SERVER_ADDRESS
} from '$env/static/public';

export default {
	kinesisRegion: PUBLIC_KINESIS_REGION,
	kinesisAccessKeyId: PUBLIC_KINESIS_ACCESS_KEY_ID,
	kinesisSecretAccessKey: PUBLIC_KINESIS_SECRET_ACCESS_KEY,
	kvsLogServer: PUBLIC_LOG_SERVER_ADDRESS,
	reportLogs: false,
	printConsole: true,
	turnOnly: false
};
