import config from '$lib/config';
import Logger from '$lib/logging/logger';

class KVSLogger extends Logger {
	init() {
		super.init(config.kvsLogServer);
	}
}

export default new KVSLogger();
