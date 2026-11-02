// Rendered-website adapter (architecture Part 1 §1.3) using headless Chromium.
// Reads *computed* styles of visible elements at several viewports and in dark
// mode, CSS custom properties, and repeated interactive structures. Every
// request is checked against the public-URL policy; downloads are blocked.
import type {Adapter, Observation} from './types.ts';
import {AdapterError} from './types.ts';

export type UrlAdapterOptions = {
  maxPages?: number; viewports?: number[]; timeoutMs?: number;
  // Decides which hosts the browser may contact. The API passes its public-URL check.
  allowUrl: (url: URL) => boolean;
};

// Runs inside the page. Kept as a string so the server build needs no DOM types.
const COLLECT = String.raw`(() => {
  const MAX = 4000, out = {colors: {}, fonts: {}, spacing: {}, radius: {}, shadow: {}, vars: {}, components: {}, selectors: [], pairs: {}};
  const bump = (bucket, key, extra) => { const e = bucket[key] || (bucket[key] = {count: 0, ...extra}); e.count++; return e; };
  const label = el => el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '') + (el.getAttribute('role') ? '[role=' + el.getAttribute('role') + ']' : '');
  const visible = (el, cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && el.getClientRects().length > 0;
  const transparent = v => !v || v === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(v);
  // The colour actually behind an element's text: the nearest ancestor with an opaque background.
  // Returns null when an image, gradient or translucent layer sits behind the text: those cannot be
  // measured from computed colours, so they are left for a manual or screenshot-based check.
  // Text whose centre sits over an image, video or canvas (e.g. card overlays) is likewise unmeasurable.
  const media = [...document.querySelectorAll('img, video, canvas, picture, iframe, svg')].filter(m => m.tagName !== 'svg' || m.getBoundingClientRect().width >= 48).map(m => m.getBoundingClientRect()).filter(r => r.width > 8 && r.height > 8);
  const overMedia = el => { const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; return media.some(m => x >= m.left && x <= m.right && y >= m.top && y <= m.bottom); };
  const behind = el => { if (overMedia(el)) return null; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e), bg = s.backgroundColor;
    if (s.backgroundImage && s.backgroundImage !== 'none') return null;
    for (const pseudo of ['::before', '::after']) { const ps = getComputedStyle(e, pseudo);
      if (ps.content !== 'none' && ps.content !== 'normal' && ((ps.backgroundImage && ps.backgroundImage !== 'none') || !transparent(ps.backgroundColor))) return null; }
    if (transparent(bg)) continue;
    if (/rgba\([^)]*,\s*0?\.\d+\)$/.test(bg)) return null;
    return bg; } return 'rgb(255, 255, 255)'; };
  let n = 0;
  for (const el of document.body ? [document.body, ...document.body.querySelectorAll('*')] : []) {
    if (n++ > MAX) break;
    const cs = getComputedStyle(el);
    if (!visible(el, cs) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|path)$/i.test(el.tagName)) continue;
    const sel = label(el), hasText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    if (hasText) {
      bump(out.colors, cs.color + '|color|' + sel, {value: cs.color, property: 'color', selector: sel});
      bump(out.fonts, [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.lineHeight].join('|'), {family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight, selector: sel});
      const bg = behind(el), size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700), box = el.getBoundingClientRect();
      // Screen-reader-only text (1px boxes, clipped) is not visible, so it has no contrast to check.
      const clipped = box.width <= 2 || box.height <= 2 || (cs.clip && cs.clip !== 'auto') || /inset\(50%\)/.test(cs.clipPath);
      if (+cs.opacity === 1 && !clipped && bg) bump(out.pairs, cs.color + '|' + bg + '|' + sel, {foreground: cs.color, background: bg, selector: sel, large});
    }
    if (!transparent(cs.backgroundColor)) bump(out.colors, cs.backgroundColor + '|background-color|' + sel, {value: cs.backgroundColor, property: 'background-color', selector: sel});
    if (parseFloat(cs.borderTopWidth) > 0 && !transparent(cs.borderTopColor)) bump(out.colors, cs.borderTopColor + '|border-color|' + sel, {value: cs.borderTopColor, property: 'border-color', selector: sel});
    for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) { const v = cs[p]; if (v && v !== '0px' && v !== 'normal' && !v.startsWith('-')) bump(out.spacing, v); }
    if (cs.borderTopLeftRadius !== '0px') bump(out.radius, cs.borderTopLeftRadius);
    if (cs.boxShadow !== 'none') bump(out.shadow, cs.boxShadow);
    const role = el.getAttribute('role'), tag = el.tagName.toLowerCase();
    const kind = tag === 'button' || role === 'button' || (tag === 'a' && /btn|button/i.test(el.className)) ? 'Button'
      : tag === 'input' && !/hidden|submit|button|checkbox|radio/.test(el.type) ? 'Text field' : tag === 'textarea' ? 'Text area' : tag === 'select' ? 'Select'
      : tag === 'input' && el.type === 'checkbox' ? 'Checkbox' : tag === 'input' && el.type === 'radio' ? 'Radio'
      : role === 'tab' ? 'Tabs' : tag === 'nav' ? 'Navigation' : tag === 'dialog' || role === 'dialog' ? 'Dialog' : tag === 'table' ? 'Table'
      : /\bcard\b/i.test(el.className) ? 'Card' : /\b(alert|banner)\b/i.test(el.className) || role === 'alert' ? 'Alert' : /\bbadge\b/i.test(el.className) ? 'Badge' : null;
    if (kind) {
      const c = out.components[kind] || (out.components[kind] = {count: 0, classes: [], html: el.outerHTML.slice(0, 2000)});
      c.count++; for (const cls of el.classList) if (c.classes.length < 30 && !c.classes.includes(cls)) c.classes.push(cls);
    }
  }
  const root = getComputedStyle(document.documentElement);
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = list => { for (const r of list) {
      if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
      if (!r.selectorText) continue;
      if (out.selectors.length < 20000) out.selectors.push(r.selectorText);
      for (let i = 0; i < (r.style ? r.style.length : 0); i++) { const name = r.style[i]; if (name.startsWith('--') && !(name in out.vars)) out.vars[name] = (root.getPropertyValue(name) || r.style.getPropertyValue(name)).trim(); }
    } };
    walk(rules);
  }
  const links = [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)).map(h => h.split('#')[0]);
  return {...out, links: [...new Set(links)].slice(0, 200), title: document.title};
})()`;

type Collected = {
  pairs: Record<string, {count: number; foreground: string; background: string; selector: string; large: boolean}>;
  colors: Record<string, {count: number; value: string; property: string; selector: string}>;
  fonts: Record<string, {count: number; family: string; size: string; weight: string; lineHeight: string; selector: string}>;
  spacing: Record<string, {count: number}>; radius: Record<string, {count: number}>; shadow: Record<string, {count: number}>;
  vars: Record<string, string>; components: Record<string, {count: number; classes: string[]; html: string}>; selectors: string[]; links: string[]; title: string;
};

const STATES = ['hover', 'focus-visible', 'focus', 'active', 'disabled'] as const;
const statesFor = (kind: string, classes: string[], selectors: string[]) => {
  const subjects = [...classes.map(c => '.' + c.replace(/[^\w-]/g, '')), ...(kind === 'Button' ? ['button'] : kind === 'Text field' ? ['input'] : kind === 'Select' ? ['select'] : [])];
  return STATES.filter(state => selectors.some(sel => subjects.some(subject => sel.includes(subject) && new RegExp(`:${state}(?![\\w-])`).test(sel))
    || (state === 'disabled' && subjects.some(subject => sel.includes(subject) && /\[disabled\]|\[aria-disabled/.test(sel)))));
};

// Crawl near the start page: same-origin links that share its path prefix come first,
// and links into a different version (/docs/5.2/ vs /docs/5.3/) are skipped.
const segments = (url: URL) => url.pathname.split('/').filter(Boolean);
const VERSION = /^v?\d+(\.\d+)+$/;
export function sharedPrefix(start: URL, link: URL): number {
  const a = segments(start), b = segments(link);
  let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}
export function sameSection(start: URL, link: URL): boolean {
  if (link.origin !== start.origin) return false;
  const a = segments(start), b = segments(link);
  return a.every((segment, i) => !VERSION.test(segment) || b[i] === undefined || b[i] === segment);
}

export function createUrlAdapter(options: UrlAdapterOptions): Adapter {
  const {maxPages = 8, viewports = [1440, 768, 375], timeoutMs = 20_000, allowUrl} = options;
  return async ({uri}, {signal, progress}) => {
    let playwright: typeof import('playwright');
    try { playwright = await import('playwright'); }
    catch { throw new AdapterError('Website rendering needs Playwright on the server (npm install playwright && npx playwright install chromium).'); }
    const start = new URL(uri);
    if (!allowUrl(start)) throw new AdapterError('Only public HTTPS websites can be rendered.');

    const browser = await playwright.chromium.launch({headless: true, args: ['--disable-dev-shm-usage']});
    const abort = () => { void browser.close(); };
    signal.addEventListener('abort', abort, {once: true});
    const observations: Observation[] = [], failed: {locator: string; reason: string}[] = [], themes = new Set<string>(['light']);
    const queue = [start.href], seen = new Set<string>(), components = new Map<string, {count: number; classes: Set<string>; html: string; locator: string}>(), selectors = new Set<string>();
    let fetched = 0;
    try {
      const context = await browser.newContext({acceptDownloads: false, javaScriptEnabled: true, serviceWorkers: 'block', userAgent: 'GapScan/1.0 (design-system extraction)'});
      await context.route('**/*', route => {
        let url: URL;
        try { url = new URL(route.request().url()); } catch { return route.abort(); }
        if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
        if (!allowUrl(url) || ['media', 'websocket', 'eventsource'].includes(route.request().resourceType())) return route.abort();
        return route.continue();
      });
      while (queue.length && fetched < maxPages) {
        signal.throwIfAborted();
        const href = queue.shift()!;
        if (seen.has(href)) continue;
        seen.add(href);
        const page = await context.newPage();
        let skippedDuplicate = false;
        try {
          // The first page is read at every viewport and in dark mode; later pages at desktop width only.
          const passes = fetched === 0 ? [...viewports.map(width => ({width, scheme: 'light' as const})), {width: viewports[0]!, scheme: 'dark' as const}] : [{width: viewports[0]!, scheme: 'light' as const}];
          for (const pass of passes) {
            await page.setViewportSize({width: pass.width, height: 900});
            await page.emulateMedia({colorScheme: pass.scheme});
            if (pass === passes[0]) {
              const response = await page.goto(href, {waitUntil: 'domcontentloaded', timeout: timeoutMs});
              if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status() ?? 'error'}`);
              if (!allowUrl(new URL(page.url()))) throw new Error('Redirected to a non-public address.');
              const landed = page.url().split('#')[0]!;
              if (landed !== href && seen.has(landed)) { skippedDuplicate = true; break; }
              seen.add(landed);
              await page.waitForLoadState('networkidle', {timeout: 5000}).catch(() => undefined);
              // Freeze transitions so a theme or viewport switch is measured at its end state, not mid-fade.
              await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'}).catch(() => undefined);
            } else await page.waitForTimeout(300);
            const data = await page.evaluate(COLLECT) as Collected, locator = `${page.url()} @${pass.width}px${pass.scheme === 'dark' ? ' dark' : ''}`;
            if (pass.scheme === 'dark') {
              // Only record dark mode when the page actually changes colours for it.
              const lightValues = new Set(observations.filter(o => o.type === 'color' && o.locator.startsWith(page.url())).map(o => o.type === 'color' ? o.value : ''));
              if (Object.values(data.colors).some(c => !lightValues.has(c.value))) themes.add('dark'); else continue;
            }
            const channel = 'observed_css' as const, rendered = true;
            for (const c of Object.values(data.colors)) observations.push({type: 'color', channel, rendered, value: c.value, property: c.property, selector: c.selector, count: c.count, locator});
            for (const f of Object.values(data.fonts)) observations.push({type: 'font', channel, rendered, family: f.family, size: f.size, weight: f.weight, lineHeight: f.lineHeight, selector: f.selector, count: f.count, locator});
            for (const [value, {count}] of Object.entries(data.spacing)) observations.push({type: 'spacing', channel, value, count, locator});
            for (const [value, {count}] of Object.entries(data.radius)) observations.push({type: 'radius', channel, value, count, locator});
            for (const [value, {count}] of Object.entries(data.shadow)) observations.push({type: 'shadow', channel, value, count, locator});
            for (const p of Object.values(data.pairs)) observations.push({type: 'contrast', channel, rendered, foreground: p.foreground, background: p.background, selector: p.selector, large: p.large, count: p.count, locator});
            if (pass === passes[0]) {
              for (const [name, value] of Object.entries(data.vars)) if (value) observations.push({type: 'token', channel, path: name, value, locator: `${page.url()} :root`});
              for (const selector of data.selectors) selectors.add(selector);
              for (const [kind, c] of Object.entries(data.components)) {
                const entry = components.get(kind) ?? {count: 0, classes: new Set<string>(), html: c.html, locator: page.url()};
                entry.count += c.count; c.classes.forEach(cls => entry.classes.add(cls)); components.set(kind, entry);
              }
              for (const link of data.links) if (!seen.has(link) && !queue.includes(link) && allowUrl(new URL(link)) && sameSection(start, new URL(link))) queue.push(link);
              queue.sort((a, b) => sharedPrefix(start, new URL(b)) - sharedPrefix(start, new URL(a)));
            }
          }
          if (skippedDuplicate) continue;   // a redirect landed on a page already read
          fetched++;
          await progress?.(`rendered ${page.url()} (${fetched}/${maxPages})`);
        } catch (error) {
          if (signal.aborted) throw error;
          failed.push({locator: href, reason: error instanceof Error ? error.message.split('\n')[0]! : 'Page failed to render.'});
        } finally { await page.close().catch(() => undefined); }
      }
      for (const [kind, c] of components) observations.push({type: 'component', channel: 'observed_css', name: kind, html: c.html, states: [...statesFor(kind, [...c.classes], [...selectors])], locator: c.locator, raw: `${c.count} instances; classes ${[...c.classes].slice(0, 8).join(' ')}`});
    } finally {
      signal.removeEventListener('abort', abort);
      await browser.close().catch(() => undefined);
    }
    if (!fetched) throw new AdapterError(`The website could not be rendered: ${failed[0]?.reason ?? 'no pages loaded'}.`);
    return {observations, fetched, failed, budgetHit: queue.length > 0, viewports: [...viewports].sort((a, b) => a - b), themes: [...themes]};
  };
}
