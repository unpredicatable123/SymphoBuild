import { BROCHURE_COOKIE, resolveBrochure } from '$lib/server/brochure';
import { loadPage } from '$lib/server/pages';

/** Landing page after a no-JavaScript form submission. */
export const load = async ({ cookies, url }) => {
	const page = await loadPage('thank-you');
	const type = url.searchParams.get('type');
	// The brochure link is only revealed to the browser that just submitted the form.
	const brochureSlug = cookies.get(BROCHURE_COOKIE);
	const brochureUrl =
		type === 'brochure' && brochureSlug ? await resolveBrochure(brochureSlug) : null;
	return { page, brochureUrl };
};
