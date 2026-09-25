<!--
	Long-form article shell shared by Insights and the Buyer's Guide: reading-progress
	bar, generated table of contents with scroll-spy, share links and the body.
-->
<script lang="ts">
	import Link from '@lucide/svelte/icons/link';
	import Check from '@lucide/svelte/icons/check';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { PortableTextBlock } from '$lib/types';
	import { cx, slugify } from '$lib/utils';
	import { scrollProgress } from '$lib/motion/actions';
	import PortableText from '$lib/components/ui/PortableText.svelte';

	type Props = { body?: PortableTextBlock[]; title: string; aside?: Snippet; after?: Snippet };
	let { body, title, aside, after }: Props = $props();

	const toc = $derived(
		(body ?? [])
			.filter((b) => b._type === 'block' && (b.style === 'h2' || b.style === 'h3'))
			.map((b) => {
				const text = (b.children ?? []).map((c) => c.text).join('');
				return { id: slugify(text), text, level: b.style === 'h3' ? 3 : 2 };
			})
	);
	let progress = $state(0);
	let active = $state('');
	let copied = $state(false);
	const url = $derived(`${page.data.siteUrl ?? ''}${page.url.pathname}`);
	const share = $derived([
		{ label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}` },
		{
			label: 'LinkedIn',
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
		},
		{
			label: 'X',
			href: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
		},
		{
			label: 'Email',
			href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
		}
	]);

	onMount(() => {
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) if (e.isIntersecting) active = e.target.id;
			},
			{ rootMargin: '-20% 0px -70% 0px' }
		);
		for (const t of toc) {
			const el = document.getElementById(t.id);
			if (el) io.observe(el);
		}
		return () => io.disconnect();
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	}
</script>

<div class="fixed inset-x-0 top-0 z-[60] h-0.5" aria-hidden="true">
	<div class="h-full origin-left bg-copper-500" style:transform="scaleX({progress})"></div>
</div>

<div
	class="container-page grid gap-12 pb-section lg:grid-cols-12"
	use:scrollProgress={{ mode: 'pin', onProgress: (p) => (progress = p) }}
>
	<aside class="lg:col-span-3">
		<div class="flex flex-col gap-10 lg:sticky lg:top-32">
			{#if toc.length > 2}
				<details class="group rounded-md border border-ink-900/12 p-4 lg:border-0 lg:p-0" open>
					<summary
						class="cursor-pointer list-none font-mono text-label text-ink-500 uppercase [&::-webkit-details-marker]:hidden"
					>
						Contents <span class="text-copper-600 lg:hidden" aria-hidden="true">+</span>
					</summary>
					<nav aria-label="Table of contents" class="mt-4">
						<ol class="flex flex-col gap-1 border-l border-ink-900/12">
							{#each toc as item (item.id)}
								<li>
									<a
										href="#{item.id}"
										class={cx(
											'-ml-px block border-l py-1.5 text-sm transition-colors',
											item.level === 3 ? 'pl-7' : 'pl-4',
											active === item.id
												? 'border-copper-500 font-semibold text-ink-900'
												: 'border-transparent text-ink-500 hover:text-ink-900'
										)}>{item.text}</a
									>
								</li>
							{/each}
						</ol>
					</nav>
				</details>
			{/if}
			<div>
				<p class="font-mono text-label text-ink-500 uppercase">Share</p>
				<ul class="mt-3 flex flex-wrap gap-2">
					{#each share as s (s.label)}
						<li>
							<a
								href={s.href}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex min-h-9 items-center rounded-pill border border-ink-900/15 px-3 text-xs font-semibold hover:border-ink-900"
							>
								{s.label}<span class="sr-only"> (opens in a new tab)</span>
							</a>
						</li>
					{/each}
					<li>
						<button
							type="button"
							onclick={copy}
							class="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-ink-900/15 px-3 text-xs font-semibold hover:border-ink-900"
						>
							{#if copied}<Check size={12} aria-hidden="true" /> Copied{:else}<Link
									size={12}
									aria-hidden="true"
								/> Copy link{/if}
						</button>
					</li>
				</ul>
				<p class="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</p>
			</div>
			{#if aside}{@render aside()}{/if}
		</div>
	</aside>
	<article class="min-w-0 lg:col-span-7 lg:col-start-5">
		<PortableText value={body} />
		{#if after}{@render after()}{/if}
	</article>
</div>
