<!--
	Word-by-word masked reveal for headings. Text stays in the DOM as normal words,
	so it reads naturally to screen readers and without JavaScript.
-->
<script lang="ts">
	import { reveal } from '$lib/motion/actions';

	type Props = {
		text: string;
		as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
		class?: string;
		delay?: number;
		id?: string;
	};
	let { text, as = 'h2', class: className = '', delay = 0, id }: Props = $props();
	const words = $derived(text.split(/\s+/).filter(Boolean));
	// The space lives outside the inline-block mask so lines can wrap between words.
	const SPACE = ' ';
</script>

<svelte:element this={as} {id} class={className} use:reveal={{ mode: 'split', delay }}>
	{#each words as word, i (i)}<span class="split-word"><span style:--i={i}>{word}</span></span
		>{#if i < words.length - 1}{SPACE}{/if}{/each}
</svelte:element>
