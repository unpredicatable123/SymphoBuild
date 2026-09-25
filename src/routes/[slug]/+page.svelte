<script lang="ts">
	import PageView from '$lib/components/sections/PageView.svelte';

	let { data } = $props();
</script>

{#key data.page._id}
	<PageView page={data.page} />
{/key}
