<script>
	import { onMount } from 'svelte';
	import Viewer from '$lib/kinesis/viewer';
	export let data;

	let remoteView;

	onMount(async () => {
		const viewer = new Viewer(data.channelName, remoteView);
		await viewer.init();
		viewer.start();
	});
</script>

<video class="viewer remote-view" autoPlay playsInline controls muted bind:this={remoteView} />

<style>
</style>
