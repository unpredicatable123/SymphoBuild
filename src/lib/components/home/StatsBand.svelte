<!-- Trust metrics, each measured with an architectural dimension line that draws in. -->
<script lang="ts">
	import type { Stat } from '$lib/types';
	import { countUp, reveal } from '$lib/motion/actions';
	import { formatNumber } from '$lib/utils';

	let { heading, stats }: { heading?: string; stats: Stat[] } = $props();
</script>

<section class="container-page py-section" aria-labelledby={heading ? 'stats-heading' : undefined}>
	{#if heading}
		<h2 id="stats-heading" class="max-w-[22ch] text-display-md font-light" use:reveal>{heading}</h2>
	{/if}
	<dl class="mt-16 grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4">
		{#each stats as stat, i (stat._key)}
			<div class="flex flex-col-reverse gap-4" use:reveal={{ delay: i * 90 }}>
				<dt class="text-sm leading-snug text-ink-600">{stat.label}</dt>
				<dd
					class="font-display text-[clamp(3rem,2rem+4vw,5.75rem)] leading-none font-light tracking-[-0.04em]"
				>
					{stat.prefix ?? ''}<span use:countUp={{ value: stat.value, decimals: stat.decimals ?? 0 }}
						>{formatNumber(stat.value, stat.decimals ?? 0)}</span
					><span class="text-copper-600">{stat.suffix ?? ''}</span>
				</dd>
				<svg
					class="h-3 w-full text-ink-900/35"
					preserveAspectRatio="none"
					viewBox="0 0 100 12"
					aria-hidden="true"
					use:reveal={{ mode: 'draw' }}
				>
					<path
						d="M0.5 0V12M99.5 0V12M0 6H100"
						stroke="currentColor"
						vector-effect="non-scaling-stroke"
						pathLength="1"
						class="draw-path"
						fill="none"
					/>
				</svg>
			</div>
		{/each}
	</dl>
</section>
