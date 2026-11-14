# templates/ — reusable scenes on our seek contract

Generic, parameterised starting scenes restyled from HyperFrames catalog blocks (Apache-2.0, see `NOTICE`).
Each is deterministic (`window.DURATION`, `window.ready`, pure `window.seek(t[,tc])`, `cutTimes()`, exact
`motionPx(a,b)` so `core/render.py` picks the shutter sample count without image estimates). No GSAP: easing is
`core/kit.js`. No client content: every image, font and text comes from params.

## Use
```
cp core/kit.js templates/tpl.js templates/transition.js  P/engine/      # runtime (transition.js: transition + counter)
cp templates/counter.html P/scenes/s4_stats.html                       # then edit window.PARAMS at its top
python3 core/render.py --project P --scene s4_stats --stills 0.5 1.5 3   # check
```
Params: `window.PARAMS = {...}` in the copy (merged deeply over the defaults, arrays replace), or for quick tests
`scenes/x.html?p={"type":"whip"}` / `?type=whip`. Image/font URLs are relative to `scenes/` (`../assets/x.jpg`).
`fonts: [{family, url, weight}]` are loaded before the first frame (a missing file stops `core/render.py` with its
name); set `font` to the CSS family list. All scenes are 1080x1920.

## transition.js — `TX` (zoom-through + whip-pan between any two layers)
`TX.apply(type, A, B, u, o)` sets transform/filter/visibility of two full-frame, absolutely positioned layers for
progress `u` (0 = A at rest, 1 = B at rest); `TX.px(type, ua, ub, o)` = on-screen displacement for `motionPx`;
`TX.at(t, t0, dur)` = progress.
- `'zoom'`: camera pushes into A (scale x(1+2.4·depth), blur), B fades in on top from scale .62 and settles.
  `o.x/o.y` focal point, `o.depth` (1), `o.blur` (18).
- `'whip'`: A and B on one strip, one inOutCubic travel of a frame width (matched seam velocity), horizontal or
  vertical SVG streak blur peaking mid-whip. `o.dir` left|right|up|down, `o.blur` (12), `o.seam` css colour.
  core/render.py adds real shutter blur on top; lower `blur` if it reads too soft.

## transition.html — two layers + TX
| param | default | |
|---|---|---|
| duration | 3 | s |
| type | 'zoom' | 'zoom' / 'whip' |
| at, dur | 0.9, 0.75 | start / length of the transition (whip reads best 0.45–0.6) |
| dir, seam, blur | 'left', '', null | whip options (blur null = type default) |
| depth, focal | 1, null | zoom push strength; focal `[x, y]` |
| a, b | {bg, image, title, sub, color, size} | the two layers: background colour, cover image, caption |
| font, fonts | system-ui, [] | |

## counter.html — stats punch with odometer digits (number-wheel)
One full-frame panel per stat; the value lands with a scale punch while each digit rolls on its own strip
(right-most first); label (above) and sub-line rise in; panels are joined by TX or a hard cut.
| param | default | |
|---|---|---|
| duration | 4.5 | split evenly between stats |
| stats | 3 examples | `[{value: '12,500', prefix: '$', suffix: '+', label, sub}]`; only digits roll |
| themes | navy / cream | cycled per panel: `{bg, color, accent, subColor}` (accent = label + suffix) |
| transition, trDur, dir | 'zoom', 0.5, 'left' | 'zoom' / 'whip' / 'cut' (cut is declared in cutTimes) |
| roll, stagger, spin | 1.0, 0.07, 0 | roll length, per-column delay, extra 0–9 revolutions |
| size, maxWidth | 360, 900 | value px; shrunk per panel to fit maxWidth |
| weight, tracking, labelSize, subSize | 300, -0.04, 44, 46 | |

## browser_stage.html — page scroll in a browser or phone frame
| param | default | |
|---|---|---|
| duration | 6 | |
| chrome, theme | 'browser', 'light' | 'browser' / 'phone'; 'light' / 'dark' chrome |
| image | '' | tall page screenshot (required), fitted to the screen width |
| url | 'example.com' | address pill |
| scroll | [[1.3,0],[3,1100],[3.9,1100],[5.3,2300]] | `[t, y]` keys, y in page px at screen width, inOutCubic, clamped to the page |
| bg | light blue gradient | any CSS background |
| width, y | 0, 0 | device width (0 = 940 browser / 600 phone), vertical offset |
| enter, tilt | 0.9, 10 | entrance (rise + scale + rotateX settle) |
| exit, exitDur | 'none', 0.5 | 'none' / 'fade' / 'up' |
| scrollbar | true | thin indicator while scrolling |
| caption | {title, sub, top, color, size, subSize} | optional text above the device |

## chat_thread.html — conversation with typing indicator
| param | default | |
|---|---|---|
| duration | 9 | |
| theme | 'whatsapp' | 'whatsapp' (WhatsApp-style colours, generic, no logos) / 'imessage' |
| contact, status, avatar | 'Alex', 'online', '' | avatar URL ('' = initial letter) |
| clock, stamp | '9:41', '09:41' | status-bar clock, bubble timestamps (whatsapp) |
| messages | 4 examples | `[{from: 'them' or 'me', text, at?}]`; `at` omitted = auto |
| start, beat | 0.4, 0.9 | first action; pause after each arrival |
| typing | 1.0 | typing dots (+ "typing..." in the whatsapp header) before each received message; 0 = off |
| typeMine, cps | true, 26 | sent messages are typed into the input bar first (characters by frame centre `tc`) |
| fontSize, font, fonts | 46, system stack, [] | |
| colors | {} | override theme tokens: wall, themBg, themInk, meBg, meInk, hdBg, sendBg, ... |
The thread is laid out once and measured; it scrolls up (outCubic 0.45 s) whenever a typing bubble or message
would pass the input bar.
