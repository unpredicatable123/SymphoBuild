<script lang="ts">
	import type { PostCard } from '$lib/types';
	import { cx, formatDate } from '$lib/utils';
	import Img from '$lib/components/ui/Img.svelte';

	let {
		post,
		large = false,
		headingLevel = 'h3'
	}: { post: PostCard; large?: boolean; headingLevel?: 'h2' | 'h3' } = $props();
</script>

<article
	class={cx(
		'group relative flex flex-col',
		large && 'lg:grid lg:grid-cols-12 lg:items-end lg:gap-10'
	)}
>
	<div class={cx('overflow-hidden rounded-md', large && 'lg:col-span-7')}>
		<Img
			image={post.coverImage}
			aspect={large ? 16 / 10 : 3 / 2}
			sizes={large ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 1024px) 33vw, 100vw'}
			class={large ? 'aspect-[16/10]' : 'aspect-[3/2]'}
			imgClass="transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.05]"
		/>
	</div>
	<div class={cx('pt-5', large && 'lg:col-span-5 lg:pt-0 lg:pb-4')}>
		<p
			class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-label text-ink-500 uppercase"
		>
			{#if post.categories?.[0]}<span class="text-copper-600">{post.categories[0].title}</span>{/if}
			<time datetime={post.publishedAt}>{formatDate(post.publishedAt, 'short')}</time>
			{#if post.readMinutes}<span>{post.readMinutes} min read</span>{/if}
		</p>
		<svelte:element
			this={headingLevel}
			class={cx('mt-3 font-display', large ? 'text-display-md' : 'text-display-sm')}
		>
			<a
				href="/insights/{post.slug}"
				class="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-out-expo group-hover:bg-[length:100%_1px] after:absolute after:inset-0 after:content-['']"
			>
				{post.title}
			</a>
		</svelte:element>
		{#if post.excerpt}<p class="mt-3 line-clamp-3 leading-relaxed text-ink-600">
				{post.excerpt}
			</p>{/if}
	</div>
</article>
