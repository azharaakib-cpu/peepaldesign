import {join} from 'node:path';
import type {BlobStore, EventBus, Queue, Store} from './types.ts';
import {NotConfiguredError} from './types.ts';
import {createSqliteStore} from './sqlite-store.ts';
import {createFsBlobStore, createInProcessQueue, createLocalEventBus, recordEvent} from './local.ts';

export * from './types.ts';
export {createSqliteStore} from './sqlite-store.ts';
export {createFsBlobStore, createInProcessQueue, createLocalEventBus, recordEvent} from './local.ts';

export type InfraConfig = {
  dataDir: string;
  store: 'sqlite' | 'postgres';
  queue: 'in-process' | 'bullmq';
  blobs: 'fs' | 's3';
  concurrency: number;
};
export type Infra = {store: Store; blobs: BlobStore; bus: EventBus; queue: Queue; close(): Promise<void>};

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): InfraConfig {
  const pick = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T, name: string): T => {
    if (value === undefined || value === '') return fallback;
    if (!(allowed as readonly string[]).includes(value)) throw new Error(`${name} must be one of ${allowed.join(', ')}.`);
    return value as T;
  };
  return {
    dataDir: env.GAPSCAN_DATA_DIR || join(process.cwd(), '.data'),
    store: pick(env.GAPSCAN_STORE, ['sqlite', 'postgres'], 'sqlite', 'GAPSCAN_STORE'),
    queue: pick(env.GAPSCAN_QUEUE, ['in-process', 'bullmq'], 'in-process', 'GAPSCAN_QUEUE'),
    blobs: pick(env.GAPSCAN_BLOBS, ['fs', 's3'], 'fs', 'GAPSCAN_BLOBS'),
    concurrency: Math.max(1, Number(env.GAPSCAN_CONCURRENCY) || 2),
  };
}

// Hosted adapters share the interfaces above; they are deliberately not wired yet
// so a misconfigured deployment fails at startup instead of silently using local storage.
const notConfigured = (what: string, setting: string): never => {
  throw new NotConfiguredError(`${what} adapter is not implemented yet. Use ${setting} or add it in packages/infra/src/index.ts.`);
};

export async function createInfra(config: InfraConfig): Promise<Infra> {
  const store = config.store === 'sqlite' ? createSqliteStore(join(config.dataDir, 'gapscan.sqlite')) : notConfigured('Postgres store', 'GAPSCAN_STORE=sqlite');
  const blobs = config.blobs === 'fs' ? createFsBlobStore(join(config.dataDir, 'blobs')) : notConfigured('S3 blob', 'GAPSCAN_BLOBS=fs');
  const bus = createLocalEventBus();
  const queue = config.queue === 'in-process' ? createInProcessQueue(store, bus, {concurrency: config.concurrency}) : notConfigured('BullMQ queue', 'GAPSCAN_QUEUE=in-process');

  // An in-process queue loses work on restart. Say so on the job rather than
  // leaving it "running" forever; the client can resubmit.
  for (const job of await store.listUnfinishedJobs()) {
    const error = {code: 'interrupted', message: 'The server restarted before this job finished. Submit it again.', retryable: true};
    await store.updateJob(job.id, {status: 'failed', error});
    await recordEvent(store, bus, job.id, {type: 'failed', ...error});
  }
  return {store, blobs, bus, queue, async close() { await queue.close(); await store.close(); }};
}
