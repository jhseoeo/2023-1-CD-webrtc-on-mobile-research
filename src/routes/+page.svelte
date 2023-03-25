<script>
	let input = '';
</script>

<div id="controllerPlane">
	<input bind:value={input} placeholder="channel name" />
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={() => {
			createSignalingChannel(input);
		}}
	>
		Create Channel
	</button>
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={() => {
			deleteSignalingChannel(input);
		}}
	>
		Delete Channel
	</button>
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={() => {
			window.location.href = '/master/' + input;
		}}
	>
		Connect Master
	</button>
	<br />
	<button
		class="channel-button"
		type="button"
		on:click={async () => {
			window.location.href = '/viewer/' + input;
		}}
	>
		Connect Viewer
	</button>
</div>

<style>
</style>
