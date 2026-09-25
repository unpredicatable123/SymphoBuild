<!--
	Responsive Sanity image with hotspot-aware cropping, intrinsic dimensions (no CLS),
	LQIP blur-up and lazy loading. Use `priority` for the LCP image.
-->
<script lang="ts">
	import { hotspotPosition, imageProps } from '$lib/sanity/image';
	import type { SanityImage } from '$lib/types';
	import { cx } from '$lib/utils';

	type Props = {
		image: SanityImage | null | undefined;
		sizes?: string;
		aspect?: number;
		priority?: boolean;
		class?: string;
		imgClass?: string;
		alt?: string;
		maxWidth?: number;
	};
	let {
		image,
		sizes = '100vw',
		aspect,
		priority = false,
		class: className = '',
		imgClass = '',
		alt,
		maxWidth
	}: Props = $props();

	const resolved = $derived(imageProps(image, { aspect, maxWidth }));
	let loaded = $state(false);
</script>

<div
	class={cx('relative overflow-hidden bg-limestone-300/60', className)}
	style:background-image={image?.lqip && !loaded ? `url(${image.lqip})` : undefined}
	style:background-size="cover"
>
	{#if resolved}
		<img
			src={resolved.src}
			srcset={resolved.srcset}
			{sizes}
			width={resolved.width}
			height={resolved.height}
			alt={alt ?? resolved.alt}
			loading={priority ? 'eager' : 'lazy'}
			fetchpriority={priority ? 'high' : 'auto'}
			decoding={priority ? 'sync' : 'async'}
			onload={() => (loaded = true)}
			style:object-position={hotspotPosition(image)}
			class={cx('h-full w-full object-cover', imgClass)}
		/>
	{:else}
		<div class="blueprint-grid absolute inset-0 bg-ink-800" aria-hidden="true">
			<span
				class="absolute inset-x-0 bottom-3 text-center font-mono text-label text-limestone-300 uppercase"
			>
				Image to be added
			</span>
		</div>
	{/if}
</div>
