<script lang="ts">
	import Expand from '@lucide/svelte/icons/expand';
	import type { SanityImage } from '$lib/types';
	import { cx } from '$lib/utils';
	import { reveal } from '$lib/motion/actions';
	import Img from '$lib/components/ui/Img.svelte';
	import Lightbox from '$lib/components/ui/Lightbox.svelte';

	let { images, title }: { images: SanityImage[]; title: string } = $props();
	let index = $state(-1);
	const items = $derived(images.map((image) => ({ image, title, caption: image.caption })));
</script>

<ul class="grid auto-rows-[14rem] grid-cols-2 gap-3 sm:auto-rows-[18rem] lg:grid-cols-4">
	{#each images as image, i (image._key ?? i)}
		<li
			class={cx(
				'group relative overflow-hidden rounded-md',
				i === 0 && 'col-span-2 row-span-2',
				i === 3 && 'lg:col-span-2'
			)}
			use:reveal={{ mode: 'mask', delay: i * 70 }}
		>
			<button
				type="button"
				class="block h-full w-full"
				onclick={() => (index = i)}
				aria-label="Open image {i + 1} of {images.length}: {image.alt}"
			>
				<Img
					{image}
					sizes={i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
					class="h-full w-full"
					imgClass="transition-transform duration-[1200ms] ease-out-expo group-hover:scale-105"
				/>
				<span
					class="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-ink-900/70 text-limestone-50 opacity-0 backdrop-blur transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
					aria-hidden="true"
				>
					<Expand size={16} />
				</span>
				{#if image.caption}
					<span
						class="absolute bottom-3 left-3 rounded-pill bg-limestone-50/90 px-3 py-1 font-mono text-[0.65rem] tracking-wider uppercase backdrop-blur"
						>{image.caption}</span
					>
				{/if}
			</button>
		</li>
	{/each}
</ul>

<Lightbox {items} bind:index />
