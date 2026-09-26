<!--
	Primary interactive element. Renders <a> when `href` is set, otherwise <button>.
	Hover: a liquid fill rises from the baseline, the arrow slides through, and
	primary buttons are gently magnetic on fine pointers.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { magnetic } from '$lib/motion/actions';
	import { cx } from '$lib/utils';

	type Common = {
		variant?: 'primary' | 'secondary' | 'ghost' | 'light' | 'outline-light';
		size?: 'sm' | 'md' | 'lg';
		arrow?: boolean;
		loading?: boolean;
		class?: string;
		children: Snippet;
		icon?: Snippet;
	};
	type Props = Common &
		(
			| ({ href: string } & Omit<HTMLAnchorAttributes, 'class' | 'children'>)
			| ({ href?: undefined } & Omit<HTMLButtonAttributes, 'class' | 'children'>)
		);

	let {
		variant = 'primary',
		size = 'md',
		arrow = true,
		loading = false,
		class: className = '',
		children,
		icon,
		...rest
	}: Props = $props();

	const base =
		'group/btn relative isolate inline-flex items-center justify-center gap-3 overflow-hidden rounded-pill font-semibold tracking-tight whitespace-nowrap transition-[color,border-color,box-shadow] duration-300 ease-out-expo select-none disabled:pointer-events-none disabled:opacity-60';
	const sizes = {
		sm: 'min-h-10 px-4 text-sm',
		md: 'min-h-12 px-6 text-[0.95rem]',
		lg: 'min-h-14 px-7 text-base sm:min-h-16 sm:px-8'
	};
	const variants = {
		primary:
			'bg-copper-600 text-limestone-50 shadow-glow [--fill:var(--color-ink-900)] hover:text-limestone-50',
		secondary:
			'border border-ink-900/25 bg-transparent text-ink-900 [--fill:var(--color-ink-900)] hover:border-ink-900 hover:text-limestone-50',
		ghost: 'px-0! text-ink-900 [--fill:transparent] hover:text-copper-600',
		light: 'bg-limestone-50 text-ink-900 [--fill:var(--color-copper-500)] hover:text-limestone-50',
		'outline-light':
			'border border-limestone-100/35 text-limestone-50 [--fill:var(--color-limestone-50)] hover:border-limestone-50 hover:text-ink-900'
	};
	const cls = $derived(cx(base, sizes[size], variants[variant], className));
</script>

{#snippet inner()}
	<span
		aria-hidden="true"
		class="absolute inset-0 -z-10 translate-y-[101%] rounded-[inherit] bg-(--fill) transition-transform duration-500 ease-out-expo group-hover/btn:translate-y-0 group-focus-visible/btn:translate-y-0"
	></span>
	<span data-magnetic-inner class="inline-flex items-center gap-3">
		{#if loading}
			<span
				class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				aria-hidden="true"
			></span>
		{:else if icon}
			{@render icon()}
		{/if}
		<span>{@render children()}</span>
		{#if arrow && !loading}
			<span class="relative inline-flex size-4 overflow-hidden" aria-hidden="true">
				<ArrowUpRight
					size={16}
					class="absolute inset-0 transition-transform duration-500 ease-out-expo group-hover/btn:translate-x-full group-hover/btn:-translate-y-full"
				/>
				<ArrowUpRight
					size={16}
					class="absolute inset-0 -translate-x-full translate-y-full transition-transform duration-500 ease-out-expo group-hover/btn:translate-0"
				/>
			</span>
		{/if}
	</span>
{/snippet}

{#if rest.href !== undefined}
	<a
		{...rest as HTMLAnchorAttributes}
		class={cls}
		use:magnetic={{ strength: variant === 'primary' ? 0.25 : 0.15 }}
	>
		{@render inner()}
	</a>
{:else}
	<button
		{...rest as HTMLButtonAttributes}
		class={cls}
		aria-busy={loading || undefined}
		use:magnetic={{ strength: variant === 'primary' ? 0.25 : 0.15 }}
	>
		{@render inner()}
	</button>
{/if}
