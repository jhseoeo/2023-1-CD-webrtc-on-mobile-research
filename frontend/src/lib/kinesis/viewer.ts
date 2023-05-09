import KinesisSDK from './kinesisSDK';
import KVSClient from './kvsClient';
import { RetryCondition, ConnectionLevel } from './constants';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import type KVSLogger from '$lib/logger/kvsLogger';

export default class Viewer extends KVSClient {
	connectionLevel: ConnectionLevel;
	remoteView: HTMLVideoElement;
	localStream: MediaStream;
	retryMethod: RetryCondition;
	lastRetry: Date | null;
	pingChannel: RTCDataChannel | null;
	lastPingReceived: Date | null;
	connectionObserver: NodeJS.Timer | null;
	connectionObserverHandler: ((receivedBytes: number) => void) | null;

	constructor(
		channelName: string,
		userName: string,
		localStream: MediaStream,
		remoteView: HTMLVideoElement,
		retryMethod: RetryCondition,
		logger: KVSLogger
	) {
		super(Role.VIEWER, channelName, userName, logger);
		this.connectionLevel = ConnectionLevel.DIRECT;
		this.remoteView = remoteView;
		this.localStream = localStream;
		this.retryMethod = retryMethod;
		this.lastRetry = null;
		this.pingChannel = null;
		this.lastPingReceived = null;
		this.connectionObserver = null;
		this.connectionObserverHandler = null;
	}
	async init() {
		await super.init();

		const sendChannel = this.peerConnection?.createDataChannel('ping');
		if (sendChannel) {
			this.pingChannel = sendChannel;
			this.pingChannel.onopen = () => {
				this.log('DataChannel', 'Datachannel is opened');
			};
			this.pingChannel.onmessage = (e) => {
				console.log(e.data);
				this.lastPingReceived = new Date();
			};
			this.pingChannel.onclose = () => {
				this.log('DataChannel', 'Datachannel is closed');
			};
		}

		this.signalingClient?.on('sdpAnswer', async (answer) => {
			// Add the SDP answer to the peer connection
			this.log('SDP', `Received SDP answer`);
			await this.peerConnection?.setRemoteDescription(answer);
		});

		// As remote tracks are received, add them to the remote view
		this.peerConnection?.addEventListener('track', (event) => {
			this.log('WebRTC', `Received remote track`);
			// if (this.remoteView.srcObject) {
			// 	return;
			// }
			console.log(event.streams[0].getTracks());
			this.remoteView.srcObject = event.streams[0];
		});

		this.peerConnection?.addEventListener('icecandidate', ({ candidate }) => {
			if (candidate) {
				this.log('ICE', `Generated ICE candidate : ${candidate.candidate}`);

				console.log(candidate.type, candidate.address, candidate.protocol);
				this.signalingClient?.sendIceCandidate(candidate);
			} else {
				this.log('ICE', `All ICE candidates have been generated`);
			}
		});

		this.log('system', `Initialized`);
	}

	startWebRTC = async () => {
		this.log('SDP', `Creating SDP offer`);

		if (this.localStream) {
			if (this.tracks.length !== 0) {
				this.tracks.forEach((track) => {
					this.peerConnection?.removeTrack(track);
				});
				this.tracks = [];
			}

			this.localStream?.getTracks().forEach((track) => {
				const sender = this.peerConnection?.addTrack(track, this.localStream);
				if (sender) this.tracks.push(sender);
			});
		}

		await this.peerConnection?.setLocalDescription(
			await this.peerConnection?.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true
			})
		);

		this.log('SDP', `Sending SDP offer`);
		if (this.peerConnection !== null && this.peerConnection.localDescription)
			this.signalingClient?.sendSdpOffer(this.peerConnection.localDescription);
		this.log('ICE', `Generating ICE candidates`);

		this.lastRetry = new Date();
		this.startConnectionObserver();
	};

	stopWebRTC() {
		this.peerConnection?.close();
	}

	async retryWebRTC() {
		if (!this.connectedKVS) this.connectKVS();
		const level = ConnectionLevel.DIRECT;
		this.receivedTraffics = 0;

		const now = new Date();
		// if (now - this.lastRetry < 1000 * 15) level = this.getCurrentLevel() + 1;
		// if (level >= 2) return;
		this.lastRetry = now;

		let ChannelARN, iceServerList;
		try {
			ChannelARN = (await KinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo?.ChannelARN;
			if (ChannelARN === undefined) return alert('Error on initialize');
			iceServerList = await KinesisSDK.getIceServerList(ChannelARN, Role.VIEWER);
		} catch (e) {
			alert('unable to restart!');
			return;
		}

		this.log('WebRTC', `Retry WebRTC`);

		this.connectionLevel = level;

		// if (this.localStream) {
		// 	if (this.tracks.length !== 0) {
		// 		this.tracks.forEach((track) => {
		// 			this.peerConnection?.removeTrack(track);
		// 		});
		// 		this.tracks = [];
		// 	}

		// 	this.localStream.getTracks().forEach((track) => {
		// 		const sender = this.peerConnection?.addTrack(track, this.localStream);
		// 		if (sender) this.tracks.push(sender);
		// 	});
		// }

		this.peerConnection?.setConfiguration({
			iceServers: iceServerList,
			iceTransportPolicy:
				// this.turnOnly || level === constants.ConnectionLevel.TURN ? 'relay' : 'all'
				this.turnOnly ? 'relay' : 'all'
		});

		await this.peerConnection?.setLocalDescription(
			await this.peerConnection?.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true,
				iceRestart: true
			})
		);

		this.log('SDP', `Sending SDP Restart offer`);
		if (this.peerConnection !== null && this.peerConnection.localDescription)
			this.signalingClient?.sendSdpOffer(this.peerConnection.localDescription);
		this.log('ICE', `Generating ICE candidates`);

		await this.startConnectionObserver();
	}

	async restartIce() {
		this.peerConnection?.restartIce();
	}

	async getCurrentLevel() {
		let candidate;
		try {
			candidate = (await this.getCandidates()).localCandidate;
		} catch (e) {
			return;
		}
		// if (candidate.candidateType === 'host' && candidate.protocol === 'udp')
		// 	return constants.ConnectionLevel.DIRECT;
		// else if (candidate.candidateType === 'srflx' && candidate.protocol === 'udp')
		// 	return constants.ConnectionLevel.STUN_UDP;
		// else if (candidate.candidateType === 'srflx' && candidate.protocol === 'tcp')
		// 	return constants.ConnectionLevel.STUN_TCP;
		// else if (candidate.candidateType === 'relay' && candidate.protocol === 'udp')
		// 	return constants.ConnectionLevel.TURN_UDP;

		if (candidate.candidateType === 'relay' && candidate.protocol === 'udp') {
			return ConnectionLevel.TURN;
		} else {
			return ConnectionLevel.DIRECT;
		}
	}

	registerConnectionObserverHandler(handler: (receivedBytes: number) => void) {
		this.connectionObserverHandler = handler;
	}

	async startConnectionObserver() {
		if (this.connectionObserver) clearInterval(this.connectionObserver);
		this.connectionObserver = setInterval(async () => {
			const receivedBytes = await this.getReceivedTraffics();
			if (this.pingChannel) this.pingChannel.send('ping');
			if (this.connectionObserverHandler) this.connectionObserverHandler(receivedBytes);
		}, 1000);
	}
}
