export enum ConnectionLevel {
	DIRECT = 0,
	TURN = 1
}

export enum RetryCondition {
	NO_RETRY = 'no_retry',
	AFTER_FAILED = 'after_failed',
	AFTER_DISCONNECTED = 'after_disconnected',
	RIGHT_AFTER_DISCONNECTED = 'right_after_disconnected',
	BEFORE_DISCONNECTED = 'before_disconnected'
}

enum RTCIceServerTransportProtocol {
	'udp',
	'tcp',
	'tls'
}

export interface RTCicecandidateStats {
	transportId: string;
	address?: string;
	ip?: string;
	port?: number;
	protocol?: string;
	candidateType: RTCIceCandidateType;
	priority?: number;
	url?: string;
	relayProtocol?: RTCIceServerTransportProtocol;
	foundation?: string;
	relatedAddress?: string;
	relatedPort?: number;
	usernameFragment?: string;
	tcpType?: RTCIceTcpCandidateType;
}

export interface LocalAndRemoteIceCandidateStats {
	localCandidate: RTCicecandidateStats;
	remoteCandidate: RTCicecandidateStats;
}
