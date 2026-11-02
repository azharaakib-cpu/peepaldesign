// The `extract` job: all of a project's sources → one versioned ExtractedDesignSystem.
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {ExtractedDesignSystem} from '@gapscan/schema';
import type {CoverageReport, QuirkRecord} from '@gapscan/schema';
import type {BlobStore, JobHandler, Store} from '@gapscan/infra';
import {extractCode, fingerprint} from './legacy-bridge.ts';
import type {CodeDocument} from './legacy-bridge.ts';

const NOT_YET: Partial<Record<string, string>> = {
  url: 'Rendered website extraction arrives in Phase 2 (Playwright adapter). Paste or upload the site\'s CSS/HTML for now.',
  figma: 'The Figma adapter arrives in Phase 2.', pdf: 'The PDF adapter arrives in Phase 2.', pptx: 'The PPTX adapter arrives in Phase 2.',
  docx: 'The DOCX adapter arrives in Phase 2.', image: 'Image sampling arrives in Phase 2.', zip: 'ZIP review arrives in Phase 2.',
};

export type ExtractOptions = {store: Store; blobs: BlobStore; stageDelayMs?: number};

export function createExtractHandler({store, blobs, stageDelayMs = 0}: ExtractOptions): JobHandler {
  return async ({job, signal, progress, warn}) => {
    // Stages yield (and can be slowed in tests) so cancellation is honoured between them.
    const checkpoint = async () => { if (stageDelayMs) await sleep(stageDelayMs, undefined, {signal}); signal.throwIfAborted(); };
    const sources = await store.listSources(job.projectId);
    await progress('collect', 0, sources.length, `Reading ${sources.length} source${sources.length === 1 ? '' : 's'}…`);
    await checkpoint();

    const documents: CodeDocument[] = [], coverage: CoverageReport = {perAsset: [], viewports: [], themes: []}, gaps: QuirkRecord[] = [];
    for (const [index, source] of sources.entries()) {
      const reason = source.kind === 'code' || source.kind === 'markdown' ? null : NOT_YET[source.kind] ?? `${source.kind} sources are not supported yet.`;
      const content = reason || !source.blobKey ? null : await blobs.get(source.blobKey);
      if (content) documents.push({assetId: source.id, name: source.label ?? source.id, content: content.toString('utf8')});
      const failure = reason ?? (content ? null : 'Stored content is missing.');
      coverage.perAsset.push({assetId: source.id, fetched: content ? 1 : 0, skipped: 0, failed: failure ? [{locator: source.uri, reason: failure}] : [], budgetHit: false});
      if (failure) {
        gaps.push({id: `q:coverage:${source.id}`, kind: 'coverage_gap', severity: 'major', subjectIds: [source.id], summary: `${source.label ?? source.uri} was not read: ${failure}`, evidence: []});
        await warn(`${source.label ?? source.uri}: ${failure}`);
      }
      await progress('collect', index + 1, sources.length, `${failure ? 'Skipped' : 'Read'} ${source.label ?? source.uri}`);
      await checkpoint();
    }
    if (!documents.length) throw new Error('None of the sources could be read, so there is nothing to extract. Add pasted or uploaded code and try again.');

    await progress('parse', 0, 1, 'Extracting tokens and components…');
    const output = await extractCode(documents);
    await checkpoint();
    await progress('classify', 1, 1, `Classified ${output.components.length} component${output.components.length === 1 ? '' : 's'} and ${output.tokens.length} token${output.tokens.length === 1 ? '' : 's'}.`);
    await checkpoint();

    const version = (await store.latestExtractionVersion(job.projectId)) + 1, id = randomUUID(), createdAt = new Date().toISOString();
    const eds = ExtractedDesignSystem.parse({
      id, projectId: job.projectId, version, fingerprint: fingerprint(output), createdAt, sources,
      evidence: output.evidence, tokens: output.tokens, components: output.components, specimens: output.specimens,
      quirks: [...output.quirks, ...gaps], coverage, brandSignals: {voiceSnippets: [], logoAssets: []},
    });
    await progress('audit', 1, 1, `${eds.quirks.length} finding${eds.quirks.length === 1 ? '' : 's'} recorded.`);
    signal.throwIfAborted();

    const blobKey = await blobs.put(`extractions/${id}.json`, JSON.stringify(eds));
    await store.saveExtraction({id, projectId: job.projectId, version, fingerprint: eds.fingerprint, blobKey, createdAt, summary: {
      tokens: eds.tokens.length, components: eds.components.length, quirks: eds.quirks.length,
      unresolvedTokens: eds.tokens.filter(t => t.status === 'unresolved').length,
      sourcesRead: coverage.perAsset.filter(a => a.fetched > 0).length, sourcesSkipped: coverage.perAsset.filter(a => a.failed.length).length,
      supportItemsExcluded: output.excludedSupportItems,
    }});
    return {resultId: id};
  };
}
