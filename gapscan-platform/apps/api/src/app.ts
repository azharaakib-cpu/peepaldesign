// HTTP surface from architecture Part 4. Long work is always a job: POST returns
// 202 with a job id, progress streams over SSE, and results are fetched by id.
import {createHash, randomUUID} from 'node:crypto';
import Fastify from 'fastify';
import type {FastifyReply} from 'fastify';
import {z} from 'zod';
import {ExtractedDesignSystem, TERMINAL_JOB_STATUSES} from '@gapscan/schema';
import type {JobEvent, JobType} from '@gapscan/schema';
import type {Infra, JobHandler} from '@gapscan/infra';
import {createExtractHandler} from './extract-job.ts';
import {publicUrl, UnsafeUrlError} from './url-safety.ts';

export const MAX_CODE_BYTES = 1_500_000;
const HEARTBEAT_MS = 15_000;

const CreateProjectBody = z.object({name: z.string().trim().min(1).max(200)});
const AddSourceBody = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('url'), uri: z.string().min(1).max(2048), consent: z.boolean().optional()}),
  z.object({kind: z.literal('code'), name: z.string().trim().min(1).max(200).regex(/^[\w .()-]+$/, 'Use letters, numbers, spaces, dots, dashes or underscores.'), content: z.string().min(1)}),
]);
const IdParams = z.object({id: z.string().min(1)});

export type AppOptions = {infra: Infra; handlers?: Partial<Record<JobType, JobHandler>>; logger?: boolean; heartbeatMs?: number};

export function buildApp({infra, handlers = {}, logger = false, heartbeatMs = HEARTBEAT_MS}: AppOptions) {
  const {store, blobs, bus, queue} = infra;
  queue.register('extract', handlers.extract ?? createExtractHandler({store, blobs}));
  const app = Fastify({logger, bodyLimit: MAX_CODE_BYTES * 2});
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
      const source = {id, projectId, kind: 'url' as const, uri: url.href, label: url.hostname, sha256: createHash('sha256').update(url.href).digest('hex'),
        bytes: 0, budget: {maxPages: 40, maxBytes: 20_000_000}, ...(body.consent !== undefined ? {consent: body.consent} : {}), createdAt};
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

  app.get('/v1/extractions/:id', async (request, reply) => {
    const record = await store.getExtraction(IdParams.parse(request.params).id);
    if (!record) return fail(reply, 404, 'Extraction not found.');
    if ((request.query as {include?: string}).include !== 'full') return record;
    const blob = await blobs.get(record.blobKey);
    return blob ? ExtractedDesignSystem.parse(JSON.parse(blob.toString('utf8'))) : fail(reply, 500, 'Stored extraction payload is missing.');
  });

  return app;
}
