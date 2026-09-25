<!--
	Modal built on native <dialog>.showModal(): focus is trapped and restored by the
	browser, Escape closes it, and the rest of the page becomes inert.
-->
<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import { cx } from '$lib/utils';

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		onclose?: () => void;
		size?: 'md' | 'lg' | 'full';
		dark?: boolean;
		hideTitle?: boolean;
		class?: string;
		children: Snippet;
	};
	let {
		open = $bindable(),
		title,
		description,
		onclose,
		size = 'md',
		dark = false,
		hideTitle = false,
		class: className = '',
		children
	}: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const id = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			document.documentElement.style.overflow = 'hidden';
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	function handleClose() {
		document.documentElement.style.overflow = '';
		open = false;
		onclose?.();
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === dialog) dialog?.close();
	}

	const widths = { md: 'max-w-2xl', lg: 'max-w-5xl', full: 'max-w-none h-full' };
</script>

<dialog
	bind:this={dialog}
	onclose={handleClose}
	onclick={onBackdrop}
	aria-labelledby="{id}-title"
	aria-describedby={description ? `${id}-desc` : undefined}
	class={cx(
		'dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-lg p-0 shadow-lift',
		dark ? 'on-dark bg-ink-900 text-limestone-100' : 'bg-limestone-50 text-ink-900',
		widths[size],
		className
	)}
>
	<div class="relative p-6 sm:p-10">
		<div class="mb-6 flex items-start justify-between gap-6">
			<div class={hideTitle ? 'sr-only' : ''}>
				<h2 id="{id}-title" class="font-display text-display-sm">{title}</h2>
				{#if description}
					<p id="{id}-desc" class="mt-2 text-ink-600 [.on-dark_&]:text-limestone-300">
						{description}
					</p>
				{/if}
			</div>
			<button
				type="button"
				class="ml-auto grid size-11 shrink-0 place-items-center rounded-full border border-current/20 transition-colors hover:bg-ink-900 hover:text-limestone-50"
				onclick={() => dialog?.close()}
				aria-label="Close dialog"
			>
				<X size={18} aria-hidden="true" />
			</button>
		</div>
		{@render children()}
	</div>
</dialog>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.dialog[open] {
			animation: dialog-in 0.55s var(--ease-out-expo);
		}
		.dialog[open]::backdrop {
			animation: backdrop-in 0.4s ease;
		}
	}
	@keyframes dialog-in {
		from {
			opacity: 0;
			transform: translate3d(0, 2rem, 0) scale(0.98);
		}
	}
	@keyframes backdrop-in {
		from {
			opacity: 0;
		}
	}
</style>
