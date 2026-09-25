import { ProjectsIcon, ActivityIcon } from '../../icons';
import { defineArrayMember, defineField, defineType } from 'sanity';
import { iconField } from '../objects/shared';

const STATUS = [
	{ title: 'Upcoming', value: 'upcoming' },
	{ title: 'Ongoing', value: 'ongoing' },
	{ title: 'Ready to move', value: 'ready' },
	{ title: 'Completed', value: 'completed' }
];
const TYPES = [
	{ title: 'Apartments', value: 'apartment' },
	{ title: 'Villas / independent homes', value: 'villa' },
	{ title: 'Gated community', value: 'gatedCommunity' },
	{ title: 'Commercial', value: 'commercial' },
	{ title: 'Plotted development', value: 'plotted' }
];
export const STAGES = [
	{ title: 'Design', value: 'design' },
	{ title: 'Approvals', value: 'approvals' },
	{ title: 'Foundation', value: 'foundation' },
	{ title: 'Structure', value: 'structure' },
	{ title: 'Envelope & services', value: 'envelope' },
	{ title: 'Finishes', value: 'finishes' },
	{ title: 'Handover', value: 'handover' }
];

export const project = defineType({
	name: 'project',
	title: 'Project',
	type: 'document',
	icon: ProjectsIcon,
	groups: [
		{ name: 'overview', title: 'Overview', default: true },
		{ name: 'media', title: 'Media' },
		{ name: 'details', title: 'Details & pricing' },
		{ name: 'units', title: 'Units & plans' },
		{ name: 'specs', title: 'Specifications' },
		{ name: 'legal', title: 'Approvals & RERA' },
		{ name: 'location', title: 'Location' },
		{ name: 'related', title: 'FAQs & related' },
		{ name: 'seo', title: 'SEO' }
	],
	fields: [
		defineField({
			name: 'title',
			type: 'string',
			group: 'overview',
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'slug',
			type: 'slug',
			group: 'overview',
			options: { source: 'title', maxLength: 96 },
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'status',
			type: 'string',
			group: 'overview',
			options: { list: STATUS, layout: 'radio', direction: 'horizontal' },
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'propertyType',
			type: 'string',
			group: 'overview',
			options: { list: TYPES },
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'tagline',
			type: 'text',
			rows: 2,
			group: 'overview',
			description: 'One or two sentences used on cards and in search results.',
			validation: (rule) => rule.max(220)
		}),
		defineField({ name: 'overview', type: 'portableText', group: 'overview' }),
		defineField({
			name: 'highlights',
			type: 'array',
			group: 'overview',
			of: [defineArrayMember({ type: 'string' })],
			validation: (rule) => rule.max(8)
		}),
		defineField({ name: 'featured', type: 'boolean', group: 'overview', initialValue: false }),
		defineField({
			name: 'order',
			title: 'Sort order',
			type: 'number',
			group: 'overview',
			description: 'Lower numbers appear first in the catalogue.'
		}),

		defineField({
			name: 'coverImage',
			type: 'imageWithAlt',
			group: 'media',
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'gallery',
			type: 'array',
			group: 'media',
			of: [defineArrayMember({ type: 'imageWithAlt' })],
			options: { layout: 'grid' }
		}),
		defineField({
			name: 'videoUrl',
			title: 'Video (YouTube or Vimeo URL)',
			type: 'url',
			group: 'media'
		}),
		defineField({
			name: 'virtualTourUrl',
			title: 'Virtual tour URL (e.g. Matterport)',
			type: 'url',
			group: 'media'
		}),
		defineField({
			name: 'brochure',
			type: 'file',
			group: 'media',
			description: 'PDF shown after a visitor fills in the brochure form.',
			options: { accept: 'application/pdf' }
		}),

		defineField({
			name: 'keyFacts',
			type: 'array',
			group: 'details',
			description: 'Shown as the fact strip in the project header (up to 6).',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'keyFact',
					fields: [
						defineField({ name: 'label', type: 'string' }),
						defineField({ name: 'value', type: 'string' })
					],
					preview: { select: { title: 'value', subtitle: 'label' } }
				})
			],
			validation: (rule) => rule.max(6)
		}),
		defineField({
			name: 'bedrooms',
			title: 'Bedroom configurations (BHK)',
			type: 'array',
			group: 'details',
			of: [defineArrayMember({ type: 'number' })],
			options: { layout: 'tags' },
			description: 'Used by the bedroom filter, e.g. 2, 3'
		}),
		defineField({
			name: 'areaRange',
			title: 'Area range (sq ft)',
			type: 'object',
			group: 'details',
			options: { columns: 2 },
			fields: [
				defineField({ name: 'min', type: 'number' }),
				defineField({ name: 'max', type: 'number' })
			]
		}),
		defineField({
			name: 'priceDisplay',
			title: 'Price (as displayed)',
			type: 'string',
			group: 'details',
			description: 'e.g. "₹68 L – ₹1.24 Cr" or "Price on request"'
		}),
		defineField({
			name: 'priceFrom',
			title: 'Starting price (₹, for filters)',
			type: 'number',
			group: 'details',
			description: 'Full rupee amount, e.g. 6800000 for ₹68 lakh.'
		}),
		defineField({
			name: 'priceTo',
			title: 'Highest price (₹, for filters)',
			type: 'number',
			group: 'details'
		}),
		defineField({
			name: 'amenities',
			type: 'array',
			group: 'details',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'amenity',
					fields: [
						iconField(),
						defineField({ name: 'label', type: 'string', validation: (rule) => rule.required() })
					],
					preview: { select: { title: 'label', subtitle: 'icon' } }
				})
			]
		}),

		defineField({
			name: 'units',
			title: 'Unit types / plot sizes',
			type: 'array',
			group: 'units',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'unitType',
					fields: [
						defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
						defineField({ name: 'bedrooms', type: 'number' }),
						defineField({
							name: 'carpetArea',
							title: 'Carpet / plot area (sq ft)',
							type: 'number'
						}),
						defineField({ name: 'builtUpArea', title: 'Built-up area (sq ft)', type: 'number' }),
						defineField({ name: 'priceLabel', type: 'string' }),
						defineField({
							name: 'availability',
							type: 'string',
							initialValue: 'available',
							options: {
								list: [
									{ title: 'Available', value: 'available' },
									{ title: 'Limited', value: 'limited' },
									{ title: 'Sold out', value: 'soldOut' },
									{ title: 'On hold', value: 'onHold' }
								],
								layout: 'radio',
								direction: 'horizontal'
							}
						}),
						defineField({
							name: 'unitsAvailable',
							type: 'number',
							validation: (rule) => rule.min(0)
						}),
						defineField({ name: 'totalUnits', type: 'number', validation: (rule) => rule.min(0) }),
						defineField({ name: 'floorPlan', type: 'imageWithAlt' })
					],
					preview: {
						select: {
							title: 'name',
							availability: 'availability',
							left: 'unitsAvailable',
							total: 'totalUnits',
							media: 'floorPlan'
						},
						prepare: ({ title, availability, left, total, media }) => ({
							title,
							subtitle: `${availability ?? ''}${total ? ` · ${left ?? 0}/${total} left` : ''}`,
							media
						})
					}
				})
			]
		}),
		defineField({
			name: 'showInventory',
			title: 'Show availability table',
			type: 'boolean',
			group: 'units',
			initialValue: false
		}),
		defineField({
			name: 'floorPlans',
			title: 'Additional plans (site plan, layout, etc.)',
			type: 'array',
			group: 'units',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'floorPlan',
					fields: [
						defineField({ name: 'title', type: 'string' }),
						defineField({ name: 'image', type: 'imageWithAlt' }),
						defineField({ name: 'file', title: 'PDF (optional)', type: 'file' })
					],
					preview: { select: { title: 'title', media: 'image' } }
				})
			]
		}),

		defineField({
			name: 'specifications',
			type: 'array',
			group: 'specs',
			of: [defineArrayMember({ type: 'specGroup' })]
		}),

		defineField({
			name: 'approvals',
			type: 'array',
			group: 'legal',
			description:
				'List only approvals you hold or have applied for. Each is shown with its status.',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'approval',
					fields: [
						defineField({
							name: 'authority',
							title: 'Approval / authority',
							type: 'string',
							validation: (rule) => rule.required()
						}),
						defineField({ name: 'reference', title: 'Reference number', type: 'string' }),
						defineField({
							name: 'status',
							type: 'string',
							initialValue: 'approved',
							options: {
								list: ['approved', 'applied', 'pending'],
								layout: 'radio',
								direction: 'horizontal'
							}
						}),
						defineField({ name: 'date', type: 'date' }),
						defineField({ name: 'document', type: 'file' })
					],
					preview: { select: { title: 'authority', subtitle: 'status' } }
				})
			]
		}),
		defineField({
			name: 'rera',
			title: 'RERA',
			type: 'object',
			group: 'legal',
			fields: [
				defineField({ name: 'number', title: 'Registration number', type: 'string' }),
				defineField({ name: 'website', title: 'Verification website', type: 'url' })
			]
		}),
		defineField({
			name: 'dtcpNumber',
			title: 'DTCP / layout approval number',
			type: 'string',
			group: 'legal'
		}),

		defineField({
			name: 'location',
			type: 'object',
			group: 'location',
			fields: [
				defineField({ name: 'locality', type: 'string', validation: (rule) => rule.required() }),
				defineField({
					name: 'city',
					type: 'string',
					description: 'Used by the location filter — keep spelling consistent.',
					validation: (rule) => rule.required()
				}),
				defineField({ name: 'address', type: 'text', rows: 2 }),
				defineField({ name: 'lat', title: 'Latitude', type: 'number' }),
				defineField({ name: 'lng', title: 'Longitude', type: 'number' })
			]
		}),
		defineField({
			name: 'connectivity',
			title: 'Nearby places',
			type: 'array',
			group: 'location',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'nearby',
					fields: [
						defineField({ name: 'place', type: 'string' }),
						defineField({ name: 'distance', type: 'string' })
					],
					preview: { select: { title: 'place', subtitle: 'distance' } }
				})
			]
		}),

		defineField({
			name: 'faqs',
			type: 'array',
			group: 'related',
			of: [defineArrayMember({ type: 'reference', to: [{ type: 'faq' }] })]
		}),
		defineField({
			name: 'relatedProjects',
			type: 'array',
			group: 'related',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{ type: 'project' }],
					options: {
						filter: ({ document }) => ({
							filter: '_id != $id',
							params: { id: document._id.replace('drafts.', '') }
						})
					}
				})
			],
			validation: (rule) => rule.unique().max(3)
		}),
		defineField({ name: 'seo', type: 'seo', group: 'seo' })
	],
	orderings: [
		{ title: 'Sort order', name: 'order', by: [{ field: 'order', direction: 'asc' }] },
		{ title: 'Title', name: 'title', by: [{ field: 'title', direction: 'asc' }] }
	],
	preview: {
		select: {
			title: 'title',
			status: 'status',
			city: 'location.city',
			locality: 'location.locality',
			media: 'coverImage'
		},
		prepare: ({ title, status, city, locality, media }) => ({
			title,
			subtitle: [
				STATUS.find((s) => s.value === status)?.title,
				[locality, city].filter(Boolean).join(', ')
			]
				.filter(Boolean)
				.join(' · '),
			media
		})
	}
});

export const projectUpdate = defineType({
	name: 'projectUpdate',
	title: 'Construction update',
	type: 'document',
	icon: ActivityIcon,
	fields: [
		defineField({
			name: 'project',
			type: 'reference',
			to: [{ type: 'project' }],
			validation: (rule) => rule.required()
		}),
		defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
		defineField({
			name: 'date',
			type: 'date',
			initialValue: () => new Date().toISOString().slice(0, 10),
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'progress',
			title: 'Overall progress (%)',
			type: 'number',
			validation: (rule) => rule.min(0).max(100)
		}),
		defineField({ name: 'stage', type: 'string', options: { list: STAGES } }),
		defineField({ name: 'summary', type: 'text', rows: 4 }),
		defineField({
			name: 'images',
			type: 'array',
			of: [defineArrayMember({ type: 'imageWithAlt' })],
			options: { layout: 'grid' }
		})
	],
	orderings: [
		{ title: 'Newest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }
	],
	preview: {
		select: {
			title: 'title',
			project: 'project.title',
			date: 'date',
			progress: 'progress',
			media: 'images.0'
		},
		prepare: ({ title, project, date, progress, media }) => ({
			title,
			subtitle: `${project ?? ''} · ${date ?? ''}${progress !== undefined ? ` · ${progress}%` : ''}`,
			media
		})
	}
});
