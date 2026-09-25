<!--
	No-JavaScript fallback: shown only when an enquiry posted without JS has validation
	errors. It re-renders the same form with the visitor's values and an error summary.
-->
<script lang="ts">
	import Seo from '$lib/components/seo/Seo.svelte';
	import PageHero from '$lib/components/sections/PageHero.svelte';
	import BrochureForm from '$lib/components/forms/BrochureForm.svelte';
	import ConsultationForm from '$lib/components/forms/ConsultationForm.svelte';
	import LandownerForm from '$lib/components/forms/LandownerForm.svelte';
	import ProjectEnquiryForm from '$lib/components/forms/ProjectEnquiryForm.svelte';
	import type { ProjectOption } from '$lib/types';

	import { page } from '$app/state';

	let { data, form } = $props();
	const initial = $derived(form ?? null);
	// Direct links (e.g. the brochure button without JS) pass ?type=&project=
	const type = $derived(form?.type ?? page.url.searchParams.get('type') ?? 'consultation');
	const projectSlug = $derived(
		form?.values?.project ?? page.url.searchParams.get('project') ?? undefined
	);
	const isRetry = $derived(!!form);
	const project = $derived(
		(data.projectOptions as ProjectOption[]).find((p) => p.slug === projectSlug) ?? null
	);
</script>

<Seo title="Enquiry" noIndex />
<PageHero
	eyebrow="Enquiry"
	heading={isRetry
		? 'Almost there — a few details need attention.'
		: type === 'brochure' && project
			? `Get the ${project.title} brochure`
			: 'Tell us what you have in mind.'}
	intro={isRetry
		? 'Please review the highlighted fields below and send your enquiry again.'
		: 'Share a few details and our team will be in touch within one working day.'}
	crumbs={[{ label: 'Enquiry' }]}
/>
<section class="container-page pb-section">
	<div class="mx-auto max-w-3xl rounded-lg bg-limestone-50 p-6 shadow-plate sm:p-10">
		{#if type === 'landowner'}
			<LandownerForm {initial} />
		{:else if type === 'project'}
			<ProjectEnquiryForm
				project={project ? { title: project.title, slug: project.slug } : null}
				{initial}
			/>
		{:else if type === 'brochure' && project}
			<BrochureForm project={{ title: project.title, slug: project.slug }} {initial} />
		{:else}
			<ConsultationForm {initial} />
		{/if}
	</div>
</section>
