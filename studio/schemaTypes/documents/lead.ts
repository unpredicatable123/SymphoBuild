import { EnvelopeIcon } from '../../icons';
import { defineArrayMember, defineField, defineType } from 'sanity';

export const LEAD_STATUSES = [
	{ title: '🆕 New', value: 'new' },
	{ title: '📞 Contacted', value: 'contacted' },
	{ title: '✅ Qualified', value: 'qualified' },
	{ title: '🏗️ Site visit booked', value: 'siteVisit' },
	{ title: '🤝 Negotiation', value: 'negotiation' },
	{ title: '🏆 Won', value: 'won' },
	{ title: '✖️ Lost', value: 'lost' },
	{ title: '🚫 Spam', value: 'spam' }
];

const ENQUIRY_TYPES = [
	{ title: 'Consultation / site visit', value: 'consultation' },
	{ title: 'Project enquiry', value: 'project' },
	{ title: 'Landowner / JV', value: 'landowner' },
	{ title: 'Brochure request', value: 'brochure' }
];

/**
 * Leads are created by the website's server (never by the browser directly).
 * Sales staff update status and add notes; submission data is read-only.
 */
export const lead = defineType({
	name: 'lead',
	title: 'Lead',
	type: 'document',
	icon: EnvelopeIcon,
	groups: [
		{ name: 'pipeline', title: 'Pipeline', default: true },
		{ name: 'enquiry', title: 'Enquiry' },
		{ name: 'land', title: 'Land details' },
		{ name: 'tracking', title: 'Source & consent' }
	],
	fields: [
		defineField({
			name: 'status',
			type: 'string',
			group: 'pipeline',
			initialValue: 'new',
			options: { list: LEAD_STATUSES }
		}),
		defineField({
			name: 'assignedTo',
			type: 'reference',
			group: 'pipeline',
			to: [{ type: 'teamMember' }]
		}),
		defineField({ name: 'followUpDate', type: 'date', group: 'pipeline' }),
		defineField({
			name: 'notes',
			title: 'Internal notes',
			type: 'array',
			group: 'pipeline',
			description: 'Never shown on the website.',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'note',
					fields: [
						defineField({ name: 'note', type: 'text', rows: 3 }),
						defineField({ name: 'author', type: 'string' }),
						defineField({
							name: 'at',
							title: 'Date',
							type: 'datetime',
							initialValue: () => new Date().toISOString()
						})
					],
					preview: { select: { title: 'note', subtitle: 'at' } }
				})
			]
		}),

		defineField({
			name: 'enquiryType',
			type: 'string',
			group: 'enquiry',
			readOnly: true,
			options: { list: ENQUIRY_TYPES }
		}),
		defineField({ name: 'name', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'phone', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'email', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'preferredContact', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({
			name: 'project',
			type: 'reference',
			group: 'enquiry',
			to: [{ type: 'project' }],
			weak: true,
			readOnly: true
		}),
		defineField({
			name: 'service',
			type: 'reference',
			group: 'enquiry',
			to: [{ type: 'service' }],
			weak: true,
			readOnly: true
		}),
		defineField({ name: 'interest', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'unitInterest', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'budget', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'visitType', type: 'string', group: 'enquiry', readOnly: true }),
		defineField({ name: 'preferredDate', type: 'date', group: 'enquiry', readOnly: true }),
		defineField({ name: 'message', type: 'text', group: 'enquiry', readOnly: true }),

		defineField({
			name: 'landDetails',
			type: 'object',
			group: 'land',
			readOnly: true,
			hidden: ({ document }) => document?.enquiryType !== 'landowner',
			fields: [
				defineField({ name: 'location', type: 'string' }),
				defineField({ name: 'city', type: 'string' }),
				defineField({ name: 'area', type: 'number' }),
				defineField({ name: 'areaUnit', type: 'string' }),
				defineField({ name: 'dimensions', type: 'string' }),
				defineField({ name: 'roadWidth', type: 'string' }),
				defineField({ name: 'ownership', type: 'string' }),
				defineField({ name: 'partnershipType', type: 'string' })
			]
		}),

		defineField({ name: 'submittedAt', type: 'datetime', group: 'tracking', readOnly: true }),
		defineField({ name: 'consent', type: 'boolean', group: 'tracking', readOnly: true }),
		defineField({ name: 'consentText', type: 'text', rows: 2, group: 'tracking', readOnly: true }),
		defineField({
			name: 'sourceRoute',
			title: 'Submitted from page',
			type: 'string',
			group: 'tracking',
			readOnly: true
		}),
		defineField({ name: 'referrer', type: 'string', group: 'tracking', readOnly: true }),
		defineField({
			name: 'utm',
			title: 'Campaign (UTM)',
			type: 'object',
			group: 'tracking',
			readOnly: true,
			fields: ['source', 'medium', 'campaign', 'term', 'content', 'landingPage'].map((name) =>
				defineField({ name, type: 'string' })
			)
		}),
		defineField({ name: 'userAgent', type: 'string', group: 'tracking', readOnly: true })
	],
	orderings: [
		{
			title: 'Newest first',
			name: 'submittedDesc',
			by: [{ field: 'submittedAt', direction: 'desc' }]
		}
	],
	preview: {
		select: {
			name: 'name',
			type: 'enquiryType',
			status: 'status',
			at: 'submittedAt',
			project: 'project.title'
		},
		prepare: ({ name, type, status, at, project }) => ({
			title: `${name ?? 'Unknown'}${project ? ` — ${project}` : ''}`,
			subtitle: [
				LEAD_STATUSES.find((s) => s.value === status)?.title,
				ENQUIRY_TYPES.find((t) => t.value === type)?.title,
				at
					? new Date(at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
					: null
			]
				.filter(Boolean)
				.join(' · ')
		})
	}
});
