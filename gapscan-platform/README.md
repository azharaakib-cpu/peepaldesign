# GapScan platform (Phases 1–9)

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
Phase 6 adds application impact: scan the product's own code to count where each
component is used, leave unused components out and price the call sites to update.
Phase 7 adds codemods: the renames a report found become rules, dry-run on the
application's code as a reviewable diff, and the same rewriter is downloadable as a
script you run in your own repository.
Phase 8 adds hosted infrastructure: a Postgres store, a Postgres job queue that any
number of instances share, cross-instance live progress, and S3-compatible object
storage. Local mode still needs nothing installed. Phase 9 adds accounts: sign-in by
emailed magic link, private projects, and owners who invite people as owners or editors.

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
| `packages/library` | Pinned reference systems: Bootstrap 5.3.3, Shopify Polaris 13.9.5, IBM Carbon `@carbon/styles` 1.68.0 and Bulma 1.0.2 from their published CSS (with previews), MUI 6.4.7, Ant Design 5.24.2 and Fluent 2 (`@fluentui/react-components` 9.74.10) from their published `.d.ts` files, and Material Design 3 from `@material/web` 2.3.0 web components (each tag a style variant). Type-based references compare APIs only: no previews or role colours, and no conclusions about hover or focus styling, or about native attributes (disabled, required…) a component inherits without declaring. Compound parts (DialogTitle, TableRow…) belong to their component and are not listed separately. All with checksums, by the same pipeline as user sources. `node packages/library/scripts/build.ts` rebuilds them. |
| `packages/gapscan` | Component matching (weighted 0–100 score; confirmed / suggested / unresolved), diffs into rubric drivers, decisions (keep / update / replace / check first / optional), token mapping, projected previews. Gains the target brings for free are shown but never priced. |
| `packages/exports` | Figma Variables sync planner (create / update / unchanged / skipped, with modes and aliases, bound to a plan hash) and token exporters from one canonical list: W3C DTCG `tokens.json` (with provenance in `$extensions`), CSS custom properties (with theme-mode blocks), Tailwind v4 `@theme`, SCSS. Unresolved values are never exported as known. |
| `packages/objects` | Missing-object generator. Each section is labelled extracted, inferred or drafted; contrast pairs come with fixes that pass; approvals are tied to a content hash and go stale if the content changes. No language model is called. |
| `packages/assets` | Brand kit from token slots (reports which slots fell back to defaults), self-contained templates (business card 85×55 mm + 3 mm bleed, OpenGraph 1200×630, LinkedIn banner, PowerPoint deck template with a branded theme, HTML email newsletter with dark mode), contrast checks, offline rendering in Chromium. |
| `packages/usage` | Application impact: JSX usages through import aliases (with the props each passes), class names in markup and HTML, custom-element tags, files and screens per component. Tests, dependencies and docs are skipped. |
| `packages/codemod` | Rules from a GapScan report (confirmed matches only): imports re-pointed at the reference's package, prop renames, option values paired exactly as the report pairs them, and class renames for CSS references with a known modifier convention (Bootstrap, Carbon, Bulma). Each element is edited all or nothing; spreads, computed values, props with no equivalent, values the target prop means differently (`type="submit"` in Ant Design) and use outside JSX are listed for a person. The downloadable script embeds the same rewriter and diff code, so it makes exactly the dry-run changes. |
| `packages/infra` | `Store`, `BlobStore`, `Queue` and `EventBus` interfaces. Zero-install local adapters (Node's built-in SQLite, filesystem blobs, in-process queue) and hosted ones: Postgres store with numbered migrations, a Postgres job queue shared by all instances, a cross-instance event bus (LISTEN/NOTIFY plus polling), and an S3-compatible blob store with its own SigV4 signing (checked against AWS's published examples). |
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
| `POST /v1/projects/:id/sources` with `role: "application"` | Add the product's code (pasted, ZIP, or a public `github.com` repository) |
| `POST /v1/projects/:id/usage` `{edsId}`, `GET /v1/projects/:id/usage` | Scan usage and read the latest report; GapScan picks it up automatically |
| `GET /v1/gapscans/:id/codemod/rules` | The rules, their hash and what changes by hand (no application code needed) |
| `POST /v1/gapscans/:id/codemod`, `GET /v1/gapscans/:id/codemod` | Dry-run the rules on the application sources (a `codemod` job) and read the per-file diffs |
| `GET /v1/gapscans/:id/codemod.mjs` | The script: `node gapscan-codemod.mjs [paths…]` prints the diff; `--write` applies it. Uses the project's own `typescript` package. |
| `POST /v1/auth/link` `{email}` | Emails a single-use sign-in link (15 minutes). Same answer whether or not the address can sign in; 5 links per address and 20 requests per IP per 15 minutes. |
| `POST /v1/auth/session` `{token}`, `GET /v1/auth/me`, `POST /v1/auth/logout` | Exchange the link's token for a session cookie (30 days, HttpOnly, SameSite=Lax), read it, end it |
| `GET /v1/projects` | Projects you are a member of |
| `GET`/`POST /v1/projects/:id/members`, `DELETE /v1/projects/:id/members/:userId` | People on a project; owners invite (`{email, role}`, emailed) and remove; the last owner stays |
| `GET /v1/extractions/:id/design-system`, `…/design-system.html` | The extraction laid out like a Figma library (colour ramps, text styles, spacing, radius, effects, components with variants), as JSON or a self-contained page with no scripts |
| `GET /v1/extractions/:id/figma-export.json`, `GET /v1/figma-plugin.zip` | Export to Figma, on request: a build plan, and the GapScan Importer plugin that applies it inside a Figma file you choose. GapScan never writes to Figma itself. |
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
| `GAPSCAN_DATA_DIR` | `./.data` | SQLite database and blobs (local mode) |
| `GAPSCAN_STORE` | `sqlite` | `postgres` with `GAPSCAN_DATABASE_URL` (or `DATABASE_URL`). Migrations run at startup under an advisory lock. |
| `GAPSCAN_QUEUE` | `in-process`, or `postgres` with a Postgres store | The Postgres queue is shared by every instance: one claim per job (`FOR UPDATE SKIP LOCKED`), heartbeats, and a job whose worker stops is failed as retryable after 60 s |
| `GAPSCAN_BLOBS` | `fs` | `s3` with `GAPSCAN_S3_BUCKET`, `GAPSCAN_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and `AWS_SESSION_TOKEN`). `GAPSCAN_S3_ENDPOINT` and `GAPSCAN_S3_PATH_STYLE=1` for R2 or MinIO; `GAPSCAN_S3_PREFIX` to share a bucket. |
| `GAPSCAN_CONCURRENCY` | `2` | Jobs this instance runs at once. With the Postgres queue, `0` makes an API-only instance. |
| `GAPSCAN_AUTH` | `off` locally; required when hosted | `magic-link` turns on accounts. Hosted mode (Postgres) refuses to start until this is set, so a deployment can't go out open by accident; `off` is allowed when you put it behind your own sign-in. |
| `GAPSCAN_PUBLIC_URL` | unset | The address people open (`https://gapscan.example.com`). Used for sign-in links, the cross-site check and the `Secure` cookie flag. |
| `GAPSCAN_MAIL` | `log` locally, `smtp` hosted | `smtp` with `GAPSCAN_SMTP_URL` (for example `smtps://user:pass@smtp.postmarkapp.com:465`) and `GAPSCAN_MAIL_FROM`. `log` prints links to the server console and is refused when hosted. |
| `GAPSCAN_AUTH_DOMAINS` | unset (anyone) | Comma-separated email domains that can create an account. Others can still sign in once an owner invites them. |
| `GAPSCAN_MAX_PAGES` | `8` | Pages rendered per website source |
| `GAPSCAN_FIGMA_TOKEN` | unset | Personal access token for reading Figma files. Without it, Figma links are recorded as "not connected". Variables need a Figma plan with REST variable access; otherwise styles and usage are read. |
| `GAPSCAN_LEGACY_ENGINE` | `../gapscan/engine/` | The prototype extractor, still used for component inventories in code |

## Hosting

Run the same `npm start` everywhere; the settings decide each instance's role:

```bash
# API instances (behind a load balancer; GET /healthz checks the database)
GAPSCAN_STORE=postgres GAPSCAN_DATABASE_URL=… GAPSCAN_BLOBS=s3 … GAPSCAN_CONCURRENCY=0 npm start
# Worker instances (need Chromium for websites and assets: npx playwright install chromium)
GAPSCAN_STORE=postgres GAPSCAN_DATABASE_URL=… GAPSCAN_BLOBS=s3 … GAPSCAN_CONCURRENCY=4 npm start
```

Progress streams from any API instance: events are stored in Postgres and announced
with `LISTEN/NOTIFY`, and subscribers also poll, so a missed notification only delays
an event, never loses it. Error messages name a missing setting, never its value; S3
keys only ever go into the request signature. Run workers somewhere with no route to
private services; the browser's own egress is already pinned to vetted public addresses
(see Current limits).

## Accounts

With `GAPSCAN_AUTH=magic-link`, people sign in with a link emailed to them; there are no
passwords. The link carries its token in the URL fragment, which browsers never send to a
server, so it can't land in access logs, and the sign-in page asks for a click before
using it, so email scanners that open links can't spend it. Tokens and session ids are
stored only as SHA-256 hashes.

Every project is private to its members. Each API route has an access rule in
`apps/api/src/auth.ts` (public, any signed-in person, project member, or project owner);
a route without one stops the server from starting. A project you aren't on answers
"not found", exactly like one that doesn't exist. Requests that change things must come
from GapScan's own pages (checked by `Origin`). Approvals record the signed-in person's
email rather than a typed name.

## Export to Figma

After an extraction, the review page offers **Export to Figma** (optional). It downloads a
`.figma.json` build plan: primitives from the site's declared colour variables (with their CSS
names as code syntax), semantic colours aliased to them, spacing and radius variables, text and
effect styles, and one component set per component with a variant per appearance, bound to those
variables. The **GapScan Importer** plugin (`apps/figma-plugin`, also served as a zip) applies it
in whichever Figma file you open it in: Plugins → Development → Import plugin from manifest once,
then run it and choose the file. It fetches nothing, re-runs update variables and styles by name,
and existing component sets are left alone. When the site's typeface isn't installed for Figma,
styles use a similar sans and say so.

## How a website is read

Pages are rendered in headless Chromium at 1440, 768 and 375px and in dark mode
(dark mode is recorded only when the page actually changes). The crawl stays on
the start page's origin and section, and skips other documentation versions.
Component names come from semantic elements (button, input, table…) and from the names builds
leave in class names: styled-components (`ArtistTile-sc-1w4yhde-4`), CSS modules
(`Button_root__a1B2c`, `nav-bar_root__x1y2z`) and Emotion labels; layout wrappers are skipped.
Each component's instances are grouped by their computed styles into variants (primary, secondary,
outline, ghost…) and sizes. Utility-class sites (Tailwind) carry no component names, so only
semantic elements are found there. Spacing ignores layout widths over 128px and one-off values;
invisible shadow layers are dropped; declared colour variables become ramps and sets, without
framework internals or compiler-generated names.

Every request the browser makes is checked against the same public-HTTPS policy
as intake; private addresses, media and downloads are blocked. The browser doesn't
resolve names itself: its traffic goes through GapScan's egress proxy, which connects
only to the public address it vetted for each host. Asset rendering gets a proxy that
refuses everything. Contrast is
measured per element against the background actually behind its text; text over
images, gradients or translucent layers is skipped rather than guessed.

## Current limits

- **The prototype bridge only reads markup now.** JS/TS components and all
  foundations are read natively; HTML and Markdown components still pass through
  `apps/api/src/legacy-bridge.ts`.
- **The renderer's network is pinned, not isolated.** Chromium sends every request
  through an in-process proxy that resolves each host once, requires every address to
  be public, and connects to exactly that address (HTTPS on 443 only; loopback is not
  exempt; WebRTC and QUIC can't go around it). That closes DNS rebinding. It is not an
  operating-system sandbox: for untrusted users, also run workers where the network
  has no route to private services.
- **Component states on websites** come from stylesheet rules for the
  component's classes (same-origin sheets only); states are not forced at
  runtime yet, and screenshots of specimens are not captured yet.
- **Image sources** (screenshots, mockups) are accepted but not sampled.
- **The in-process queue does not survive a restart.** Jobs that were queued or
  running are marked `failed` with `retryable: true` on the next start. The
  Postgres queue does not have this problem; a job interrupted by a shutdown is
  failed as retryable rather than reported as cancelled.
- **Postgres is tested in-process.** The adapters run against PostgreSQL 18 in
  PGlite, and the `pg` driver path over the wire protocol through PGlite's socket
  server. Contention between separate machines (SKIP LOCKED claims, cross-connection
  notifications) follows standard Postgres semantics but has not been load-tested
  against a real server.
- **Accounts are email-only.** No SSO, no organisation-wide admin, and roles are
  per project (owner or editor). Sign-in requests are rate-limited per instance, not
  across instances.
- **Previews are inferred.** "Before" examples from code apply your real CSS to
  generated markup; "after" previews apply the reference's CSS with your role
  colours swapped in. Both are labelled; neither is built or verified code.
- **Type-based references have no previews or tokens.** MUI is read from its
  declarations, so it compares APIs but has no "after" preview or role colours.
  Chakra's v3 types are generated per recipe and need their own reader; shadcn has no
  published package to read (its components are copied into each project).
- **Codemods cover renames, not redesigns.** JSX in `.js/.jsx/.ts/.tsx` and class
  attributes in markup are rewritten; Vue and Svelte templates only have their class
  attributes rewritten. Web-component targets (Material Web) and Polaris are listed
  for a person rather than guessed. A prop the reference declares no counterpart for
  (MUI's `startIcon` → Ant Design's `icon` + `iconPosition`) stays manual. Codemods can target MUI, Ant Design and Fluent 2 imports.
- **Drafted sections are templates, not writing.** Prose sections (principles,
  voice, keyboard behaviour) are deterministic drafts for a person to edit and
  approve; an LLM drafting step with citations is not wired in yet.
- **Usage is a static scan.** It finds components by name, import alias and class;
  dynamic patterns (components chosen at runtime, class names built in code) are
  not counted, and screens are recognised by common routing conventions. Only
  public GitHub repositories can be fetched; private code must be uploaded as a ZIP.
- **Print colour is RGB.** Business-card PDFs are RGB with bleed; CMYK conversion
  with an ICC profile, Pantone matching and PDF/X preflight are not done yet.
- **Decks use the brand fonts by name.** PowerPoint cannot carry a fallback stack;
  the deck's checks remind presenters to install or embed them.
- **Figma Variables need the right Figma plan.** Reading and writing variables
  through the REST API requires a plan with that access and edit rights on the
  file; otherwise the preview explains why it cannot proceed.
- **Not built yet:** Google Slides and swag specs.
