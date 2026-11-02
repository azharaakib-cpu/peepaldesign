// "Export to Figma": a design-system document turned into an explicit build plan that the
// GapScan Importer plugin applies inside a Figma file the person chooses. All decisions
// (names, scopes, aliases, which colour a component uses) are made here, where they are
// tested; the plugin only executes the plan. Nothing is written to Figma by GapScan itself.
import {parseColor} from '@gapscan/normalize';
import type {DesignSystemDoc} from './design-system.ts';

export const FIGMA_PLAN_FORMAT = 'gapscan-figma/1';
type Rgba = {r: number; g: number; b: number; a: number};
type Value = Rgba | number | {alias: string};
export type PlanVariable = {name: string; type: 'COLOR' | 'FLOAT'; value: Value; scopes: string[]; web?: string; description?: string};
export type PlanColor = {variable: string} | {hex: Rgba};
export type FigmaPlan = {
  format: typeof FIGMA_PLAN_FORMAT; name: string; source: string; generatedAt: string;
  fonts: {families: string[]; fallbacks: string[]};
  collections: {name: string; mode: string; variables: PlanVariable[]}[];
  textStyles: {name: string; size: number; weight: number; lineHeight: number | null; description: string}[];
  effectStyles: {name: string; shadows: {x: number; y: number; blur: number; spread: number; color: Rgba; inset: boolean}[]; description: string}[];
  components: {name: string; description: string; variants: {name: string; width: number | null; height: number; paddingX: number | {variable: string}; radius: number | {variable: string};
    fill: PlanColor | null; stroke: PlanColor | null; strokeWeight: number; text: PlanColor; textStyle: string; label: string}[]}[];
  notes: string[];
};

// parseColor channels are already 0–1, the same range Figma uses.
const rgba = (hex: string): Rgba => { const c = parseColor(hex)!; return {r: c.r, g: c.g, b: c.b, a: c.alpha}; };
const hexOf = (c: Rgba) => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

export function buildFigmaPlan(doc: DesignSystemDoc): FigmaPlan {
  const notes = [...doc.notes];
  // Primitives: every colour group as group/step, keeping the site's CSS name as code syntax.
  const primitives: PlanVariable[] = [], byHex = new Map<string, string>();
  for (const group of doc.colors.groups) for (const s of group.swatches) {
    let name = `${slug(group.name)}/${slug(s.name)}`;
    while (primitives.some(p => p.name === name)) name += '-2';
    primitives.push({name, type: 'COLOR', value: rgba(s.hex), scopes: [], ...(s.variable ? {web: `var(${s.variable})`, description: `Declared as ${s.variable}.`} : {description: 'Observed on the rendered pages.'})});
    if (!byHex.has(s.hex.slice(0, 7))) byHex.set(s.hex.slice(0, 7), name);
  }
  // Semantic colours: inferred roles, aliased to the primitive with the same value; a role with no
  // matching primitive gets one of its own so the semantic layer never holds raw values.
  const ROLE: Record<string, [string, string[]]> = {primary: ['color/bg/action', ['FRAME_FILL', 'SHAPE_FILL']], surface: ['color/bg/surface', ['FRAME_FILL', 'SHAPE_FILL']],
    text: ['color/text/primary', ['TEXT_FILL']], border: ['color/border/default', ['STROKE_COLOR']], danger: ['color/status/danger', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR']],
    warning: ['color/status/warning', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR']], success: ['color/status/success', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR']],
    info: ['color/status/info', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR']]};
  const primitiveFor = (hex: string) => {
    const key = hex.slice(0, 7);
    if (!byHex.has(key)) { const name = `observed/${key.slice(1)}`; primitives.push({name, type: 'COLOR', value: rgba(hex), scopes: [], description: 'Used by a role or component; not declared as a variable on the site.'}); byHex.set(key, name); }
    return byHex.get(key)!;
  };
  const semantic: PlanVariable[] = doc.colors.roles.filter(r => ROLE[r.role]).map(r => ({name: ROLE[r.role]![0], type: 'COLOR' as const, value: {alias: primitiveFor(r.hex)}, scopes: ROLE[r.role]![1],
    description: r.reason}));
  const semanticFor = (hex: string, scope: string) => semantic.find(v => primitives.find(p => p.name === (v.value as {alias: string}).alias && hexOf(p.value as Rgba) === hex.slice(0, 7)) && v.scopes.includes(scope))?.name;
  const colorRef = (hex: string, scope: string): PlanColor => ({variable: semanticFor(hex, scope) ?? primitiveFor(hex)});

  const spacing: PlanVariable[] = doc.spacing.steps.map(n => ({name: `space/${n}`, type: 'FLOAT', value: n, scopes: ['GAP', 'WIDTH_HEIGHT']}));
  const radii: PlanVariable[] = doc.radius.map(r => ({name: `radius/${r.px >= 999 ? 'full' : r.px}`, type: 'FLOAT', value: r.px >= 999 ? 9999 : r.px, scopes: ['CORNER_RADIUS']}));
  const radiusRef = (px: number) => { const match = radii.find(r => (r.value as number) === (px >= 999 ? 9999 : px)); return match ? {variable: match.name} : px; };
  const spaceRef = (px: number) => { const match = spacing.find(s => s.value === px); return match ? {variable: match.name} : px; };

  const textStyles = doc.typography.styles.map(t => ({name: t.name.replace(' / ', '/'), size: t.px, weight: t.weight, lineHeight: t.lineHeightPx,
    description: `${t.family} ${t.px}/${t.lineHeightPx ?? 'auto'} weight ${t.weight}; ${t.uses} uses on the pages read.`}));
  const styleFor = (size: number, weight: number) => [...textStyles].sort((a, b) => Math.abs(a.size - size) - Math.abs(b.size - size) || Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0]?.name ?? '';

  const effectStyles = doc.shadows.map(s => ({name: s.name.replace(' ', '/'), description: s.value, shadows: s.value.split(/,(?![^(]*\))/).flatMap(layer => {
    const color = layer.match(/(rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/i)?.[0], lengths = layer.replace(/(rgba?|hsla?)\([^)]*\)|#[0-9a-f]+|inset/gi, ' ').trim().split(/\s+/).map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
    const c = color ? parseColor(color) : null;
    return c ? [{x: lengths[0] ?? 0, y: lengths[1] ?? 0, blur: lengths[2] ?? 0, spread: lengths[3] ?? 0, color: {r: c.r, g: c.g, b: c.b, a: c.alpha}, inset: /inset/.test(layer)}] : [];
  })})).filter(e => e.shadows.length);

  // Components: one component set per component, a variant per appearance. Very tall instances
  // (tiles measured as buttons) are drawn at a usable height and say so in the description.
  const components = doc.components.map(c => {
    const tall = c.variants.some(v => v.style.height > 64);
    return {name: c.name, description: [`Measured on ${doc.source}.`, tall ? 'Some instances were taller than 64px (tiles or panels); they are drawn at 64px.' : '',
      c.states.length ? `The site styles these states, not captured here: ${c.states.join(', ')}.` : ''].filter(Boolean).join(' '),
      variants: c.variants.map(v => ({name: `Style=${v.name}`, width: /field|input|search/i.test(c.name) ? 280 : null, height: Math.max(24, Math.min(v.style.height || 40, 64)),
        paddingX: spaceRef(Math.max(v.style.paddingX, 12)), radius: radiusRef(v.style.radius), fill: v.style.background ? colorRef(v.style.background, 'FRAME_FILL') : null,
        stroke: v.style.border && v.style.borderWidth ? colorRef(v.style.border, 'STROKE_COLOR') : null, strokeWeight: v.style.borderWidth,
        text: colorRef(v.style.color ?? doc.colors.roles.find(r => r.role === 'text')?.hex ?? '#000000', 'TEXT_FILL'), textStyle: styleFor(v.style.fontSize || 14, v.style.fontWeight),
        label: (v.style.label.split('\n')[0] || c.name).slice(0, 32)}))};
  });
  if (doc.typography.families.length) notes.push(`Text styles use ${doc.typography.families[0]} when it is installed for Figma; otherwise the importer falls back to a similar sans and notes it on each style.`);
  return {format: FIGMA_PLAN_FORMAT, name: doc.name, source: doc.source, generatedAt: doc.generatedAt,
    fonts: {families: doc.typography.families, fallbacks: ['DM Sans', 'Inter']},
    collections: [{name: 'Primitives', mode: 'Value', variables: primitives}, ...(semantic.length ? [{name: 'Color', mode: 'Light', variables: semantic}] : []),
      ...(spacing.length ? [{name: 'Spacing', mode: 'Value', variables: spacing}] : []), ...(radii.length ? [{name: 'Radius', mode: 'Value', variables: radii}] : [])],
    textStyles, effectStyles, components, notes};
}
