# Case study artwork (portfolio.html)

Drop each case study's image here as `<slug>.jpg`. `portfolio.html` already
points at these paths — **no HTML change is needed** when a file lands.

| Slug | Case study | Shows now until you add it |
|---|---|---|
| `mera-bajaj-app` | Mera Bajaj App | `work/samsung.jpg` |
| `rolling-research` | Rolling Research Programme | `work/nebula.jpg` |
| `clarion-360-erp` | Clarion 360 ERP Redesign | `work/flender.jpg` |
| `tp-vision-enote` | TP Vision eNote App | `work/meta.jpg` |

Each card falls back to the placeholder listed above if its file is missing, so
the page never shows a broken image and you can add them one at a time.

## Requirements

- **Landscape, around 16:10.** The plate is `aspect-ratio: 16/10` with
  `object-fit: cover`, so anything wider or taller is centre-cropped.
- **1600px wide or more.** Plates render about 552px wide on a desktop layout,
  so 1600px keeps them sharp on 2× displays. `.jpg` for photographs; rename the
  extension in `portfolio.html` if you supply `.png` or `.webp`.
- **Bear the darkroom treatment in mind.** At rest each plate is pushed to
  `grayscale(.85) contrast(.88) brightness(.42)` and only comes to full tone on
  hover. Images that rely on one flat brand colour lose most of their character
  in the resting state; images with structure and tonal range survive it.

## Still needed

The four current images are placeholders borrowed from the homepage's work
section. They show unrelated scenes — Bajaj, Clarion 360 and TP Vision are
recognisable clients, and the present pictures are not their work. **Replace all
four before launch.**
