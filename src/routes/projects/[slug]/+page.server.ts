import { error } from '@sveltejs/kit';
import { PROJECT_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { ProjectDetail } from '$lib/types';

export const load = async ({ params, parent }) => {
	const [{ settings }, project] = await Promise.all([
		parent(),
		sanityFetch<ProjectDetail | null>(PROJECT_QUERY, { slug: params.slug })
	]);
	if (
		!project ||
		(project.propertyType === 'plotted' && settings.features?.enablePlotSales === false)
	) {
		error(404, 'Project not found');
	}
	return {
		project,
		headerTone: 'dark' as const,
		contextLabel: project.title,
		contextProject: project.slug,
		showInventory: project.showInventory && settings.features?.enableUnitInventory !== false
	};
};
