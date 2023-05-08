<script>
	import { onMount } from "svelte";
	import KVSLogReceiver from "$lib/logger/kvsLogReceiver";

	let logSpace = "";
	let data;

    onMount(async() => {
		data = new URLSearchParams(window.location.search)
		
		let logReceiver = new KVSLogReceiver();
		await logReceiver.init(data.get('channel'), data.get('username'));
		logReceiver.changeMessageHandler((message) => {
			console.log(message)
			logSpace += `${message.content}<br>`
		});
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