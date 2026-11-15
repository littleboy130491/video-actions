# Lessons & history (read before starting a new video)

## Previous videos (make the next one DIFFERENT)
| Video | Format | Reference | Look / structure | Engine |
|---|---|---|---|---|
| AKR Gallery West | design timelapse | Skyscanner brand-in-motion | black stage ↔ brand colour fields, bento token grid, 3D page glide, match cuts, Home scroll | akr |
| Bima Sakti Bahari | design timelapse | Skyscanner (owner: too similar to AKR) | same grammar, ocean palette | bsb |
| BYGY / Be Best | design timelapse | Naver "2022 in keywords" | product-photo hook burst, light Figma-like one-take, brief as motion slide, desktop→tablet→mobile, Home scroll | bygy |
| TeAM (Telematika) | design timelapse | Obys Showreel 2024 | live-site preloader + curtain opening with hero video, dark canvas one-take, pages in a row as in Figma, Home scroll with hero video | tam |
| Imajiner promo | motion ad | (owner direction: minimalist luxury) | kinetic type hook, masonry portfolio, 4 benefit vignettes, stat punches | imj |

## Owner feedback that became rules
- Never touch the client's Figma. No labels/captions. No meaningless cursor actions or empty placeholders.
- Hook must be compelling from frame 0 (no slow title card / tiny label on black).
- Process = one cumulative take; mockups only in the final presentation; brief = one motion slide.
- Vary zoom: clear push-ins and pull-backs (4–7 per process); elements fill the frame.
- Other pages: never cropped in width; meaningful arrangement; smooth transition into the ending.
- Ending: Home flat and full, scrolling (not resizing), live hero video when the site has one.
- Faithfulness: use the real site's fonts, hero video and layered images (the ssgid ship is a PNG over the sea video).
- Promo: text never over images; plain/gradient luxury look; but keep energetic camera transitions.
- Portfolio: no flicker, no cheap carousel → masonry with elegant parallax.
- Stats: one by one, like punches, big, readable labels.
- Each new video must differ significantly from the last.

## Technical lessons
- 2-sample frame blending = ghosting → adaptive shutter; declare cutTimes (blur across a cut = double exposure).
- Scenes without `motionPx` rely on an image estimate; small fast movers need dense sampling (MIN_N, fixed in core).
- Video elements: seek deterministically (`video.currentTime` + await 'seeked'); load as blob if the server can't
  serve byte ranges; skip corrupt first frames of supplied clips.
- Live sites: record with Playwright `record_video_dir`; YouTube embeds can't be downloaded here — ask the owner
  for the file.
- Fonts: check computed styles on the live site (e.g. ssgid = Josefin Sans headings + Jost body).
- Lighthouse on portfolio sites (Nov 2026) scored 29–57 mobile → don't claim speed numbers unless measured high.
- Token cost is dominated by long agent histories and images, not rendering → fresh agents per big revision, one
  contact sheet per review.

## Reference library
Skyscanner (beat cuts, bento token grid, colour-field match cuts), Naver (keyword search → world, devices in white
space, giant 3D type), Obys (black stage, giant block type, flat screens with block masks, bending pages, mobile grid,
fast-cut bursts, no cursor). Add each new reference with 6–10 concrete traits.
