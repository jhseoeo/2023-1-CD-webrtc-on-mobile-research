import { KinesisVideo, KinesisVideoSignalingChannels } from 'aws-sdk';
import {
	PUBLIC_KINESIS_REGION,
	PUBLIC_KINESIS_ACCESS_KEY_ID,
	PUBLIC_KINESIS_SECRET_ACCESS_KEY
} from '$env/static/public';

class kinesisSDK {
	constructor() {
		this.kinesisVideo = new KinesisVideo({
			region: PUBLIC_KINESIS_REGION,
			credentials: {
				accessKeyId: PUBLIC_KINESIS_ACCESS_KEY_ID,
				secretAccessKey: PUBLIC_KINESIS_SECRET_ACCESS_KEY
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
			region: PUBLIC_KINESIS_REGION,
			credentials: {
				accessKeyId: PUBLIC_KINESIS_ACCESS_KEY_ID,
				secretAccessKey: PUBLIC_KINESIS_SECRET_ACCESS_KEY
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
					urls: `stun:stun.kinesisvideo.${PUBLIC_KINESIS_REGION}.amazonaws.com:443`
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
}

export default new kinesisSDK();
