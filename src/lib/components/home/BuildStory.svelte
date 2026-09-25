<!--
	Home hero + "From drawing board to door key" process timeline, sharing one sticky
	3D stage. Scrolling through the Sanity-managed process steps constructs the building.

	Progressive layers:
	  1. SSR / no-JS  → hero + steps in normal flow over an SVG blueprint drawing
	  2. JS, no WebGL → same, with the drawing animating in
	  3. WebGL        → the procedural TowerScene (lazy-loaded after first paint)
	Reduced motion keeps the stage-by-stage construction but fixes the camera.
-->
<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import { onMount } from 'svelte';
	import type { HomePage } from '$lib/types';
	import { cx } from '$lib/utils';
	import { prefersReducedMotion, reveal } from '$lib/motion/actions';
	import CtaButton from '$lib/components/ui/CtaButton.svelte';
	import SplitText from '$lib/components/ui/SplitText.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import BlueprintDrawing from './BlueprintDrawing.svelte';

	let { hero, process }: { hero: HomePage['hero']; process: HomePage['process'] } = $props();

	const steps = $derived(process?.steps ?? []);
	const mode = $derived(hero?.mediaMode ?? 'scene');

	let section: HTMLElement | undefined = $state();
	let heroEl: HTMLElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let stepEls: HTMLElement[] = $state([]);
	let sceneReady = $state(false);
	let active = $state(-1);
	let heroProgress = $state(0);

	// Stage → build-progress windows (mirrors PHASES in tower-scene.ts, kept here so the
	// three.js chunk is not needed to compute layout).
	const PHASES: Record<string, [number, number]> = {
		design: [0, 0.16],
		approvals: [0.16, 0.32],
		foundation: [0.24, 0.36],
		structure: [0.32, 0.55],
		envelope: [0.55, 0.72],
		finishes: [0.72, 0.88],
		handover: [0.88, 1]
	};

	onMount(() => {
		if (!section || !heroEl) return;
		type Scene = import('$lib/three/tower-scene').TowerScene;
		let scene: Scene | undefined;
		let disposed = false;
		let raf = 0;

		const measure = () => {
			raf = 0;
			const vh = window.innerHeight;
			const hr = heroEl!.getBoundingClientRect();
			heroProgress = Math.min(1, Math.max(0, -hr.top / (hr.height * 0.85)));
			let idx = -1;
			let frac = 0;
			const line = vh * 0.55;
			stepEls.forEach((el, i) => {
				const r = el.getBoundingClientRect();
				if (r.top <= line) {
					idx = i;
					frac = Math.min(1, Math.max(0, (line - r.top) / r.height));
				}
			});
			active = idx;
			let build = 0;
			if (idx >= 0) {
				const step = steps[idx];
				const win = (step?.stage && PHASES[step.stage]) || [
					idx / steps.length,
					(idx + 1) / steps.length
				];
				build = win[0] + (win[1] - win[0]) * frac;
			}
			scene?.setHero(heroProgress);
			scene?.setBuild(build);
		};
		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(measure);
		};
		const onPointer = (e: PointerEvent) => {
			scene?.setPointer(
				(e.clientX / window.innerWidth) * 2 - 1,
				(e.clientY / window.innerHeight) * 2 - 1
			);
		};

		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule, { passive: true });
		measure();

		const io = new IntersectionObserver(([entry]) => scene?.setVisible(entry.isIntersecting));
		io.observe(section);

		const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
			.connection;
		const canUseScene = mode === 'scene' && canvas && !connection?.saveData;

		const init = async () => {
			if (!canUseScene || disposed) return;
			const { TowerScene, supportsWebGL } = await import('$lib/three/tower-scene');
			if (disposed || !supportsWebGL() || !canvas) return;
			const nav = navigator as Navigator & { deviceMemory?: number };
			const weak =
				window.innerWidth < 768 ||
				(nav.hardwareConcurrency ?? 8) <= 4 ||
				(nav.deviceMemory ?? 8) <= 4;
			try {
				scene = new TowerScene(canvas, {
					quality: weak ? 'low' : 'high',
					reducedMotion: prefersReducedMotion(),
					layout: window.innerWidth >= 1024 ? 'split' : 'center',
					onError: () => (sceneReady = false)
				});
				const resize = () => {
					const r = canvas!.getBoundingClientRect();
					scene?.setLayout(window.innerWidth >= 1024 ? 'split' : 'center');
					scene?.resize(r.width, r.height);
				};
				resize();
				ro.observe(canvas);
				window.addEventListener('pointermove', onPointer, { passive: true });
				measure();
				requestAnimationFrame(() => (sceneReady = true));
			} catch {
				sceneReady = false;
			}
		};
		const ro = new ResizeObserver(() => {
			if (!scene || !canvas) return;
			const r = canvas.getBoundingClientRect();
			scene.setLayout(window.innerWidth >= 1024 ? 'split' : 'center');
			scene.resize(r.width, r.height);
		});
		// Defer the 3D chunk until the browser is idle so it never competes with LCP.
		const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
		idle(() => void init());

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			io.disconnect();
			ro.disconnect();
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			window.removeEventListener('pointermove', onPointer);
			scene?.dispose();
		};
	});
</script>

<section
	bind:this={section}
	class="on-dark relative bg-ink-900 text-limestone-50"
	aria-label="Introduction and construction process"
>
	<!-- Sticky stage: 3D scene / blueprint poster, with HUD overlays -->
	<div class="sticky top-0 -mb-[100svh] h-svh overflow-hidden" aria-hidden="true">
		{#if mode === 'image' && hero?.image}
			<Img
				image={hero.image}
				priority
				sizes="100vw"
				class="absolute inset-0 h-full w-full opacity-70"
			/>
		{:else if mode === 'video' && hero?.videoUrl}
			<video
				class="absolute inset-0 h-full w-full object-cover opacity-60"
				src={hero.videoUrl}
				autoplay
				muted
				loop
				playsinline
				preload="metadata"
			></video>
		{:else}
			<div class="blueprint-grid absolute inset-0"></div>
			<div
				class={cx(
					'absolute inset-0 flex items-start justify-center pt-[14svh] text-copper-400 transition-opacity duration-1000 lg:items-center lg:justify-end lg:pt-0 lg:pr-[6vw]',
					sceneReady && 'opacity-0'
				)}
			>
				<BlueprintDrawing class="w-[min(92vw,34rem)] lg:w-[min(46vw,44rem)]" />
			</div>
			<canvas
				bind:this={canvas}
				class={cx(
					'absolute inset-0 h-full w-full transition-opacity duration-[1600ms] ease-out',
					sceneReady ? 'opacity-100' : 'opacity-0'
				)}
			></canvas>
		{/if}
		<!-- legibility gradients -->
		<div
			class="absolute inset-0 bg-linear-to-t from-ink-900 via-ink-900/35 to-transparent lg:bg-linear-to-r lg:from-ink-900/90 lg:via-ink-900/30"
		></div>
		<div class="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink-900/80 to-transparent"></div>

		<!-- HUD: drawing-sheet title block -->
		<div
			class="absolute top-[calc(var(--spacing-header)+1.25rem)] right-gutter hidden text-right font-mono text-label text-limestone-300 uppercase md:block"
		>
			<p>Drawing SB—01 · Scale 1:500</p>
			{#if hero?.coordinatesLabel}<p class="mt-1 text-limestone-400">
					{hero.coordinatesLabel}
				</p>{/if}
		</div>

		<!-- Stage rail (desktop) -->
		{#if steps.length}
			<ol class="absolute top-1/2 right-gutter hidden -translate-y-1/2 flex-col gap-3 xl:flex">
				{#each steps as step, i (step._key)}
					<li
						class={cx(
							'flex items-center justify-end gap-3 font-mono text-label uppercase transition-colors duration-500',
							i === active ? 'text-copper-300' : 'text-limestone-100/35'
						)}
					>
						<span
							class={cx(
								'rounded-xs bg-ink-900/80 px-2 py-1 backdrop-blur-sm transition-opacity duration-500',
								i === active ? 'opacity-100' : 'opacity-0'
							)}>{step.title}</span
						>
						<span
							class={cx(
								'h-px transition-all duration-700 ease-out-expo',
								i === active ? 'w-10 bg-copper-400' : 'w-4 bg-current'
							)}
						></span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<div class="relative z-10">
		<!-- Hero -->
		<header
			bind:this={heroEl}
			class="container-page flex min-h-svh flex-col justify-end pt-36 pb-16 sm:pb-24"
		>
			<div class="max-w-3xl lg:max-w-[44vw]">
				{#if hero?.eyebrow}<p class="sheet-label mb-8" use:reveal>{hero.eyebrow}</p>{/if}
				<SplitText
					as="h1"
					text={hero?.headline ?? 'Sympho Build'}
					class="text-display-2xl font-light tracking-[-0.04em] text-balance [&_.split-word:nth-last-child(-n+2)]:italic"
				/>
				{#if hero?.intro}
					<p class="mt-8 max-w-xl text-lede text-limestone-200" use:reveal={{ delay: 350 }}>
						{hero.intro}
					</p>
				{/if}
				<div class="mt-10 flex flex-wrap gap-3" use:reveal={{ delay: 500 }}>
					<CtaButton cta={hero?.primaryCta} size="lg" variant="primary" />
					<CtaButton cta={hero?.secondaryCta} size="lg" variant="outline-light" />
				</div>
			</div>
			<a
				href="#process"
				class="mt-16 inline-flex items-center gap-3 self-start font-mono text-label text-limestone-300 uppercase"
				style:opacity={1 - heroProgress * 2}
			>
				<span
					class="relative grid size-10 place-items-center overflow-hidden rounded-full border border-limestone-100/30"
				>
					<ArrowDown size={14} class="scroll-cue" aria-hidden="true" />
				</span>
				Scroll to build
			</a>
		</header>

		<!-- Process timeline -->
		{#if steps.length}
			<div id="process" class="container-page pt-section-sm pb-[30svh]">
				<div class="max-w-xl">
					<p class="sheet-label" use:reveal>Our process</p>
					{#if process?.heading}
						<SplitText text={process.heading} class="mt-6 text-display-lg font-light" />
					{/if}
					{#if process?.intro}<p class="mt-6 text-lede text-limestone-300" use:reveal>
							{process.intro}
						</p>{/if}
				</div>
				<ol class="mt-[20svh] flex flex-col">
					{#each steps as step, i (step._key)}
						<li
							bind:this={stepEls[i]}
							id="stage-{i + 1}"
							class="flex min-h-[110svh] items-end pb-[42svh] lg:min-h-[95svh] lg:items-center lg:pb-0"
							aria-current={i === active ? 'step' : undefined}
						>
							<article
								class={cx(
									// Phones/tablets: the card docks above the contact bar while its stage is active,
									// keeping the top half of the screen clear for the building.
									'sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] w-full max-w-md rounded-md border bg-ink-900/80 p-5 backdrop-blur-md transition-[border-color] duration-700 ease-out-expo sm:p-7 lg:static lg:bg-ink-900/72 lg:p-9',
									i === active ? 'border-copper-400/60' : 'border-limestone-100/12'
								)}
							>
								<div class="flex items-center justify-between font-mono text-label uppercase">
									<span class="text-copper-300"
										>Stage {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(
											2,
											'0'
										)}</span
									>
									{#if step.duration}<span class="text-limestone-400">{step.duration}</span>{/if}
								</div>
								<h3
									class="mt-4 font-display text-[1.65rem] leading-tight font-light sm:text-display-md lg:mt-6"
								>
									{step.title}
								</h3>
								{#if step.description}<p
										class="mt-3 text-[0.95rem] leading-relaxed text-limestone-200 lg:mt-4 lg:text-base"
									>
										{step.description}
									</p>{/if}
								<div class="mt-8 h-px w-full bg-limestone-100/12">
									<div
										class="h-px origin-left bg-copper-400 transition-transform duration-700 ease-out-expo"
										style:transform="scaleX({i < active ? 1 : i === active ? 0.5 : 0})"
									></div>
								</div>
							</article>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
</section>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(.scroll-cue) {
			animation: cue 2.2s var(--ease-in-out-quint) infinite;
		}
	}
	@keyframes cue {
		0% {
			transform: translateY(-160%);
		}
		45%,
		55% {
			transform: translateY(0);
		}
		100% {
			transform: translateY(160%);
		}
	}
</style>
