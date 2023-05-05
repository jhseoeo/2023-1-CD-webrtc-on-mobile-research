import KinesisSDK from './kinesisSDK';
import KVSClient from './kvsClient';
import constants from './constants';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';

export default class Viewer extends KVSClient {
	constructor(channelName, userName, remoteView, retryMethod) {
		super(Role.VIEWER, channelName, userName);
		this.connectionLevel = constants.ConnectionLevel.DIRECT;
		this.remoteView = remoteView;
		this.retryMethod = retryMethod;
		this.remoteStream = null;
		this.connectionObserver;
	}
	async init() {
		await super.init();

		this.stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		});

		this.signalingClient.on('sdpAnswer', async (answer) => {
			// Add the SDP answer to the peer connection
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Received SDP answer`
			);
			await this.peerConnection.setRemoteDescription(answer);
		});

		// As remote tracks are received, add them to the remote view
		this.peerConnection.addEventListener('track', (event) => {
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'WebRTC',
				`[${this.role}] Received remote track`
			);
			// if (this.remoteView.srcObject) {
			// 	return;
			// }
			this.remoteStream = event.streams[0];
			this.remoteView.srcObject = event.streams[0];
		});

		this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
			if (candidate) {
				this.logger.post(
					this.channelName,
					this.clientId,
					this.role,
					'ICE',
					`[${this.role}] Generated ICE candidate : ${candidate.candidate}`
				);

				console.log(candidate.type, candidate.address, candidate.protocol);
				this.signalingClient.sendIceCandidate(candidate);
			} else {
				this.logger.post(
					this.channelName,
					this.clientId,
					this.role,
					'ICE',
					`[${this.role}] All ICE candidates have been generated`
				);
			}
		});

		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'system',
			`[${this.role}] Initialized`
		);
	}

	startWebRTC = async () => {
		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'SDP',
			`[${this.role}] Creating SDP offer`
		);

		if (this.stream) {
			if (this.tracks.length !== 0) {
				this.tracks.forEach((track) => {
					this.peerConnection.removeTrack(track);
				});
				this.tracks = [];
			}

			this.stream
				.getTracks()
				.forEach((track) => this.tracks.push(this.peerConnection.addTrack(track, this.stream)));
		}

		await this.peerConnection.setLocalDescription(
			await this.peerConnection.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true
			})
		);

		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'SDP',
			`[${this.role}] Sending SDP offer`
		);
		this.signalingClient.sendSdpOffer(this.peerConnection.localDescription);
		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'ICE',
			`[${this.role}] Generating ICE candidates`
		);

		this.lastRetry = new Date();
		this.startConnectionObserver();
	};

	stopWebRTC() {
		this.peerConnection.close();
	}

	async registerIceConnectionStateHandler(handler) {
		super.registerIceConnectionStateHandler((state) => {
			handler(state);
		});
	}

	async retryWebRTC() {
		if (!this.connectedKVS) this.connectKVS();
		let level = constants.ConnectionLevel.DIRECT;
		this.receivedTraffics = 0;
		this.remoteStream = null;

		const now = new Date();
		if (now - this.lastRetry < 1000 * 15) level = this.getCurrentLevel() + 1;
		if (level >= 2) return;
		this.lastRetry = now;

		const { ChannelARN } = (await KinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo;
		const iceServerList = await KinesisSDK.getIceServerList(ChannelARN, Role.VIEWER);

		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'WebRTC',
			`[${this.role}] Retry WebRTC`
		);

		this.connectionLevel = constants.ConnectionLevel.DIRECT;

		if (this.stream) {
			if (this.tracks.length !== 0) {
				this.tracks.forEach((track) => {
					this.peerConnection.removeTrack(track);
				});
				this.tracks = [];
			}

			this.stream
				.getTracks()
				.forEach((track) => this.tracks.push(this.peerConnection.addTrack(track, this.stream)));
		}

		this.peerConnection.setConfiguration({
			iceServers: iceServerList,
			iceTransportPolicy:
				this.turnOnly || level === constants.ConnectionLevel.TURN ? 'relay' : 'all'
		});

		await this.peerConnection.setLocalDescription(
			await this.peerConnection.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true,
				iceRestart: true
			})
		);

		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'SDP',
			`[${this.role}] Sending SDP Restart offer`
		);
		this.signalingClient.sendSdpOffer(this.peerConnection.localDescription);
		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'ICE',
			`[${this.role}] Generating ICE candidates`
		);

		this.startConnectionObserver();
	}

	async restartIce() {
		this.peerConnection.restartIce();
	}

	async getCurrentLevel() {
		const candidate = await this.getCandidates();
		// if (candidate.candidateType === 'host' && candidate.protocol === 'udp')
		// 	return constants.ConnectionLevel.DIRECT;
		// else if (candidate.candidateType === 'srflx' && candidate.protocol === 'udp')
		// 	return constants.ConnectionLevel.STUN_UDP;
		// else if (candidate.candidateType === 'srflx' && candidate.protocol === 'tcp')
		// 	return constants.ConnectionLevel.STUN_TCP;
		// else if (candidate.candidateType === 'relay' && candidate.protocol === 'udp')
		// 	return constants.ConnectionLevel.TURN_UDP;

		if (candidate.candidateType === 'relay' && candidate.protocol === 'udp') {
			return constants.ConnectionLevel.TURN;
		} else {
			return constants.ConnectionLevel.DIRECT;
		}
	}

	registerConnectionObserverHandler(handler) {
		this.ConnectionObserverHandler = handler;
	}

	async startConnectionObserver() {
		if (this.connectionObserver) clearInterval(this.connectionObserver);
		this.connectionObserver = setInterval(async () => {
			let videoStream = this.remoteStream.getTracks().filter((v) => {
				return v.kind === 'video';
			});

			let receivedBytes = await this.getReceivedTraffics(videoStream[0].id);
			this.ConnectionObserverHandler(receivedBytes);
		}, 1000);
	}
}
