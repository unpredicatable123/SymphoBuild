<!--
	Accessible accordion built on native <details>/<summary>: keyboard and screen-reader
	support for free, works without JavaScript, and animates open/close with CSS
	(`::details-content` + `interpolate-size`) where supported.
-->
<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import type { Snippet } from 'svelte';
	import { cx } from '$lib/utils';

	type Item = { id: string; title: string };
	type Props = {
		items: Item[];
		content: Snippet<[number]>;
		group?: string;
		dark?: boolean;
		openFirst?: boolean;
		class?: string;
	};
	let {
		items,
		content,
		group,
		dark = false,
		openFirst = false,
		class: className = ''
	}: Props = $props();
</script>

<div
	class={cx(
		'accordion border-t',
		dark ? 'border-limestone-100/15' : 'border-ink-900/12',
		className
	)}
>
	{#each items as item, i (item.id)}
		<details
			name={group}
			open={openFirst && i === 0}
			class={cx('group border-b', dark ? 'border-limestone-100/15' : 'border-ink-900/12')}
		>
			<summary
				class="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden"
				data-cursor="link"
			>
				<span class="font-display text-display-sm leading-snug font-normal">{item.title}</span>
				<span
					class={cx(
						'mt-1 grid size-9 shrink-0 place-items-center rounded-full border transition-[transform,background-color,color] duration-500 ease-out-expo group-open:rotate-45',
						dark
							? 'border-limestone-100/30 group-open:bg-limestone-50 group-open:text-ink-900'
							: 'border-ink-900/20 group-open:bg-ink-900 group-open:text-limestone-50'
					)}
					aria-hidden="true"
				>
					<Plus size={16} />
				</span>
			</summary>
			<div class="pr-4 pb-8 sm:pr-16">
				{@render content(i)}
			</div>
		</details>
	{/each}
</div>

<style>
	.accordion {
		interpolate-size: allow-keywords;
	}
	@media (prefers-reduced-motion: no-preference) {
		.accordion details::details-content {
			block-size: 0;
			overflow: clip;
			opacity: 0;
			transition:
				block-size 0.6s var(--ease-out-expo),
				opacity 0.4s ease,
				content-visibility 0.6s allow-discrete;
		}
		.accordion details[open]::details-content {
			block-size: auto;
			opacity: 1;
		}
	}
</style>
