// Lessons from real sites (blush.design, vercel.com, linear.app), kept as regressions for every site.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDesignSystem, renderDesignSystemHtml} from '@gapscan/exports';
import {describeVariants} from '@gapscan/adapters';
import {detectSpacing, elevationScale} from '@gapscan/normalize';
import {textStylesFrom} from '@gapscan/extraction';
import type {ExtractedDesignSystem} from '@gapscan/schema';

const token = (path: string, value: string) => ({id: path, tier: 'global' as const, path, type: 'color' as const, value, status: 'resolved' as const, evidence: [], confidence: 0.9, usageCount: 1});
const eds = (tokens: ReturnType<typeof token>[], components: ExtractedDesignSystem['components'] = []) =>
  ({id: 'e', projectId: 'p', version: 1, fingerprint: 'f', createdAt: '', sources: [{uri: 'https://example.com/'}], evidence: [], tokens, components, specimens: [], quirks: []} as unknown as ExtractedDesignSystem);

test('declared colour variables become named ramps and sets; internals, hashes and duplicates are left out', () => {
  const doc = buildDesignSystem(eds([
    token('--color-ink-900', '#283237'), token('--color-ink-100', '#e6eaec'), token('--color-ink-050', 'var(--color-ink-100)'),
    token('--ds-blue-100', '#f0f7ff'), token('--ds-blue-700', '#0070f3'),
    token('--color-bg-primary', '#08090a'), token('--color-bg-secondary', '#1c1c1f'),
    token('--brand-main', '#283237'), token('--brand-dark', '#e6eaec'),          // every colour already in Ink: an alias
    token('--tw-ring-color', '#3b82f6'), token('--sx-1mc3c6y', '#1e2022'), token('--card-width', '320px'),
  ]), {}, 'Example');
  assert.deepEqual(doc.colors.groups.map(g => [g.name, g.swatches.map(s => s.name)]), [['Ink', ['050', '100', '900']], ['DS Blue', ['100', '700']], ['BG', ['Primary', 'Secondary']]]);
  assert.equal(doc.colors.groups[0]!.swatches[0]!.hex, '#e6eaec', 'var() chains resolve');
});

test('spacing ignores layout widths and one-off fractions; invisible shadow layers are dropped', () => {
  const spacing = detectSpacing([...['8px', '16px', '24px', '12px', '4px'].map(value => ({value, count: 40})), {value: '434.67px', count: 30}, {value: '8.56px', count: 1}, {value: '16.59px', count: 2}, {value: '5px', count: 9}]);
  assert.ok(!spacing.steps.some(n => n > 128 || !Number.isInteger(n)), spacing.steps.join(','));
  assert.deepEqual(elevationScale(['rgba(0, 0, 0, 0) 0px 0px 0px 0px', 'rgb(0, 87, 255) 0px 0px 0px 0px', 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.12) 0px 2px 4px 0px']).map(s => s.value),
    ['rgba(0, 0, 0, 0.12) 0px 2px 4px 0px']);
});

test('component variants are named by appearance and size from computed styles', () => {
  const style = (background: string, border = 'none', height = '40px') => ({background, color: 'rgb(0, 0, 0)', border, radius: '8px', fontSize: '14px', fontWeight: '600', fontFamily: 'X', paddingY: '8px', paddingX: '16px', height, width: '100px', shadow: 'none'});
  const {variants} = describeVariants('Button', [
    {count: 9, style: style('rgb(0, 94, 255)'), html: '', text: 'Try'}, {count: 30, style: style('rgb(255, 255, 255)'), html: '', text: ''},
    {count: 4, style: style('transparent', '1px rgb(0, 0, 0)'), html: '', text: ''}, {count: 5, style: style('transparent'), html: '', text: ''},
    {count: 3, style: style('rgb(205, 27, 78)', 'none', '32px'), html: '', text: ''},
  ]);
  assert.deepEqual(variants, ['secondary', 'primary', 'ghost', 'outline', 'danger', 'size=sm', 'size=md']);
});

test('text styles cluster by size and weight with their usual line height; one-offs drop out', () => {
  const styles = textStylesFrom([{size: '14px', weight: '400', lineHeight: '21px', family: 'Gordita, sans-serif', count: 300}, {size: '14.08px', weight: '400', lineHeight: '21px', count: 1},
    {size: '32px', weight: '700', lineHeight: '35px', family: 'Gordita', count: 8}, {size: '9px', weight: '400', count: 1}]);
  assert.deepEqual(styles.map(s => [s.px, s.weight, s.lineHeightPx, s.family]), [[32, 700, 35, 'Gordita'], [14, 400, 21, 'Gordita']]);
});

test('the page escapes what it read and draws only validated colours and lengths', () => {
  const evil = '"><script>alert(1)</script>';
  const doc = buildDesignSystem(eds([token('--color-x-100', '#111111'), token('--color-x-200', 'red;background:url(https://evil)')],
    [{id: 'c', canonical: evil, rawNames: ['x'], category: 'Actions', tier: 'primary', sizes: [], statesObserved: [], statesMissing: [], a11y: {focusVisible: null}, instances: 1, evidence: [], confidence: 1,
      variants: [{name: 'primary', tokenRefs: {background: 'rgb(0, 94, 255)', color: 'url(javascript:x)', radius: '8px;position:fixed', label: evil}}]}]), {}, evil);
  const html = renderDesignSystemHtml(doc);
  assert.doesNotMatch(html, /<script>|url\(|position:fixed|javascript:/);
  assert.match(html, /background:#005eff/);
});
