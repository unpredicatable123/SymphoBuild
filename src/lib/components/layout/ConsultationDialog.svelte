<script lang="ts">
	import { ui } from '$lib/state/ui.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import ConsultationForm from '$lib/components/forms/ConsultationForm.svelte';

	const title = $derived(ui.consultationContext.heading ?? 'Book a consultation or site visit');
</script>

<Dialog
	bind:open={ui.consultationOpen}
	{title}
	description="Tell us a little about what you have in mind. We confirm every booking personally within one working day."
>
	{#key ui.consultationContext}
		<ConsultationForm context={ui.consultationContext} />
	{/key}
</Dialog>
