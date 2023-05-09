import type SendLogType from './sendLogType';

export default class Logger {
	opened: boolean;
	reportLogs: boolean;
	saveLogs: boolean;
	printConsole: boolean;
	ws: WebSocket | null;

	constructor(reportLogs: boolean, saveLogs: boolean, printConsole: boolean) {
		this.opened = false;
		this.reportLogs = reportLogs;
		this.saveLogs = saveLogs;
		this.printConsole = printConsole;
		this.ws = null;
	}

	init_(addr: string) {
		return new Promise<void>((resolve, reject) => {
			if (!this.reportLogs) return resolve();
			try {
				this.ws = new WebSocket(`${addr}`);
			} catch (e) {
				console.error(e);
				return reject(e);
			}

			this.ws.onopen = () => {
				this.opened = true;
				console.log('Connected to Log server');
				resolve();
			};

			this.ws.onclose = () => {
				console.log('ws closed');
			};

			this.ws.onerror = (e) => {
				console.error('ws error');
				return reject(e);
			};
		});
	}

	async post(data: SendLogType) {
		if (this.printConsole) console.log(data.content);
		if (this.reportLogs)
			if (this.opened) this.ws?.send(JSON.stringify({ data, save: this.saveLogs }));
			else console.error('ws not opened');
	}

	async changeMessageHandler(handler: (data: object) => void) {
		if (this.ws != null)
			this.ws.onmessage = (e) => {
				handler(JSON.parse(e.data));
			};
	}

	toggleReportLogs(onOff: boolean) {
		this.reportLogs = onOff;
	}

	toggleSaveLogs(onOff: boolean) {
		this.saveLogs = onOff;
	}

	togglePrintConsole(onOff: boolean) {
		this.printConsole = onOff;
	}
}
