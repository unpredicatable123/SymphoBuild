import { loadOptionalPage } from '$lib/server/pages';
import { SERVICES_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { ServiceCard } from '$lib/types';

export const load = async () => {
	const [services, page] = await Promise.all([
		sanityFetch<(ServiceCard & { deliverables?: string[] })[]>(SERVICES_QUERY),
		loadOptionalPage('services')
	]);
	return { services, page };
};
