import { error } from '@sveltejs/kit';
import { HOME_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { HomePage } from '$lib/types';

export const load = async () => {
	const home = await sanityFetch<HomePage | null>(HOME_QUERY);
	if (!home) error(404, 'The home page has not been published yet.');
	return { home, headerTone: 'dark' as const };
};
