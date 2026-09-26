<!--
	Project "plate": the whole card is one link (stretched-link pattern). On hover the
	image eases in, the plate tilts a few degrees towards the pointer, and a data strip
	(bedrooms · area · price) slides up. On touch devices the data is always visible.
-->
<script lang="ts">
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import type { ProjectCard } from '$lib/types';
	import { TYPE_LABELS, formatArea, formatBedrooms } from '$lib/utils';
	import { tilt } from '$lib/motion/actions';
	import Img from '$lib/components/ui/Img.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';

	let {
		project,
		index,
		headingLevel = 'h3',
		sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
	}: {
		project: ProjectCard;
		index?: number;
		headingLevel?: 'h2' | 'h3';
		sizes?: string;
	} = $props();

	const facts = $derived(
		[formatBedrooms(project.bedrooms), formatArea(project.areaRange), project.priceDisplay].filter(
			Boolean
		) as string[]
	);
</script>

<article class="group relative flex flex-col" use:tilt={{ max: 3 }}>
	<div class="relative overflow-hidden rounded-md bg-ink-800">
		<Img
			image={project.coverImage}
			aspect={4 / 5}
			{sizes}
			class="aspect-[4/5]"
			imgClass="transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.06]"
		/>
		<div class="absolute inset-x-0 top-0 flex items-start justify-between p-4">
			<StatusBadge status={project.status} />
			{#if index !== undefined}
				<span
					class="rounded-pill bg-ink-900/60 px-2.5 py-1 font-mono text-label text-limestone-100 backdrop-blur-sm"
				>
					{String(index + 1).padStart(2, '0')}
				</span>
			{/if}
		</div>
		{#if facts.length}
			<dl
				class="on-dark absolute inset-x-3 bottom-3 grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-limestone-100/15 text-limestone-50 backdrop-blur-md transition-[transform,opacity] duration-700 ease-out-expo [@media(hover:hover)]:translate-y-[120%] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
			>
				{#each facts as fact, i (i)}
					<div class="bg-ink-900/70 px-3 py-2.5">
						<dt class="sr-only">{['Configuration', 'Area', 'Price'][i]}</dt>
						<dd class="text-xs leading-tight font-semibold">{fact}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</div>
	<div class="flex items-start justify-between gap-4 pt-5">
		<div>
			<p class="font-mono text-label text-ink-500 uppercase">{TYPE_LABELS[project.propertyType]}</p>
			<svelte:element this={headingLevel} class="mt-2 font-display text-display-sm">
				<a href="/projects/{project.slug}" class="after:absolute after:inset-0 after:content-['']"
					>{project.title}</a
				>
			</svelte:element>
			{#if project.location}
				<p class="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-600">
					<MapPin size={14} aria-hidden="true" />
					{[project.location.locality, project.location.city].filter(Boolean).join(', ')}
				</p>
			{/if}
		</div>
		<span
			class="mt-6 grid size-11 shrink-0 place-items-center rounded-full border border-ink-900/20 transition-all duration-500 ease-out-expo group-hover:rotate-45 group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-limestone-50"
			aria-hidden="true"
		>
			<ArrowUpRight size={18} />
		</span>
	</div>
</article>
