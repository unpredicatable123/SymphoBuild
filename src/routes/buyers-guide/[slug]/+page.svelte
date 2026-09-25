<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import ArticleLayout from '$lib/components/insights/ArticleLayout.svelte';
	import PageHero from '$lib/components/sections/PageHero.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { data } = $props();
	const g = $derived(data.guide);
</script>

<Seo
	seo={g.seo}
	title={g.title}
	description={g.excerpt}
	type="article"
	modifiedTime={g._updatedAt}
/>
<JsonLd
	data={{
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: g.title,
		description: g.excerpt,
		dateModified: g._updatedAt,
		publisher: { '@id': `${data.siteUrl}/#organization` },
		mainEntityOfPage: `${data.siteUrl}/buyers-guide/${g.slug}`
	}}
/>

{#key g._id}
	<PageHero
		eyebrow="Buyer's guide"
		heading={g.title}
		intro={g.excerpt}
		crumbs={[{ label: "Buyer's guide", href: '/buyers-guide' }, { label: g.title }]}
	/>

	<ArticleLayout body={g.body} title={g.title}>
		{#snippet aside()}
			{#if g.checklist?.length}
				<div class="rounded-md bg-ink-900 p-6 text-limestone-50">
					<p class="flex items-center gap-2 font-mono text-label text-copper-300 uppercase">
						<Icon name={g.icon} size={16} /> Checklist
					</p>
					<ul class="mt-4 flex flex-col gap-3 text-sm">
						{#each g.checklist as item (item)}
							<li class="flex gap-3">
								<Check size={16} class="mt-0.5 shrink-0 text-sage-300" aria-hidden="true" />{item}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/snippet}
		{#snippet after()}
			{#if g.others?.length}
				<nav aria-label="More guides" class="mt-16 border-t border-ink-900/12 pt-10">
					<p class="font-mono text-label text-ink-500 uppercase">More guides</p>
					<ul class="mt-4 grid gap-2 sm:grid-cols-2">
						{#each g.others as o (o._id)}
							<li>
								<a
									href="/buyers-guide/{o.slug}"
									class="group flex items-center justify-between gap-3 rounded-md border border-ink-900/12 p-4 transition-colors hover:border-ink-900"
								>
									<span class="flex items-center gap-3"
										><Icon name={o.icon} size={18} class="text-copper-600" />{o.title}</span
									>
									<ArrowRight
										size={16}
										class="transition-transform group-hover:translate-x-1"
										aria-hidden="true"
									/>
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}
		{/snippet}
	</ArticleLayout>
{/key}
