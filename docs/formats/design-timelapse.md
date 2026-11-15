# Format: Design timelapse

**Goal:** show the DESIGN PROCESS of a client website (as if a designer builds it in Figma, naturally and with
intent) and then the FINAL PRESENTATION of the finished site. Viewers should feel "these people craft every detail",
and the client should recognise their own site. 9:16, 30–40 s + outro. Done 4×: AKR Gallery West, Bima Sakti Bahari,
BYGY (Be Best), TeAM (Telematika). Engines: `engines/akr`, `bsb`, `bygy`, `tam`.

## Inputs to collect
- Figma file key + node ids: **brief frame** (logo, colours, typography — usually the first frame), **main page**
  (usually Home), **other pages** (supporting). Figma is READ-ONLY.
- Live website (if any): fonts (computed styles), opening/preloader transition, hero video, real copy/testimonials.
- Reference video for style (the owner usually sends one; each video uses a different reference).
- Outro mp4 (Imajiner standard). Check its first frame colour (usually white → end previous scene on white).

## Structure that works (adapt, don't copy)
| Part | ≈ s | Content |
|---|---|---|
| Hook | 2–3 | Frame 0 already in action: extreme close-up of the hero headline being typed (caret visible) or a fast burst of the client's best imagery; pull back. Never a slow logo/title card. |
| Brief | 1.8–2.4 | ONE full-frame motion slide used as a transition: brand colours (incl. button colours) as chips/bars with hex, typography specimens ("Aa", alphabet). Not a frame on the canvas, no eyedropper from it. |
| Process (one take) | 15–20 | ONE continuous cumulative build of the main page on a Figma-like canvas: the frame grows top → bottom, built sections stay. Order per section: frame/bg → photos → overlay → layout (nav, grid) → text → buttons → details. Designer actions: drawRect (size pill), placeImage, typeText (one typo + fix in the whole video), dragSnap (red guides + spacing pills with REAL values), drawStroke, pickColor (hex), Alt-drag duplicate, auto-layout reveal. 4–7 deliberate push-ins (3–4× on text/vectors, ≤1.4× on 1x photos or DOF-blur them) alternating with pull-backs that show the whole frame filling up. |
| Other pages | 4–6 | The rest of the site: full-WIDTH pages (crop height only), e.g. pull back to all frames laid out in a row as in Figma with frame names, glide, push into Home; or a fast slick montage. Meaningful, never a random fanned stack. |
| Ending | 4–5 | Home flat, frame-wide (scale = 1080/page width), scrolling hero → footer at ≤ 50 px/frame peak (shutterScale ≈ 0.3), live hero video playing if the site has one; push to white → outro. |

## Do / don't (from owner feedback)
- DO keep one cursor, start every shot with something already happening, and keep elements being built ≥ 50 % of frame.
- DO use honest values (pills, hex, sizes from the DOM/Figma).
- DON'T put device mockups in the middle of the process (it stops feeling like a process) — mockups only at the end.
- DON'T draw empty placeholder section boxes, fake side panels, layer-search pills, or meaningless cursor moves.
- DON'T hard-cut between two similar shots of the same page (reads as a camera jump) → use a continuous cut.
- DON'T show text labels/captions or a title card ("AKR Gallery West") unless asked.
- Marquee/running text: enough copies to cover the strip at every position.
- Recreate broken-looking sections faithfully (check live site + Figma; draw section backgrounds before content).
- Replace lorem ipsum with real copy from the live site, or never show it close.

## Technical notes
- Designs are recreated as static HTML (`design/final.html`, 1440 wide typically) with `data-el`, `data-kind`,
  `data-name`, `data-w/h`, `data-section` per element; scenes load it in a same-origin iframe and animate elements.
- Figma images: `download_assets` for full-resolution raw images; `get_screenshot` (1x) for page thumbnails.
- Fonts: match the live site exactly (optical sizing / variable fonts matter for wrapping).
