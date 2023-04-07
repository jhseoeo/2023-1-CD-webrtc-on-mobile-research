import kinesisSDK from './kinesisSDK';
import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import KVSClient from './kvsClient';

export default class Viewer extends KVSClient {
	constructor(channelName, userName, remoteView) {
		super(Role.VIEWER, channelName, userName);
		this.remoteView = remoteView;
	}
	async init() {
		await super.init();

		this.signalingClient.on('sdpAnswer', async (answer) => {
			// Add the SDP answer to the peer connection
			this.logger.post(this.clientId, this.role, 'SDP', `[${this.role}] Received SDP answer`);
			await this.peerConnection.setRemoteDescription(answer);
		});

		// As remote tracks are received, add them to the remote view
		this.peerConnection.addEventListener('track', (event) => {
			this.logger.post(this.clientId, this.role, 'WebRTC', `[${this.role}] Received remote track`);
			if (this.remoteView.srcObject) {
				return;
			}
			this.remoteView.srcObject = event.streams[0];
		});

		this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
			if (candidate) {
				this.logger.post(
					this.clientId,
					this.role,
					'ICE',
					`[${this.role}] Generated ICE candidate : ${candidate.candidate}`
				);

				this.signalingClient.sendIceCandidate(candidate);
			} else {
				this.logger.post(
					this.clientId,
					this.role,
					'ICE',
					`[${this.role}] All ICE candidates have been generated`
				);
			}
		});

		this.logger.post(this.clientId, this.role, 'system', `[${this.role}] Initialized`);
	}

	startWebRTC = async () => {
		this.logger.post(this.clientId, this.role, 'SDP', `[${this.role}] Creating SDP offer`);
		await this.peerConnection.setLocalDescription(
			await this.peerConnection.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true
			})
		);

		this.logger.post(this.clientId, this.role, 'SDP', `[${this.role}] Sending SDP offer`);
		this.signalingClient.sendSdpOffer(this.peerConnection.localDescription);
		this.logger.post(this.clientId, this.role, 'ICE', `[${this.role}] Generating ICE candidates`);
	};

	stopWebRTC() {
		this.peerConnection.close();
	}

	async retryWebRTC() {
		// if (
		// 	!(
		// 		this.peerConnection.iceConnectionState == 'disconnected' ||
		// 		this.peerConnection.iceConnectionState == 'failed'
		// 	)
		// )
		// 	return;

		const { ChannelARN } = (await kinesisSDK.getSignalingChannel(this.channelName)).ChannelInfo;
		const iceServerList = await kinesisSDK.getIceServerList(ChannelARN, Role.VIEWER);

		this.logger.post(this.clientId, this.role, 'WebRTC', `[${this.role}] Retry WebRTC`);
		this.peerConnection.setConfiguration({
			iceServers: iceServerList,
			iceTransportPolicy: this.turnOnly ? 'relay' : 'all'
		});
		await this.peerConnection.setLocalDescription(
			await this.peerConnection.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true,
				iceRestart: true
			})
		);

		this.logger.post(this.clientId, this.role, 'SDP', `[${this.role}] Sending SDP offer`);
		this.signalingClient.sendSdpOffer(this.peerConnection.localDescription);
		this.logger.post(this.clientId, this.role, 'ICE', `[${this.role}] Generating ICE candidates`);
		// this.peerConnection.restartIce();
	}
}