export const load = async ({ url, params }) => {
	return {
		channelName: params.channel,
		userName: params.username
	};
};
