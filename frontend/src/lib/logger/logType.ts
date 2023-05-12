import type { bool } from 'aws-sdk/clients/signer';

export interface LogType {
	channel: string;
	userId: string;
	class: string;
	type: string;
	date: Date;
	content: string;
}

export interface LogSendType<T> {
	save: bool;
	data: T;
}

export interface LogReceiveType<T> {
	data: T;
}
