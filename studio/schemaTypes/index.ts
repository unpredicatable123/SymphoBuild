import {
	blogCategory,
	blogPost,
	buyerGuide,
	faq,
	galleryItem,
	page,
	redirect,
	service,
	teamMember,
	testimonial
} from './documents/content';
import { lead } from './documents/lead';
import { project, projectUpdate } from './documents/project';
import { footer, homePage, navigation, siteSettings } from './documents/singletons';
import { imageWithAlt } from './objects/media';
import { sections } from './objects/sections';
import {
	callout,
	cta,
	feature,
	pageHero,
	portableText,
	processStep,
	seo,
	simplePortableText,
	specGroup,
	stat
} from './objects/shared';

export const schemaTypes = [
	// singletons
	siteSettings,
	homePage,
	navigation,
	footer,
	// documents
	project,
	projectUpdate,
	service,
	page,
	blogPost,
	blogCategory,
	buyerGuide,
	galleryItem,
	teamMember,
	testimonial,
	faq,
	lead,
	redirect,
	// objects
	imageWithAlt,
	seo,
	cta,
	stat,
	feature,
	processStep,
	specGroup,
	callout,
	portableText,
	simplePortableText,
	pageHero,
	...sections
];
