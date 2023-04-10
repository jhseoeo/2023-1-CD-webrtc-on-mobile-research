import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import KVSClient from './kvsClient';

export default class Master extends KVSClient {
	constructor(channelName, userName, localStream) {
		super(Role.MASTER, channelName, userName);
		this.localStream = localStream;
	}

	async init() {
		await super.init();

		this.signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Received SDP offer from client : ${remoteClientId}`
			);

			// Send any ICE candidates to the other peer
			this.peerConnection.onicecandidate = ({ candidate }) => {
				if (candidate) {
					this.logger.post(
						this.channelName,
						this.clientId,
						this.role,
						'ICE',
						`[${this.role}] Generated ICE candidate : ${candidate.candidate}`
					);
					this.signalingClient.sendIceCandidate(candidate, remoteClientId);
				} else {
					this.logger.post(
						this.channelName,
						this.clientId,
						this.role,
						'ICE',
						`[${this.role}] All ICE candidates have been generated`
					);
				}
			};

			// If there's no video/audio, this.localStream will be null. So, we should skip adding the tracks from it.
			if (this.localStream) {
				this.localStream
					.getTracks()
					.forEach((track) => this.peerConnection.addTrack(track, this.localStream));
			}
			await this.peerConnection.setRemoteDescription(offer);

			// Create an SDP answer to send back to the client
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Creating SDP answer for client`
			);
			await this.peerConnection.setLocalDescription(
				await this.peerConnection.createAnswer({
					offerToReceiveAudio: false,
					offerToReceiveVideo: false
				})
			);

			// When trickle ICE is enabled, send the answer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'SDP',
				`[${this.role}] Sending SDP answer`
			);
			this.signalingClient.sendSdpAnswer(this.peerConnection.localDescription, remoteClientId);
			this.logger.post(
				this.channelName,
				this.clientId,
				this.role,
				'ICE',
				`[${this.role}] Generating ICE candidates`
			);
		});

		this.logger.post(
			this.channelName,
			this.clientId,
			this.role,
			'system',
			`[${this.role}] Initialized`
		);
	}
}
