// HTTP surface from architecture Part 4. Long work is always a job: POST returns
// 202 with a job id, progress streams over SSE, and results are fetched by id.
import {createHash, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import Fastify from 'fastify';
import type {FastifyReply} from 'fastify';
import {z} from 'zod';
import {ExtractedDesignSystem, TERMINAL_JOB_STATUSES} from '@gapscan/schema';
import type {JobEvent, JobType} from '@gapscan/schema';
import type {Infra, JobHandler} from '@gapscan/infra';
import {createUrlAdapter} from '@gapscan/adapters';
import type {Adapter} from '@gapscan/adapters';
import {listReferences, loadReference} from '@gapscan/library';
import {planningTotals} from '@gapscan/estimate';
import {Assumptions, GapScanReport, ObjectKind} from '@gapscan/schema';
import {CODE_FILE, createExtractHandler} from './extract-job.ts';
import {projectSpecimen} from '@gapscan/gapscan';
import {EXPORT_FORMATS, exportTokens} from '@gapscan/exports';
import {buildObjects, contentHash} from '@gapscan/objects';
import type {StoredApproval} from '@gapscan/objects';
import {assetKey, createRenderHandler} from './render-job.ts';
import {buildBrandKit, TEMPLATES} from '@gapscan/assets';
import {approvalKey, computeReport, createGapScanHandler, loadExtraction, saveReport, summarize} from './gapscan-job.ts';
import {createUrlGuard, publicUrl, UnsafeUrlError} from './url-safety.ts';
import {lookup} from 'node:dns/promises';
const lookupAll = (hostname: string) => lookup(hostname, {all: true, verbatim: true});

export const MAX_CODE_BYTES = 1_500_000;
export const MAX_FILE_BYTES = 40_000_000;
// Uploaded files are typed by extension; the adapter then checks the content itself.
const FILE_KINDS: [RegExp, 'pptx' | 'docx' | 'pdf' | 'zip' | 'image' | 'code'][] = [[/\.pptx$/i, 'pptx'], [/\.docx$/i, 'docx'], [/\.pdf$/i, 'pdf'], [/\.zip$/i, 'zip'], [/\.(png|jpe?g|webp|gif)$/i, 'image'], [CODE_FILE, 'code']];
const HEARTBEAT_MS = 15_000;

const CreateProjectBody = z.object({name: z.string().trim().min(1).max(200)});
const AddSourceBody = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('url'), uri: z.string().min(1).max(2048), consent: z.boolean().optional()}),
  z.object({kind: z.literal('code'), name: z.string().trim().min(1).max(200).regex(/^[\w .()-]+$/, 'Use letters, numbers, spaces, dots, dashes or underscores.'), content: z.string().min(1)}),
  z.object({kind: z.literal('file'), name: z.string().trim().min(1).max(200).regex(/^[\w .()-]+$/, 'Use letters, numbers, spaces, dots, dashes or underscores.'), base64: z.string().min(1)}),
]);
const IdParams = z.object({id: z.string().min(1)});

export type AppOptions = {infra: Infra; handlers?: Partial<Record<JobType, JobHandler>>; logger?: boolean; heartbeatMs?: number};

export function buildApp({infra, handlers = {}, logger = false, heartbeatMs = HEARTBEAT_MS}: AppOptions) {
  const {store, blobs, bus, queue} = infra;
  // Every page and sub-request the browser makes must pass the same public-URL check as intake.
  // Each extraction gets a fresh guard, so DNS answers are cached for one job only.
  const urlAdapter: Adapter = (input, context) =>
    createUrlAdapter({allowUrl: createUrlGuard(lookupAll), maxPages: Number(process.env.GAPSCAN_MAX_PAGES) || 8})(input, context);
  queue.register('extract', handlers.extract ?? createExtractHandler({store, blobs, urlAdapter}));
  queue.register('gapscan', handlers.gapscan ?? createGapScanHandler({store, blobs}));
  queue.register('render', handlers.render ?? createRenderHandler({store, blobs}));
  const app = Fastify({logger, bodyLimit: Math.ceil(MAX_FILE_BYTES * 1.4)});
  // Action endpoints like POST /extractions take no body; clients that still send
  // `content-type: application/json` with nothing in it should not get a 400.
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', {parseAs: 'string'}, (_request, body, done) => {
    if (body === '') return done(null, undefined);
    try { done(null, JSON.parse(body as string)); }
    catch { done(Object.assign(new Error('Request body is not valid JSON.'), {statusCode: 400}), undefined); }
  });

  const fail = (reply: FastifyReply, status: number, error: string, issues?: unknown) => reply.code(status).send({error, ...(issues ? {issues} : {})});
  const parse = <T>(schema: z.ZodType<T>, value: unknown, reply: FastifyReply): T | undefined => {
    const result = schema.safeParse(value);
    if (!result.success) { void fail(reply, 400, 'Invalid request.', z.flattenError(result.error as z.ZodError<Record<string, unknown>>)); return undefined; }
    return result.data;
  };

  app.get('/health', async () => ({ok: true}));

  // The extraction UI: a few static files, no build step. Only known names are served.
  const PUBLIC = new URL('../public/', import.meta.url), TYPES: Record<string, string> = {html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8'};
  app.get('/', async (_request, reply) => reply.redirect('/app/'));
  app.get('/app/*', async (request, reply) => {
    const name = (request.params as {'*': string})['*'] || 'index.html';
    if (!/^[a-z-]+\.(html|css|js)$/.test(name)) return fail(reply, 404, 'Not found.');
    try {
      const body = await readFile(new URL(name, PUBLIC));
      return reply.type(TYPES[name.split('.').pop()!]!).header('cache-control', 'no-cache').header('content-security-policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:").send(body);
    } catch { return fail(reply, 404, 'Not found.'); }
  });

  app.post('/v1/projects', async (request, reply) => {
    const body = parse(CreateProjectBody, request.body, reply); if (!body) return reply;
    return reply.code(201).send(await store.createProject(body.name));
  });

  app.get('/v1/projects/:id', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const project = await store.getProject(id);
    return project ? {...project, sources: await store.listSources(id)} : fail(reply, 404, 'Project not found.');
  });

  // Sources are validated and stored only; nothing is fetched or parsed until an extraction job runs.
  app.post('/v1/projects/:id/sources', async (request, reply) => {
    const {id: projectId} = IdParams.parse(request.params);
    if (!await store.getProject(projectId)) return fail(reply, 404, 'Project not found.');
    const body = parse(AddSourceBody, request.body, reply); if (!body) return reply;
    const id = randomUUID(), createdAt = new Date().toISOString();
    if (body.kind === 'url') {
      let url: URL;
      try { url = publicUrl(body.uri); } catch (error) { return fail(reply, 400, error instanceof UnsafeUrlError ? error.message : 'Invalid URL.'); }
      const kind = /^(www\.)?figma\.com$/.test(url.hostname) ? 'figma' as const : 'url' as const;
      const source = {id, projectId, kind, uri: url.href, label: url.hostname, sha256: createHash('sha256').update(url.href).digest('hex'),
        bytes: 0, budget: {maxPages: 40, maxBytes: 20_000_000}, ...(body.consent !== undefined ? {consent: body.consent} : {}), createdAt};
      await store.addSource(source);
      return reply.code(201).send(source);
    }
    if (body.kind === 'file') {
      const kind = FILE_KINDS.find(([pattern]) => pattern.test(body.name))?.[1];
      if (!kind) return fail(reply, 415, `${body.name} is not a supported file type. Use .pptx, .docx, .pdf, .zip, or CSS/SCSS/JSON/HTML source.`);
      const data = Buffer.from(body.base64, 'base64');
      if (!data.length) return fail(reply, 400, 'The file is empty or not base64-encoded.');
      if (data.length > MAX_FILE_BYTES) return fail(reply, 413, `${body.name} is ${data.length} bytes; the limit is ${MAX_FILE_BYTES}.`);
      const blobKey = await blobs.put(`sources/${projectId}/${id}`, data);
      const source = {id, projectId, kind, uri: `upload:${body.name}`, label: body.name, sha256: createHash('sha256').update(data).digest('hex'),
        bytes: data.length, blobKey, budget: {maxPages: 200, maxBytes: MAX_FILE_BYTES}, createdAt};
      await store.addSource(source);
      return reply.code(201).send(source);
    }
    const bytes = Buffer.byteLength(body.content, 'utf8');
    if (bytes > MAX_CODE_BYTES) return fail(reply, 413, `Pasted code is ${bytes} bytes; the limit is ${MAX_CODE_BYTES}. Upload a smaller file.`);
    const blobKey = await blobs.put(`sources/${projectId}/${id}`, body.content);
    const source = {id, projectId, kind: 'code' as const, uri: `inline:${body.name}`, label: body.name, sha256: createHash('sha256').update(body.content).digest('hex'),
      bytes, blobKey, budget: {maxPages: 1, maxBytes: MAX_CODE_BYTES}, createdAt};
    await store.addSource(source);
    return reply.code(201).send(source);
  });

  app.post('/v1/projects/:id/extractions', async (request, reply) => {
    const {id: projectId} = IdParams.parse(request.params);
    if (!await store.getProject(projectId)) return fail(reply, 404, 'Project not found.');
    if (!(await store.listSources(projectId)).length) return fail(reply, 400, 'Add at least one source before extracting.');
    const job = await store.createJob({type: 'extract', projectId, payload: {}});
    await queue.enqueue(job);
    return reply.code(202).header('location', `/v1/jobs/${job.id}`).send({jobId: job.id, events: `/v1/jobs/${job.id}/events`});
  });

  app.get('/v1/jobs/:id', async (request, reply) => {
    const job = await store.getJob(IdParams.parse(request.params).id);
    return job ?? fail(reply, 404, 'Job not found.');
  });

  app.delete('/v1/jobs/:id', async (request, reply) => {
    const job = await store.getJob(IdParams.parse(request.params).id);
    if (!job) return fail(reply, 404, 'Job not found.');
    if (TERMINAL_JOB_STATUSES.includes(job.status)) return fail(reply, 409, `Job already ${job.status}.`);
    return await queue.cancel(job.id) ? reply.code(202).send({status: 'cancelling'}) : fail(reply, 409, 'Job is not running in this server process.');
  });

  // Server-sent events with resume: the client's Last-Event-ID (or ?after=) is the
  // last sequence it saw. We subscribe before replaying so nothing is missed, drop
  // duplicates by sequence, and end the stream after the terminal event.
  app.get('/v1/jobs/:id/events', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    if (!await store.getJob(id)) return fail(reply, 404, 'Job not found.');
    const query = request.query as {after?: string}, header = request.headers['last-event-id'];
    const after = Math.max(0, Number(Array.isArray(header) ? header[0] : header ?? query.after ?? 0) || 0);

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no'});
    res.write('retry: 2000\n\n');

    let cursor = after, ended = false, replaying = true, heartbeat: NodeJS.Timeout | undefined;
    const pending: JobEvent[] = [];
    const isTerminal = (event: JobEvent) => event.body.type === 'complete' || event.body.type === 'failed' || event.body.type === 'cancelled';
    const end = () => { if (ended) return; ended = true; clearInterval(heartbeat); unsubscribe(); res.end(); };
    const send = (event: JobEvent) => {
      if (ended || event.seq <= cursor) return;
      cursor = event.seq;
      if (isTerminal(event)) clearInterval(heartbeat);   // no heartbeat may follow the terminal event
      res.write(`id: ${event.seq}\nevent: ${event.body.type}\ndata: ${JSON.stringify(event)}\n\n`);
      if (isTerminal(event)) end();
    };
    const unsubscribe = bus.subscribe(id, event => { if (replaying) pending.push(event); else send(event); });
    request.raw.on('close', end);

    for (const event of await store.listEvents(id, after)) send(event);
    replaying = false;
    for (const event of pending.sort((a, b) => a.seq - b.seq)) send(event);
    if (!ended && (await store.listEvents(id, 0)).some(event => isTerminal(event) && event.seq <= cursor)) end();   // client already saw the end
    if (!ended) heartbeat = setInterval(() => res.write(': ping\n\n'), heartbeatMs);
  });

  app.get('/v1/extractions/:id/scales', async (request, reply) => {
    const record = await store.getExtraction(IdParams.parse(request.params).id);
    const blob = record && await blobs.get(`extractions/${record.id}.scales.json`);
    return blob ? JSON.parse(blob.toString('utf8')) : fail(reply, 404, 'Scales not found for this extraction.');
  });

  app.get('/v1/extractions/:id', async (request, reply) => {
    const record = await store.getExtraction(IdParams.parse(request.params).id);
    if (!record) return fail(reply, 404, 'Extraction not found.');
    if ((request.query as {include?: string}).include !== 'full') return record;
    const blob = await blobs.get(record.blobKey);
    return blob ? ExtractedDesignSystem.parse(JSON.parse(blob.toString('utf8'))) : fail(reply, 500, 'Stored extraction payload is missing.');
  });

  // ── Hand-offs and missing objects (architecture Part 3) ────────────────────
  app.get('/v1/extractions/:id/export', async (request, reply) => {
    const eds = await loadExtraction(store, blobs, IdParams.parse(request.params).id);
    if (!eds) return fail(reply, 404, 'Extraction not found.');
    const query = z.object({format: z.enum(['dtcg', 'css', 'tailwind4', 'scss']), palette: z.enum(['0', '1']).optional()}).safeParse(request.query);
    if (!query.success) return fail(reply, 400, 'Choose format=dtcg, css, tailwind4 or scss.');
    const format = EXPORT_FORMATS[query.data.format];
    return reply.type(`${format.type}; charset=utf-8`).header('content-disposition', `attachment; filename="${format.file}"`).send(exportTokens(eds, query.data.format, {includeInferredPalette: query.data.palette === '1'}));
  });

  const approvalsKey = (edsId: string) => `objects/${edsId}.approvals.json`;
  const readApprovals = async (edsId: string): Promise<Record<string, StoredApproval>> => { const blob = await blobs.get(approvalsKey(edsId)); return blob ? JSON.parse(blob.toString('utf8')) : {}; };

  app.get('/v1/extractions/:id/objects', async (request, reply) => {
    const {id} = IdParams.parse(request.params), eds = await loadExtraction(store, blobs, id);
    if (!eds) return fail(reply, 404, 'Extraction not found.');
    return buildObjects(eds, await readApprovals(id));
  });

  // Approves exactly the content the reviewer saw; regenerated content shows as stale until re-approved.
  app.put('/v1/extractions/:id/objects/:kind/sections/:sectionId/approval', async (request, reply) => {
    const params = z.object({id: z.string().min(1), kind: ObjectKind, sectionId: z.string().min(1)}).safeParse(request.params);
    if (!params.success) return fail(reply, 404, 'Unknown object.');
    const body = parse(z.object({by: z.string().trim().min(1).max(200)}), request.body, reply); if (!body) return reply;
    const eds = await loadExtraction(store, blobs, params.data.id);
    if (!eds) return fail(reply, 404, 'Extraction not found.');
    const section = buildObjects(eds).find(o => o.kind === params.data.kind)?.sections.find(s => s.id === params.data.sectionId);
    if (!section) return fail(reply, 404, 'Section not found.');
    const approvals = await readApprovals(params.data.id);
    approvals[`${params.data.kind}:${params.data.sectionId}`] = {by: body.by, at: new Date().toISOString(), hash: contentHash(section.content)};
    await blobs.put(approvalsKey(params.data.id), JSON.stringify(approvals));
    return buildObjects(eds, approvals).find(o => o.kind === params.data.kind);
  });

  // ── Brand assets (architecture Part 3 §3.2) ──────────────────────────────
  app.get('/v1/templates', async () => Object.values(TEMPLATES));
  app.get('/v1/extractions/:id/brandkit', async (request, reply) => {
    const eds = await loadExtraction(store, blobs, IdParams.parse(request.params).id);
    return eds ? buildBrandKit(eds, String((request.query as {name?: string}).name ?? 'Your brand').slice(0, 80)) : fail(reply, 404, 'Extraction not found.');
  });
  const StartRender = z.object({template: z.string().refine(id => id in TEMPLATES, 'Unknown template.'), brandName: z.string().trim().max(80).optional(), data: z.record(z.string(), z.string().max(1200)).default({})});
  app.post('/v1/extractions/:id/assets', async (request, reply) => {
    const {id} = IdParams.parse(request.params), extraction = await store.getExtraction(id);
    if (!extraction) return fail(reply, 404, 'Extraction not found.');
    const body = parse(StartRender, request.body, reply); if (!body) return reply;
    const job = await store.createJob({type: 'render', projectId: extraction.projectId, subjectId: id, payload: {edsId: id, ...body}});
    await queue.enqueue(job);
    return reply.code(202).send({jobId: job.id, events: `/v1/jobs/${job.id}/events`});
  });
  app.get('/v1/assets/:id', async (request, reply) => {
    const blob = await blobs.get(assetKey(IdParams.parse(request.params).id, 'manifest.json'));
    return blob ? JSON.parse(blob.toString('utf8')) : fail(reply, 404, 'Asset not found.');
  });
  app.get('/v1/assets/:id/file', async (request, reply) => {
    const {id} = IdParams.parse(request.params), manifest = await blobs.get(assetKey(id, 'manifest.json'));
    if (!manifest) return fail(reply, 404, 'Asset not found.');
    const {file, contentType} = JSON.parse(manifest.toString('utf8')) as {file: string; contentType: string};
    const bytes = await blobs.get(assetKey(id, file));
    // Generated HTML (emails) is served sandboxed: no scripts, no same-origin access, no network except images.
    if (contentType.startsWith('text/html')) reply.header('content-security-policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src https: data:");
    return bytes ? reply.type(contentType).header('content-disposition', `${(request.query as {download?: string}).download ? 'attachment' : 'inline'}; filename="${file}"`).send(bytes) : fail(reply, 404, 'Asset file missing.');
  });

  // ── GapScan (architecture Part 2) ─────────────────────────────────────────
  const StartGapScan = z.object({edsId: z.string().min(1), referenceId: z.string().min(1), assumptions: Assumptions.partial().optional()});
  const ApproveMatch = z.object({targetId: z.string().min(1).nullable(), by: z.string().trim().min(1).max(200), reason: z.string().trim().min(1).max(1000)});
  const loadReport = async (id: string) => {
    const record = await store.getGapScan(id), blob = record && await blobs.get(record.blobKey);
    return record && blob ? {record, report: GapScanReport.parse(JSON.parse(blob.toString('utf8')))} : null;
  };

  app.get('/v1/library', async () => listReferences());
  app.get('/v1/library/:id', async (request, reply) => {
    const reference = await loadReference(IdParams.parse(request.params).id);
    if (!reference) return fail(reply, 404, 'Reference not found.');
    return {id: reference.id, library: reference.library, version: reference.libraryVersion, pinnedAt: reference.pinnedAt,
      sources: reference.sources.map(s => ({uri: s.uri, sha256: s.sha256})),
      components: reference.components.map(c => ({id: c.id, canonical: c.canonical, category: c.category, variants: c.variants.map(v => v.name), sizes: c.sizes, states: c.statesObserved}))};
  });

  // Recommends references by how much of your inventory each one covers; a suggestion, not a verdict.
  app.get('/v1/extractions/:id/recommendations', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    if (!await loadExtraction(store, blobs, id)) return fail(reply, 404, 'Extraction not found.');
    const ranked = [];
    for (const reference of await listReferences()) {
      const report = await computeReport(store, blobs, id, reference.id), mine = report.items.filter(i => i.decision !== 'optional');
      const covered = mine.filter(i => i.match.status !== 'unresolved').length;
      ranked.push({...reference, fit: mine.length ? Math.round(covered / mine.length * 100) : 0, covered, compared: mine.length, complexity: report.totals.complexity,
        reason: `${covered} of ${mine.length} of your components have a likely counterpart`});
    }
    return ranked.sort((a, b) => b.fit - a.fit || (a.complexity ?? 9) - (b.complexity ?? 9));
  });

  app.post('/v1/gapscans', async (request, reply) => {
    const body = parse(StartGapScan, request.body, reply); if (!body) return reply;
    const extraction = await store.getExtraction(body.edsId);
    if (!extraction) return fail(reply, 404, 'Extraction not found.');
    if (!(await listReferences()).some(r => r.id === body.referenceId)) return fail(reply, 400, 'Choose a reference system from the library.');
    const job = await store.createJob({type: 'gapscan', projectId: extraction.projectId, subjectId: body.edsId, payload: body});
    await queue.enqueue(job);
    return reply.code(202).header('location', `/v1/jobs/${job.id}`).send({jobId: job.id, events: `/v1/jobs/${job.id}/events`});
  });

  // The executive layer by default; per-item technical detail only with ?include=tech.
  app.get('/v1/gapscans/:id', async (request, reply) => {
    const loaded = await loadReport(IdParams.parse(request.params).id);
    if (!loaded) return fail(reply, 404, 'Report not found.');
    if ((request.query as {include?: string}).include === 'tech') return loaded.report;
    return {...loaded.report, items: loaded.report.items.map(({tech: _tech, ...item}) => item)};
  });

  app.get('/v1/gapscans/:id/items/:itemId/projection', async (request, reply) => {
    const {id, itemId} = z.object({id: z.string().min(1), itemId: z.string().min(1)}).parse(request.params);
    const loaded = await loadReport(id), item = loaded?.report.items.find(i => i.id === itemId);
    if (!loaded || !item) return fail(reply, 404, 'Item not found.');
    const reference = await loadReference(loaded.report.reference.id), specimen = reference?.specimens.find(s => s.id === item.afterSpecimenId);
    if (!specimen?.css) return fail(reply, 404, 'The reference has no example for this component.');
    const projected = projectSpecimen(specimen.css, (item.tech?.tokenDiff ?? []) as {before: string; after: string | null; change: string}[]);
    return {html: specimen.html ?? '', css: projected.css, origin: 'projected', substitutions: projected.substitutions};
  });

  // Totals are recalculated on the server only, so every view and export shows the same numbers.
  app.put('/v1/gapscans/:id/assumptions', async (request, reply) => {
    const loaded = await loadReport(IdParams.parse(request.params).id);
    if (!loaded) return fail(reply, 404, 'Report not found.');
    const body = parse(Assumptions.partial(), request.body, reply); if (!body) return reply;
    const assumptions = Assumptions.parse({...loaded.report.assumptions, ...body});
    const report = {...loaded.report, assumptions, totals: planningTotals(loaded.report.items, loaded.report.tokenCategories, assumptions)};
    await saveReport(store, blobs, report, loaded.record.projectId, loaded.record.extractionId, loaded.record.createdAt);
    return {assumptions, totals: report.totals, summary: summarize(report)};
  });

  // A reviewer confirms or overrides a mapping; the scan re-runs so decisions and totals follow.
  app.put('/v1/gapscans/:id/matches/:sourceId', async (request, reply) => {
    const {id, sourceId} = z.object({id: z.string().min(1), sourceId: z.string().min(1)}).parse(request.params);
    const loaded = await loadReport(id);
    if (!loaded) return fail(reply, 404, 'Report not found.');
    const body = parse(ApproveMatch, request.body, reply); if (!body) return reply;
    if (!loaded.report.items.some(i => i.match.sourceId === sourceId)) return fail(reply, 404, 'That component is not in this report.');
    await store.saveApproval({key: approvalKey(loaded.report.edsFingerprint, loaded.report.reference.id, sourceId), edsFingerprint: loaded.report.edsFingerprint,
      referenceId: loaded.report.reference.id, sourceId, targetId: body.targetId, by: body.by, reason: body.reason, at: new Date().toISOString()});
    const report = {id, ...await computeReport(store, blobs, loaded.record.extractionId, loaded.report.reference.id, loaded.report.assumptions)};
    await saveReport(store, blobs, report, loaded.record.projectId, loaded.record.extractionId, loaded.record.createdAt);
    return {item: report.items.find(i => i.match.sourceId === sourceId), totals: report.totals, summary: summarize(report)};
  });

  return app;
}
