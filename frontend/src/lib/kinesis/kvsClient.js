import KinesisSDK from './kinesisSDK';
import config from '$lib/config';
import KVSLogger from '$lib/logging/kvsLogger';
// import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc/lib/SignalingClient';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';

export default class KVSClient {
	/**
	 * @param {Role} role
	 * @param {String} channelName
	 * @param {String} userName
	 */
	constructor(role, channelName, userName) {
		this.role = role;
		this.channelName = channelName;
		this.clientId = userName;
		this.logging = config.reportLogs;
		this.printConsole = config.printConsole;
		this.turnOnly = config.turnOnly;
	}

	async init() {
		const { ChannelARN } = (await KinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo;
		const wssEndpoint = await KinesisSDK.getEndpoints(ChannelARN, 'WSS', this.role);
		const iceServerList = await KinesisSDK.getIceServerList(ChannelARN, this.role);

		this.logger = new KVSLogger(this.logging, this.printConsole);
		await this.logger.init();

		this.signalingClient = new SignalingClient({
			role: this.role,
			clientId: this.role == Role.MASTER ? null : this.clientId,
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
			if (this.KvsConnectionStateHandler) this.KvsConnectionStateHandler('connected');
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'KVS',
				`[${this.role}] Connected to signaling service`
			);
		});

		this.signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'ICE',
				`[${this.role}] Received ICE candidate from client: ${remoteClientId}, ${candidate.candidate}`
			);

			// Add the ICE candidate received from the client to the peer connection
			this.peerConnection.addIceCandidate(candidate);
		});

		this.signalingClient.on('close', () => {
			if (this.KvsConnectionStateHandler) this.KvsConnectionStateHandler('disconnected');
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'KVS',
				`[${this.role}] Disconnected from signaling channel`
			);
		});

		this.signalingClient.on('error', (e) => {
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'Error',
				`[${this.role}] Signaling client error : ${e}`
			);
		});

		this.peerConnection.addEventListener('iceconnectionstatechange', ({ target }) => {
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'WebRTC',
				`[${this.role}] iceConnectionState changed : ${target.iceConnectionState}`
			);
			if (this.iceConnectionStateHandler) this.iceConnectionStateHandler(target.iceConnectionState);
		});

		this.peerConnection.addEventListener('connectionstatechange', ({ target }) => {
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'WebRTC',
				`[${this.role}] connectionState changed : ${target.connectionState}`
			);
			if (this.connectionStateHandler) this.connectionStateHandler(target.connectionState);
		});
	}

	connectKVS() {
		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'KVS',
			`[${this.role}] Starting connection`
		);
		this.signalingClient.open();
	}

	disconnectKVS() {
		this.signalingClient.close();
	}

	stopWebRTC() {
		this.peerConnection.close();
		this.peerConnection.dispatchEvent(new Event('iceconnectionstatechange'));
		this.peerConnection.dispatchEvent(new Event('connectionstatechange'));
	}

	getCandidates() {
		return new Promise((resolve, reject) => {
			this.peerConnection.getStats(null).then((stats) => {
				stats.forEach((report) => {
					if (report.type == 'candidate-pair' && report.nominated && report.state == 'succeeded') {
						const candidate = stats.get(report.remoteCandidateId);
						this.logger.post(
							this.channelName,
							this.clientId,
							this.role,
							'WebRTC',
							`[${this.role}] connected candidate : ${JSON.stringify(candidate)}`
						);
						return resolve(candidate);
					}
				});
				return reject('No succeeded candidate pair exist');
			});
		});
	}

	registerKvsConnectionStateHandler(handler) {
		this.KvsConnectionStateHandler = handler;
	}

	registerIceConnectionStateHandler(handler) {
		this.iceConnectionStateHandler = handler;
	}

	registerConnectionStateHandler(handler) {
		this.connectionStateHandler = handler;
	}

	toggleLogging(onOff) {
		this.logging = onOff;
		if (this.logger) this.logger.toggleLogging(onOff);
	}

	togglePrintConsole(onOff) {
		this.printConsole = onOff;
		if (this.logger) this.logger.togglePrintConsole(onOff);
	}

	toggleTURNOnly(onOff) {
		this.turnOnly = onOff;
	}
}
