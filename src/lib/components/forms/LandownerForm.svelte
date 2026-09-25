<script lang="ts">
	import ChoiceGroup from './ChoiceGroup.svelte';
	import Field from './Field.svelte';
	import LeadForm from './LeadForm.svelte';

	let { initial = null }: { initial?: Parameters<typeof LeadForm>[1]['initial'] } = $props();
</script>

<LeadForm
	type="landowner"
	submitLabel="Check eligibility"
	{initial}
	whatsappContext="a joint development for my land"
>
	{#snippet fields({ errors, values })}
		<fieldset class="flex flex-col gap-5">
			<legend class="mb-4 font-mono text-label text-ink-500 uppercase">01 — About the land</legend>
			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					name="landLocation"
					label="Land location / survey details"
					required
					value={values.landLocation}
					error={errors.landLocation}
					placeholder="Street, village or survey number"
				/>
				<Field name="city" label="Town or city" required value={values.city} error={errors.city} />
			</div>
			<div class="grid gap-5 sm:grid-cols-[1fr_auto]">
				<Field
					name="landArea"
					label="Land area"
					type="number"
					required
					inputmode="decimal"
					min="0"
					value={values.landArea}
					error={errors.landArea}
				/>
				<Field
					name="areaUnit"
					label="Unit"
					type="select"
					required
					value={values.areaUnit ?? 'cents'}
					options={[
						{ value: 'cents', label: 'Cents' },
						{ value: 'acres', label: 'Acres' },
						{ value: 'grounds', label: 'Grounds' },
						{ value: 'sqft', label: 'Sq ft' }
					]}
				/>
			</div>
			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					name="dimensions"
					label="Dimensions"
					value={values.dimensions}
					placeholder="e.g. 80 ft × 120 ft"
					error={errors.dimensions}
				/>
				<Field
					name="roadWidth"
					label="Access road width"
					value={values.roadWidth}
					placeholder="e.g. 30 ft"
					error={errors.roadWidth}
				/>
			</div>
			<Field
				name="ownership"
				label="Ownership status"
				type="select"
				required
				value={values.ownership}
				error={errors.ownership}
				options={[
					'Single owner, clear title',
					'Joint / family ownership',
					'Legal heirs (succession pending)',
					'Company or trust owned',
					'Not sure — need advice'
				]}
			/>
			<ChoiceGroup
				name="partnershipType"
				legend="Partnership preference"
				value={values.partnershipType}
				error={errors.partnershipType}
				options={[
					{ value: 'Joint development — area share', label: 'JV — area share' },
					{ value: 'Joint development — revenue share', label: 'JV — revenue share' },
					{ value: 'Outright sale', label: 'Outright sale' },
					{ value: 'Open to advice', label: 'Open to advice' }
				]}
			/>
		</fieldset>
		<fieldset class="flex flex-col gap-5">
			<legend class="mb-4 font-mono text-label text-ink-500 uppercase">02 — Your details</legend>
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
					name="preferredContact"
					label="Contact me by"
					type="select"
					required
					value={values.preferredContact ?? 'phone'}
					options={[
						{ value: 'phone', label: 'Phone' },
						{ value: 'whatsapp', label: 'WhatsApp' },
						{ value: 'email', label: 'Email' }
					]}
				/>
			</div>
			<Field
				name="message"
				label="Anything else about the land?"
				type="textarea"
				rows={3}
				value={values.message}
				error={errors.message}
			/>
		</fieldset>
	{/snippet}
</LeadForm>
