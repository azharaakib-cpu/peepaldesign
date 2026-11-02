// Zero-install Store on Node's built-in SQLite. Synchronous under the hood but
// exposed through the async Store interface so Postgres can drop in later.
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {Job as JobSchema, JobEvent as JobEventSchema, Project as ProjectSchema, SourceAsset as SourceAssetSchema} from '@gapscan/schema';
import type {Job, JobEvent, JobEventBody, Project, SourceAsset} from '@gapscan/schema';
import type {ExtractionRecord, GapScanRecord, MatchApproval, Store} from './types.ts';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), data TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sources_project ON sources(project_id, created_at);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status);
CREATE TABLE IF NOT EXISTS job_events (job_id TEXT NOT NULL, seq INTEGER NOT NULL, at TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY (job_id, seq));
CREATE TABLE IF NOT EXISTS extractions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, version INTEGER NOT NULL, fingerprint TEXT NOT NULL,
  blob_key TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (project_id, version));
CREATE TABLE IF NOT EXISTS gapscans (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, extraction_id TEXT NOT NULL, reference_id TEXT NOT NULL, blob_key TEXT NOT NULL,
  summary TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS match_approvals (key TEXT PRIMARY KEY, eds_fingerprint TEXT NOT NULL, reference_id TEXT NOT NULL, source_id TEXT NOT NULL,
  target_id TEXT, approved_by TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS approvals_scope ON match_approvals(eds_fingerprint, reference_id);
`;

type Row = Record<string, unknown>;
const text = (row: Row | undefined, column: string) => String(row?.[column] ?? '');

export function createSqliteStore(path: string): Store {
  if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  const now = () => new Date().toISOString();
  const readJob = (row: Row | undefined) => row ? JobSchema.parse(JSON.parse(text(row, 'data'))) : null;
  const writeJob = (job: Job) => db.prepare('INSERT OR REPLACE INTO jobs (id, project_id, status, data) VALUES (?, ?, ?, ?)').run(job.id, job.projectId, job.status, JSON.stringify(job));
  const toEvent = (row: Row): JobEvent => JobEventSchema.parse({jobId: text(row, 'job_id'), seq: Number(row.seq), at: text(row, 'at'), body: JSON.parse(text(row, 'body'))});

  return {
    async createProject(name) {
      const project = ProjectSchema.parse({id: randomUUID(), name, createdAt: now()});
      db.prepare('INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)').run(project.id, project.name, project.createdAt);
      return project;
    },
    async getProject(id) {
      const row = db.prepare('SELECT id, name, created_at FROM projects WHERE id = ?').get(id) as Row | undefined;
      return row ? ProjectSchema.parse({id: text(row, 'id'), name: text(row, 'name'), createdAt: text(row, 'created_at')}) : null;
    },
    async addSource(source) {
      const parsed = SourceAssetSchema.parse(source);
      db.prepare('INSERT INTO sources (id, project_id, data, created_at) VALUES (?, ?, ?, ?)').run(parsed.id, parsed.projectId, JSON.stringify(parsed), parsed.createdAt);
    },
    async listSources(projectId) {
      const rows = db.prepare('SELECT data FROM sources WHERE project_id = ? ORDER BY created_at, rowid').all(projectId) as Row[];
      return rows.map(row => SourceAssetSchema.parse(JSON.parse(text(row, 'data'))) as SourceAsset);
    },
    async createJob({type, projectId, subjectId, payload}) {
      const at = now();
      const job = JobSchema.parse({id: randomUUID(), type, projectId, ...(subjectId ? {subjectId} : {}), status: 'queued', payload, createdAt: at, updatedAt: at});
      writeJob(job);
      return job;
    },
    async getJob(id) { return readJob(db.prepare('SELECT data FROM jobs WHERE id = ?').get(id) as Row | undefined); },
    async updateJob(id, patch) {
      const current = readJob(db.prepare('SELECT data FROM jobs WHERE id = ?').get(id) as Row | undefined);
      if (!current) throw new Error(`Job ${id} not found.`);
      const next = JobSchema.parse({...current, ...patch, updatedAt: now()});
      writeJob(next);
      return next;
    },
    async listUnfinishedJobs() {
      return (db.prepare("SELECT data FROM jobs WHERE status IN ('queued', 'running')").all() as Row[]).map(row => readJob(row)!);
    },
    async appendEvent(jobId, body: JobEventBody) {
      // Sequence numbers are per job and gap-free, so a client can resume from Last-Event-ID.
      const at = now();
      db.exec('BEGIN IMMEDIATE');
      try {
        const last = db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM job_events WHERE job_id = ?').get(jobId) as Row;
        const seq = Number(last.seq) + 1;
        db.prepare('INSERT INTO job_events (job_id, seq, at, body) VALUES (?, ?, ?, ?)').run(jobId, seq, at, JSON.stringify(body));
        db.exec('COMMIT');
        return JobEventSchema.parse({jobId, seq, at, body});
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    async listEvents(jobId, afterSeq = 0) {
      return (db.prepare('SELECT job_id, seq, at, body FROM job_events WHERE job_id = ? AND seq > ? ORDER BY seq').all(jobId, afterSeq) as Row[]).map(toEvent);
    },
    async saveExtraction(record: ExtractionRecord) {
      db.prepare('INSERT INTO extractions (id, project_id, version, fingerprint, blob_key, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(record.id, record.projectId, record.version, record.fingerprint, record.blobKey, JSON.stringify(record.summary), record.createdAt);
    },
    async getExtraction(id) {
      const row = db.prepare('SELECT * FROM extractions WHERE id = ?').get(id) as Row | undefined;
      return row ? {id: text(row, 'id'), projectId: text(row, 'project_id'), version: Number(row.version), fingerprint: text(row, 'fingerprint'),
        blobKey: text(row, 'blob_key'), summary: JSON.parse(text(row, 'summary')) as Record<string, unknown>, createdAt: text(row, 'created_at')} : null;
    },
    async latestExtractionVersion(projectId) {
      return Number((db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM extractions WHERE project_id = ?').get(projectId) as Row).version);
    },
    async saveGapScan(record: GapScanRecord) {
      db.prepare('INSERT OR REPLACE INTO gapscans (id, project_id, extraction_id, reference_id, blob_key, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(record.id, record.projectId, record.extractionId, record.referenceId, record.blobKey, JSON.stringify(record.summary), record.createdAt, record.updatedAt);
    },
    async getGapScan(id) {
      const row = db.prepare('SELECT * FROM gapscans WHERE id = ?').get(id) as Row | undefined;
      return row ? {id: text(row, 'id'), projectId: text(row, 'project_id'), extractionId: text(row, 'extraction_id'), referenceId: text(row, 'reference_id'), blobKey: text(row, 'blob_key'),
        summary: JSON.parse(text(row, 'summary')) as Record<string, unknown>, createdAt: text(row, 'created_at'), updatedAt: text(row, 'updated_at')} : null;
    },
    async saveApproval(a: MatchApproval) {
      db.prepare('INSERT OR REPLACE INTO match_approvals (key, eds_fingerprint, reference_id, source_id, target_id, approved_by, reason, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(a.key, a.edsFingerprint, a.referenceId, a.sourceId, a.targetId, a.by, a.reason, a.at);
    },
    async listApprovals(edsFingerprint, referenceId) {
      return (db.prepare('SELECT * FROM match_approvals WHERE eds_fingerprint = ? AND reference_id = ? ORDER BY at').all(edsFingerprint, referenceId) as Row[]).map(row => ({
        key: text(row, 'key'), edsFingerprint: text(row, 'eds_fingerprint'), referenceId: text(row, 'reference_id'), sourceId: text(row, 'source_id'),
        targetId: row.target_id === null ? null : text(row, 'target_id'), by: text(row, 'approved_by'), reason: text(row, 'reason'), at: text(row, 'at')}));
    },
    async close() { db.close(); },
  };
}
