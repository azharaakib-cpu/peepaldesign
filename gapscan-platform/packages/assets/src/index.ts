// Asset engine (architecture Part 3 §3.2): BrandKit → template → renderer → checks.
// Templates read token slots, never raw values; every output carries the checks
// it passed or failed so nothing ships with unreadable text by accident.
import {contrastRatio, parseColor, toHex, toOklch} from '@gapscan/normalize';
import type {ExtractedDesignSystem} from '@gapscan/schema';
import {buildDeck, officeFont} from './deck.ts';
export {buildDeck} from './deck.ts';
export type {DeckContent} from './deck.ts';

export type BrandKit = {
  edsId: string; name: string;
  colors: {primary: string; onPrimary: string; text: string; surface: string; accent: string};
  fonts: {heading: string; body: string};
  radius: string;
  inferred: string[];               // slots filled by fallback rather than from the extraction
};

const FALLBACK = {primary: '#1F2937', text: '#111111', surface: '#FFFFFF', font: 'system-ui'};
const hexOf = (value: unknown) => { const c = parseColor(String(value ?? '')); return c ? toHex({...c, alpha: 1}) : null; };
// Black or white, whichever reads better on the colour.
export const onColor = (background: string) => (contrastRatio('#FFFFFF', background) ?? 0) >= (contrastRatio('#111111', background) ?? 0) ? '#FFFFFF' : '#111111';

export function buildBrandKit(eds: ExtractedDesignSystem, name = 'Your brand'): BrandKit {
  const inferred: string[] = [];
  const pick = (paths: string[], fallback: string, slot: string) => {
    for (const path of paths) { const hex = hexOf(eds.tokens.find(t => t.path === path)?.value); if (hex) return hex; }
    inferred.push(slot); return fallback;
  };
  const primary = pick(['color.primary'], FALLBACK.primary, 'primary colour');
  const text = pick(['color.text'], FALLBACK.text, 'text colour');
  const surface = pick(['color.surface'], FALLBACK.surface, 'surface colour');
  const accent = pick(['color.success', 'color.info', 'color.warning'], primary, 'accent colour');
  const font = (paths: string[], slot: string) => { const value = eds.tokens.find(t => paths.includes(t.path))?.value; if (value) return String(value); inferred.push(slot); return FALLBACK.font; };
  const body = font(['font.family.body'], 'body font'), heading = eds.tokens.find(t => t.path === 'font.family.heading')?.value ? String(eds.tokens.find(t => t.path === 'font.family.heading')!.value) : body;
  const radius = String(eds.tokens.find(t => t.path === 'radius.md' || t.path === 'radius.sm')?.value ?? '6px');
  return {edsId: eds.id, name, colors: {primary, onPrimary: onColor(primary), text, surface, accent}, fonts: {heading, body}, radius, inferred};
}

export type Check = {rule: string; pass: boolean; message: string};
export type Template = {id: string; label: string; format: {width: string; height: string; bleed?: string; dpi?: number; pixels?: {width: number; height: number}}; output: 'pdf' | 'png' | 'pptx' | 'html'; fields: string[]};
export const TEMPLATES: Record<string, Template> = {
  'business-card': {id: 'business-card', label: 'Business card (85 × 55 mm, 3 mm bleed)', format: {width: '85mm', height: '55mm', bleed: '3mm', dpi: 300}, output: 'pdf', fields: ['name', 'role', 'email', 'phone', 'website']},
  'og-image': {id: 'og-image', label: 'OpenGraph image (1200 × 630)', format: {width: '1200px', height: '630px', pixels: {width: 1200, height: 630}}, output: 'png', fields: ['title', 'subtitle']},
  'slide-deck': {id: 'slide-deck', label: 'Slide deck template (PowerPoint, 16:9)', format: {width: '13.333in', height: '7.5in'}, output: 'pptx', fields: ['title', 'subtitle', 'points']},
  'email': {id: 'email', label: 'Email newsletter (600 px, HTML)', format: {width: '600px', height: 'auto'}, output: 'html', fields: ['title', 'body', 'cta', 'url']},
  'social-banner': {id: 'social-banner', label: 'LinkedIn banner (1584 × 396)', format: {width: '1584px', height: '396px', pixels: {width: 1584, height: 396}}, output: 'png', fields: ['title', 'subtitle']},
};

const escape = (text: string) => text.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);
const fontStack = (family: string) => `${/[\s,]/.test(family) && !family.includes(',') ? JSON.stringify(family) : family}, system-ui, -apple-system, "Segoe UI", sans-serif`;

function check(rule: string, foreground: string, background: string, needed: number, label: string): Check {
  const ratio = contrastRatio(foreground, background) ?? 0;
  return {rule, pass: ratio >= needed, message: `${label}: ${ratio}:1 (needs ${needed}:1)`};
}

export type RenderPlan = {template: Template; html: string; checks: Check[]};
// Produces self-contained HTML (no external requests) for the renderer, plus its checks.
export function planAsset(templateId: string, kit: BrandKit, data: Record<string, string>): RenderPlan {
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown template ${templateId}.`);
  const field = (name: string, fallback = '') => escape((data[name] ?? fallback).slice(0, 160));
  const {colors, fonts} = kit, checks: Check[] = [];
  if (kit.inferred.length) checks.push({rule: 'brand-slots', pass: false, message: `Filled with defaults because they were not found: ${kit.inferred.join(', ')}.`});
  const darkPrimary = toOklch(parseColor(colors.primary)!).l < 0.55;
  if (templateId === 'email') {
    // Email clients ignore most CSS: tables, inline styles and a VML-free bulletproof button.
    const font = `${fontStack(fonts.body).replace(/"/g, "'")}`, heading = `${fontStack(fonts.heading).replace(/"/g, "'")}`;
    const url = /^https:\/\//.test(data.url ?? '') ? field('url') : '#';
    checks.push(check('button-contrast', colors.onPrimary, colors.primary, 4.5, 'Button text'), check('body-contrast', colors.text, colors.surface, 4.5, 'Body text'));
    if (url === '#') checks.push({rule: 'link', pass: false, message: 'Add an https:// link for the button.'});
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${field('title', kit.name)}</title>
<style>@media (prefers-color-scheme: dark) { .bg { background: #111111 !important; } .card { background: #1c1c1c !important; } .text { color: #eeeeee !important; } }</style></head>
<body style="margin:0;padding:0;background:#f4f4f5" class="bg"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5" class="bg"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${colors.surface};border-radius:${kit.radius}" class="card">
<tr><td style="background:${colors.primary};padding:20px 32px;border-radius:${kit.radius} ${kit.radius} 0 0;font-family:${heading};font-size:18px;font-weight:700;color:${colors.onPrimary}">${escape(kit.name)}</td></tr>
<tr><td class="text" style="padding:32px;font-family:${font};color:${colors.text}">
<h1 style="margin:0 0 16px;font-family:${heading};font-size:26px;line-height:1.25">${field('title', 'Newsletter title')}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escape((data.body ?? 'Write your update here.').slice(0, 1200)).replace(/\n/g, '<br>')}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${colors.primary};border-radius:${kit.radius}"><a href="${url}" style="display:inline-block;padding:12px 24px;font-family:${font};font-size:16px;font-weight:600;color:${colors.onPrimary};text-decoration:none">${field('cta', 'Read more')}</a></td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 28px;font-family:${font};font-size:12px;color:#6b7280" class="text">You are receiving this because you subscribed to ${escape(kit.name)} updates.</td></tr>
</table></td></tr></table></body></html>`;
    return {template, html, checks};
  }
  if (templateId === 'slide-deck') {
    // A .pptx names fonts but cannot carry a fallback stack: presenters need them installed or embedded.
    const fonts = [...new Set([kit.fonts.heading, kit.fonts.body].map(officeFont))], substituted = [kit.fonts.heading, kit.fonts.body].some(f => officeFont(f) !== f.split(',')[0]!.replace(/['"]/g, '').trim());
    checks.push(check('title-contrast', colors.onPrimary, colors.primary, 3, 'Title slide text'), check('body-contrast', colors.text, colors.surface, 4.5, 'Body text on slides'),
      {rule: 'fonts', pass: fonts.every(f => /^(arial|helvetica|calibri|segoe ui|georgia|verdana)$/i.test(f)), message: `Theme fonts: ${fonts.join(', ')}.${substituted ? ' Your CSS uses a system font keyword, so Arial stands in.' : ''} Install or embed them on every machine that presents this deck.`});
    return {template, html: '', checks};
  }
  if (templateId === 'business-card') {
    // Trim size plus bleed on every side; content stays inside a 4 mm safe zone.
    checks.push(check('name-contrast', colors.text, colors.surface, 4.5, 'Name on card'), check('band-contrast', colors.onPrimary, colors.primary, 3, 'Brand band text'));
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: 91mm 61mm; margin: 0 }
html, body { margin: 0; width: 91mm; height: 61mm; }
body { background: ${colors.surface}; color: ${colors.text}; font-family: ${fontStack(fonts.body)}; -webkit-print-color-adjust: exact; print-color-adjust: exact; position: relative; overflow: hidden; }
.band { position: absolute; left: 0; top: 0; bottom: 0; width: 17mm; background: ${colors.primary}; }
.mark { position: absolute; left: 7mm; top: 7mm; width: 10mm; height: 10mm; border-radius: ${kit.radius}; background: ${colors.onPrimary}; opacity: .92; }
.safe { position: absolute; left: 24mm; top: 7mm; right: 7mm; bottom: 7mm; display: flex; flex-direction: column; justify-content: space-between; }
h1 { font-family: ${fontStack(fonts.heading)}; font-size: 11pt; margin: 0; letter-spacing: -0.01em; }
.role { font-size: 7.5pt; color: ${colors.primary === colors.surface ? colors.text : colors.primary}; margin-top: 1mm; }
.contact { font-size: 7pt; line-height: 1.5; }
.brand { font-family: ${fontStack(fonts.heading)}; font-weight: 700; font-size: 8pt; }
</style></head><body><div class="band"></div><div class="mark"></div><div class="safe">
<div><h1>${field('name', 'Your Name')}</h1><div class="role">${field('role', 'Role')}</div></div>
<div class="contact">${[field('email'), field('phone'), field('website')].filter(Boolean).join('<br>')}</div>
<div class="brand">${escape(kit.name)}</div></div></body></html>`;
    if (contrastRatio(colors.primary, colors.surface)! < 3) checks.push({rule: 'role-contrast', pass: false, message: 'The role line uses the brand colour, which is low-contrast on the card background.'});
    return {template, html, checks};
  }
  const {width, height} = template.format.pixels!;
  const background = darkPrimary ? colors.primary : colors.surface, foreground = darkPrimary ? colors.onPrimary : colors.text;
  checks.push(check('title-contrast', foreground, background, templateId === 'og-image' ? 3 : 4.5, 'Title on background'));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${width}px; height: ${height}px; }
body { background: ${background}; color: ${foreground}; font-family: ${fontStack(fonts.body)}; display: flex; flex-direction: column; justify-content: center; padding: 0 ${Math.round(width * 0.07)}px; box-sizing: border-box; position: relative; overflow: hidden; }
.accent { position: absolute; right: -${Math.round(height * 0.25)}px; bottom: -${Math.round(height * 0.25)}px; width: ${Math.round(height * 0.9)}px; height: ${Math.round(height * 0.9)}px; border-radius: 50%; background: ${darkPrimary ? colors.accent : colors.primary}; opacity: .18; }
h1 { font-family: ${fontStack(fonts.heading)}; font-size: ${Math.round(height * (templateId === 'og-image' ? 0.1 : 0.16))}px; line-height: 1.1; margin: 0 0 ${Math.round(height * 0.04)}px; max-width: 80%; letter-spacing: -0.02em; }
p { font-size: ${Math.round(height * (templateId === 'og-image' ? 0.045 : 0.07))}px; margin: 0; opacity: .85; max-width: 75%; }
.brand { position: absolute; left: ${Math.round(width * 0.07)}px; bottom: ${Math.round(height * 0.08)}px; font-weight: 700; font-size: ${Math.round(height * 0.04)}px; display: flex; align-items: center; gap: 10px; }
.brand i { width: ${Math.round(height * 0.05)}px; height: ${Math.round(height * 0.05)}px; border-radius: ${kit.radius}; background: ${darkPrimary ? colors.onPrimary : colors.primary}; }
</style></head><body><div class="accent"></div><h1>${field('title', kit.name)}</h1><p>${field('subtitle')}</p><div class="brand"><i></i>${escape(kit.name)}</div></body></html>`;
  return {template, html, checks};
}

export type RenderOutput = {file: string; contentType: string; bytes: Uint8Array};
export type BrowserPage = {
  setContent(html: string, options?: {waitUntil?: 'load'}): Promise<void>;
  pdf(options: {width: string; height: string; printBackground: boolean; pageRanges?: string}): Promise<Uint8Array>;
  screenshot(options: {type: 'png'; fullPage?: boolean}): Promise<Uint8Array>;
  setViewportSize(size: {width: number; height: number}): Promise<void>;
  route?(url: string, handler: (route: {abort(): Promise<void>}) => Promise<void>): Promise<unknown>;
};

// Renders in a page with no network access: templates are self-contained by construction.
// Decks need no browser: the file is built directly from the brand kit.
export function renderDeck(kit: BrandKit, data: Record<string, string>): RenderOutput {
  const points = (data.points ?? '').split(/\n|;/).map(p => p.trim()).filter(Boolean).slice(0, 8);
  return {file: 'slide-deck.pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    bytes: buildDeck(kit, {...(data.title ? {title: data.title.slice(0, 120)} : {}), ...(data.subtitle ? {subtitle: data.subtitle.slice(0, 160)} : {}), ...(points.length ? {points} : {})})};
}

export async function renderAsset(page: BrowserPage, plan: RenderPlan): Promise<RenderOutput> {
  await page.route?.('**/*', route => route.abort());
  if (plan.template.output === 'pdf') {
    await page.setContent(plan.html, {waitUntil: 'load'});
    return {file: `${plan.template.id}.pdf`, contentType: 'application/pdf', bytes: await page.pdf({width: '91mm', height: '61mm', printBackground: true, pageRanges: '1'})};
  }
  const {width, height} = plan.template.format.pixels!;
  await page.setViewportSize({width, height});
  await page.setContent(plan.html, {waitUntil: 'load'});
  return {file: `${plan.template.id}.png`, contentType: 'image/png', bytes: await page.screenshot({type: 'png'})};
}
