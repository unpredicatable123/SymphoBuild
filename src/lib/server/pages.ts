import { error } from '@sveltejs/kit';
import type { Page } from '$lib/types';
import { PAGE_QUERY } from './queries';
import { sanityFetch } from './sanity';

/** Load a flexible `page` document by slug, or 404. */
export async function loadPage(slug: string): Promise<Page> {
	const page = await sanityFetch<Page | null>(PAGE_QUERY, { slug });
	if (!page) error(404, 'Page not found');
	return page;
}

/** Same as loadPage but returns null instead of 404 (for index routes with optional copy). */
export async function loadOptionalPage(slug: string): Promise<Page | null> {
	return sanityFetch<Page | null>(PAGE_QUERY, { slug });
}
