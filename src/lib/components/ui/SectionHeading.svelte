<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '$lib/motion/actions';
	import { cx } from '$lib/utils';
	import SplitText from './SplitText.svelte';

	type Props = {
		eyebrow?: string | null;
		heading?: string | null;
		intro?: string | null;
		number?: string;
		as?: 'h1' | 'h2' | 'h3';
		size?: 'xl' | 'lg' | 'md';
		align?: 'left' | 'center';
		id?: string;
		class?: string;
		actions?: Snippet;
	};
	let {
		eyebrow,
		heading,
		intro,
		number,
		as = 'h2',
		size = 'lg',
		align = 'left',
		id,
		class: className = '',
		actions
	}: Props = $props();

	const sizes = { xl: 'text-display-xl', lg: 'text-display-lg', md: 'text-display-md' };
</script>

<header
	class={cx('flex flex-col gap-6', align === 'center' && 'items-center text-center', className)}
>
	{#if eyebrow || number}
		<p class="sheet-label" use:reveal>
			{#if number}<span class="text-copper-600 [.on-dark_&]:text-copper-400">{number}</span>{/if}
			{#if eyebrow}<span>{eyebrow}</span>{/if}
		</p>
	{/if}
	{#if heading}
		<SplitText text={heading} {as} {id} class={cx('max-w-[18ch] font-normal', sizes[size])} />
	{/if}
	{#if intro}
		<p
			class={cx(
				'max-w-[58ch] text-lede text-ink-600 [.on-dark_&]:text-limestone-300',
				align === 'center' && 'mx-auto'
			)}
			use:reveal={{ delay: 120 }}
		>
			{intro}
		</p>
	{/if}
	{#if actions}
		<div class="flex flex-wrap gap-3" use:reveal={{ delay: 200 }}>{@render actions()}</div>
	{/if}
</header>
