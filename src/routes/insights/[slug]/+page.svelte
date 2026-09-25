<script lang="ts">
	import { imageUrl } from '$lib/sanity/image';
	import { formatDate } from '$lib/utils';
	import { reveal } from '$lib/motion/actions';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import ArticleLayout from '$lib/components/insights/ArticleLayout.svelte';
	import PostCard from '$lib/components/insights/PostCard.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SectionHeading from '$lib/components/ui/SectionHeading.svelte';
	import SplitText from '$lib/components/ui/SplitText.svelte';
	import CtaFinale from '$lib/components/home/CtaFinale.svelte';

	let { data } = $props();
	const post = $derived(data.post);
	const more = $derived(post.related?.length ? post.related : (post.latest ?? []));
	const ogImage = $derived(imageUrl(post.seo?.image ?? post.coverImage, 1200, 630));
</script>

<Seo
	seo={post.seo}
	title={post.title}
	description={post.excerpt}
	type="article"
	publishedTime={post.publishedAt}
	modifiedTime={post._updatedAt}
/>
<JsonLd
	data={{
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.excerpt,
		datePublished: post.publishedAt,
		dateModified: post._updatedAt ?? post.publishedAt,
		image: ogImage && (ogImage.startsWith('http') ? ogImage : `${data.siteUrl}${ogImage}`),
		author: post.author
			? { '@type': 'Person', name: post.author.name, jobTitle: post.author.role }
			: undefined,
		publisher: { '@id': `${data.siteUrl}/#organization` },
		mainEntityOfPage: `${data.siteUrl}/insights/${post.slug}`,
		articleSection: post.categories?.[0]?.title
	}}
/>

{#key post._id}
	<header class="container-page pt-[calc(var(--spacing-header)+3rem)] pb-12">
		<Breadcrumbs items={[{ label: 'Insights', href: '/insights' }, { label: post.title }]} />
		<div class="mt-12 max-w-4xl">
			<p
				class="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-label text-ink-500 uppercase"
				use:reveal
			>
				{#each post.categories ?? [] as c (c._id)}<a
						href="/insights?category={c.slug}"
						class="text-copper-600">{c.title}</a
					>{/each}
				<time datetime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
				{#if post.readMinutes}<span>{post.readMinutes} min read</span>{/if}
			</p>
			<SplitText as="h1" text={post.title} class="mt-6 text-display-xl font-light" />
			{#if post.excerpt}<p
					class="mt-8 max-w-2xl text-lede text-ink-600"
					use:reveal={{ delay: 200 }}
				>
					{post.excerpt}
				</p>{/if}
			{#if post.author}
				<div class="mt-10 flex items-center gap-4" use:reveal={{ delay: 260 }}>
					{#if post.author.photo}<Img
							image={post.author.photo}
							aspect={1}
							sizes="48px"
							class="size-12 rounded-full"
						/>{/if}
					<div>
						<p class="font-semibold">{post.author.name}</p>
						{#if post.author.role}<p class="text-sm text-ink-500">{post.author.role}</p>{/if}
					</div>
				</div>
			{/if}
		</div>
	</header>
	<div class="container-page pb-16">
		<div class="overflow-hidden rounded-lg" use:reveal={{ mode: 'mask' }}>
			<Img
				image={post.coverImage}
				priority
				aspect={21 / 9}
				sizes="(min-width: 1536px) 1500px, 100vw"
				class="aspect-[16/10] sm:aspect-[21/9]"
			/>
		</div>
	</div>

	<ArticleLayout body={post.body} title={post.title} />

	{#if more.length}
		<section class="bg-limestone-200/60 py-section-sm" aria-labelledby="more-heading">
			<div class="container-page">
				<SectionHeading
					id="more-heading"
					eyebrow="Keep reading"
					heading={post.related?.length ? 'Related articles' : 'Latest articles'}
					size="md"
				/>
				<ul class="mt-12 grid gap-10 md:grid-cols-3">
					{#each more as p (p._id)}<li><PostCard post={p} /></li>{/each}
				</ul>
			</div>
		</section>
	{/if}
{/key}

<div class="pt-section-sm">
	<CtaFinale
		cta={{
			eyebrow: 'Have a question about your project?',
			heading: 'Ask the people who build.',
			text: 'Book a consultation and our engineers and architects will answer it directly.',
			primaryCta: {
				label: 'Book a consultation',
				action: 'consultation',
				href: '/contact#consultation'
			},
			secondaryCta: { label: 'WhatsApp us', action: 'whatsapp' }
		}}
	/>
</div>
