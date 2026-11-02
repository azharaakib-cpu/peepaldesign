// Rebuilds the pinned reference snapshots: fetch each library's published CSS,
// record its checksum, run the same extraction pipeline as user sources, and keep
// only implementation components (utilities and miscellany are dropped).
//   node packages/library/scripts/build.ts [reference-id …]
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createCodeAdapter, inferredSpecimen} from '@gapscan/adapters';
import {assembleSystem, systemFingerprint} from '@gapscan/extraction';
import {parseColor, toHex} from '@gapscan/normalize';
import {ReferenceDS} from '@gapscan/schema';
import type {SourceAsset} from '@gapscan/schema';
import {classifyItem} from '@gapscan/taxonomy';
import {REFERENCE_SOURCES} from '../src/index.ts';

const ALIAS_TITLES: Record<string, string> = {btn: 'Button', 'btn group': 'Button group', textfield: 'Text field', 'text input': 'Text field', input: 'Text field', img: 'Image', sidenav: 'Side nav', modal: 'Modal', snackbar: 'Toast'};
const title = (text: string) => text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/, c => c.toUpperCase()).trim();
const wanted = new Set(process.argv.slice(2));

for (const ref of REFERENCE_SOURCES.filter(r => !wanted.size || wanted.has(r.id))) {
  const signal = new AbortController().signal, sources: SourceAsset[] = [], results = [], texts: {source: string; prefix: string}[] = [];
  for (const artifact of ref.artifacts) {
    const response = await fetch(artifact.url);
    if (!response.ok) throw new Error(`${artifact.url} returned ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const asset: SourceAsset = {id: `${ref.id}:${artifact.name}`, projectId: 'library', kind: 'code', uri: artifact.url, label: artifact.name,
      sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, budget: {maxPages: 1, maxBytes: bytes.length}, createdAt: new Date().toISOString()};
    sources.push(asset);
    texts.push({source: new TextDecoder().decode(bytes), prefix: artifact.classPrefix ?? ''});
    results.push({asset, result: await createCodeAdapter({...(artifact.classPrefix ? {classPrefix: artifact.classPrefix} : {})})({assetId: asset.id, name: artifact.name, uri: artifact.url, bytes}, {signal})});
  }
  const system = assembleSystem(results);
  // Reference components are named by their taxonomy type so "btn" and "Polaris-Button" both read "Button".
  const components = system.components
    // Only the class that *is* the type takes the type's name; `btn-set` reads "Button set", not a second "Button".
    .map(c => { const item = classifyItem({name: c.canonical, kind: 'component'}), isType = c.canonical.toLowerCase().replace(/[-_ ]/g, '') === item.matchedBy.replace(/ /g, '');
      return {...c, category: item.category, tier: item.tier, canonical: isType ? ALIAS_TITLES[item.matchedBy] ?? title(c.canonical) : title(c.canonical).replace(/\bbtn\b/gi, 'button').replace(/^\w/, ch => ch.toUpperCase())}; })
    .filter(c => !['Miscellaneous', 'Utilities and tooling'].includes(c.category));
  // Reference specimens: the library's own rules for each component on generated markup, plus the
  // custom properties those rules use, so the preview renders without the rest of the stylesheet.
  const declared = new Map(system.tokens.filter(t => t.path.startsWith('--')).map(t => [t.path, String(t.value)]));
  const withVariables = (css: string) => {
    const needed = new Set<string>(), queue = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]!);
    while (queue.length && needed.size < 400) { const name = queue.shift()!; if (needed.has(name) || !declared.has(name)) continue; needed.add(name); queue.push(...[...declared.get(name)!.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]!)); }
    return (needed.size ? `:root{${[...needed].map(n => `${n}:${declared.get(n)}`).join(';')}}\n` : '') + css;
  };
  const specimens = components.flatMap(c => {
    for (const {source, prefix} of texts) { const specimen = inferredSpecimen(source, c.rawNames[0]!, prefix); if (specimen) return [{id: `sp:${c.id}`, html: specimen.html, css: withVariables(specimen.css).slice(0, 20000), origin: 'inferred_probe' as const}]; }
    return [];
  });
  // A library declares its roles by name (Polaris --p-color-bg-fill-brand, Carbon --cds-interactive…);
  // those beat usage inference for the reference's role tokens.
  // Substitutes var() references (Bulma builds colours as hsla(var(--h), var(--s), var(--l), 1)) and keeps the result only if it is a concrete colour.
  const resolveColor = (value: string): string | null => {
    let text = value;
    for (let depth = 0; depth < 8 && text.includes('var('); depth++) text = text.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (_, name: string, fallback?: string) => declared.get(name) ?? fallback?.trim() ?? 'none');
    const color = parseColor(text.trim());
    return color && color.alpha > 0 && !text.includes('var(') ? toHex(color) : null;
  };
  // Most specific names first: the brand fill beats any token that merely ends in -critical.
  const ROLE_NAMES: [string, RegExp[]][] = [
    ['primary', [/bg-fill-brand$/, /^--bs-primary$/, /^--cds-interactive$/, /-interactive$/, /brand-primary$/, /color-primary$/, /-primary$/]],
    ['danger', [/bg-fill-critical$/, /^--bs-danger$/, /^--cds-support-error$/, /-support-error$/, /-danger$/]],
    ['success', [/bg-fill-success$/, /^--bs-success$/, /^--cds-support-success$/, /-support-success$/, /-success$/]],
    ['warning', [/bg-fill-warning$/, /^--bs-warning$/, /^--cds-support-warning$/, /-support-warning$/, /-warning$/]],
  ];
  for (const [role, patterns] of ROLE_NAMES) {
    const named = patterns.map(pattern => [...declared].find(([path, value]) => pattern.test(path) && resolveColor(value))).find(Boolean);
    const token = system.tokens.find(t => t.path === `color.${role}`);
    if (named && token) Object.assign(token, {value: resolveColor(named[1])!, confidence: 0.9, evidence: system.tokens.find(t => t.path === named[0])?.evidence ?? token.evidence});
    else if (named) system.tokens.push({id: `tok:role:${role}`, tier: 'semantic', path: `color.${role}`, type: 'color', value: resolveColor(named[1])!, status: 'resolved', evidence: system.tokens.find(t => t.path === named[0])?.evidence ?? [], confidence: 0.9, usageCount: 0});
  }
  const keep = new Set([...components.flatMap(c => c.evidence), ...system.tokens.flatMap(t => t.evidence.slice(0, 3))]);
  const evidence = system.evidence.filter(e => keep.has(e.id)).map(e => ({...e, raw: e.raw.slice(0, 160)}));
  const tokens = system.tokens.map(t => ({...t, evidence: t.evidence.filter(id => keep.has(id))}));
  const pinnedAt = new Date().toISOString();
  const reference = ReferenceDS.parse({
    id: ref.id, projectId: 'library', version: 1, fingerprint: systemFingerprint({tokens, components}), createdAt: pinnedAt, sources, evidence, tokens,
    components: components.map(c => ({...c, evidence: c.evidence.filter(id => keep.has(id))})), specimens, quirks: [], coverage: system.coverage,
    brandSignals: {voiceSnippets: [], logoAssets: []}, library: ref.library, libraryVersion: ref.version, pinnedAt,
  });
  await writeFile(new URL(`../references/${ref.id}.json`, import.meta.url), JSON.stringify({...reference, meta: {homepage: ref.homepage, framework: ref.framework}}) + '\n');
  console.log(`${ref.id}: ${reference.components.length} components, ${reference.tokens.length} tokens, ${reference.evidence.length} evidence records`);
}
