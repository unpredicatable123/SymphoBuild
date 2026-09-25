import { error } from '@sveltejs/kit';
import { SERVICE_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { ServiceDetail } from '$lib/types';

export const load = async ({ params }) => {
	const service = await sanityFetch<
		(ServiceDetail & { others?: { title: string; slug: string; icon?: string }[] }) | null
	>(SERVICE_QUERY, { slug: params.slug });
	if (!service) error(404, 'Service not found');
	return {
		service,
		contextLabel: service.title,
		contextService: service.slug,
		contextInterest: service.enquiryInterest
	};
};
