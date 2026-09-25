<!-- FAQ accordion + FAQPage structured data. -->
<script lang="ts">
	import type { Faq, PortableTextBlock } from '$lib/types';
	import Accordion from '$lib/components/ui/Accordion.svelte';
	import PortableText from '$lib/components/ui/PortableText.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';

	let {
		faqs,
		dark = false,
		schema = true,
		group = 'faq'
	}: { faqs: Faq[]; dark?: boolean; schema?: boolean; group?: string } = $props();

	const text = (blocks?: PortableTextBlock[]) =>
		(blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text).join('')).join('\n\n');
</script>

<Accordion items={faqs.map((f) => ({ id: f._id, title: f.question }))} {dark} {group}>
	{#snippet content(i)}
		<PortableText value={faqs[i].answer} class="max-w-2xl" />
	{/snippet}
</Accordion>

{#if schema && faqs.length}
	<JsonLd
		data={{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: faqs.map((f) => ({
				'@type': 'Question',
				name: f.question,
				acceptedAnswer: { '@type': 'Answer', text: text(f.answer) }
			}))
		}}
	/>
{/if}
