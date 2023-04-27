export default class Logger {
	constructor(reportLogs, saveLogs, printConsole) {
		this.opened = false;
		this.reportLogs = reportLogs;
		this.saveLogs = saveLogs;
		this.printConsole = printConsole;
	}

	init(addr) {
		return new Promise((resolve, reject) => {
			if (!this.reportLogs) return resolve();
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
		if (this.reportLogs)
			if (this.opened) this.ws.send(JSON.stringify({ data, save: this.saveLogs }));
			else console.error('ws not opened');
	}

	async changeMessageHandler(handler) {
		this.ws.onmessage = (e) => {
			handler(JSON.parse(e.data));
		};
	}

	toggleReportLogs(onOff) {
		this.reportLogs = onOff;
	}

	toggleSaveLogs(onOff) {
		this.saveLogs = onOff;
	}

	togglePrintConsole(onOff) {
		this.printConsole = onOff;
	}
}
