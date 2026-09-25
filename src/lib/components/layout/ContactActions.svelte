<!--
	Persistent contact shortcuts:
	• Mobile/tablet — a sticky bottom action bar (Call · WhatsApp · Enquire).
	• Desktop — a floating dock that appears after the first screen and expands into
	  quick actions.
	WhatsApp messages are contextual: on a project or service page they name it.
-->
<script lang="ts">
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Phone from '@lucide/svelte/icons/phone';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import X from '@lucide/svelte/icons/x';
	import { page } from '$app/state';
	import { ui } from '$lib/state/ui.svelte';
	import type { SiteSettings } from '$lib/types';
	import { cx, telLink, whatsappLink } from '$lib/utils';

	let { settings }: { settings: SiteSettings } = $props();

	let visible = $state(false);
	let open = $state(false);
	const context = $derived(page.data.contextLabel as string | undefined);
	const wa = $derived(whatsappLink(settings, context));
	const tel = $derived(telLink(settings));
	const enquiryContext = $derived({
		project: page.data.contextProject as string | undefined,
		service: page.data.contextService as string | undefined,
		interest: page.data.contextInterest as string | undefined
	});
</script>

<svelte:window onscroll={() => (visible = window.scrollY > window.innerHeight * 0.6)} />

<!-- Mobile action bar -->
<div
	class="fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-limestone-50/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
	role="region"
	aria-label="Quick contact"
>
	<div class="grid grid-cols-[1fr_1fr_1.4fr] gap-2 px-3 py-2.5">
		{#if tel}
			<a
				href={tel}
				class="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-sm text-xs font-semibold text-ink-800"
			>
				<Phone size={18} aria-hidden="true" /> Call
			</a>
		{/if}
		{#if wa}
			<a
				href={wa}
				target="_blank"
				rel="noopener noreferrer"
				class="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-sm text-xs font-semibold text-ink-800"
			>
				<MessageCircle size={18} aria-hidden="true" /> WhatsApp
			</a>
		{/if}
		<a
			href="/contact#consultation"
			class="flex min-h-12 items-center justify-center gap-2 rounded-pill bg-copper-600 text-sm font-semibold text-limestone-50"
			onclick={(e) => {
				e.preventDefault();
				ui.openConsultation(enquiryContext);
			}}
		>
			<CalendarDays size={16} aria-hidden="true" /> Enquire
		</a>
	</div>
</div>

<!-- Desktop contact dock -->
{#if settings.features?.showContactDock !== false}
	<div
		class={cx(
			'fixed right-6 bottom-6 z-40 hidden flex-col items-end gap-3 transition-[opacity,transform] duration-500 ease-out-expo lg:flex',
			visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
		)}
	>
		<div
			id="contact-dock-panel"
			class={cx(
				'flex flex-col gap-2 transition-[opacity,transform,visibility] duration-400 ease-out-expo',
				open ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-3 opacity-0'
			)}
		>
			{#if wa}
				<a href={wa} target="_blank" rel="noopener noreferrer" class="dock-item">
					<MessageCircle size={16} aria-hidden="true" /> WhatsApp{context
						? ` about ${context}`
						: ''}
				</a>
			{/if}
			{#if tel}
				<a href={tel} class="dock-item"
					><Phone size={16} aria-hidden="true" /> {settings.contact?.phoneDisplay ?? 'Call us'}</a
				>
			{/if}
			<button
				type="button"
				class="dock-item bg-copper-600! text-limestone-50!"
				onclick={() => ui.openConsultation(enquiryContext)}
			>
				<CalendarDays size={16} aria-hidden="true" /> Book a consultation
			</button>
		</div>
		<button
			type="button"
			class="group relative grid size-16 place-items-center rounded-full bg-ink-900 text-limestone-50 shadow-lift transition-transform duration-500 ease-out-expo hover:scale-105"
			aria-expanded={open}
			aria-controls="contact-dock-panel"
			aria-label={open ? 'Close contact options' : 'Contact options'}
			onclick={() => (open = !open)}
			data-cursor="link"
		>
			<span
				class="absolute inset-0 animate-ping rounded-full bg-copper-500/30 [animation-duration:2.8s] motion-reduce:hidden"
				aria-hidden="true"
			></span>
			{#if open}<X size={20} aria-hidden="true" />{:else}<MessageCircle
					size={22}
					aria-hidden="true"
				/>{/if}
		</button>
	</div>
{/if}

<style>
	.dock-item {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 3rem;
		padding: 0 1.25rem;
		border-radius: var(--radius-pill);
		background: var(--color-limestone-50);
		color: var(--color-ink-900);
		font-size: 0.9rem;
		font-weight: 600;
		box-shadow: var(--shadow-plate);
		transition: transform 0.3s var(--ease-out-expo);
	}
	.dock-item:hover {
		transform: translateX(-4px);
	}
</style>
