<script>
	import config from '$lib/config';
	import kinesisSDK from '$lib/kinesis/kinesisSDK';
	
	let channelName = '';
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	const date = now.getDate();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const seconds = now.getSeconds();
	let userName = `${year}${month >= 10 ? month : '0' + month}${date >= 10 ? date : '0' + date}${
		hours >= 10 ? hours : '0' + hours
	}${minutes >= 10 ? minutes : '0' + minutes}${seconds >= 10 ? seconds : '0' + seconds}`;
</script>

<div id="controllerPlane">
	{config.deployMode} Mode<br />
	<input bind:value={channelName} placeholder="channel name" /><br />
	<input bind:value={userName} placeholer="user name" />
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={() => {
			kinesisSDK.createSignalingChannel(channelName);
		}}
	>
		Create Channel
	</button>
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={() => {
			kinesisSDK.deleteSignalingChannel(channelName);
		}}
	>
		Delete Channel
	</button>
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={() => {
			window.location.href = `/master?channel=${channelName}&username=${userName}`;
		}}
	>
		Connect Master
	</button>
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={async () => {
			window.location.href = `/viewer?channel=${channelName}&username=${userName}`;
		}}
	>
		Connect Viewer
	</button>
	<br>
	<button
		class="channel-button"
		type="button"
		on:click={async () => {
			window.location.href = `/showlog?channel=${channelName}&username=${userName}`;
		}}>
		Watch Logs
	</button>
</div>

<style>
</style>
