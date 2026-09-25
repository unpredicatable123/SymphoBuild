<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cx } from '$lib/utils';

	type Props = {
		name: string;
		label: string;
		type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea' | 'select';
		options?: (string | { value: string; label: string })[];
		value?: string;
		error?: string;
		hint?: string;
		required?: boolean;
		placeholder?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		inputmode?: HTMLInputAttributes['inputmode'];
		min?: string;
		max?: string;
		rows?: number;
		class?: string;
	};
	let {
		name,
		label,
		type = 'text',
		options = [],
		value = '',
		error,
		hint,
		required = false,
		placeholder,
		autocomplete,
		inputmode,
		min,
		max,
		rows = 4,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const id = $derived(`${uid}-${name}`);
	const describedBy = $derived(
		[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
	);
	const opts = $derived(options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
</script>

<div class={cx('min-w-0', className)}>
	<label for={id} class="field-label">
		{label}
		{#if required}<span class="text-copper-600" aria-hidden="true"> *</span>{:else}<span
				class="font-normal text-ink-500"
			>
				(optional)</span
			>{/if}
	</label>
	{#if type === 'textarea'}
		<textarea
			{id}
			{name}
			{rows}
			{required}
			{placeholder}
			class="field-input resize-y"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			maxlength="2000">{value}</textarea
		>
	{:else if type === 'select'}
		<select
			{id}
			{name}
			{required}
			class="field-input"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
		>
			<option value="" disabled={required} selected={!value}
				>{placeholder ?? 'Select an option'}</option
			>
			{#each opts as opt (opt.value)}
				<option value={opt.value} selected={opt.value === value}>{opt.label}</option>
			{/each}
		</select>
	{:else}
		<input
			{id}
			{name}
			{type}
			{value}
			{required}
			{placeholder}
			{autocomplete}
			{inputmode}
			{min}
			{max}
			class="field-input"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
		/>
	{/if}
	{#if hint}<p id="{id}-hint" class="field-hint">{hint}</p>{/if}
	{#if error}
		<p id="{id}-error" class="field-error"><CircleAlert size={14} aria-hidden="true" />{error}</p>
	{/if}
</div>
