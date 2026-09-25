<!--
	Maps the curated icon vocabulary ($lib/icon-names.ts) to tree-shaken Lucide components.
	Decorative by default (aria-hidden); pass `label` to expose it to assistive tech.
-->
<script lang="ts">
	import type { Component } from 'svelte';
	import type { IconName } from '$lib/icon-names';
	import Award from '@lucide/svelte/icons/award';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Banknote from '@lucide/svelte/icons/banknote';
	import Bath from '@lucide/svelte/icons/bath';
	import Bike from '@lucide/svelte/icons/bike';
	import Blocks from '@lucide/svelte/icons/blocks';
	import BrickWall from '@lucide/svelte/icons/brick-wall';
	import Building from '@lucide/svelte/icons/building';
	import BuildingComplex from '@lucide/svelte/icons/building-complex';
	import Calculator from '@lucide/svelte/icons/calculator';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Car from '@lucide/svelte/icons/car';
	import Cctv from '@lucide/svelte/icons/cctv';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Compass from '@lucide/svelte/icons/compass';
	import Construction from '@lucide/svelte/icons/construction';
	import DoorOpen from '@lucide/svelte/icons/door-open';
	import DraftingCompass from '@lucide/svelte/icons/drafting-compass';
	import Droplets from '@lucide/svelte/icons/droplets';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Baby from '@lucide/svelte/icons/baby';
	import Eye from '@lucide/svelte/icons/eye';
	import Fence from '@lucide/svelte/icons/fence';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flame from '@lucide/svelte/icons/flame';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Hammer from '@lucide/svelte/icons/hammer';
	import Handshake from '@lucide/svelte/icons/handshake';
	import HardHat from '@lucide/svelte/icons/hard-hat';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import House from '@lucide/svelte/icons/house';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Lamp from '@lucide/svelte/icons/lamp';
	import LandPlot from '@lucide/svelte/icons/land-plot';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Layers from '@lucide/svelte/icons/layers';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Mountain from '@lucide/svelte/icons/mountain';
	import PaintRoller from '@lucide/svelte/icons/paint-roller';
	import PencilRuler from '@lucide/svelte/icons/pencil-ruler';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Recycle from '@lucide/svelte/icons/recycle';
	import Route from '@lucide/svelte/icons/route';
	import Ruler from '@lucide/svelte/icons/ruler';
	import Scale from '@lucide/svelte/icons/scale';
	import ScanEye from '@lucide/svelte/icons/scan-eye';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Shovel from '@lucide/svelte/icons/shovel';
	import Sofa from '@lucide/svelte/icons/sofa';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Sprout from '@lucide/svelte/icons/sprout';
	import Stamp from '@lucide/svelte/icons/stamp';
	import Store from '@lucide/svelte/icons/store';
	import Sun from '@lucide/svelte/icons/sun';
	import Trees from '@lucide/svelte/icons/trees';
	import Users from '@lucide/svelte/icons/users';
	import UtilityPole from '@lucide/svelte/icons/utility-pole';
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import WavesLadder from '@lucide/svelte/icons/waves-ladder';
	import Wifi from '@lucide/svelte/icons/wifi';
	import Wind from '@lucide/svelte/icons/wind';
	import Zap from '@lucide/svelte/icons/zap';

	type Props = {
		name?: string | null;
		size?: number;
		strokeWidth?: number;
		class?: string;
		label?: string;
	};
	let { name, size = 24, strokeWidth = 1.5, class: className = '', label }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ICONS: Record<IconName, Component<any>> = {
		award: Award,
		'badge-check': BadgeCheck,
		banknote: Banknote,
		bath: Bath,
		bike: Bike,
		blocks: Blocks,
		'brick-wall': BrickWall,
		building: Building,
		'building-complex': BuildingComplex,
		calculator: Calculator,
		'calendar-check': CalendarCheck,
		car: Car,
		cctv: Cctv,
		'clipboard-check': ClipboardCheck,
		clock: Clock,
		compass: Compass,
		construction: Construction,
		'door-open': DoorOpen,
		'drafting-compass': DraftingCompass,
		droplets: Droplets,
		dumbbell: Dumbbell,
		baby: Baby,
		eye: Eye,
		fence: Fence,
		'file-check': FileCheck,
		'file-text': FileText,
		flame: Flame,
		gauge: Gauge,
		hammer: Hammer,
		handshake: Handshake,
		'hard-hat': HardHat,
		'heart-handshake': HeartHandshake,
		house: House,
		'key-round': KeyRound,
		lamp: Lamp,
		'land-plot': LandPlot,
		landmark: Landmark,
		layers: Layers,
		'layout-grid': LayoutGrid,
		leaf: Leaf,
		lightbulb: Lightbulb,
		'map-pin': MapPin,
		mountain: Mountain,
		'paint-roller': PaintRoller,
		'pencil-ruler': PencilRuler,
		receipt: Receipt,
		recycle: Recycle,
		route: Route,
		ruler: Ruler,
		scale: Scale,
		'scan-eye': ScanEye,
		'scroll-text': ScrollText,
		'shield-check': ShieldCheck,
		shovel: Shovel,
		sofa: Sofa,
		sparkles: Sparkles,
		sprout: Sprout,
		stamp: Stamp,
		store: Store,
		sun: Sun,
		trees: Trees,
		users: Users,
		'utility-pole': UtilityPole,
		warehouse: Warehouse,
		'waves-ladder': WavesLadder,
		wifi: Wifi,
		wind: Wind,
		zap: Zap
	};

	const Icon = $derived(ICONS[(name ?? '') as IconName] ?? Sparkles);
</script>

<Icon
	{size}
	{strokeWidth}
	class={className}
	aria-hidden={label ? undefined : 'true'}
	aria-label={label}
	role={label ? 'img' : undefined}
/>
