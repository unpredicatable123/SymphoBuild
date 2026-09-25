import { error } from '@sveltejs/kit';
import { loadPage } from '$lib/server/pages';

/**
 * Flexible pages managed in Sanity: /about, /quality-and-specifications,
 * /for-landowners, /buyers-guide, /contact, /privacy-policy, /terms, and any new page
 * editors create. Listing routes (/projects etc.) have their own route files.
 */
const RESERVED = new Set(['projects', 'services', 'insights', 'gallery', 'thank-you', 'enquire']);

export const load = async ({ params }) => {
	if (RESERVED.has(params.slug) || !/^[a-z0-9-]+$/.test(params.slug)) error(404, 'Page not found');
	const page = await loadPage(params.slug);
	return {
		page,
		contextInterest: params.slug === 'for-landowners' ? 'Joint venture / landowner' : undefined
	};
};
