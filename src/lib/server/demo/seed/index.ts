import { blogCategories, blogPosts, buyerGuides, galleryItems } from './editorial.ts';
import { faqs, team, testimonials } from './people.ts';
import { pages, redirects } from './pages.ts';
import { projects, projectUpdates } from './projects.ts';
import { services } from './services.ts';
import { footer, homePage, navigation, siteSettings } from './settings.ts';
import type { SeedDoc } from './helpers.ts';

export type { SeedDoc } from './helpers.ts';
export { DEMO_IMAGES } from './helpers.ts';

/** Every seed document, in dependency-friendly order. */
export const seedDocuments: SeedDoc[] = [
	siteSettings,
	navigation,
	footer,
	homePage,
	...team,
	...faqs,
	...testimonials,
	...blogCategories,
	...projects,
	...projectUpdates,
	...services,
	...blogPosts,
	...buyerGuides,
	...galleryItems,
	...pages,
	...redirects
];
