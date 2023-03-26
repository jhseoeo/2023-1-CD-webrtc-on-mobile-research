import { KinesisVideo, KinesisVideoSignalingChannels } from 'aws-sdk';
import config from '$lib/config';

class kinesisSDK {
	constructor() {
		this.kinesisVideo = new KinesisVideo({
			region: config.kinesisRegion,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			}
		});
	}

	async getEndpoints(channelARN, protocol, role) {
		return (
			await this.kinesisVideo
				.getSignalingChannelEndpoint({
					ChannelARN: channelARN,
					SingleMasterChannelEndpointConfiguration: {
						Protocols: [protocol],
						Role: role
					}
				})
				.promise()
		).ResourceEndpointList[0].ResourceEndpoint;
	}

	async checkChannelExists(channelName) {
		const { ChannelInfoList } = await this.kinesisVideo
			.listSignalingChannels({
				ChannelNameCondition: {
					ComparisonOperator: 'BEGINS_WITH',
					ComparisonValue: channelName
				},
				MaxResults: 1
			})
			.promise();

		return ChannelInfoList?.length === 1;
	}

	async getIceServerList(channelARN, role) {
		const endpoints = await this.getEndpoints(channelARN, 'HTTPS', role);

		const kinesisVideoSignalingChannel = new KinesisVideoSignalingChannels({
			region: config.kinesisRegion,
			credentials: {
				accessKeyId: config.kinesisAccessKeyId,
				secretAccessKey: config.kinesisSecretAccessKey
			},
			endpoint: endpoints
		});

		const iceServerList = await kinesisVideoSignalingChannel
			.getIceServerConfig({
				ChannelARN: channelARN
			})
			.promise();

		return iceServerList.IceServerList.reduce(
			(acc, cur) => {
				return [
					...acc,
					{
						urls: cur.Uris,
						username: cur.Username,
						credential: cur.Password
					}
				];
			},
			[
				{
					urls: `stun:stun.kinesisvideo.${config.kinesisRegion}.amazonaws.com:443`
				}
			]
		);
	}

	async createSignalingChannel(channelName) {
		return this.kinesisVideo
			.createSignalingChannel({
				ChannelName: channelName
			})
			.promise();
	}

	async getSignalingChannel(channelName) {
		return this.kinesisVideo
			.describeSignalingChannel({
				ChannelName: channelName
			})
			.promise();
	}

	async deleteSignalingChannel(channelName) {
		const channel = await this.getSignalingChannel(channelName);
		return this.kinesisVideo
			.deleteSignalingChannel({ ChannelARN: channel.ChannelInfo.ChannelARN })
			.promise();
	}
}

export default new kinesisSDK();
