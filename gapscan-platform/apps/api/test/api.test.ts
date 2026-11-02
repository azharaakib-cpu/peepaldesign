import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {configFromEnv, createInfra} from '@gapscan/infra';
import type {Infra} from '@gapscan/infra';
import type {ExtractedDesignSystem, JobEvent} from '@gapscan/schema';
import {buildApp, MAX_CODE_BYTES} from '../src/app.ts';
import {createExtractHandler} from '../src/extract-job.ts';

const CSS = ':root{--brand:#0B5FD6;--space-2:8px;--alias:var(--missing)} .btn{background:var(--brand);padding:4px} .btn:hover{background:#004} .card{border-radius:4px}';

async function harness(options: {stageDelayMs?: number} = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'gapscan-api-'));
  const infra: Infra = await createInfra({...configFromEnv({}), dataDir});
  const app = buildApp({infra, handlers: {extract: createExtractHandler({store: infra.store, blobs: infra.blobs, stageDelayMs: options.stageDelayMs ?? 0})}, heartbeatMs: 50});
  const json = async <T = any>(method: string, url: string, payload?: unknown) => {
    const response = await app.inject({method: method as 'GET', url, ...(payload === undefined ? {} : {payload: payload as object})});
    return {status: response.statusCode, body: (response.body ? JSON.parse(response.body) : null) as T};
  };
  const project = (await json('POST', '/v1/projects', {name: 'Acme'})).body as {id: string};
  const close = async () => { await app.close(); await infra.close(); await rm(dataDir, {recursive: true, force: true}); };
  return {app, infra, json, project, close};
}

// Minimal SSE reader: returns parsed events until the server ends the stream.
async function readEvents(base: string, jobId: string, lastEventId?: number, limit = Infinity): Promise<JobEvent[]> {
  const controller = new AbortController();
  const response = await fetch(`${base}/v1/jobs/${jobId}/events`, {headers: lastEventId ? {'last-event-id': String(lastEventId)} : {}, signal: controller.signal});
  assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  const events: JobEvent[] = [], decoder = new TextDecoder();
  let buffer = '';
  try {
    for await (const chunk of response.body!) {
      buffer += decoder.decode(chunk, {stream: true});
      let split;
      while ((split = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, split); buffer = buffer.slice(split + 2);
        const data = frame.split('\n').find(line => line.startsWith('data: '));
        if (data) events.push(JSON.parse(data.slice(6)) as JobEvent);
        if (events.length >= limit) { controller.abort(); return events; }
      }
    }
  } catch (error) { if (!controller.signal.aborted) throw error; }
  return events;
}

test('pasted code becomes a versioned, schema-valid extraction with plain-language findings', async () => {
  const h = await harness();
  try {
    assert.equal((await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'code', name: 'acme.css', content: CSS})).status, 201);
    const started = await h.json('POST', `/v1/projects/${h.project.id}/extractions`);
    assert.equal(started.status, 202);
    await h.infra.queue.idle();
    const job = (await h.json('GET', `/v1/jobs/${started.body.jobId}`)).body;
    assert.equal(job.status, 'completed', JSON.stringify(job.error));
    const summary = (await h.json('GET', `/v1/extractions/${job.resultId}`)).body;
    assert.equal(summary.version, 1);
    const eds = (await h.json<ExtractedDesignSystem>('GET', `/v1/extractions/${job.resultId}?include=full`)).body;
    assert.ok(eds.tokens.some(t => t.path === '--brand' && t.type === 'color' && t.status === 'resolved'));
    assert.ok(eds.tokens.some(t => t.path === '--alias' && t.status === 'unresolved'));
    const button = eds.components.find(c => c.rawNames.includes('btn'));
    assert.equal(button?.category, 'Actions');
    assert.deepEqual(button?.statesObserved, ['hover']);
    assert.ok(eds.quirks.some(q => q.kind === 'missing_state' && /keyboard focus/.test(q.summary)));
    assert.ok(eds.quirks.some(q => q.kind === 'unresolved_value'));
    assert.ok(eds.evidence.every(e => e.trust === 'declared' || e.trust === 'observed'));

    const again = await h.json('POST', `/v1/projects/${h.project.id}/extractions`);
    await h.infra.queue.idle();
    const second = (await h.json('GET', `/v1/jobs/${again.body.jobId}`)).body;
    const secondSummary = (await h.json('GET', `/v1/extractions/${second.resultId}`)).body;
    assert.equal(secondSummary.version, 2);
    assert.equal(secondSummary.fingerprint, summary.fingerprint, 'identical inputs give an identical fingerprint');
  } finally { await h.close(); }
});

test('source intake rejects private URLs and oversized code, and accepts public URLs without fetching', async () => {
  const h = await harness();
  try {
    for (const uri of ['http://example.com', 'https://localhost/x', 'https://192.168.1.4/', 'https://intranet.local/'])
      assert.equal((await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'url', uri})).status, 400, uri);
    assert.equal((await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'url', uri: 'https://polaris.shopify.com/components'})).status, 201);
    assert.equal((await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'code', name: 'big.css', content: 'a'.repeat(MAX_CODE_BYTES + 1)})).status, 413);
    assert.equal((await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'code', name: '../etc/passwd', content: 'x'})).status, 400);
    assert.equal((await h.json('POST', '/v1/projects/nope/sources', {kind: 'code', name: 'a.css', content: 'x'})).status, 404);
    const emptyJson = await h.app.inject({method: 'POST', url: `/v1/projects/${h.project.id}/extractions`, headers: {'content-type': 'application/json'}, payload: ''});
    assert.equal(emptyJson.statusCode, 202, 'an empty JSON body on an action endpoint is accepted');
    const broken = await h.app.inject({method: 'POST', url: '/v1/projects', headers: {'content-type': 'application/json'}, payload: '{name:'});
    assert.equal(broken.statusCode, 400);
    await h.infra.queue.idle();
  } finally { await h.close(); }
});

test('unreadable sources are reported honestly: alone they fail the job, alongside code they become coverage gaps', async () => {
  const h = await harness();
  try {
    await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'url', uri: 'https://polaris.shopify.com/components'});
    const urlOnly = await h.json('POST', `/v1/projects/${h.project.id}/extractions`);
    await h.infra.queue.idle();
    const failed = (await h.json('GET', `/v1/jobs/${urlOnly.body.jobId}`)).body;
    assert.equal(failed.status, 'failed');
    assert.match(failed.error.message, /nothing to extract/);

    await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'code', name: 'acme.css', content: CSS});
    const mixed = await h.json('POST', `/v1/projects/${h.project.id}/extractions`);
    await h.infra.queue.idle();
    const job = (await h.json('GET', `/v1/jobs/${mixed.body.jobId}`)).body;
    assert.equal(job.status, 'completed');
    const eds = (await h.json<ExtractedDesignSystem>('GET', `/v1/extractions/${job.resultId}?include=full`)).body;
    assert.ok(eds.quirks.some(q => q.kind === 'coverage_gap' && /Phase 2/.test(q.summary)));
    const events = await h.infra.store.listEvents(job.id);
    assert.ok(events.some(e => e.body.type === 'progress' && /^Skipped polaris/.test(e.body.message)), 'a skipped source is never reported as read');
    assert.equal(eds.coverage.perAsset.filter(a => a.failed.length).length, 1);
    assert.ok((await h.infra.store.listEvents(job.id)).some(e => e.body.type === 'warning'));
  } finally { await h.close(); }
});

test('SSE streams to the terminal event and resumes from Last-Event-ID without duplicates', async () => {
  const h = await harness({stageDelayMs: 30});
  try {
    await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'code', name: 'acme.css', content: CSS});
    const base = await h.app.listen({port: 0, host: '127.0.0.1'});
    const {jobId} = (await h.json('POST', `/v1/projects/${h.project.id}/extractions`)).body;

    const firstTwo = await readEvents(base, jobId, undefined, 2);       // client drops after two events
    assert.deepEqual(firstTwo.map(e => e.seq), [1, 2]);
    const rest = await readEvents(base, jobId, firstTwo.at(-1)!.seq);   // reconnect with the last id seen
    assert.equal(rest[0]?.seq, 3, 'resumes right after the last event seen');
    assert.equal(rest.at(-1)?.body.type, 'complete');
    const all = [...firstTwo, ...rest].map(e => e.seq);
    assert.deepEqual(all, all.map((_, i) => i + 1), 'no gaps and no duplicates');

    assert.deepEqual(await readEvents(base, jobId, rest.at(-1)!.seq), [], 'after the end, a resume closes immediately');
    assert.equal((await readEvents(base, jobId)).length, all.length, 'a fresh client replays the whole history');
  } finally { await h.close(); }
});

test('a running extraction can be cancelled, and the stream ends with a cancelled event', async () => {
  const h = await harness({stageDelayMs: 200});
  try {
    await h.json('POST', `/v1/projects/${h.project.id}/sources`, {kind: 'code', name: 'acme.css', content: CSS});
    const base = await h.app.listen({port: 0, host: '127.0.0.1'});
    const {jobId} = (await h.json('POST', `/v1/projects/${h.project.id}/extractions`)).body;
    const streamed = readEvents(base, jobId);
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal((await h.json('DELETE', `/v1/jobs/${jobId}`)).status, 202);
    const events = await streamed;
    assert.equal(events.at(-1)?.body.type, 'cancelled');
    assert.equal((await h.json('GET', `/v1/jobs/${jobId}`)).body.status, 'cancelled');
    assert.equal((await h.json('DELETE', `/v1/jobs/${jobId}`)).status, 409, 'cannot cancel twice');
  } finally { await h.close(); }
});
