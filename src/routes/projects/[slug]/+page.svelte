<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { page } from '$app/state';
	import type { SiteSettings } from '$lib/types';
	import { imageUrl } from '$lib/sanity/image';
	import {
		STATUS_LABELS,
		TYPE_LABELS,
		cx,
		formatArea,
		formatBedrooms,
		toEmbedUrl,
		whatsappLink
	} from '$lib/utils';
	import { reveal } from '$lib/motion/actions';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmbedFacade from '$lib/components/ui/EmbedFacade.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import PortableText from '$lib/components/ui/PortableText.svelte';
	import SectionHeading from '$lib/components/ui/SectionHeading.svelte';
	import SplitText from '$lib/components/ui/SplitText.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Accordion from '$lib/components/ui/Accordion.svelte';
	import BrochureForm from '$lib/components/forms/BrochureForm.svelte';
	import ProjectEnquiryForm from '$lib/components/forms/ProjectEnquiryForm.svelte';
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte';
	import ProjectGallery from '$lib/components/projects/ProjectGallery.svelte';
	import ProgressTimeline from '$lib/components/projects/ProgressTimeline.svelte';
	import SubNav from '$lib/components/projects/SubNav.svelte';
	import UnitPlans from '$lib/components/projects/UnitPlans.svelte';
	import FaqList from '$lib/components/sections/FaqList.svelte';

	let { data } = $props();
	const p = $derived(data.project);
	const settings = $derived(page.data.settings as SiteSettings);
	let brochureOpen = $state(false);

	const place = $derived([p.location?.locality, p.location?.city].filter(Boolean).join(', '));
	const wa = $derived(whatsappLink(settings, `${p.title}${place ? ` (${place})` : ''}`));
	const video = $derived(toEmbedUrl(p.videoUrl));
	const tour = $derived(toEmbedUrl(p.virtualTourUrl));
	const facts = $derived(
		[
			...(p.keyFacts ?? []).map((f) => ({ label: f.label, value: f.value })),
			...(formatBedrooms(p.bedrooms)
				? [{ label: 'Configuration', value: formatBedrooms(p.bedrooms)! }]
				: []),
			...(formatArea(p.areaRange) ? [{ label: 'Area', value: formatArea(p.areaRange)! }] : [])
		].slice(0, 6)
	);
	const mapSrc = $derived(
		p.location?.lat && p.location?.lng
			? `https://www.openstreetmap.org/export/embed.html?bbox=${p.location.lng - 0.012},${p.location.lat - 0.008},${p.location.lng + 0.012},${p.location.lat + 0.008}&layer=mapnik&marker=${p.location.lat},${p.location.lng}`
			: null
	);

	const nav = $derived(
		[
			{ id: 'overview', label: 'Overview', show: true },
			{ id: 'gallery', label: 'Gallery', show: !!p.gallery?.length || !!video || !!tour },
			{ id: 'amenities', label: 'Amenities', show: !!p.amenities?.length },
			{
				id: 'plans',
				label: p.propertyType === 'plotted' ? 'Plots' : 'Plans & units',
				show: !!p.units?.length
			},
			{ id: 'specifications', label: 'Specifications', show: !!p.specifications?.length },
			{ id: 'approvals', label: 'Approvals', show: !!p.approvals?.length || !!p.rera?.number },
			{ id: 'location', label: 'Location', show: !!mapSrc || !!p.connectivity?.length },
			{ id: 'progress', label: 'Progress', show: !!p.updates?.length },
			{ id: 'faqs', label: 'FAQs', show: !!p.faqs?.length },
			{ id: 'enquire', label: 'Enquire', show: true }
		].filter((n) => n.show)
	);

	let preselectUnit = $state<string | undefined>();
	function enquireUnit(unit: string) {
		preselectUnit = unit;
		document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
		setTimeout(() => {
			const select = document.querySelector<HTMLSelectElement>(
				'#enquire select[name="unitInterest"]'
			);
			if (select) {
				select.value = unit;
				select.focus({ preventScroll: true });
			}
		}, 600);
	}

	const schemaType: Record<string, string> = {
		apartment: 'ApartmentComplex',
		gatedCommunity: 'GatedResidenceCommunity',
		villa: 'SingleFamilyResidence',
		commercial: 'Place',
		plotted: 'Landform'
	};
	const schema = $derived({
		'@context': 'https://schema.org',
		'@type': 'RealEstateListing',
		name: p.title,
		description: p.tagline,
		url: `${data.siteUrl}/projects/${p.slug}`,
		image: (() => {
			const src = imageUrl(p.coverImage, 1200, 630);
			return src && (src.startsWith('http') ? src : `${data.siteUrl}${src}`);
		})(),
		about: {
			'@type': schemaType[p.propertyType] ?? 'Place',
			name: p.title,
			address: {
				'@type': 'PostalAddress',
				streetAddress: p.location?.address,
				addressLocality: p.location?.city,
				addressCountry: 'IN'
			},
			...(p.location?.lat
				? {
						geo: { '@type': 'GeoCoordinates', latitude: p.location.lat, longitude: p.location.lng }
					}
				: {})
		},
		...(p.priceFrom
			? {
					offers: {
						'@type': 'Offer',
						priceCurrency: 'INR',
						price: p.priceFrom,
						availability:
							p.status === 'completed' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'
					}
				}
			: {}),
		provider: { '@id': `${data.siteUrl}/#organization` }
	});
</script>

<Seo seo={p.seo} title={p.title} description={p.tagline} />
<JsonLd data={schema} />

<!-- Hero -->
<section
	class="on-dark relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden bg-ink-900 text-limestone-50"
>
	<div class="hero-media absolute inset-0 -z-10">
		<Img image={p.coverImage} priority sizes="100vw" class="h-full w-full" />
	</div>
	<div
		class="absolute inset-0 -z-10 bg-linear-to-t from-ink-950 via-ink-950/55 to-ink-950/20"
	></div>
	<div class="container-page pt-36 pb-10">
		<Breadcrumbs dark items={[{ label: 'Projects', href: '/projects' }, { label: p.title }]} />
		<div class="mt-10 flex flex-wrap items-center gap-3" use:reveal>
			<StatusBadge status={p.status} />
			<span
				class="rounded-pill border border-limestone-100/30 px-3 py-1.5 font-mono text-label uppercase"
				>{TYPE_LABELS[p.propertyType]}</span
			>
		</div>
		<SplitText as="h1" text={p.title} class="mt-6 max-w-[16ch] text-display-2xl font-light" />
		<div class="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
			<div class="lg:col-span-7">
				{#if p.tagline}<p
						class="max-w-2xl text-lede text-limestone-200"
						use:reveal={{ delay: 200 }}
					>
						{p.tagline}
					</p>{/if}
				{#if place}
					<p
						class="mt-4 inline-flex items-center gap-2 text-limestone-300"
						use:reveal={{ delay: 260 }}
					>
						<MapPin size={16} aria-hidden="true" />{place}
					</p>
				{/if}
			</div>
			<div class="flex flex-col gap-4 lg:col-span-5 lg:items-end" use:reveal={{ delay: 320 }}>
				{#if p.priceDisplay}<p class="font-display text-display-sm">{p.priceDisplay}</p>{/if}
				<div class="flex flex-wrap gap-3">
					<Button href="#enquire" size="lg">Enquire now</Button>
					{#if p.hasBrochure}
						<Button
							href="/enquire?type=brochure&project={p.slug}"
							variant="outline-light"
							size="lg"
							arrow={false}
							aria-haspopup="dialog"
							onclick={(e: MouseEvent) => {
								e.preventDefault();
								brochureOpen = true;
							}}
						>
							{#snippet icon()}<Download size={16} aria-hidden="true" />{/snippet}
							Brochure
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
	{#if facts.length}
		<div class="border-t border-limestone-100/15 bg-ink-950/50 backdrop-blur-md">
			<dl class="container-page grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
				{#each facts as fact, i (i)}
					<div
						class="border-limestone-100/12 py-5 pr-4 not-last:border-r max-sm:odd:pl-0 sm:px-5 sm:first:pl-0"
					>
						<dt class="font-mono text-label text-limestone-400 uppercase">{fact.label}</dt>
						<dd class="mt-1 font-semibold">{fact.value}</dd>
					</div>
				{/each}
			</dl>
		</div>
	{/if}
</section>

<SubNav items={nav} label="Project sections" />

<!-- Overview -->
<section id="overview" class="container-page scroll-mt-28 py-section-sm">
	<div class="grid gap-12 lg:grid-cols-12">
		<div class="lg:col-span-7">
			<SectionHeading eyebrow="Overview" number="01" heading="About {p.title}" size="md" />
			<PortableText value={p.overview} class="mt-8" />
		</div>
		{#if p.highlights?.length}
			<aside class="lg:col-span-4 lg:col-start-9" aria-labelledby="highlights-heading">
				<div class="sheet-frame p-7">
					<h3 id="highlights-heading" class="font-mono text-label text-copper-600 uppercase">
						Highlights
					</h3>
					<ol class="mt-5 flex flex-col gap-4">
						{#each p.highlights as h, i (i)}
							<li class="flex gap-4" use:reveal={{ delay: i * 70 }}>
								<span class="font-mono text-label text-ink-500"
									>{String(i + 1).padStart(2, '0')}</span
								>
								<span class="leading-snug">{h}</span>
							</li>
						{/each}
					</ol>
				</div>
			</aside>
		{/if}
	</div>
</section>

{#if p.gallery?.length || video || tour}
	<section id="gallery" class="container-page scroll-mt-28 py-section-sm">
		<SectionHeading eyebrow="Gallery" number="02" heading="A closer look" size="md" />
		{#if p.gallery?.length}<div class="mt-10">
				<ProjectGallery images={p.gallery} title={p.title} />
			</div>{/if}
		{#if video || tour}
			<div class="mt-6 grid gap-6 md:grid-cols-2">
				{#if video}<EmbedFacade
						src={video}
						title="{p.title} — video walkthrough"
						poster={p.gallery?.[0] ?? p.coverImage}
						href={p.videoUrl}
					/>{/if}
				{#if tour}<EmbedFacade
						src={tour}
						title="{p.title} — virtual tour"
						kind="tour"
						poster={p.gallery?.[1] ?? p.coverImage}
						href={p.virtualTourUrl}
					/>{/if}
			</div>
		{/if}
	</section>
{/if}

{#if p.amenities?.length}
	<section id="amenities" class="on-dark scroll-mt-28 bg-ink-900 py-section-sm text-limestone-50">
		<div class="container-page">
			<SectionHeading
				eyebrow="Amenities"
				number="03"
				heading="Everyday comforts, planned in"
				size="md"
			/>
			<ul
				class="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-limestone-100/12 md:grid-cols-4"
			>
				{#each p.amenities as a, i (a._key)}
					<li
						class="flex flex-col gap-6 bg-ink-900 p-6 transition-colors hover:bg-ink-800"
						use:reveal={{ delay: i * 50 }}
					>
						<span class="text-copper-400" use:reveal={{ mode: 'icon' }}
							><Icon name={a.icon} size={28} strokeWidth={1.25} /></span
						>
						<span class="font-medium">{a.label}</span>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

{#if p.units?.length}
	<section id="plans" class="container-page scroll-mt-28 py-section-sm">
		<SectionHeading
			eyebrow={p.propertyType === 'plotted' ? 'Plots' : 'Floor plans'}
			number="04"
			heading={p.propertyType === 'plotted'
				? 'Plot sizes & availability'
				: 'Plans, units & availability'}
			size="md"
		/>
		<div class="mt-10">
			<UnitPlans units={p.units} showInventory={data.showInventory} onenquire={enquireUnit} />
		</div>
	</section>
{/if}

{#if p.specifications?.length}
	<section id="specifications" class="container-page scroll-mt-28 py-section-sm">
		<div class="grid gap-10 lg:grid-cols-12">
			<div class="lg:col-span-4">
				<SectionHeading
					eyebrow="Specifications"
					number="05"
					heading="What goes into every home"
					size="md"
				/>
				<p class="mt-6 text-sm text-ink-500">
					Brands are indicative; equivalents of the same grade may be used. The agreement for sale
					is the final reference.
				</p>
			</div>
			<div class="lg:col-span-8">
				<Accordion
					items={p.specifications.map((s) => ({ id: s._key, title: s.category }))}
					group="specs"
					openFirst
				>
					{#snippet content(i)}
						<dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
							{#each p.specifications![i].items as item (item._key)}
								<div>
									<dt class="font-semibold">{item.label}</dt>
									<dd class="mt-1 text-ink-600">
										{item.detail}{#if item.brand}<span
												class="mt-1 block font-mono text-[0.68rem] tracking-wider text-ink-500 uppercase"
												>{item.brand}</span
											>{/if}
									</dd>
								</div>
							{/each}
						</dl>
					{/snippet}
				</Accordion>
			</div>
		</div>
	</section>
{/if}

{#if p.approvals?.length || p.rera?.number}
	<section id="approvals" class="container-page scroll-mt-28 py-section-sm">
		<SectionHeading eyebrow="Approvals" number="06" heading="Approvals & registrations" size="md" />
		<div class="mt-10 grid gap-6 lg:grid-cols-12">
			<div class="overflow-x-auto lg:col-span-8">
				<table class="w-full min-w-[30rem] text-left">
					<thead>
						<tr class="border-b border-ink-900/20 font-mono text-label text-ink-500 uppercase">
							<th scope="col" class="py-3 pr-4 font-normal">Approval</th>
							<th scope="col" class="py-3 pr-4 font-normal">Reference</th>
							<th scope="col" class="py-3 font-normal">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each p.approvals ?? [] as ap (ap._key)}
							<tr class="border-b border-ink-900/10">
								<th scope="row" class="py-4 pr-4 font-semibold">{ap.authority}</th>
								<td class="py-4 pr-4 font-mono text-sm text-ink-600">{ap.reference ?? '—'}</td>
								<td class="py-4">
									<span
										class={cx(
											'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold',
											ap.status === 'approved'
												? 'bg-sage-200 text-sage-700'
												: 'bg-limestone-300 text-ink-800'
										)}
									>
										{#if ap.status === 'approved'}<BadgeCheck
												size={14}
												aria-hidden="true"
											/>{:else}<Clock size={14} aria-hidden="true" />{/if}
										{ap.status === 'approved'
											? 'Approved'
											: ap.status === 'applied'
												? 'Applied'
												: 'Pending'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<aside
				class="flex flex-col gap-4 rounded-md bg-limestone-50 p-6 shadow-hairline lg:col-span-4"
			>
				{#if p.rera?.number}
					<div>
						<p class="font-mono text-label text-ink-500 uppercase">RERA registration</p>
						<p class="mt-1 font-mono font-semibold break-all">{p.rera.number}</p>
						{#if p.rera.website}
							<a
								href={p.rera.website}
								target="_blank"
								rel="noopener noreferrer"
								class="link-dim mt-2 inline-flex items-center gap-1 text-sm text-copper-600"
							>
								Verify on the RERA portal <ExternalLink size={12} aria-hidden="true" /><span
									class="sr-only"
								>
									(opens in a new tab)</span
								>
							</a>
						{/if}
					</div>
				{/if}
				{#if p.dtcpNumber}
					<div>
						<p class="font-mono text-label text-ink-500 uppercase">DTCP approval</p>
						<p class="mt-1 font-mono font-semibold">{p.dtcpNumber}</p>
					</div>
				{/if}
				<p class="text-xs leading-relaxed text-ink-500">
					Copies of approval documents are available on request. Please verify registrations
					independently before booking.
				</p>
			</aside>
		</div>
	</section>
{/if}

{#if mapSrc || p.connectivity?.length}
	<section id="location" class="container-page scroll-mt-28 py-section-sm">
		<SectionHeading eyebrow="Location" number="07" heading="Where you'll live" size="md" />
		<div class="mt-10 grid gap-8 lg:grid-cols-12">
			{#if mapSrc}
				<div class="lg:col-span-8">
					<EmbedFacade
						src={mapSrc}
						title="Map showing the location of {p.title}"
						kind="map"
						poster={p.coverImage}
						aspect="16 / 10"
						href="https://www.openstreetmap.org/?mlat={p.location?.lat}&mlon={p.location
							?.lng}#map=15/{p.location?.lat}/{p.location?.lng}"
					/>
				</div>
			{/if}
			<div class="lg:col-span-4">
				{#if p.location?.address}<address class="text-lg not-italic">
						{p.location.address}
					</address>{/if}
				{#if p.connectivity?.length}
					<h3 class="mt-8 font-mono text-label text-ink-500 uppercase">Nearby</h3>
					<ul class="mt-3 divide-y divide-ink-900/10 border-y border-ink-900/10">
						{#each p.connectivity as c (c._key)}
							<li class="flex items-center justify-between gap-4 py-3">
								<span>{c.place}</span><span class="font-mono text-sm text-copper-600"
									>{c.distance}</span
								>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</section>
{/if}

{#if p.updates?.length}
	<section id="progress" class="scroll-mt-28 bg-limestone-200/60 py-section-sm">
		<div class="container-page">
			<SectionHeading
				eyebrow="Construction progress"
				number="08"
				heading="Built in the open"
				size="md"
			/>
			<div class="mt-12"><ProgressTimeline updates={p.updates} /></div>
		</div>
	</section>
{/if}

{#if p.faqs?.length}
	<section id="faqs" class="container-page grid scroll-mt-28 gap-10 py-section-sm lg:grid-cols-12">
		<div class="lg:col-span-4">
			<SectionHeading eyebrow="FAQs" number="09" heading="Questions about {p.title}" size="md" />
		</div>
		<div class="lg:col-span-8"><FaqList faqs={p.faqs} group="project-faq" /></div>
	</section>
{/if}

<section id="enquire" class="scroll-mt-28 py-section-sm">
	<div class="container-page grid gap-12 lg:grid-cols-12">
		<div class="lg:col-span-4">
			<div class="lg:sticky lg:top-36">
				<SectionHeading
					eyebrow="Enquire"
					number="10"
					heading="Visit {p.title}"
					intro="Request prices, availability and a guided site visit. We reply within one working day."
					size="md"
				/>
				<div class="mt-8 flex flex-col gap-3">
					{#if wa}
						<a
							href={wa}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-3 font-semibold text-sage-700"
						>
							<MessageCircle size={18} aria-hidden="true" /> Ask about {p.title} on WhatsApp
						</a>
					{/if}
					<p class="text-sm text-ink-500">
						{STATUS_LABELS[p.status]} · {TYPE_LABELS[p.propertyType]}
					</p>
				</div>
			</div>
		</div>
		<div class="rounded-lg bg-limestone-50 p-6 shadow-plate sm:p-10 lg:col-span-7 lg:col-start-6">
			{#key preselectUnit}
				<ProjectEnquiryForm
					project={{ title: p.title, slug: p.slug, units: p.units, bedrooms: p.bedrooms }}
				/>
			{/key}
		</div>
	</div>
</section>

{#if p.relatedProjects?.length}
	<section class="container-page pb-section" aria-labelledby="related-heading">
		<SectionHeading
			id="related-heading"
			eyebrow="You may also like"
			heading="Related projects"
			size="md"
		/>
		<div class="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
			{#each p.relatedProjects as rp, i (rp._id)}<ProjectCard project={rp} index={i} />{/each}
		</div>
	</section>
{/if}

<Dialog
	bind:open={brochureOpen}
	title="Download the {p.title} brochure"
	description="Share your details and the brochure link appears instantly."
>
	<BrochureForm project={{ title: p.title, slug: p.slug }} />
</Dialog>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.hero-media {
			animation: hero-zoom 2.4s var(--ease-out-expo) both;
		}
	}
	@keyframes hero-zoom {
		from {
			transform: scale(1.12);
			opacity: 0.4;
		}
	}
</style>
