import WebRTCClient from './webRTCClient';
import { RetryCondition, ConnectionLevel } from './constants';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import type KVSLogger from '$lib/logger/kvsLogger';
import ConnectionObserver from './connectionObserver';
import { isDeviceIOS } from '$lib/utils';

export default class Viewer extends WebRTCClient {
	private remoteView: HTMLVideoElement;
	private localStream: MediaStream;
	private lastRetry: Date | null;
	private pingChannel: RTCDataChannel | null;
	private lastPingReceived: Date | null;
	private connectionObserver: ConnectionObserver | null;
	private connectionObserverDefaultHandler: (receivedBytes: number) => void;

	public constructor(
		channelName: string,
		userName: string,
		localStream: MediaStream,
		remoteView: HTMLVideoElement,
		logger: KVSLogger
	) {
		super(Role.VIEWER, channelName, userName, logger);
		this.remoteView = remoteView;
		this.localStream = localStream;
		this.lastRetry = null;
		this.pingChannel = null;
		this.lastPingReceived = null;
		this.connectionObserver = null;
		this.connectionObserverDefaultHandler = (d) => {
			return d;
		};
	}

	public async init() {
		await super.init();

		const sendChannel = this.peerConnection?.createDataChannel('ping');
		if (sendChannel) {
			this.pingChannel = sendChannel;
			this.pingChannel.onopen = () => {
				this.log('DataChannel', 'Datachannel is opened');
			};
			this.pingChannel.onmessage = () => {
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
					if (this.retryCondition === RetryCondition.BEFORE_DISCONNECTED) {
						this.retryWebRTC();
					}
				}
			);

		this.log('system', `Initialized`);
	}

	public registerConnectionObserverDefaultHandler(handler: (receivedBytes: number) => void) {
		this.connectionObserverDefaultHandler = handler;
	}

	public registerIceConnectionStateHandler(handler: (state: string) => void): void {
		super.registerIceConnectionStateHandler(async (state) => {
			handler(state);

			if (this.retryCondition === RetryCondition.AFTER_FAILED && state === 'failed') {
				this.log('system', 'WebRTC connection failed. Try to restart!');
				this.retryWebRTC();
			} else if (
				this.retryCondition === RetryCondition.AFTER_DISCONNECTED &&
				state === 'disconnected'
			) {
				this.log(
					'system',
					'WebRTC connection disconnected. Try to restart after check disconnection!'
				);
				if (await this.connectionObserver?.checkDisconnected()) {
					this.retryWebRTC();
					this.log('system', 'Try to restart!');
				}
			} else if (
				this.retryCondition === RetryCondition.RIGHT_AFTER_DISCONNECTED &&
				state === 'disconnected'
			) {
				this.log(
					'system',
					'WebRTC connection disconnected. Try to restart after check disconnection!'
				);
				if (this.connectionObserver?.isDisconnected()) {
					this.retryWebRTC();
					this.log('system', 'Try to restart!');
				}
			}
		});
	}

	public registerConnectionStateHandler(handler: (state: string) => void): void {
		super.registerConnectionStateHandler((state) => {
			if (state === 'failed' && this.peerConnection?.iceConnectionState === 'disconnected') {
				this.iceConnectionStateHandler?.('failed');
			}
			handler(state);
		});
	}

	public async resetKVS() {
		await super.resetKVS();

		this.signalingClient?.on('sdpAnswer', async (answer) => {
			// Add the SDP answer to the peer connection
			this.log('SDP', `Received SDP answer`);
			await this.peerConnection?.setRemoteDescription(answer);
		});

		this.signalingClient?.open();
	}

	public async startWebRTC() {
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

		this.sendSdpOffer();
		this.lastRetry = new Date();
		await this.connectionObserver?.start();
	}

	public stopWebRTC() {
		this.peerConnection?.close();
	}

	public async retryWebRTC() {
		this.log('WebRTC', `Retry WebRTC`);

		if (!navigator.onLine)
			if (await this.connectionObserver?.waitUntilNetworkRecover(10000)) {
				this.log('System', `Network Recovered`);
			} else {
				return alert('network unavailable!');
			}

		// if device is connected on ios safari, reset KVS to discard staled websocket
		if (isDeviceIOS()) await this.resetKVS();
		// if disconnected from KVS, connect again
		else if (!this.connectedKVS) await this.connectKVS();
		this.receivedTraffics = 0;

		// Get and Apply ice server(STUN, TURN)
		const iceServerList = await this.getIceServerList(this.channelARN);

		let level = ConnectionLevel.DIRECT;
		const now = Date.now();
		if (this.lastRetry && now - this.lastRetry.getTime() < 1000 * 15)
			level = this.connectionLevel + 1;
		if (level > ConnectionLevel.TURN) return alert('15초 이내 재시도 회수가 너무 많아요');
		this.lastRetry = new Date(now);

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

		this.sendSdpOffer();
		this.connectionObserver?.start();
	}

	private async sendSdpOffer() {
		this.log('SDP', `Sending SDP Restart offer`);
		if (this.peerConnection !== null && this.peerConnection.localDescription)
			this.signalingClient?.sendSdpOffer(this.peerConnection.localDescription);
		this.log('ICE', `Generating ICE candidates`);
	}
}
