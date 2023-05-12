<script lang="ts">
	import { onMount } from 'svelte';
	import Viewer from '$lib/kinesis/viewer';
	import config from '$lib/config';
	import {RetryCondition} from '$lib/kinesis/constants';
	import KVSLogger from '$lib/logger/kvsLogger';

	let viewer : Viewer | undefined;
	let logger : KVSLogger | undefined;
	let localStream : MediaStream | undefined;
	let remoteView : HTMLVideoElement;
	let retryMethod = RetryCondition.NO_RETRY;

	let kvsConnectionState = 'disconnected';
	let iceConnectionState = 'not started';
	let connectionState = 'not started';
	let receivedBytes = '0';
	let candidate = '';

	let reportLogs = config.reportLogs;
	let saveLogs = config.saveLogs;
	let printConsole = config.printConsole;
	let turnOnly = config.turnOnly;

	onMount(async () => {
		const data = new URLSearchParams(window.location.search)
		const channelName = data.get('channel')
		const userName = data.get('username')
		if (!channelName || !userName) return alert("Wrong Channel name or Username");

		localStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1280 }, height: { ideal: 720 } },
			audio: false
		});

		logger = new KVSLogger(reportLogs, saveLogs, printConsole);
		await logger.init();

		viewer = new Viewer(channelName, userName, localStream, remoteView, retryMethod, logger);
		viewer.registerKvsConnectionStateHandler((state) => {
			kvsConnectionState = state;
		});
		viewer.registerIceConnectionStateHandler((state) => {
			iceConnectionState = state;
		});
		viewer.registerConnectionStateHandler((state) => {
			connectionState = state;
		});
		viewer.registerConnectionObserverDefaultHandler((bytes) => {
			receivedBytes = String(bytes);
		})
	});
</script>

<video class="viewer" autoPlay playsInline controls muted bind:this={remoteView} />
<div class="controller">
	<button
		on:click={() => {
			viewer?.init();
		}}>Initialize</button
	>

	<hr />

	KVS
	<button
		on:click={() => {
			viewer?.connectKVS();
		}}>Connect</button
	>
	<button
		on:click={() => {
			viewer?.disconnectKVS();
		}}>Disconnect</button
	>
	<span bind:innerHTML={kvsConnectionState} contenteditable="false" /><br />

	<hr />

	WebRTC
	<button
		on:click={() => {
			viewer?.startWebRTC();
		}}>Start</button
	>
	<button
		on:click={() => {
			viewer?.stopWebRTC();
		}}>Stop</button
	>
	
	<button on:click={() => {
		viewer?.retryWebRTC();
	}}>restart</button>
	<button
	on:click={async () => {
		const currentCandidatePair = await viewer?.getCandidates();
			if (currentCandidatePair) {
				const {localCandidate, remoteCandidate} = currentCandidatePair
				candidate = `
				local:${localCandidate.candidateType} | ip:${localCandidate.ip} | port:${localCandidate.port} | protocol:${localCandidate.protocol}
				<br>
				remote:${remoteCandidate.candidateType} | ip:${remoteCandidate.ip} | port:${remoteCandidate.port} | protocol:${remoteCandidate.protocol}`
			}
	}}>Show Candidates</button
	><br />
	iceConnectionState: <span bind:innerHTML={iceConnectionState} contenteditable="false" /><br />
	connectionState: <span bind:innerHTML={connectionState} contenteditable="false" /><br />
	receivedBytes: <span bind:innerHTML={receivedBytes} contenteditable="false" /><br />
	candidates <br> <span bind:innerHTML={candidate} contenteditable="false" /><br />

	<hr />

	<div class="options">
		Report Logs<input
			type="checkbox"
			bind:checked={reportLogs}
			on:change={() => {
				logger?.toggleReportLogs(reportLogs);
			}}
		/><br />
	</div>
	<div class="options">
		Save Logs<input
			type="checkbox"
			bind:checked={saveLogs}
			on:change={() => {
				logger?.toggleSaveLogs(saveLogs);
			}}
		/><br />
	</div>
	<div class="options">
		Print Logs to Console
		<input
			type="checkbox"
			bind:checked={printConsole}
			on:change={() => {
				logger?.togglePrintConsole(printConsole);
			}}
		/>
	</div>
	<div class="options">
		Use TURN Only
		<input
			type="checkbox"
			bind:checked={turnOnly}
			on:change={() => {
				viewer?.toggleTURNOnly(turnOnly);
			}}
		/>
	</div>
	<br>
	<fieldset>
		<legend>Retry Method</legend>
	
		<div>
		  <input type="radio" bind:group={retryMethod} name="retryMethod" value={RetryCondition.NO_RETRY} checked>
		  <label for="no_retry">no_retry</label>
		</div>
	
		<div>
		  <input type="radio" bind:group={retryMethod} name="retryMethod" value={RetryCondition.AFTER_FAILED}>
		  <label for="after_failed">after_failed</label>
		</div>
	
		<div>
		  <input type="radio" bind:group={retryMethod} name="retryMethod" value={RetryCondition.AFTER_DISCONNECTED}>
		  <label for="after_disconnected">after_disconnected</label>
		</div>

		<div>
			<input type="radio" bind:group={retryMethod} name="retryMethod" value={RetryCondition.RIGHT_AFTER_DISCONNECTED}>
			<label for="right_after_disconnected">right_after_disconnected</label>
		  </div>

		<div>
			<input type="radio" bind:group={retryMethod} name="retryMethod" value={RetryCondition.BEFORE_DISCONNECTED}>
			<label for="before_disconnected">before_disconnected</label>
		</div>
	</fieldset>
</div>

<style>
</style>
