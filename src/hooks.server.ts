import { redirect, type Handle } from '@sveltejs/kit';
import { captureAttribution } from '$lib/server/leads';
import { REDIRECTS_QUERY } from '$lib/server/queries';
import { sanityFetch } from '$lib/server/sanity';

type Redirect = { source: string; destination: string; permanent?: boolean };

const normalise = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p).toLowerCase();
let redirectCache: { at: number; map: Map<string, Redirect> } | undefined;

/** CMS-managed redirects, cached for 60 s per server instance. */
async function getRedirects() {
	if (redirectCache && Date.now() - redirectCache.at < 60_000) return redirectCache.map;
	try {
		const list = await sanityFetch<Redirect[]>(REDIRECTS_QUERY);
		redirectCache = { at: Date.now(), map: new Map(list.map((r) => [normalise(r.source), r])) };
	} catch {
		redirectCache = { at: Date.now(), map: new Map() };
	}
	return redirectCache.map;
}

const NO_CACHE = ['/enquire', '/thank-you'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isPage = !pathname.startsWith('/_app') && !/\.[a-z0-9]+$/i.test(pathname);

	if (isPage && event.request.method === 'GET') {
		const match = (await getRedirects()).get(normalise(pathname));
		if (match && normalise(match.destination) !== normalise(pathname)) {
			redirect(match.permanent === false ? 307 : 308, match.destination);
		}
		captureAttribution(event.url, event.cookies);
	}

	const response = await resolve(event, {
		// Preload only the Latin subsets of the three brand fonts.
		preload: ({ type, path }) =>
			type === 'js' ||
			type === 'css' ||
			(type === 'font' && /-latin-(opsz|wght|400)-normal/.test(path))
	});

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	);

	const cacheable =
		isPage &&
		event.request.method === 'GET' &&
		response.status === 200 &&
		!response.headers.has('set-cookie') &&
		!NO_CACHE.some((p) => pathname.startsWith(p)) &&
		!response.headers.has('cache-control');
	if (cacheable) {
		// Serve from the edge for 5 min, then revalidate in the background.
		response.headers.set(
			'Cache-Control',
			'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
		);
	} else if (isPage && NO_CACHE.some((p) => pathname.startsWith(p))) {
		response.headers.set('Cache-Control', 'private, no-store');
	}
	return response;
};
