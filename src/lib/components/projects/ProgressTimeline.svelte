<script lang="ts">
	import type { ProjectUpdate } from '$lib/types';
	import { formatDate } from '$lib/utils';
	import { reveal } from '$lib/motion/actions';
	import Img from '$lib/components/ui/Img.svelte';

	let { updates }: { updates: ProjectUpdate[] } = $props();
	const latest = $derived(updates[0]?.progress ?? 0);
</script>

<div class="grid gap-12 lg:grid-cols-12">
	<div class="lg:col-span-4">
		<div class="lg:sticky lg:top-40">
			<p class="font-mono text-label text-ink-500 uppercase">Overall progress</p>
			<p class="mt-2 font-display text-[clamp(4rem,3rem+4vw,7rem)] leading-none font-light">
				{latest}<span class="text-copper-600">%</span>
			</p>
			<div
				class="mt-6 h-1 overflow-hidden rounded-pill bg-ink-900/10"
				role="progressbar"
				aria-valuenow={latest}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Construction progress"
			>
				<div
					class="progress-bar h-full origin-left rounded-pill bg-copper-500"
					style:width="{latest}%"
					use:reveal
				></div>
			</div>
			<p class="mt-3 text-sm text-ink-500">As of {formatDate(updates[0]?.date)}</p>
		</div>
	</div>
	<ol class="relative border-l border-ink-900/15 pl-8 lg:col-span-8">
		{#each updates as u, i (u._id)}
			<li class="relative pb-12 last:pb-0" use:reveal={{ delay: i * 80 }}>
				<span
					class="absolute top-1.5 -left-[2.4rem] size-3 rounded-full border-2 border-limestone-100 {i ===
					0
						? 'bg-copper-500'
						: 'bg-ink-400'}"
					aria-hidden="true"
				></span>
				<p class="flex flex-wrap gap-x-4 font-mono text-label text-ink-500 uppercase">
					<time datetime={u.date}>{formatDate(u.date)}</time>
					{#if u.progress !== undefined}<span class="text-copper-600">{u.progress}% complete</span
						>{/if}
				</p>
				<h3 class="mt-2 font-display text-2xl">{u.title}</h3>
				{#if u.summary}<p class="mt-2 max-w-prose text-ink-600">{u.summary}</p>{/if}
				{#if u.images?.length}
					<div class="mt-4 grid max-w-xl grid-cols-2 gap-3">
						{#each u.images as image, j (image._key ?? j)}
							<Img {image} aspect={3 / 2} sizes="280px" class="aspect-[3/2] rounded-sm" />
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(.js) .progress-bar:not([data-revealed]) {
			transform: scaleX(0);
		}
		.progress-bar {
			transition: transform 1.6s var(--ease-out-expo) 0.2s !important;
		}
	}
</style>
