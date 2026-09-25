<script lang="ts">
	import Field from './Field.svelte';
	import LeadForm from './LeadForm.svelte';

	type Props = {
		project: { title: string; slug: string };
		initial?: Parameters<typeof LeadForm>[1]['initial'];
	};
	let { project, initial = null }: Props = $props();
</script>

<LeadForm type="brochure" submitLabel="Get the brochure" {initial} whatsappContext={project.title}>
	{#snippet fields({ errors, values })}
		<input type="hidden" name="project" value={project.slug} />
		<Field
			name="name"
			label="Full name"
			required
			autocomplete="name"
			value={values.name}
			error={errors.name}
		/>
		<div class="grid gap-5 sm:grid-cols-2">
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
		</div>
	{/snippet}
</LeadForm>
