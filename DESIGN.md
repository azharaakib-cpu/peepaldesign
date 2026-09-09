---
name: Peepal Design — The Contact Sheet
description: A darkroom-black contact sheet where insight is the frame you circle, not the light you shine.
colors:
  void: "#060607"
  stock: "#0B0B0C"
  bed: "#121214"
  bed-2: "#17171A"
  silver-50: "#F4F3F0"
  silver-200: "#D3D2CD"
  silver-400: "#A8A79F"
  silver-600: "#87867F"
  mark: "#29ABE2"
  mark-hot: "#5FC6EE"
  mark-deep: "#137FB4"
  on-mark: "#04202B"
  cold: "#DAD9D3"
  lightbox: "#4FC3E8"
  lightbox-lift: "#8FDCF4"
  rule: "rgba(244,243,240,.11)"
  rule-strong: "rgba(244,243,240,.20)"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 6rem)"
    fontWeight: 640
    lineHeight: 0.97
    letterSpacing: "-0.045em"
  heading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 3.3rem)"
    fontWeight: 640
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  card-title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 620
    lineHeight: 1.18
    letterSpacing: "-0.03em"
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.4vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body-small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  micro:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 620
    lineHeight: 1.4
    letterSpacing: "normal"
  wordmark:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  edge-code:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 640
    lineHeight: 1.2
    letterSpacing: "0.2em"
  stamp:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 640
    lineHeight: 1.7
    letterSpacing: "0.18em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  edge-num:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 640
    lineHeight: 1.2
    letterSpacing: "0.2em"
  counter:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 2.7vw, 2.3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
rounded:
  none: "0px"
  hairline: "2px"
  pip: "50%"
spacing:
  xs: "8px"
  sm: "14px"
  md: "22px"
  lg: "34px"
  gutter: "clamp(20px, 4vw, 64px)"
  section: "clamp(60px, 7vw, 112px)"
components:
  button-primary:
    backgroundColor: "{colors.mark}"
    textColor: "{colors.on-mark}"
    rounded: "{rounded.hairline}"
    padding: "13px 26px"
  button-primary-hover:
    backgroundColor: "{colors.silver-50}"
    textColor: "{colors.on-mark}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.silver-50}"
    rounded: "{rounded.hairline}"
    padding: "13px 26px"
  button-ghost-hover:
    backgroundColor: "{colors.silver-50}"
    textColor: "{colors.stock}"
  plate:
    backgroundColor: "{colors.stock}"
    rounded: "{rounded.none}"
  plate-hover:
    backgroundColor: "{colors.bed}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.silver-400}"
    rounded: "{rounded.none}"
    padding: "8px 15px"
---

# Design

## Overview

The surface is a photographic contact sheet read in a darkroom. The governing idea is that **insight is selection, not illumination**: a researcher shoots everything and circles the one frame that mattered. Every repeating set in the product — case studies, service lines, testimonials, cities, questions — is rendered as a set of frames on a sheet, and the interface's job is to help you pick one.

This is a Persuade surface. A buyer comparing agencies must see evidence rather than adjectives within one viewport.

Dark is not a style choice here; it is the room. The ground is the unexposed border of a sheet, so every lighter value on the page reads as exposure.

## Colors

Strategy: **Restrained**. Neutrals (a silver-gelatin gray ramp on darkroom black) carry the entire page, with a single accent rationed to one meaning. *This was originally restrained-plus-flood, the accent spent all at once on a closing section that flooded to `lightbox` at page scale. The client has since taken that section dark, so the flood is gone and the page stays in the darkroom end to end — the accent now has no release point, which is worth knowing if the closing fold ever feels like it lacks arrival.*

**`mark` (#29ABE2) is the brand colour, and it enters the world as non-photo blue** — the light blue pencil used to mark up contact sheets and prepress boards, chosen historically because the camera does not reproduce it. That grounding is what keeps a client-mandated cyan from reading as generic tech-brand accent: on this page it is a marking instrument, and it carries a true line for the studio — *the mark that guides the work and never shows up in the finished image.*

> `mark` is confirmed: the client's supplied logo artwork at `assets/brand/logomark.svg` uses `#29ABE2` exactly. `mark-hot`, `mark-deep` and `lightbox` are derived tints and shades of it.

The palette has two sides that map to the brand line "human + AI":

- **`mark` (#29ABE2)** — the human hand. The pencil.
- **`cold` (#DAD9D3)** — the machine-made side: the "AI" token, the map's dot matrix, analytic artwork. Deliberately **neutral**, not blue-tinted, so the marked side stays distinguishable from the machine side now that the accent is itself cool.

**The reservation rule is the system's load-bearing constraint.** `mark` is only ever one of three things:

1. a mark a hand made to select something — the hover circle, the frame number of the section you are in, a circled city, the open question, an arc drawn between studios;
2. a primary action; or
3. the identity itself (logo mark and wordmark). A logo is allowed to simply be the logo.

It is never chrome. Footer link underlines, social-icon hover, client labels and tags all stay silver specifically so the hover circle lands. Spraying the accent across decoration is the failure mode this world is most prone to, and it is what the reservation rule exists to prevent.

Contrast is verified against every ground the page actually uses (`stock`, `bed`, `bed-2`, `void`), not just the darkest one — an earlier `silver-600` of `#66655F` passed nowhere at 3.4:1 while carrying edge codes, tags, stat labels and footer copy.

| | stock | bed | bed-2 | void |
|---|---|---|---|---|
| `silver-200` | 12.99 | 12.36 | 11.82 | 13.38 |
| `silver-400` | 8.14 | 7.75 | 7.41 | 8.38 |
| `silver-600` | 5.38 | 5.12 | 4.90 | 5.54 |
| `mark` | 7.51 | 7.14 | 6.83 | 7.73 |

On the light table — now mixed 52% toward `silver-50`, so a paler ground than the original flood — `on-mark` (#04202B) runs 10.99:1 and the 78%-alpha body ink 6.33:1; on a `mark` button, 6.43:1.

## Typography

One family, **Archivo variable** (self-hosted, woff2, weight 100–900 and width 62–125%), carrying everything the visitor reads — the width axis does the work a second family usually does. The only exception is `code`, a system mono stack used for literal code identifiers in the developer-facing scheduling fallback, which no visitor sees.

Ramp:

| Role | Size | Weight | Width | Tracking |
|---|---|---|---|---|
| Display (h1) | `clamp(2.5rem, 7vw, 6rem)` | 640 | 100% | -0.045em |
| Section heading | `clamp(1.9rem, 4vw, 3.3rem)` | 640 | 100% | -0.035em |
| Card title | 1.1875–1.25rem | 620 | 100% | -0.03em |
| Body | 1.0625rem / 1.65 | 400 | 100% | normal |
| Small body | 0.9375rem / 1.6 | 400 | 100% | normal |
| **Edge code** | 0.6875rem | 640 | **66%** | **0.2em**, uppercase |
| Counter numeral | `clamp(1.6rem, 2.7vw, 2.3rem)` | 700 | 70% | -0.02em, tabular |

`stamp` (0.5625rem) is the smallest step — frame numbers on plates, the map's studio codes, the "placeholder" labels. `code` is the only non-Archivo face in the system and exists for exactly one thing: literal code identifiers in the developer-facing scheduling fallback. It is never decoration; the Don'ts below still bar monospace as a "technical" costume.

**Edge-code caps** are the system's signature lettering: condensed, heavily tracked, uppercase, tabular. They stand for anything the film itself would have stamped — section labels, frame numbers, tags, city names, footer column heads. Italic is reserved for the second clause of a heading, as an emphasis step below color.

Measure is capped at 56–68ch on body copy and 60ch on ledes.

## Layout

Content sits in a single `1240px` max-width column with a `clamp(20px, 4vw, 64px)` gutter, edge to edge. There is no persistent chrome in the margins.

> An earlier build ran a fixed 88px sprocket rail down the left edge — perforation holes that advanced on scroll, plus a sticky frame counter and vertical edge codes. **It was removed at the client's request and must not be reintroduced.** The section labels it carried are approved copy, so they were preserved as the horizontal edge-code stamp below.

**Grids size themselves rather than pad.** Because the 1px gutters between frames are drawn as a background showing through a `gap`, any horizontal padding on the grid would bleed rule-color into the page margin. Frame grids therefore use `width: calc(100% - var(--gut) * 2)` with `margin-inline: auto` and zero padding.

Breakpoints: 1180px (4-up frame grids → 2-up), 1080px (nav → burger), 980px (testimonials → 1-up), 820px, 620px (all grids → 1-up).

Section rhythm is `clamp(88px, 11vw, 168px)` block padding, with more space above a heading than below it.

## Elevation & Depth

Depth is photographic, not material. There is no card-shadow system.

- **Print shadow** (`0 24px 48px -20px rgba(0,0,0,.85), 0 4px 12px -4px rgba(0,0,0,.6)`) — offset and softly blurred, used only where a print physically sits above the sheet (testimonials, dropdowns).
- **Exposure** is the real depth cue: unselected frames sit at `grayscale(.82) contrast(.86) brightness(.58)`; the selected one comes to full tone.
- **Grain** — a fixed `feTurbulence` layer at 7.5% on `mix-blend-mode: screen`. Screen is required; `overlay` against a near-black ground is close to a no-op.
- **Halftone** — a 3px radial-gradient dot screen multiplied over every plate, lifting to 28% on hover as the frame develops.
- **Vignette** — a radial falloff on each plate and across the hero, so frames darken at their edges the way a real print does.

## Shapes

Corners are square. `2px` is the only radius in the system and belongs to buttons and focus rings; `50%` exists solely for the 5px city pip. Rounded rectangles are foreign to this world — a frame has corners.

Rules are 1px at `rule` (11% white) and mark gutters, section boundaries and metadata separators. The only heavier lines on the page are drawn marks.

**Marks are drawn SVG with `vector-effect: non-scaling-stroke`, never a font and never an icon-library glyph.** The hand-drawn circle deliberately overshoots its start point and carries a sine-based wobble, because a hand does not close a circle cleanly.

## Components

- **Plate (case-study frame)** — 4:3 aspect matching its artwork viewBox, stamped frame number (`12A · 04`) top-left, halftone + vignette, meta block below a hairline. On hover: full tone, art scales 1.04→1.10, inner artwork parallaxes 8px, the non-photo-blue circle draws itself over ~1s, and **every sibling frame drops to 38% opacity**. The sibling dimming is not decoration; it is the thesis.
- **Slot (service)** — flat frame in a 1px-gutter strip; icon lifts and turns to `mark` on hover while a hand-drawn `mark` rule strokes on beneath the text.
- **Voice (testimonial)** — **one panel, no photograph.** The client asked for testimonials that carry no user pictures, so the portrait plate and the separate client-mark cell were both removed and the group collapsed to a single cell. The quote is now the subject and is set larger for it (`clamp(1.0625rem, 1.5vw, 1.3125rem)`); a hairline footer row carries the attribution on the left and the client mark on the right, and the frame numeral moved off the vanished plate to stamp the card's top-right corner. Without a face to anchor it, the card's authority rests entirely on the quote and the mark — so both must be real before launch.
- **Fold spacing (`--fold`)** — one token, `clamp(60px, 7vw, 112px)`, sets the vertical gap on every section. Before standardising, body sections ran 11vw capped at 168px while the closing section ran 12vw capped at 180px, so two adjacent folds stacked to ~340px of empty ground. Do not reintroduce per-section values; change the token.
- **Edge code** — a horizontal stamp above each section at every width: the section label in edge-code caps, centred between two equal tick rules that run out to the page margins. This is where the client's approved section labels live; it reads as film-margin data rather than as a marketing kicker, which is the only reason a label above a heading is admissible here.
- **Counter** — the stat band, set as an exposure counter on a hairline with 1px `mark` tally ticks. Numerals are tabular and count up on an exponential ease. Grouping follows the client's approved copy: `1200+` but `10,000+`.
- **Accordion** — `grid-template-rows: 0fr → 1fr`, never height animation. The plus rotates 135° to a cross.
- **Clients (`.clients`)** — ten marks in a 5-and-2 arrangement, the only counts that leave no orphan. **Unruled**: no gutter lines, no outline, no cell fill, so the marks sit on the open sheet and the arrangement is felt rather than drawn; the hover plate is the only thing that gives a cell an edge. Supplied artwork is the brands' light-background version, so each mark renders as a white silhouette through its own alpha (`brightness(0) invert(1)`) — never recoloured or traced — held at 62% so ten brands read as one silver field, with the hovered cell going to the light table in full colour, gated on `(hover: hover)` so a tap cannot latch it. Marks sit at their native 40px: these files cannot go larger without upscaling, and an explicit height beyond that reads soft. **Two alternatives were built and withdrawn** — a single client on a lit plate with the rest cycling (hid nine of ten; breadth at a glance is the section's whole job) and a drifting full-width band (logos too large to all fit). The client chose the grid.
- **Background wash (`.bgwash`)** — *superseded by the aurora below; the flat-sweep values are kept only as the measurement history.* four wide, low-alpha radial blooms fixed behind the whole page at `z-index: -1`, above the propagated canvas colour and below every section (all of which are transparent). The hero paints its own opaque ground, so the wash begins where the artwork ends. It **drifts ±22% of a viewport against the scroll** — driven off scroll progress, not raw offset, so the travel is identical on a short viewport and a tall one — inside a 30% bleed that keeps an edge from ever showing. It also **turns hue across the descent, but only through the cool half of the wheel** (−45° to +75° from the brand cyan: green-teal at the top, indigo at the foot). A full rotation would put oranges and magentas on a page whose entire argument is one reserved accent. Both properties are `transform` and `filter` only, so it stays on the compositor. **Contrast was measured across the whole hue sweep** — the brightest composite is `#0f1c22` and the dimmest text on the page holds 4.74–4.79:1 throughout, so neither the drift nor the turn costs legibility. Re-measure if the alphas are raised.
- **Aurora (`.bgwash::before/::after`)** — two heavily blurred curtains (`blur(66px)`) drifting against each other on long, offset, alternating cycles; that counter-drift is what reads as an aurora rather than a pulsing glow. They are children of `.bgwash`, so the scroll-driven hue rotation applied there turns them too — green-teal at the top of the page, indigo at the foot. Transforms only, so both stay on the compositor. **The governing constraint is overlap, not brightness.** Two curtains at 58% height with `scaleY` to 1.28, over a standing band, measured **3.83:1** behind the dimmest text; thinning the colour to compensate only reached 4.47 and killed the effect. The fix was geometric — 44% height, set at 0% and 54% so they barely meet, `scaleY` held near 1, standing band removed — which holds **4.65:1** with the colour at full strength. If these are ever moved closer or grown, re-measure; do not simply raise the alpha.
- **Closing section (`.sec--contact`)** — **the page no longer flips to a lit surface at the close.** It went from a saturated `lightbox` slab, to a paler lit-paper mix, to its current state at the client's direction: `void` — one stop deeper than the body sections — under a faint cyan lift, with the sheet's ruling in light ink at 4.5% (92px, masked to fade before it reaches an edge). The fold still reads as arrival, by going darker rather than lighter. Type returns to the silver ramp, and the CTA is plain `btn--mark`, identical to the header button. The `.btn--ink` variant built for the lit ground was deleted with it rather than left dead.
- **Menu row (`.megaitem`)** — the single hover affordance shared by all three menus: a status dot that goes from `silver-600` to `mark` with a 3px glow ring, the label lifting to `silver-50`, an arrow sliding in from `translateX(-4px)` to `0`, over a `rgba(244,243,240,.04)` panel. The dot is allowed to carry `mark` because it *is* the selection — the same argument as the circled frame. Two densities: the default carries a one-line description (trainings, our story); `--compact` is label-only and runs tighter (services). **Specificity is load-bearing here** — `.dropdown a` and `.mega__col a` both out-rank a bare `.megaitem` on element count, so these rules are scoped under `.dropdown` and, for the compact variant, three classes deep. A rule that silently lost this race is what left the first build's rows on the narrow dropdown's padding.
- **Menu panel (`.dropdown--panel`)** — all three nav panels are contained cards, **centred in the header rather than anchored to their trigger**. That is not a stylistic choice: Services needs ~1060px for three columns plus its post card and its trigger sits far left, so right-aligning runs off one edge and left-aligning off the other; one centred rule holds every panel and cannot overflow either way. Width comes from a `--panel-w` custom property (720px default, 1060px on `--panel-wide`) clamped to the viewport less two gutters. Services keeps three link columns under `mark` headings; Trainings and Our Story run **a single column of `.megaitem` rows** beside one large post card. An earlier build ran these two as a two-up grid inside a full-bleed band to avoid stranding dead width — the contained panel removes that problem, which is why the single column works here and did not before: three link columns plus a promo card, inner content held to `maxw` so the first column aligns with the logo. It keeps the `.dropdown` class, so all the existing open/close, Escape and focus-out handling still owns it; the full width comes from setting its nav item to `position: static`, which makes the fixed header the containing block. **Hover dismissal is scoped to the header, not the nav item** — the panel hangs below the bar, so reaching its promo card means travelling through the header, and an item-scoped `mouseleave` closed the menu in transit. Anywhere inside the header counts as still in the menu; leaving it closes after 220ms, and arriving at a bar element with no panel closes at once.
- **Hero backdrop** — the client's own T.R.U.S.T framework artwork, full-bleed `cover`, under a flat scrim on `.hero::before` (`rgba(11,11,12,.94)`, `.955` on phones). The scrim is a separate layer, not a second background, so the cursor loupe can mask a hole in it and raise local exposure on the artwork — the behaviour the removed contact-sheet canvas used to perform on itself. **The reveal is capped by measurement, not taste:** the mask centre is `.86`, putting the scrim under the loupe at `.81`, and `.80` is where the sub-copy falls under 4.5:1 against the brightest pixel in this artwork. An earlier, better-looking punch to `.19` took the headline to **1.01:1** — invisible. Any change to the artwork or the scrim must re-measure against the brightest pixel behind each text box, not against the average.
- **To-top plate** — one more cell off the sheet, fixed bottom-right at 56 × 56: hairline rule, `stock` ground at 84% with a backdrop blur, a drawn bar-over-arrow glyph, and a `TOP` edge-code stamp. Silver at rest — this is a utility, not a primary action, so the marking pencil enters only on hover, where the rule and glyph go to `mark` and the arrow rises to meet its bar. Appears past 0.9 viewport, and is a real `<a href="#top">` so the return still works with JavaScript off.
- **Placeholder (`.todo`, `.chip--todo`)** — italic, dotted-underline, dashed-border treatment for content that could not be read off the source file. Deliberately unfinished-looking. **Never restyle these to look resolved; replace the content.**
- **Sheet (`.sheet`)** — the site's one modal. Four rules, fixed, and a new modal does not get to reopen them:

  1. **It enters from the bottom edge and travels up.** Never a centre fade, never a drop from the top. `translateY(100%) → 0` over 520ms on the house ease.
  2. **It stands 90% of the viewport tall** (`90dvh`, with `90vh` as the fallback — on mobile Safari the static unit is measured against the expanded chrome, so a `90vh` sheet loses its foot behind the address bar). The 10% band of page left showing above it is the point: the sheet must read as a panel *over* the page, never as a new page. Width is capped at 1120px and centred for the same reason — edge-to-edge at 1920px undoes what the 90% height buys.
  3. **It always carries a close icon**, top right, 42px (44 on phones — it is the only way out of a sheet that fills the screen). Escape and the scrim close it too, but the icon is not optional.
  4. **The page behind it stops.** Scroll locked, everything outside marked `inert`, focus trapped and handed back to whatever opened it on close.

  Authoring one is markup only — the controller in `main.js` is generic and no modal needs its own CSS or JS:

  ```html
  <button data-sheet-open="thing">Open</button>

  <div class="sheet" data-sheet="thing" hidden>
    <div class="sheet__scrim" data-sheet-close></div>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="thingH">
      <div class="sheet__head">
        <div><p class="sheet__over">Overline</p><h2 class="sheet__h" id="thingH">Title</h2></div>
        <button class="sheet__x" type="button" data-sheet-close data-sheet-focus aria-label="Close">…</button>
      </div>
      <div class="sheet__panels">…</div>
    </div>
  </div>
  ```

  `[data-sheet-open]` and `[data-sheet-close]` are delegated off `document`, so markup added later is picked up without rewiring. `[data-sheet-focus]` names the element that takes focus on open; without it the first focusable wins. A `sheet:open` event fires on the sheet — that is where deferred, expensive content should be loaded rather than on page load. Under `prefers-reduced-motion` the travel goes and the panel is simply placed, but the scrim still resolves, so the state change is never silent.

  Scroll-locking removes the scrollbar, which widens the viewport, which slides every `position:fixed` element right by the bar's width — visible for the ~420ms the scrim takes to reach opacity. JS measures the bar into `--lockpad` before taking it away and the three fixed elements claim it back as margin. On overlay-scrollbar platforms this is 0 and none of it applies. **`overflow:hidden` on `html` while locked was measured against the `overflow-x:clip` trap noted in the stylesheet and does not repeat it** — scroll position and every sticky element survive the open/close cycle intact.

- **Get in touch (`[data-sheet="contact"]`)** — the one live instance, and the only sheet built in JavaScript rather than authored in a page: it is identical on all nine documents, it cannot work with JS off anyway, and nine hand-kept copies of a form is nine chances to drift. Two tabs on the shared `.filt` tab, so it reads as part of the site and not a bolted-on widget: **Book a call**, holding a second Cal.com embed, and **Send an enquiry**, holding the form. The calendar is `data-cal-defer` — third-party weight that is not fetched until someone has asked to see it, since a sheet never intersects the viewport and the observer that wakes the page's own calendar would wait forever. Every `.nav__cta`, `.mm__cta` and the closing section's button is wired to it; each keeps its `href` to the contact section as the no-JS fallback. **The enquiry form has no endpoint** and says so on submit rather than showing a tick and dropping the message — same rule as the careers sign-up. It points at the calendar, which is live. No email address is invented, because none is recorded anywhere in this build.
- **Job sheet (`[data-sheet="job"]`, careers)** — one sheet serving all six roles, filled on open from the clicked `<article class="job">`. Two columns inside the 95% width: the description reads at its own measure on the left, a sticky apply rail holds the right; one column would either strand half the sheet or set a 1180px line length. Reflows to a single column under 980px. **The detail copy lives in a `<template class="jd__src">` inside each job article, not in a JS object** — it is client-reviewable copy and belongs in the document with the rest of it, and a template's content sits outside `textContent`, so the list's filter and search never accidentally match it. `sheet:open` carries the opener in `event.detail`, which is how one sheet serves many triggers. **All six descriptions are authored, not from `Careers.pdf`** — that file carries only the one-line summary already shown in the list. They need sign-off before launch, same as the application steps in section 03.
- **CV drop zone (`.drop`)** — the file input sits transparent *above* the dashed face rather than visually-hidden behind a label, so click, Enter and Space all reach it natively and the focus ring survives; on a required field that ring is the one thing that must not be lost. Drag handlers only widen the target to the whole dashed area — a dropped file is written onto the real input via `DataTransfer`, so the field is genuinely populated and a native post would carry it. Validation is on **extension and size, not MIME type**, because the type a `.doc` arrives with is whatever the sending OS decided. `is-over` is allowed to take `mark`: during a drag the zone *is* the selection. **Nothing is sent** — the submit names the file back to the applicant and says plainly that it went nowhere, rather than accepting someone's CV behind a tick.

### Motion

One authored idea: **frames develop**. The resting state is `opacity: .28; filter: blur(7px) contrast(.5) brightness(.7)` — faint but present, an undeveloped frame, never `opacity: 0`. It resolves to full on intersection with an exponential ease-out (`cubic-bezier(.16,1,.3,1)`), staggered by a `--d` step of 110ms.

Everything else is a variation on develop, not a new effect: the loupe raises local exposure under the cursor; plates come to tone on hover; arcs and circles stroke on; the counter exposes upward.

All of it is gated behind `prefers-reduced-motion`, and all reveal styling is scoped to `html.js` so the page is fully readable with JavaScript off.

One exception is functional rather than expressive: **the return-to-top scroll is tweened in JavaScript, not by `scroll-behavior: smooth`.** The page is ~8000px tall with lazy imagery and a third-party booking embed, and a document-height change mid-flight cancels the native smooth scroll — a measured click from the footer stalled at 2424px. Do not "simplify" this back to CSS. The tween is wall-clock driven, abandons itself on any wheel/touch/key input, jumps instantly under `prefers-reduced-motion`, and moves focus to the nav identity on landing so keyboard order follows the viewport.

## Do's and Don'ts

**Do**

- Reserve `mark` for a hand's selection mark, a primary action, or the identity. If you cannot say what was selected, use silver.
- Dim the siblings when one frame is chosen. Selection is only legible against what was passed over.
- Start reveals from a visible state. An undeveloped frame is faint, not absent.
- Let the width axis create hierarchy before reaching for another family.
- Mark unverified content as unverified, visibly, on the page.

**Don't**

- Don't add a second `mark` to an element that already has one. One mark per idea; a second turns the sheet into a scrapbook.
- Don't round corners beyond 2px, and don't introduce a card-shadow scale — depth here is exposure.
- Don't use `mix-blend-mode: overlay` for texture on this ground; it is nearly a no-op on near-black.
- Don't pad a frame grid horizontally — size it, or the gutter rule bleeds into the margin.
- Don't animate width or height. Use `transform`, `opacity`, `filter`, and `grid-template-rows`.

---

### Not canonized

Two things in the build are recorded here as constraints of this engagement rather than as system rules for future surfaces to inherit:

1. **The horizontal edge-code stamp below 1080px** sits above its section heading, which is structurally a kicker — a form the craft floor refuses. It survives only because the client's approved copy contains those strings verbatim and cannot be changed, and it is mitigated by rendering them as film-margin material (frame number + tick rule) rather than as marketing eyebrows. New surfaces should not copy this pattern; a heading should carry its own weight.
2. **The `.todo` placeholder treatment** is scaffolding for unverified source copy, not a component. It should not exist once the real strings land.
3. **The mega menu's column headings are set in `mark`**, which the reservation rule does not allow — a column heading is a label, not a hand-mark, a primary action, or the identity. They are cyan because the client's reference for this panel shows them cyan, and that reference was supplied as the structure to follow. It is a deliberate, client-directed exception scoped to this one panel. New surfaces should keep section labels in silver; if the rule is ever relaxed generally, it should be a decision taken on its own terms rather than inherited from here.
