import { describe, expect, it } from 'vitest';
import type { ProjectCard } from '$lib/types';
import { applyFilters, filterOptions, parseFilters } from './filters';

const p = (over: Partial<ProjectCard>): ProjectCard => ({
	_id: over.slug ?? 'x',
	title: 'X',
	slug: 'x',
	status: 'ongoing',
	propertyType: 'apartment',
	...over
});

const catalogue = [
	p({
		slug: 'a',
		status: 'ongoing',
		propertyType: 'apartment',
		bedrooms: [2, 3],
		priceFrom: 6_800_000,
		priceTo: 12_400_000,
		location: { city: 'Coimbatore' }
	}),
	p({
		slug: 'b',
		status: 'ready',
		propertyType: 'gatedCommunity',
		bedrooms: [3, 4],
		priceFrom: 16_000_000,
		priceTo: 24_000_000,
		location: { city: 'Coimbatore' }
	}),
	p({
		slug: 'c',
		status: 'upcoming',
		propertyType: 'plotted',
		priceFrom: 1_800_000,
		priceTo: 4_600_000,
		location: { city: 'Tiruppur' }
	}),
	p({ slug: 'd', status: 'completed', propertyType: 'commercial', location: { city: 'Chennai' } })
];

const slugs = (list: ProjectCard[]) => list.map((x) => x.slug);

describe('project filters', () => {
	it('ignores unknown or malicious query values', () => {
		const f = parseFilters(new URLSearchParams('status=<script>&type=castle&bhk=9&budget=free'));
		expect(f).toEqual({ status: '', type: '', city: '', bhk: '', budget: '' });
	});

	it('filters by status, city and bedrooms', () => {
		expect(
			slugs(applyFilters(catalogue, parseFilters(new URLSearchParams('status=ready'))))
		).toEqual(['b']);
		expect(
			slugs(applyFilters(catalogue, parseFilters(new URLSearchParams('city=coimbatore'))))
		).toEqual(['a', 'b']);
		expect(slugs(applyFilters(catalogue, parseFilters(new URLSearchParams('bhk=4'))))).toEqual([
			'b'
		]);
	});

	it('treats gated communities as villas', () => {
		expect(slugs(applyFilters(catalogue, parseFilters(new URLSearchParams('type=villa'))))).toEqual(
			['b']
		);
	});

	it('matches budget ranges by overlap', () => {
		expect(
			slugs(applyFilters(catalogue, parseFilters(new URLSearchParams('budget=under-50l'))))
		).toEqual(['c']);
		expect(
			slugs(applyFilters(catalogue, parseFilters(new URLSearchParams('budget=1cr-2cr'))))
		).toEqual(['a', 'b']);
	});

	it('derives options from the catalogue', () => {
		const o = filterOptions(catalogue);
		expect(o.cities.map((c) => c.value)).toEqual(['Chennai', 'Coimbatore', 'Tiruppur']);
		expect(o.bhks.map((b) => b.label)).toEqual(['2 BHK', '3 BHK', '4+ BHK']);
		expect(o.statuses.find((s) => s.value === 'ongoing')?.count).toBe(1);
	});
});
