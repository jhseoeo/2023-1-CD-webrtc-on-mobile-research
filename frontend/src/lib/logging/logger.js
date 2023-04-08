export default class Logger {
	constructor(logging = true, printConsole = true) {
		this.opened = false;
		this.logging = logging;
		this.printConsole = printConsole;
	}

	init(addr) {
		return new Promise((resolve, reject) => {
			if (!this.logging) return resolve();
			try {
				this.ws = new WebSocket(`${addr}`);
			} catch (e) {
				console.error(e);
				reject(e);
			}
			this.ws.onopen = () => {
				this.opened = true;
				console.log('Connected to Log server');
				resolve();
			};

			this.ws.onclose = () => {
				console.log('ws closed');
			};

			this.ws.onerror = () => {
				console.error('ws error');
			};
		});
	}

	async post(data) {
		if (this.printConsole) console.log(data.content);
		if (this.logging)
			if (this.opened) this.ws.send(JSON.stringify({ data }));
			else console.error('ws not opened');
	}

	async changeMessageHandler(handler) {
		this.ws.onmessage = (e) => {
			handler(e);
		};
	}

	toggleLogging(onOff) {
		this.logging = onOff;
	}

	togglePrintConsole(onOff) {
		this.printConsole = onOff;
	}
}
