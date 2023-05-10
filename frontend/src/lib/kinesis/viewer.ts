import Kinesis from './kinesis';
import WebRTCClient from './webRTCClient';
import { RetryCondition, ConnectionLevel } from './constants';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import type KVSLogger from '$lib/logger/kvsLogger';
import ConnectionObserver from './connectionObserver';

export default class Viewer extends WebRTCClient {
	remoteView: HTMLVideoElement;
	localStream: MediaStream;
	retryMethod: RetryCondition;
	lastRetry: Date | null;
	pingChannel: RTCDataChannel | null;
	lastPingReceived: Date | null;
	connectionObserver: ConnectionObserver | null;
	connectionObserverDefaultHandler: (receivedBytes: number) => void;

	constructor(
		channelName: string,
		userName: string,
		localStream: MediaStream,
		remoteView: HTMLVideoElement,
		retryMethod: RetryCondition,
		logger: KVSLogger
	) {
		super(Role.VIEWER, channelName, userName, logger);
		this.remoteView = remoteView;
		this.localStream = localStream;
		this.retryMethod = retryMethod;
		this.lastRetry = null;
		this.pingChannel = null;
		this.lastPingReceived = null;
		this.connectionObserver = null;
		this.connectionObserverDefaultHandler = (d) => {
			return;
		};
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

		if (this.pingChannel)
			this.connectionObserver = new ConnectionObserver(
				this.pingChannel,
				() => {
					return this.lastPingReceived;
				},
				() => {
					return this.getReceivedTraffics();
				},
				this.connectionObserverDefaultHandler,
				() => {
					console.log('it looks disconnected!');
				}
			);

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
		await this.connectionObserver?.start();
	};

	stopWebRTC() {
		this.peerConnection?.close();
	}

	async retryWebRTC() {
		this.log('WebRTC', `Retry WebRTC`);

		// if disconnected from KVS, connect again
		if (!this.connectedKVS) this.connectKVS();
		this.receivedTraffics = 0;

		let level = ConnectionLevel.DIRECT;
		const now = Date.now();
		if (this.lastRetry && now - this.lastRetry.getTime() < 1000 * 15)
			level = (await this.getCurrentLevel()) + 1;
		if (level >= 2) return;
		this.lastRetry = new Date(now);

		// Get and Apply ice server(STUN, TURN)
		let ChannelARN, iceServerList;
		try {
			ChannelARN = await Kinesis.getSignalingChannelARN(this.channelName);
			iceServerList = await Kinesis.getIceServerList(ChannelARN, Role.VIEWER);
		} catch (e) {
			alert('unable to restart!');
			return;
		}

		this.peerConnection?.setConfiguration({
			iceServers: iceServerList,
			iceTransportPolicy: this.turnOnly || level === ConnectionLevel.TURN ? 'relay' : 'all'
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

		await this.connectionObserver?.restart();
	}

	async getCurrentLevel(): Promise<ConnectionLevel> {
		let candidate;
		try {
			candidate = (await this.getCandidates()).localCandidate;
		} catch (e) {
			throw new Error(`error on ${e}`);
		}

		if (candidate.candidateType === 'relay' && candidate.protocol === 'udp') {
			return ConnectionLevel.TURN;
		} else {
			return ConnectionLevel.DIRECT;
		}
	}

	registerConnectionObserverDefaultHandler(handler: (receivedBytes: number) => void) {
		this.connectionObserverDefaultHandler = handler;
	}
}
