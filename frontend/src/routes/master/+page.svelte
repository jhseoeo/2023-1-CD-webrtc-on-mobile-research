<script>
	import { onMount } from 'svelte';
	import Master from '$lib/kinesis/master';
	import config from '$lib/config';

	let localView;
	let localStream;
	let master;

	let kvsConnectionState = 'disconnected';
	let iceConnectionState = 'not started';
	let connectionState = 'not started';
	let candidate = '';

	let reportLogs = config.reportLogs;
	let printConsole = config.printConsole;
	let turnOnly = config.turnOnly;

	onMount(async () => {
		let data = new URLSearchParams(window.location.search)

		localStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1280 }, height: { ideal: 720 } },
			audio: false
		});
		localView.srcObject = localStream;
		master = new Master(data.get('channel'), data.get('username'), localStream);
		master.registerKvsConnectionStateHandler((state) => {
			kvsConnectionState = state;
		});
		master.registerIceConnectionStateHandler(async (state) => {
			iceConnectionState = state;
		});
		master.registerConnectionStateHandler((state) => {
			connectionState = state;
		});
	});
</script>

<video class="viewer" autoPlay playsInline controls muted bind:this={localView} /><br />
<div class="controller">
	<button
		on:click={() => {
			master.init();
		}}>Initialize</button
	>

	<hr />

	KVS
	<button
		on:click={() => {
			master.connectKVS();
		}}>Connect</button
	>
	<button
		on:click={() => {
			master.disconnectKVS();
		}}>Disconnect</button
	>
	<span bind:innerHTML={kvsConnectionState} contenteditable="false" /><br />

	<hr />

	WebRTC<button
		on:click={() => {
			master.stopWebRTC();
		}}>Stop</button
	>
	<button
		on:click={async () => {
			const c = await master.getCandidates();
			candidate = `type:${c.candidateType} | ip:${c.ip} | port:${c.port} | protocol:${c.protocol}`
		}}>Show Candidates</button
	><br />
	iceConnectionState: <span bind:innerHTML={iceConnectionState} contenteditable="false" /><br />
	connectionState: <span bind:innerHTML={connectionState} contenteditable="false" /><br />
	candidates: <span bind:innerHTML={candidate} contenteditable="false" />
	<span>
		<hr />

		<div class="options">
			Report Logs<input
				type="checkbox"
				bind:checked={reportLogs}
				on:change={() => {
					master.toggleLogging(reportLogs);
				}}
			/><br />
		</div>
		<div class="options">
			Print Logs to Console
			<input
				type="checkbox"
				bind:checked={printConsole}
				on:change={() => {
					master.togglePrintConsole(printConsole);
				}}
			/>
		</div>
		<div class="options">
			Use TURN Only
			<input
				type="checkbox"
				bind:checked={turnOnly}
				on:change={() => {
					master.toggleTURNOnly(turnOnly);
				}}
			/>
		</div>
	</span>
</div>

<style>
</style>
