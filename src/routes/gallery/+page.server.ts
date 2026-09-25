import { loadOptionalPage } from '$lib/server/pages';
import { GALLERY_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { GalleryItem } from '$lib/types';

export const load = async () => {
	const [items, page] = await Promise.all([
		sanityFetch<GalleryItem[]>(GALLERY_QUERY),
		loadOptionalPage('gallery')
	]);
	return { items, page };
};
