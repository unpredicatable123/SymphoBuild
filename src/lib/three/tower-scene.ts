/**
 * TowerScene — a working construction site that builds itself as you scroll.
 *
 * A single parameter, `build` (0 → 1), takes a plot in Coimbatore from drawing to door key:
 *   design     0.00–0.16  pre-dawn: copper setting-out lines draw themselves on the bare plot
 *   approvals  0.16–0.32  branded hoarding goes up, site cabins arrive, an excavator digs the pit
 *   foundation 0.24–0.36  the raft is cast, rebar and formwork are stacked, the tower crane is erected
 *   structure  0.32–0.55  RCC columns, formwork and slabs rise floor by floor; the crane climbs with them
 *   envelope   0.55–0.72  red-brick infill, steel scaffolding and green shade net wrap the frame
 *   finishes   0.72–0.88  scaffolding is struck top-down to reveal plaster and paint, the crane leaves
 *   handover   0.88–1.00  landscaping, compound wall and a warm dusk with every window lit
 *
 * Framing: every frame the camera distance is solved from the building's bounding corners (and
 * the crane head while it stands) so the model always fits a reserved screen region —
 * right-hand side on desktop, top half on mobile — whatever the viewport or orbit angle.
 *
 * Performance: everything repeated is instanced; instance matrices are only rewritten when they
 * change; all shaders are compiled up front; shadows re-render only while something moves; the
 * render resolution steps down if frames run long; rendering stops entirely off-screen.
 * No textures or models are downloaded — every surface is generated at runtime.
 */
import {
	ACESFilmicToneMapping,
	AdditiveBlending,
	BackSide,
	BoxGeometry,
	BufferGeometry,
	CanvasTexture,
	Color,
	CylinderGeometry,
	DirectionalLight,
	Float32BufferAttribute,
	Fog,
	Group,
	HemisphereLight,
	IcosahedronGeometry,
	InstancedMesh,
	Line,
	LineBasicMaterial,
	LineDashedMaterial,
	LineSegments,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	MeshStandardMaterial,
	Object3D,
	PCFShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	PMREMGenerator,
	Points,
	PointsMaterial,
	Quaternion,
	RepeatWrapping,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
	type BufferGeometry as BG,
	type Material,
	type Texture
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const PHASES = {
	design: [0, 0.16],
	approvals: [0.16, 0.32],
	foundation: [0.24, 0.36],
	structure: [0.32, 0.55],
	envelope: [0.55, 0.72],
	finishes: [0.72, 0.88],
	handover: [0.88, 1]
} as const;
export type Phase = keyof typeof PHASES;

/** Structural frame window (columns + slabs), slightly inside `structure` so the crane leads. */
const FRAME: [number, number] = [0.34, 0.56];

const COPPER = new Color('#d0845f');
const WHITE = new Color('#ffffff');
const SCRUB = new Color('#4d5345');
const Y_AXIS = new Vector3(0, 1, 0);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (v: number, [a, b]: readonly [number, number]) => clamp01((v - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function seeded(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

/* ── Atmosphere keyframes: pre-dawn → working day → golden hour → dusk ───────── */
type MoodKey = {
	at: number;
	top: string;
	horizon: string;
	sun: string;
	sunI: number;
	hemi: number;
	elev: number;
	az: number;
	glow: number;
	exposure: number;
};
const MOOD_KEYS: MoodKey[] = [
	{
		at: 0,
		top: '#07090d',
		horizon: '#1f2731',
		sun: '#8fa6c4',
		sunI: 0.7,
		hemi: 0.32,
		elev: 0.9,
		az: -0.6,
		glow: 0,
		exposure: 1
	},
	{
		at: 0.2,
		top: '#121922',
		horizon: '#46505a',
		sun: '#ffe2c2',
		sunI: 2.4,
		hemi: 0.5,
		elev: 0.75,
		az: -0.8,
		glow: 0.3,
		exposure: 1.02
	},
	{
		at: 0.52,
		top: '#15202c',
		horizon: '#6b6c69',
		sun: '#fff1de',
		sunI: 3.1,
		hemi: 0.62,
		elev: 0.95,
		az: -1.0,
		glow: 0.25,
		exposure: 1.05
	},
	{
		at: 0.8,
		top: '#191a24',
		horizon: '#9b5b37',
		sun: '#ffac68',
		sunI: 2.9,
		hemi: 0.58,
		elev: 0.42,
		az: -1.35,
		glow: 0.9,
		exposure: 1.08
	},
	{
		at: 1,
		top: '#0c0f19',
		horizon: '#5d3327',
		sun: '#ff8c52',
		sunI: 1.9,
		hemi: 0.5,
		elev: 0.2,
		az: -1.2,
		glow: 1,
		exposure: 1.18
	}
];
const MOODS = MOOD_KEYS.map((k) => ({
	...k,
	topC: new Color(k.top),
	horizonC: new Color(k.horizon),
	sunC: new Color(k.sun)
}));

/* ── Procedural textures ─────────────────────────────────────────────────────── */
function canvas2d(w: number, h: number) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return { c, g: c.getContext('2d')! };
}
type RGBA = [number, number, number, number];
const rgba = ([r, g, b, a]: RGBA) => `rgba(${r},${g},${b},${a})`;
/** Soft blob, drawn wrapped so tiling textures have no seams. */
function blotch(
	g: CanvasRenderingContext2D,
	w: number,
	h: number,
	x: number,
	y: number,
	r: number,
	c: RGBA
) {
	for (const ox of [-w, 0, w])
		for (const oy of [-h, 0, h]) {
			const cx = x + ox;
			const cy = y + oy;
			if (cx + r < 0 || cx - r > w || cy + r < 0 || cy - r > h) continue;
			const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
			gr.addColorStop(0, rgba(c));
			gr.addColorStop(1, rgba([c[0], c[1], c[2], 0]));
			g.fillStyle = gr;
			g.fillRect(cx - r, cy - r, r * 2, r * 2);
		}
}
function speckle(
	g: CanvasRenderingContext2D,
	w: number,
	h: number,
	rand: () => number,
	count: number,
	colors: string[],
	min: number,
	max: number
) {
	for (let i = 0; i < count; i++) {
		g.fillStyle = colors[i % colors.length];
		const s = min + rand() * (max - min);
		g.fillRect(rand() * w, rand() * h, s, s);
	}
}

/**
 * Samples `map` / `emissiveMap` in world space (box-projected), so any instanced box gets
 * correctly scaled brick, concrete or window patterns without per-instance UVs.
 */
function worldMapped<T extends MeshStandardMaterial>(m: T, scale: number, plainRoof = false) {
	m.onBeforeCompile = (shader) => {
		shader.uniforms.uWScale = { value: scale };
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
			.replace(
				'#include <project_vertex>',
				`#include <project_vertex>
				vec4 wPos4 = vec4(transformed, 1.0);
				vec3 wNrm3 = objectNormal;
				#ifdef USE_INSTANCING
					wPos4 = instanceMatrix * wPos4;
					wNrm3 = mat3(instanceMatrix) * wNrm3;
				#endif
				vWPos = (modelMatrix * wPos4).xyz;
				vWNrm = mat3(modelMatrix) * wNrm3;`
			);
		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <common>',
				'#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nuniform float uWScale;'
			)
			.replace(
				'#include <map_fragment>',
				`vec3 wAn = abs(normalize(vWNrm));
				bool wRoof = wAn.y > 0.5;
				vec2 wUv = (wRoof ? vWPos.xz : (wAn.x > wAn.z ? vWPos.zy : vWPos.xy)) * uWScale;
				#ifdef USE_MAP
					vec4 wTex = texture2D(map, wUv);
					${plainRoof ? 'if (wRoof) wTex = vec4(vec3(0.42), 1.0);' : ''}
					diffuseColor *= wTex;
				#endif`
			)
			.replace(
				'#include <emissivemap_fragment>',
				`#ifdef USE_EMISSIVEMAP
					totalEmissiveRadiance *= wRoof ? vec3(0.0) : texture2D(emissiveMap, wUv).rgb;
				#endif`
			);
	};
	m.customProgramCacheKey = () => `world-mapped-${plainRoof ? 1 : 0}`;
	return m;
}

/* ── Instanced batches ───────────────────────────────────────────────────────── */
type Item = {
	x: number;
	y: number;
	z: number;
	sx: number;
	sy: number;
	sz: number;
	/** Build progress at which the element starts to appear… */
	t0: number;
	/** …and (optionally) when it is removed again. */
	t1?: number;
	ry?: number;
	q?: Quaternion;
	color?: Color | string;
};
type Grow = 'y' | 'xyz' | 'none';

/** A group of identical primitives, each appearing (and optionally leaving) over build progress. */
class Batch {
	items: Item[] = [];
	mesh!: InstancedMesh;
	private shown!: Float32Array;
	private dummy = new Object3D();
	constructor(
		private geometry: BG,
		private material: Material,
		private grow: Grow,
		private dur: number,
		private shadows = { cast: true, receive: true }
	) {}
	add(item: Item) {
		this.items.push(item);
	}
	build(parent: Object3D) {
		const n = this.items.length;
		this.mesh = new InstancedMesh(this.geometry, this.material, Math.max(1, n));
		this.mesh.count = n;
		this.mesh.frustumCulled = false;
		this.mesh.castShadow = this.shadows.cast;
		this.mesh.receiveShadow = this.shadows.receive;
		const c = new Color();
		this.items.forEach((it, i) => it.color && this.mesh.setColorAt(i, c.set(it.color)));
		this.shown = new Float32Array(n).fill(-1);
		parent.add(this.mesh);
		this.update(0);
	}
	private amount(it: Item, b: number) {
		const instant = this.grow === 'none';
		const on = instant ? +(b >= it.t0) : easeOut(clamp01((b - it.t0) / this.dur));
		if (on <= 0 || it.t1 === undefined) return on;
		const off = instant ? +(b >= it.t1) : smooth(clamp01((b - it.t1) / this.dur));
		return on * (1 - off);
	}
	/** Rewrites only the instances whose state changed; returns true if anything moved. */
	update(b: number) {
		const d = this.dummy;
		let dirty = false;
		for (let i = 0; i < this.items.length; i++) {
			const it = this.items[i];
			const g = this.amount(it, b);
			if (Math.abs(g - this.shown[i]) < 1e-4) continue;
			this.shown[i] = g;
			dirty = true;
			if (it.q) d.quaternion.copy(it.q);
			else d.quaternion.setFromAxisAngle(Y_AXIS, it.ry ?? 0);
			if (g <= 0.001) {
				d.position.set(it.x, it.y, it.z);
				d.scale.set(0, 0, 0);
			} else if (this.grow === 'y') {
				const sy = it.sy * g;
				d.position.set(it.x, it.y - (it.sy - sy) / 2, it.z);
				d.scale.set(it.sx, sy, it.sz);
			} else {
				d.position.set(it.x, it.y, it.z);
				d.scale.set(it.sx * g, it.sy * g, it.sz * g);
			}
			d.updateMatrix();
			this.mesh.setMatrixAt(i, d.matrix);
		}
		if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
		return dirty;
	}
}

/** Critically damped spring, sub-stepped so it glides at the same pace whatever the frame rate. */
class Spring {
	v = 0;
	constructor(
		public x: number,
		private stiffness: number
	) {}
	step(target: number, dt: number) {
		const k = this.stiffness;
		const c = 2 * Math.sqrt(k);
		for (let left = dt; left > 0; left -= 1 / 120) {
			const h = Math.min(left, 1 / 120);
			this.v += (k * (target - this.x) - c * this.v) * h;
			this.x += this.v * h;
		}
		if (Math.abs(target - this.x) < 1e-4 && Math.abs(this.v) < 1e-4) {
			this.x = target;
			this.v = 0;
			return false;
		}
		return true;
	}
}

const _a = new Vector3();
const _mid = new Vector3();
const _s = new Vector3();
const _q = new Quaternion();
/** Box transform for a square-section member running from `a` to `b` (tubes, lattice, braces). */
function strut(a: Vector3, b: Vector3, t: number, out = new Matrix4()) {
	const len = _a.subVectors(b, a).length();
	_q.setFromUnitVectors(Y_AXIS, _a.divideScalar(len));
	return out.compose(_mid.addVectors(a, b).multiplyScalar(0.5), _q, _s.set(t, len, t));
}
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

type Vehicle = {
	group: Group;
	gate: Vector3;
	park: Vector3;
	in: [number, number];
	out: [number, number];
};

export type TowerSceneOptions = {
	/**
	 * high   — discrete GPU: full site, shadows, MSAA
	 * medium — integrated GPU: full site and shadows, no MSAA, lower resolution cap
	 * low    — phones / weak devices: lighter site, no shadows, no MSAA
	 */
	quality: 'high' | 'medium' | 'low';
	reducedMotion: boolean;
	layout: 'split' | 'center';
	onError?: (err: unknown) => void;
};

export class TowerScene {
	private renderer: WebGLRenderer;
	private scene = new Scene();
	private camera = new PerspectiveCamera(30, 1, 0.5, 900);
	private raf = 0;
	private last = 0;
	private clock = 0;
	private frameNo = 0;
	private perfSlow = 0;
	private perfN = 0;
	private lowPower = false;
	private dpr: number;
	private visible = true;
	private disposed = false;
	private width = 1;
	private height = 1;

	private target = { hero: 0, build: 0, px: 0, py: 0 };
	private springs = {
		hero: new Spring(0, 22),
		build: new Spring(0, 20),
		px: new Spring(0, 7),
		py: new Spring(0, 7)
	};
	private intro = 0;

	private floors: number;
	private readonly FH = 1.45;
	private readonly SEC = 1.4;
	private topY = 0;
	private corners: Vector3[] = [];
	private center = new Vector3();
	/** Full site detail + shadows (high and medium quality). */
	private high: boolean;

	// Blueprint + site markings
	private lines!: LineSegments;
	private lineVertexCount = 0;
	private lineMat = new LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0.95 });
	private boundaryMat = new LineDashedMaterial({
		color: COPPER,
		dashSize: 0.9,
		gapSize: 0.6,
		transparent: true,
		opacity: 0
	});
	private siteMat!: MeshLambertMaterial;
	private pitMat!: MeshLambertMaterial;
	private envTex!: Texture;
	private glowMat!: MeshBasicMaterial;

	// Light + atmosphere
	private litMat = new MeshBasicMaterial({ color: '#ffc98a', toneMapped: false });
	private lampMat = new MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false });
	private beaconMat = new MeshBasicMaterial({ color: '#ff3b2e', toneMapped: false });
	private cityMat!: MeshStandardMaterial;
	private skyMat!: ShaderMaterial;
	private fog: Fog;
	private sun = new DirectionalLight('#ffffff', 3);
	private hemi = new HemisphereLight('#dfe6ea', '#2a2622', 0.5);
	private mood = {
		top: new Color(),
		horizon: new Color(),
		sun: new Color(),
		sunI: 0,
		hemi: 0,
		elev: 0,
		az: 0,
		glow: 0,
		exposure: 1
	};

	// Crane
	private crane = new Group();
	private craneFooting!: Mesh;
	private mast!: InstancedMesh;
	private mastTemplate: Matrix4[] = [];
	private maxSections = 0;
	private minSections = 0;
	private mastLen = 0;
	private mastDrawn = -1;
	private head = new Group();
	private headOpen = 0;
	private trolley = new Group();
	private cable!: Mesh;
	private hook = new Group();
	private craneTop = new Vector3();
	private craneVis = 0;

	// Vehicles
	private excavator!: Vehicle & { upper: Group; boom: Group; stick: Group };
	private mixer!: Vehicle & { drum: Group };

	private dust?: Points;
	private dustSeeds: Float32Array = new Float32Array(0);

	private batches: Batch[] = [];
	private geometries: BG[] = [];
	private materials: Material[] = [];
	private textures: Texture[] = [];
	private unit!: BoxGeometry;
	private tmp = { right: new Vector3(), up: new Vector3(), back: new Vector3(), v: new Vector3() };

	constructor(
		private canvas: HTMLCanvasElement,
		private opts: TowerSceneOptions
	) {
		this.high = opts.quality !== 'low';
		this.floors = this.high ? 12 : 9;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: opts.quality === 'high',
			alpha: false,
			powerPreference: 'high-performance'
		});
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;
		this.dpr = Math.min(window.devicePixelRatio, opts.quality === 'high' ? 1.6 : 1.25);
		this.renderer.setPixelRatio(this.dpr);
		this.renderer.shadowMap.enabled = this.high;
		this.renderer.shadowMap.type = PCFShadowMap;
		this.renderer.shadowMap.autoUpdate = false;
		canvas.addEventListener('webglcontextlost', this.onContextLost);

		// Procedural environment map — applied only to glass and steel, where reflections read.
		// (Image-based lighting on every surface cost ~5ms a frame on integrated GPUs.)
		const pmrem = new PMREMGenerator(this.renderer);
		this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		pmrem.dispose();

		this.fog = new Fog('#23272c', 80, 260);
		this.scene.fog = this.fog;
		this.scene.add(this.hemi, this.sun, this.sun.target);

		if (this.high) {
			this.sun.castShadow = true;
			this.sun.shadow.mapSize.set(1024, 1024);
			const cam = this.sun.shadow.camera;
			cam.left = -30;
			cam.right = 30;
			cam.top = 30;
			cam.bottom = -30;
			cam.near = 1;
			cam.far = 220;
			this.sun.shadow.bias = -0.0004;
			this.sun.shadow.normalBias = 0.03;
			this.sun.shadow.radius = 3;
		}

		this.unit = this.geo(new BoxGeometry(1, 1, 1));
		this.buildSky();
		this.buildWorld();
		if (opts.reducedMotion) this.intro = 1;

		// Warm every shader — including shadow-depth variants, which compile() misses — and upload
		// every texture with all parts visible, so nothing hitches when it first appears mid-scroll.
		this.apply(0);
		this.crane.visible = this.head.visible = true;
		this.excavator.group.visible = this.mixer.group.visible = true;
		if (this.dust) this.dust.visible = true;
		const culled: Object3D[] = [];
		this.scene.traverse((o) => {
			if (o.frustumCulled) {
				o.frustumCulled = false;
				culled.push(o);
			}
		});
		// Twice: the shadow pass is keyed on the light state left by the previous frame.
		for (let i = 0; i < 2; i++) {
			this.renderer.shadowMap.needsUpdate = true;
			this.renderer.render(this.scene, this.camera);
		}
		culled.forEach((o) => (o.frustumCulled = true));
		this.apply(0);
		this.requestFrame();
	}

	/* ── Public API ─────────────────────────────────────────────────────────── */
	setHero(h: number) {
		this.target.hero = clamp01(h);
		this.requestFrame();
	}
	setBuild(b: number) {
		this.target.build = clamp01(b);
		this.requestFrame();
	}
	setPointer(x: number, y: number) {
		if (this.opts.reducedMotion) return;
		this.target.px = x;
		this.target.py = y;
		this.requestFrame();
	}
	setLayout(layout: 'split' | 'center') {
		if (layout === this.opts.layout) return;
		this.opts.layout = layout;
		this.resize(this.width, this.height);
	}
	setVisible(v: boolean) {
		this.visible = v;
		if (v) {
			this.last = performance.now();
			this.requestFrame();
		} else {
			cancelAnimationFrame(this.raf);
			this.raf = 0;
		}
	}
	/**
	 * The model is framed inside a region of the canvas (px). The camera's "full" frustum
	 * is that region; setViewOffset then renders the whole canvas around it.
	 */
	resize(w: number, h: number) {
		this.width = Math.max(1, w);
		this.height = Math.max(1, h);
		this.renderer.setSize(this.width, this.height, false);
		const W = this.width;
		const H = this.height;
		const region =
			this.opts.layout === 'split'
				? { x: W * 0.42, y: H * 0.1, w: W * 0.54, h: H * 0.82 }
				: { x: W * 0.04, y: H * 0.08, w: W * 0.92, h: H * 0.42 };
		this.camera.aspect = region.w / region.h;
		this.camera.setViewOffset(region.w, region.h, -region.x, -region.y, W, H);
		this.camera.updateProjectionMatrix();
		this.renderer.shadowMap.needsUpdate = true;
		this.requestFrame();
	}
	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
		this.batches.forEach((b) => b.mesh.dispose());
		this.mast?.dispose();
		this.geometries.forEach((g) => g.dispose());
		this.materials.forEach((m) => m.dispose());
		this.textures.forEach((t) => t.dispose());
		this.lines?.geometry.dispose();
		this.envTex.dispose();
		this.renderer.dispose();
	}

	/* ── Resource helpers ───────────────────────────────────────────────────── */
	private geo<T extends BG>(g: T) {
		this.geometries.push(g);
		return g;
	}
	private mat<T extends Material>(m: T) {
		this.materials.push(m);
		return m;
	}
	private tex(c: HTMLCanvasElement, repeat = true) {
		const t = new CanvasTexture(c);
		t.colorSpace = SRGBColorSpace;
		if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
		t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
		this.textures.push(t);
		return t;
	}
	private batch(
		g: BG,
		m: Material,
		grow: Grow,
		dur: number,
		shadows?: { cast: boolean; receive: boolean }
	) {
		const b = new Batch(g, m, grow, dur, shadows);
		this.batches.push(b);
		return b;
	}
	private box(
		m: Material,
		x: number,
		y: number,
		z: number,
		sx: number,
		sy: number,
		sz: number,
		parent: Object3D,
		cast = true
	) {
		const mesh = new Mesh(this.unit, m);
		mesh.position.set(x, y, z);
		mesh.scale.set(sx, sy, sz);
		mesh.castShadow = cast;
		mesh.receiveShadow = true;
		parent.add(mesh);
		return mesh;
	}

	/* ── Textures ───────────────────────────────────────────────────────────── */
	private makeTextures() {
		const rand = seeded(7);

		// Wire-cut red clay bricks in stretcher bond, cement mortar.
		const brick = canvas2d(256, 256);
		{
			const { g } = brick;
			g.fillStyle = '#b4a893';
			g.fillRect(0, 0, 256, 256);
			const rows = 16;
			const rh = 256 / rows;
			const per = 5;
			const bw = 256 / per;
			for (let r = 0; r < rows; r++) {
				const off = r % 2 ? bw / 2 : 0;
				for (let i = 0; i < per; i++) {
					const hue = 8 + rand() * 12;
					const sat = 42 + rand() * 22;
					const l = 30 + rand() * 16;
					g.fillStyle = `hsl(${hue},${sat}%,${l}%)`;
					for (const ox of [0, -256])
						g.fillRect(i * bw + off + ox + 1.5, r * rh + 1.5, bw - 3, rh - 3);
				}
			}
			speckle(g, 256, 256, rand, 2600, ['rgba(40,18,10,0.18)', 'rgba(255,220,190,0.12)'], 1, 2.2);
		}

		// Board-marked concrete with lime bloom.
		const concrete = canvas2d(256, 256);
		{
			const { g } = concrete;
			g.fillStyle = '#aaa59b';
			g.fillRect(0, 0, 256, 256);
			for (let i = 0; i < 26; i++)
				blotch(g, 256, 256, rand() * 256, rand() * 256, 18 + rand() * 50, [
					rand() > 0.5 ? 196 : 120,
					rand() > 0.5 ? 190 : 116,
					180,
					0.08 + rand() * 0.08
				]);
			speckle(g, 256, 256, rand, 3000, ['rgba(60,58,54,0.22)', 'rgba(240,236,228,0.18)'], 0.8, 1.8);
			g.fillStyle = 'rgba(70,66,60,0.12)';
			for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 1.5);
			for (let x = 0; x < 256; x += 128) g.fillRect(x, 0, 1.5, 256);
		}

		// Sand-faced cement plaster (tinted per instance).
		const plaster = canvas2d(128, 128);
		{
			const { g } = plaster;
			g.fillStyle = '#f2eee7';
			g.fillRect(0, 0, 128, 128);
			for (let i = 0; i < 12; i++)
				blotch(g, 128, 128, rand() * 128, rand() * 128, 12 + rand() * 30, [210, 204, 192, 0.12]);
			speckle(
				g,
				128,
				128,
				rand,
				1400,
				['rgba(120,112,100,0.12)', 'rgba(255,255,255,0.2)'],
				0.6,
				1.4
			);
		}

		// Excavated red-brown earth with gravel and tyre tracks.
		const dirt = canvas2d(512, 512);
		{
			const { g } = dirt;
			g.fillStyle = '#806249';
			g.fillRect(0, 0, 512, 512);
			for (let i = 0; i < 60; i++) {
				const k = rand();
				blotch(
					g,
					512,
					512,
					rand() * 512,
					rand() * 512,
					30 + rand() * 90,
					k < 0.4 ? [104, 76, 56, 0.35] : k < 0.75 ? [150, 118, 88, 0.3] : [120, 116, 108, 0.28]
				);
			}
			speckle(
				g,
				512,
				512,
				rand,
				9000,
				['rgba(50,36,26,0.35)', 'rgba(190,168,140,0.35)', 'rgba(90,86,80,0.4)'],
				1,
				3
			);
			g.strokeStyle = 'rgba(56,40,30,0.28)';
			g.lineWidth = 9;
			for (const off of [0, 22]) {
				g.beginPath();
				g.moveTo(-20, 380 + off);
				g.bezierCurveTo(160, 300 + off, 300, 470 + off, 540, 330 + off);
				g.stroke();
			}
		}

		// Knitted HDPE shade net.
		const net = canvas2d(64, 64);
		{
			const { g } = net;
			g.fillStyle = 'rgba(38,112,66,0.3)';
			g.fillRect(0, 0, 64, 64);
			g.strokeStyle = 'rgba(34,122,70,0.95)';
			g.lineWidth = 2.2;
			for (let i = 0; i <= 64; i += 8) {
				g.beginPath();
				g.moveTo(i, 0);
				g.lineTo(i, 64);
				g.moveTo(0, i);
				g.lineTo(64, i);
				g.stroke();
			}
		}

		// Site hoarding panel.
		const hoard = canvas2d(256, 160);
		{
			const { g } = hoard;
			g.fillStyle = '#ecebe6';
			g.fillRect(0, 0, 256, 160);
			g.fillStyle = '#1b1e21';
			g.fillRect(0, 0, 256, 8);
			g.fillStyle = '#c46d40';
			g.fillRect(0, 126, 256, 34);
			g.fillStyle = '#1b1e21';
			g.font = '600 34px Georgia, serif';
			g.textAlign = 'center';
			g.fillText('Sympho', 104, 76);
			g.font = 'italic 34px Georgia, serif';
			g.fillText('Build', 190, 76);
			g.font = '12px monospace';
			g.fillStyle = '#5c5f62';
			g.fillText('DESIGN · APPROVALS · CONSTRUCTION', 128, 102);
			g.fillStyle = '#f7e7dc';
			g.font = '600 13px monospace';
			g.fillText('SAFETY FIRST  ·  HELMET ZONE', 128, 148);
			g.fillStyle = 'rgba(0,0,0,0.18)';
			g.fillRect(0, 0, 2, 160);
			g.fillRect(254, 0, 2, 160);
		}

		// Neighbouring buildings: facade + lit-window mask.
		const facade = canvas2d(256, 256);
		const facadeLit = canvas2d(256, 256);
		{
			const { g } = facade;
			g.fillStyle = '#77736b';
			g.fillRect(0, 0, 256, 256);
			speckle(g, 256, 256, rand, 1500, ['rgba(40,40,40,0.15)', 'rgba(255,255,255,0.08)'], 1, 2);
			const e = facadeLit.g;
			e.fillStyle = '#000';
			e.fillRect(0, 0, 256, 256);
			for (let r = 0; r < 8; r++)
				for (let c = 0; c < 8; c++) {
					const x = c * 32 + 6;
					const y = r * 32 + 8;
					g.fillStyle = '#262b31';
					g.fillRect(x, y, 20, 15);
					g.fillStyle = 'rgba(0,0,0,0.25)';
					g.fillRect(x - 2, y + 15, 24, 3);
					if (rand() < 0.3) {
						const k = 0.55 + rand() * 0.45;
						e.fillStyle = `rgb(${255 * k},${205 * k},${150 * k})`;
						e.fillRect(x, y, 20, 15);
					}
				}
		}

		// Transit-mixer drum stripes.
		const stripes = canvas2d(64, 64);
		{
			const { g } = stripes;
			g.fillStyle = '#e8e3d9';
			g.fillRect(0, 0, 64, 64);
			g.fillStyle = '#c46d40';
			for (let i = -64; i < 128; i += 32) {
				g.beginPath();
				g.moveTo(i, 0);
				g.lineTo(i + 14, 0);
				g.lineTo(i + 14 + 64, 64);
				g.lineTo(i + 64, 64);
				g.fill();
			}
		}

		// Soft dot for dust.
		const dot = canvas2d(64, 64);
		{
			const gr = dot.g.createRadialGradient(32, 32, 0, 32, 32, 32);
			gr.addColorStop(0, 'rgba(255,255,255,1)');
			gr.addColorStop(1, 'rgba(255,255,255,0)');
			dot.g.fillStyle = gr;
			dot.g.fillRect(0, 0, 64, 64);
		}

		// Warm ground glow for handover.
		const glow = canvas2d(128, 128);
		{
			const gr = glow.g.createRadialGradient(64, 64, 0, 64, 64, 64);
			gr.addColorStop(0, 'rgba(240,160,110,0.9)');
			gr.addColorStop(1, 'rgba(240,160,110,0)');
			glow.g.fillStyle = gr;
			glow.g.fillRect(0, 0, 128, 128);
		}

		const dirtTex = this.tex(dirt.c);
		dirtTex.repeat.set(5, 3.5);
		return {
			brick: this.tex(brick.c),
			concrete: this.tex(concrete.c),
			plaster: this.tex(plaster.c),
			dirt: dirtTex,
			net: this.tex(net.c),
			hoard: this.tex(hoard.c, false),
			facade: this.tex(facade.c),
			facadeLit: this.tex(facadeLit.c),
			stripes: this.tex(stripes.c),
			dot: this.tex(dot.c, false),
			glow: this.tex(glow.c, false)
		};
	}

	/* ── World construction ─────────────────────────────────────────────────── */
	private buildSky() {
		this.skyMat = this.mat(
			new ShaderMaterial({
				side: BackSide,
				depthWrite: false,
				fog: false,
				toneMapped: false,
				uniforms: {
					top: { value: new Color() },
					horizon: { value: new Color() },
					sunDir: { value: new Vector3(0, 1, 0) },
					sunColor: { value: new Color() },
					glow: { value: 0 }
				},
				vertexShader: /* glsl */ `
					varying vec3 vDir;
					void main() {
						vec4 world = modelMatrix * vec4(position, 1.0);
						vDir = world.xyz - cameraPosition;
						gl_Position = projectionMatrix * viewMatrix * world;
					}`,
				fragmentShader: /* glsl */ `
					uniform vec3 top;
					uniform vec3 horizon;
					uniform vec3 sunDir;
					uniform vec3 sunColor;
					uniform float glow;
					varying vec3 vDir;
					void main() {
						vec3 d = normalize(vDir);
						vec3 col = mix(horizon, top, smoothstep(-0.02, 0.5, d.y));
						float s = max(dot(d, sunDir), 0.0);
						col += sunColor * (pow(s, 10.0) * 0.32 + pow(s, 400.0) * 1.2) * glow
							* smoothstep(-0.08, 0.04, d.y);
						gl_FragColor = vec4(col, 1.0);
						#include <colorspace_fragment>
					}`
			})
		);
		const sky = new Mesh(this.geo(new SphereGeometry(600, 32, 16)), this.skyMat);
		sky.frustumCulled = false;
		this.scene.add(sky);
	}

	private buildWorld() {
		const FH = this.FH;
		const N = this.floors;
		const high = this.high;
		const rand = seeded(20260925);
		const unit = this.unit;
		const T = this.makeTextures();
		this.materials.push(this.litMat, this.lampMat, this.beaconMat, this.lineMat, this.boundaryMat);

		/* Materials */
		const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) =>
			this.mat(new MeshStandardMaterial(p));
		const concrete = this.mat(
			worldMapped(
				new MeshStandardMaterial({ color: '#d9d3c7', map: T.concrete, roughness: 0.86 }),
				0.22
			)
		);
		const concreteRaw = this.mat(
			worldMapped(
				new MeshStandardMaterial({ color: '#b3ab9d', map: T.concrete, roughness: 0.92 }),
				0.22
			)
		);
		const brickMat = this.mat(
			worldMapped(new MeshStandardMaterial({ map: T.brick, roughness: 0.92 }), 1.05)
		);
		const plasterMat = this.mat(
			worldMapped(new MeshStandardMaterial({ map: T.plaster, roughness: 0.82 }), 0.35)
		);
		const netMat = this.mat(
			worldMapped(
				new MeshStandardMaterial({
					map: T.net,
					transparent: true,
					depthWrite: false,
					roughness: 1
				}),
				1.6
			)
		);
		this.cityMat = this.mat(
			worldMapped(
				new MeshStandardMaterial({
					map: T.facade,
					emissiveMap: T.facadeLit,
					emissive: '#ffc07a',
					emissiveIntensity: 0,
					roughness: 0.95,
					envMapIntensity: 0.2
				}),
				0.086,
				true
			)
		);
		const envMap = this.envTex;
		const glass = std({
			color: '#2b3d4b',
			metalness: 0.7,
			roughness: 0.08,
			envMap,
			envMapIntensity: 1
		});
		const steel = std({
			color: '#8d9299',
			metalness: 0.6,
			roughness: 0.45,
			envMap,
			envMapIntensity: 0.5
		});
		const plank = std({ color: '#8b6b47', roughness: 0.9 });
		const ply = std({ color: '#a35e34', roughness: 0.7 });
		const rebar = std({ color: '#5a382a', metalness: 0.4, roughness: 0.7 });
		const yellow = std({ color: '#dfa227', roughness: 0.5, metalness: 0.2 });
		const dark = std({ color: '#2c3035', metalness: 0.4, roughness: 0.6 });
		const whitePaint = std({ color: '#e6e3dc', roughness: 0.55 });
		const tyre = std({ color: '#18191b', roughness: 0.95 });
		const hivis = std({ color: '#f07a22', roughness: 0.7 });
		const navy = std({ color: '#283040', roughness: 0.9 });
		const helmetMat = std({ color: '#f3f1ea', roughness: 0.4 });
		const foliage = std({ color: '#ffffff', roughness: 0.9, flatShading: true });
		const bark = std({ color: '#4a3a2e', roughness: 1 });
		const earth = std({ color: '#ffffff', roughness: 1, flatShading: true });
		const lawn = std({ color: '#56693e', roughness: 1 });
		const paving = std({ color: '#9c968b', map: T.concrete, roughness: 0.9 });
		const hoardMat = std({ map: T.hoard, roughness: 0.7 });
		const drumMat = std({ map: T.stripes, roughness: 0.5 });
		const tank = std({ color: '#141516', roughness: 0.6 });

		/* Plan geometry */
		const blocks = [
			{
				cx: -2.5,
				cz: 0,
				w: 12,
				d: 10,
				floors: N,
				colsX: 4,
				colsZ: 3,
				stilt: true,
				tone: '#ebe3d4'
			},
			{
				cx: 9,
				cz: 1.5,
				w: 7,
				d: 8,
				floors: Math.round(N * 0.45),
				colsX: 3,
				colsZ: 3,
				stilt: false,
				tone: '#d8d3c6'
			}
		];
		this.topY = 0.5 + N * FH;

		// Framing volume: building + scaffolding + balconies + rooftop (crane handled separately).
		const minX = -9.6;
		const maxX = 13.6;
		const minZ = -6.1;
		const maxZ = 6.8;
		for (const x of [minX, maxX])
			for (const y of [0, this.topY + 1.6])
				for (const z of [minZ, maxZ]) this.corners.push(new Vector3(x, y, z));
		this.center.set((minX + maxX) / 2, this.topY * 0.46, (minZ + maxZ) / 2);

		const step = (FRAME[1] - FRAME[0]) / N;
		const colT = (f: number) => FRAME[0] + f * step * 0.96;
		const slabT = (f: number) => colT(f) + step * 0.55;
		const brickT = (f: number) => 0.5 + (f / N) * 0.15;
		const netT = (f: number) => 0.57 + (f / N) * 0.1;
		const glassT = (f: number) => 0.62 + (f / N) * 0.09;
		const strikeT = (f: number) => 0.72 + (1 - (f + 1) / N) * 0.1; // scaffolding struck top-down
		const plasterT = (f: number) => strikeT(f) - 0.004;

		/* Ground, street and plot */
		// Large ground surfaces use Lambert shading: they fill most of the screen, and the cheaper
		// shader is indistinguishable on matte asphalt and earth.
		const lambert = (p: ConstructorParameters<typeof MeshLambertMaterial>[0]) =>
			this.mat(new MeshLambertMaterial(p));
		const ground = new Mesh(this.geo(new PlaneGeometry(1200, 1200)), lambert({ color: '#1f2225' }));
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		this.scene.add(ground);

		const flat = (m: Material, x: number, z: number, w: number, d: number, y: number) => {
			const p = new Mesh(this.geo(new PlaneGeometry(w, d)), m);
			p.rotation.x = -Math.PI / 2;
			p.position.set(x, y, z);
			p.receiveShadow = true;
			this.scene.add(p);
			return p;
		};
		const kerb = lambert({ color: '#383a3b' });
		flat(lambert({ color: '#141618' }), 2, 20, 420, 9, 0.015);
		flat(kerb, 2, 15, 420, 1, 0.02);
		flat(kerb, 2, 25, 420, 1, 0.02);
		const dashPts: number[] = [];
		for (let x = -200; x < 200; x += 4) dashPts.push(x, 0.03, 20, x + 2, 0.03, 20);
		const dashGeo = this.geo(new BufferGeometry());
		dashGeo.setAttribute('position', new Float32BufferAttribute(dashPts, 3));
		this.scene.add(
			new LineSegments(
				dashGeo,
				this.mat(new LineBasicMaterial({ color: '#6b6f72', transparent: true, opacity: 0.5 }))
			)
		);

		this.siteMat = lambert({ map: T.dirt, color: SCRUB.clone() });
		flat(this.siteMat, 2, 1, 38, 26, 0.012);
		this.pitMat = lambert({
			color: '#3f2f23',
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		flat(this.pitMat, 2, 0.4, 25, 14, 0.018);

		const plotEdge = [
			[-19, -13],
			[19, -13],
			[19, 13],
			[-19, 13],
			[-19, -13]
		].map(([x, z]) => new Vector3(x + 2, 0.05, z + 1));
		const boundary = new Line(
			this.geo(new BufferGeometry().setFromPoints(plotEdge)),
			this.boundaryMat
		);
		boundary.computeLineDistances();
		this.scene.add(boundary);

		this.glowMat = this.mat(
			new MeshBasicMaterial({
				map: T.glow,
				transparent: true,
				opacity: 0,
				blending: AdditiveBlending,
				depthWrite: false
			})
		);
		const glow = flat(this.glowMat, 2, 2, 70, 50, 0.03);
		glow.receiveShadow = false;

		/* Neighbourhood — behind and beside the site, receding into the haze */
		const city = this.batch(unit, this.cityMat, 'none', 1, { cast: false, receive: false });
		const cityCount = high ? 80 : 36;
		for (let i = 0; i < cityCount; i++) {
			const a = Math.PI * (1.02 + rand() * 0.96);
			const r = 88 + rand() * 150;
			const hgt = 5 + Math.pow(rand(), 2.2) * 24;
			const shade = 0.2 + rand() * 0.16;
			city.add({
				x: 2 + Math.cos(a) * r * 1.25,
				y: hgt / 2,
				z: -8 + Math.sin(a) * r,
				sx: 7 + rand() * 12,
				sy: hgt,
				sz: 7 + rand() * 12,
				t0: 0,
				ry: (rand() - 0.5) * 0.3,
				color: new Color(shade, shade * 0.98, shade * 0.95)
			});
		}

		// Street lamps along the site frontage.
		const poles = this.batch(unit, dark, 'none', 1, { cast: false, receive: false });
		const lamps = this.batch(unit, this.lampMat, 'none', 1, { cast: false, receive: false });
		for (let x = -28; x <= 34; x += 10) {
			poles.add({ x, y: 1.5, z: 15.3, sx: 0.08, sy: 3, sz: 0.08, t0: 0 });
			poles.add({ x, y: 3, z: 15.75, sx: 0.06, sy: 0.06, sz: 0.9, t0: 0 });
			lamps.add({ x, y: 2.94, z: 16.15, sx: 0.28, sy: 0.08, sz: 0.4, t0: 0 });
		}

		// Mature trees outside the plot (sides and back).
		const streetTrunks = this.batch(this.geo(new CylinderGeometry(0.5, 0.7, 1, 6)), bark, 'y', 0.2);
		const canopy = this.geo(new IcosahedronGeometry(1, 1));
		const streetTrees = this.batch(canopy, foliage, 'xyz', 0.2);
		const greens = ['#617150', '#4f5d3b', '#76855c', '#5a6a45'];
		const addTree = (x: number, z: number, r: number, t0: number, t1?: number) => {
			const trunkH = r * 1.15;
			streetTrunks.add({ x, y: trunkH / 2, z, sx: 0.26 * r, sy: trunkH, sz: 0.26 * r, t0, t1 });
			streetTrees.add({
				x,
				y: trunkH + r * 0.85,
				z,
				sx: r,
				sy: r * 1.15,
				sz: r,
				t0,
				t1,
				ry: rand() * 3,
				color: greens[Math.floor(rand() * greens.length)]
			});
			streetTrees.add({
				x: x + r * 0.45,
				y: trunkH + r * 1.35,
				z: z - r * 0.3,
				sx: r * 0.7,
				sy: r * 0.8,
				sz: r * 0.7,
				t0,
				t1,
				ry: rand() * 3,
				color: greens[Math.floor(rand() * greens.length)]
			});
		};
		for (let i = 0; i < (high ? 26 : 14); i++) {
			const side = i % 3;
			const x = side === 0 ? -24 - rand() * 10 : side === 1 ? 26 + rand() * 10 : -20 + rand() * 44;
			const z = side === 2 ? -17 - rand() * 8 : -14 + rand() * 26;
			addTree(x, z, 1 + rand() * 0.9, -1);
		}

		/* Site set-up: hoarding, cabins, stores */
		const hoarding = this.batch(unit, hoardMat, 'y', 0.012);
		const perimeter: { x: number; z: number; ry: number }[] = [];
		for (let x = -15.8; x < 21; x += 2.4) {
			if (x < 13 || x > 19) perimeter.push({ x, z: 14, ry: 0 });
		}
		for (let z = 12.8; z > -12; z -= 2.4) perimeter.push({ x: 21, z, ry: Math.PI / 2 });
		for (let x = 19.8; x > -17; x -= 2.4) perimeter.push({ x, z: -12, ry: Math.PI });
		for (let z = -10.8; z < 14; z += 2.4) perimeter.push({ x: -17, z, ry: -Math.PI / 2 });
		perimeter.forEach((p, i) =>
			hoarding.add({
				x: p.x,
				y: 0.8,
				z: p.z,
				sx: 2.38,
				sy: 1.6,
				sz: 0.08,
				ry: p.ry,
				t0: 0.165 + (i / perimeter.length) * 0.07,
				t1: 0.82 + (i / perimeter.length) * 0.05
			})
		);
		// Compound wall + gate pillars replace the hoarding at handover.
		const wall = this.batch(unit, plasterMat, 'y', 0.02);
		const wallTone = '#d9d1c2';
		wall.add({ x: -2.1, y: 0.35, z: 14, sx: 29.8, sy: 0.7, sz: 0.25, t0: 0.855, color: wallTone });
		wall.add({ x: 20.1, y: 0.35, z: 14, sx: 1.8, sy: 0.7, sz: 0.25, t0: 0.87, color: wallTone });
		wall.add({ x: 21, y: 0.35, z: 1, sx: 0.25, sy: 0.7, sz: 26, t0: 0.86, color: wallTone });
		wall.add({ x: 2, y: 0.35, z: -12, sx: 38, sy: 0.7, sz: 0.25, t0: 0.865, color: wallTone });
		wall.add({ x: -17, y: 0.35, z: 1, sx: 0.25, sy: 0.7, sz: 26, t0: 0.86, color: wallTone });
		for (const x of [12.9, 19.2])
			wall.add({ x, y: 0.6, z: 14, sx: 0.5, sy: 1.2, sz: 0.5, t0: 0.875, color: '#b9643e' });

		const cabins = this.batch(unit, whitePaint, 'y', 0.015);
		cabins.add({ x: 17.4, y: 0.6, z: -10.3, sx: 2.8, sy: 1.2, sz: 1.2, t0: 0.18, t1: 0.84 });
		cabins.add({
			x: 17.4,
			y: 0.6,
			z: -8.8,
			sx: 2.8,
			sy: 1.2,
			sz: 1.2,
			t0: 0.19,
			t1: 0.84,
			color: '#5b7c98'
		});
		cabins.add({ x: 17.4, y: 1.8, z: -10.3, sx: 2.8, sy: 1.2, sz: 1.2, t0: 0.205, t1: 0.835 });
		cabins.add({
			x: 19.8,
			y: 0.55,
			z: 12.4,
			sx: 1,
			sy: 1.1,
			sz: 1,
			t0: 0.2,
			t1: 0.85,
			color: '#5b7c98'
		});
		const cabinWin = this.batch(unit, glass, 'y', 0.015, { cast: false, receive: false });
		for (const [y, z, t0] of [
			[0.7, -9.69, 0.18],
			[0.7, -8.19, 0.19],
			[1.9, -9.69, 0.205]
		])
			cabinWin.add({ x: 17.4, y, z, sx: 1.6, sy: 0.42, sz: 0.02, t0: t0 + 0.004, t1: 0.835 });

		// Material stores: rebar, formwork ply, bricks, cement, sand and aggregate.
		const rebarStack = this.batch(unit, rebar, 'y', 0.015);
		for (let k = 0; k < 3; k++)
			for (let layer = 0; layer < 3; layer++)
				rebarStack.add({
					x: -12 + k * 0.1,
					y: 0.22 + layer * 0.14,
					z: -9.6 + k * 0.75,
					sx: 5.4,
					sy: 0.12,
					sz: 0.5,
					t0: 0.24 + k * 0.01,
					t1: 0.6 + k * 0.01
				});
		const sleepers = this.batch(unit, plank, 'y', 0.015);
		for (const x of [-14, -12, -10])
			sleepers.add({ x, y: 0.08, z: -8.85, sx: 0.25, sy: 0.16, sz: 2.6, t0: 0.235, t1: 0.62 });
		const plyStack = this.batch(unit, ply, 'y', 0.015);
		for (let k = 0; k < 3; k++)
			plyStack.add({
				x: -14.6,
				y: 0.25 + (k % 2) * 0.5,
				z: 2.6 + Math.floor(k / 2) * 1.5,
				sx: 2.3,
				sy: 0.48,
				sz: 1.15,
				t0: 0.3 + k * 0.01,
				t1: 0.64
			});
		const bricksPallets = this.batch(unit, brickMat, 'y', 0.012);
		for (let i = 0; i < 3; i++)
			for (let j = 0; j < 2; j++)
				bricksPallets.add({
					x: 12.4 + i * 1.15,
					y: 0.3,
					z: 8.6 + j * 1.15,
					sx: 0.95,
					sy: 0.6,
					sz: 0.95,
					t0: 0.44 + (i + j) * 0.006,
					t1: 0.66 + i * 0.01
				});
		const cement = this.batch(unit, whitePaint, 'y', 0.012);
		for (let i = 0; i < 3; i++)
			cement.add({
				x: 16.3,
				y: 0.24,
				z: 3.4 + i * 1,
				sx: 1.2,
				sy: 0.48,
				sz: 0.85,
				t0: 0.36 + i * 0.008,
				t1: 0.78,
				color: '#cfcac0'
			});
		const heaps = this.batch(this.geo(new IcosahedronGeometry(1, 1)), earth, 'xyz', 0.03);
		heaps.add({
			x: 12.5,
			y: 0.2,
			z: -8,
			sx: 3.6,
			sy: 1.5,
			sz: 2.8,
			t0: 0.2,
			t1: 0.36,
			color: '#6d5440'
		});
		heaps.add({
			x: 15.2,
			y: 0.1,
			z: -5.6,
			sx: 2.2,
			sy: 1,
			sz: 2,
			t0: 0.23,
			t1: 0.37,
			color: '#735a45'
		});
		heaps.add({
			x: -13.2,
			y: 0.05,
			z: 9.4,
			sx: 2.2,
			sy: 0.9,
			sz: 1.8,
			t0: 0.3,
			t1: 0.8,
			color: '#c7a67b'
		});
		heaps.add({
			x: -10.3,
			y: 0.05,
			z: 10.6,
			sx: 1.8,
			sy: 0.75,
			sz: 1.6,
			t0: 0.31,
			t1: 0.8,
			color: '#8d8983'
		});

		/* The building */
		const raft = this.batch(unit, concreteRaw, 'y', 0.05);
		const columns = this.batch(unit, concrete, 'y', step * 0.5);
		const formwork = this.batch(unit, ply, 'y', step * 0.3);
		const props = this.batch(unit, steel, 'y', step * 0.3, { cast: false, receive: false });
		const starters = this.batch(unit, rebar, 'y', step * 0.3, { cast: false, receive: false });
		const slabs = this.batch(unit, concrete, 'y', step * 0.4);
		const balconies = this.batch(unit, concrete, 'y', step * 0.4);
		const bricks = this.batch(unit, brickMat, 'y', 0.02);
		const panes = this.batch(unit, glass, 'y', 0.02, { cast: false, receive: true });
		const plaster = this.batch(unit, plasterMat, 'y', 0.012);
		const lights = this.batch(unit, this.litMat, 'none', 1, { cast: false, receive: false });
		const tubes = this.batch(unit, steel, 'y', 0.012, { cast: false, receive: false });
		const braces = this.batch(unit, steel, 'xyz', 0.012, { cast: false, receive: false });
		const decks = this.batch(unit, plank, 'y', 0.012, { cast: false, receive: true });
		const nets = this.batch(unit, netMat, 'y', 0.015, { cast: false, receive: false });
		const roof = this.batch(unit, plasterMat, 'y', 0.015);
		const tanks = this.batch(this.geo(new CylinderGeometry(0.5, 0.5, 1, 14)), tank, 'y', 0.015);
		const bodies = this.batch(unit, hivis, 'none', 1, { cast: true, receive: false });
		const legs = this.batch(unit, navy, 'none', 1, { cast: false, receive: false });
		const helmets = this.batch(this.geo(new SphereGeometry(1, 8, 6)), helmetMat, 'none', 1, {
			cast: false,
			receive: false
		});

		const worker = (x: number, y: number, z: number, t0: number, t1: number) => {
			legs.add({ x, y: y + 0.19, z, sx: 0.24, sy: 0.38, sz: 0.16, t0, t1 });
			bodies.add({ x, y: y + 0.55, z, sx: 0.3, sy: 0.36, sz: 0.2, t0, t1, ry: rand() * 3 });
			helmets.add({
				x,
				y: y + 0.82,
				z,
				sx: 0.12,
				sy: 0.1,
				sz: 0.12,
				t0,
				t1,
				color: rand() > 0.7 ? '#f2c230' : '#f3f1ea'
			});
		};

		const linePos: number[] = [];
		const seg = (a: number[], b: number[]) => linePos.push(...a, ...b);

		for (const bl of blocks) {
			const x0 = bl.cx - bl.w / 2;
			const z0 = bl.cz - bl.d / 2;
			const x1 = x0 + bl.w;
			const z1 = z0 + bl.d;
			const H = bl.floors * FH;
			const colX = Array.from(
				{ length: bl.colsX },
				(_, i) => x0 + 0.4 + (i * (bl.w - 0.8)) / (bl.colsX - 1)
			);
			const colZ = Array.from(
				{ length: bl.colsZ },
				(_, j) => z0 + 0.4 + (j * (bl.d - 0.8)) / (bl.colsZ - 1)
			);
			raft.add({ x: bl.cx, y: 0.25, z: bl.cz, sx: bl.w + 1.6, sy: 0.5, sz: bl.d + 1.6, t0: 0.27 });

			for (const x of colX) seg([x, 0.06, z0 - 1.5], [x, 0.06, z1 + 1.5]);
			for (const z of colZ) seg([x0 - 1.5, 0.06, z], [x1 + 1.5, 0.06, z]);

			// Facades: [along-axis column positions, fixed coordinate, axis]
			const facades: { cols: number[]; fixed: number; axis: 'x' | 'z'; out: number }[] = [
				{ cols: colX, fixed: z1 - 0.3, axis: 'x', out: 1 },
				{ cols: colX, fixed: z0 + 0.3, axis: 'x', out: -1 },
				{ cols: colZ, fixed: x0 + 0.3, axis: 'z', out: -1 },
				{ cols: colZ, fixed: x1 - 0.3, axis: 'z', out: 1 }
			];
			const piece = (
				batch: Batch,
				axis: 'x' | 'z',
				along: number,
				fixed: number,
				y: number,
				len: number,
				h: number,
				thick: number,
				t0: number,
				t1?: number,
				color?: string
			) =>
				batch.add(
					axis === 'x'
						? { x: along, y, z: fixed, sx: len, sy: h, sz: thick, t0, t1, color }
						: { x: fixed, y, z: along, sx: thick, sy: h, sz: len, t0, t1, color }
				);

			for (let f = 0; f < bl.floors; f++) {
				const y = 0.5 + f * FH;
				const clear = FH - 0.22;
				const last = f === bl.floors - 1;

				for (const x of colX)
					for (const z of colZ) {
						columns.add({ x, y: y + FH / 2, z, sx: 0.38, sy: FH, sz: 0.38, t0: colT(f) });
						plaster.add({
							x,
							y: y + FH / 2,
							z,
							sx: 0.44,
							sy: FH,
							sz: 0.44,
							t0: plasterT(f),
							color: bl.tone
						});
						starters.add({
							x,
							y: y + FH + 0.3,
							z,
							sx: 0.3,
							sy: 0.6,
							sz: 0.3,
							t0: slabT(f) + step * 0.2,
							t1: last ? FRAME[1] + 0.02 : colT(f + 1) + step * 0.2
						});
						props.add({
							x: x + (x < bl.cx ? 0.9 : -0.9),
							y: y + clear / 2,
							z: z + (z < bl.cz ? 0.9 : -0.9),
							sx: 0.07,
							sy: clear,
							sz: 0.07,
							t0: colT(f) + step * 0.3,
							t1: slabT(f) + step * 1.6
						});
					}
				formwork.add({
					x: bl.cx,
					y: y + FH - 0.25,
					z: bl.cz,
					sx: bl.w + 0.9,
					sy: 0.12,
					sz: bl.d + 0.9,
					t0: colT(f) + step * 0.35,
					t1: slabT(f) + step * 1.4
				});
				slabs.add({
					x: bl.cx,
					y: y + FH - 0.11,
					z: bl.cz,
					sx: bl.w + 0.5,
					sy: 0.22,
					sz: bl.d + 0.5,
					t0: slabT(f)
				});
				plaster.add({
					x: bl.cx,
					y: y + FH - 0.11,
					z: bl.cz,
					sx: bl.w + 0.56,
					sy: 0.26,
					sz: bl.d + 0.56,
					t0: plasterT(f),
					color: f % 3 === 2 ? '#b9643e' : bl.tone
				});

				// Balconies on the long street face (cast with the slab, parapets at finishes).
				if (bl.stilt && f >= 1) {
					const bx = bl.cx - bl.w * 0.2;
					const bw = bl.w * 0.46;
					const bz = z1 + 0.25 + 0.6;
					balconies.add({ x: bx, y: y - 0.11, z: bz, sx: bw, sy: 0.2, sz: 1.2, t0: slabT(f - 1) });
					plaster.add({
						x: bx,
						y: y + 0.22,
						z: bz + 0.56,
						sx: bw,
						sy: 0.5,
						sz: 0.1,
						t0: plasterT(f),
						color: bl.tone
					});
					plaster.add({
						x: bx - bw / 2 + 0.05,
						y: y + 0.22,
						z: bz,
						sx: 0.1,
						sy: 0.5,
						sz: 1.2,
						t0: plasterT(f),
						color: bl.tone
					});
					plaster.add({
						x: bx + bw / 2 - 0.05,
						y: y + 0.22,
						z: bz,
						sx: 0.1,
						sy: 0.5,
						sz: 1.2,
						t0: plasterT(f),
						color: bl.tone
					});
				}

				// Deck crew on the working floor.
				if (high)
					for (let k = 0; k < 2; k++)
						worker(
							bl.cx + (rand() - 0.5) * bl.w * 0.7,
							y + FH,
							bl.cz + (rand() - 0.5) * bl.d * 0.7,
							slabT(f) + step * 0.3,
							last ? 0.6 : slabT(f + 1) + step * 0.3
						);

				// Brick infill with window openings (stilt parking stays open on the ground floor).
				if (!(bl.stilt && f === 0))
					for (const fc of facades)
						for (let i = 0; i < fc.cols.length - 1; i++) {
							const a = fc.cols[i] + 0.19;
							const e = fc.cols[i + 1] - 0.19;
							const span = e - a;
							const mid = (a + e) / 2;
							const jw = span * 0.2;
							const winH = clear - 0.58;
							const winY = y + 0.38 + winH / 2;
							const tb = brickT(f) + (i / fc.cols.length) * 0.006;
							const tone = bl.tone;
							const accent = '#b9643e';
							for (const [batch, thick, t0, off] of [
								[bricks, 0.2, tb, 0],
								[plaster, 0.26, plasterT(f), 0]
							] as const) {
								const col = batch === plaster;
								piece(
									batch,
									fc.axis,
									mid,
									fc.fixed + off,
									y + 0.19,
									span,
									0.38,
									thick,
									t0,
									undefined,
									col ? tone : undefined
								);
								piece(
									batch,
									fc.axis,
									mid,
									fc.fixed + off,
									y + clear - 0.1,
									span,
									0.2,
									thick,
									t0 + 0.002,
									undefined,
									col ? accent : undefined
								);
								piece(
									batch,
									fc.axis,
									a + jw / 2,
									fc.fixed + off,
									winY,
									jw,
									winH,
									thick,
									t0 + 0.001,
									undefined,
									col ? tone : undefined
								);
								piece(
									batch,
									fc.axis,
									e - jw / 2,
									fc.fixed + off,
									winY,
									jw,
									winH,
									thick,
									t0 + 0.001,
									undefined,
									col ? tone : undefined
								);
							}
							const paneFixed = fc.fixed - fc.out * 0.04;
							piece(
								panes,
								fc.axis,
								mid,
								paneFixed,
								winY,
								span - 2 * jw,
								winH,
								0.05,
								glassT(f) + rand() * 0.01
							);
							if (rand() < 0.6)
								piece(
									lights,
									fc.axis,
									mid,
									paneFixed + fc.out * 0.035,
									winY,
									(span - 2 * jw) * 0.92,
									winH * 0.9,
									0.02,
									0.835 + rand() * 0.14
								);
						}
			}

			// Rooftop: parapet, stair/lift headroom and black water tanks.
			const ry = 0.5 + H;
			roof.add({
				x: bl.cx,
				y: ry + 0.3,
				z: z1 + 0.2,
				sx: bl.w + 0.5,
				sy: 0.6,
				sz: 0.1,
				t0: 0.73,
				color: bl.tone
			});
			roof.add({
				x: bl.cx,
				y: ry + 0.3,
				z: z0 - 0.2,
				sx: bl.w + 0.5,
				sy: 0.6,
				sz: 0.1,
				t0: 0.73,
				color: bl.tone
			});
			roof.add({
				x: x0 - 0.2,
				y: ry + 0.3,
				z: bl.cz,
				sx: 0.1,
				sy: 0.6,
				sz: bl.d + 0.5,
				t0: 0.73,
				color: bl.tone
			});
			roof.add({
				x: x1 + 0.2,
				y: ry + 0.3,
				z: bl.cz,
				sx: 0.1,
				sy: 0.6,
				sz: bl.d + 0.5,
				t0: 0.73,
				color: bl.tone
			});
			if (bl.stilt) {
				roof.add({
					x: bl.cx + 2,
					y: ry + 0.9,
					z: bl.cz - 1.5,
					sx: 3,
					sy: 1.8,
					sz: 2.4,
					t0: 0.735,
					color: bl.tone
				});
				for (let k = 0; k < 3; k++)
					tanks.add({
						x: bl.cx - 3 + k * 1.2,
						y: ry + 0.45,
						z: bl.cz - 2.5,
						sx: 1,
						sy: 0.9,
						sz: 1,
						t0: 0.74 + k * 0.004
					});
			}

			// Steel tube-and-coupler scaffolding + green shade net around the whole frame.
			const sx0 = x0 - 1.05;
			const sx1 = x1 + 1.05;
			const sz0 = z0 - 1.05;
			const sz1 = z1 + 1.05;
			const sides = [
				{ a: V(sx0, 0, sz1), b: V(sx1, 0, sz1), n: V(0, 0, 1) },
				{ a: V(sx1, 0, sz1), b: V(sx1, 0, sz0), n: V(1, 0, 0) },
				{ a: V(sx1, 0, sz0), b: V(sx0, 0, sz0), n: V(0, 0, -1) },
				{ a: V(sx0, 0, sz0), b: V(sx0, 0, sz1), n: V(-1, 0, 0) }
			];
			const m4 = new Matrix4();
			const pos = new Vector3();
			const quat = new Quaternion();
			const scl = new Vector3();
			for (let f = 0; f < bl.floors; f++) {
				const yb = f === 0 ? 0 : 0.5 + f * FH;
				const yt = 0.5 + (f + 1) * FH;
				const t0 = slabT(f) + step * 0.8;
				const t1 = strikeT(f);
				for (const [si, s] of sides.entries()) {
					const len = s.a.distanceTo(s.b);
					const n = Math.max(2, Math.round(len / 1.9));
					for (let k = 0; k <= n; k++) {
						const p = s.a.clone().lerp(s.b, k / n);
						tubes.add({
							x: p.x,
							y: (yb + yt) / 2,
							z: p.z,
							sx: 0.06,
							sy: yt - yb,
							sz: 0.06,
							t0,
							t1
						});
					}
					const mid = s.a.clone().lerp(s.b, 0.5);
					const along = Math.abs(s.n.z) > 0 ? { sx: len, sz: 0.05 } : { sx: 0.05, sz: len };
					for (const ly of [yt - 0.04, (yb + yt) / 2])
						tubes.add({ x: mid.x, y: ly, z: mid.z, ...along, sy: 0.05, t0, t1 });
					const inset = mid.clone().addScaledVector(s.n, -0.35);
					decks.add({
						x: inset.x,
						y: yt - 0.06,
						z: inset.z,
						sx: Math.abs(s.n.z) > 0 ? len : 0.6,
						sy: 0.04,
						sz: Math.abs(s.n.z) > 0 ? 0.6 : len,
						t0,
						t1
					});
					if (high) {
						const flip = (f + si) % 2 === 0;
						strut(
							V(flip ? s.a.x : s.b.x, yb, flip ? s.a.z : s.b.z),
							V(mid.x, yt, mid.z),
							0.045,
							m4
						).decompose(pos, quat, scl);
						braces.add({
							x: pos.x,
							y: pos.y,
							z: pos.z,
							sx: scl.x,
							sy: scl.y,
							sz: scl.z,
							q: quat.clone(),
							t0,
							t1
						});
					}
					const netPos = mid.clone().addScaledVector(s.n, 0.06);
					nets.add({
						x: netPos.x,
						y: (yb + yt) / 2,
						z: netPos.z,
						sx: Math.abs(s.n.z) > 0 ? len : 0.02,
						sy: yt - yb,
						sz: Math.abs(s.n.z) > 0 ? 0.02 : len,
						t0: Math.max(t0, netT(f)),
						t1
					});
				}
			}

			for (const [cx, cz] of [
				[x0, z0],
				[x1, z0],
				[x1, z1],
				[x0, z1]
			])
				seg([cx, 0.5, cz], [cx, 0.5 + H, cz]);
		}
		for (let f = 0; f <= N; f++)
			for (const bl of blocks) {
				if (f > bl.floors) continue;
				const y = 0.5 + f * FH;
				const x0 = bl.cx - bl.w / 2;
				const z0 = bl.cz - bl.d / 2;
				const x1 = x0 + bl.w;
				const z1 = z0 + bl.d;
				seg([x0, y, z0], [x1, y, z0]);
				seg([x1, y, z0], [x1, y, z1]);
				seg([x1, y, z1], [x0, y, z1]);
				seg([x0, y, z1], [x0, y, z0]);
			}

		// Ground crew around the stores and the pit.
		for (const [x, z] of [
			[-11.5, -7.6],
			[-13.6, 4.6],
			[11.6, 10.6],
			[15, 5.5],
			[-6, 8.2],
			[3.8, 8.6],
			[9.8, -6.8],
			[18, -7.4]
		])
			worker(x, 0, z, 0.2 + rand() * 0.05, 0.8 + rand() * 0.04);

		/* Landscape at handover */
		const soft = this.batch(unit, lawn, 'xyz', 0.03, { cast: false, receive: true });
		soft.add({ x: -10, y: 0.04, z: 10.2, sx: 12, sy: 0.08, sz: 5.2, t0: 0.84 });
		soft.add({ x: 3.5, y: 0.04, z: 10.2, sx: 7, sy: 0.08, sz: 5.2, t0: 0.85 });
		soft.add({ x: -13.5, y: 0.04, z: -3, sx: 5, sy: 0.08, sz: 14, t0: 0.855 });
		const hard = this.batch(unit, paving, 'xyz', 0.03, { cast: false, receive: true });
		// Interlocking-paver yard over the whole plot, then the driveway and walk on top.
		hard.add({ x: 2, y: 0.02, z: 1, sx: 37.6, sy: 0.04, sz: 25.6, t0: 0.815, color: '#8a857b' });
		hard.add({ x: 15.9, y: 0.03, z: 8.5, sx: 5.6, sy: 0.06, sz: 11, t0: 0.82 });
		hard.add({ x: 3, y: 0.03, z: 6.9, sx: 23, sy: 0.06, sz: 1.8, t0: 0.825 });
		const plantT = (i: number) => 0.83 + (i % 9) * 0.011;
		const plots = high ? 22 : 12;
		for (let i = 0; i < plots; i++) {
			const side = i % 3;
			const x = side === 0 ? -15 + rand() * 12 : side === 1 ? -15.8 + rand() * 2.5 : 1 + rand() * 6;
			const z = side === 0 ? 8.5 + rand() * 4 : side === 1 ? -10 + rand() * 16 : 8.5 + rand() * 4;
			addTree(x, z, 0.6 + rand() * 0.55, plantT(i));
		}

		for (const b of this.batches) b.build(this.scene);

		const lg = new BufferGeometry();
		lg.setAttribute('position', new Float32BufferAttribute(linePos, 3));
		this.lineVertexCount = linePos.length / 3;
		this.lines = new LineSegments(lg, this.lineMat);
		this.scene.add(this.lines);

		this.buildCrane(yellow, dark, whitePaint, glass, concreteRaw, rebar);
		this.buildVehicles(yellow, dark, whitePaint, glass, tyre, drumMat);

		if (high) {
			const count = 160;
			const pos = new Float32Array(count * 3);
			this.dustSeeds = new Float32Array(count * 3);
			for (let i = 0; i < count; i++) {
				this.dustSeeds[i * 3] = -12 + rand() * 30;
				this.dustSeeds[i * 3 + 1] = rand() * 5;
				this.dustSeeds[i * 3 + 2] = -9 + rand() * 20;
			}
			const dg = this.geo(new BufferGeometry());
			dg.setAttribute('position', new Float32BufferAttribute(pos, 3));
			this.dust = new Points(
				dg,
				this.mat(
					new PointsMaterial({
						map: T.dot,
						color: '#b8956f',
						size: 1.4,
						transparent: true,
						opacity: 0,
						depthWrite: false
					})
				)
			);
			this.dust.frustumCulled = false;
			this.scene.add(this.dust);
		}
	}

	/** Climbing tower crane: lattice mast that grows section by section with the building. */
	private buildCrane(
		paint: Material,
		steel: Material,
		white: Material,
		glass: Material,
		concrete: Material,
		load: Material
	) {
		const S = this.SEC;
		const w = 0.9;
		const c = w / 2;
		this.maxSections = Math.ceil((this.topY + 8) / S);
		this.minSections = Math.ceil(8.5 / S);

		// One mast section: 4 chords, 4 horizontals, 4 diagonals.
		const corners = [V(-c, 0, -c), V(c, 0, -c), V(c, 0, c), V(-c, 0, c)];
		for (let i = 0; i < 4; i++) {
			const a = corners[i];
			const b = corners[(i + 1) % 4];
			this.mastTemplate.push(strut(a, V(a.x, S, a.z), 0.08));
			this.mastTemplate.push(strut(a, b, 0.05));
			this.mastTemplate.push(strut(a, V(b.x, S, b.z), 0.045));
		}
		const per = this.mastTemplate.length;
		this.mast = new InstancedMesh(this.unit, paint, this.maxSections * per);
		this.mast.frustumCulled = false;
		this.mast.castShadow = true;
		this.mast.position.y = 0.6;
		this.crane.add(this.mast);

		this.craneFooting = this.box(concrete, 0, 0.3, 0, 2.8, 0.6, 2.8, this.crane);

		// Head: slewing unit, cab, jib, counter-jib, apex and ties.
		const struts: Matrix4[] = [];
		const add = (a: Vector3, b: Vector3, t: number) => struts.push(strut(a, b, t));
		const L = 19;
		for (const z of [-0.35, 0.35]) add(V(0.5, 0.6, z), V(L, 0.6, z), 0.07);
		add(V(0.5, 1.4, 0), V(L - 1, 1.4, 0), 0.07);
		add(V(L - 1, 1.4, 0), V(L, 0.6, 0), 0.05);
		for (let x = 0.5; x < L - 1.2; x += 1.25) {
			for (const z of [-0.35, 0.35]) {
				add(V(x, 0.6, z), V(x + 0.625, 1.4, 0), 0.035);
				add(V(x + 0.625, 1.4, 0), V(x + 1.25, 0.6, z), 0.035);
			}
			add(V(x, 0.6, -0.35), V(x, 0.6, 0.35), 0.03);
		}
		for (const z of [-0.5, 0.5]) {
			add(V(-0.4, 0.6, z), V(-7, 0.6, z), 0.08);
			add(V(-0.4, 1.15, z), V(-7, 1.15, z), 0.03);
		}
		for (let x = -1; x >= -7; x -= 1.3) {
			add(V(x, 0.6, -0.5), V(x, 0.6, 0.5), 0.04);
			for (const z of [-0.5, 0.5]) add(V(x, 0.6, z), V(x, 1.15, z), 0.025);
		}
		for (const [x, z] of [
			[-c, -c],
			[c, -c],
			[c, c],
			[-c, c]
		])
			add(V(x, 0.6, z), V(0, 3.6, 0), 0.08);
		add(V(0, 3.6, 0), V(12.5, 1.4, 0), 0.04);
		add(V(0, 3.6, 0), V(-6.6, 0.75, 0.3), 0.035);
		add(V(0, 3.6, 0), V(-6.6, 0.75, -0.3), 0.035);
		const jib = new InstancedMesh(this.unit, paint, struts.length);
		struts.forEach((m, i) => jib.setMatrixAt(i, m));
		jib.castShadow = true;
		this.head.add(jib);
		this.box(steel, 0, 0.3, 0, 1.3, 0.6, 1.3, this.head);
		this.box(white, 1.05, 0.2, 0.95, 1.05, 0.95, 0.85, this.head);
		this.box(glass, 1.59, 0.25, 0.95, 0.03, 0.6, 0.72, this.head, false);
		for (let k = 0; k < 3; k++)
			this.box(concrete, -5.2 - k * 0.6, 0.15, 0, 0.55, 1.3, 1.05, this.head);
		const beacon = this.geo(new SphereGeometry(0.13, 10, 8));
		for (const p of [V(0, 3.75, 0), V(L, 0.8, 0), V(-7, 1.3, 0)]) {
			const m = new Mesh(beacon, this.beaconMat);
			m.position.copy(p);
			this.head.add(m);
		}

		// Trolley, hoist rope, hook block and a bundle of rebar on slings.
		this.trolley.position.y = 0.45;
		this.box(steel, 0, 0, 0, 0.8, 0.25, 0.85, this.trolley);
		this.cable = this.box(steel, 0, -0.5, 0, 0.035, 1, 0.035, this.trolley, false);
		this.trolley.add(this.hook);
		this.box(paint, 0, 0, 0, 0.32, 0.42, 0.26, this.hook);
		this.box(steel, -0.55, -0.45, 0, 0.02, 0.9, 0.02, this.hook, false).rotation.z = -0.9;
		this.box(steel, 0.55, -0.45, 0, 0.02, 0.9, 0.02, this.hook, false).rotation.z = 0.9;
		this.box(load, 0, -0.95, 0, 2.6, 0.22, 0.45, this.hook);
		this.head.add(this.trolley);

		this.crane.add(this.head);
		this.crane.position.set(4.4, 0, -8.4);
		this.scene.add(this.crane);
		this.updateMast();
	}

	private updateMast() {
		const per = this.mastTemplate.length;
		const m = new Matrix4();
		const zero = new Matrix4().makeScale(0, 0, 0);
		for (let k = 0; k < this.maxSections; k++) {
			const g = clamp01(this.mastLen - k);
			for (let j = 0; j < per; j++) {
				if (g <= 0.001) this.mast.setMatrixAt(k * per + j, zero);
				else {
					m.copy(this.mastTemplate[j]);
					m.elements[13] += (k - 1 + g) * this.SEC;
					this.mast.setMatrixAt(k * per + j, m);
				}
			}
		}
		this.mast.instanceMatrix.needsUpdate = true;
		this.mastDrawn = this.mastLen;
	}

	private buildVehicles(
		yellow: Material,
		dark: Material,
		white: Material,
		glass: Material,
		tyre: Material,
		drumMat: Material
	) {
		const gate = V(16, 0, 18.5);

		// Hydraulic excavator.
		const ex = new Group();
		this.box(tyre, 0, 0.22, 0.55, 2.3, 0.44, 0.44, ex);
		this.box(tyre, 0, 0.22, -0.55, 2.3, 0.44, 0.44, ex);
		this.box(dark, 0, 0.5, 0, 0.9, 0.2, 0.9, ex);
		const upper = new Group();
		upper.position.y = 0.6;
		ex.add(upper);
		this.box(yellow, -0.1, 0.3, 0, 1.75, 0.5, 1.3, upper);
		this.box(yellow, 0.35, 0.9, 0.3, 0.7, 0.7, 0.62, upper);
		this.box(glass, 0.71, 0.95, 0.3, 0.02, 0.5, 0.52, upper, false);
		this.box(dark, -1.0, 0.35, 0, 0.3, 0.55, 1.28, upper);
		const boom = new Group();
		boom.position.set(0.75, 0.5, -0.3);
		upper.add(boom);
		this.box(yellow, 1.15, 0, 0, 2.3, 0.3, 0.26, boom);
		const stick = new Group();
		stick.position.set(2.3, 0, 0);
		boom.add(stick);
		this.box(yellow, 0, -0.8, 0, 0.22, 1.6, 0.2, stick);
		this.box(dark, 0.15, -1.7, 0, 0.5, 0.38, 0.55, stick);
		this.scene.add(ex);
		this.excavator = {
			group: ex,
			upper,
			boom,
			stick,
			gate,
			park: V(-2.5, 0, 8.3),
			in: [0.175, 0.215],
			out: [0.325, 0.36]
		};

		// Transit mixer truck.
		const mx = new Group();
		this.box(dark, 0, 0.6, 0, 3.8, 0.25, 1.0, mx);
		this.box(white, 1.5, 1.15, 0, 0.95, 1.0, 1.08, mx);
		this.box(glass, 1.985, 1.3, 0, 0.02, 0.42, 0.92, mx, false);
		const wheel = this.geo(new CylinderGeometry(0.32, 0.32, 0.24, 14));
		for (const x of [-1.3, -0.6, 1.3])
			for (const z of [-0.5, 0.5]) {
				const wm = new Mesh(wheel, tyre);
				wm.rotation.x = Math.PI / 2;
				wm.position.set(x, 0.32, z);
				wm.castShadow = true;
				mx.add(wm);
			}
		const tilt = new Group();
		tilt.position.set(-0.45, 1.45, 0);
		tilt.rotation.z = -0.2;
		mx.add(tilt);
		const drum = new Group();
		tilt.add(drum);
		const drumMesh = new Mesh(this.geo(new CylinderGeometry(0.64, 0.4, 2.3, 20)), drumMat);
		drumMesh.rotation.z = Math.PI / 2;
		drumMesh.castShadow = true;
		drum.add(drumMesh);
		this.scene.add(mx);
		this.mixer = {
			group: mx,
			drum,
			gate,
			park: V(-11.8, 0, 8.6),
			in: [0.335, 0.375],
			out: [0.6, 0.64]
		};
	}

	/* ── Frame loop ─────────────────────────────────────────────────────────── */
	private onContextLost = (e: Event) => {
		e.preventDefault();
		this.opts.onError?.(new Error('WebGL context lost'));
	};

	private requestFrame() {
		if (!this.raf && this.visible && !this.disposed) this.raf = requestAnimationFrame(this.frame);
	}

	private frame = (now: number) => {
		this.raf = 0;
		const rawDt = Math.max(0.001, (now - (this.last || now)) / 1000);
		const dt = Math.min(0.1, rawDt);
		this.last = now;
		this.frameNo++;

		let active = false;
		if (this.intro < 1) {
			this.intro = Math.min(1, this.intro + Math.min(0.25, rawDt) / 2.6);
			active = true;
		}
		for (const key of ['hero', 'build', 'px', 'py'] as const) {
			const s = this.springs[key];
			if (this.opts.reducedMotion) {
				s.x = this.target[key];
				s.v = 0;
			} else if (s.step(this.target[key], dt)) active = true;
		}
		const ambient = !this.opts.reducedMotion && !this.lowPower;
		if (!this.opts.reducedMotion) this.clock += dt;

		// On low-end devices, idle ambience runs at half rate; scrolling always gets every frame.
		const skip = !active && !this.high && this.frameNo % 2 === 1;
		if (!skip) {
			try {
				const moved = this.apply(dt);
				active ||= moved;
				// Shadows redraw every other frame while scrolling, every fourth while idle.
				if (this.high && this.frameNo % (active ? 2 : 4) === 0)
					this.renderer.shadowMap.needsUpdate = true;
				this.renderer.render(this.scene, this.camera);
			} catch (err) {
				this.opts.onError?.(err);
				return;
			}
			if (rawDt < 0.25) this.adaptResolution(rawDt);
		}
		if (active || ambient) this.requestFrame();
	};

	/**
	 * Dynamic resolution: while the average frame runs slower than ~48fps, render at 15% fewer
	 * pixels (down to 0.7× CSS resolution — the scene sits under soft gradients, so it holds up).
	 * If even that is too slow, idle ambience stops and frames are drawn only while scrolling.
	 */
	private adaptResolution(dt: number) {
		// Count slow frames rather than averaging, so one-off hitches (GC, image decode elsewhere
		// on the page) don't permanently cost resolution.
		if (dt > 1 / 48) this.perfSlow++;
		if (++this.perfN < 40) return;
		const slow = this.perfSlow / this.perfN;
		this.perfSlow = this.perfN = 0;
		if (slow < 0.5) return;
		// Big steps: each resize reallocates the framebuffers, so do as few as possible.
		if (this.dpr > 0.71) {
			this.dpr = Math.max(0.7, Math.min(this.dpr * 0.75, 0.8));
			this.renderer.setPixelRatio(this.dpr);
			this.renderer.setSize(this.width, this.height, false);
		} else this.lowPower = true;
	}

	/** Camera distance such that every framing point lies inside the frustum (with margin). */
	private fitDistance(theta: number, phi: number, target: Vector3, points: Vector3[]) {
		const { right, up, back, v } = this.tmp;
		back.set(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta));
		right.set(Math.cos(theta), 0, -Math.sin(theta));
		up.crossVectors(back, right);
		const tanV = Math.tan((this.camera.fov * Math.PI) / 360) * 0.94;
		const tanH = tanV * this.camera.aspect;
		let d = 0;
		for (const p of points) {
			v.subVectors(p, target);
			const z = v.dot(back);
			d = Math.max(d, z + Math.abs(v.dot(right)) / tanH, z + Math.abs(v.dot(up)) / tanV);
		}
		return d;
	}

	private updateMood(b: number) {
		let i = 0;
		while (i < MOODS.length - 2 && b > MOODS[i + 1].at) i++;
		const a = MOODS[i];
		const c = MOODS[i + 1];
		const t = smooth(clamp01((b - a.at) / (c.at - a.at)));
		const m = this.mood;
		m.top.copy(a.topC).lerp(c.topC, t);
		m.horizon.copy(a.horizonC).lerp(c.horizonC, t);
		m.sun.copy(a.sunC).lerp(c.sunC, t);
		m.sunI = lerp(a.sunI, c.sunI, t);
		m.hemi = lerp(a.hemi, c.hemi, t);
		m.elev = lerp(a.elev, c.elev, t);
		m.az = lerp(a.az, c.az, t);
		m.glow = lerp(a.glow, c.glow, t);
		m.exposure = lerp(a.exposure, c.exposure, t);
	}

	/** Places everything for the current springs; returns true while time-based motion is settling. */
	private apply(dt: number) {
		const b = this.springs.build.x;
		const hero = this.springs.hero.x;
		const t = this.clock;
		const N = this.floors;
		let settling = false;

		/* Setting-out lines and plot markings */
		const drawn = Math.floor(easeInOut(this.intro) * this.lineVertexCount);
		this.lines.geometry.setDrawRange(0, drawn - (drawn % 2));
		const structure = range(b, PHASES.structure);
		const envelope = range(b, PHASES.envelope);
		const finishes = range(b, PHASES.finishes);
		const handover = range(b, PHASES.handover);
		const approvals = range(b, PHASES.approvals);
		// On phones the hero headline sits over the model: keep the drawing faint until scrolling starts.
		const heroDim = this.opts.layout === 'center' ? lerp(0.15, 1, smooth(clamp01(hero * 1.4))) : 1;
		this.lineMat.opacity =
			heroDim * lerp(0.95, 0.35, structure) * lerp(1, 0, smooth(clamp01(envelope * 1.6)));
		this.boundaryMat.opacity =
			0.85 * easeOut(clamp01(approvals * 3)) * (1 - smooth(clamp01(approvals * 2 - 0.4)));
		this.siteMat.color.copy(SCRUB).lerp(WHITE, smooth(range(b, [0.16, 0.27])));
		this.pitMat.opacity = 0.6 * smooth(range(b, [0.2, 0.27])) * (1 - smooth(range(b, [0.8, 0.87])));

		for (const batch of this.batches) batch.update(b);

		/* Tower crane */
		const builtTop = 0.5 + N * this.FH * range(b, FRAME);
		const needTop = builtTop + 7.2;
		const targetLen =
			b > 0.27 && b < 0.815
				? Math.min(
						this.maxSections,
						Math.max(this.minSections, Math.ceil((needTop - 0.6) / this.SEC))
					)
				: 0;
		if (this.opts.reducedMotion || dt === 0) this.mastLen = targetLen;
		else {
			const diff = targetLen - this.mastLen;
			this.mastLen += Math.sign(diff) * Math.min(Math.abs(diff), dt * (diff > 0 ? 6 : 9));
		}
		if (Math.abs(this.mastLen - this.mastDrawn) > 1e-4) this.updateMast();
		const headTarget = b > 0.29 && b < 0.775 && this.mastLen >= this.minSections - 0.05 ? 1 : 0;
		if (this.opts.reducedMotion || dt === 0) this.headOpen = headTarget;
		else {
			const diff = headTarget - this.headOpen;
			this.headOpen += Math.sign(diff) * Math.min(Math.abs(diff), dt * 1.4);
		}
		if (Math.abs(targetLen - this.mastLen) > 1e-4 || Math.abs(headTarget - this.headOpen) > 1e-4)
			settling = true;
		const footing = smooth(range(b, [0.265, 0.285])) * (1 - smooth(range(b, [0.84, 0.86])));
		this.craneFooting.scale.y = Math.max(1e-4, footing * 0.6);
		this.craneFooting.position.y = footing * 0.3;
		const headS = easeInOut(this.headOpen);
		const headY = 0.6 + this.mastLen * this.SEC;
		this.crane.visible = footing > 0.001 || this.mastLen > 0.001;
		this.head.visible = headS > 0.001;
		this.head.position.y = headY;
		this.head.scale.setScalar(Math.max(1e-4, headS));
		this.head.rotation.y =
			lerp(-2.3, -1.2, smooth(structure)) + lerp(0, 0.5, envelope) + Math.sin(t * 0.13) * 0.3;
		const trolleyX = 6 + 9 * (0.5 + 0.5 * Math.sin(t * 0.21 + 1));
		this.trolley.position.x = trolleyX;
		const hookMax = Math.max(1.6, headY - builtTop - 1.2);
		const drop = lerp(1.4, hookMax, 0.5 - 0.5 * Math.cos(t * 0.33));
		this.cable.scale.y = drop;
		this.cable.position.y = -drop / 2;
		this.hook.position.y = -drop - 0.2;
		this.hook.rotation.z = Math.sin(t * 1.4) * 0.03;
		this.hook.rotation.y = Math.sin(t * 0.4) * 0.4;
		this.craneVis = smooth(clamp01(this.mastLen / this.minSections)) * (0.35 + 0.65 * headS);
		this.craneTop.set(this.crane.position.x, headY + 3.8 * headS, this.crane.position.z);
		this.beaconMat.color
			.setRGB(1, 0.23, 0.18)
			.multiplyScalar(Math.sin(t * 3.2) > 0.55 ? 2.2 : 0.25);

		/* Vehicles */
		const ex = this.excavator;
		if (this.drive(ex, b)) {
			ex.upper.rotation.y = Math.PI / 2 - ex.group.rotation.y + Math.sin(t * 0.45) * 0.55;
			ex.boom.rotation.z = 0.45 + Math.sin(t * 0.9) * 0.22;
			ex.stick.rotation.z = -0.75 + Math.cos(t * 0.9) * 0.35;
		}
		if (this.drive(this.mixer, b)) this.mixer.drum.rotation.x = t * 1.6;

		/* Dust */
		if (this.dust) {
			const activity = smooth(range(b, [0.17, 0.23])) * (1 - smooth(range(b, [0.6, 0.72])));
			const mat = this.dust.material as PointsMaterial;
			mat.opacity = 0.22 * activity;
			this.dust.visible = activity > 0.01;
			if (this.dust.visible) {
				const p = this.dust.geometry.getAttribute('position') as Float32BufferAttribute;
				const s = this.dustSeeds;
				for (let i = 0; i < p.count; i++) {
					const y = (s[i * 3 + 1] + t * (0.18 + (i % 7) * 0.03)) % 5;
					p.setXYZ(
						i,
						s[i * 3] + Math.sin(t * 0.3 + i) * 0.8 + y * 0.4,
						y,
						s[i * 3 + 2] + Math.cos(t * 0.25 + i * 1.7) * 0.6
					);
				}
				p.needsUpdate = true;
			}
		}

		/* Light: pre-dawn → working day → golden hour → dusk */
		this.updateMood(b);
		const m = this.mood;
		const night = Math.max(1 - smooth(range(b, [0.06, 0.2])), smooth(range(b, [0.82, 0.97])));
		this.renderer.toneMappingExposure = m.exposure;
		this.sun.color.copy(m.sun);
		this.sun.intensity = m.sunI;
		this.hemi.intensity = m.hemi * 1.4; // stands in for the image-based fill light
		this.skyMat.uniforms.top.value.copy(m.top);
		this.skyMat.uniforms.horizon.value.copy(m.horizon);
		this.skyMat.uniforms.sunColor.value.copy(m.sun);
		this.skyMat.uniforms.glow.value = m.glow;
		const sunDir = this.skyMat.uniforms.sunDir.value as Vector3;
		sunDir.set(
			Math.sin(m.az) * Math.cos(m.elev),
			Math.sin(m.elev),
			Math.cos(m.az) * Math.cos(m.elev)
		);
		this.fog.color.copy(m.horizon);
		this.cityMat.emissiveIntensity = 1.3 * night;
		this.lampMat.color.set('#ffd9a0').multiplyScalar(lerp(0.12, 1.6, night));
		this.litMat.color.set('#ffc98a').multiplyScalar(lerp(1, 1.4, handover));
		this.glowMat.opacity = 0.08 * finishes + 0.26 * handover;

		/* Camera choreography: aerial plan view → orbit around the working site → low dusk hero shot */
		const heroT = smooth(clamp01(hero));
		const drift = this.opts.reducedMotion ? 0 : 1;
		let theta =
			lerp(-0.78, -0.55, heroT) +
			smooth(b) * 1.15 +
			this.springs.px.x * 0.06 +
			Math.sin(t * 0.07) * 0.025 * drift;
		let phi =
			lerp(1.08, 0.62, heroT) -
			lerp(0, 0.34, smooth(clamp01(b * 1.4))) +
			this.springs.py.x * 0.03 +
			Math.sin(t * 0.05 + 1) * 0.012 * drift;
		let zoom = lerp(1.04, 1, heroT) + handover * 0.1;
		if (this.opts.reducedMotion) {
			theta = 0.3;
			phi = 0.42;
			zoom = 1.05;
		}
		const target = this.center;
		const dBuilding = this.fitDistance(theta, phi, target, this.corners);
		const dCrane =
			this.craneVis > 0.001 ? this.fitDistance(theta, phi, target, [this.craneTop]) : dBuilding;
		const dist = Math.max(dBuilding, lerp(dBuilding, dCrane, this.craneVis)) * zoom;
		this.camera.position.set(
			target.x + dist * Math.cos(phi) * Math.sin(theta),
			target.y + dist * Math.sin(phi),
			target.z + dist * Math.cos(phi) * Math.cos(theta)
		);
		this.camera.lookAt(target);

		// Fog scales with distance so the model never fades, only the far city does.
		this.fog.near = dist * 1.15;
		this.fog.far = dist * 3.6;

		this.sun.position.copy(target).addScaledVector(sunDir, 90);
		this.sun.target.position.copy(target);

		return settling;
	}

	/** Drives a vehicle in through the gate, parks it, and reverses it out. */
	private drive(v: Vehicle, b: number) {
		const inP = easeInOut(range(b, v.in));
		const outP = easeInOut(range(b, v.out));
		const on = inP > 0 && outP < 1;
		v.group.visible = on;
		if (!on) return false;
		const p = outP > 0 ? outP : 1 - inP;
		v.group.position.set(lerp(v.park.x, v.gate.x, p), 0, lerp(v.park.z, v.gate.z, p));
		v.group.rotation.y = Math.atan2(-(v.park.z - v.gate.z), v.park.x - v.gate.x);
		return true;
	}
}

/**
 * True unless the GPU is a known discrete part. Integrated and mobile GPUs share memory
 * bandwidth with the browser's own compositing, so they skip MSAA (see `quality: 'medium'`).
 */
export function isIntegratedGPU() {
	try {
		const gl = document.createElement('canvas').getContext('webgl');
		if (!gl) return true;
		const info = gl.getExtension('WEBGL_debug_renderer_info');
		const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return !/nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro/i.test(name);
	} catch {
		return true;
	}
}

export function supportsWebGL() {
	try {
		const c = document.createElement('canvas');
		return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
	} catch {
		return false;
	}
}
