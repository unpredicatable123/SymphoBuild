<!--
	Survey-reticle cursor companion (desktop, fine pointers only). The native cursor is
	never hidden — this ring augments it: it expands over links, becomes a labelled disc
	over media (`data-cursor="media" data-cursor-label="View"`), and eases with a spring.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hasFinePointer, prefersReducedMotion } from '$lib/motion/actions';

	let el: HTMLDivElement | undefined = $state();
	let mode = $state<'default' | 'link' | 'media'>('default');
	let label = $state('');
	let active = $state(false);
	let shown = $state(false);

	onMount(() => {
		if (!hasFinePointer()) return;
		active = true;
		const reduced = prefersReducedMotion();
		let x = -100;
		let y = -100;
		let tx = -100;
		let ty = -100;
		let raf = 0;
		const loop = () => {
			x += (tx - x) * (reduced ? 1 : 0.2);
			y += (ty - y) * (reduced ? 1 : 0.2);
			if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
			raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(loop) : 0;
		};
		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			tx = e.clientX;
			ty = e.clientY;
			shown = true;
			if (!raf) raf = requestAnimationFrame(loop);
			const target = (e.target as Element | null)?.closest?.(
				'[data-cursor], a, button, summary, label, select, input, textarea'
			);
			const kind = target?.getAttribute('data-cursor');
			if (kind === 'media') {
				mode = 'media';
				label = target?.getAttribute('data-cursor-label') ?? 'View';
			} else if (target) {
				mode = 'link';
			} else mode = 'default';
		};
		const onLeave = () => (shown = false);
		window.addEventListener('pointermove', onMove, { passive: true });
		document.documentElement.addEventListener('pointerleave', onLeave);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			document.documentElement.removeEventListener('pointerleave', onLeave);
		};
	});
</script>

{#if active}
	<div
		bind:this={el}
		class="pointer-events-none fixed top-0 left-0 z-[100]"
		aria-hidden="true"
		style:opacity={shown ? 1 : 0}
	>
		<div class="cursor" data-mode={mode}>
			<span class="label">{label}</span>
		</div>
	</div>
{/if}

<style>
	.cursor {
		position: absolute;
		left: 0;
		top: 0;
		width: 34px;
		height: 34px;
		margin: -17px 0 0 -17px;
		border-radius: 999px;
		border: 1px solid rgb(244 239 230 / 0.9);
		mix-blend-mode: difference;
		display: grid;
		place-items: center;
		transition:
			width 0.45s var(--ease-out-expo),
			height 0.45s var(--ease-out-expo),
			margin 0.45s var(--ease-out-expo),
			background-color 0.3s ease,
			border-color 0.3s ease;
	}
	.cursor::before,
	.cursor::after {
		content: '';
		position: absolute;
		background: rgb(244 239 230 / 0.9);
		transition: opacity 0.3s ease;
	}
	.cursor::before {
		width: 1px;
		height: 8px;
	}
	.cursor::after {
		width: 8px;
		height: 1px;
	}
	.cursor[data-mode='link'] {
		width: 56px;
		height: 56px;
		margin: -28px 0 0 -28px;
	}
	.cursor[data-mode='link']::before,
	.cursor[data-mode='link']::after,
	.cursor[data-mode='media']::before,
	.cursor[data-mode='media']::after {
		opacity: 0;
	}
	.cursor[data-mode='media'] {
		width: 92px;
		height: 92px;
		margin: -46px 0 0 -46px;
		mix-blend-mode: normal;
		background: var(--color-copper-600);
		border-color: transparent;
	}
	.label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-limestone-50);
		opacity: 0;
		transition: opacity 0.25s ease;
	}
	.cursor[data-mode='media'] .label {
		opacity: 1;
	}
</style>
