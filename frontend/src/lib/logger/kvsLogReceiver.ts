import config from '$lib/config';
import Logger from '$lib/logger/logger';
import type { LogType } from './logType';

export default class KVSLogReceiver extends Logger {
	constructor() {
		super(false, false, false);
	}

	public async init(channel: string, user: string) {
		await super.init_(`${config.kvsLogServer}/logviewer/kvslog/ws?channel=${channel}&user=${user}`);
	}

	public registerMessageHandler(handler: (data: LogType) => void) {
		super.changeMessageHandler((logReceiveData) => {
			handler(logReceiveData.data);
		});
	}
}
