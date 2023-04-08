<script>
	import { onMount } from "svelte";
	import LogReceiver from "$lib/logging/logReceiver";

	let logSpace = "";
	let data;

    onMount(async() => {
		data = new URLSearchParams(window.location.search)
		
		let logReceiver = new LogReceiver();
		await logReceiver.init();
		logReceiver.changeMessageHandler((message) => {
			console.log(message)
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