<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import { page } from '$app/state';

	type Crumb = { label: string; href?: string };
	let { items, dark = false }: { items: Crumb[]; dark?: boolean } = $props();

	const all = $derived([{ label: 'Home', href: '/' }, ...items]);
	const origin = $derived((page.data.siteUrl as string) ?? '');
	const schema = $derived({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: all.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.label,
			...(c.href ? { item: origin + c.href } : {})
		}))
	});
</script>

<nav aria-label="Breadcrumb" class={dark ? 'text-limestone-300' : 'text-ink-500'}>
	<ol class="flex flex-wrap items-center gap-2 font-mono text-label uppercase">
		{#each all as crumb, i (i)}
			<li class="flex items-center gap-2">
				{#if crumb.href && i < all.length - 1}
					<a href={crumb.href} class="link-dim hover:text-current">{crumb.label}</a>
					<ChevronRight size={12} aria-hidden="true" />
				{:else}
					<span aria-current="page" class={dark ? 'text-limestone-100' : 'text-ink-900'}
						>{crumb.label}</span
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
<JsonLd data={schema} />
