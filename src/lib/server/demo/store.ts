import { evaluate, parse } from 'groq-js';
import { seedDocuments } from './seed/index.ts';

/** Executes GROQ against the in-memory seed dataset — used when Sanity isn't configured. */
export async function demoFetch<T>(
	query: string,
	params: Record<string, unknown> = {}
): Promise<T> {
	const tree = parse(query, { params });
	const value = await evaluate(tree, { dataset: seedDocuments, params });
	return (await value.get()) as T;
}
