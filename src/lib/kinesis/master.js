import kinesisSDK from './kinesisSDK';
import config from '$lib/config';
import KVSLogger from '$lib/logging/kvsLogger';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc/lib/SignalingClient';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';

export default class Master {
	constructor(channelName, localStream) {
		this.channelName = channelName;
		this.localStream = localStream;
	}

	async init() {
		const { ChannelARN } = (await kinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo;
		const wssEndpoint = await kinesisSDK.getEndpoints(ChannelARN, 'WSS', Role.MASTER);
		const iceServerList = await kinesisSDK.getIceServerList(ChannelARN, Role.MASTER);

		this.logger = new KVSLogger();
		await this.logger.init();

		this.signalingClient = new SignalingClient({
			role: Role.MASTER,
			region: config.kinesisRegion,
			channelARN: ChannelARN,
			channelEndpoint: wssEndpoint,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			}
		});

		this.signalingClient.on('open', async () => {
			this.logger.post('userId', 'MASTER', 'KVS', '[MASTER] Connected to signaling service');
		});

		this.signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
			this.logger.post(
				'userId',
				'MASTER',
				'SDP',
				'[MASTER] Received SDP offer from client: ' + remoteClientId
			);

			// Create a new peer connection using the offer from the given client
			this.peerConnection = new RTCPeerConnection({
				iceServers: iceServerList
			});

			// Send any ICE candidates to the other peer
			this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
				if (candidate) {
					this.logger.post(
						'userId',
						'MASTER',
						'ICE',
						'[MASTER] Generated ICE candidate for client: ' + remoteClientId
					);

					// When trickle ICE is enabled, send the ICE candidates as they are generated.
					this.logger.post(
						'userId',
						'MASTER',
						'ICE',
						'[MASTER] Sending ICE candidate to client: ' + remoteClientId
					);
					this.signalingClient.sendIceCandidate(candidate, remoteClientId);
				} else {
					this.logger.post(
						'userId',
						'MASTER',
						'ICE',
						'[MASTER] All ICE candidates have been generated for client: ' + remoteClientId
					);
				}
			});

			// If there's no video/audio, this.localStream will be null. So, we should skip adding the tracks from it.
			if (this.localStream) {
				this.localStream
					.getTracks()
					.forEach((track) => this.peerConnection.addTrack(track, this.localStream));
			}
			await this.peerConnection.setRemoteDescription(offer);

			// Create an SDP answer to send back to the client
			this.logger.post(
				'userId',
				'MASTER',
				'SDP',
				'[MASTER] Creating SDP answer for client: ' + remoteClientId
			);
			await this.peerConnection.setLocalDescription(
				await this.peerConnection.createAnswer({
					offerToReceiveAudio: false,
					offerToReceiveVideo: false
				})
			);

			// When trickle ICE is enabled, send the answer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
			this.logger.post(
				'userId',
				'MASTER',
				'SDP',
				'[MASTER] Sending SDP answer to client: ' + remoteClientId
			);
			this.signalingClient.sendSdpAnswer(this.peerConnection.localDescription, remoteClientId);
			this.logger.post(
				'userId',
				'MASTER',
				'ICE',
				'[MASTER] Generating ICE candidates for client: ' + remoteClientId
			);
		});

		this.signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
			this.logger.post(
				'userId',
				'MASTER',
				'ICE',
				'[MASTER] Received ICE candidate from client: ' + remoteClientId
			);

			// Add the ICE candidate received from the client to the peer connection
			this.peerConnection.addIceCandidate(candidate);
		});

		this.signalingClient.on('close', () => {
			this.logger.post('userId', 'MASTER', 'KVS', '[MASTER] Disconnected from signaling channel');
		});

		this.signalingClient.on('error', (e) => {
			this.logger.post('userId', 'MASTER', 'Error', '[MASTER] Signaling client error', e);
		});
	}

	async start() {
		this.logger.post('userId', 'MASTER', 'KVS', '[MASTER] Starting master connection');
		this.signalingClient.open();
	}
}
