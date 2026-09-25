<!--
	Full-screen mobile navigation in a native modal <dialog> (focus trap + Escape).
	Without JavaScript, the trigger links to the footer sitemap instead.
-->
<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { ui } from '$lib/state/ui.svelte';
	import type { Navigation, SiteSettings } from '$lib/types';
	import { cx, telLink, whatsappLink } from '$lib/utils';

	let {
		navigation,
		settings,
		onDark
	}: { navigation: Navigation | null; settings: SiteSettings; onDark: boolean } = $props();
	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (ui.menuOpen && !dialog.open) dialog.showModal();
		if (!ui.menuOpen && dialog.open) dialog.close();
	});
</script>

<a
	href="#footer-nav"
	class={cx(
		'relative grid size-11 place-items-center rounded-full border lg:hidden',
		onDark ? 'border-limestone-100/30' : 'border-ink-900/20'
	)}
	aria-label="Open menu"
	aria-haspopup="dialog"
	onclick={(e) => {
		e.preventDefault();
		ui.menuOpen = true;
	}}
>
	<span class="flex w-4 flex-col gap-1.5" aria-hidden="true">
		<span class="h-px w-full bg-current"></span>
		<span class="h-px w-2/3 self-end bg-current"></span>
	</span>
</a>

<dialog
	bind:this={dialog}
	onclose={() => (ui.menuOpen = false)}
	aria-label="Menu"
	class="menu on-dark m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-ink-900 p-0 text-limestone-50 lg:hidden"
>
	<div class="blueprint-grid flex min-h-full flex-col px-gutter pt-5 pb-10">
		<div class="flex items-center justify-between">
			<p class="sheet-label">Menu</p>
			<button
				type="button"
				class="grid size-11 place-items-center rounded-full border border-limestone-100/30"
				onclick={() => (ui.menuOpen = false)}
				aria-label="Close menu"
			>
				<X size={18} aria-hidden="true" />
			</button>
		</div>
		<nav aria-label="Mobile" class="mt-10 flex-1">
			<ul class="flex flex-col">
				{#each navigation?.main ?? [] as item, i (item._key)}
					<li class="menu-item border-b border-limestone-100/12 py-4" style:--i={i}>
						<a
							href={item.href}
							class="flex items-baseline gap-4 font-display text-4xl leading-tight"
						>
							<span class="font-mono text-label text-copper-400"
								>{String(i + 1).padStart(2, '0')}</span
							>
							{item.label}
						</a>
						{#if item.children?.length}
							<ul class="mt-3 flex flex-wrap gap-2 pl-10">
								{#each item.children as child (child._key)}
									<li>
										<a
											href={child.href}
											class="inline-flex min-h-10 items-center rounded-pill border border-limestone-100/20 px-4 text-sm text-limestone-200"
										>
											{child.label}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>
		<div class="mt-10 grid grid-cols-2 gap-3">
			<button
				type="button"
				class="col-span-2 min-h-14 rounded-pill bg-copper-600 font-semibold"
				onclick={() => ui.openConsultation()}
			>
				Book a consultation
			</button>
			{#if telLink(settings)}
				<a
					href={telLink(settings)}
					class="grid min-h-12 place-items-center rounded-pill border border-limestone-100/30 text-sm font-semibold"
					>Call us</a
				>
			{/if}
			{#if whatsappLink(settings)}
				<a
					href={whatsappLink(settings)}
					target="_blank"
					rel="noopener noreferrer"
					class="grid min-h-12 place-items-center rounded-pill border border-limestone-100/30 text-sm font-semibold"
					>WhatsApp</a
				>
			{/if}
		</div>
	</div>
</dialog>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.menu[open] {
			animation: menu-in 0.7s var(--ease-out-expo);
		}
		.menu[open] .menu-item {
			animation: rise 0.8s var(--ease-out-expo) both;
			animation-delay: calc(var(--i) * 60ms + 120ms);
		}
	}
	@keyframes menu-in {
		from {
			clip-path: inset(0 0 100% 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
</style>
