// Curated reference library: versioned ReferenceDS snapshots built from each
// library's published artifacts (not trained models, not hand-typed lists).
// `scripts/build.ts` rebuilds them; this module only reads the pinned files.
import {readdir, readFile} from 'node:fs/promises';
import {ReferenceDS} from '@gapscan/schema';
import type {ReferenceDS as ReferenceDSType} from '@gapscan/schema';

export type ReferenceSource = {id: string; library: string; version: string; homepage: string; framework: string; artifacts: {url: string; name: string; classPrefix?: string}[]};

export const REFERENCE_SOURCES: readonly ReferenceSource[] = [
  {id: 'bootstrap-5.3.3', library: 'Bootstrap', version: '5.3.3', homepage: 'https://getbootstrap.com/docs/5.3/', framework: 'HTML/CSS',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.css', name: 'bootstrap.css'}]},
  {id: 'polaris-13.9.5', library: 'Shopify Polaris', version: '13.9.5', homepage: 'https://polaris.shopify.com/', framework: 'React',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/@shopify/polaris@13.9.5/build/esm/styles.css', name: 'polaris.css', classPrefix: 'Polaris-'},
      {url: 'https://cdn.jsdelivr.net/npm/@shopify/polaris-tokens@9.4.2/dist/css/styles.css', name: 'polaris-tokens.css'}]},
  {id: 'carbon-styles-1.68.0', library: 'IBM Carbon', version: '@carbon/styles 1.68.0', homepage: 'https://carbondesignsystem.com/', framework: 'React / Web Components',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/@carbon/styles@1.68.0/css/styles.css', name: 'carbon.css', classPrefix: 'cds--'}]},
  {id: 'bulma-1.0.2', library: 'Bulma', version: '1.0.2', homepage: 'https://bulma.io/', framework: 'HTML/CSS',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.css', name: 'bulma.css'}]},
];

const ROOT = new URL('../references/', import.meta.url);
export type ReferenceSummary = {id: string; library: string; version: string; homepage: string; framework: string; components: number; tokens: number; pinnedAt: string};

export async function listReferences(): Promise<ReferenceSummary[]> {
  const files = (await readdir(ROOT).catch(() => [] as string[])).filter(f => f.endsWith('.json')).sort();
  return Promise.all(files.map(async file => {
    const data = JSON.parse(await readFile(new URL(file, ROOT), 'utf8')) as ReferenceDSType & {meta?: {homepage?: string; framework?: string}};
    return {id: data.id, library: data.library, version: data.libraryVersion, homepage: data.meta?.homepage ?? '', framework: data.meta?.framework ?? '', components: data.components.length, tokens: data.tokens.length, pinnedAt: data.pinnedAt};
  }));
}

export async function loadReference(id: string): Promise<ReferenceDSType | null> {
  if (!/^[a-z0-9.@-]+$/i.test(id)) return null;
  try { return ReferenceDS.parse(JSON.parse(await readFile(new URL(`${id}.json`, ROOT), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
