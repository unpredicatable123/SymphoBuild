/**
 * Page-builder sections for the flexible `page` document. Each maps 1:1 to a layout in
 * src/lib/components/sections/PageSections.svelte.
 */
import {
	BlockContentIcon,
	ImageIcon,
	ThLargeIcon,
	BarChartIcon,
	UsersIcon,
	ClockIcon,
	OlistIcon,
	ThListIcon,
	StarIcon,
	PinIcon,
	HelpCircleIcon,
	CommentIcon,
	ProjectsIcon,
	BookIcon,
	EnvelopeIcon,
	EarthGlobeIcon,
	BlockquoteIcon,
	LaunchIcon
} from '../../icons';
import { defineArrayMember, defineField, defineType, type FieldDefinition } from 'sanity';
import { hrefField } from './shared';

const eyebrow = defineField({
	name: 'eyebrow',
	type: 'string',
	description: 'Small label above the heading.'
});
const heading = (required = true) =>
	defineField({
		name: 'heading',
		type: 'string',
		validation: (rule) => (required ? rule.required() : rule)
	});
const intro = defineField({ name: 'intro', type: 'text', rows: 3 });

function section(
	name: string,
	title: string,
	icon: typeof ImageIcon,
	fields: FieldDefinition[],
	subtitle = title
) {
	return defineType({
		name,
		title,
		type: 'object',
		icon,
		fields,
		preview: {
			select: { heading: 'heading', quote: 'quote' },
			prepare: ({ heading, quote }) => ({ title: heading || quote || title, subtitle, media: icon })
		}
	});
}

const refArray = (name: string, to: string, title?: string) =>
	defineField({
		name,
		title,
		type: 'array',
		of: [defineArrayMember({ type: 'reference', to: [{ type: to }] })],
		validation: (rule) => rule.unique()
	});

export const sections = [
	section('richTextSection', 'Rich text', BlockContentIcon, [
		eyebrow,
		heading(false),
		defineField({
			name: 'layout',
			type: 'string',
			initialValue: 'narrow',
			options: {
				list: [
					{ title: 'Narrow column', value: 'narrow' },
					{ title: 'Heading left, text right', value: 'split' }
				],
				layout: 'radio'
			}
		}),
		defineField({ name: 'body', type: 'portableText', validation: (rule) => rule.required() })
	]),
	section('imageTextSection', 'Image + text', ImageIcon, [
		eyebrow,
		heading(),
		defineField({ name: 'body', type: 'portableText' }),
		defineField({ name: 'image', type: 'imageWithAlt', validation: (rule) => rule.required() }),
		defineField({
			name: 'imagePosition',
			type: 'string',
			initialValue: 'right',
			options: { list: ['left', 'right'], layout: 'radio', direction: 'horizontal' }
		}),
		defineField({ name: 'cta', title: 'Button (optional)', type: 'cta' })
	]),
	section('featureGridSection', 'Features / values grid', ThLargeIcon, [
		eyebrow,
		heading(),
		intro,
		defineField({
			name: 'style',
			type: 'string',
			initialValue: 'cards',
			options: {
				list: [
					{ title: 'Cards', value: 'cards' },
					{ title: 'List', value: 'list' },
					{ title: 'Dark specification sheet', value: 'spec' }
				],
				layout: 'radio'
			}
		}),
		defineField({
			name: 'features',
			type: 'array',
			of: [defineArrayMember({ type: 'feature' })],
			validation: (rule) => rule.min(1)
		})
	]),
	section('statsSection', 'Statistics', BarChartIcon, [
		heading(false),
		defineField({
			name: 'stats',
			type: 'array',
			of: [defineArrayMember({ type: 'stat' })],
			validation: (rule) => rule.min(1).max(6)
		})
	]),
	section('teamSection', 'Team', UsersIcon, [
		eyebrow,
		heading(),
		intro,
		refArray('members', 'teamMember')
	]),
	section('timelineSection', 'Milestones timeline', ClockIcon, [
		eyebrow,
		heading(),
		defineField({
			name: 'items',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'milestone',
					fields: [
						defineField({ name: 'year', type: 'string', validation: (rule) => rule.required() }),
						defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
						defineField({ name: 'description', type: 'text', rows: 2 })
					],
					preview: { select: { title: 'title', subtitle: 'year' } }
				})
			]
		})
	]),
	section('processSection', 'Process steps', OlistIcon, [
		eyebrow,
		heading(),
		intro,
		defineField({ name: 'steps', type: 'array', of: [defineArrayMember({ type: 'processStep' })] })
	]),
	section('specTableSection', 'Specification table', ThListIcon, [
		eyebrow,
		heading(),
		intro,
		defineField({ name: 'groups', type: 'array', of: [defineArrayMember({ type: 'specGroup' })] })
	]),
	section('certificationsSection', 'Certifications & awards', StarIcon, [
		eyebrow,
		heading(),
		defineField({ ...intro, description: 'Only list credentials you can evidence.' }),
		defineField({
			name: 'items',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'certification',
					fields: [
						defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
						defineField({ name: 'issuer', type: 'string' }),
						defineField({ name: 'year', type: 'string' }),
						defineField({
							name: 'status',
							type: 'string',
							initialValue: 'verified',
							description: '"Placeholder" entries are visibly marked as such on the site.',
							options: {
								list: [
									{ title: 'Verified', value: 'verified' },
									{ title: 'In progress', value: 'inProgress' },
									{ title: 'Placeholder — replace', value: 'placeholder' }
								]
							}
						}),
						defineField({ name: 'note', type: 'string' }),
						defineField({ name: 'url', title: 'Verification link', type: 'url' }),
						defineField({ name: 'logo', type: 'imageWithAlt' })
					],
					preview: { select: { title: 'name', subtitle: 'status', media: 'logo' } }
				})
			]
		})
	]),
	section('locationsSection', 'Locations', PinIcon, [
		eyebrow,
		heading(),
		defineField({
			name: 'items',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'location',
					fields: [
						defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
						defineField({ name: 'address', type: 'text', rows: 2 }),
						defineField({ name: 'phone', type: 'string' }),
						defineField({ name: 'hours', type: 'string' })
					],
					preview: { select: { title: 'name', subtitle: 'address' } }
				})
			]
		})
	]),
	section('faqSection', 'FAQs', HelpCircleIcon, [eyebrow, heading(), refArray('faqs', 'faq')]),
	section('testimonialsSection', 'Testimonials', CommentIcon, [
		eyebrow,
		heading(),
		refArray('testimonials', 'testimonial')
	]),
	section('projectsSection', 'Projects / case studies', ProjectsIcon, [
		eyebrow,
		heading(),
		refArray('projects', 'project')
	]),
	section(
		'guideListSection',
		"Buyer's guide list",
		BookIcon,
		[heading(false)],
		"Lists every Buyer's guide article"
	),
	section('formSection', 'Enquiry form', EnvelopeIcon, [
		eyebrow,
		heading(),
		intro,
		defineField({
			name: 'formType',
			type: 'string',
			initialValue: 'consultation',
			options: {
				list: [
					{ title: 'Consultation / site visit', value: 'consultation' },
					{ title: 'Landowner / joint venture', value: 'landowner' }
				],
				layout: 'radio'
			},
			validation: (rule) => rule.required()
		}),
		defineField({
			name: 'anchor',
			title: 'Anchor ID',
			type: 'string',
			description:
				'Lets buttons link straight to this form, e.g. "consultation" → /contact#consultation',
			validation: (rule) => rule.regex(/^[a-z0-9-]+$/)
		})
	]),
	section(
		'contactDetailsSection',
		'Contact details & map',
		EarthGlobeIcon,
		[heading(false), defineField({ name: 'showMap', type: 'boolean', initialValue: true })],
		'Pulls address, hours and contacts from Site settings'
	),
	section('quoteSection', 'Quote', BlockquoteIcon, [
		defineField({ name: 'quote', type: 'text', rows: 3, validation: (rule) => rule.required() }),
		defineField({ name: 'attribution', type: 'string' })
	]),
	section('ctaSection', 'Call to action banner', LaunchIcon, [
		eyebrow,
		heading(),
		defineField({ name: 'text', type: 'text', rows: 2 }),
		defineField({ name: 'primaryCta', type: 'cta' }),
		defineField({ name: 'secondaryCta', type: 'cta' })
	])
];

export const SECTION_TYPES = sections.map((s) => s.name);
export { hrefField };
