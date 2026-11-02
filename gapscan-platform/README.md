# GapScan platform (Phases 1–5)

The TypeScript monorepo that replaces the prototype in `../gapscan`, following
the architecture plan. Phase 1 added the shared contracts, the single estimation
engine, the taxonomy, a job system and an API with live progress. Phase 2 makes
it extraction-first: websites, Figma, PDF, PowerPoint, Word, ZIP and code are
read by their own adapters and assembled into one `ExtractedDesignSystem`, with
a review screen. Phase 3 adds GapScan itself: a pinned reference library, component
matching, diffs priced with the shared rubric, and the executive dashboard with
before/after previews. Phase 4 adds hand-off exports (DTCG, CSS, Tailwind v4,
SCSS) and the missing-object generator (accessibility, guidelines, principles,
tooling, content, brand), with drafts that count only once approved. Phase 5
starts the asset engine: a brand kit and rendered business cards (print PDF
with bleed), OpenGraph images and social banners, each with its checks.

Requires Node 24+ (it runs TypeScript directly; there is no build step).

```bash
npm install
npx playwright install chromium   # only needed to read live websites
npm run check                     # typecheck + all tests
npm start                         # UI and API on http://127.0.0.1:4300
```

Open `http://127.0.0.1:4300/app/` to add sources, watch the extraction run and
review the result, then compare it against a reference system.

## Layout

| Path | What it is |
| --- | --- |
| `packages/schema` | zod contracts for every service: `SourceAsset`, `ExtractedDesignSystem`, `GapItem`, `GapScanReport`, `Job`, `JobEvent`… Types are inferred from the schemas. |
| `packages/estimate` | The only effort/cost/time implementation: 1–5 driver rubric, variant and uncertainty factors, token categories, hours-weighted complexity, quick wins and breaking changes. |
| `packages/taxonomy` | The 13-category reference tree and loss-free classification, ported from the prototype and checked against it. |
| `packages/normalize` | Colour science (sRGB/OKLCH/CIE Lab, CIEDE2000, WCAG contrast), colour clustering and role inference, tonal ramps, spacing grid, type scale fit, radius and elevation scales, multi-source merging with drift detection, confidence. |
| `packages/adapters` | One adapter per source type, all producing the same observations: rendered website (Playwright), Figma REST, PDF (pdf.js), PPTX and DOCX (in-memory OOXML), CSS/SCSS/Less and DTCG/Style Dictionary token JSON, and React/TypeScript components (props, variants, sizes and states read from props interfaces and `.d.ts` files with the TypeScript parser; nothing executed). Includes a hardened ZIP reader and a small XML reader. |
| `packages/extraction` | Assembles observations into tokens, scales, components and plain-language findings (near-duplicates, hard-coded values, off-scale values, declared-vs-observed drift, contrast failures, missing states, unresolved values, coverage gaps). |
| `packages/library` | Pinned reference systems: Bootstrap 5.3.3, Shopify Polaris 13.9.5, IBM Carbon `@carbon/styles` 1.68.0 and Bulma 1.0.2 from their published CSS (with previews), and MUI 6.4.7 and Ant Design 5.24.2 from their published `.d.ts` files (component APIs, no previews). All with checksums, by the same pipeline as user sources. `node packages/library/scripts/build.ts` rebuilds them. |
| `packages/gapscan` | Component matching (weighted 0–100 score; confirmed / suggested / unresolved), diffs into rubric drivers, decisions (keep / update / replace / check first / optional), token mapping, projected previews. Gains the target brings for free are shown but never priced. |
| `packages/exports` | Figma Variables sync planner (create / update / unchanged / skipped, with modes and aliases, bound to a plan hash) and token exporters from one canonical list: W3C DTCG `tokens.json` (with provenance in `$extensions`), CSS custom properties (with theme-mode blocks), Tailwind v4 `@theme`, SCSS. Unresolved values are never exported as known. |
| `packages/objects` | Missing-object generator. Each section is labelled extracted, inferred or drafted; contrast pairs come with fixes that pass; approvals are tied to a content hash and go stale if the content changes. No language model is called. |
| `packages/assets` | Brand kit from token slots (reports which slots fell back to defaults), self-contained templates (business card 85×55 mm + 3 mm bleed, OpenGraph 1200×630, LinkedIn banner, PowerPoint deck template with a branded theme, HTML email newsletter with dark mode), contrast checks, offline rendering in Chromium. |
| `packages/infra` | `Store`, `BlobStore`, `Queue` and `EventBus` interfaces with zero-install local adapters (Node's built-in SQLite, filesystem blobs, in-process queue). |
| `apps/api` | Fastify API and the extraction UI (`public/`): projects, sources, extraction jobs, SSE progress with resume, cancellation. |

## API

| Method and path | Purpose |
| --- | --- |
| `POST /v1/projects` `{name}` | Create a project |
| `GET /v1/projects/:id` | Project with its sources |
| `POST /v1/projects/:id/sources` | `{kind:"url", uri}` (website, or Figma when the host is figma.com), `{kind:"file", name, base64}` (.pptx, .docx, .pdf, .zip, CSS/SCSS/JSON/HTML; 40 MB) or `{kind:"code", name, content}`. Nothing is fetched or parsed at intake. |
| `POST /v1/projects/:id/extractions` | Starts an `extract` job → `202 {jobId, events}` |
| `GET /v1/jobs/:id` | Job status, result id or error |
| `GET /v1/jobs/:id/events` | Server-sent events. Send `Last-Event-ID` (or `?after=`) to resume; the stream ends after `complete`, `failed` or `cancelled`. |
| `DELETE /v1/jobs/:id` | Cancel a queued or running job |
| `GET /v1/extractions/:id` | Summary; `?include=full` returns the whole `ExtractedDesignSystem` |
| `GET /v1/extractions/:id/scales` | Colour clusters and roles, spacing grid, type scale, radii and elevation |
| `GET /v1/extractions/:id/export?format=dtcg\|css\|tailwind4\|scss` | Download a hand-off file (`&palette=1` adds inferred palette colours) |
| `POST /v1/extractions/:id/figma-sync/plan` `{fileUrl}` | Preview the variable changes for a Figma file (reads only) |
| `POST /v1/extractions/:id/figma-sync/apply` `{fileUrl, hash, confirm: true}` | Writes exactly the previewed plan; refused if anything changed |
| `GET /v1/extractions/:id/objects` | The six architectural objects with completeness and sections |
| `PUT /v1/extractions/:id/objects/:kind/sections/:sectionId/approval` `{by}` | Approve exactly the content shown |
| `GET /v1/templates`, `GET /v1/extractions/:id/brandkit` | Asset templates and the brand kit they read |
| `POST /v1/extractions/:id/assets` `{template, brandName?, data}` | Starts a `render` job |
| `GET /v1/assets/:jobId`, `GET /v1/assets/:jobId/file` | Checks and the rendered file (`?download=1` to save) |
| `GET /v1/library`, `GET /v1/library/:id` | Reference systems and their components |
| `GET /v1/extractions/:id/recommendations` | References ranked by how many of your components have a counterpart |
| `POST /v1/gapscans` `{edsId, referenceId, assumptions?}` | Starts a `gapscan` job |
| `GET /v1/gapscans/:id` | The report; `?include=tech` adds token and prop mappings |
| `PUT /v1/gapscans/:id/assumptions` | Recalculates totals on the server (rate, apps, engineers, QA %, exclusions, edits) |
| `PUT /v1/gapscans/:id/matches/:sourceId` `{targetId, by, reason}` | Reviewer approval; tied to the extraction fingerprint and reference version |
| `GET /v1/gapscans/:id/items/:itemId/projection` | Projected after-preview: the reference's CSS with your role colours |
| `GET /app/` | Source intake, live progress, review, recommendations and the GapScan dashboard |

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT`, `HOST` | `4300`, `127.0.0.1` | |
| `GAPSCAN_DATA_DIR` | `./.data` | SQLite database and blobs |
| `GAPSCAN_STORE` | `sqlite` | `postgres` is declared but not implemented yet and fails at startup |
| `GAPSCAN_QUEUE` | `in-process` | `bullmq` likewise |
| `GAPSCAN_BLOBS` | `fs` | `s3` likewise |
| `GAPSCAN_CONCURRENCY` | `2` | Jobs run at once |
| `GAPSCAN_MAX_PAGES` | `8` | Pages rendered per website source |
| `GAPSCAN_FIGMA_TOKEN` | unset | Personal access token for reading Figma files. Without it, Figma links are recorded as "not connected". Variables need a Figma plan with REST variable access; otherwise styles and usage are read. |
| `GAPSCAN_LEGACY_ENGINE` | `../gapscan/engine/` | The prototype extractor, still used for component inventories in code |

## How a website is read

Pages are rendered in headless Chromium at 1440, 768 and 375px and in dark mode
(dark mode is recorded only when the page actually changes). The crawl stays on
the start page's origin and section, and skips other documentation versions.
Every request the browser makes is checked against the same public-HTTPS policy
as intake; private addresses, media and downloads are blocked. Contrast is
measured per element against the background actually behind its text; text over
images, gradients or translucent layers is skipped rather than guessed.

## Current limits

- **The prototype bridge only reads markup now.** JS/TS components and all
  foundations are read natively; HTML and Markdown components still pass through
  `apps/api/src/legacy-bridge.ts`.
- **URL safety checks names and resolved addresses.** Every host the browser
  contacts must resolve only to public addresses (cached per job). The browser
  resolves names again itself, so a DNS-rebinding attack in between is not fully
  excluded; run rendering in a network sandbox without private routes when hosting
  for untrusted users.
- **Component states on websites** come from stylesheet rules for the
  component's classes (same-origin sheets only); states are not forced at
  runtime yet, and screenshots of specimens are not captured yet.
- **Image sources** (screenshots, mockups) are accepted but not sampled.
- **The in-process queue does not survive a restart.** Jobs that were queued or
  running are marked `failed` with `retryable: true` on the next start.
- **Previews are inferred.** "Before" examples from code apply your real CSS to
  generated markup; "after" previews apply the reference's CSS with your role
  colours swapped in. Both are labelled; neither is built or verified code.
- **Type-based references have no previews or tokens.** MUI is read from its
  declarations, so it compares APIs but has no "after" preview or role colours.
  Chakra and shadcn can be added the same way; Material 3 web
  components need a custom-element reader.
- **Drafted sections are templates, not writing.** Prose sections (principles,
  voice, keyboard behaviour) are deterministic drafts for a person to edit and
  approve; an LLM drafting step with citations is not wired in yet.
- **Print colour is RGB.** Business-card PDFs are RGB with bleed; CMYK conversion
  with an ICC profile, Pantone matching and PDF/X preflight are not done yet.
- **Decks use the brand fonts by name.** PowerPoint cannot carry a fallback stack;
  the deck's checks remind presenters to install or embed them.
- **Figma Variables need the right Figma plan.** Reading and writing variables
  through the REST API requires a plan with that access and edit rights on the
  file; otherwise the preview explains why it cannot proceed.
- **Not built yet:** Google Slides and swag specs.
