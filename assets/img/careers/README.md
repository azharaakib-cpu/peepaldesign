# Careers imagery

## Hero carousel — section 00, full-bleed, above "The Peepal advantage"

Four slides (client request, 2026-08-14, converting an earlier single banner
image the same day). Each is a real, independent image slot:

| File | Slide | Status |
|---|---|---|
| `hero-1.jpeg` | 1 | on disk |
| `hero-2.jpeg` | 2 | on disk |
| `hero-3.jpeg` | 3 | on disk |
| `hero-4.jpeg` | 4 | on disk — **identical to hero-1.jpeg** |

All four landed 2026-08-15, as `.jpeg` — the markup originally pointed at
`.jpg` for all four (matching the other slots on this page), so every slide
was silently falling back to its placeholder until that was corrected.

**`hero-4.jpeg` is a byte-for-byte duplicate of `hero-1.jpeg`** (matching
SHA-256 checksums, identical file size) — confirmed, not a guess. The
carousel treats it as a normal fourth slide, so right now it plays the same
photo twice with different dot indicators either side of it. Worth swapping
for a genuinely different fourth photograph; the height is already correct
(1376 x 768, matching the other three) if it needs replacing.

Each `<img>` falls back to `hero-<n>.svg` — a numbered placeholder in the
site's own contact-sheet style, committed alongside — so the carousel stays
fully functional (autoplay, dots, pause on hover/focus) while any slide is
missing, and each fills in independently the moment its own file lands. No
markup or script change needed either way.

### Requirements

- **1600×1080 or the same 40:27 ratio**, larger is fine. The frame is
  `object-fit:cover`, `object-position:top`.
- **Only the top half ever shows.** The visible window is a fixed 540px —
  exactly half of the declared 1080px image height, cropped permanently, not
  a scroll reveal — so compose each photo with what matters in its upper half.
- Four **different** images. Reusing one file across all four slides would
  make the dots and autoplay pointless.

### Please use real photographs of the studio

Same note as the "Working Here" images below: this carousel sits at the very
top of a careers page, the first thing a candidate sees. A stock crowd here
makes the strongest, least truthful first impression the page could give.
Real photographs from the studio, hackdays or showcases are worth far more,
and the placeholders are honest about what they are until then.

---

## "The Peepal advantage" section — the four list-item photographs

`careers.html` section 01 uses the home page's services pattern: the list
scrolls on the left, one photograph holds the plate on the right and changes
as each item comes into focus.

| File | Item |
|---|---|
| `01.jpeg` | In-house workshops |
| `02.jpeg` | Mentored internships |
| `03.jpeg` | Flexible work style |
| `04.jpeg` | Team rituals |

Supplied 2026-08-14, all four at exactly 896 x 1200. The numbering runs in the
same order as the items on the page. The filenames were left as supplied
rather than renamed to match the slugs — `careers.html` points at them
directly, so **replacing one means keeping its number**, or updating the
`src` in the markup.

`<slug>.svg` alongside each is the drawn placeholder that ran before the
photographs arrived. Still wired as `onerror` fallbacks, so pulling a
photograph degrades to a labelled plate instead of leaving a hole.

## One thing dropping in either set of files will not fix

**Condensed labels go normal-width.** Several components on this site set
`font-stretch` (usually `66%`) for a tracked, condensed look, which relies on
Archivo's width axis — Inter and Red Hat Display's variable fonts have no
width axis at all. Not relevant to the images above directly, but worth
knowing if a caption or stamp near them looks wider than expected once a real
photo is in place and the surrounding type is checked.
