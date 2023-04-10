import config from '$lib/config';
import Logger from '$lib/logging/logger';

export default class KVSLogReceiver extends Logger {
	async init(channel, user) {
		await super.init(`${config.kvsLogServer}/logviewer/kvslog/ws?channel=${channel}&user=${user}`);
	}
}
