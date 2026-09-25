<script lang="ts">
	let { data }: { data: Record<string, unknown> | Record<string, unknown>[] } = $props();
	// Escape "<" so CMS content can never close the script element.
	const json = $derived(JSON.stringify(data).replace(/</g, '\\u003c'));
	const tag = $derived('<script type="application/ld+json">' + json + '<' + '/script>');
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialised, escaped JSON only -->
	{@html tag}
</svelte:head>
