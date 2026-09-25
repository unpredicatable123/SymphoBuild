<!--
	Shared shell for every enquiry form.
	• Posts to /enquire?/<type> — works without JavaScript (server redirects to /thank-you
	  or re-renders with errors).
	• With JavaScript: inline submission, error summary that receives focus, and an
	  animated success state (with the brochure link for brochure requests).
	• Spam protection: honeypot field + minimum fill time, validated server-side.
-->
<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import { onMount, tick, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SiteSettings } from '$lib/types';
	import { whatsappLink } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';

	type Result = {
		ok: boolean;
		type: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
		message?: string;
		brochureUrl?: string | null;
		projectTitle?: string;
	};

	type Props = {
		type: 'consultation' | 'project' | 'landowner' | 'brochure';
		submitLabel?: string;
		/** Initial result — used by the no-JS /enquire fallback page. */
		initial?: Result | null;
		whatsappContext?: string;
		fields: Snippet<[{ errors: Record<string, string>; values: Record<string, string> }]>;
		onsuccess?: (r: Result) => void;
	};
	let {
		type,
		submitLabel = 'Send enquiry',
		initial = null,
		whatsappContext,
		fields,
		onsuccess
	}: Props = $props();

	const settings = $derived(page.data.settings as SiteSettings);
	let submitting = $state(false);
	// svelte-ignore state_referenced_locally
	let result = $state<Result | null>(initial);
	let summaryEl: HTMLDivElement | undefined = $state();
	let successEl: HTMLDivElement | undefined = $state();
	// Render timestamp for the minimum-fill-time spam check (client only).
	let renderedAt = $state(0);
	onMount(() => {
		renderedAt = Date.now();
	});

	const errors = $derived(result && !result.ok ? (result.errors ?? {}) : {});
	const values = $derived(result?.values ?? {});
	const errorCount = $derived(Object.keys(errors).length);
	const consentText = $derived(
		settings?.leadForms?.consentText ??
			'I agree to be contacted about this enquiry and have read the privacy policy.'
	);
	const uid = $props.id();
</script>

{#if result?.ok}
	<div
		bind:this={successEl}
		tabindex="-1"
		role="status"
		class="success flex flex-col items-start gap-5 rounded-md border border-sage-500/40 bg-sage-200/30 p-6 outline-none sm:p-8"
	>
		<span class="grid size-14 place-items-center rounded-full bg-sage-600 text-limestone-50">
			<svg
				viewBox="0 0 24 24"
				class="size-7"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" class="check-path" />
			</svg>
		</span>
		<div>
			<h3 class="font-display text-display-sm">
				{type === 'brochure'
					? 'Your brochure is ready.'
					: (settings?.leadForms?.successTitle ?? 'Thank you — we have your enquiry.')}
			</h3>
			<p class="mt-2 max-w-prose text-ink-700">
				{type === 'brochure'
					? 'Download it below. A member of our team may follow up to answer any questions.'
					: (settings?.leadForms?.successMessage ?? 'We will be in touch within one working day.')}
			</p>
		</div>
		<div class="flex flex-wrap gap-3">
			{#if type === 'brochure' && result.brochureUrl}
				<Button href={result.brochureUrl} target="_blank" rel="noopener" download arrow={false}>
					{#snippet icon()}<Download size={16} aria-hidden="true" />{/snippet}
					Download brochure
				</Button>
			{:else if type === 'brochure'}
				<p class="text-sm text-ink-600">
					The brochure is being updated — our team will send it to you directly.
				</p>
			{/if}
			{#if whatsappLink(settings, whatsappContext)}
				<Button
					href={whatsappLink(settings, whatsappContext)}
					variant="secondary"
					target="_blank"
					rel="noopener noreferrer"
				>
					Continue on WhatsApp
				</Button>
			{/if}
		</div>
	</div>
{:else}
	<form
		method="POST"
		action="/enquire?/{type}"
		novalidate
		class="flex flex-col gap-6"
		aria-describedby={result?.message || errorCount ? `${uid}-summary` : undefined}
		use:enhance={({ formData }) => {
			submitting = true;
			formData.set('referrer', document.referrer);
			return async ({ result: r }) => {
				submitting = false;
				if (r.type === 'success' && r.data) {
					result = r.data as Result;
					onsuccess?.(result);
					await tick();
					successEl?.focus();
				} else if (r.type === 'failure' && r.data) {
					result = r.data as Result;
					await tick();
					summaryEl?.focus();
				} else if (r.type === 'redirect') {
					result = { ok: true, type };
				} else {
					result = {
						ok: false,
						type,
						errors: {},
						values: Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)])),
						message:
							'Something went wrong while sending. Please try again, or contact us by phone or WhatsApp.'
					};
					await tick();
					summaryEl?.focus();
				}
			};
		}}
	>
		{#if result && !result.ok && (errorCount || result.message)}
			<div
				bind:this={summaryEl}
				id="{uid}-summary"
				tabindex="-1"
				role="alert"
				class="rounded-sm border-l-2 border-danger bg-[#f6dcd6]/60 p-5 text-ink-900 outline-none"
			>
				<p class="font-semibold">
					{result.message ??
						`Please check ${errorCount === 1 ? 'one field' : `${errorCount} fields`} below.`}
				</p>
				{#if errorCount}
					<ul class="mt-2 list-inside list-disc text-sm">
						{#each Object.entries(errors) as [field, msg] (field)}
							<li>{msg}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		{@render fields({ errors, values })}

		<!-- Honeypot: invisible to people, irresistible to bots -->
		<div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
			<label for="{uid}-website">Leave this field empty</label>
			<input id="{uid}-website" name="website" type="text" tabindex="-1" autocomplete="off" />
		</div>
		<input type="hidden" name="_ts" value={renderedAt || ''} />
		<input type="hidden" name="sourceRoute" value={page.url.pathname + page.url.search} />

		<div>
			<label class="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-700">
				<input
					type="checkbox"
					name="consent"
					required
					class="peer sr-only"
					aria-invalid={errors.consent ? 'true' : undefined}
					aria-describedby={errors.consent ? `${uid}-consent-error` : undefined}
				/>
				<span
					class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border border-ink-900/40 bg-limestone-50 text-transparent transition-colors peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-limestone-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-copper-500"
					aria-hidden="true"
				>
					<Check size={14} strokeWidth={3} />
				</span>
				<span>
					{consentText}
					<a
						href="/privacy-policy"
						class="font-semibold text-copper-600 underline underline-offset-2">Privacy policy</a
					>
				</span>
			</label>
			{#if errors.consent}<p id="{uid}-consent-error" class="field-error">{errors.consent}</p>{/if}
		</div>

		<div class="flex flex-wrap items-center gap-4">
			<Button type="submit" loading={submitting} size="lg">
				{submitting ? 'Sending…' : submitLabel}
			</Button>
			<p class="text-xs text-ink-500">Protected against spam. We never share your details.</p>
		</div>
	</form>
{/if}

<style>
	@media (prefers-reduced-motion: no-preference) {
		.success {
			animation: rise 0.8s var(--ease-out-expo) both;
		}
		.check-path {
			stroke-dasharray: 1;
			stroke-dashoffset: 1;
			animation: draw 0.9s var(--ease-out-quart) 0.25s forwards;
		}
	}
</style>
