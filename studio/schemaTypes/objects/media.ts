import { ImageIcon } from '../../icons';
import { defineField, defineType } from 'sanity';

/** Image with required, meaningful alt text and hotspot/crop support. */
export const imageWithAlt = defineType({
	name: 'imageWithAlt',
	title: 'Image',
	type: 'image',
	icon: ImageIcon,
	options: { hotspot: true },
	fields: [
		defineField({
			name: 'alt',
			title: 'Alternative text',
			type: 'string',
			description:
				'Describe what the image shows for people using screen readers, e.g. "Two residential towers around a landscaped courtyard". Avoid "image of…".',
			validation: (rule) =>
				rule.custom((alt, ctx) => {
					const parent = ctx.parent as { asset?: unknown } | undefined;
					if (!parent?.asset) return true;
					if (!alt || !alt.trim()) return 'Alt text is required for accessibility';
					if (alt.trim().length < 8) return 'Please write a more descriptive alt text';
					if (/^(image|photo|picture)\b/i.test(alt.trim()))
						return 'No need to start with "image of" — describe the content';
					return true;
				})
		}),
		defineField({
			name: 'caption',
			title: 'Caption',
			type: 'string',
			description: 'Optional visible caption.'
		}),
		defineField({ name: 'credit', title: 'Photo credit', type: 'string' })
	],
	preview: { select: { media: 'asset', title: 'alt', subtitle: 'caption' } }
});
