<!--
	Renders a CMS-managed CTA. `action` decides the behaviour:
	  link          → plain link
	  consultation  → opens the booking dialog (falls back to /contact#consultation without JS)
	  whatsapp      → opens WhatsApp with a contextual, pre-filled message
-->
<script lang="ts">
	import { page } from '$app/state';
	import { ui, type EnquiryContext } from '$lib/state/ui.svelte';
	import type { Cta, SiteSettings } from '$lib/types';
	import { isExternal, whatsappLink } from '$lib/utils';
	import Button from './Button.svelte';

	type Props = {
		cta: Cta | null | undefined;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'primary' | 'secondary' | 'ghost' | 'light' | 'outline-light';
		context?: EnquiryContext & { label?: string };
		class?: string;
	};
	let { cta, size = 'md', variant, context = {}, class: className }: Props = $props();

	const settings = $derived(page.data.settings as SiteSettings | undefined);
	const action = $derived(cta?.action ?? 'link');
	const href = $derived.by(() => {
		if (!cta) return '/';
		if (action === 'whatsapp') return whatsappLink(settings, context.label) ?? '/contact';
		if (action === 'consultation') return cta.href || '/contact#consultation';
		return cta.href || '/';
	});
	const external = $derived(action === 'whatsapp' || isExternal(href));

	function onclick(e: MouseEvent) {
		if (action !== 'consultation' || e.metaKey || e.ctrlKey || e.shiftKey) return;
		e.preventDefault();
		ui.openConsultation(context);
	}
</script>

{#if cta?.label}
	<Button
		{href}
		{size}
		variant={variant ?? cta.variant ?? 'primary'}
		class={className}
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
		aria-haspopup={action === 'consultation' ? 'dialog' : undefined}
		{onclick}
	>
		{cta.label}
		{#if external}<span class="sr-only"> (opens in a new tab)</span>{/if}
	</Button>
{/if}
