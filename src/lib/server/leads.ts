/**
 * Lead capture pipeline: validate → spam checks → rate limit → persist to Sanity.
 * The write token never leaves the server.
 */
import { z } from 'zod';
import type { Cookies } from '@sveltejs/kit';
import { getEnv, isDemoMode } from './env';
import { getWriteClient, sanityFetch } from './sanity';

export const LEAD_TYPES = ['consultation', 'project', 'landowner', 'brochure'] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

const trimmed = (max: number) =>
	z.string().trim().max(max, `Please keep this under ${max} characters`);
/** Required text with a human message for both missing and empty values. */
const required = (message: string, max: number, min = 1) =>
	z
		.string({ error: message })
		.trim()
		.min(min, message)
		.max(max, `Please keep this under ${max} characters`);
const optionalText = (max: number) =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		trimmed(max).optional()
	);

const phone = z
	.string({ error: 'Please enter your phone number' })
	.trim()
	.min(1, 'Please enter your phone number')
	.transform((v) => v.replace(/[\s().-]/g, ''))
	.refine((v) => /^\+?\d{10,15}$/.test(v), 'Enter a valid phone number, e.g. +91 98765 43210');

const email = z.preprocess(
	(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
	z.email('Enter a valid email address').max(200).optional()
);

const slugField = z
	.string({ error: 'Please choose an option' })
	.trim()
	.regex(/^[a-z0-9-]{1,96}$/, 'Please choose an option');

const futureDate = z.preprocess(
	(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
	z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date')
		.refine((v) => {
			const d = new Date(`${v}T23:59:59+05:30`).getTime();
			const now = Date.now();
			return d >= now && d <= now + 366 * 86_400_000;
		}, 'Choose a date within the next year')
		.optional()
);

const consent = z
	.string()
	.optional()
	.refine((v) => v === 'on' || v === 'true', 'Please confirm you agree to be contacted');

const base = {
	name: required('Please enter your name', 120, 2),
	phone,
	email,
	preferredContact: z
		.enum(['phone', 'whatsapp', 'email'], { error: 'Choose how we should contact you' })
		.default('phone'),
	message: optionalText(2000),
	consent
};

export const LeadSchemas = {
	consultation: z.object({
		...base,
		interest: required('Please tell us what you are interested in', 80),
		budget: optionalText(60),
		visitType: z.enum(['consultation', 'siteVisit', 'call']).default('consultation'),
		preferredDate: futureDate,
		project: slugField.optional().or(z.literal('')),
		service: slugField.optional().or(z.literal(''))
	}),
	project: z.object({
		...base,
		project: slugField,
		unitInterest: optionalText(80),
		budget: optionalText(60),
		visitType: z.enum(['consultation', 'siteVisit', 'call']).default('siteVisit'),
		preferredDate: futureDate
	}),
	landowner: z.object({
		...base,
		landLocation: required('Please describe where the land is', 200, 3),
		city: required('Please enter the town or city', 80, 2),
		landArea: z.coerce
			.number({ message: 'Enter the land area as a number' })
			.positive('Enter the land area as a number')
			.max(10_000_000),
		areaUnit: z.enum(['cents', 'acres', 'sqft', 'grounds'], {
			error: 'Choose a unit for the land area'
		}),
		dimensions: optionalText(120),
		roadWidth: optionalText(60),
		ownership: required('Please select the ownership status', 80),
		partnershipType: required('Please select a partnership preference', 80)
	}),
	brochure: z.object({
		name: base.name,
		phone,
		email,
		consent,
		project: slugField
	})
} as const;

export type FieldErrors = Record<string, string>;

export type LeadResult =
	| {
			ok: true;
			type: LeadType;
			stored: boolean;
			brochureUrl?: string | null;
			projectTitle?: string;
	  }
	| {
			ok: false;
			type: LeadType;
			code: 'invalid' | 'rate_limited' | 'store_failed';
			errors: FieldErrors;
			values: Record<string, string>;
			message?: string;
	  };

/* ── Spam & abuse protection ──────────────────────────────────────────────── */
const HONEYPOT = 'website';
const MIN_FILL_MS = 2500;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

/** Best-effort, per-instance rate limit. Pair with a platform WAF for production traffic. */
export function rateLimited(ip: string) {
	const now = Date.now();
	const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	recent.push(now);
	hits.set(ip, recent);
	if (hits.size > 5000) hits.clear();
	return recent.length > MAX_PER_WINDOW;
}

function looksLikeBot(form: FormData) {
	if (String(form.get(HONEYPOT) ?? '').trim() !== '') return true;
	const ts = Number(form.get('_ts'));
	if (Number.isFinite(ts) && ts > 0 && Date.now() - ts < MIN_FILL_MS) return true;
	return false;
}

/* ── Attribution ──────────────────────────────────────────────────────────── */
export const UTM_COOKIE = 'sb_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** First-touch attribution: stores UTM params + landing page in a cookie (works without JS). */
export function captureAttribution(url: URL, cookies: Cookies) {
	if (!UTM_KEYS.some((k) => url.searchParams.has(k)) || cookies.get(UTM_COOKIE)) return;
	const data: Record<string, string> = { landing: url.pathname };
	for (const k of UTM_KEYS) {
		const v = url.searchParams.get(k);
		if (v) data[k.replace('utm_', '')] = v.slice(0, 120);
	}
	cookies.set(UTM_COOKIE, JSON.stringify(data), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 30
	});
}

function readAttribution(cookies: Cookies): Record<string, string> {
	try {
		const raw = cookies.get(UTM_COOKIE);
		return raw ? (JSON.parse(raw) as Record<string, string>) : {};
	} catch {
		return {};
	}
}

/* ── Main handler ─────────────────────────────────────────────────────────── */
export async function processLead(
	type: LeadType,
	form: FormData,
	ctx: { cookies: Cookies; ip: string; userAgent?: string | null }
): Promise<LeadResult> {
	const raw = Object.fromEntries(
		[...form.entries()].filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, String(v)])
	);
	const values = Object.fromEntries(
		Object.entries(raw).filter(([k]) => !['_ts', HONEYPOT, 'consent'].includes(k))
	);

	// Bots get a convincing success and nothing is stored.
	if (looksLikeBot(form)) return { ok: true, type, stored: false };

	if (rateLimited(ctx.ip)) {
		return {
			ok: false,
			type,
			code: 'rate_limited',
			values,
			errors: {},
			message:
				'Too many enquiries from this connection. Please try again in a few minutes, or call us.'
		};
	}

	const parsed = LeadSchemas[type].safeParse(raw);
	if (!parsed.success) {
		const errors: FieldErrors = {};
		for (const issue of parsed.error.issues) {
			const key = String(issue.path[0] ?? 'form');
			errors[key] ??= issue.message;
		}
		return { ok: false, type, code: 'invalid', values, errors };
	}

	const data = parsed.data as Record<string, unknown>;
	const refs = await sanityFetch<{
		project: { _id: string; title: string } | null;
		service: { _id: string; title: string } | null;
		consentText: string | null;
	}>(
		`{
			"project": *[_type == "project" && slug.current == $project][0]{_id, title},
			"service": *[_type == "service" && slug.current == $service][0]{_id, title},
			"consentText": *[_id == "siteSettings"][0].leadForms.consentText
		}`,
		{ project: (data.project as string) || '', service: (data.service as string) || '' }
	);

	const attribution = readAttribution(ctx.cookies);
	const lead = {
		_type: 'lead',
		enquiryType: type,
		status: 'new',
		name: data.name,
		phone: data.phone,
		email: data.email,
		preferredContact: data.preferredContact ?? 'phone',
		interest: data.interest ?? (refs.project ? `Project: ${refs.project.title}` : undefined),
		budget: data.budget,
		visitType: data.visitType,
		preferredDate: data.preferredDate,
		unitInterest: data.unitInterest,
		message: data.message,
		...(refs.project
			? { project: { _type: 'reference', _ref: refs.project._id, _weak: true } }
			: {}),
		...(refs.service
			? { service: { _type: 'reference', _ref: refs.service._id, _weak: true } }
			: {}),
		...(type === 'landowner'
			? {
					landDetails: {
						location: data.landLocation,
						city: data.city,
						area: data.landArea,
						areaUnit: data.areaUnit,
						dimensions: data.dimensions,
						roadWidth: data.roadWidth,
						ownership: data.ownership,
						partnershipType: data.partnershipType
					}
				}
			: {}),
		consent: true,
		consentText: refs.consentText ?? undefined,
		sourceRoute: (raw.sourceRoute ?? '').slice(0, 200) || undefined,
		referrer: (raw.referrer ?? '').slice(0, 300) || undefined,
		utm: {
			source: attribution.source,
			medium: attribution.medium,
			campaign: attribution.campaign,
			term: attribution.term,
			content: attribution.content,
			landingPage: attribution.landing
		},
		userAgent: ctx.userAgent?.slice(0, 300),
		submittedAt: new Date().toISOString()
	};

	let stored = false;
	const client = getWriteClient();
	if (client) {
		try {
			await client.create(lead);
			stored = true;
		} catch (err) {
			console.error('[leads] failed to store lead', err);
			return {
				ok: false,
				type,
				code: 'store_failed',
				values,
				errors: {},
				message:
					'We could not send your enquiry just now. Please try again, or reach us by phone or WhatsApp.'
			};
		}
	} else {
		console.info(
			`[leads] ${isDemoMode() ? 'Demo mode' : 'No SANITY_API_WRITE_TOKEN'} — lead validated but not stored:`,
			{ type, name: lead.name, project: refs.project?.title, route: lead.sourceRoute }
		);
	}

	await notify(lead).catch((err) => console.warn('[leads] notify webhook failed', err));

	let brochureUrl: string | null | undefined;
	if (type === 'brochure') {
		const { resolveBrochure } = await import('./brochure');
		brochureUrl = await resolveBrochure(String(data.project));
	}
	return { ok: true, type, stored, brochureUrl, projectTitle: refs.project?.title };
}

async function notify(lead: Record<string, unknown>) {
	const url = getEnv().LEAD_NOTIFY_WEBHOOK_URL;
	if (!url) return;
	await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			text: `New ${lead.enquiryType} enquiry from ${lead.name} (${lead.phone})${lead.interest ? ` — ${lead.interest}` : ''}`,
			lead
		}),
		signal: AbortSignal.timeout(4000)
	});
}
