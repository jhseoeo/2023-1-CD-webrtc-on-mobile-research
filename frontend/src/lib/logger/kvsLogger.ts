import config from '$lib/config';
import Logger from '$lib/logger/logger';

export default class KVSLogger extends Logger {
	async init() {
		await super.init_(config.kvsLogServer + '/kvslog/ws');
	}

	async postLog(channel: string, userId: string, class_: string, type: string, content: string) {
		await super.post({
			channel,
			userId,
			class: class_,
			type,
			date: new Date(),
			content
		});
	}
}
