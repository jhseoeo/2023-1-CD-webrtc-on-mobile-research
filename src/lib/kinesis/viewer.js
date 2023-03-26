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
			console.log('[VIEWER] Connected to signaling service');

			console.log('[VIEWER] Creating SDP offer');
			await this.peerConnection.setLocalDescription(
				await this.peerConnection.createOffer({
					offerToReceiveAudio: true,
					offerToReceiveVideo: true
				})
			);

			console.log('[VIEWER] Sending SDP offer');
			this.signalingClient.sendSdpOffer(this.peerConnection.localDescription);
			console.log('[VIEWER] Generating ICE candidates');
		});

		this.signalingClient.on('sdpAnswer', async (answer) => {
			// Add the SDP answer to the peer connection
			console.log('[VIEWER] Received SDP answer');
			await this.peerConnection.setRemoteDescription(answer);
		});

		this.signalingClient.on('iceCandidate', (candidate) => {
			// Add the ICE candidate received from the MASTER to the peer connection
			console.log('[VIEWER] Received ICE candidate');
			this.peerConnection.addIceCandidate(candidate);
		});

		this.signalingClient.on('close', () => {
			console.log('[VIEWER] Disconnected from signaling channel');
		});

		this.signalingClient.on('error', (error) => {
			console.error('[VIEWER] Signaling client error: ', error);
		});

		// Send any ICE candidates to the other peer
		this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
			if (candidate) {
				console.log('[VIEWER] Generated ICE candidate');

				// When trickle ICE is enabled, send the ICE candidates as they are generated.
				console.log('[VIEWER] Sending ICE candidate');
				this.signalingClient.sendIceCandidate(candidate);
			} else {
				console.log('[VIEWER] All ICE candidates have been generated');
			}
		});

		// As remote tracks are received, add them to the remote view
		this.peerConnection.addEventListener('track', (event) => {
			console.log('[VIEWER] Received remote track');
			if (this.remoteView.srcObject) {
				return;
			}
			this.remoteView.srcObject = event.streams[0];
		});
	}

	async start() {
		console.log('[VIEWER] Starting viewer connection');
		this.signalingClient.open();
	}
}
