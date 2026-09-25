<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { reveal } from '$lib/motion/actions';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import PageHero from '$lib/components/sections/PageHero.svelte';
	import FaqList from '$lib/components/sections/FaqList.svelte';
	import ConsultationForm from '$lib/components/forms/ConsultationForm.svelte';
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import PortableText from '$lib/components/ui/PortableText.svelte';
	import SectionHeading from '$lib/components/ui/SectionHeading.svelte';

	let { data } = $props();
	const s = $derived(data.service);
	const COLS: Record<number, string> = {
		3: 'lg:grid-cols-3',
		4: 'lg:grid-cols-4',
		5: 'lg:grid-cols-5'
	};
</script>

<Seo seo={s.seo} title={s.title} description={s.summary} />
<JsonLd
	data={{
		'@context': 'https://schema.org',
		'@type': 'Service',
		name: s.title,
		description: s.summary,
		provider: { '@id': `${data.siteUrl}/#organization` },
		areaServed: data.settings.serviceAreas?.map((name: string) => ({ '@type': 'City', name })),
		url: `${data.siteUrl}/services/${s.slug}`
	}}
/>

{#key s._id}
	<PageHero
		eyebrow="Service"
		heading={s.title}
		intro={s.summary}
		image={s.heroImage}
		crumbs={[{ label: 'Services', href: '/services' }, { label: s.title }]}
	/>

	<section class="container-page py-section-sm">
		<div class="grid gap-12 lg:grid-cols-12">
			<div class="lg:col-span-7"><PortableText value={s.body} /></div>
			{#if s.deliverables?.length}
				<aside class="lg:col-span-4 lg:col-start-9" aria-labelledby="deliverables-heading">
					<div class="sheet-frame p-7 lg:sticky lg:top-32">
						<h2 id="deliverables-heading" class="font-mono text-label text-copper-600 uppercase">
							What you receive
						</h2>
						<ul class="mt-5 flex flex-col gap-3">
							{#each s.deliverables as d, i (d)}
								<li class="flex items-start gap-3" use:reveal={{ delay: i * 60 }}>
									<span
										class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sage-600 text-limestone-50"
										><Check size={12} strokeWidth={3} aria-hidden="true" /></span
									>
									{d}
								</li>
							{/each}
						</ul>
					</div>
				</aside>
			{/if}
		</div>
	</section>

	{#if s.process?.length}
		<section
			class="on-dark bg-ink-900 py-section-sm text-limestone-50"
			aria-labelledby="process-heading"
		>
			<div class="container-page">
				<SectionHeading id="process-heading" eyebrow="Process" heading="How it works" size="md" />
				<ol
					class="mt-12 grid gap-px overflow-hidden rounded-md bg-limestone-100/12 md:grid-cols-2 {COLS[
						Math.min(s.process.length, 5)
					] ?? 'lg:grid-cols-4'}"
				>
					{#each s.process as step, i (step._key)}
						<li class="relative flex flex-col gap-5 bg-ink-900 p-7" use:reveal={{ delay: i * 80 }}>
							<span class="font-display text-display-md font-light text-copper-400"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<h3 class="font-display text-xl">{step.title}</h3>
							{#if step.description}<p class="text-sm leading-relaxed text-limestone-300">
									{step.description}
								</p>{/if}
							{#if step.duration}<p
									class="mt-auto font-mono text-label text-limestone-400 uppercase"
								>
									{step.duration}
								</p>{/if}
						</li>
					{/each}
				</ol>
			</div>
		</section>
	{/if}

	{#if s.relatedProjects?.length}
		<section class="container-page py-section-sm" aria-labelledby="examples-heading">
			<SectionHeading
				id="examples-heading"
				eyebrow="Project examples"
				heading="Where we've delivered this"
				size="md"
			/>
			<div class="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
				{#each s.relatedProjects as p, i (p._id)}<ProjectCard project={p} index={i} />{/each}
			</div>
		</section>
	{/if}

	{#if s.faqs?.length}
		<section
			class="container-page grid gap-10 py-section-sm lg:grid-cols-12"
			aria-labelledby="service-faq"
		>
			<div class="lg:col-span-4">
				<SectionHeading id="service-faq" eyebrow="FAQs" heading="Common questions" size="md" />
			</div>
			<div class="lg:col-span-8"><FaqList faqs={s.faqs} group="service-faq" /></div>
		</section>
	{/if}

	<section class="py-section-sm" aria-labelledby="service-enquiry">
		<div class="container-page grid gap-12 lg:grid-cols-12">
			<div class="lg:col-span-4">
				<SectionHeading
					id="service-enquiry"
					eyebrow="Enquire"
					heading="Talk to us about {s.title.toLowerCase()}"
					intro="Book a consultation — we'll come prepared with relevant examples and an honest view of cost and time."
					size="md"
				/>
				{#if s.others?.length}
					<nav aria-label="Other services" class="mt-10">
						<p class="font-mono text-label text-ink-500 uppercase">Other services</p>
						<ul class="mt-3 flex flex-col">
							{#each s.others as o (o.slug)}
								<li>
									<a
										href="/services/{o.slug}"
										class="group flex items-center justify-between border-b border-ink-900/10 py-3"
									>
										<span class="flex items-center gap-3"
											><Icon name={o.icon} size={18} class="text-copper-600" />{o.title}</span
										>
										<ArrowRight
											size={14}
											class="opacity-0 transition-opacity group-hover:opacity-100"
											aria-hidden="true"
										/>
									</a>
								</li>
							{/each}
						</ul>
					</nav>
				{/if}
			</div>
			<div class="rounded-lg bg-limestone-50 p-6 shadow-plate sm:p-10 lg:col-span-7 lg:col-start-6">
				<ConsultationForm context={{ service: s.slug, interest: s.enquiryInterest }} />
			</div>
		</div>
	</section>
{/key}
