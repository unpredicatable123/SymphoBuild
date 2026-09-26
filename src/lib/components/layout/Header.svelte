<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { ui } from '$lib/state/ui.svelte';
	import type { Navigation, SiteSettings } from '$lib/types';
	import { cx } from '$lib/utils';
	import CtaButton from '$lib/components/ui/CtaButton.svelte';
	import Logo from './Logo.svelte';
	import MobileMenu from './MobileMenu.svelte';

	let { navigation, settings }: { navigation: Navigation | null; settings: SiteSettings } =
		$props();

	let scrolled = $state(false);
	let hidden = $state(false);
	let openIndex = $state<number | null>(null);
	/** Whether the header currently sits over a dark, full-width section (null = not measured yet). */
	let overDark = $state<boolean | null>(null);
	let lastY = 0;
	let raf = 0;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	const tone = $derived((page.data.headerTone as 'dark' | 'light' | undefined) ?? 'light');
	// Tone follows whatever is actually under the header, so it stays dark over the hero (and
	// any other dark band) instead of flashing to the light bar as soon as the page scrolls.
	const onDark = $derived((overDark ?? tone === 'dark') && openIndex === null);

	function measureTone() {
		raf = 0;
		const header = document.querySelector<HTMLElement>('.site-header');
		const y = (header?.offsetHeight ?? 72) / 2;
		const under = document
			.elementsFromPoint(window.innerWidth / 2, y)
			.find((el) => !header?.contains(el));
		const dark = under?.closest<HTMLElement>('.on-dark');
		overDark = !!dark && dark.getBoundingClientRect().width >= window.innerWidth * 0.9;
	}
	const scheduleTone = () => {
		if (!raf) raf = requestAnimationFrame(measureTone);
	};

	function onscroll() {
		const y = window.scrollY;
		scrolled = y > 24;
		hidden = y > 480 && y > lastY && openIndex === null && !ui.menuOpen;
		lastY = y;
		scheduleTone();
	}

	afterNavigate(() => {
		openIndex = null;
		ui.menuOpen = false;
		scheduleTone();
	});

	function isActive(href: string) {
		const path = href.split('?')[0];
		return path !== '/' && (page.url.pathname === path || page.url.pathname.startsWith(`${path}/`));
	}

	function hoverOpen(i: number) {
		if (!window.matchMedia('(hover: hover)').matches) return;
		clearTimeout(closeTimer);
		openIndex = i;
	}
	function hoverClose() {
		if (!window.matchMedia('(hover: hover)').matches) return;
		closeTimer = setTimeout(() => (openIndex = null), 180);
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && openIndex !== null) {
			const idx = openIndex;
			openIndex = null;
			document.getElementById(`nav-trigger-${idx}`)?.focus();
		}
	}
	function onfocusout(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (!next || !(e.currentTarget as HTMLElement).contains(next)) openIndex = null;
	}
</script>

<svelte:window {onscroll} onresize={scheduleTone} {onkeydown} />

<header
	class={cx(
		'site-header fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-out-expo',
		hidden && '-translate-y-full',
		onDark ? 'on-dark text-limestone-50' : 'text-ink-900',
		(scrolled || openIndex !== null) &&
			(onDark
				? // Solid tint, no backdrop blur: blurring the live 3D hero every frame is expensive.
					'bg-ink-900/92 shadow-[0_1px_0_rgb(244_239_230/0.08)]'
				: 'bg-limestone-100/85 shadow-[0_1px_0_rgb(22_24_26/0.08)] backdrop-blur-xl backdrop-saturate-150')
	)}
	style:view-transition-name="site-header"
>
	<div class="container-page flex h-header items-center justify-between gap-6">
		<a href="/" class="relative z-10 shrink-0" aria-label="{settings.siteName} — home">
			<Logo name={settings.logoText ?? settings.siteName} logo={settings.logo} />
		</a>

		<nav aria-label="Main" class="hidden lg:block" {onfocusout}>
			<ul class="flex items-center gap-1">
				{#each navigation?.main ?? [] as item, i (item._key)}
					<li
						class="relative"
						onmouseenter={() => item.children?.length && hoverOpen(i)}
						onmouseleave={hoverClose}
					>
						{#if item.children?.length}
							<button
								id="nav-trigger-{i}"
								type="button"
								class={cx(
									'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 text-[0.93rem] font-medium transition-colors hover:bg-current/8',
									isActive(item.href) && 'text-copper-600 [.on-dark_&]:text-copper-300'
								)}
								aria-expanded={openIndex === i}
								aria-controls="nav-panel-{i}"
								onclick={() => (openIndex = openIndex === i ? null : i)}
							>
								{item.label}
								<ChevronDown
									size={14}
									class={cx('transition-transform duration-300', openIndex === i && 'rotate-180')}
									aria-hidden="true"
								/>
							</button>
							<div
								id="nav-panel-{i}"
								class={cx(
									'absolute top-full left-1/2 w-[26rem] -translate-x-1/2 pt-3 transition-[opacity,transform,visibility] duration-300 ease-out-expo',
									openIndex === i
										? 'visible translate-y-0 opacity-100'
										: 'invisible -translate-y-2 opacity-0'
								)}
							>
								<div class="sheet-frame rounded-md bg-limestone-50 p-3 text-ink-900 shadow-lift">
									<a
										href={item.href}
										class="group flex items-center justify-between gap-4 rounded-sm bg-ink-900 p-5 text-limestone-50"
									>
										<span>
											<span class="block font-display text-2xl">{item.label}</span>
											{#if item.description}<span class="mt-1 block text-sm text-limestone-300"
													>{item.description}</span
												>{/if}
										</span>
										<ArrowRight
											size={18}
											class="transition-transform duration-300 group-hover:translate-x-1"
											aria-hidden="true"
										/>
									</a>
									<ul class="mt-2 grid gap-0.5">
										{#each item.children as child (child._key)}
											<li>
												<a
													href={child.href}
													class="group flex items-center justify-between rounded-sm px-4 py-3 text-[0.95rem] transition-colors hover:bg-limestone-200"
												>
													{child.label}
													<ArrowRight
														size={14}
														class="-translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
														aria-hidden="true"
													/>
												</a>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{:else}
							<a
								href={item.href}
								class={cx(
									'inline-flex min-h-11 items-center rounded-pill px-4 text-[0.93rem] font-medium transition-colors hover:bg-current/8',
									isActive(item.href) && 'text-copper-600 [.on-dark_&]:text-copper-300'
								)}
								aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</a
							>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>

		<div class="flex items-center gap-3">
			<div class="hidden sm:block">
				<CtaButton cta={navigation?.headerCta} size="sm" variant={onDark ? 'light' : 'primary'} />
			</div>
			<MobileMenu {navigation} {settings} {onDark} />
		</div>
	</div>
</header>
