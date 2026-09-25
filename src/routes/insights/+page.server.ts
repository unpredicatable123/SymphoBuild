import { loadOptionalPage } from '$lib/server/pages';
import { POSTS_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { Category, PostCard } from '$lib/types';

const PER_PAGE = 9;

export const load = async ({ url }) => {
	const category = /^[a-z0-9-]{1,60}$/.test(url.searchParams.get('category') ?? '')
		? url.searchParams.get('category')!
		: '';
	const pageNo = Math.max(1, Math.min(200, Number(url.searchParams.get('page')) || 1));
	const start = (pageNo - 1) * PER_PAGE;
	const [result, page] = await Promise.all([
		sanityFetch<{ posts: PostCard[]; total: number; categories: Category[] }>(POSTS_QUERY, {
			category,
			start,
			end: start + PER_PAGE
		}),
		loadOptionalPage('insights')
	]);
	return {
		...result,
		page,
		category,
		pageNo,
		pages: Math.max(1, Math.ceil(result.total / PER_PAGE))
	};
};
