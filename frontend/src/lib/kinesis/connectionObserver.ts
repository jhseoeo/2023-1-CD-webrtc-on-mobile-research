const OBSERVER_INTERVAL = 1 * 1000;
const DISCONNECT_COUNT = 2;
const DISCONNECT_TIME = 2000;

export default class ConnectionObserver {
	loop: NodeJS.Timer | undefined;
	pingChannel: RTCDataChannel;
	noBytesCount: number;
	getLastPingReceived: () => Date | null;
	getReceivedBytes: () => Promise<number>;
	defaultHandler: (receivedBytes: number) => void;
	disconnectedHandler: () => void;

	constructor(
		channel: RTCDataChannel,
		getLastPingReceived: () => Date | null,
		getReceivedBytes: () => Promise<number>,
		defaultHandler: (receivedBytes: number) => void,
		disconnectedHandler: () => void
	) {
		this.loop = undefined;
		this.noBytesCount = 0;
		this.pingChannel = channel;
		this.getLastPingReceived = getLastPingReceived;
		this.getReceivedBytes = getReceivedBytes;
		this.defaultHandler = defaultHandler;
		this.disconnectedHandler = disconnectedHandler;
	}

	start() {
		console.log('start connection observer');

		this.loop = setInterval(async () => {
			const receivedBytes = await this.getReceivedBytes();
			this.pingChannel.send('ping');
			this.defaultHandler(receivedBytes);
			if (receivedBytes == 0) this.noBytesCount++;

			const lastPingReceived = this.getLastPingReceived();
			if (
				this.noBytesCount >= DISCONNECT_COUNT &&
				lastPingReceived &&
				Date.now() - lastPingReceived.getDate() > DISCONNECT_TIME
			) {
				this.disconnectedHandler();
			}
		}, OBSERVER_INTERVAL);
	}

	restart() {
		if (this.loop) clearInterval(this.loop);
		this.start();
	}
}
