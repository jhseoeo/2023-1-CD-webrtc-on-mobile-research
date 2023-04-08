import config from '$lib/config';
import Logger from '$lib/logging/logger';

export default class LogReceiver extends Logger {
	async init() {
		await super.init(config.kvsLogServer + '/logviewer/ws');
	}
}
