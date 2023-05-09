import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import KVSClient from './kvsClient';
import type { RetryCondition } from './constants';
import type KVSLogger from '$lib/logger/kvsLogger';

export default class Master extends KVSClient {
	localStream: MediaStream;
	retryMethod: RetryCondition;

	constructor(
		channelName: string,
		userName: string,
		localStream: MediaStream,
		retryMethod: RetryCondition,
		logger: KVSLogger
	) {
		super(Role.MASTER, channelName, userName, logger);
		this.localStream = localStream;
		this.retryMethod = retryMethod;
	}

	async init() {
		await super.init();

		this.signalingClient?.on('sdpOffer', async (offer, remoteClientId) => {
			this.logger?.postLog(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Received SDP offer from client : ${remoteClientId}`
			);

			// Send any ICE candidates to the other peer
			if (this.peerConnection !== null && !this.peerConnection.onicecandidate)
				this.peerConnection.onicecandidate = ({ candidate }) => {
					if (candidate) {
						this.logger?.postLog(
							this.channelName,
							this.clientId,
							this.role,
							'ICE',
							`[${this.role}] Generated ICE candidate : ${candidate.candidate}`
						);

						console.log(candidate.type, candidate.address, candidate.protocol);
						this.signalingClient?.sendIceCandidate(candidate, remoteClientId);
					} else {
						this.logger?.postLog(
							this.channelName,
							this.clientId,
							this.role,
							'ICE',
							`[${this.role}] All ICE candidates have been generated`
						);
					}
				};

			// If there's no video/audio, this.localStream will be null. So, we should skip adding the tracks from it.
			if (this.peerConnection !== null && this.localStream) {
				// for retry
				if (this.tracks.length !== 0) {
					this.tracks.forEach((track) => {
						this.peerConnection?.removeTrack(track);
					});
					this.tracks = [];
				}

				this.localStream.getTracks().forEach((track) => {
					const sender = this.peerConnection?.addTrack(track, this.localStream);
					if (sender) this.tracks.push(sender);
				});
			}
			await this.peerConnection?.setRemoteDescription(offer);

			// Create an SDP answer to send back to the client
			this.logger?.postLog(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Creating SDP answer for client`
			);
			await this.peerConnection?.setLocalDescription(
				await this.peerConnection?.createAnswer({
					offerToReceiveAudio: false,
					offerToReceiveVideo: false
				})
			);

			// When trickle ICE is enabled, send the answer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
			this.logger?.postLog(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Sending SDP answer`
			);
			if (this.peerConnection !== null && this.peerConnection.localDescription)
				this.signalingClient?.sendSdpAnswer(this.peerConnection.localDescription, remoteClientId);
			this.logger?.postLog(
				this.channelName,
				this.clientId,
				this.role,
				'ICE',
				`[${this.role}] Generating ICE candidates`
			);
		});

		this.logger?.postLog(
			this.channelName,
			this.clientId,
			this.role,
			'system',
			`[${this.role}] Initialized`
		);
	}

	async registerIceConnectionStateHandler(handler: (state: string) => void) {
		super.registerIceConnectionStateHandler((state) => {
			handler(state);
		});
	}
}
