// The `render` job: brand kit → template → headless Chromium → stored output and checks.
import {buildBrandKit, planAsset, renderAsset, renderDeck} from '@gapscan/assets';
import type {BlobStore, JobHandler, Store} from '@gapscan/infra';
import {loadExtraction} from './gapscan-job.ts';

export const assetKey = (jobId: string, file: string) => `assets/${jobId}/${file}`;

export function createRenderHandler({store, blobs}: {store: Store; blobs: BlobStore}): JobHandler {
  return async ({job, signal, progress}) => {
    const {edsId, template, data, brandName} = job.payload as {edsId: string; template: string; data: Record<string, string>; brandName?: string};
    const eds = await loadExtraction(store, blobs, edsId);
    if (!eds) throw new Error('The extraction could not be found.');
    const kit = buildBrandKit(eds, brandName || 'Your brand'), plan = planAsset(template, kit, data);
    await progress('render', 0, 1, `Rendering ${plan.template.label}…`);
    const save = async (output: {file: string; contentType: string; bytes: Uint8Array}) => {
      await blobs.put(assetKey(job.id, output.file), output.bytes);
      await blobs.put(assetKey(job.id, 'manifest.json'), JSON.stringify({template: plan.template, file: output.file, contentType: output.contentType, checks: plan.checks, edsId}));
      await progress('render', 1, 1, `${plan.checks.filter(c => !c.pass).length ? 'Rendered with warnings' : 'Rendered; all checks passed'}.`);
      return {resultId: job.id};
    };
    if (plan.template.output === 'pptx') return save(renderDeck(kit, data));
    if (plan.template.output === 'html') return save({file: `${plan.template.id}.html`, contentType: 'text/html; charset=utf-8', bytes: new TextEncoder().encode(plan.html)});
    let playwright: typeof import('playwright');
    try { playwright = await import('playwright'); } catch { throw new Error('Rendering needs Playwright on the server (npx playwright install chromium).'); }
    const browser = await playwright.chromium.launch();
    const stop = () => { void browser.close(); };
    signal.addEventListener('abort', stop, {once: true});
    try {
      const page = await browser.newPage();
      return await save(await renderAsset(page, plan));
    } finally {
      signal.removeEventListener('abort', stop);
      await browser.close().catch(() => undefined);
    }
  };
}
