# GapScan platform (Phase 1 foundations)

The TypeScript monorepo that replaces the prototype in `../gapscan`, following
architecture Part 4. The prototype keeps running alongside it; this slice adds
the shared contracts, the single estimation engine, the taxonomy, a job system
and an API with live progress.

Requires Node 24+ (it runs TypeScript directly; there is no build step).

```bash
npm install
npm run check      # typecheck + all tests
npm start          # API on http://127.0.0.1:4300
```

## Layout

| Path | What it is |
| --- | --- |
| `packages/schema` | zod contracts for every service: `SourceAsset`, `ExtractedDesignSystem`, `GapItem`, `GapScanReport`, `Job`, `JobEvent`… Types are inferred from the schemas. |
| `packages/estimate` | The only effort/cost/time implementation: 1–5 driver rubric, variant and uncertainty factors, token categories, hours-weighted complexity, quick wins and breaking changes. |
| `packages/taxonomy` | The 13-category reference tree and loss-free classification, ported from the prototype and checked against it. |
| `packages/infra` | `Store`, `BlobStore`, `Queue` and `EventBus` interfaces with zero-install local adapters (Node's built-in SQLite, filesystem blobs, in-process queue). |
| `apps/api` | Fastify API: projects, sources, extraction jobs, SSE progress with resume, cancellation. |

## API

| Method and path | Purpose |
| --- | --- |
| `POST /v1/projects` `{name}` | Create a project |
| `GET /v1/projects/:id` | Project with its sources |
| `POST /v1/projects/:id/sources` | `{kind:"code", name, content}` or `{kind:"url", uri}`. URLs must be public HTTPS; nothing is fetched at intake. |
| `POST /v1/projects/:id/extractions` | Starts an `extract` job → `202 {jobId, events}` |
| `GET /v1/jobs/:id` | Job status, result id or error |
| `GET /v1/jobs/:id/events` | Server-sent events. Send `Last-Event-ID` (or `?after=`) to resume; the stream ends after `complete`, `failed` or `cancelled`. |
| `DELETE /v1/jobs/:id` | Cancel a queued or running job |
| `GET /v1/extractions/:id` | Summary; `?include=full` returns the whole `ExtractedDesignSystem` |

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT`, `HOST` | `4300`, `127.0.0.1` | |
| `GAPSCAN_DATA_DIR` | `./.data` | SQLite database and blobs |
| `GAPSCAN_STORE` | `sqlite` | `postgres` is declared but not implemented yet and fails at startup |
| `GAPSCAN_QUEUE` | `in-process` | `bullmq` likewise |
| `GAPSCAN_BLOBS` | `fs` | `s3` likewise |
| `GAPSCAN_CONCURRENCY` | `2` | Jobs run at once |
| `GAPSCAN_LEGACY_ENGINE` | `../gapscan/engine/` | Where the prototype's extractor lives (see below) |

## Current limits

- **Extraction reads pasted or uploaded code only.** It runs through
  `apps/api/src/legacy-bridge.ts`, which calls the prototype's deterministic
  extractor and maps its output onto the Part 1 schema. URL, Figma, PDF, PPTX,
  DOCX and image sources are accepted and stored, then reported as coverage gaps
  until Phase 2 adds native adapters.
- **The in-process queue does not survive a restart.** Jobs that were queued or
  running are marked `failed` with `retryable: true` on the next start.
- **GapScan comparison jobs, missing-object generation and asset rendering** are
  later phases. `packages/estimate` is ready for them and fully tested on its own.
