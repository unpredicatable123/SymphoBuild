<!-- Radio group rendered as selectable chips, inside a proper fieldset/legend. -->
<script lang="ts">
	import { cx } from '$lib/utils';

	type Props = {
		name: string;
		legend: string;
		options: { value: string; label: string }[];
		value?: string;
		error?: string;
		class?: string;
	};
	let { name, legend, options, value, error, class: className = '' }: Props = $props();
	const uid = $props.id();
</script>

<fieldset class={cx('min-w-0', className)} aria-describedby={error ? `${uid}-error` : undefined}>
	<legend class="field-label">{legend}</legend>
	<div class="flex flex-wrap gap-2">
		{#each options as opt, i (opt.value)}
			<label
				class="relative inline-flex min-h-11 cursor-pointer items-center rounded-pill border border-ink-900/20 bg-limestone-50 px-4 text-sm font-medium transition-colors duration-200 hover:border-ink-900/50 has-checked:border-ink-900 has-checked:bg-ink-900 has-checked:text-limestone-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-copper-500"
			>
				<input
					type="radio"
					{name}
					value={opt.value}
					checked={value ? value === opt.value : i === 0}
					class="sr-only"
				/>
				{opt.label}
			</label>
		{/each}
	</div>
	{#if error}<p id="{uid}-error" class="field-error">{error}</p>{/if}
</fieldset>
