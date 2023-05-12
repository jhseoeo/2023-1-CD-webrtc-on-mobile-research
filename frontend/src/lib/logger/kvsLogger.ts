import config from '$lib/config';
import Logger from '$lib/logger/logger';
import type { LogType } from './logType';

export default class KVSLogger extends Logger {
	async init() {
		await super.init_(config.kvsLogServer + '/kvslog/ws');
	}

	async postLog(channel: string, userId: string, class_: string, type: string, content: string) {
		await super.post({
			data: {
				channel,
				userId,
				class: class_,
				type,
				date: new Date(),
				content
			},
			save: this.saveLogs
		});
	}
}
