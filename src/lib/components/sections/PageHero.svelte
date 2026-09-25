<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SanityImage } from '$lib/types';
	import { reveal } from '$lib/motion/actions';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SplitText from '$lib/components/ui/SplitText.svelte';

	type Props = {
		eyebrow?: string;
		heading?: string;
		intro?: string;
		image?: SanityImage | null;
		crumbs?: { label: string; href?: string }[];
		sheet?: string;
		children?: Snippet;
	};
	let { eyebrow, heading, intro, image, crumbs = [], sheet, children }: Props = $props();
</script>

<section class="relative overflow-hidden pt-[calc(var(--spacing-header)+3rem)] pb-section-sm">
	<div class="container-page">
		<div class="flex flex-wrap items-center justify-between gap-4">
			{#if crumbs.length}<Breadcrumbs items={crumbs} />{/if}
			{#if sheet}<p class="hidden font-mono text-label text-ink-500 uppercase sm:block">
					{sheet}
				</p>{/if}
		</div>
		<div class="mt-14 grid gap-10 lg:grid-cols-12 lg:items-end">
			<div class="lg:col-span-8">
				{#if eyebrow}<p class="sheet-label" use:reveal>{eyebrow}</p>{/if}
				{#if heading}
					<SplitText as="h1" text={heading} class="mt-6 max-w-[20ch] text-display-xl font-light" />
				{/if}
			</div>
			{#if intro}
				<p class="text-lede text-ink-600 lg:col-span-4 lg:pb-3" use:reveal={{ delay: 200 }}>
					{intro}
				</p>
			{/if}
		</div>
		{#if children}<div class="mt-10">{@render children()}</div>{/if}
	</div>
	{#if image}
		<div class="container-page mt-14">
			<div class="overflow-hidden rounded-lg" use:reveal={{ mode: 'mask' }}>
				<Img
					{image}
					priority
					aspect={21 / 9}
					sizes="(min-width: 1536px) 1500px, 100vw"
					class="aspect-[4/3] sm:aspect-[21/9]"
				/>
			</div>
		</div>
	{/if}
</section>
