<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import Seo from '$lib/components/seo/Seo.svelte';
	import PageHero from '$lib/components/sections/PageHero.svelte';
	import PageSections from '$lib/components/sections/PageSections.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();
</script>

<Seo seo={data.page.seo} title={data.page.title} noIndex />
<PageHero
	eyebrow={data.page.hero?.eyebrow}
	heading={data.page.hero?.heading}
	intro={data.page.hero?.intro}
>
	{#if data.brochureUrl}
		<Button href={data.brochureUrl} target="_blank" rel="noopener" download arrow={false} size="lg">
			{#snippet icon()}<Download size={18} aria-hidden="true" />{/snippet}
			Download your brochure
		</Button>
	{/if}
</PageHero>
<PageSections sections={data.page.sections} />
