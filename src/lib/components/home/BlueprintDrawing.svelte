<!--
	Isometric line drawing of the same two-block building the 3D scene constructs.
	Serves as the poster while WebGL loads, the fallback where WebGL is unavailable,
	and a recurring motif elsewhere (CTA, 404).
-->
<script lang="ts">
	import { reveal } from '$lib/motion/actions';
	import { cx } from '$lib/utils';

	let {
		class: className = '',
		floors = 14,
		animate = true
	}: { class?: string; floors?: number; animate?: boolean } = $props();

	const C = Math.cos(Math.PI / 6);
	const S = Math.sin(Math.PI / 6);
	const iso = (x: number, y: number, z: number) => [(x - z) * C, (x + z) * S - y] as const;
	const pt = (x: number, y: number, z: number) =>
		iso(x, y, z)
			.map((n) => n.toFixed(2))
			.join(' ');

	const FH = 1.3;
	const blocks = $derived([
		{ x: -8.5, z: -5, w: 12, d: 10, floors },
		{ x: 5.5, z: -2.5, w: 7, d: 8, floors: Math.round(floors * 0.45) }
	]);

	const paths = $derived.by(() => {
		const out: string[] = [];
		// site boundary
		out.push(`M${pt(-17, 0, -12)} L${pt(21, 0, -12)} L${pt(21, 0, 14)} L${pt(-17, 0, 14)} Z`);
		for (const b of blocks) {
			const H = b.floors * FH;
			const x1 = b.x + b.w;
			const z1 = b.z + b.d;
			// verticals on visible corners
			for (const [x, z] of [
				[b.x, z1],
				[x1, z1],
				[x1, b.z]
			])
				out.push(`M${pt(x, 0, z)} L${pt(x, H, z)}`);
			// floor lines on the two visible faces
			for (let f = 0; f <= b.floors; f++) {
				const y = f * FH;
				out.push(`M${pt(b.x, y, z1)} L${pt(x1, y, z1)} L${pt(x1, y, b.z)}`);
			}
			// roof
			out.push(`M${pt(b.x, H, b.z)} L${pt(x1, H, b.z)} L${pt(x1, H, z1)} L${pt(b.x, H, z1)} Z`);
			// fins
			for (let x = b.x + 0.6; x < x1; x += 1.2)
				out.push(`M${pt(x, 0, z1 + 0.3)} L${pt(x, H, z1 + 0.3)}`);
		}
		return out;
	});
	const viewBox = '-24 -24 48 36';
</script>

<svg
	{viewBox}
	class={cx('overflow-visible', className)}
	fill="none"
	aria-hidden="true"
	use:reveal={{ mode: animate ? 'draw' : 'fade' }}
>
	<g stroke="currentColor" stroke-width="0.06" stroke-linecap="round">
		{#each paths as d, i (i)}
			{#if i === 0}
				<path {d} opacity="0.5" stroke-dasharray="0.6 0.4" />
			{:else}
				<path {d} pathLength="1" class="draw-path" style:--i={Math.min(i, 30)} opacity="0.9" />
			{/if}
		{/each}
	</g>
</svg>
