/**
 * Motion primitives as Svelte actions/attachments. Every effect is:
 *   • transform/opacity only (GPU friendly)
 *   • disabled or reduced under `prefers-reduced-motion`
 *   • inert on coarse pointers where hover makes no sense
 */
import type { Action } from 'svelte/action';

export const prefersReducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hasFinePointer = () =>
	typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ── Reveal on enter ──────────────────────────────────────────────────────── */
let revealObserver: IntersectionObserver | undefined;
function getRevealObserver() {
	revealObserver ??= new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.setAttribute('data-revealed', '');
					revealObserver?.unobserve(entry.target);
				}
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
	);
	return revealObserver;
}

type RevealOptions =
	{ delay?: number; mode?: 'fade' | 'mask' | 'split' | 'draw' | 'icon' } | undefined;

/**
 * `use:reveal` — stages an element for a one-shot entrance.
 * Modes: fade (default), mask (clip-path wipe), split (word stagger), draw (SVG strokes), icon.
 */
export const reveal: Action<HTMLElement | SVGElement, RevealOptions> = (node, opts) => {
	const mode = opts?.mode ?? 'fade';
	if (mode === 'split') node.setAttribute('data-split', '');
	else if (mode === 'draw') node.setAttribute('data-draw', '');
	else if (mode === 'icon') node.classList.add('icon-draw');
	else node.setAttribute('data-reveal', mode === 'mask' ? 'mask' : '');
	if (opts?.delay) (node as HTMLElement).style.setProperty('--reveal-delay', `${opts.delay}ms`);
	getRevealObserver().observe(node);
	return {
		destroy() {
			revealObserver?.unobserve(node);
		}
	};
};

/* ── Magnetic hover ───────────────────────────────────────────────────────── */
export const magnetic: Action<HTMLElement, { strength?: number } | undefined> = (node, opts) => {
	if (!hasFinePointer() || prefersReducedMotion()) return;
	const strength = opts?.strength ?? 0.28;
	let raf = 0;
	const inner = node.querySelector<HTMLElement>('[data-magnetic-inner]');
	const set = (x: number, y: number) => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
			if (inner) inner.style.transform = `translate3d(${x * 0.35}px, ${y * 0.35}px, 0)`;
		});
	};
	const onMove = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		set(
			(e.clientX - (r.left + r.width / 2)) * strength,
			(e.clientY - (r.top + r.height / 2)) * strength
		);
	};
	const onLeave = () => {
		node.style.transition = 'transform 600ms var(--ease-spring)';
		if (inner) inner.style.transition = 'transform 600ms var(--ease-spring)';
		set(0, 0);
	};
	const onEnter = () => {
		node.style.transition = 'transform 120ms linear';
		if (inner) inner.style.transition = 'transform 120ms linear';
	};
	node.addEventListener('pointerenter', onEnter);
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerleave', onLeave);
	return {
		destroy() {
			cancelAnimationFrame(raf);
			node.removeEventListener('pointerenter', onEnter);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', onLeave);
		}
	};
};

/* ── Pointer spotlight (sets --mx / --my CSS vars) ────────────────────────── */
export const spotlight: Action<HTMLElement> = (node) => {
	if (!hasFinePointer()) return;
	let raf = 0;
	const onMove = (e: PointerEvent) => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			const r = node.getBoundingClientRect();
			node.style.setProperty('--mx', `${e.clientX - r.left}px`);
			node.style.setProperty('--my', `${e.clientY - r.top}px`);
		});
	};
	node.addEventListener('pointermove', onMove);
	return {
		destroy() {
			cancelAnimationFrame(raf);
			node.removeEventListener('pointermove', onMove);
		}
	};
};

/* ── Tilt (3D perspective hover for cards) ────────────────────────────────── */
export const tilt: Action<HTMLElement, { max?: number } | undefined> = (node, opts) => {
	if (!hasFinePointer() || prefersReducedMotion()) return;
	const max = opts?.max ?? 4;
	let raf = 0;
	const onMove = (e: PointerEvent) => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			const r = node.getBoundingClientRect();
			const px = (e.clientX - r.left) / r.width - 0.5;
			const py = (e.clientY - r.top) / r.height - 0.5;
			node.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
			node.style.setProperty('--px', px.toFixed(3));
			node.style.setProperty('--py', py.toFixed(3));
		});
	};
	const onLeave = () => {
		cancelAnimationFrame(raf);
		node.style.transform = '';
	};
	node.style.transition = 'transform 500ms var(--ease-out-expo)';
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerleave', onLeave);
	return {
		destroy() {
			cancelAnimationFrame(raf);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', onLeave);
		}
	};
};

/* ── Scroll progress (0 → 1 as the element crosses the viewport) ──────────── */
type ScrollProgressOptions = {
	onProgress: (p: number) => void;
	/** 'cross' = enters bottom → leaves top. 'pin' = top hits top → bottom hits bottom. */
	mode?: 'cross' | 'pin';
};
export const scrollProgress: Action<HTMLElement, ScrollProgressOptions> = (node, opts) => {
	let options = opts;
	let raf = 0;
	let visible = false;
	const measure = () => {
		raf = 0;
		const r = node.getBoundingClientRect();
		const vh = window.innerHeight;
		let p: number;
		if (options.mode === 'pin') {
			const total = r.height - vh;
			p = total > 0 ? -r.top / total : r.top < 0 ? 1 : 0;
		} else {
			p = (vh - r.top) / (vh + r.height);
		}
		options.onProgress(Math.min(1, Math.max(0, p)));
	};
	const schedule = () => {
		if (visible && !raf) raf = requestAnimationFrame(measure);
	};
	const io = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		if (visible) schedule();
	});
	io.observe(node);
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule, { passive: true });
	measure();
	return {
		update(next) {
			options = next;
		},
		destroy() {
			io.disconnect();
			cancelAnimationFrame(raf);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
		}
	};
};

/* ── Count-up for stats (runs once when visible) ──────────────────────────── */
export const countUp: Action<HTMLElement, { value: number; decimals?: number }> = (node, opts) => {
	const { value, decimals = 0 } = opts;
	const fmt = (n: number) =>
		new Intl.NumberFormat('en-IN', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(n);
	if (prefersReducedMotion()) {
		node.textContent = fmt(value);
		return;
	}
	node.textContent = fmt(0);
	let raf = 0;
	const io = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			io.disconnect();
			const start = performance.now();
			const duration = 1800;
			const tick = (now: number) => {
				const t = Math.min(1, (now - start) / duration);
				const eased = 1 - Math.pow(1 - t, 4);
				node.textContent = fmt(value * eased);
				if (t < 1) raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
		},
		{ threshold: 0.6 }
	);
	io.observe(node);
	return {
		destroy() {
			io.disconnect();
			cancelAnimationFrame(raf);
		}
	};
};
