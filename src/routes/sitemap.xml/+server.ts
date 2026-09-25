import { getEnv } from '$lib/server/env';
import { SITEMAP_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';

type Entry = { slug: string; _updatedAt?: string };

export const GET = async () => {
	const site = getEnv().PUBLIC_SITE_URL;
	const data =
		await sanityFetch<Record<'projects' | 'services' | 'posts' | 'guides' | 'pages', Entry[]>>(
			SITEMAP_QUERY
		);

	const indexPages = new Set(['projects', 'services', 'insights', 'gallery', 'thank-you']);
	const urls: { loc: string; lastmod?: string; priority: string }[] = [
		{ loc: '/', priority: '1.0' },
		{ loc: '/projects', priority: '0.9' },
		{ loc: '/services', priority: '0.8' },
		{ loc: '/insights', priority: '0.7' },
		{ loc: '/gallery', priority: '0.6' },
		...data.pages
			.filter((p) => !indexPages.has(p.slug))
			.map((p) => ({ loc: `/${p.slug}`, lastmod: p._updatedAt, priority: '0.7' })),
		...data.projects.map((p) => ({
			loc: `/projects/${p.slug}`,
			lastmod: p._updatedAt,
			priority: '0.9'
		})),
		...data.services.map((p) => ({
			loc: `/services/${p.slug}`,
			lastmod: p._updatedAt,
			priority: '0.8'
		})),
		...data.posts.map((p) => ({
			loc: `/insights/${p.slug}`,
			lastmod: p._updatedAt,
			priority: '0.6'
		})),
		...data.guides.map((p) => ({
			loc: `/buyers-guide/${p.slug}`,
			lastmod: p._updatedAt,
			priority: '0.6'
		}))
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) =>
			`  <url><loc>${site}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=0, s-maxage=3600'
		}
	});
};
