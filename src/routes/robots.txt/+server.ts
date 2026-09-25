import { getEnv } from '$lib/server/env';

export const GET = () => {
	const site = getEnv().PUBLIC_SITE_URL;
	// Keep non-production deployments (previews, localhost) out of search indexes.
	const isProduction = !/localhost|127\.0\.0\.1|\.vercel\.app|\.netlify\.app/.test(site);
	const body = isProduction
		? `User-agent: *\nAllow: /\nDisallow: /enquire\nDisallow: /thank-you\n\nSitemap: ${site}/sitemap.xml\n`
		: `User-agent: *\nDisallow: /\n`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
