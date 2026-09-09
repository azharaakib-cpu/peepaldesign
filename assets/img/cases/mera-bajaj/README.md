# Mera Bajaj App — case study artwork

`case-mera-bajaj.html` already points at these six files. **No HTML change is
needed** when one lands: the page swaps its labelled empty frame for the image.

| File | What the reference shows there |
|---|---|
| `hero.jpg` | The blue app hero banner with the phone mockups |
| `journey-map.jpg` | The service journey map matrix (the wide dark diagram) |
| `user-flows.jpg` | Wireframes and the flow map on the light ground |
| `light-dark-flow.jpg` | The Light Mode / Dark Mode flow diagram |
| `screens.jpg` | The full gallery of app screens |
| `design-system.jpg` | The component library sheet at the foot of the page |

## Requirements

- **Full width, any height.** These plates are `width:100%; height:auto`, so tall
  diagrams and galleries are fine — nothing is cropped.
- **1600px wide or more.** Plates render about 1130px on a desktop layout, so
  1600px keeps them sharp on 2× displays.
- **`.jpg`** as named above. For `.png` or `.webp`, change the extension in
  `case-mera-bajaj.html`.
- Each plate sits at `grayscale(.72) contrast(.9) brightness(.62)` at rest and
  comes to full tone on hover, matching every other plate on the site. Diagrams
  with fine text stay readable at that setting, but check the journey map.

## What else this page still needs

- **All body copy.** It could not be read from the supplied screenshot, so every
  paragraph carries the `.todo` treatment — italic with a dotted underline,
  deliberately unfinished-looking. Replace the text; never restyle the marker.
- **Four section labels are inferred** from what each block visibly contains:
  `APPROACH`, `OUTCOME`, `USER FLOWS`, `LIGHT & DARK`, `THE SCREENS` and
  `DESIGN SYSTEM`. `BRIEF`, `CHALLENGE`, `PERSONAS` and `COLOUR & TYPOGRAPHY`
  were legible in the reference.
- **The three personas** are empty shells — names and detail needed.
- **The five colour swatches are guesses** taken from the reference's blues, not
  sampled values. Confirm the real palette.
- **Sector and Year** in the facts strip are unset.
