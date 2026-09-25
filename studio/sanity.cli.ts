import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
	api: {
		projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'your-project-id',
		dataset: process.env.SANITY_STUDIO_DATASET || 'production'
	},
	studioHost: process.env.SANITY_STUDIO_HOSTNAME,
	// The Studio imports the shared icon vocabulary from ../src/lib/icon-names.ts
	vite: (config) => ({
		...config,
		server: { ...config.server, fs: { ...config.server?.fs, allow: ['..'] } }
	})
});
