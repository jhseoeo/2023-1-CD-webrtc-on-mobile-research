import { KinesisVideo } from '@aws-sdk/client-kinesis-video';
import { KinesisVideoSignaling } from '@aws-sdk/client-kinesis-video-signaling';
import config from '$lib/config';
import type { Role } from 'amazon-kinesis-video-streams-webrtc';

class Kinesis {
	kinesisVideo: KinesisVideo;

	constructor() {
		this.kinesisVideo = new KinesisVideo({
			region: config.kinesisRegion,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			}
		});
	}

	/**
	 * Return WSS or HTTPS endpoint by channel ARN
	 */
	public async getEndpoints(channelARN: string, protocol: string, role: Role) {
		return (
			await this.kinesisVideo.getSignalingChannelEndpoint({
				ChannelARN: channelARN,
				SingleMasterChannelEndpointConfiguration: {
					Protocols: [protocol],
					Role: role
				}
			})
		)?.ResourceEndpointList?.[0].ResourceEndpoint;
	}

	/**
	 * Return whether channel is exists by given channelname
	 */
	public async checkChannelExists(channelName: string) {
		const { ChannelInfoList } = await this.kinesisVideo.listSignalingChannels({
			ChannelNameCondition: {
				ComparisonOperator: 'BEGINS_WITH',
				ComparisonValue: channelName
			},
			MaxResults: 1
		});
		return ChannelInfoList?.length === 1;
	}

	/**
	 * Return list of ice server(STUN, TURN) by channel ARN and role
	 */
	public async getIceServerList(
		channelARN: string,
		role: Role
	): Promise<RTCIceServer[] | undefined> {
		const endpoints = await this.getEndpoints(channelARN, 'HTTPS', role);

		const kinesisVideoSignalingChannel = new KinesisVideoSignaling({
			region: config.kinesisRegion,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			},
			endpoint: endpoints
		});

		const iceServerList = await kinesisVideoSignalingChannel.getIceServerConfig({
			ChannelARN: channelARN
		});
		return iceServerList.IceServerList?.reduce(
			(acc, cur): RTCIceServer[] => {
				if (cur.Uris !== undefined)
					return [
						...acc,
						{
							urls: cur.Uris,
							username: cur.Username,
							credential: cur.Password
						}
					];
				else return acc;
			},
			[
				{
					urls: `stun:stun.kinesisvideo.${config.kinesisRegion}.amazonaws.com:443`
				} as RTCIceServer
			]
		);
	}

	/**
	 * Create signaling channel
	 */
	public async createSignalingChannel(channelName: string) {
		return this.kinesisVideo.createSignalingChannel({
			ChannelName: channelName
		});
	}

	/**
	 * Get signaling channel information by channel name
	 */
	public async getSignalingChannelARN(channelName: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.kinesisVideo
				.describeSignalingChannel({
					ChannelName: channelName
				})
				.then((channel) => {
					if (channel.ChannelInfo?.ChannelARN) resolve(channel.ChannelInfo?.ChannelARN);
					else reject('undefined channelARN val');
				})
				.catch((e) => {
					reject(e);
				});
		});
	}

	/**
	 * Delete signaling channel information by channel name
	 */
	public async deleteSignalingChannel(channelName: string) {
		const channelARN = await this.getSignalingChannelARN(channelName);
		return this.kinesisVideo.deleteSignalingChannel({
			ChannelARN: channelARN
		});
	}
}

export default new Kinesis();
