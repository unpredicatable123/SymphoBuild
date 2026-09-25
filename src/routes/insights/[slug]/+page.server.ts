import { error } from '@sveltejs/kit';
import { POST_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { PostCard, PostDetail } from '$lib/types';

export const load = async ({ params }) => {
	const post = await sanityFetch<(PostDetail & { latest?: PostCard[] }) | null>(POST_QUERY, {
		slug: params.slug
	});
	if (!post) error(404, 'Article not found');
	return { post };
};
