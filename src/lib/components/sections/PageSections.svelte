<!--
	Page-builder renderer: maps each Sanity section object to its layout. Editors can
	add, remove and reorder these freely in Studio.
-->
<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import Clock from '@lucide/svelte/icons/clock';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { page } from '$app/state';
	import type {
		Cta,
		Faq,
		Feature,
		Guide,
		PageSection,
		PortableTextBlock,
		ProcessStep,
		ProjectCard as ProjectCardType,
		SanityImage,
		SiteSettings,
		Stat,
		TeamMember,
		Testimonial
	} from '$lib/types';
	import { cx, telLink, whatsappLink } from '$lib/utils';
	import { countUp, reveal } from '$lib/motion/actions';
	import CtaButton from '$lib/components/ui/CtaButton.svelte';
	import EmbedFacade from '$lib/components/ui/EmbedFacade.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import PortableText from '$lib/components/ui/PortableText.svelte';
	import SectionHeading from '$lib/components/ui/SectionHeading.svelte';
	import ConsultationForm from '$lib/components/forms/ConsultationForm.svelte';
	import LandownerForm from '$lib/components/forms/LandownerForm.svelte';
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte';
	import FaqList from './FaqList.svelte';

	let { sections = [], guides = [] }: { sections?: PageSection[]; guides?: Guide[] | null } =
		$props();
	const settings = $derived(page.data.settings as SiteSettings);

	/* Typed accessors for the loosely typed section objects */
	const s = (x: PageSection) =>
		x as PageSection & {
			eyebrow?: string;
			heading?: string;
			intro?: string;
			text?: string;
			body?: PortableTextBlock[];
			layout?: 'narrow' | 'split';
			style?: 'cards' | 'list' | 'spec';
			features?: Feature[];
			stats?: Stat[];
			steps?: ProcessStep[];
			items?: Record<string, string>[];
			members?: TeamMember[];
			faqs?: Faq[];
			testimonials?: Testimonial[];
			projects?: ProjectCardType[];
			groups?: {
				_key: string;
				category: string;
				items: { _key: string; label: string; detail: string; brand?: string }[];
			}[];
			image?: SanityImage;
			imagePosition?: 'left' | 'right';
			primaryCta?: Cta;
			secondaryCta?: Cta;
			cta?: Cta;
			formType?: 'consultation' | 'landowner';
			anchor?: string;
			showMap?: boolean;
			quote?: string;
			attribution?: string;
		};

	const statusLabel: Record<string, string> = {
		verified: 'Verified',
		inProgress: 'In progress',
		placeholder: 'Placeholder — replace'
	};
	const a = $derived(settings.address);
	const mapSrc = $derived(
		a?.lat && a?.lng
			? `https://www.openstreetmap.org/export/embed.html?bbox=${a.lng - 0.01},${a.lat - 0.006},${a.lng + 0.01},${a.lat + 0.006}&layer=mapnik&marker=${a.lat},${a.lng}`
			: null
	);
</script>

{#each sections as raw, idx (raw._key)}
	{@const sec = s(raw)}
	{@const hid = `section-${idx}`}

	{#if sec._type === 'richTextSection'}
		<section class="container-page py-section-sm" aria-labelledby={sec.heading ? hid : undefined}>
			{#if sec.layout === 'split'}
				<div class="grid gap-10 lg:grid-cols-12">
					<div class="lg:col-span-5">
						<SectionHeading id={hid} eyebrow={sec.eyebrow} heading={sec.heading} size="md" />
					</div>
					<div class="lg:col-span-6 lg:col-start-7"><PortableText value={sec.body} /></div>
				</div>
			{:else}
				<div class="mx-auto max-w-3xl">
					{#if sec.heading}<SectionHeading
							id={hid}
							eyebrow={sec.eyebrow}
							heading={sec.heading}
							size="md"
							class="mb-10"
						/>{/if}
					<PortableText value={sec.body} />
				</div>
			{/if}
		</section>
	{:else if sec._type === 'imageTextSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<div class="grid items-center gap-12 lg:grid-cols-12">
				<div
					class={cx(
						'overflow-hidden rounded-lg lg:col-span-6',
						sec.imagePosition === 'left' ? '' : 'lg:order-2 lg:col-start-7'
					)}
					use:reveal={{ mode: 'mask' }}
				>
					<Img
						image={sec.image}
						aspect={4 / 5}
						sizes="(min-width: 1024px) 50vw, 100vw"
						class="aspect-[4/5]"
					/>
				</div>
				<div
					class={cx(
						'lg:col-span-5',
						sec.imagePosition === 'left' ? 'lg:col-start-8' : 'lg:order-1'
					)}
				>
					<SectionHeading id={hid} eyebrow={sec.eyebrow} heading={sec.heading} size="md" />
					<PortableText value={sec.body} class="mt-8" />
					{#if sec.cta}<div class="mt-8"><CtaButton cta={sec.cta} /></div>{/if}
				</div>
			</div>
		</section>
	{:else if sec._type === 'featureGridSection'}
		<section
			class={cx(
				'py-section-sm',
				sec.style === 'spec' && 'on-dark bg-ink-900 py-section text-limestone-50'
			)}
			aria-labelledby={hid}
		>
			<div class="container-page">
				<SectionHeading
					id={hid}
					eyebrow={sec.eyebrow}
					heading={sec.heading}
					intro={sec.intro}
					size="md"
				/>
				{#if sec.style === 'list'}
					<ul class="mt-12 border-t border-ink-900/12">
						{#each sec.features ?? [] as f, i (f._key)}
							<li
								class="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-b border-ink-900/12 py-6 sm:grid-cols-[3rem_1fr_1.2fr]"
								use:reveal={{ delay: i * 60 }}
							>
								<span class="text-copper-600"><Icon name={f.icon} size={22} /></span>
								<h3 class="font-display text-2xl">{f.title}</h3>
								<p class="col-start-2 text-ink-600 sm:col-start-3">{f.description}</p>
							</li>
						{/each}
					</ul>
				{:else}
					<ul
						class={cx(
							'mt-12 grid gap-px overflow-hidden rounded-md sm:grid-cols-2',
							sec.style === 'spec'
								? 'bg-limestone-100/12 lg:grid-cols-3'
								: 'bg-ink-900/10 lg:grid-cols-4'
						)}
					>
						{#each sec.features ?? [] as f, i (f._key)}
							<li
								class={cx(
									'flex flex-col gap-8 p-7 sm:p-8',
									sec.style === 'spec' ? 'bg-ink-900' : 'bg-limestone-100'
								)}
								use:reveal={{ delay: i * 70 }}
							>
								<span
									class={sec.style === 'spec' ? 'text-copper-400' : 'text-copper-600'}
									use:reveal={{ mode: 'icon' }}
								>
									<Icon name={f.icon} size={30} strokeWidth={1.25} />
								</span>
								<div>
									<h3 class="font-display text-2xl leading-tight">{f.title}</h3>
									{#if f.description}<p
											class={cx(
												'mt-3 leading-relaxed',
												sec.style === 'spec' ? 'text-limestone-300' : 'text-ink-600'
											)}
										>
											{f.description}
										</p>{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{:else if sec._type === 'statsSection'}
		<section class="container-page py-section-sm" aria-labelledby={sec.heading ? hid : undefined}>
			{#if sec.heading}<h2 id={hid} class="font-mono text-label text-ink-500 uppercase">
					{sec.heading}
				</h2>{/if}
			<dl class="mt-8 grid grid-cols-2 gap-8 border-t border-ink-900/12 pt-10 lg:grid-cols-4">
				{#each sec.stats ?? [] as st (st._key)}
					<div class="flex flex-col-reverse gap-2">
						<dt class="text-sm text-ink-600">{st.label}</dt>
						<dd class="font-display text-[clamp(2.6rem,2rem+2.5vw,4.5rem)] leading-none font-light">
							{st.prefix ?? ''}<span use:countUp={{ value: st.value, decimals: st.decimals ?? 0 }}
								>{st.value}</span
							><span class="text-copper-600">{st.suffix ?? ''}</span>
						</dd>
					</div>
				{/each}
			</dl>
		</section>
	{:else if sec._type === 'teamSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading
				id={hid}
				eyebrow={sec.eyebrow}
				heading={sec.heading}
				intro={sec.intro}
				size="md"
			/>
			<ul class="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
				{#each sec.members ?? [] as m, i (m._id)}
					<li class="group" use:reveal={{ delay: i * 80 }}>
						<div class="overflow-hidden rounded-md">
							<Img
								image={m.photo}
								aspect={3 / 4}
								sizes="(min-width: 1024px) 20vw, 50vw"
								class="aspect-[3/4]"
								imgClass="grayscale transition-[filter,transform] duration-700 group-hover:scale-105 group-hover:grayscale-0"
							/>
						</div>
						<h3 class="mt-4 font-display text-xl">{m.name}</h3>
						{#if m.role}<p class="font-mono text-label text-copper-600 uppercase">{m.role}</p>{/if}
						{#if m.bio}<p class="mt-2 text-sm leading-relaxed text-ink-600">{m.bio}</p>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{:else if sec._type === 'timelineSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading id={hid} eyebrow={sec.eyebrow} heading={sec.heading} size="md" />
			<ol
				class="relative mt-14 grid gap-10 border-t border-ink-900/15 pt-10 md:grid-cols-5 md:gap-6"
			>
				{#each sec.items ?? [] as item, i (item._key)}
					<li class="relative" use:reveal={{ delay: i * 90 }}>
						<span
							class="absolute -top-[2.85rem] left-0 size-3 rounded-full border-2 border-limestone-100 bg-copper-500"
							aria-hidden="true"
						></span>
						<p class="font-display text-display-md font-light text-copper-600">{item.year}</p>
						<h3 class="mt-3 font-semibold">{item.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-ink-600">{item.description}</p>
					</li>
				{/each}
			</ol>
		</section>
	{:else if sec._type === 'processSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading
				id={hid}
				eyebrow={sec.eyebrow}
				heading={sec.heading}
				intro={sec.intro}
				size="md"
			/>
			<ol
				class="mt-12 grid gap-px overflow-hidden rounded-md bg-ink-900/10 sm:grid-cols-2 lg:grid-cols-3"
			>
				{#each sec.steps ?? [] as step, i (step._key)}
					<li class="flex flex-col gap-6 bg-limestone-100 p-7" use:reveal={{ delay: i * 60 }}>
						<div class="flex items-center justify-between font-mono text-label uppercase">
							<span class="text-copper-600">Step {String(i + 1).padStart(2, '0')}</span>
							{#if step.duration}<span class="text-ink-500">{step.duration}</span>{/if}
						</div>
						<h3 class="font-display text-2xl">{step.title}</h3>
						{#if step.description}<p class="text-ink-600">{step.description}</p>{/if}
					</li>
				{/each}
			</ol>
		</section>
	{:else if sec._type === 'specTableSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading
				id={hid}
				eyebrow={sec.eyebrow}
				heading={sec.heading}
				intro={sec.intro}
				size="md"
			/>
			<div class="mt-12 grid gap-10 lg:grid-cols-3">
				{#each sec.groups ?? [] as group (group._key)}
					<div class="sheet-frame p-6" use:reveal>
						<h3 class="font-mono text-label text-copper-600 uppercase">{group.category}</h3>
						<dl class="mt-4 divide-y divide-ink-900/10">
							{#each group.items as item (item._key)}
								<div class="py-4">
									<dt class="font-semibold">{item.label}</dt>
									<dd class="mt-1 text-sm leading-relaxed text-ink-600">
										{item.detail}
										{#if item.brand}<span
												class="mt-1 block font-mono text-[0.68rem] tracking-wider text-ink-500 uppercase"
												>{item.brand}</span
											>{/if}
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/each}
			</div>
		</section>
	{:else if sec._type === 'certificationsSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading
				id={hid}
				eyebrow={sec.eyebrow}
				heading={sec.heading}
				intro={sec.intro}
				size="md"
			/>
			<ul class="mt-12 grid gap-4 md:grid-cols-3">
				{#each sec.items ?? [] as item (item._key)}
					<li
						class={cx(
							'flex flex-col gap-4 rounded-md border p-6',
							item.status === 'placeholder'
								? 'border-dashed border-ink-900/30'
								: 'border-ink-900/12 bg-limestone-50'
						)}
					>
						<div class="flex items-center justify-between">
							<Award size={24} class="text-copper-600" aria-hidden="true" />
							<span
								class={cx(
									'rounded-pill px-2.5 py-1 font-mono text-[0.65rem] uppercase',
									item.status === 'verified'
										? 'bg-sage-600 text-limestone-50'
										: 'bg-limestone-300 text-ink-800'
								)}
							>
								{statusLabel[item.status] ?? item.status}
							</span>
						</div>
						<h3 class="font-display text-xl">{item.name}</h3>
						<p class="text-sm text-ink-600">
							{item.issuer}{item.year && item.year !== '—' ? ` · ${item.year}` : ''}
						</p>
						{#if item.note}<p class="text-xs text-ink-500">{item.note}</p>{/if}
						{#if item.url}<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="link-dim text-sm text-copper-600">Verify</a
							>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{:else if sec._type === 'locationsSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading id={hid} eyebrow={sec.eyebrow} heading={sec.heading} size="md" />
			<ul class="mt-12 grid gap-px overflow-hidden rounded-md bg-ink-900/10 md:grid-cols-3">
				{#each sec.items ?? [] as loc (loc._key)}
					<li class="flex flex-col gap-3 bg-limestone-100 p-7">
						<MapPin size={20} class="text-copper-600" aria-hidden="true" />
						<h3 class="font-display text-xl">{loc.name}</h3>
						<address class="text-sm leading-relaxed text-ink-600 not-italic">{loc.address}</address>
						{#if loc.hours}<p class="text-sm text-ink-500">{loc.hours}</p>{/if}
						{#if loc.phone}<a
								href="tel:{loc.phone.replace(/\s/g, '')}"
								class="link-dim self-start text-sm font-semibold">{loc.phone}</a
							>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{:else if sec._type === 'faqSection' && sec.faqs?.length}
		<section class="container-page grid gap-10 py-section-sm lg:grid-cols-12" aria-labelledby={hid}>
			<div class="lg:col-span-4">
				<SectionHeading id={hid} eyebrow={sec.eyebrow ?? 'FAQ'} heading={sec.heading} size="md" />
			</div>
			<div class="lg:col-span-8"><FaqList faqs={sec.faqs} group={hid} /></div>
		</section>
	{:else if sec._type === 'testimonialsSection' && sec.testimonials?.length}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading id={hid} eyebrow={sec.eyebrow} heading={sec.heading} size="md" />
			<div class="mt-10 grid gap-6 md:grid-cols-2">
				{#each sec.testimonials as t (t._id)}
					<figure class="rounded-md bg-limestone-50 p-8 shadow-hairline" use:reveal>
						<blockquote class="font-display text-2xl leading-snug font-light">
							“{t.quote}”
						</blockquote>
						<figcaption class="mt-6 text-sm">
							<strong>{t.name}</strong>{#if t.context}<span class="text-ink-500">
									· {t.context}</span
								>{/if}
						</figcaption>
					</figure>
				{/each}
			</div>
		</section>
	{:else if sec._type === 'projectsSection' && sec.projects?.length}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<SectionHeading id={hid} eyebrow={sec.eyebrow} heading={sec.heading} size="md" />
			<div class="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
				{#each sec.projects as p, i (p._id)}<ProjectCard project={p} index={i} />{/each}
			</div>
		</section>
	{:else if sec._type === 'guideListSection'}
		<section class="container-page py-section-sm" aria-labelledby={sec.heading ? hid : undefined}>
			{#if sec.heading}<h2 id={hid} class="sr-only">{sec.heading}</h2>{/if}
			<ol
				class="grid gap-px overflow-hidden rounded-md bg-ink-900/10 md:grid-cols-2 lg:grid-cols-3"
			>
				{#each guides ?? [] as g, i (g._id)}
					<li
						class="group relative flex min-h-[19rem] flex-col bg-limestone-100 p-8 transition-colors duration-500 hover:bg-limestone-50"
						use:reveal={{ delay: i * 60 }}
					>
						<div class="flex items-center justify-between">
							<span class="font-mono text-label text-ink-500"
								>Guide {String(i + 1).padStart(2, '0')}</span
							>
							<span class="text-copper-600"><Icon name={g.icon} size={26} strokeWidth={1.3} /></span
							>
						</div>
						<h3 class="mt-auto pt-10 font-display text-display-sm">
							<a
								href="/buyers-guide/{g.slug}"
								class="after:absolute after:inset-0 after:content-['']">{g.title}</a
							>
						</h3>
						{#if g.excerpt}<p class="mt-3 text-ink-600">{g.excerpt}</p>{/if}
						<span
							class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-copper-600"
							aria-hidden="true"
						>
							Read guide <ArrowUpRight
								size={14}
								class="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
							/>
						</span>
					</li>
				{/each}
			</ol>
		</section>
	{:else if sec._type === 'formSection'}
		<section id={sec.anchor} class="py-section-sm" aria-labelledby={hid}>
			<div class="container-page grid gap-12 lg:grid-cols-12">
				<div class="lg:col-span-4">
					<div class="lg:sticky lg:top-32">
						<SectionHeading
							id={hid}
							eyebrow={sec.eyebrow}
							heading={sec.heading}
							intro={sec.intro}
							size="md"
						/>
					</div>
				</div>
				<div
					class="rounded-lg bg-limestone-50 p-6 shadow-plate sm:p-10 lg:col-span-7 lg:col-start-6"
				>
					{#if sec.formType === 'landowner'}
						<LandownerForm />
					{:else}
						<ConsultationForm />
					{/if}
				</div>
			</div>
		</section>
	{:else if sec._type === 'contactDetailsSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<h2 id={hid} class="sr-only">{sec.heading ?? 'Contact details'}</h2>
			<div class="grid gap-6 lg:grid-cols-12">
				<div
					class="grid gap-px overflow-hidden rounded-lg bg-ink-900/10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1"
				>
					<div class="flex flex-col gap-2 bg-limestone-50 p-7">
						<MapPin size={20} class="text-copper-600" aria-hidden="true" />
						<h3 class="font-mono text-label text-ink-500 uppercase">Studio</h3>
						<address class="text-lg leading-relaxed not-italic">
							{a?.line1}<br />{#if a?.line2}{a.line2}<br />{/if}{a?.city}
							{a?.postalCode}<br />{a?.state}
						</address>
					</div>
					<div class="flex flex-col gap-3 bg-limestone-50 p-7">
						<h3 class="font-mono text-label text-ink-500 uppercase">Talk to us</h3>
						{#if telLink(settings)}<a
								href={telLink(settings)}
								class="inline-flex items-center gap-3 text-lg font-semibold"
								><Phone size={18} class="text-copper-600" aria-hidden="true" />{settings.contact
									?.phoneDisplay}</a
							>{/if}
						{#if whatsappLink(settings)}<a
								href={whatsappLink(settings)}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-3 text-lg font-semibold"
								><MessageCircle size={18} class="text-copper-600" aria-hidden="true" />WhatsApp</a
							>{/if}
						{#if settings.contact?.email}<a
								href="mailto:{settings.contact.email}"
								class="inline-flex items-center gap-3 text-lg font-semibold break-all"
								><Mail size={18} class="shrink-0 text-copper-600" aria-hidden="true" />{settings
									.contact.email}</a
							>{/if}
					</div>
					<div class="flex flex-col gap-2 bg-limestone-50 p-7">
						<Clock size={20} class="text-copper-600" aria-hidden="true" />
						<h3 class="font-mono text-label text-ink-500 uppercase">Hours</h3>
						{#each settings.businessHours ?? [] as h (h._key)}<p>
								<span class="font-semibold">{h.days}</span> — {h.hours}
							</p>{/each}
					</div>
					{#if settings.serviceAreas?.length}
						<div class="flex flex-col gap-3 bg-limestone-50 p-7">
							<h3 class="font-mono text-label text-ink-500 uppercase">Service areas</h3>
							<ul class="flex flex-wrap gap-2">
								{#each settings.serviceAreas as area (area)}<li
										class="rounded-pill border border-ink-900/15 px-3 py-1.5 text-sm"
									>
										{area}
									</li>{/each}
							</ul>
						</div>
					{/if}
				</div>
				{#if sec.showMap && mapSrc}
					<div class="lg:col-span-7">
						<EmbedFacade
							src={mapSrc}
							title="Map showing the {settings.siteName} studio"
							kind="map"
							aspect="4 / 3"
							href="https://www.openstreetmap.org/?mlat={a?.lat}&mlon={a?.lng}#map=16/{a?.lat}/{a?.lng}"
						/>
					</div>
				{/if}
			</div>
		</section>
	{:else if sec._type === 'quoteSection'}
		<section class="container-page py-section" aria-label="Quote">
			<figure class="mx-auto max-w-4xl text-center" use:reveal>
				<blockquote class="font-display text-display-lg font-light italic">
					“{sec.quote}”
				</blockquote>
				{#if sec.attribution}<figcaption class="mt-6 font-mono text-label text-ink-500 uppercase">
						{sec.attribution}
					</figcaption>{/if}
			</figure>
		</section>
	{:else if sec._type === 'ctaSection'}
		<section class="container-page py-section-sm" aria-labelledby={hid}>
			<div
				class="on-dark relative overflow-hidden rounded-xl bg-ink-900 px-6 py-16 text-limestone-50 sm:px-12 lg:px-16"
			>
				<div class="blueprint-grid absolute inset-0" aria-hidden="true"></div>
				<div class="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
					<SectionHeading
						id={hid}
						eyebrow={sec.eyebrow}
						heading={sec.heading}
						intro={sec.text}
						size="md"
					/>
					<div class="flex shrink-0 flex-wrap gap-3">
						<CtaButton cta={sec.primaryCta} size="lg" />
						<CtaButton cta={sec.secondaryCta} size="lg" variant="outline-light" />
					</div>
				</div>
			</div>
		</section>
	{/if}
{/each}
