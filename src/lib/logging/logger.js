export default class Logger {
	constructor() {
		this.opened = false;
	}

	init(addr) {
		this.ws = new WebSocket(`ws://${addr}`);
		this.ws.onopen = () => {
			this.opened = true;
			this.ws.send(JSON.stringify({ data: 'Hello!' }));
		};
	}

	post(data) {
		if (this.opened) this.ws.send(JSON.stringify(data));
		else console.error('ws not opened');
	}
}
