/**
 * TowerScene — the "drawing to building" story, rendered procedurally.
 *
 * A single parameter, `build` (0 → 1), constructs a two-block residential building:
 *   design     0.00–0.16  copper blueprint lines draw themselves
 *   approvals  0.16–0.32  site boundary + plot are marked, raft foundation is cast
 *   structure  0.32–0.55  columns and slabs rise floor by floor, the tower crane works
 *   envelope   0.55–0.72  glazing and terracotta fins close in the building
 *   finishes   0.72–0.88  windows light up, landscaping grows, the crane leaves
 *   handover   0.88–1.00  the camera pulls back into a warm evening glow
 *
 * Framing: every frame the camera distance is solved from the building's bounding
 * corners so the model always fits a reserved screen region (right-hand side on
 * desktop, top half on mobile) — whatever the viewport size or orbit angle.
 *
 * Rendering is on-demand (frames only while something changes) and paused off-screen.
 * No textures or model files are downloaded — geometry, sky and environment lighting
 * are all generated at runtime.
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
	GridHelper,
	Group,
	HemisphereLight,
	IcosahedronGeometry,
	InstancedMesh,
	Line,
	LineBasicMaterial,
	LineDashedMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	PMREMGenerator,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
	type BufferGeometry as BG,
	type Material
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const PHASES = {
	design: [0, 0.16],
	approvals: [0.16, 0.32],
	foundation: [0.24, 0.34],
	structure: [0.32, 0.55],
	envelope: [0.55, 0.72],
	finishes: [0.72, 0.88],
	handover: [0.88, 1]
} as const;
export type Phase = keyof typeof PHASES;

const COPPER = new Color('#d0845f');
const SKY_TOP = new Color('#0b0d0f');
const SKY_HORIZON = new Color('#23272c');
const SKY_HORIZON_WARM = new Color('#5a3a2c');
const SUN_DAY = new Color('#ffe9d2');
const SUN_EVENING = new Color('#ff9a5c');

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

type Item = {
	x: number;
	y: number;
	z: number;
	sx: number;
	sy: number;
	sz: number;
	t0: number;
	color?: Color;
};

/** A group of identical primitives that appear over a normalised progress window. */
class Batch {
	items: Item[] = [];
	mesh!: InstancedMesh;
	private dummy = new Object3D();
	constructor(
		private geometry: BG,
		private material: Material,
		private grow: 'y' | 'xyz' = 'y',
		private shadows: { cast: boolean; receive: boolean } = { cast: true, receive: true }
	) {}
	add(item: Item) {
		this.items.push(item);
	}
	build(parent: Object3D) {
		this.mesh = new InstancedMesh(this.geometry, this.material, Math.max(1, this.items.length));
		this.mesh.count = this.items.length;
		this.mesh.frustumCulled = false;
		this.mesh.castShadow = this.shadows.cast;
		this.mesh.receiveShadow = this.shadows.receive;
		this.items.forEach((it, i) => it.color && this.mesh.setColorAt(i, it.color));
		parent.add(this.mesh);
		this.update(0, 0.1);
	}
	update(progress: number, dur: number) {
		const d = this.dummy;
		for (let i = 0; i < this.items.length; i++) {
			const it = this.items[i];
			const g = easeOut(clamp01((progress - it.t0) / dur));
			if (g <= 0.0005) {
				d.scale.set(0, 0, 0);
				d.position.set(it.x, it.y, it.z);
			} else if (this.grow === 'y') {
				const sy = it.sy * g;
				d.position.set(it.x, it.y - it.sy / 2 + sy / 2, it.z);
				d.scale.set(it.sx, sy, it.sz);
			} else {
				d.position.set(it.x, it.y, it.z);
				d.scale.set(it.sx * g, it.sy * g, it.sz * g);
			}
			d.updateMatrix();
			this.mesh.setMatrixAt(i, d.matrix);
		}
		this.mesh.instanceMatrix.needsUpdate = true;
	}
}

/** Critically damped spring — gives scroll-driven values a physical, lag-free glide. */
class Spring {
	v = 0;
	constructor(
		public x: number,
		private stiffness: number
	) {}
	step(target: number, dt: number) {
		const k = this.stiffness;
		const c = 2 * Math.sqrt(k);
		this.v += (k * (target - this.x) - c * this.v) * dt;
		this.x += this.v * dt;
		if (Math.abs(target - this.x) < 0.0003 && Math.abs(this.v) < 0.0003) {
			this.x = target;
			this.v = 0;
			return false;
		}
		return true;
	}
}

export type TowerSceneOptions = {
	quality: 'high' | 'low';
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
	private visible = true;
	private disposed = false;
	private width = 1;
	private height = 1;

	private target = { hero: 0, build: 0, px: 0, py: 0 };
	private springs = {
		hero: new Spring(0, 16),
		build: new Spring(0, 11),
		px: new Spring(0, 6),
		py: new Spring(0, 6)
	};
	private intro = 0;

	private floors: number;
	private readonly FH = 1.3;
	private topY = 0;
	private corners: Vector3[] = [];
	private craneTop = new Vector3();
	private center = new Vector3();

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
	private plotMat = new MeshBasicMaterial({
		color: COPPER,
		transparent: true,
		opacity: 0,
		depthWrite: false
	});
	private glowMat!: MeshBasicMaterial;
	private litMat = new MeshBasicMaterial({ color: '#ffc98a', toneMapped: false });
	private skyMat!: ShaderMaterial;
	private fog: Fog;
	private sun = new DirectionalLight(SUN_DAY, 3.2);
	private hemi = new HemisphereLight('#dfe6ea', '#1a1c1e', 0.55);
	private crane = new Group();
	private jib = new Group();
	private batches: Record<string, Batch> = {};
	private geometries: BG[] = [];
	private materials: Material[] = [];
	private tmp = { right: new Vector3(), up: new Vector3(), back: new Vector3(), v: new Vector3() };

	constructor(
		private canvas: HTMLCanvasElement,
		private opts: TowerSceneOptions
	) {
		const high = opts.quality === 'high';
		this.floors = high ? 14 : 10;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: high,
			alpha: false,
			powerPreference: 'high-performance'
		});
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1.25));
		this.renderer.shadowMap.enabled = high;
		this.renderer.shadowMap.type = PCFSoftShadowMap;
		canvas.addEventListener('webglcontextlost', this.onContextLost);

		// Procedural environment lighting for soft reflections on glass and concrete.
		const pmrem = new PMREMGenerator(this.renderer);
		const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		pmrem.dispose();
		this.scene.environment = envTex;
		this.scene.environmentIntensity = 0.35;

		this.fog = new Fog(SKY_HORIZON.clone(), 80, 260);
		this.scene.fog = this.fog;
		this.scene.add(this.hemi, this.sun, this.sun.target);

		if (high) {
			this.sun.castShadow = true;
			this.sun.shadow.mapSize.set(2048, 2048);
			const cam = this.sun.shadow.camera;
			cam.left = -34;
			cam.right = 34;
			cam.top = 34;
			cam.bottom = -34;
			cam.near = 1;
			cam.far = 200;
			this.sun.shadow.bias = -0.0004;
			this.sun.shadow.normalBias = 0.03;
			this.sun.shadow.radius = 4;
		}

		this.buildSky();
		this.buildWorld();
		if (opts.reducedMotion) this.intro = 1;
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
				? { x: W * 0.42, y: H * 0.11, w: W * 0.52, h: H * 0.8 }
				: { x: W * 0.05, y: H * 0.09, w: W * 0.9, h: H * 0.4 };
		this.camera.aspect = region.w / region.h;
		this.camera.setViewOffset(region.w, region.h, -region.x, -region.y, W, H);
		this.camera.updateProjectionMatrix();
		this.requestFrame();
	}
	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
		this.geometries.forEach((g) => g.dispose());
		this.materials.forEach((m) => m.dispose());
		this.lines?.geometry.dispose();
		this.scene.environment?.dispose();
		this.renderer.dispose();
	}

	/* ── World construction ─────────────────────────────────────────────────── */
	private geo<T extends BG>(g: T) {
		this.geometries.push(g);
		return g;
	}
	private mat<T extends Material>(m: T) {
		this.materials.push(m);
		return m;
	}

	private buildSky() {
		this.skyMat = this.mat(
			new ShaderMaterial({
				side: BackSide,
				depthWrite: false,
				fog: false,
				toneMapped: false,
				uniforms: { top: { value: SKY_TOP.clone() }, horizon: { value: SKY_HORIZON.clone() } },
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
					varying vec3 vDir;
					void main() {
						float h = normalize(vDir).y;
						vec3 col = mix(horizon, top, smoothstep(-0.02, 0.45, h));
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
		const high = this.opts.quality === 'high';
		const rand = seeded(20260925);
		const unit = this.geo(new BoxGeometry(1, 1, 1));
		const concrete = this.mat(new MeshStandardMaterial({ color: '#dcd4c6', roughness: 0.82 }));
		const concreteDark = this.mat(new MeshStandardMaterial({ color: '#b7ab98', roughness: 0.88 }));
		const glass = this.mat(
			new MeshStandardMaterial({
				color: '#1b2630',
				metalness: 0.55,
				roughness: 0.1,
				envMapIntensity: 1.6
			})
		);
		const terracotta = this.mat(new MeshStandardMaterial({ color: '#b9643e', roughness: 0.7 }));
		const foliage = this.mat(
			new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true })
		);
		const bark = this.mat(new MeshStandardMaterial({ color: '#4a3a2e', roughness: 1 }));
		const raftMat = this.mat(new MeshStandardMaterial({ color: '#8f8474', roughness: 0.95 }));
		const context = this.mat(
			new MeshStandardMaterial({ color: '#ffffff', roughness: 1, envMapIntensity: 0.25 })
		);
		this.materials.push(this.litMat);

		const blocks = [
			{ cx: -2.5, cz: 0, w: 12, d: 10, floors: N, colsX: 4, colsZ: 3 },
			{ cx: 9, cz: 1.5, w: 7, d: 8, floors: Math.round(N * 0.45), colsX: 3, colsZ: 3 }
		];
		this.topY = 0.5 + N * FH;

		// Framing volume: building + balconies + fins (crane handled separately).
		const minX = -9;
		const maxX = 13;
		const minZ = -5.4;
		const maxZ = 6.6;
		for (const x of [minX, maxX])
			for (const y of [0, this.topY])
				for (const z of [minZ, maxZ]) this.corners.push(new Vector3(x, y, z));
		this.center.set((minX + maxX) / 2, this.topY * 0.46, (minZ + maxZ) / 2);

		// Ground, street, grid, plot and boundary
		const ground = new Mesh(
			this.geo(new PlaneGeometry(1200, 1200)),
			this.mat(new MeshStandardMaterial({ color: '#1d2125', roughness: 0.97 }))
		);
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		this.scene.add(ground);

		const road = new Mesh(
			this.geo(new PlaneGeometry(420, 9)),
			this.mat(new MeshStandardMaterial({ color: '#141719', roughness: 0.9 }))
		);
		road.rotation.x = -Math.PI / 2;
		road.position.set(2, 0.015, 20);
		road.receiveShadow = true;
		this.scene.add(road);
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

		const grid = new GridHelper(200, 100, '#9aa585', '#9aa585');
		(grid.material as Material).transparent = true;
		(grid.material as Material & { opacity: number }).opacity = 0.06;
		grid.position.y = 0.01;
		this.materials.push(grid.material as Material);
		this.geometries.push(grid.geometry);
		this.scene.add(grid);

		const plot = new Mesh(this.geo(new PlaneGeometry(38, 26)), this.plotMat);
		plot.rotation.x = -Math.PI / 2;
		plot.position.set(2, 0.02, 1);
		this.scene.add(plot);
		const pts = [
			[-19, -13],
			[19, -13],
			[19, 13],
			[-19, 13],
			[-19, -13]
		].map(([x, z]) => new Vector3(x + 2, 0.05, z + 1));
		const boundary = new Line(this.geo(new BufferGeometry().setFromPoints(pts)), this.boundaryMat);
		boundary.computeLineDistances();
		this.scene.add(boundary);

		// Warm ground glow for handover
		const c = document.createElement('canvas');
		c.width = c.height = 128;
		const ctx = c.getContext('2d')!;
		const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
		grad.addColorStop(0, 'rgba(240,160,110,0.9)');
		grad.addColorStop(1, 'rgba(240,160,110,0)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, 128, 128);
		this.glowMat = this.mat(
			new MeshBasicMaterial({
				map: new CanvasTexture(c),
				transparent: true,
				opacity: 0,
				blending: AdditiveBlending,
				depthWrite: false
			})
		);
		const glow = new Mesh(this.geo(new PlaneGeometry(70, 50)), this.glowMat);
		glow.rotation.x = -Math.PI / 2;
		glow.position.set(2, 0.03, 2);
		this.scene.add(glow);

		// Surrounding city — dark massing that recedes into the haze for scale and depth.
		const city = new Batch(unit, context, 'y', { cast: false, receive: false });
		const cityCount = high ? 90 : 40;
		for (let i = 0; i < cityCount; i++) {
			// Only behind and beside the site (the camera always views from the street side),
			// far enough to sit in the haze and never block the building.
			const a = Math.PI * (1.02 + rand() * 0.96);
			const r = 70 + rand() * 150;
			const x = 2 + Math.cos(a) * r * 1.25;
			const z = -8 + Math.sin(a) * r;
			const hgt = 4 + Math.pow(rand(), 2.2) * 24;
			const shade = 0.035 + rand() * 0.03;
			city.add({
				x,
				y: hgt / 2,
				z,
				sx: 6 + rand() * 12,
				sy: hgt,
				sz: 6 + rand() * 12,
				t0: 0,
				color: new Color(shade, shade * 1.02, shade * 1.07)
			});
		}
		city.build(this.scene);
		city.update(1, 0.1);

		// Building batches
		const B = (
			name: string,
			g: BG,
			m: Material,
			grow: 'y' | 'xyz' = 'y',
			shadows?: { cast: boolean; receive: boolean }
		) => (this.batches[name] = new Batch(g, m, grow, shadows));
		const raft = B('raft', unit, raftMat);
		const columns = B('columns', unit, concreteDark);
		const slabs = B('slabs', unit, concrete);
		const glazing = B('glazing', unit, glass);
		const fins = B('fins', unit, terracotta);
		const balconies = B('balconies', unit, concrete);
		const lights = B('lights', unit, this.litMat, 'xyz', { cast: false, receive: false });
		const trunks = B('trunks', this.geo(new CylinderGeometry(0.5, 0.7, 1, 6)), bark, 'y');
		const trees = B('trees', this.geo(new IcosahedronGeometry(1, 1)), foliage, 'xyz');

		const linePos: number[] = [];
		const seg = (a: number[], b: number[]) => linePos.push(...a, ...b);

		for (const bl of blocks) {
			const x0 = bl.cx - bl.w / 2;
			const z0 = bl.cz - bl.d / 2;
			const H = bl.floors * FH;
			raft.add({ x: bl.cx, y: 0.25, z: bl.cz, sx: bl.w + 1.6, sy: 0.5, sz: bl.d + 1.6, t0: 0 });

			for (let i = 0; i < bl.colsX; i++) {
				const x = x0 + 0.4 + (i * (bl.w - 0.8)) / (bl.colsX - 1);
				seg([x, 0.06, z0 - 1.5], [x, 0.06, z0 + bl.d + 1.5]);
			}
			for (let j = 0; j < bl.colsZ; j++) {
				const z = z0 + 0.4 + (j * (bl.d - 0.8)) / (bl.colsZ - 1);
				seg([x0 - 1.5, 0.06, z], [x0 + bl.w + 1.5, 0.06, z]);
			}

			for (let f = 0; f < bl.floors; f++) {
				const y = 0.5 + f * FH;
				const tFloor = f / N;
				for (let i = 0; i < bl.colsX; i++)
					for (let j = 0; j < bl.colsZ; j++) {
						const x = x0 + 0.4 + (i * (bl.w - 0.8)) / (bl.colsX - 1);
						const z = z0 + 0.4 + (j * (bl.d - 0.8)) / (bl.colsZ - 1);
						columns.add({ x, y: y + FH / 2, z, sx: 0.38, sy: FH, sz: 0.38, t0: tFloor * 0.8 });
					}
				slabs.add({
					x: bl.cx,
					y: y + FH - 0.11,
					z: bl.cz,
					sx: bl.w + 0.5,
					sy: 0.22,
					sz: bl.d + 0.5,
					t0: tFloor * 0.8 + 0.05
				});
				glazing.add({
					x: bl.cx,
					y: y + FH / 2 - 0.1,
					z: bl.cz,
					sx: bl.w - 0.35,
					sy: FH - 0.22,
					sz: bl.d - 0.35,
					t0: tFloor * 0.75
				});
				if (f % 2 === 1)
					balconies.add({
						x: bl.cx - bl.w * 0.18,
						y: y + 0.06,
						z: bl.cz + bl.d / 2 + 0.75,
						sx: bl.w * 0.5,
						sy: 0.16,
						sz: 1.5,
						t0: tFloor * 0.75 + 0.06
					});
				const nFront = Math.floor(bl.w / 1.6);
				for (let i = 0; i < nFront; i++)
					if (rand() < 0.55)
						lights.add({
							x: x0 + 0.8 + i * 1.6,
							y: y + FH / 2,
							z: bl.cz + bl.d / 2 - 0.12,
							sx: 1.1,
							sy: 0.72,
							sz: 0.06,
							t0: rand() * 0.85
						});
				const nSide = Math.floor(bl.d / 1.6);
				for (let i = 0; i < nSide; i++)
					if (rand() < 0.5)
						lights.add({
							x: x0 + bl.w - 0.12,
							y: y + FH / 2,
							z: z0 + 0.8 + i * 1.6,
							sx: 0.06,
							sy: 0.72,
							sz: 1.1,
							t0: rand() * 0.85
						});
			}
			for (let x = x0 + 0.6; x < x0 + bl.w; x += 1.5)
				fins.add({
					x,
					y: 0.5 + H / 2,
					z: bl.cz + bl.d / 2 + 0.28,
					sx: 0.14,
					sy: H,
					sz: 0.55,
					t0: ((x - x0) / bl.w) * 0.3
				});
			for (let z = z0 + 0.6; z < z0 + bl.d; z += 1.5)
				fins.add({
					x: x0 + bl.w + 0.28,
					y: 0.5 + H / 2,
					z,
					sx: 0.55,
					sy: H,
					sz: 0.14,
					t0: 0.3 + ((z - z0) / bl.d) * 0.3
				});

			for (const [cx, cz] of [
				[x0, z0],
				[x0 + bl.w, z0],
				[x0 + bl.w, z0 + bl.d],
				[x0, z0 + bl.d]
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

		// Landscaping: trunks + faceted canopies in two greens
		const greens = [new Color('#6f7d58'), new Color('#57653f'), new Color('#839066')];
		const treeCount = high ? 46 : 24;
		for (let i = 0; i < treeCount; i++) {
			const side = i % 3;
			let x: number;
			let z: number;
			if (side === 0) {
				x = -15 + rand() * 34;
				z = 9.5 + rand() * 3.5;
			} else if (side === 1) {
				x = -16.5 + rand() * 3.5;
				z = -10 + rand() * 20;
			} else {
				x = 14.5 + rand() * 4.5;
				z = -10 + rand() * 8;
			}
			const r = 0.8 + rand() * 0.8;
			const trunkH = r * 1.1;
			const t0 = rand() * 0.8;
			trunks.add({ x, y: trunkH / 2, z, sx: 0.28 * r, sy: trunkH, sz: 0.28 * r, t0 });
			trees.add({
				x,
				y: trunkH + r * 0.9,
				z,
				sx: r,
				sy: r * 1.25,
				sz: r,
				t0: t0 + 0.04,
				color: greens[i % greens.length]
			});
		}

		Object.values(this.batches).forEach((b) => b.build(this.scene));

		const lg = new BufferGeometry();
		lg.setAttribute('position', new Float32BufferAttribute(linePos, 3));
		this.lineVertexCount = linePos.length / 3;
		this.lines = new LineSegments(lg, this.lineMat);
		this.materials.push(this.lineMat, this.boundaryMat, this.plotMat);
		this.scene.add(this.lines);

		const craneSteel = this.mat(
			new MeshStandardMaterial({ color: '#3c4147', metalness: 0.5, roughness: 0.5 })
		);
		const cranePaint = this.mat(new MeshStandardMaterial({ color: '#c46d40', roughness: 0.55 }));
		this.buildCrane(unit, cranePaint, craneSteel);
	}

	private buildCrane(unit: BG, paint: Material, steel: Material) {
		const H = this.topY + 4.5;
		const part = (
			m: Material,
			x: number,
			y: number,
			z: number,
			sx: number,
			sy: number,
			sz: number,
			parent: Object3D
		) => {
			const mesh = new Mesh(unit, m);
			mesh.position.set(x, y, z);
			mesh.scale.set(sx, sy, sz);
			mesh.castShadow = true;
			parent.add(mesh);
		};
		part(paint, 0, H / 2, 0, 0.7, H, 0.7, this.crane);
		part(steel, 0, 0.4, 0, 3, 0.8, 3, this.crane);
		this.jib.position.y = H;
		part(paint, 7, 0.3, 0, 16, 0.5, 0.55, this.jib);
		part(paint, -3, 0.3, 0, 5, 0.5, 0.55, this.jib);
		part(steel, -4.8, -0.4, 0, 1.8, 1.1, 1.1, this.jib);
		part(steel, 0, 1.3, 0, 0.3, 2.2, 0.3, this.jib);
		part(steel, 0.5, -0.6, 0, 1.2, 1, 1, this.jib);
		part(steel, 9, -4, 0, 0.05, 8, 0.05, this.jib);
		part(paint, 9, -8.2, 0, 0.7, 0.45, 0.7, this.jib);
		this.crane.add(this.jib);
		this.crane.position.set(-10.5, 0, -7.2);
		this.crane.scale.set(1, 0, 1);
		this.crane.visible = false;
		this.craneTop.set(-10.5, H + 1.5, -7.2);
		this.scene.add(this.crane);
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
		const dt = Math.min(1 / 30, rawDt); // springs: stable step size

		this.last = now;
		let active = false;
		if (this.intro < 1) {
			this.intro = Math.min(1, this.intro + Math.min(0.25, rawDt) / 2.6); // wall-clock timed
			active = true;
		}
		for (const key of ['hero', 'build', 'px', 'py'] as const) {
			const s = this.springs[key];
			if (this.opts.reducedMotion) {
				s.x = this.target[key];
				s.v = 0;
			} else if (s.step(this.target[key], dt)) active = true;
		}
		try {
			this.apply();
			this.renderer.render(this.scene, this.camera);
		} catch (err) {
			this.opts.onError?.(err);
			return;
		}
		if (active) this.requestFrame();
	};

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

	private apply() {
		const b = this.springs.build.x;
		const hero = this.springs.hero.x;

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
			heroDim * lerp(0.95, 0.5, structure) * lerp(1, 0.3, envelope) * lerp(1, 0.55, handover);
		this.boundaryMat.opacity = 0.85 * easeOut(clamp01(approvals * 2)) * lerp(1, 0.35, finishes);
		this.plotMat.opacity = 0.07 * easeOut(approvals) * lerp(1, 0.3, envelope);

		this.batches.raft.update(range(b, PHASES.foundation), 0.9);
		this.batches.columns.update(structure, 0.22);
		this.batches.slabs.update(structure, 0.18);
		this.batches.glazing.update(envelope, 0.25);
		this.batches.balconies.update(envelope, 0.2);
		this.batches.fins.update(envelope, 0.45);
		this.batches.lights.update(finishes, 0.08);
		this.batches.trunks.update(finishes, 0.25);
		this.batches.trees.update(finishes, 0.3);

		const craneIn = smooth(range(b, [0.3, 0.38]));
		const craneOut = smooth(range(b, [0.74, 0.85]));
		const cs = craneIn * (1 - craneOut);
		this.crane.scale.y = Math.max(0.0001, cs);
		this.crane.visible = cs > 0.002;
		this.jib.rotation.y = 0.9 - structure * 1.6 - envelope * 0.5;

		// Light: overcast day → warm evening at handover
		const evening = smooth(clamp01(finishes * 0.6 + handover));
		this.sun.color.copy(SUN_DAY).lerp(SUN_EVENING, evening);
		this.sun.intensity = lerp(3.2, 2.1, evening);
		this.hemi.intensity = lerp(0.55, 0.35, evening);
		this.litMat.color.set('#ffc98a').multiplyScalar(lerp(1, 1.35, evening));
		this.glowMat.opacity = 0.14 * finishes + 0.3 * handover;
		const horizon = this.skyMat.uniforms.horizon.value as Color;
		horizon.copy(SKY_HORIZON).lerp(SKY_HORIZON_WARM, evening * 0.85);
		this.fog.color.copy(horizon);

		// Camera choreography
		const heroT = smooth(clamp01(hero));
		let theta = lerp(-0.7, -0.55, heroT) + smooth(b) * 1.2 + this.springs.px.x * 0.06;
		let phi =
			lerp(1.05, 0.62, heroT) -
			lerp(0, 0.3, smooth(clamp01(b * 1.5))) +
			handover * 0.06 +
			this.springs.py.x * 0.03;
		let zoom = lerp(1.04, 1, heroT) + handover * 0.14;
		if (this.opts.reducedMotion) {
			theta = 0.3;
			phi = 0.42;
			zoom = 1.05;
		}
		const target = this.center;
		const points = this.crane.visible ? [...this.corners, this.craneTop] : this.corners;
		const dist = this.fitDistance(theta, phi, target, points) * zoom;
		this.camera.position.set(
			target.x + dist * Math.cos(phi) * Math.sin(theta),
			target.y + dist * Math.sin(phi),
			target.z + dist * Math.cos(phi) * Math.cos(theta)
		);
		this.camera.lookAt(target);

		// Fog scales with distance so the model never fades, only the far city does.
		this.fog.near = dist * 1.15;
		this.fog.far = dist * 3.4;

		// Sun follows the framing so shadows stay crisp around the building.
		this.sun.position.set(target.x - 38 + evening * -12, lerp(58, 26, evening), target.z + 30);
		this.sun.target.position.copy(target);
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
