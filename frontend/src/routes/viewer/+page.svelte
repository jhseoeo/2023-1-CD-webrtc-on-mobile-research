<script>
	import { onMount } from 'svelte';
	import Viewer from '$lib/kinesis/viewer';
	import config from '$lib/config';

	let remoteView;
	let viewer;

	let kvsConnectionState = 'disconnected';
	let iceConnectionState = 'not started';
	let connectionState = 'not started';
	let candidate = '';

	let reportLogs = config.reportLogs;
	let printConsole = config.printConsole;
	let turnOnly = config.turnOnly;

	onMount(async () => {
		let data = new URLSearchParams(window.location.search)

		viewer = new Viewer(data.get('channel'), data.get('username'), remoteView);
		viewer.registerKvsConnectionStateHandler((state) => {
			kvsConnectionState = state;
		});
		viewer.registerIceConnectionStateHandler(async (state) => {
			iceConnectionState = state;
		});
		viewer.registerConnectionStateHandler((state) => {
			connectionState = state;
		});
	});
</script>

<video class="viewer" autoPlay playsInline controls muted bind:this={remoteView} />
<div class="controller">
	<button
		on:click={() => {
			viewer.init();
		}}>Initialize</button
	>

	<hr />

	KVS
	<button
		on:click={() => {
			viewer.connectKVS();
		}}>Connect</button
	>
	<button
		on:click={() => {
			viewer.disconnectKVS();
		}}>Disconnect</button
	>
	<span bind:innerHTML={kvsConnectionState} contenteditable="false" /><br />

	<hr />

	WebRTC
	<button
		on:click={() => {
			viewer.startWebRTC();
		}}>Start</button
	>
	<button
		on:click={() => {
			viewer.stopWebRTC();
		}}>Stop</button
	>
	<button
		on:click={() => {
			viewer.retryWebRTC();
		}}>Restart</button
	><button
		on:click={async () => {
			const c = await viewer.getCandidates();
			candidate = `type:${c.candidateType} | ip:${c.ip} | port:${c.port} | protocol:${c.protocol}`
		}}>Show Candidates</button
	><br />
	iceConnectionState: <span bind:innerHTML={iceConnectionState} contenteditable="false" /><br />
	connectionState: <span bind:innerHTML={connectionState} contenteditable="false" /><br />
	candidates: <span bind:innerHTML={candidate} contenteditable="false" />

	<hr />

	<div class="options">
		Report Logs<input
			type="checkbox"
			bind:checked={reportLogs}
			on:change={() => {
				viewer.toggleLogging(reportLogs);
			}}
		/><br />
	</div>
	<div class="options">
		Print Logs to Console
		<input
			type="checkbox"
			bind:checked={printConsole}
			on:change={() => {
				viewer.togglePrintConsole(printConsole);
			}}
		/>
	</div>
	<div class="options">
		Use TURN Only
		<input
			type="checkbox"
			bind:checked={turnOnly}
			on:change={() => {
				viewer.toggleTURNOnly(turnOnly);
			}}
		/>
	</div>
</div>

<style>
</style>
