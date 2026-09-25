<!--
	Click-to-load facade for third-party embeds (video, virtual tours, maps). Nothing
	from the third party loads until the visitor asks for it — good for performance
	and privacy. Without JavaScript the fallback link still works.
-->
<script lang="ts">
	import Play from '@lucide/svelte/icons/play';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Scan from '@lucide/svelte/icons/scan-eye';
	import type { SanityImage } from '$lib/types';
	import Img from './Img.svelte';

	type Props = {
		src: string;
		title: string;
		href?: string;
		kind?: 'video' | 'tour' | 'map';
		poster?: SanityImage | null;
		aspect?: string;
		label?: string;
	};
	let { src, title, href, kind = 'video', poster, aspect = '16 / 9', label }: Props = $props();
	let active = $state(false);
	const Icon = $derived(kind === 'map' ? MapPin : kind === 'tour' ? Scan : Play);
	const cta = $derived(
		label ??
			(kind === 'map'
				? 'Load interactive map'
				: kind === 'tour'
					? 'Start virtual tour'
					: 'Play video')
	);
</script>

<div class="relative overflow-hidden rounded-md bg-ink-900" style:aspect-ratio={aspect}>
	{#if active}
		<iframe
			{src}
			{title}
			class="absolute inset-0 h-full w-full"
			loading="lazy"
			allow="autoplay; fullscreen; picture-in-picture; xr-spatial-tracking"
			allowfullscreen
			referrerpolicy="strict-origin-when-cross-origin"
		></iframe>
	{:else}
		{#if poster}
			<Img
				image={poster}
				class="absolute inset-0 h-full w-full opacity-60"
				sizes="(min-width: 1024px) 60vw, 100vw"
			/>
		{:else}
			<div class="blueprint-grid absolute inset-0" aria-hidden="true"></div>
		{/if}
		<div
			class="on-dark absolute inset-0 grid place-items-center bg-linear-to-t from-ink-950/70 to-transparent p-6"
		>
			<div class="flex flex-col items-center gap-4 text-center">
				<button
					type="button"
					onclick={() => (active = true)}
					class="group grid size-20 place-items-center rounded-full bg-limestone-50 text-ink-900 shadow-lift transition-transform duration-500 ease-out-expo hover:scale-105"
					aria-label="{cta}: {title}"
					data-cursor="media"
					data-cursor-label={kind === 'map' ? 'Map' : 'Play'}
				>
					<Icon size={26} aria-hidden="true" />
				</button>
				<p class="font-mono text-label text-limestone-100 uppercase">{cta}</p>
				{#if href}
					<a
						{href}
						target="_blank"
						rel="noopener noreferrer"
						class="link-dim text-sm text-limestone-300"
					>
						Open in a new tab<span class="sr-only"> ({title})</span>
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
