import Kinesis from './kinesis';
import config from '$lib/config';
import type KVSLogger from '$lib/logger/kvsLogger';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc/lib/SignalingClient';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import {
	RetryCondition,
	ConnectionLevel,
	type LocalAndRemoteIceCandidateStats,
	type RTCicecandidateStats
} from './constants';

export default class WebRTCClient {
	protected channelName: string;
	protected channelARN: string;
	protected clientId: string;
	protected role: Role;
	protected peerConnection: RTCPeerConnection | null;
	protected signalingClient?: SignalingClient | null;
	protected connectedKVS: boolean;
	protected turnOnly: boolean;
	protected retryCondition: RetryCondition;
	protected connectionLevel: ConnectionLevel;
	protected tracks: Array<RTCRtpSender>;
	protected logger: KVSLogger;
	protected receivedTraffics: number;
	protected kvsConnectionStateHandler: (state: string) => void;
	protected iceConnectionStateHandler: (state: string) => void;
	protected connectionStateHandler: (state: string) => void;
	protected pingReceiveHandler: (message: string) => void;

	constructor(role: Role, channelName: string, userName: string, logger: KVSLogger) {
		this.channelName = channelName;
		this.channelARN = '';
		this.clientId = userName;
		this.role = role;
		this.peerConnection = null;
		this.signalingClient = null;
		this.connectedKVS = false;
		this.turnOnly = config.turnOnly;
		this.retryCondition = RetryCondition.NO_RETRY;
		this.connectionLevel = ConnectionLevel.DIRECT;
		this.tracks = [];
		this.receivedTraffics = 0;
		this.logger = logger;
		this.kvsConnectionStateHandler = () => {
			return;
		};
		this.iceConnectionStateHandler = () => {
			return;
		};
		this.connectionStateHandler = () => {
			return;
		};
		this.pingReceiveHandler = () => {
			return;
		};
	}

	/**
	 * Register Callback called on KVS Connection State changed
	 */
	public registerKvsConnectionStateHandler(handler: (state: string) => void) {
		this.kvsConnectionStateHandler = handler;
	}

	/**
	 * Register Callback called on RTCPeerConnection.iceConnectionState changed
	 */
	public registerIceConnectionStateHandler(handler: (state: string) => void) {
		this.iceConnectionStateHandler = handler;
	}

	/**
	 * Register Callback called on RTCPeerConnection.connectionState changed
	 */
	public registerConnectionStateHandler(handler: (state: string) => void) {
		this.connectionStateHandler = handler;
	}

	/**
	 * Initialize WebRTC Client
	 */
	public async init() {
		this.channelARN = await Kinesis.getSignalingChannelARN(this.channelName);
		const iceServerList = await this.getIceServerList(this.channelARN);
		this.peerConnection = await this.newPeerConneciton(iceServerList);
		this.signalingClient = await this.newSignalingClient(this.channelARN);
	}

	/**
	 * Reset KVS Signaling Channel
	 */
	public async resetKVS() {
		delete this.signalingClient;
		this.signalingClient = await this.newSignalingClient(this.channelARN);
	}

	/**
	 * Connect to Kinesis Video Stream Signaling Channel Websocket Server
	 */
	public connectKVS() {
		this.log('KVS', `Starting connection`);
		this.signalingClient?.open();
	}

	/**
	 * Disconnect from Kinesis Video Stream Signaling Channel Websocket Server
	 */
	public disconnectKVS() {
		this.signalingClient?.close();
	}

	/**
	 * Stop current WebRTC Session.
	 * connectionState and iceConnectionState will switched into 'closed' state
	 */
	public stopWebRTC() {
		this.peerConnection?.close();
		this.peerConnection?.dispatchEvent(new Event('iceconnectionstatechange'));
		this.peerConnection?.dispatchEvent(new Event('connectionstatechange'));
	}

	/**
	 * Set TURN only configuration
	 */
	public setTURNOnly(onOff: boolean) {
		this.turnOnly = onOff;
	}

	/**
	 * Set retry condition
	 */
	public setRetryCondition(retryMethod: RetryCondition) {
		this.retryCondition = retryMethod;
	}

	/**
	 * Get current local-remote candidates pair
	 */
	public async getCandidates(): Promise<LocalAndRemoteIceCandidateStats | null> {
		const stats = await this.getWebRTCStats();
		const candidatePairs = await this.getCurrentCandidatePair(stats);
		if (candidatePairs === null) {
			return null;
		}
		const localCandidate: RTCicecandidateStats = stats.get(candidatePairs.localCandidateId);
		const remoteCandidate: RTCicecandidateStats = stats.get(candidatePairs.remoteCandidateId);

		this.log(
			'WebRTC',
			`local candidate : ${JSON.stringify(
				localCandidate
			)} /// connected candidate : ${JSON.stringify(remoteCandidate)}`
		);

		if (localCandidate.candidateType === 'relay' && localCandidate.protocol === 'udp') {
			this.connectionLevel = ConnectionLevel.TURN;
		} else {
			this.connectionLevel = ConnectionLevel.DIRECT;
		}

		return { localCandidate, remoteCandidate };
	}

	/**
	 * Get amount of traffics received
	 */
	protected async getReceivedTraffics(): Promise<number> {
		const stats = await this.getWebRTCStats();
		const candidatePairs = await this.getCurrentCandidatePair(stats);
		const receivedBytes = candidatePairs?.bytesReceived || 0;
		const result = receivedBytes - this.receivedTraffics;
		this.receivedTraffics = receivedBytes;
		return result;
	}

	/**
	 * Post log to log server
	 */
	protected async log(type: string, content: string) {
		await this.logger.postLog(
			this.channelName,
			this.clientId,
			this.role,
			type,
			`[${this.role}] ` + content
		);
	}

	/**
	 * Generate new SiganlingClient and return it
	 */
	private async newSignalingClient(channelARN: string): Promise<SignalingClient> {
		const wssEndpoint = await Kinesis.getEndpoints(channelARN, 'WSS', this.role);
		if (wssEndpoint === undefined) {
			alert('Error on initialize KVS Channel: wssEndpoint is undefined');
			throw new Error('Error on initialize KVS Channel: wssEndpoint is undefined');
		}

		const signalingClient = new SignalingClient({
			role: this.role,
			clientId: this.role == Role.MASTER ? undefined : this.clientId,
			region: config.kinesisRegion,
			channelARN: channelARN,
			channelEndpoint: wssEndpoint,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			}
		});

		signalingClient.on('open', async () => {
			if (this.kvsConnectionStateHandler) {
				this.connectedKVS = true;
				this.kvsConnectionStateHandler?.('connected');
			}
			this.log('KVS', `Connected to signaling service`);
		});

		signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
			this.log(
				'ICE',
				`Received ICE candidate from client: ${remoteClientId}, ${candidate.candidate}`
			);

			// Add the ICE candidate received from the client to the peer connection
			this.peerConnection?.addIceCandidate(candidate);
		});

		signalingClient.on('close', () => {
			if (this.kvsConnectionStateHandler) {
				this.connectedKVS = false;
				this.kvsConnectionStateHandler('disconnected');
			}
			this.log('KVS', `Disconnected from signaling channel`);
		});

		signalingClient.on('error', (e) => {
			this.log('Error', `Signaling client error : ${e}`);
			console.log('Signaling client error :', e);
		});

		return signalingClient;
	}

	/**
	 * Get STUN and TURN server list
	 */
	protected async getIceServerList(channelARN: string) {
		const iceServerList = await Kinesis.getIceServerList(channelARN, this.role);
		if (iceServerList === undefined) {
			if (iceServerList === undefined) {
				alert('Error on initialize KVS Channel: iceServerList is undefined');
				throw new Error('Error on initialize KVS Channel: iceServerList is undefined');
			}
		}

		return iceServerList;
	}

	/**
	 * Generate new RTCPeerConnection and return it
	 */
	private async newPeerConneciton(iceServerList: RTCIceServer[]) {
		const peerConnection = new RTCPeerConnection({
			iceServers: iceServerList,
			iceTransportPolicy: this.turnOnly ? 'relay' : 'all'
		});

		peerConnection.oniceconnectionstatechange = (event) => {
			this.log(
				'WebRTC',
				`iceConnectionState changed : ${(event.target as RTCPeerConnection).iceConnectionState}`
			);
			if (this.iceConnectionStateHandler)
				this.iceConnectionStateHandler((event.target as RTCPeerConnection).iceConnectionState);
		};

		peerConnection.onconnectionstatechange = (event) => {
			this.log(
				'WebRTC',
				`connectionState changed : ${(event.target as RTCPeerConnection).connectionState}`
			);
			if (this.connectionStateHandler)
				this.connectionStateHandler((event.target as RTCPeerConnection).connectionState);
		};

		return peerConnection;
	}

	private async getWebRTCStats() {
		const stats = await this.peerConnection?.getStats(null);
		if (stats === undefined || stats === null) {
			throw new Error('Cannot get WebRTC Statistics');
		} else {
			return stats;
		}
	}

	private async getCurrentCandidatePair(stats: RTCStatsReport) {
		const candidatePairs: RTCIceCandidatePairStats[] = [];
		stats?.forEach((report) => {
			if (report.type == 'candidate-pair' && report.nominated && report.state == 'succeeded')
				candidatePairs.push(report);
		});

		if (candidatePairs.length === 0) {
			return null;
		}

		candidatePairs.sort((a, b) => {
			if (
				a.lastPacketReceivedTimestamp !== undefined &&
				b.lastPacketReceivedTimestamp !== undefined
			)
				return b.lastPacketReceivedTimestamp - a.lastPacketReceivedTimestamp;
			else return 0;
		});

		return candidatePairs[0];
	}
}
