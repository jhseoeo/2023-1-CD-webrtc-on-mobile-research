<script lang="ts">
	import { onMount } from "svelte";
	import KVSLogReceiver from "$lib/logger/kvsLogReceiver";

	let logReceiver : KVSLogReceiver | undefined;
	let logSpace = "";
	let data : URLSearchParams | null;

    onMount(async() => {
		data = new URLSearchParams(window.location.search)
		const channel = data?.get('channel')
		const username = data?.get('username')

		logReceiver = new KVSLogReceiver();
		if (channel !== null && username !== null ) {
			await logReceiver.init(channel, username);
			logReceiver.registerMessageHandler((message) => {
				console.log(message)
				logSpace += `${message.content}<br>`
			});
		} else {
			console.error("unable to initialize ")
		}
    })
</script>

<div>
	Logs for channel: 
	{#if data}
		{data.get('channel')}, user: {data.get('username')}<br>
	{/if}
	<div bind:innerHTML={logSpace} contenteditable="false">
	</div>
</div>