import { env } from '$env/dynamic/public';
import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImage } from '$lib/types';

const DEFAULT_WIDTHS = [480, 768, 1080, 1440, 1920, 2400];

let builder: ReturnType<typeof createImageUrlBuilder> | undefined;
function getBuilder() {
	if (!builder && env.PUBLIC_SANITY_PROJECT_ID) {
		builder = createImageUrlBuilder({
			projectId: env.PUBLIC_SANITY_PROJECT_ID,
			dataset: env.PUBLIC_SANITY_DATASET || 'production'
		});
	}
	return builder;
}

/** Parse `image-<id>-<w>x<h>-<ext>` asset refs. */
export function parseAssetRef(ref: string | undefined) {
	const m = ref?.match(/^image-([A-Za-z0-9_]+)-(\d+)x(\d+)-(\w+)$/);
	if (!m) return null;
	return { id: m[1], width: Number(m[2]), height: Number(m[3]), format: m[4] };
}

const isDemoAsset = (id: string) => id.startsWith('demo');

export type ImageProps = {
	src: string;
	srcset?: string;
	width: number;
	height: number;
	alt: string;
};

/**
 * Responsive image attributes for a Sanity image. When `aspect` (w/h) is given the
 * image is cropped to that ratio around the editor's hotspot.
 */
export function imageProps(
	image: SanityImage | null | undefined,
	opts: { aspect?: number; widths?: number[]; maxWidth?: number; quality?: number } = {}
): ImageProps | null {
	const parsed = parseAssetRef(image?.asset?._ref);
	if (!image || !parsed) return null;
	const alt = image.alt ?? '';
	const intrinsicW = parsed.width;
	const intrinsicH = opts.aspect ? Math.round(parsed.width / opts.aspect) : parsed.height;

	if (isDemoAsset(parsed.id)) {
		const name = parsed.id.slice(4);
		return {
			src: `/demo/${name}.jpg`,
			srcset: `/demo/${name}-800.jpg 800w, /demo/${name}.jpg ${parsed.width}w`,
			width: intrinsicW,
			height: intrinsicH,
			alt
		};
	}

	const b = getBuilder();
	if (!b) return null;
	const widths = (opts.widths ?? DEFAULT_WIDTHS).filter((w) => w <= Math.max(parsed.width, 480));
	const maxW = Math.min(opts.maxWidth ?? 1440, parsed.width);
	const url = (w: number) => {
		let chain = b
			.image(image)
			.width(w)
			.auto('format')
			.quality(opts.quality ?? 78)
			.fit('crop');
		if (opts.aspect) chain = chain.height(Math.round(w / opts.aspect));
		return chain.url();
	};
	return {
		src: url(maxW),
		srcset: widths.map((w) => `${url(w)} ${w}w`).join(', '),
		width: intrinsicW,
		height: intrinsicH,
		alt
	};
}

/** Single absolute URL (e.g. Open Graph images). */
export function imageUrl(image: SanityImage | null | undefined, width = 1200, height?: number) {
	const parsed = parseAssetRef(image?.asset?._ref);
	if (!image || !parsed) return undefined;
	if (isDemoAsset(parsed.id)) return `/demo/${parsed.id.slice(4)}.jpg`;
	const b = getBuilder();
	if (!b) return undefined;
	let chain = b.image(image).width(width).auto('format').fit('crop');
	if (height) chain = chain.height(height);
	return chain.url();
}

/** CSS object-position derived from the editor's hotspot. */
export function hotspotPosition(image: SanityImage | null | undefined) {
	const h = image?.hotspot;
	return h ? `${Math.round(h.x * 100)}% ${Math.round(h.y * 100)}%` : '50% 50%';
}

/** Resolve a Sanity file reference (e.g. brochure) to a URL. */
export function fileUrl(ref: string | undefined | null, cdnUrl?: string | null) {
	if (cdnUrl) return cdnUrl;
	const m = ref?.match(/^file-([A-Za-z0-9_]+)-(\w+)$/);
	if (!m) return null;
	if (m[1].startsWith('demo')) return `/demo/${m[1].slice(4)}.${m[2]}`;
	const projectId = env.PUBLIC_SANITY_PROJECT_ID;
	const dataset = env.PUBLIC_SANITY_DATASET || 'production';
	return projectId ? `https://cdn.sanity.io/files/${projectId}/${dataset}/${m[1]}.${m[2]}` : null;
}
