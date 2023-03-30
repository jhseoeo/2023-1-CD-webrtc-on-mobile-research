export default class Logger {
	constructor() {
		this.opened = false;
	}

	init(addr) {
		return new Promise((resolve) => {
			this.ws = new WebSocket(`ws://${addr}`);
			this.ws.onopen = () => {
				this.opened = true;
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
		if (this.opened) this.ws.send(JSON.stringify({ data }));
		else console.error('ws not opened');
	}
}
