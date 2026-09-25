<!-- In-page navigation with scroll-spy. Anchor links work without JavaScript. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { cx } from '$lib/utils';

	let {
		items,
		label = 'On this page'
	}: { items: { id: string; label: string }[]; label?: string } = $props();
	let active = $state('');
	let scroller: HTMLUListElement | undefined = $state();

	onMount(() => {
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) if (e.isIntersecting) active = e.target.id;
			},
			{ rootMargin: '-35% 0px -60% 0px' }
		);
		for (const item of items) {
			const el = document.getElementById(item.id);
			if (el) io.observe(el);
		}
		return () => io.disconnect();
	});

	// Keep the active pill centred by scrolling the strip itself — never scrollIntoView(),
	// which also scrolls the window and fights the visitor's own scrolling.
	$effect(() => {
		const link = scroller?.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`);
		if (!scroller || !link) return;
		const offset = link.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
		const left = scroller.scrollLeft + offset - (scroller.clientWidth - link.offsetWidth) / 2;
		scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
	});
</script>

<nav
	aria-label={label}
	class="sticky top-0 z-30 border-y border-ink-900/10 bg-limestone-100/88 backdrop-blur-xl"
>
	<ul
		bind:this={scroller}
		class="container-page flex [scrollbar-width:none] gap-1 overflow-x-auto py-2"
	>
		{#each items as item (item.id)}
			<li class="shrink-0">
				<a
					href="#{item.id}"
					aria-current={active === item.id ? 'location' : undefined}
					class={cx(
						'relative inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-medium transition-colors duration-300',
						active === item.id ? 'bg-ink-900 text-limestone-50' : 'text-ink-600 hover:text-ink-900'
					)}
				>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
