import config from '$lib/config';
import Logger from '$lib/logger/logger';

export default class KVSLogReceiver extends Logger {
	async init(channel: string, user: string) {
		await super.init_(`${config.kvsLogServer}/logviewer/kvslog/ws?channel=${channel}&user=${user}`);
	}
}
