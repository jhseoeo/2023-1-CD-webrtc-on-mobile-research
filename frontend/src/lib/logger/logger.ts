import type { LogType, LogSendType, LogReceiveType } from './logType';

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

	protected init_(addr: string) {
		return new Promise<void>((resolve, reject) => {
			try {
				this.ws = new WebSocket(`${addr}`);
			} catch (e) {
				console.error(e);
				return reject(e);
			}

			this.ws.onopen = () => {
				this.opened = true;
				console.log(`Connected to Log server : ${addr}`);
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

	protected async post(data: LogSendType<LogType>) {
		if (this.printConsole) console.log(data.data.content);
		if (this.reportLogs || this.saveLogs)
			if (this.opened) this.ws?.send(JSON.stringify(data));
			else console.error('ws not opened');
	}

	protected async changeMessageHandler(handler: (data: LogReceiveType<LogType>) => void) {
		if (this.ws != null)
			this.ws.onmessage = (e) => {
				handler(JSON.parse(e.data));
			};
	}

	public toggleReportLogs(onOff: boolean) {
		this.reportLogs = onOff;
	}

	public toggleSaveLogs(onOff: boolean) {
		this.saveLogs = onOff;
	}

	public togglePrintConsole(onOff: boolean) {
		this.printConsole = onOff;
	}
}
