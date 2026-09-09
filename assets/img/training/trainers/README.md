# Design Leaders Masterclass — trainer portraits

Section 05 of `training-design-leaders.html` shows six trainers in a 3×2 grid.
Each portrait is a live slot: **drop a file here and that frame fills with no
code change.**

| File | Trainer | Company |
|---|---|---|
| `wojciech-chojnacki.jpg` | Wojciech Chojnacki | Symetria UX, Poland |
| `daniel-torres.jpg` | Daniel Torres | Torresburriel Estudio, Spain |
| `rajesh-ghodke.jpg` | Rajesh Ghodke | Peepal Design, India |
| `stefano-zanini.jpg` | Stefano Zanini | Assist Digital, Italy |
| `florian-egger.jpg` | Florian Egger | Telono, Switzerland |
| `joelle-stemp.jpg` | Joelle Stemp | Yu Centrik, Canada |

Until a file exists the `<img>` removes itself on error and the trainer's
initials show through, so the grid stays even rather than showing six broken
frames.

## Requirements

- **Square.** Frames are `aspect-ratio: 1` with `object-fit: cover`, so anything
  else is centre-cropped. They go 5:4 on a phone.
- **600px or larger.** Frames render about 360px on a desktop layout.
- **A face centred, room above the shoulders.** The name sits below the frame,
  not over it, so nothing is covered — but a tight crop still reads badly at this
  size.
- No filter is applied. These render at full tone, unlike the case study plates.

## These must be the real people

Six named, identifiable individuals at six named companies, one of them Peepal's
own Head of Design. A stock face in any of these frames is a false claim about a
specific person, not a placeholder. Use their own photographs, with permission —
or leave the initials, which claim nothing.
