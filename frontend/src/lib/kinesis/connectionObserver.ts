import { asyncSleep } from '$lib/utils';

const OBSERVER_INTERVAL = 1 * 1000;
const DISCONNECT_COUNT = 2;
const DISCONNECT_TIME = 2000;

export default class ConnectionObserver {
	loop: NodeJS.Timer | undefined;
	pingChannel: RTCDataChannel;
	noBytesCount: number;
	disconnected: boolean;
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
		this.pingChannel = channel;
		this.noBytesCount = 0;
		this.disconnected = false;
		this.getLastPingReceived = getLastPingReceived;
		this.getReceivedBytes = getReceivedBytes;
		this.defaultHandler = defaultHandler;
		this.disconnectedHandler = disconnectedHandler;
	}

	public start() {
		console.log('start connection observer');
		this.noBytesCount = 0;

		this.loop = setInterval(async () => {
			const receivedBytes = await this.getReceivedBytes().catch((reason) => {
				if (reason === 'No succeeded candidate pair exist') return 0;
				else throw Error('Unexpected Error :', reason);
			});
			this.pingChannel.send('ping');
			this.defaultHandler(receivedBytes);
			if (receivedBytes == 0) this.noBytesCount++;
			else this.noBytesCount = 0;

			const lastPingReceived = this.getLastPingReceived();

			console.log(lastPingReceived, this.noBytesCount, navigator.onLine);

			if (
				this.noBytesCount >= DISCONNECT_COUNT &&
				lastPingReceived &&
				Date.now() - lastPingReceived.getDate() > DISCONNECT_TIME
			) {
				this.disconnected = true;
				this.disconnectedHandler();
			} else {
				this.disconnected = false;
			}
		}, OBSERVER_INTERVAL);
	}

	public restart() {
		if (this.loop) clearInterval(this.loop);
		this.start();
	}

	public async isDisconnected() {
		return this.disconnected;
	}

	public async checkDisconnected() {
		await asyncSleep(2000);

		const receivedBytes = await this.getReceivedBytes().catch((reason) => {
			if (reason === 'No succeeded candidate pair exist') return 0;
			else throw Error('Unexpected Error :', reason);
		});
		const lastPingReceived = this.getLastPingReceived();

		if (
			receivedBytes == 0 &&
			lastPingReceived &&
			Date.now() - lastPingReceived.getDate() > (OBSERVER_INTERVAL + DISCONNECT_TIME) / 2
		)
			return true;
		else return false;
	}

	public async waitUntilNetworkRecover(seconds: number) {
		for (let i = 0; i < seconds; i++) {
			if (navigator.onLine === true) return true;

			await asyncSleep(1000);
		}
		return false;
	}
}
