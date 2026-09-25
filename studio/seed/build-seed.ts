/**
 * Builds studio/seed/seed.ndjson from the shared demo dataset
 * (src/lib/server/demo/seed) — the exact content the site shows in demo mode.
 *
 *   node seed/build-seed.ts            # write seed.ndjson
 *   npm run seed                       # build + `sanity dataset import … --replace`
 *
 * Demo image/file references are converted to `_sanityAsset` directives so the
 * import uploads the placeholder files from /static/demo into your dataset.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seedDocuments } from '../../src/lib/server/demo/seed/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const demoDir = resolve(here, '../../static/demo');

function convert(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(convert);
	if (!value || typeof value !== 'object') return value;
	const obj = value as Record<string, unknown>;
	const asset = obj.asset as { _ref?: string } | undefined;
	if (asset?._ref) {
		const img = asset._ref.match(/^image-demo([A-Za-z0-9_]+)-\d+x\d+-(\w+)$/);
		const file = asset._ref.match(/^file-demo([A-Za-z0-9_]+)-(\w+)$/);
		if (img || file) {
			const [, name, ext] = (img ?? file)!;
			const { asset: _drop, ...rest } = obj;
			void _drop;
			return {
				...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, convert(v)])),
				_sanityAsset: `${img ? 'image' : 'file'}@${pathToFileURL(resolve(demoDir, `${name}.${ext}`)).href}`
			};
		}
	}
	return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, convert(v)]));
}

const out = resolve(here, 'seed.ndjson');
writeFileSync(out, seedDocuments.map((d) => JSON.stringify(convert(d))).join('\n') + '\n');
console.log(`✓ Wrote ${seedDocuments.length} documents to ${out}`);
