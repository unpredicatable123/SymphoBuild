import { fileUrl } from '$lib/sanity/image';
import { BROCHURE_QUERY } from './queries';
import { sanityFetch } from './sanity';

export const BROCHURE_COOKIE = 'sb_brochure';

/** Resolve a project's brochure URL. Only called after lead capture. */
export async function resolveBrochure(slug: string): Promise<string | null> {
	const res = await sanityFetch<{ url: string | null; ref: string | null } | null>(BROCHURE_QUERY, {
		slug
	});
	return res ? fileUrl(res.ref, res.url) : null;
}
