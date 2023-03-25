<script>
	import { onMount } from 'svelte';
	import Master from '$lib/kinesis/master';
	export let data;

	let localView;
	let localStream;

	onMount(async () => {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({
				video: { width: { ideal: 1280 }, height: { ideal: 720 } },
				audio: false
			});
			localView.srcObject = localStream;
		} catch (e) {
			console.error('[MASTER] Could not find Webcam');
		}

		const master = new Master(data.channelName, localStream);
		await master.init();
		master.start();
	});
</script>

<video class="viewer local-view" autoPlay playsInline controls muted bind:this={localView} />

<style>
</style>
