// The `render` job: brand kit → template → headless Chromium → stored output and checks.
import {buildBrandKit, planAsset, renderAsset} from '@gapscan/assets';
import type {BlobStore, JobHandler, Store} from '@gapscan/infra';
import {loadExtraction} from './gapscan-job.ts';

export const assetKey = (jobId: string, file: string) => `assets/${jobId}/${file}`;

export function createRenderHandler({store, blobs}: {store: Store; blobs: BlobStore}): JobHandler {
  return async ({job, signal, progress}) => {
    const {edsId, template, data, brandName} = job.payload as {edsId: string; template: string; data: Record<string, string>; brandName?: string};
    const eds = await loadExtraction(store, blobs, edsId);
    if (!eds) throw new Error('The extraction could not be found.');
    const plan = planAsset(template, buildBrandKit(eds, brandName || 'Your brand'), data);
    await progress('render', 0, 1, `Rendering ${plan.template.label}…`);
    let playwright: typeof import('playwright');
    try { playwright = await import('playwright'); } catch { throw new Error('Rendering needs Playwright on the server (npx playwright install chromium).'); }
    const browser = await playwright.chromium.launch();
    const stop = () => { void browser.close(); };
    signal.addEventListener('abort', stop, {once: true});
    try {
      const page = await browser.newPage();
      const output = await renderAsset(page, plan);
      await blobs.put(assetKey(job.id, output.file), output.bytes);
      await blobs.put(assetKey(job.id, 'manifest.json'), JSON.stringify({template: plan.template, file: output.file, contentType: output.contentType, checks: plan.checks, edsId}));
      await progress('render', 1, 1, `${plan.checks.filter(c => !c.pass).length ? 'Rendered with warnings' : 'Rendered; all checks passed'}.`);
      return {resultId: job.id};
    } finally {
      signal.removeEventListener('abort', stop);
      await browser.close().catch(() => undefined);
    }
  };
}
