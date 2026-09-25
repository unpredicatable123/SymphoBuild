<!--
	Accessible lightbox: native modal dialog, arrow-key / button navigation, swipe on
	touch, live-announced position, and focus returned to the opening thumbnail.
-->
<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import { imageProps } from '$lib/sanity/image';
	import type { SanityImage } from '$lib/types';

	type Item = { image: SanityImage; title?: string; caption?: string };
	let { items, index = $bindable(-1) }: { items: Item[]; index: number } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let direction = $state(1);
	let touchX = 0;
	const current = $derived(index >= 0 ? items[index] : undefined);
	const resolved = $derived(current ? imageProps(current.image, { maxWidth: 2400 }) : null);

	$effect(() => {
		if (!dialog) return;
		if (index >= 0 && !dialog.open) dialog.showModal();
		if (index < 0 && dialog.open) dialog.close();
	});

	function go(step: number) {
		direction = step;
		index = (index + step + items.length) % items.length;
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') go(1);
		if (e.key === 'ArrowLeft') go(-1);
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => (index = -1)}
	{onkeydown}
	ontouchstart={(e) => (touchX = e.touches[0].clientX)}
	ontouchend={(e) => {
		const dx = e.changedTouches[0].clientX - touchX;
		if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
	}}
	aria-label="Image viewer"
	class="on-dark m-0 h-dvh max-h-none w-screen max-w-none bg-ink-950/96 p-0 text-limestone-100 backdrop:bg-ink-950/80"
>
	{#if current && resolved}
		<div class="flex h-full flex-col">
			<div class="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
				<p class="font-mono text-label uppercase" aria-live="polite">
					{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
				</p>
				<button
					type="button"
					class="grid size-11 place-items-center rounded-full border border-limestone-100/30 hover:bg-limestone-50 hover:text-ink-900"
					onclick={() => dialog?.close()}
					aria-label="Close image viewer"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>
			<div class="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
				{#key index}
					<img
						src={resolved.src}
						srcset={resolved.srcset}
						sizes="100vw"
						alt={resolved.alt}
						width={resolved.width}
						height={resolved.height}
						class="lightbox-img max-h-full w-auto max-w-full object-contain"
						style:--dir={direction}
					/>
				{/key}
				{#if items.length > 1}
					<button
						type="button"
						onclick={() => go(-1)}
						class="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-ink-900/70 hover:bg-limestone-50 hover:text-ink-900 sm:left-6"
						aria-label="Previous image"
					>
						<ChevronLeft size={22} aria-hidden="true" />
					</button>
					<button
						type="button"
						onclick={() => go(1)}
						class="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-ink-900/70 hover:bg-limestone-50 hover:text-ink-900 sm:right-6"
						aria-label="Next image"
					>
						<ChevronRight size={22} aria-hidden="true" />
					</button>
				{/if}
			</div>
			<div class="px-4 py-5 text-center sm:px-8">
				{#if current.title}<p class="font-display text-xl">{current.title}</p>{/if}
				{#if current.caption}<p class="mt-1 text-sm text-limestone-300">{current.caption}</p>{/if}
			</div>
		</div>
	{/if}
</dialog>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.lightbox-img {
			animation: lb-in 0.6s var(--ease-out-expo);
		}
	}
	@keyframes lb-in {
		from {
			opacity: 0;
			transform: translate3d(calc(var(--dir, 1) * 3rem), 0, 0) scale(0.98);
		}
	}
</style>
