import { applyFilters, filterOptions, parseFilters } from '$lib/projects/filters';
import { loadOptionalPage } from '$lib/server/pages';
import { PROJECTS_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';
import type { ProjectCard } from '$lib/types';

export const load = async ({ url, parent }) => {
	const [{ settings }, all, page] = await Promise.all([
		parent(),
		sanityFetch<ProjectCard[]>(PROJECTS_QUERY),
		loadOptionalPage('projects')
	]);
	// Respect the "plot sales" feature switch in Site Settings.
	const catalogue =
		settings.features?.enablePlotSales === false
			? all.filter((p) => p.propertyType !== 'plotted')
			: all;
	const filters = parseFilters(url.searchParams);
	return {
		page,
		filters,
		options: filterOptions(catalogue),
		projects: applyFilters(catalogue, filters),
		total: catalogue.length
	};
};
