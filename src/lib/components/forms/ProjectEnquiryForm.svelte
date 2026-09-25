<script lang="ts">
	import { page } from '$app/state';
	import type { ProjectOption, SiteSettings, Unit } from '$lib/types';
	import ChoiceGroup from './ChoiceGroup.svelte';
	import Field from './Field.svelte';
	import LeadForm from './LeadForm.svelte';

	type Props = {
		/** Pre-selected project. If omitted the visitor chooses one. */
		project?: { title: string; slug: string; units?: Unit[]; bedrooms?: number[] } | null;
		initial?: Parameters<typeof LeadForm>[1]['initial'];
	};
	let { project = null, initial = null }: Props = $props();

	const settings = $derived(page.data.settings as SiteSettings);
	const options = $derived(
		((page.data.projectOptions as ProjectOption[]) ?? [])
			.filter((p) => p.status !== 'completed')
			.map((p) => ({ value: p.slug, label: p.title }))
	);
	const unitOptions = $derived.by(() => {
		if (project?.units?.length) return project.units.map((u) => u.name);
		if (project?.bedrooms?.length) return project.bedrooms.map((b) => `${b} BHK`);
		return [];
	});
	const today = new Date().toISOString().slice(0, 10);
</script>

<LeadForm
	type="project"
	submitLabel="Request details & site visit"
	{initial}
	whatsappContext={project?.title}
>
	{#snippet fields({ errors, values })}
		{#if project}
			<input type="hidden" name="project" value={project.slug} />
		{:else}
			<Field
				name="project"
				label="Project"
				type="select"
				required
				{options}
				value={values.project}
				error={errors.project}
				placeholder="Choose a project"
			/>
		{/if}
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
			{#if unitOptions.length}
				<Field
					name="unitInterest"
					label="Preferred unit"
					type="select"
					options={unitOptions}
					value={values.unitInterest}
					placeholder="Not sure yet"
				/>
			{:else}
				<Field
					name="budget"
					label="Budget range"
					type="select"
					options={settings?.leadForms?.budgetOptions ?? []}
					value={values.budget}
					placeholder="Prefer not to say"
				/>
			{/if}
		</div>
		<ChoiceGroup
			name="visitType"
			legend="What would you like?"
			value={values.visitType}
			options={[
				{ value: 'siteVisit', label: 'Site visit' },
				{ value: 'call', label: 'Call back' },
				{ value: 'consultation', label: 'Studio meeting' }
			]}
		/>
		<div class="grid gap-5 sm:grid-cols-2">
			<Field
				name="preferredDate"
				label="Preferred date"
				type="date"
				min={today}
				value={values.preferredDate}
				error={errors.preferredDate}
			/>
			<div class="sm:pt-1">
				<ChoiceGroup
					name="preferredContact"
					legend="Contact me by"
					value={values.preferredContact}
					options={[
						{ value: 'phone', label: 'Phone' },
						{ value: 'whatsapp', label: 'WhatsApp' },
						{ value: 'email', label: 'Email' }
					]}
				/>
			</div>
		</div>
		<Field
			name="message"
			label="Questions or requirements"
			type="textarea"
			rows={3}
			value={values.message}
			error={errors.message}
		/>
	{/snippet}
</LeadForm>
