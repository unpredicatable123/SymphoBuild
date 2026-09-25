import { error } from '@sveltejs/kit';
import { GUIDE_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { Guide } from '$lib/types';

export const load = async ({ params }) => {
	const guide = await sanityFetch<(Guide & { others?: Guide[] }) | null>(GUIDE_QUERY, {
		slug: params.slug
	});
	if (!guide) error(404, 'Guide not found');
	return { guide };
};
