/**
 * Form actions for every enquiry form on the site. Forms post to /enquire?/<type>.
 *  • Enhanced (JS) submissions receive JSON results and render inline success/errors.
 *  • Plain HTML submissions are redirected to /thank-you, or shown this page with errors.
 */
import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import { BROCHURE_COOKIE } from '$lib/server/brochure';
import { processLead, type LeadType } from '$lib/server/leads';

function handler(type: LeadType) {
	return async (event: RequestEvent) => {
		const { request, cookies, getClientAddress } = event;
		const enhanced = request.headers.get('x-sveltekit-action') === 'true';
		let ip = 'unknown';
		try {
			ip = getClientAddress();
		} catch {
			/* not available in some adapters */
		}
		const form = await request.formData();
		const result = await processLead(type, form, {
			cookies,
			ip,
			userAgent: request.headers.get('user-agent')
		});

		if (!result.ok) {
			const status = { invalid: 400, rate_limited: 429, store_failed: 503 }[result.code];
			return fail(status, result);
		}

		if (type === 'brochure') {
			cookies.set(BROCHURE_COOKIE, String(form.get('project') ?? ''), {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 60 * 30
			});
		}
		if (!enhanced) redirect(303, `/thank-you?type=${type}`);
		return result;
	};
}

export const actions: Actions = {
	consultation: handler('consultation'),
	project: handler('project'),
	landowner: handler('landowner'),
	brochure: handler('brochure')
};

export const load = () => ({ headerTone: 'light' as const });
