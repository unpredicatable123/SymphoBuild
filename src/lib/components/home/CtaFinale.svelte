<!--
	Closing call-to-action. The blueprint drawing from the hero returns, fully drawn —
	a visual bookend to the construction story.
-->
<script lang="ts">
	import type { Cta } from '$lib/types';
	import { reveal } from '$lib/motion/actions';
	import CtaButton from '$lib/components/ui/CtaButton.svelte';
	import SplitText from '$lib/components/ui/SplitText.svelte';
	import BlueprintDrawing from './BlueprintDrawing.svelte';

	type Props = {
		cta?: {
			eyebrow?: string;
			heading?: string;
			text?: string;
			primaryCta?: Cta;
			secondaryCta?: Cta;
		};
		context?: { label?: string; project?: string; service?: string; interest?: string };
	};
	let { cta, context = {} }: Props = $props();
</script>

{#if cta?.heading}
	<section class="container-page pb-section" aria-labelledby="cta-heading">
		<div
			class="on-dark relative isolate overflow-hidden rounded-xl bg-ink-900 px-6 py-20 text-limestone-50 sm:px-12 lg:px-20 lg:py-28"
		>
			<div class="blueprint-grid absolute inset-0 -z-10" aria-hidden="true"></div>
			<div
				class="absolute -right-24 -bottom-16 -z-10 w-[40rem] max-w-[120%] text-copper-400/50 lg:right-0"
				aria-hidden="true"
			>
				<BlueprintDrawing floors={12} />
			</div>
			<div class="max-w-3xl">
				{#if cta.eyebrow}<p class="sheet-label" use:reveal>{cta.eyebrow}</p>{/if}
				<SplitText id="cta-heading" text={cta.heading} class="mt-6 text-display-xl font-light" />
				{#if cta.text}<p
						class="mt-8 max-w-xl text-lede text-limestone-300"
						use:reveal={{ delay: 150 }}
					>
						{cta.text}
					</p>{/if}
				<div class="mt-10 flex flex-wrap gap-3" use:reveal={{ delay: 250 }}>
					<CtaButton cta={cta.primaryCta} size="lg" variant="primary" {context} />
					<CtaButton cta={cta.secondaryCta} size="lg" variant="outline-light" {context} />
				</div>
			</div>
		</div>
	</section>
{/if}
