import config from '$lib/config';
import Logger from '$lib/logging/logger';

export default class KVSLogger extends Logger {
	async init() {
		await super.init(config.kvsLogServer);
	}

	async post(userId, class_, type, content) {
		console.log(content);
		await super.post({
			userId,
			class: class_,
			type,
			date: new Date(),
			content
		});
	}
}
