import type { ProjectCard, ProjectStatus, PropertyType } from '$lib/types';
import { BUDGET_RANGES, STATUS_LABELS, TYPE_LABELS } from '$lib/utils';

export type ProjectFilters = {
	status: ProjectStatus | '';
	type: PropertyType | '';
	city: string;
	bhk: string;
	budget: string;
};

export function parseFilters(params: URLSearchParams): ProjectFilters {
	const pick = <T extends string>(v: string | null, allowed: readonly T[]) =>
		v && (allowed as readonly string[]).includes(v) ? (v as T) : ('' as const);
	return {
		status: pick(params.get('status'), Object.keys(STATUS_LABELS) as ProjectStatus[]),
		type: pick(params.get('type'), Object.keys(TYPE_LABELS) as PropertyType[]),
		city: (params.get('city') ?? '').slice(0, 60),
		bhk: pick(params.get('bhk'), ['1', '2', '3', '4']),
		budget: pick(
			params.get('budget'),
			BUDGET_RANGES.map((b) => b.value)
		)
	};
}

export function applyFilters(projects: ProjectCard[], f: ProjectFilters) {
	return projects.filter((p) => {
		if (f.status && p.status !== f.status) return false;
		if (
			f.type &&
			p.propertyType !== f.type &&
			!(f.type === 'villa' && p.propertyType === 'gatedCommunity')
		)
			return false;
		if (f.city && p.location?.city?.toLowerCase() !== f.city.toLowerCase()) return false;
		if (f.bhk) {
			const n = Number(f.bhk);
			if (!p.bedrooms?.some((b) => (n === 4 ? b >= 4 : b === n))) return false;
		}
		if (f.budget) {
			const range = BUDGET_RANGES.find((b) => b.value === f.budget);
			if (!range || !p.priceFrom) return false;
			const lo = p.priceFrom;
			const hi = p.priceTo ?? p.priceFrom;
			if (hi < range.min || lo >= range.max) return false;
		}
		return true;
	});
}

/** Filter options derived from the catalogue itself, so editors never maintain lists. */
export function filterOptions(projects: ProjectCard[]) {
	const types = [...new Set(projects.map((p) => p.propertyType))];
	const cities = [...new Set(projects.map((p) => p.location?.city).filter(Boolean))] as string[];
	const bhks = [
		...new Set(projects.flatMap((p) => p.bedrooms ?? []).map((b) => (b >= 4 ? 4 : b)))
	].sort();
	const hasPrices = projects.some((p) => p.priceFrom);
	return {
		statuses: (Object.keys(STATUS_LABELS) as ProjectStatus[]).map((value) => ({
			value,
			label: STATUS_LABELS[value],
			count: projects.filter((p) => p.status === value).length
		})),
		types: types.map((value) => ({ value, label: TYPE_LABELS[value] })),
		cities: cities.sort().map((c) => ({ value: c, label: c })),
		bhks: bhks.map((b) => ({ value: String(b), label: b >= 4 ? '4+ BHK' : `${b} BHK` })),
		budgets: hasPrices ? BUDGET_RANGES.map((b) => ({ value: b.value, label: b.label })) : []
	};
}
