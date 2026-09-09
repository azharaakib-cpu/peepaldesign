# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS/JS — user's answer, 2026-08-10. No build step; the site opens from `index.html`.

**Zero-network no longer holds for one section.** The client asked for an embedded booking calendar in "Start a Project" (2026-08-10) — first Calendly, then switched to **Cal.com** the same day — which loads a third-party script and iframe at runtime. Everything else on the page — fonts, imagery, the map, all motion — remains local and works offline. The embed is lazy-loaded 400px before the section enters view and degrades to a visible fallback if the script fails.

## Users

Primary: product leaders, heads of design, and founders at companies building AI-native products, evaluating whether to hire an external research-led UX partner. They arrive from a referral or a search, on desktop, in evaluation mode — comparing three or four agencies and looking for evidence of rigor rather than a portfolio of pretty screens.

Secondary: enterprise L&D and design-org leads shopping for UX/PM training and LEGO® Serious Play facilitation.

## Product Purpose

Peepal Design is a research-first UX consultancy. It sells the act of grounding AI product decisions in real user evidence — research, UX strategy, AI experience design, and training. The site's job is to convert an evaluating buyer into a project conversation ("Get in touch" / "Start a Project").

## Positioning

Fifteen years of research-led UX practice applied specifically to AI-native products. The differentiator a neighboring agency cannot truthfully copy is the volume and continuity of primary research (stated on the page as 1200+ research projects, 10,000+ user interviews) paired with AI-specific design engagements. Peepal sells evidence, not aesthetics.

## Operating Context

Buyers evaluate on desktop, often with several agency sites open at once, and skim before they read. The proof they look for is case studies with named clients and a legible methodology. The site is a single scrolling page ending in a project-start CTA.

## Capabilities and Constraints

- **Approved and frozen:** the section structure and all textual content in the attached Figma export. Copy and section order may not be changed. **The client has since superseded parts of it directly** — the hero headline and sub-copy (2026-08-12), the whole services/trainings/story menu content, and the clients strip. Where that happened, the client's newer string wins and is recorded at the relevant entry below.
- **Hero copy, 2026-08-12 (client-supplied, verbatim).** Headline "Designing human experience of AI"; sub-copy "We bring real user insights to AI-Native products, helping organisations worldwide create products people TRUST, ADOPT and LOVE." Three notes:
  - **`<title>` and `<meta name="description">` still carry the OLD line word for word** ("Designing how human + AI work together" and the previous sub-copy). They are now inconsistent with the page's own headline, which matters for search results and link previews. **Align them before launch** — left alone because the request was for the banner text and a title tag may carry deliberate search wording.
  - The client wrote **"AI-Native"** with a capital N; everywhere else on the page it is "AI-native". Set verbatim rather than silently re-cased, but the page now spells the term two ways.
  - A terminal full stop was added to the sub-copy, which the client's text did not carry — every other paragraph on the page ends with one.
- **The hand mark and machine mark were removed from the hero headline** (client request, 2026-08-12). Those were the drawn glyphs seated beside "human" and "AI" — the most literal statement of the human/machine pairing in the whole build. The distinction now rests on colour alone. The `.tok__mark` and `.plus` rules were deleted with them rather than left dead.
- **Colour:** the Figma's colours were placeholder. Superseded 2026-08-10 by the client's brand cyan, supplied via the logo artwork — see Brand Commitments.
- **Required:** dark mode; cinematic scroll-driven motion; hover states throughout; the experiential bar set by parallelhq.com.
- **Theme to express:** "insight."
- Images and video are placeholders at this stage; authored abstract visuals were chosen over stock (user's answer, 2026-08-10). **Exception, 2026-08-11:** the four "What we do" images are now client-supplied AI-generated photographs at `assets/img/services/{research,strategy,design,training}.jpg`, originals kept in `_source/`. They carry a faint generator watermark in the lower-right corner, and `training.jpg` is a two-panel composite rather than a single frame — both are worth a second look before launch.
- Service lines: User Research, UX Design, LEGO® Serious Play, UX Training, UX Audit.
- **Services menu, 2026-08-12.** A contained panel with three columns and a post card. Headings, promo copy and **all eighteen item labels are client-supplied** (lists given 2026-08-12) and are set verbatim:
  | User Research Services | Design Services | Value Added Services |
  |---|---|---|
  | Qualitative Research | UX-UI Design | UX Team Augmentation |
  | Quantitative Research | Service Design | Design Thinking Workshop |
  | Product Validation | UX for AI Design | UX Audit |
  | Usability Testing | Conversational AI - UX Design | |
  | UX Benchmarking - UX Index | AI Product Prototyping | |
  | AI Opportunity Mapping | Design for Accessibility | |
  | | Design Systems | |
  | | Data Visualisation | |
  - Revisions of 2026-08-12: "UX / UI Design" became **"UX-UI Design"**; **"UX Benchmarking - UX Index" was removed from Value Added Services** (it was originally supplied under two columns and now appears once, under User Research); and the space between items was increased 20% (row padding 8px → 9.6px, so the gap between two rows goes 16px → 19.2px).
  - The labels keep the client's plain hyphens (`UX Benchmarking - UX Index`, `Conversational AI - UX Design`) rather than the en dashes the rest of the page's prose uses. They are product names, so they were not re-typeset; confirm if the client wants them normalised.
  - These labels **do not match the service names used elsewhere on the page** (the Trainings dropdown, the "What we do" section and the footer still carry the older set: UX Design, UX Strategy, AI Experience Design, LEGO® Serious Play, UXPM Training, Research Bootcamp, In-house Programmes). Two vocabularies are now live on one page. **Reconcile before launch.**
  - The promo card image is the client's own research photograph, reused from the services section — a stand-in, not a chosen editorial image.
  - **SUPERSEDED, 2026-08-21: individual service pages now exist.** The client supplied twelve PDFs in `assets/img/services/` (one per item, plus one — Usability Testing — that predates the batch), each a single tall structured page. Twelve items now resolve to a real, built page instead of `#services`: Quantitative and Qualitative research, Usability Testing, UX Benchmarking - UX Index, AI Opportunity Mapping, UX-UI Design, Service Design, UX for AI Product, Conversational AI - UX Design, AI Product Prototyping, Design for Accessibility, Design Systems, Data Visualisation, and UX Team Augmentation. Each page carries a definition section, one page-specific interactive or visual component built from the PDF's own data (a scatter chart, a fidelity ladder, a chat transcript, a functional chart/table toggle, a measured contrast demo, a live design-token playground, a service blueprint grid, a line chart, a four-state AI-confidence demo, or a role-matching panel), a value grid, a principles list, case studies, an FAQ, and a closing CTA — with both the desktop mega menu and mobile menu marking the current page. **Two Value Added Services items still have no source PDF and remain `is coming soon` placeholders:** Design Thinking Workshop, UX Audit.
  - **Item count and names have drifted from the frozen eighteen-item table above.** The live nav currently carries fifteen Services items, not eighteen: "Qualitative Research" and "Quantitative Research" are now one item ("Quantitative and Qualitative research"), "Product Validation" no longer appears anywhere in the nav, and "UX for AI Design" is now labelled "UX for AI Product". None of this was changed by the page-building work above — the pages were built to match whatever the live nav already said. **Confirm whether this renaming was client-directed and should replace the table, or is itself drift to fix.**
  - **New pending-case pattern, 2026-08-21.** Several of the twelve source PDFs name real, specific clients with no existing case study or image on this site: Prismforce, Solid, Razorpay, upGrad, Emaar, Turing, Oryo. Kept as honest pending placeholders (real name and project description, linked to the contact section, `data-pending` marked) rather than invented case studies or silently dropped — see Evidence on Hand.
- **Trainings menu, 2026-08-12 (client reference).** Four programmes, each with a one-line description: *UX-PM level 1-2-3* (For product managers), *Research Ops* (Scale your research practice), *Design Leadership Masterclass* (Lead with design thinking), *UX Maturity Model* (Assess & elevate your org). Promo: "Build PM skills grounded in UX".
  - **This list replaces the previous Trainings menu entirely, and with it LEGO® Serious Play leaves the navigation.** UXPM Training, Research Bootcamp and In-house Programmes also drop out. LEGO® Serious Play is a listed service line and a brand commitment, and it still appears in two FAQ answers and in the footer — so it is now absent from the nav while being promoted elsewhere on the same page. **Confirm this is intended.**
- **Our Story menu, 2026-08-12 (client reference).** *Our Journey* (18 years of design), *Our Global Family* (Meet the team), *Careers* (Join us), *Blogs* (Insights & thinking). Promo: "From pixels to AI — our story".
  - **TENURE CONFLICT, UNRESOLVED.** "18 years of design" contradicts two other claims already on the page: the hero edge code reads "15 YEARS OF RESEARCH LED UX DESIGN", and the recorded founding year of 2016 implies ten. Three different numbers for the same fact are now live. The client's own string was used verbatim and nothing else was changed; **one of the three has to give.**
  - **"Blogs" has no destination.** This is a single-page build with no blog, so it points at `#top`, the same placeholder the footer's Privacy and Terms links use. It must get a real target or come out.
  - Promo images for Trainings and Our Story are the client's own training and AI-design photographs reused from the services section — stand-ins, not chosen editorial images.
- Practice areas as sectioned: Research, UX Strategy, AI Experience Design, UXPM Training.
- **Scheduling:** "Start a Project" hosts a **Cal.com** inline embed (`data-cal-link` / `data-cal-namespace` on `.booker` in `index.html`), currently `theghost-writer-wucmfa/30min`. It is themed dark from the site tokens and lazy-loaded. With no link set, the panel falls back to a "scheduling link to supply" state rather than a broken widget.
- The section is a two-column layout: copy left, calendar right. **Both approved buttons were removed** on 2026-08-10 at the client's request — "Get Started" (superseded by the calendar) and "Our Methodology".
- The Cal.com account currently presents as "TheGhost Writer"; the booking page inherits that name and should be renamed before launch.
- **Booking affordance and second CTA, 2026-08-12 (client request).** The calendar previously sat unlabelled, so a caption was added under it — a clock mark, "Book a 30-minute intro call", and "Pick a time that suits you — no forms, no back-and-forth." An **"Enquire now"** button was added to the left column as the alternative route for anyone who will not book a call cold. Both strings are authored, not from the approved Figma copy.
  - The caption was first placed above the calendar and read "Pick any slot **below**"; the client moved it underneath, so the wording was made non-directional rather than left pointing the wrong way.
  - **"Enquire now" has no destination.** This build has no contact form, and no email address appears anywhere in the page or the source material — inventing one would send real enquiries into the void, so the button self-links to `#contact` for now. **It needs a `mailto:` or a form before launch**; as it stands it is a primary call to action that does nothing.
  - The section's light-table ground needed a third button variant, `.btn--ink` (deep ink on the lit cyan): `--mark` disappears against this background and `--ghost` assumes a dark one.

- **Hero backdrop, 2026-08-11/12 (client-supplied).** The procedural contact-sheet canvas that opened the page was removed at the client's request and replaced with their own **T.R.U.S.T framework artwork** at `assets/img/hero/Hero.png` (3840 × 2160, 459 KB). The client then asked for a darker resting state and a brighter reveal under the cursor; both are in. Two things to note before launch: the PNG is a heavy first-viewport asset and would benefit from a WebP/AVIF conversion, and on phones `cover` crops it to about a quarter of its width, so the diagram is a magnified fragment rather than the whole framework — it is treated purely as texture there.

## Brand Commitments

- Name and wordmark: **peepaldesign**, set as a single lowercase word alongside a twin-loop mark.
- **The mark is supplied artwork and must not be redrawn.** It loads from `assets/brand/logomark.svg` (with automatic fallback to `assets/brand/logomark.png`), referenced by both the nav and footer. That file currently holds a **placeholder** — overwrite it with the client's real asset. No markup change is needed, and no traced or interpreted version of the mark may ship.
- **Brand colour: `#29ABE2`** — confirmed from the supplied logo artwork, which ships that exact value. It is the single `--mark` token; changing it re-themes the whole site.
- **No film-reel / sprocket motif.** The client removed the left-edge perforation rail on 2026-08-10. Film-margin *typography* (frame numbers, edge codes) is retained; the reel graphic is not to return.
- Legal entity in footer: Peepal Design — User Experience Design Consulting Pvt. Ltd.
- Part of **Bridged Global**, a network of UX studios; footer carries a "Global Family" column of sibling studios.
- Founded 2016, Mumbai, India.
- **Bridged Global partner studios** (client-supplied, 2026-08-11) — eight locations, three continents:
  | Studio | Location | Site |
  |---|---|---|
  | Bold Insight | Chicago, United States | boldinsight.com |
  | Bold Insight | London, United Kingdom | boldinsight.com |
  | uintent | Hamburg, Germany | uintent.com |
  | Peepal Design | Pune, India | peepaldesign.com |
  | Peepal Design | Bangalore, India | peepaldesign.com |
  | XPLUSX | Shanghai, China | xplusx.net |
  | UIsm | Tokyo, Japan | uism.co.jp |
  | XPLUSX | Singapore | xplusx.net |
- **Cities are inferred where the client gave only a country.** Chicago, London, Hamburg and Tokyo carry over from the original approved chip list; Shanghai was chosen for XPLUSX China. **Confirm all five before launch.**
- **Delhi and Mysuru were removed** — they appeared in the original Figma chip list but not in the client's definitive studio list.
- **COPY CONFLICT, UNRESOLVED:** the approved lede reads "Nine cities. Three continents." The real network is **eight** locations. Three continents still holds. The lede is frozen approved copy, so it has not been changed — the client must either supply a ninth location or approve the wording change.
- LEGO® Serious Play must retain its ® mark.

## Evidence on Hand

- Four case studies referenced by the approved structure, with client names and titles read from a low-resolution Figma export — **these strings are inferred and must be verified before launch.**
- Three testimonials. The quotes and the names (Ananya Krishnan, Dr. Marcus Weber, Priya Nair) were transcribed from the low-res export and are **pending verification**.
- **⚠ REAL CLIENT LOGOS ARE NOW ATTACHED TO UNVERIFIED QUOTES (client request, 2026-08-12).** The invented company names and drawn marks were replaced with real supplied artwork: Ananya Krishnan → **Google**, Dr. Marcus Weber → **Bosch**, Priya Nair → **Infosys**, Rohan Mehta → **Philips**, Sarah Lindqvist → **Booking.com**, Kenji Watanabe → **Toyota**. **The pairing is mine, chosen so each mark matches the sector its quote describes — the client did not specify which logo belongs to which testimonial.** Combined with the note below, the page now shows a real company's mark beside a quote that company did not give, attributed to a person who in four of six cases does not exist. **This reads as a named endorsement and must not ship in this state.** Either supply the real quote/attribution for each named client, or return the marks to neutral placeholders.
- The visible company-name text was removed when the logos went in, since these are wordmarks that already carry the name.
- **The testimonial designations and (formerly) company names are invented placeholder content**, added at the client's request on 2026-08-10 so the section reads finished in review. Northwind Labs, Axiom Systems, Meridian Group, Fieldline Health, Aperture Retail and Solstice Mobility name no real company and assert no real client relationship. **Every designation, company name and drawn mark must be replaced before launch.**
- **Testimonials 4-6 are entirely authored** (Rohan Mehta, Sarah Lindqvist, Kenji Watanabe) — quote, name, role and company alike. They were written on 2026-08-10 to pad the carousel at the client's request and correspond to no real client. Only testimonials 1-3 trace back to the Figma export.
- **The six testimonial portraits have been removed** (client request, 2026-08-12: "testimonial section that does not include user photographs"). Each card is now a single panel — quote, rating, then one footer row carrying the attribution on the left and the client mark on the right. This retires the worst fabrication in the build: those were stock pravatar faces of people unconnected to the quotes, shown with no placeholder label. **The files at `assets/img/voices/portrait-{1..6}.jpg` are now unreferenced and can be deleted.** The invented names, roles and company marks remain and still need replacing.
- Stat claims (1200+ / 200+ / 10,000+ / 60+) come from the approved copy and are treated as client-supplied fact.
- **Client list (client-supplied, 2026-08-11)** — ten named clients for the "Clients We've Partnered With" strip: Google, Microsoft, Amazon, Meta, Philips, Sony, Uber, Toyota, Bosch, Qualcomm. These are the client's own assertion about their business and are treated as supplied fact, exactly like the stat claims. The eight invented company marks that previously filled this section (Northwind Labs, Axiom Systems, Meridian Group, Fieldline Health, Aperture Retail, Solstice Mobility, Halcyon Financial, Verity Labs) **have been removed** — they named no real company and are gone from the build.
- **The client logo artwork is client-supplied and on disk** at `assets/img/logo/logo-<slug>.png` (27 files supplied 2026-08-11; the page uses ten of them). No mark has been traced, redrawn or recoloured. The files are the brands' **light-background** versions — Amazon, Uber, Sony and Meta are near-black and invisible on `--stock` — so the CSS renders each one as a white silhouette through its own alpha channel (`filter: brightness(0) invert(1)`), held at 62% opacity so ten brands read as one silver field. **On hover the cell lifts to paper white and the mark returns to its full original colours** (client request, 2026-08-11) — putting the selected frame on the light table is what makes the colour state possible at all, since these assets are drawn for a light ground and a black wordmark on `--stock` would simply vanish. There is no hover on touch devices, so phones and tablets see the silver state only.
- **The supplied logo PNGs are ~40px tall**, so they are displayed at 26px to limit softness and are still below 2× resolution. Higher-resolution or SVG artwork would let the marks sit larger in their cells.
- Seventeen supplied logos are **not** on the page (Amadeus, Ansys, Asian Paints, AXA, Bajaj, Bio-Rad, Booking.com, Duroflex, Flipkart, FundsIndia, HealthAsyst, Informatica, Infosys, Reliance, SAP, Titan, Veritas). The client named ten; the rest are available if the strip should grow. **Ten and five are the only column counts that leave no orphan cell**, so changing the count means revisiting the grid.
- The clients-section heading and lede were supplied by the client on 2026-08-11 ("Clients We've Partnered With" / "We are proud to partner with…"). "TRUSTED BY" is an authored edge stamp, not client copy.
- **No real case-study imagery, video, or headshots exist yet.** Those visuals remain authored placeholders and must not be presented as real client work.

- **Section spacing standardised, 2026-08-12 (client request).** Every fold now takes one `--fold` token (`clamp(60px,7vw,112px)`). Body sections previously set 11vw capped at 168px and the closing section 12vw capped at 180px, so two adjacent folds stacked to roughly 340px of empty ground. All seven body folds now measure identically and the page is ~500px shorter.
- **Location list moved above the map, 2026-08-12 (client request)**, and set on a single line. The eight tags need ~830px on one row, so the old 840px cap is gone and narrow viewports scroll the row sideways rather than break it. **This makes the nine-versus-eight conflict harder to miss** — the lede still reads "Nine cities" directly above a countable row of eight tags. See the unresolved copy conflict under Brand Commitments.
- The "Start a Project" CTA was relabelled from "Enquire now" to **"Get in touch"** (client request, 2026-08-12), which is now the same label as the nav button. Both still need a real destination.

- **Testimonial reel loops forward only (client request, 2026-08-12).** The set is cloned and appended, so the track keeps travelling in one direction and resets across the seam with the transition disabled — a modulo wrap previously slid the whole strip backwards to reach the first quote, which read as a rewind. Autoplay still yields to the reader: it pauses on hover, on keyboard focus, off screen, and never starts under `prefers-reduced-motion` (where the clones are not built at all and the arrows still work). Clones are `aria-hidden` and carry no slide label, so assistive tech sees six testimonials, not twelve.

- **`training-uxpm.html` built 2026-08-13 from the client's `UXPM.pdf`.** Every
  word on the page is the client's own, transcribed rather than pasted — that
  PDF has the same font-encoding artefact as the Bajaj one, breaking words into
  "Benefi t s" and "L evel". The reference is a single 1920×4824 page and
  **contains no images at all** (verified by walking its XObject resources), so
  the page is deliberately typographic and stubs no image slots. It is reached
  from the "UX-PM level 1-2-3" row in the Trainings mega menu on all four pages;
  the other three rows in that menu still point at `index.html#services`.
  - **"Register Now" has no destination.** All four instances point at
    `index.html#contact`, the booking calendar. There is no cohort registration
    form, and no dates are published anywhere — the closing copy promises "we
    will confirm upcoming UX-PM dates", which nothing on the site can do yet.
    Same open problem as "Get in touch" above.
  - **The claim "certified by UXalliance" is the client's**, taken verbatim from
    the PDF, and asserts a third-party accreditation. Treated as supplied fact
    like the stat claims, but it names an outside body and should be confirmed.
  - **This PDF confirms the footer conflict a second time.** Like the Bajaj
    reference, it carries **ReSight Global**, **Founded 2010** and **Uism (JP)**
    against the site's Bridged Global, Founded 2016 and UIsm. Two independent
    client documents now disagree with the live footer. See Brand Commitments.

- **`training-researchops.html` built 2026-08-13 from the client's `ResearchOPs.pdf`**,
  matching `training-uxpm.html` component for component at the client's request.
  Same reference shape as UX-PM: a single 1920×6223 page with **no images at
  all**, so the page is purely typographic. Linked from the "Research Ops" row in
  the Trainings mega menu and the mobile menu on all five pages. Two remaining
  Trainings rows — Design Leadership Masterclass and UX Maturity Model — still
  point at `index.html#services`.
  - **The reference's enquiry form is not reproduced.** It specifies country,
    topic of interest, name, company, email, phone and message. There is no form
    endpoint anywhere on this site, and a form that silently discards a lead is
    worse than a link to the calendar, so the closing fold points at the booking
    calendar like every other CTA. **Either supply an endpoint or accept that
    enquiries arrive only through the calendar.** Same open problem as "Get in
    touch" and UX-PM's "Register Now" above.
  - **Two deliberate departures from the reference**, both visible in the page
    comment: the "* hours may be different in each country" footnote is printed
    once under the agenda grid rather than repeated in all four module cards, and
    section labels were shortened to double as tab labels at the client's request
    ("Agenda" for "Training agenda — what you will learn", and so on).
  - **Restructured for pacing on 2026-08-13** ("too much data on page at a
    time"). No copy was cut. The agenda's four module cards and the two trainer
    biographies — the two densest blocks, 11 syllabus bullets and ~180 words of
    prose all open at once — became accordions built on the site's existing FAQ
    row, one open at a time per group, with Module 1 open on arrival. The FAQ's
    own rows stay independent; exclusivity is opt-in through `[data-qa-group]`.
  - **"Know more" now points at `https://ux-pm.com/researchops`** (client-supplied,
    2026-08-13), opening in a new tab with the outbound mark and a spoken "opens
    in a new tab". UX-PM's pitch still sends "Know more" to `index.html#services`
    and has no equivalent programme URL — worth asking for.
  - **Structure re-aligned to the live page** at `ux-pm.com/researchops`
    (2026-08-13), read directly rather than from the PDF. Four changes: the three
    value propositions moved into the hero with their second halves emphasised,
    as the live page sets them; "ResearchOps in a nutshell" became its own
    section as a plain list rather than a spec table folded into an About block;
    the four modules gained the numbered discs that make the agenda read as a
    sequence; and "Ask for more information" now repeats after the participant
    profile and the agenda, as it does on the live page. Section labels follow
    the live page's own wording ("Participant profile: ResearchOps", "Training
    agenda", "Experienced global trainers").
  - **Two things on the live page were deliberately not carried over.** Its
    photography — a stock portrait beside the hero and the participant profile —
    has no equivalent asset here and would be someone unconnected to this studio.
    And its "Our trusted business partnerships" strip duplicates the client logo
    section already on the home page.
  - The repeated asks are **ghost buttons, not `--mark`**. The live page makes all
    of them its primary yellow; four cyan buttons down one page would spend the
    reservation for nothing, so the mark stays on the hero's ask and the closing
    pitch. **All three asks were then removed entirely** at the client's request
    later the same day, leaving the closing pitch to own the action alone.

- **⚠ THIS PAGE NO LONGER WEARS THE SITE'S DESIGN DIRECTION.** On 2026-08-13 the
  client supplied a Linear style reference and asked for it "on this page only",
  so `training-researchops.html` now runs a second visual system: near-black void
  (#08090a) surfaces stepping to carbon and obsidian, system-ui type at 400–510
  weights with tight tracking, 12px card radii, hairline #23252a borders instead
  of shadows, and a single acid-lime (#e4f222) accent. **This is a deliberate
  departure from the DIRECTION CONTRACT in `index.html`,** and it means the site
  now has two skins. Worth a decision: either bring the other training page
  across, or return this one.
  - **Scoped so it cannot leak.** Every rule is under `html.lin`, and the class
    sits on one `<html>` tag. New unscoped classes (`.lincard`, `.sched*`,
    `.tile*`, `.mono`) appear on no other page — verified. Delete the class from
    that one tag and the page returns to the site's own skin exactly.
  - **The brand cyan is gone from this page** and the aurora and film grain are
    switched off, because Linear's depth comes from borders and surface steps.
    `--mark` remaps to a neutral grey rather than to the lime: the reference is
    explicit that the accent is for the single primary action and active
    indicators, never decoration. The lime therefore appears in exactly three
    places — the closing button, the active tab, the open module's disc — and the
    header CTA became the reference's neutral white pill so only one lime button
    is ever in view.
  - **TYPEFACE SUBSTITUTION.** The reference asks for Inter Variable and Berkeley
    Mono. Neither is on this machine, so the stacks fall to `system-ui` and
    `ui-monospace` — both named as the reference's own fallbacks. On macOS that
    resolves to SF, close to Inter's proportions but not identical. Drop an Inter
    woff2 into `assets/fonts` and add an `@font-face` to make it exact.
  - **One palette value was overruled on measured grounds.** Ash #62666d
    composites to **3.45:1** on the void and **3.30:1** on a carbon card, and the
    site spends its fourth grey on the smallest text there is — the 11px caption,
    the 12px monospace day stamps. Shipping it literally would have put all of
    that below AA, so the fourth step collapses onto Fog #8a8f98 (6.13:1). Ash
    survives only on the 19px line-art tile icons, which are graphics judged at
    3:1. **Full page re-measured after: 43 text elements, zero AA failures,
    tightest 5.26:1, smallest text (10px breadcrumb) at 6.13:1.**
  - **Visual weight added at the client's request** ("too text heavy"): a framed
    "programme at a glance" card whose two bars are the *real* module durations
    scaled against the longer day (Day 2 = 210 min), so Day 1 visibly stops short
    — informative, not decorative, and it animates in on reveal. Three plain
    bulleted lists became icon tiles (nutshell ×5, participant profile ×2,
    challenges ×3) with minimal line-art SVGs. Trainers gained initial monograms
    rather than portraits: the reference bans stock imagery, and a bought photo of
    someone unconnected to these two would be worse than none.
  - **Two named trainers with real biographies** — Joelle Stemp (Yu Centrik,
    Canada) and Domitille Aulignier-Collin (Devoteam, France). Transcribed from
    the client's own PDF and treated as supplied fact, but these are real
    identifiable people and real employers; **confirm both are still current and
    still consent to being listed** before launch.
  - Repeats the **UXalliance** third-party accreditation claim ("Certificate of
    participation sponsored by UXalliance") and the **ReSight Global / Founded
    2010 / Uism (JP)** footer, now the third client document to contradict the
    live footer. See Brand Commitments.

- **Accessibility audit requested 2026-08-13 and not yet run** — specifically the
  readability of small text. The CSS carries **12 declarations at 9px, 9 at 10px
  and 7 at 11px**, nearly all of it condensed (`font-stretch:66%`) uppercase with
  wide tracking in `--silver-600`. That combination is the most likely
  readability problem on the site and none of it has been measured for contrast
  against the aurora ground. Unfinished work, not a clean bill of health.

- **`training-design-leaders.html` built 2026-08-13** from the client's
  "Design Leaders Masterclass.pdf", reusing the ResearchOps page's structure,
  components and motion at their request. Same reference format as the other two
  training PDFs — one long page, the same font-encoding fault, so all copy is
  retyped rather than pasted. Linked from the "Design Leadership Masterclass" row
  in the Trainings mega menu and the mobile menu on all six pages. **Every row in
  that menu now resolves to a real page except "UX Maturity Model".**
  - **THE PROGRAMME DATES ARE NEARLY TWO YEARS STALE.** The reference reads
    "September – December 2024". The module months are kept, because they are
    relative and describe the shape of the 13 weeks; the year is not shown
    anywhere. **A real intake date is needed before launch** — the closing fold
    currently promises "we will confirm the next intake", which nothing on the
    site can do.
  - **The reference's "Upcoming sessions" block was not reproduced.** It lists
    UX-PM Level 1 and Level 2 dates in Quebec hosted by Joelle Stemp — a
    different programme entirely, almost certainly a shared component on the
    source site. Putting those dates under this masterclass would misdescribe
    what is on sale.
  - **Price $2,850 and 8–12 seats are shown** as supplied. Confirm both still
    hold, given the dates do not.
  - **Six named trainers with real employers**, one with a full biography
    (Wojciech Chojnacki). As with the ResearchOps faculty, these are real
    identifiable people at real companies — confirm all six are still current and
    still consent to being listed. One of them, **Rajesh Ghodke, is listed as
    Head of Design at Peepal Design**, so that entry at least should be easy to
    verify internally.
  - **Two placeholder image slots**, `dlm-cohort.jpg` and `dlm-trainers.jpg`, in
    `assets/img/training/`. Both wired with the removes-itself-on-404 pattern.
  - The client asked for few boxes, so only the agenda panel and the two image
    frames are enclosed; the facts strip, audience list, outcomes columns and
    trainer roster are all ruled and unframed.

- **`our-journey.html` built 2026-08-13** from the client's "Our Journey.pdf",
  on the UX-PM page's template at their request. Reached from "Our Journey" in
  the Our Story mega menu and the mobile menu on all seven pages.
  - **THE TIMELINE IS NOT BUILT, DELIBERATELY.** The reference shows *Earlier*
    and *Later* controls for a year-by-year journey but carries **no milestone
    entries** — not in its text layer, and its only embedded image is a
    decorative black bar. A studio's own history is the last thing to invent, so
    the section carries a dashed frame naming exactly what it needs: a year, a
    short title and a line per milestone. **This is the page's centrepiece and it
    is empty until the client supplies it.**
  - **THE NUMBERS ON THIS PAGE CONTRADICT THE REST OF THE SITE, AND EACH OTHER.**
    Every figure is set exactly as supplied; none was quietly reconciled.
    | This page | Elsewhere |
    |---|---|
    | Founded **2008** (stat) | Founded **2010** (this same PDF's own footer, and the UX-PM and ResearchOps PDFs) · Founded **2016** (the live site footer) |
    | **16 years** | **18 years of design** (Our Story menu) · **Fifteen years** (home page FAQ) |
    | **7** cities | **eight** studio locations listed · "**Nine** cities" (home page lede) |
    | **120+** clients | **24** client logos shown |
    | **900+** projects | **1200+** research projects (home page counter) |
    | **55+** researchers & designers | **60+** researchers & designers (home page counter) |
    - The internal arithmetic does not hold either: 2008 + 16 = 2024, so "16
      years" was written two years ago. 2008 + 18 = 2026, which is what the Our
      Story menu already says — the menu is the only figure on the site
      consistent with a 2008 founding.
    - **This is now the single largest factual inconsistency in the build.** A
      visitor can see "16 years" in the page heading and "18 years of design" in
      the menu that brought them there, on the same screen.
  - The four beliefs are set in the UX-PM template's numbered `.lvl` cards, two
    up. The stat band is a new `.tally` component, ruled top and bottom.

- **Twelve service pages built 2026-08-20/21 from client-supplied PDFs in
  `assets/img/services/`** (eleven uploaded together, plus Usability Testing,
  which predates the batch) — one structured, single-tall-page PDF per
  service, transcribed via its PDF text layer, with targeted high-zoom crops
  for anything spatially laid out (charts, a chat transcript) where text
  extraction scrambles column order. See the Services menu entry under
  Capabilities and Constraints for the page list and the two items still
  without a source PDF.
  - **A recurring source gap:** most "six principles" or FAQ blocks in these
    PDFs only ever supply full text for the first one to three items, titles
    only for the rest. Where that happened, the missing descriptions restate
    facts already stated elsewhere on that same page rather than inventing
    new claims, and the page was built honestly as a partial accordion
    instead of padding every item out to six.
  - **Two confirmed copy-paste errors in the source, corrected rather than
    reproduced.** The UX-UI Design PDF's "UI — how it looks" card carries
    body text about interviewing users, lifted from a different page's
    context; and its FAQ block is the same eight generic questions already
    used verbatim on the Quantitative and Qualitative research page, not
    written for UX/UI design. Both were rewritten using only this same
    page's own already-stated content, rather than shipped as-is or invented
    from nothing.
  - **Real, specific, unmatched client names appear across several PDFs** —
    Prismforce, Solid, Razorpay, upGrad, Emaar, Turing, Oryo — with no case
    study or image anywhere on this site. Shown as honest pending
    placeholders (real name and project description, `data-pending` marked,
    linked to the contact section) rather than routed to an unrelated case
    study or invented in full. **These need real case studies or images
    before launch**, same as the four Figma-inferred case studies above.
  - **Generic filler case-study names were replaced, not reproduced.**
    Several PDFs show the same three fake placeholder names ("Capturing the
    Moment", "The journey of home renovation", "Mapping the farming ecosystem
    in India") the Q&Q research page originally carried before it was fixed.
    Swapped for the site's real, existing case studies instead (the Bajaj
    app, the TP Vision eNote app, the Clarion 360 ERP redesign, the Rolling
    Research Programme).
  - **Two new interactive components were built from real PDF data, not
    mocked as static images:** a UX Index line chart (two series, gridlines
    and point positions read off the source chart) on UX Benchmarking, and a
    four-state "Regenerate" confidence demo on UX for AI Product. The source
    explicitly describes the latter as something to try ("Hit Regenerate to
    see how the interface holds up as certainty drops"), with real confidence
    numbers (88/74/61/52%) from the PDF and a genuine behaviour change at the
    lowest reading — the suggestion defers to a human, matching the source's
    own "graceful low confidence" language, rather than four cosmetic
    relabels of one static state.

## Product Principles

1. Evidence over assertion — every claim on the page should be attached to a number, a named client, or a described method.
2. The copy is the client's; the craft is ours. Structure and words are fixed, so all expressive range lives in material, motion, and color.
3. Serve the skimmer first. An evaluating buyer decides in one viewport whether to keep scrolling.
4. Human and AI are co-equal subjects, not opposites. **The brand line changed on 2026-08-12** from "Designing how human + AI work together" to **"Designing human experience of AI"** — the relationship is no longer a partnership of equals but a human reading of a machine. The headline still names both subjects, so "human" keeps the brand cyan and "AI" the neutral silver; the "+" construction is gone.
5. Nothing may fabricate client proof. Placeholder visuals must read as designed abstraction, never as a real screenshot.

## Accessibility & Inclusion

No client standard was specified. Build to WCAG 2.1 AA as the working floor: motion must respect `prefers-reduced-motion`, all content readable without JavaScript-driven reveals, and text contrast verified against the final dark palette.
