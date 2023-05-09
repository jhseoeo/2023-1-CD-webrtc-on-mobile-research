import KinesisSDK from './kinesisSDK';
import config from '$lib/config';
import type KVSLogger from '$lib/logger/kvsLogger';
// import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc/lib/SignalingClient';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import type { LocalAndRemoteIceCandidateStats, RTCicecandidateStats } from './constants';

export default class KVSClient {
	peerConnection: RTCPeerConnection | null;
	signalingClient: SignalingClient | null;
	connectedKVS: boolean;
	role: Role;
	channelName: string;
	clientId: string;
	turnOnly: boolean;
	tracks: Array<RTCRtpSender>;
	receivedTraffics: number;
	logger: KVSLogger;
	kvsConnectionStateHandler: ((state: string) => void) | null;
	iceConnectionStateHandler: ((state: string) => void) | null;
	connectionStateHandler: ((state: string) => void) | null;
	pingReceiveHandler: ((message: string) => void) | null;

	constructor(role: Role, channelName: string, userName: string, logger: KVSLogger) {
		this.peerConnection = null;
		this.signalingClient = null;
		this.connectedKVS = false;
		this.role = role;
		this.channelName = channelName;
		this.clientId = userName;
		this.turnOnly = config.turnOnly;
		this.tracks = [];
		this.receivedTraffics = 0;
		this.logger = logger;
		this.kvsConnectionStateHandler = null;
		this.iceConnectionStateHandler = null;
		this.connectionStateHandler = null;
		this.pingReceiveHandler = null;
	}

	async init() {
		const ChannelARN = (await KinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo
			?.ChannelARN;
		if (ChannelARN === undefined) return alert('Error on initialize');
		const wssEndpoint = await KinesisSDK.getEndpoints(ChannelARN, 'WSS', this.role);
		const iceServerList = await KinesisSDK.getIceServerList(ChannelARN, this.role);
		if (wssEndpoint === undefined || iceServerList === undefined)
			return alert('Error on initialize');

		this.signalingClient = new SignalingClient({
			role: this.role,
			clientId: this.role == Role.MASTER ? undefined : this.clientId,
			region: config.kinesisRegion,
			channelARN: ChannelARN,
			channelEndpoint: wssEndpoint,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			}
		});

		this.peerConnection = new RTCPeerConnection({
			iceServers: iceServerList,
			iceTransportPolicy: this.turnOnly ? 'relay' : 'all'
		});

		this.signalingClient.on('open', async () => {
			if (this.kvsConnectionStateHandler) {
				this.connectedKVS = true;
				this.kvsConnectionStateHandler?.('connected');
			}
			this.log('KVS', `[${this.role}] Connected to signaling service`);
		});

		this.signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
			this.log(
				'ICE',
				`[${this.role}] Received ICE candidate from client: ${remoteClientId}, ${candidate.candidate}`
			);

			// Add the ICE candidate received from the client to the peer connection
			this.peerConnection?.addIceCandidate(candidate);
		});

		this.signalingClient.on('close', () => {
			if (this.kvsConnectionStateHandler) {
				this.connectedKVS = false;
				this.kvsConnectionStateHandler('disconnected');
			}
			this.log('KVS', `[${this.role}] Disconnected from signaling channel`);
		});

		this.signalingClient.on('error', (e) => {
			this.log('Error', `[${this.role}] Signaling client error : ${e}`);
		});

		this.peerConnection.addEventListener('iceconnectionstatechange', (event) => {
			this.log(
				'WebRTC',
				`[${this.role}] iceConnectionState changed : ${
					(event.target as RTCPeerConnection).iceConnectionState
				}`
			);
			if (this.iceConnectionStateHandler)
				this.iceConnectionStateHandler((event.target as RTCPeerConnection).iceConnectionState);
		});

		this.peerConnection.onconnectionstatechange = (event) => {
			this.log(
				'WebRTC',
				`[${this.role}] connectionState changed : ${
					(event.target as RTCPeerConnection).connectionState
				}`
			);
			if (this.connectionStateHandler)
				this.connectionStateHandler((event.target as RTCPeerConnection).connectionState);
		};
	}

	async log(type: string, content: string) {
		await this.logger.postLog(
			this.channelName,
			this.clientId,
			this.role,
			type,
			`[${this.role}] ` + content
		);
	}

	connectKVS() {
		this.logger.postLog(
			this.channelName,
			this.clientId,
			this.role,
			'KVS',
			`[${this.role}] Starting connection`
		);
		this.signalingClient?.open();
	}

	disconnectKVS() {
		this.signalingClient?.close();
	}

	stopWebRTC() {
		this.peerConnection?.close();
		this.peerConnection?.dispatchEvent(new Event('iceconnectionstatechange'));
		this.peerConnection?.dispatchEvent(new Event('connectionstatechange'));
	}

	getCandidates(): Promise<LocalAndRemoteIceCandidateStats> {
		return new Promise((resolve, reject) => {
			this.peerConnection?.getStats(null).then((stats) => {
				const candidatePairs: RTCIceCandidatePairStats[] = [];
				stats.forEach((report) => {
					if (report.type == 'candidate-pair' && report.nominated && report.state == 'succeeded')
						candidatePairs.push(report);
				});

				if (candidatePairs.length === 0) return reject('No succeeded candidate pair exist');

				candidatePairs.sort((a, b) => {
					if (
						a.lastPacketReceivedTimestamp !== undefined &&
						b.lastPacketReceivedTimestamp !== undefined
					)
						return b.lastPacketReceivedTimestamp - a.lastPacketReceivedTimestamp;
					else return 0;
				});

				const localCandidate: RTCicecandidateStats = stats.get(candidatePairs[0].localCandidateId);
				const remoteCandidate: RTCicecandidateStats = stats.get(
					candidatePairs[0].remoteCandidateId
				);
				this.logger.postLog(
					this.channelName,
					this.clientId,
					this.role,
					'WebRTC',
					`[${this.role}] local candidate : ${JSON.stringify(
						localCandidate
					)} /// connected candidate : ${JSON.stringify(remoteCandidate)}`
				);
				return resolve({ localCandidate, remoteCandidate });
			});
		});
	}

	getReceivedTraffics(): Promise<number> {
		return new Promise((resolve, reject) => {
			this.peerConnection?.getStats(null).then((stats) => {
				const candidatePairs: RTCIceCandidatePairStats[] = [];
				stats.forEach((report) => {
					if (report.type == 'candidate-pair' && report.nominated && report.state == 'succeeded')
						candidatePairs.push(report);
				});

				if (candidatePairs.length === 0) return reject('No succeeded candidate pair exist');

				candidatePairs.sort((a, b) => {
					if (
						a.lastPacketReceivedTimestamp !== undefined &&
						b.lastPacketReceivedTimestamp !== undefined
					)
						return b.lastPacketReceivedTimestamp - a.lastPacketReceivedTimestamp;
					else return 0;
				});

				const receivedBytes = candidatePairs[0].bytesReceived || 0;
				const result = receivedBytes - this.receivedTraffics;
				this.receivedTraffics = receivedBytes;
				return resolve(result);
			});
		});
	}

	registerKvsConnectionStateHandler(handler: (state: string) => void) {
		this.kvsConnectionStateHandler = handler;
	}

	registerIceConnectionStateHandler(handler: (state: string) => void) {
		this.iceConnectionStateHandler = handler;
	}

	registerConnectionStateHandler(handler: (state: string) => void) {
		this.connectionStateHandler = handler;
	}

	registerPingReceiveChannel(handler: (message: string) => void) {
		this.pingReceiveHandler = handler;
	}

	toggleTURNOnly(onOff: boolean) {
		this.turnOnly = onOff;
	}
}
