import { createClient, type SanityClient } from '@sanity/client';
import { error } from '@sveltejs/kit';
import { getEnv, isDemoMode } from './env';

let readClient: SanityClient | undefined;
let writeClient: SanityClient | undefined;

function baseConfig() {
	const env = getEnv();
	return {
		projectId: env.PUBLIC_SANITY_PROJECT_ID!,
		dataset: env.PUBLIC_SANITY_DATASET,
		apiVersion: env.PUBLIC_SANITY_API_VERSION
	};
}

export function getReadClient(): SanityClient {
	if (!readClient) {
		const token = getEnv().SANITY_API_READ_TOKEN;
		readClient = createClient({
			...baseConfig(),
			useCdn: !token,
			token,
			perspective: 'published'
		});
	}
	return readClient;
}

/** Server-only client with write access, used exclusively for creating leads. */
export function getWriteClient(): SanityClient | null {
	const token = getEnv().SANITY_API_WRITE_TOKEN;
	if (isDemoMode() || !token) return null;
	if (!writeClient) writeClient = createClient({ ...baseConfig(), useCdn: false, token });
	return writeClient;
}

/**
 * Run a GROQ query. With a Sanity project configured this hits the Content Lake;
 * in demo mode the identical query runs locally against the seed dataset via groq-js.
 */
export async function sanityFetch<T>(
	query: string,
	params: Record<string, unknown> = {}
): Promise<T> {
	try {
		if (isDemoMode()) {
			const { demoFetch } = await import('./demo/store');
			return await demoFetch<T>(query, params);
		}
		return await getReadClient().fetch<T>(query, params);
	} catch (err) {
		console.error('[sanity] query failed', err);
		error(503, 'Content is temporarily unavailable. Please try again shortly.');
	}
}
