<script lang="ts">
	import type { ProjectStatus } from '$lib/types';
	import { STATUS_LABELS, cx } from '$lib/utils';

	let { status, class: className = '' }: { status: ProjectStatus; class?: string } = $props();

	const tones: Record<ProjectStatus, string> = {
		upcoming: 'bg-limestone-50/95 text-ink-900 [--dot:var(--color-copper-500)]',
		ongoing: 'bg-copper-600 text-limestone-50 [--dot:var(--color-limestone-50)]',
		completed: 'bg-ink-900/90 text-limestone-100 [--dot:var(--color-sage-300)]',
		ready: 'bg-sage-600 text-limestone-50 [--dot:var(--color-limestone-50)]'
	};
</script>

<span
	class={cx(
		'inline-flex items-center gap-2 rounded-pill px-3 py-1.5 font-mono text-label uppercase backdrop-blur-sm',
		tones[status],
		className
	)}
>
	<span class="relative flex size-1.5" aria-hidden="true">
		{#if status === 'ongoing'}
			<span
				class="absolute inset-0 animate-ping rounded-full bg-(--dot) opacity-60 motion-reduce:hidden"
			></span>
		{/if}
		<span class="relative size-1.5 rounded-full bg-(--dot)"></span>
	</span>
	{STATUS_LABELS[status]}
</span>
