<script lang="ts">
	import { page } from '$app/state';
	import type { EnquiryContext } from '$lib/state/ui.svelte';
	import type { SiteSettings } from '$lib/types';
	import ChoiceGroup from './ChoiceGroup.svelte';
	import Field from './Field.svelte';
	import LeadForm from './LeadForm.svelte';

	type Props = { context?: EnquiryContext; initial?: Parameters<typeof LeadForm>[1]['initial'] };
	let { context = {}, initial = null }: Props = $props();

	const settings = $derived(page.data.settings as SiteSettings);
	const interests = $derived(
		settings?.leadForms?.interestOptions ?? ['Apartment', 'Villa', 'Plot', 'Something else']
	);
	const budgets = $derived(settings?.leadForms?.budgetOptions ?? []);
	const today = new Date().toISOString().slice(0, 10);
	const maxDate = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
</script>

<LeadForm
	type="consultation"
	submitLabel="Request consultation"
	{initial}
	whatsappContext={context.project ?? context.service}
>
	{#snippet fields({ errors, values })}
		{#if context.project}<input type="hidden" name="project" value={context.project} />{/if}
		{#if context.service}<input type="hidden" name="service" value={context.service} />{/if}
		<div class="grid gap-5 sm:grid-cols-2">
			<Field
				name="name"
				label="Full name"
				required
				autocomplete="name"
				value={values.name}
				error={errors.name}
			/>
			<Field
				name="phone"
				label="Phone"
				type="tel"
				required
				autocomplete="tel"
				inputmode="tel"
				placeholder="+91"
				value={values.phone}
				error={errors.phone}
			/>
			<Field
				name="email"
				label="Email"
				type="email"
				autocomplete="email"
				value={values.email}
				error={errors.email}
			/>
			<Field
				name="interest"
				label="I'm interested in"
				type="select"
				required
				options={interests}
				value={values.interest ?? context.interest}
				error={errors.interest}
			/>
		</div>
		<ChoiceGroup
			name="visitType"
			legend="How would you like to meet?"
			value={values.visitType}
			error={errors.visitType}
			options={[
				{ value: 'consultation', label: 'Studio consultation' },
				{ value: 'siteVisit', label: 'Site visit' },
				{ value: 'call', label: 'Phone / video call' }
			]}
		/>
		<div class="grid gap-5 sm:grid-cols-2">
			<Field
				name="preferredDate"
				label="Preferred date"
				type="date"
				min={today}
				max={maxDate}
				value={values.preferredDate}
				error={errors.preferredDate}
				hint="We'll confirm a time by phone."
			/>
			<Field
				name="budget"
				label="Budget range"
				type="select"
				options={budgets}
				value={values.budget}
				error={errors.budget}
				placeholder="Prefer not to say"
			/>
		</div>
		<ChoiceGroup
			name="preferredContact"
			legend="Preferred contact method"
			value={values.preferredContact}
			options={[
				{ value: 'phone', label: 'Phone call' },
				{ value: 'whatsapp', label: 'WhatsApp' },
				{ value: 'email', label: 'Email' }
			]}
		/>
		<Field
			name="message"
			label="Anything we should know?"
			type="textarea"
			rows={3}
			value={values.message}
			error={errors.message}
		/>
	{/snippet}
</LeadForm>
