import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {configFromEnv, createFsBlobStore, createInProcessQueue, createInfra, createLocalEventBus, createSqliteStore, NotConfiguredError} from '@gapscan/infra';
import type {JobEvent} from '@gapscan/schema';

async function setup(concurrency = 1) {
  const store = createSqliteStore(':memory:'), bus = createLocalEventBus(), queue = createInProcessQueue(store, bus, {concurrency});
  const project = await store.createProject('Acme');
  return {store, bus, queue, project};
}
const types = (events: JobEvent[]) => events.map(e => e.body.type);

test('blob keys cannot escape the blob root', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gapscan-blobs-'));
  try {
    const blobs = createFsBlobStore(dir);
    await blobs.put('sources/a.css', '.btn{}');
    assert.equal((await blobs.get('sources/a.css'))?.toString(), '.btn{}');
    assert.equal(await blobs.get('sources/missing.css'), null);
    await assert.rejects(blobs.put('../escape.txt', 'x'), /Unsafe blob key/);
    await assert.rejects(blobs.put('/etc/passwd', 'x'), /Unsafe blob key/);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('job events get gap-free per-job sequence numbers and replay after a cursor', async () => {
  const {store, project} = await setup();
  const job = await store.createJob({type: 'extract', projectId: project.id, payload: {}});
  for (let i = 0; i < 3; i++) await store.appendEvent(job.id, {type: 'progress', stage: 's', done: i, total: 3, message: ''});
  assert.deepEqual((await store.listEvents(job.id)).map(e => e.seq), [1, 2, 3]);
  assert.deepEqual((await store.listEvents(job.id, 2)).map(e => e.seq), [3]);
});

test('a job runs to completion and records progress then a terminal event', async () => {
  const {store, queue, project} = await setup();
  queue.register('extract', async ({progress}) => { await progress('parse', 1, 1, 'Parsed'); return {resultId: 'eds-1'}; });
  const job = await store.createJob({type: 'extract', projectId: project.id, payload: {}});
  await queue.enqueue(job);
  await queue.idle();
  assert.equal((await store.getJob(job.id))?.status, 'completed');
  assert.equal((await store.getJob(job.id))?.resultId, 'eds-1');
  assert.deepEqual(types(await store.listEvents(job.id)), ['progress', 'complete']);
});

test('handler errors become a failed job with a readable message', async () => {
  const {store, queue, project} = await setup();
  queue.register('extract', async () => { throw new Error('PDF is encrypted'); });
  const job = await store.createJob({type: 'extract', projectId: project.id, payload: {}});
  await queue.enqueue(job);
  await queue.idle();
  const failed = await store.getJob(job.id);
  assert.equal(failed?.status, 'failed');
  assert.equal(failed?.error?.message, 'PDF is encrypted');
});

test('cancelling stops a running job and removes a queued one', async () => {
  const {store, queue, project} = await setup(1);
  let started!: () => void;
  const running = new Promise<void>(resolve => { started = resolve; });
  queue.register('extract', ({signal}) => new Promise((_, reject) => {
    started();
    signal.addEventListener('abort', () => reject(signal.reason), {once: true});
  }));
  const first = await store.createJob({type: 'extract', projectId: project.id, payload: {}});
  const second = await store.createJob({type: 'extract', projectId: project.id, payload: {}});
  await queue.enqueue(first);
  await queue.enqueue(second);
  await running;
  assert.equal(await queue.cancel(second.id), true, 'queued job cancels');
  assert.equal(await queue.cancel(first.id), true, 'running job cancels');
  await queue.idle();
  assert.equal((await store.getJob(first.id))?.status, 'cancelled');
  assert.equal((await store.getJob(second.id))?.status, 'cancelled');
  assert.deepEqual(types(await store.listEvents(first.id)), ['cancelled']);
  assert.equal(await queue.cancel(first.id), false, 'a finished job cannot be cancelled again');
});

test('jobs interrupted by a restart are failed as retryable instead of left running', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'gapscan-infra-'));
  try {
    const first = await createInfra({...configFromEnv({}), dataDir});
    const project = await first.store.createProject('Acme');
    const job = await first.store.createJob({type: 'extract', projectId: project.id, payload: {}});
    await first.store.updateJob(job.id, {status: 'running'});
    await first.store.close();
    const second = await createInfra({...configFromEnv({}), dataDir});
    const recovered = await second.store.getJob(job.id);
    assert.equal(recovered?.status, 'failed');
    assert.equal(recovered?.error?.retryable, true);
    await second.close();
  } finally { await rm(dataDir, {recursive: true, force: true}); }
});

test('hosted adapters fail loudly until implemented', async () => {
  assert.throws(() => configFromEnv({GAPSCAN_STORE: 'mysql'}), /GAPSCAN_STORE/);
  await assert.rejects(createInfra({...configFromEnv({}), dataDir: join(tmpdir(), 'unused'), store: 'postgres'}), NotConfiguredError);
});
