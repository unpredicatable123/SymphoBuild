import {
	WrenchIcon,
	UserIcon,
	CommentIcon,
	HelpCircleIcon,
	DocumentTextIcon,
	TagIcon,
	ImagesIcon,
	BookIcon,
	DocumentIcon,
	ArrowRightIcon
} from '../../icons';
import { defineArrayMember, defineField, defineType } from 'sanity';
import { iconField } from '../objects/shared';
import { SECTION_TYPES } from '../objects/sections';

const slugField = (source = 'title') =>
	defineField({
		name: 'slug',
		type: 'slug',
		options: { source, maxLength: 96 },
		validation: (rule) => rule.required()
	});

export const service = defineType({
	name: 'service',
	title: 'Service',
	type: 'document',
	icon: WrenchIcon,
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'related', title: 'Related' },
		{ name: 'seo', title: 'SEO' }
	],
	fields: [
		defineField({
			name: 'title',
			type: 'string',
			group: 'content',
			validation: (rule) => rule.required()
		}),
		{ ...slugField(), group: 'content' },
		{ ...iconField(), group: 'content' },
		defineField({ name: 'order', type: 'number', group: 'content' }),
		defineField({
			name: 'summary',
			type: 'text',
			rows: 2,
			group: 'content',
			validation: (rule) => rule.required().max(220)
		}),
		defineField({ name: 'heroImage', type: 'imageWithAlt', group: 'content' }),
		defineField({ name: 'body', type: 'portableText', group: 'content' }),
		defineField({
			name: 'process',
			type: 'array',
			group: 'content',
			of: [defineArrayMember({ type: 'processStep' })]
		}),
		defineField({
			name: 'deliverables',
			type: 'array',
			group: 'content',
			of: [defineArrayMember({ type: 'string' })]
		}),
		defineField({
			name: 'enquiryInterest',
			title: 'Pre-selected interest in the enquiry form',
			type: 'string',
			group: 'content',
			description: 'Must match one of the options in Site settings → Forms.'
		}),
		defineField({
			name: 'relatedProjects',
			title: 'Project examples',
			type: 'array',
			group: 'related',
			of: [defineArrayMember({ type: 'reference', to: [{ type: 'project' }] })]
		}),
		defineField({
			name: 'faqs',
			type: 'array',
			group: 'related',
			of: [defineArrayMember({ type: 'reference', to: [{ type: 'faq' }] })]
		}),
		defineField({ name: 'seo', type: 'seo', group: 'seo' })
	],
	orderings: [{ title: 'Sort order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
	preview: { select: { title: 'title', subtitle: 'summary', media: 'heroImage' } }
});

export const teamMember = defineType({
	name: 'teamMember',
	title: 'Team member',
	type: 'document',
	icon: UserIcon,
	fields: [
		defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
		defineField({ name: 'role', type: 'string' }),
		defineField({ name: 'photo', type: 'imageWithAlt' }),
		defineField({ name: 'bio', type: 'text', rows: 3 }),
		defineField({ name: 'linkedin', title: 'LinkedIn URL', type: 'url' }),
		defineField({ name: 'leadership', type: 'boolean', initialValue: false }),
		defineField({ name: 'order', type: 'number' })
	],
	orderings: [{ title: 'Sort order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
	preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } }
});

export const testimonial = defineType({
	name: 'testimonial',
	title: 'Testimonial',
	type: 'document',
	icon: CommentIcon,
	fields: [
		defineField({
			name: 'quote',
			type: 'text',
			rows: 4,
			validation: (rule) => rule.required().max(400)
		}),
		defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
		defineField({
			name: 'context',
			type: 'string',
			description: 'e.g. "Villa owner" or "Landowner partner"'
		}),
		defineField({ name: 'project', type: 'reference', to: [{ type: 'project' }] }),
		defineField({ name: 'photo', type: 'imageWithAlt' }),
		defineField({ name: 'videoUrl', type: 'url' }),
		defineField({ name: 'featured', type: 'boolean', initialValue: false }),
		defineField({
			name: 'consentConfirmed',
			title: 'Client consent to publish confirmed',
			type: 'boolean',
			initialValue: false,
			description: 'Only publish testimonials the client has agreed to share.'
		})
	],
	preview: { select: { title: 'name', subtitle: 'quote', media: 'photo' } }
});

export const faq = defineType({
	name: 'faq',
	title: 'FAQ',
	type: 'document',
	icon: HelpCircleIcon,
	fields: [
		defineField({ name: 'question', type: 'string', validation: (rule) => rule.required() }),
		defineField({
			name: 'answer',
			type: 'simplePortableText',
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'category',
			type: 'string',
			options: {
				list: ['general', 'buying', 'construction', 'project', 'landowners', 'legal', 'services']
			},
			initialValue: 'general'
		}),
		defineField({ name: 'order', type: 'number' })
	],
	orderings: [
		{
			title: 'Category',
			name: 'category',
			by: [
				{ field: 'category', direction: 'asc' },
				{ field: 'order', direction: 'asc' }
			]
		}
	],
	preview: { select: { title: 'question', subtitle: 'category' } }
});

export const blogCategory = defineType({
	name: 'blogCategory',
	title: 'Insight category',
	type: 'document',
	icon: TagIcon,
	fields: [
		defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
		slugField(),
		defineField({ name: 'description', type: 'text', rows: 2 })
	]
});

export const blogPost = defineType({
	name: 'blogPost',
	title: 'Insight article',
	type: 'document',
	icon: DocumentTextIcon,
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'meta', title: 'Meta' },
		{ name: 'seo', title: 'SEO' }
	],
	fields: [
		defineField({
			name: 'title',
			type: 'string',
			group: 'content',
			validation: (rule) => rule.required()
		}),
		{ ...slugField(), group: 'content' },
		defineField({
			name: 'excerpt',
			type: 'text',
			rows: 3,
			group: 'content',
			validation: (rule) => rule.required().max(240)
		}),
		defineField({
			name: 'coverImage',
			type: 'imageWithAlt',
			group: 'content',
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'body',
			type: 'portableText',
			group: 'content',
			description: 'H2 and H3 headings build the table of contents automatically.'
		}),
		defineField({
			name: 'categories',
			type: 'array',
			group: 'meta',
			of: [defineArrayMember({ type: 'reference', to: [{ type: 'blogCategory' }] })],
			validation: (rule) => rule.min(1)
		}),
		defineField({ name: 'author', type: 'reference', group: 'meta', to: [{ type: 'teamMember' }] }),
		defineField({
			name: 'publishedAt',
			type: 'datetime',
			group: 'meta',
			initialValue: () => new Date().toISOString(),
			validation: (rule) => rule.required()
		}),
		defineField({ name: 'featured', type: 'boolean', group: 'meta', initialValue: false }),
		defineField({ name: 'seo', type: 'seo', group: 'seo' })
	],
	orderings: [
		{
			title: 'Newest first',
			name: 'publishedDesc',
			by: [{ field: 'publishedAt', direction: 'desc' }]
		}
	],
	preview: {
		select: { title: 'title', date: 'publishedAt', media: 'coverImage' },
		prepare: ({ title, date, media }) => ({
			title,
			subtitle: date ? new Date(date).toLocaleDateString('en-IN') : 'Draft',
			media
		})
	}
});

export const buyerGuide = defineType({
	name: 'buyerGuide',
	title: "Buyer's guide article",
	type: 'document',
	icon: BookIcon,
	fields: [
		defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
		slugField(),
		defineField({
			name: 'topic',
			type: 'string',
			options: {
				list: ['buying', 'documents', 'loans', 'approvals', 'possession', 'maintenance', 'other']
			}
		}),
		iconField(),
		defineField({ name: 'order', type: 'number' }),
		defineField({ name: 'excerpt', type: 'text', rows: 2, validation: (rule) => rule.required() }),
		defineField({
			name: 'checklist',
			type: 'array',
			of: [defineArrayMember({ type: 'string' })],
			description: 'Shown as a checklist beside the article.'
		}),
		defineField({ name: 'body', type: 'portableText' }),
		defineField({ name: 'seo', type: 'seo' })
	],
	orderings: [{ title: 'Sort order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
	preview: { select: { title: 'title', subtitle: 'topic' } }
});

export const galleryItem = defineType({
	name: 'galleryItem',
	title: 'Gallery image',
	type: 'document',
	icon: ImagesIcon,
	fields: [
		defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
		defineField({ name: 'image', type: 'imageWithAlt', validation: (rule) => rule.required() }),
		defineField({
			name: 'category',
			type: 'string',
			options: {
				list: [
					{ title: 'Exteriors', value: 'exteriors' },
					{ title: 'Interiors', value: 'interiors' },
					{ title: 'Construction', value: 'construction' },
					{ title: 'Amenities', value: 'amenities' },
					{ title: 'Plots & layouts', value: 'plots' },
					{ title: 'Events', value: 'events' }
				]
			},
			validation: (rule) => rule.required()
		}),
		defineField({ name: 'project', type: 'reference', to: [{ type: 'project' }] }),
		defineField({ name: 'order', type: 'number' })
	],
	orderings: [{ title: 'Sort order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
	preview: { select: { title: 'title', subtitle: 'category', media: 'image' } }
});

export const page = defineType({
	name: 'page',
	title: 'Page',
	type: 'document',
	icon: DocumentIcon,
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'seo', title: 'SEO' }
	],
	fields: [
		defineField({
			name: 'title',
			type: 'string',
			group: 'content',
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'slug',
			type: 'slug',
			group: 'content',
			description:
				'The page address, e.g. "about" → /about. The listing pages use the reserved slugs projects, services, insights and gallery for their header copy.',
			options: { source: 'title', maxLength: 96 },
			validation: (rule) => rule.required()
		}),
		defineField({ name: 'hero', title: 'Page header', type: 'pageHero', group: 'content' }),
		defineField({
			name: 'sections',
			title: 'Page sections',
			type: 'array',
			group: 'content',
			description: 'Add, remove and drag sections to build the page.',
			of: SECTION_TYPES.map((type) => defineArrayMember({ type }))
		}),
		defineField({ name: 'seo', type: 'seo', group: 'seo' })
	],
	preview: {
		select: { title: 'title', slug: 'slug.current' },
		prepare: ({ title, slug }) => ({ title, subtitle: slug ? `/${slug}` : 'No address yet' })
	}
});

export const redirect = defineType({
	name: 'redirect',
	title: 'Redirect',
	type: 'document',
	icon: ArrowRightIcon,
	fields: [
		defineField({
			name: 'source',
			title: 'From path',
			type: 'string',
			description: 'e.g. /old-projects-page',
			validation: (rule) => rule.required().regex(/^\/[^\s?#]*$/, { name: 'path' })
		}),
		defineField({
			name: 'destination',
			title: 'To',
			type: 'string',
			description: 'A path (/projects) or a full URL',
			validation: (rule) => rule.required().regex(/^(\/|https?:\/\/)/, { name: 'path or URL' })
		}),
		defineField({
			name: 'permanent',
			type: 'boolean',
			initialValue: true,
			description: 'Permanent (308) redirects pass search ranking to the new page.'
		})
	],
	preview: { select: { title: 'source', subtitle: 'destination' } }
});
