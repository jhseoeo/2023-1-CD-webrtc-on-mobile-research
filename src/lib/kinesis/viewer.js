import kinesisSDK from './kinesisSDK';
import config from '$lib/config';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc/lib/SignalingClient';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';

export default class Viewer {
	constructor(channelName, remoteView) {
		this.channelName = channelName;
		this.remoteView = remoteView;
		this.clientId = 'strong';
	}

	async init() {
		const { ChannelARN } = (await kinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo;
		const wssEndpoint = await kinesisSDK.getEndpoints(ChannelARN, 'WSS', Role.VIEWER);
		const iceServerList = await kinesisSDK.getIceServerList(ChannelARN, Role.VIEWER);

		this.signalingClient = new SignalingClient({
			role: Role.VIEWER,
			clientId: this.clientId,
			region: config.kinesisRegion,
			channelARN: ChannelARN,
			channelEndpoint: wssEndpoint,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			}
		});

		this.peerConnection = new RTCPeerConnection({
			iceServers: iceServerList
		});

		this.signalingClient.on('open', async () => {
			this.logger.post('userId', 'VIEWER', 'KVS', '[VIEWER] Connected to signaling service');

			this.logger.post('userId', 'VIEWER', 'SDP', '[VIEWER] Creating SDP offer');
			await this.peerConnection.setLocalDescription(
				await this.peerConnection.createOffer({
					offerToReceiveAudio: true,
					offerToReceiveVideo: true
				})
			);

			this.logger.post('userId', 'VIEWER', 'SDP', '[VIEWER] Sending SDP offer');
			this.signalingClient.sendSdpOffer(this.peerConnection.localDescription);
			this.logger.post('userId', 'VIEWER', 'ICE', '[VIEWER] Generating ICE candidates');
		});

		this.signalingClient.on('sdpAnswer', async (answer) => {
			// Add the SDP answer to the peer connection
			this.logger.post('userId', 'VIEWER', 'SDP', '[VIEWER] Received SDP answer');
			await this.peerConnection.setRemoteDescription(answer);
		});

		this.signalingClient.on('iceCandidate', (candidate) => {
			// Add the ICE candidate received from the MASTER to the peer connection
			this.logger.post('userId', 'VIEWER', 'ICE', '[VIEWER] Received ICE candidate');
			this.peerConnection.addIceCandidate(candidate);
		});

		this.signalingClient.on('close', () => {
			this.logger.post('userId', 'VIEWER', 'KVS', '[VIEWER] Disconnected from signaling channel');
		});

		this.signalingClient.on('error', (error) => {
			this.logger.post('userId', 'VIEWER', 'Error', '[VIEWER] Signaling client error:' + error);
		});

		// Send any ICE candidates to the other peer
		this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
			if (candidate) {
				this.logger.post('userId', 'VIEWER', 'ICE', '[VIEWER] Generated ICE candidate');

				// When trickle ICE is enabled, send the ICE candidates as they are generated.
				this.logger.post('userId', 'VIEWER', 'ICE', '[VIEWER] Sending ICE candidate');
				this.signalingClient.sendIceCandidate(candidate);
			} else {
				this.logger.post(
					'userId',
					'VIEWER',
					'ICE',
					'[VIEWER] All ICE candidates have been generated'
				);
			}
		});

		// As remote tracks are received, add them to the remote view
		this.peerConnection.addEventListener('track', (event) => {
			this.logger.post('userId', 'VIEWER', 'RTC', '[VIEWER] Received remote track');
			if (this.remoteView.srcObject) {
				return;
			}
			this.remoteView.srcObject = event.streams[0];
		});
	}

	async start() {
		this.logger.post('userId', 'VIEWER', 'KVS', '[VIEWER] Starting viewer connection');
		this.signalingClient.open();
	}
}
