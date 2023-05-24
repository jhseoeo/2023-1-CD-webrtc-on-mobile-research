import { Role } from 'amazon-kinesis-video-streams-webrtc/lib/Role';
import WebRTCClient from './webRTCClient';
import type KVSLogger from '$lib/logger/kvsLogger';

export default class Master extends WebRTCClient {
	private localStream: MediaStream;
	private pingChannel: RTCDataChannel | null;

	constructor(channelName: string, userName: string, localStream: MediaStream, logger: KVSLogger) {
		super(Role.MASTER, channelName, userName, logger);
		this.localStream = localStream;
		this.pingChannel = null;
	}

	public async init() {
		await super.init();

		// if there is local stream and no existing tracks, add local stream into track
		if (this.localStream && this.tracks.length === 0) {
			this.localStream.getTracks().forEach((track) => {
				const sender = this.peerConnection?.addTrack(track, this.localStream);
				if (sender) this.tracks.push(sender);
			});
		}

		// when received sdp offer from signaling channel, called this
		this.signalingClient?.on('sdpOffer', async (offer, remoteClientId) => {
			this.log('SDP', `Received SDP offer from client : ${remoteClientId}`);

			// Send any ICE candidates to the other peer
			if (this.peerConnection !== null) {
				// every time RTCPeerConnection generates ice candidates, send its candidate
				this.peerConnection.onicecandidate = ({ candidate }) => {
					if (candidate) {
						this.log('ICE', `Generated ICE candidate : ${candidate.candidate}`);

						console.log(candidate.type, candidate.address, candidate.protocol);

						this.signalingClient?.sendIceCandidate(candidate, remoteClientId);
					} else {
						this.log('ICE', `All ICE candidates have been generated`);
					}
				};

				//
				this.peerConnection.ondatachannel = (event) => {
					this.pingChannel = event.channel;
					this.pingChannel.onopen = () => {
						this.log('DataChannel', 'Datachannel is opened');
					};
					this.pingChannel.onmessage = (e) => {
						console.log(e.data);
						this.pingChannel?.send('echo');
					};
					this.pingChannel.onclose = () => {
						this.log('DataChannel', 'Datachannel is closed');
					};
				};
			}

			// set sdp offer as remote description
			await this.peerConnection?.setRemoteDescription(offer);

			// Create an SDP answer to send back to the client
			this.log('SDP', `Creating SDP answer for client`);
			await this.peerConnection?.setLocalDescription(
				await this.peerConnection?.createAnswer({
					offerToReceiveAudio: false,
					offerToReceiveVideo: false
				})
			);

			this.log('SDP', `Sending SDP answer`);
			if (this.peerConnection !== null && this.peerConnection.localDescription !== null)
				this.signalingClient?.sendSdpAnswer(this.peerConnection.localDescription, remoteClientId);
			this.log('ICE', `Generating ICE candidates`);
		});

		this.log('system', `Initialized`);
	}

	public registerKvsConnectionStateHandler(handler: (state: string) => void): void {
		super.registerKvsConnectionStateHandler((state) => {
			if (state == 'disconnected') {
				this.connectKVS();
			}

			handler(state);
		});
	}
}
