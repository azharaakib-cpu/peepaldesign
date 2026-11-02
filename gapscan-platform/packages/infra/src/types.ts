// Ports the services depend on. Local adapters (SQLite, in-process queue,
// filesystem blobs) run with zero installs; Postgres, BullMQ and S3 adapters
// implement the same interfaces for hosting.
import type {Job, JobEvent, JobEventBody, JobStatus, JobType, Project, SourceAsset} from '@gapscan/schema';

export type ExtractionRecord = {
  id: string; projectId: string; version: number; fingerprint: string;
  blobKey: string; summary: Record<string, unknown>; createdAt: string;
};

export interface Store {
  createProject(name: string): Promise<Project>;
  getProject(id: string): Promise<Project | null>;
  addSource(source: SourceAsset): Promise<void>;
  listSources(projectId: string): Promise<SourceAsset[]>;
  createJob(input: {type: JobType; projectId: string; subjectId?: string; payload: Record<string, unknown>}): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, patch: {status?: JobStatus; resultId?: string; error?: Job['error']}): Promise<Job>;
  // Jobs left queued or running by a previous process; the caller decides their fate.
  listUnfinishedJobs(): Promise<Job[]>;
  appendEvent(jobId: string, body: JobEventBody): Promise<JobEvent>;
  listEvents(jobId: string, afterSeq?: number): Promise<JobEvent[]>;
  saveExtraction(record: ExtractionRecord): Promise<void>;
  getExtraction(id: string): Promise<ExtractionRecord | null>;
  latestExtractionVersion(projectId: string): Promise<number>;
  close(): Promise<void>;
}

export interface BlobStore {
  put(key: string, data: string | Uint8Array): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export type JobListener = (event: JobEvent) => void;
export interface EventBus {
  publish(event: JobEvent): void;
  subscribe(jobId: string, listener: JobListener): () => void;
}

export type JobContext = {
  job: Job;
  signal: AbortSignal;
  progress(stage: string, done: number, total: number, message: string): Promise<void>;
  warn(message: string): Promise<void>;
};
export type JobHandler = (context: JobContext) => Promise<{resultId: string}>;

export interface Queue {
  register(type: JobType, handler: JobHandler): void;
  enqueue(job: Job): Promise<void>;
  // True when the job was queued or running and is now being cancelled.
  cancel(jobId: string): Promise<boolean>;
  // Resolves once no job is queued or running (tests and graceful shutdown).
  idle(): Promise<void>;
  close(): Promise<void>;
}

export class NotConfiguredError extends Error {
  constructor(message: string) { super(message); this.name = 'NotConfiguredError'; }
}
