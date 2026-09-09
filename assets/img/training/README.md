# Training page imagery

| File | Used by | Status |
|---|---|---|
| `participant-grid.jpeg` | `training-researchops.html` section 02, right column | on disk (1196 x 896) |

## participant-grid.jpeg

The twelve-tile montage of participants supplied by the client on 2026-08-13.
`training-researchops.html` already points at this exact path — **no HTML change
is needed.** While the file is missing the `<img>` removes itself and the frame
shows a labelled plate naming the path, so nothing is broken.

### Requirements

- **4:3 landscape.** The frame is `aspect-ratio: 4/3` with `object-fit: cover`,
  which matches the montage as supplied (1196 x 896). Anything else is
  centre-cropped, and on a grid-of-faces image a crop cuts heads — keep the ratio.
- **1400px wide or more.** The frame renders about 470px on a desktop layout, so
  1400px covers 2x displays.
  the heavier one.

### Provenance — read before launch

This is stock photography. It sits under the heading **"Participant profile"** on
a training page, which invites the reading that these people attended this
course. As a single montage it is much safer than the six labelled role frames it
replaced — no individual face is captioned with a job title — but it still shows
people who have no connection to Peepal Design.

Photographs from a real delivered session, with participants' consent, would
remove the issue entirely and would be worth more. See PRODUCT.md.

## Design Leaders Masterclass — `training-design-leaders.html`

| File | Frame | Status |
|---|---|---|
| `dlm-cohort.jpg` | Section 03, beside the participant profile | **NOT ON DISK** |

Both are wired already — drop a file and the frame fills with no code change.
While missing, the `<img>` removes itself and the frame shows a labelled plate
naming the path.

- `dlm-cohort.jpg` — **4:3 landscape, 1200px+.** A working session, people in a
  room. This is the one that carries the page.
Section 05 no longer takes a group shot — the trainers became a 3x2 grid of
individual portraits on 2026-08-13. See `trainers/README.md`.

Same caution as the ResearchOps montage: these are labelled as a real cohort and
real trainers. Photographs from a delivered session are worth far more than stock,
and the trainers are six named, identifiable people.
