<script lang="ts">
	import type { Page } from '$lib/types';
	import Seo from '$lib/components/seo/Seo.svelte';
	import PageHero from './PageHero.svelte';
	import PageSections from './PageSections.svelte';

	let { page, sheet }: { page: Page; sheet?: string } = $props();
</script>

<Seo seo={page.seo} title={page.title} />
<PageHero
	eyebrow={page.hero?.eyebrow}
	heading={page.hero?.heading ?? page.title}
	intro={page.hero?.intro}
	image={page.hero?.image}
	crumbs={[{ label: page.title }]}
	{sheet}
/>
<PageSections sections={page.sections} guides={page.guides} />
