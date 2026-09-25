<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, text, children }: { title: string; text?: string; children?: Snippet } = $props();
</script>

<div
	class="sheet-frame flex flex-col items-center gap-5 px-6 py-20 text-center text-ink-500"
	role="status"
>
	<svg
		width="120"
		height="80"
		viewBox="0 0 120 80"
		fill="none"
		aria-hidden="true"
		class="text-copper-500"
	>
		<rect x="10" y="10" width="100" height="60" stroke="currentColor" stroke-dasharray="4 4" />
		<path d="M10 70 L60 30 L110 70" stroke="currentColor" stroke-opacity=".5" />
		<circle cx="60" cy="30" r="3" fill="currentColor" />
	</svg>
	<h2 class="font-display text-display-sm text-ink-900">{title}</h2>
	{#if text}<p class="max-w-md">{text}</p>{/if}
	{#if children}{@render children()}{/if}
</div>
