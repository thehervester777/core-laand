# Core Agency — landing page

An immersive, scroll-driven landing page for Core Agency (cloud POS for Bangladesh).
Static and build-free: plain HTML / CSS / vanilla JS. GSAP, ScrollTrigger and Lenis load from the jsDelivr CDN.

## Run it

- Just open `index.html` in a browser, **or**
- serve the folder (Windows, no Node/Python needed):
  `powershell -ExecutionPolicy Bypass -File .claude/serve.ps1` → http://localhost:5173

## Structure

```
index.html              all markup + content
assets/css/             base · hero · story · solutions · proof · close   (one file per page chapter)
assets/css/fx.css       immersion layer: cursor ring, tilt + glare, ripple, curtain depth
assets/js/core.js       helpers, Lenis smooth scroll, header/menu, section index, marquee, reveals
assets/js/hero.js       hero entrance, orbit-ring canvas, live sale loop, hero → iris → philosophy
assets/js/story.js      numbers, pinned "engine" sequence with three live scenes
assets/js/solutions.js  horizontal industries gallery, stacking use-case cards, live widgets
assets/js/proof.js      ROI estimator, comparison reveal, client voices, FAQ
assets/js/close.js      demo form, footer reveal
assets/js/fx.js         immersion layer (see below) — additive, nothing in the other files depends on it
assets/js/main.js       preloader + ordered, non-blocking start-up
```

## Behaviour

- **Mouse / trackpad, ≥ 1024 px:** Lenis smooth scrolling + pinned, scrubbed sequences (hero iris, engine, industries).
- **Touch devices and small screens:** native scrolling, no pins, lighter layouts (stacked comparison cards, swipeable gallery, auto-cycling engine stage).
- **`prefers-reduced-motion`:** fully static page, no preloader.
- **No JS / CDN blocked:** the page degrades to a readable static site.

## Immersion layer (`fx.js` + `fx.css`)

Extra depth and feedback, layered on top of the chapters without replacing any of their animation.
Every feature is an independent function in `fx.js` (`CA.init.fx`), so one can be removed by deleting its `safe(...)` line.

| Feature | Where | Devices |
| --- | --- | --- |
| **Cursor ring** — trails the native pointer, stretches along its direction, grows over links/buttons, steps aside over text fields | whole page | mouse / trackpad |
| **Hero depth** — orbit rings, dot grid, glow and the floating chips each follow the pointer at a different depth | hero | mouse / trackpad |
| **Card tilt + glare** — industry illustrations and use-case widgets lean toward the pointer with a highlight that follows it | industries, use cases | mouse / trackpad |
| **Ink-in copy** — every section lead lights up word by word as it crosses the reading zone | all chapters | all (not reduced motion) |
| **Use-case card entrance** — headline words mask-reveal, kicker and copy rise; the widget glides in a beat behind | use cases | all; widget glide on desktop |
| **Draw-on ticks** — check icons draw themselves, list rows slide in | use cases, ROI | all (not reduced motion) |
| **Stat depth** — the three headline numbers drift at different speeds | numbers | all (not reduced motion) |
| **Button ripple** | every `.btn` | all (not reduced motion) |
| **Footer wordmark** — letters lean away from the pointer | footer | mouse / trackpad |
| **Curtain shadows**, **form-field focus lift** | chapters, demo form | all |

Touch devices get none of the pointer effects; `prefers-reduced-motion` gets none of the motion at all.

Performance rules specific to this layer (checked with a scripted full-page scroll, before/after):

- A 3D transform forces a compositor layer, so tilt cards only carry a transform while hovered and release it after the settle.
- Pointer effects ignore enter/leave events fired by *scrolling* (content sliding under a resting pointer).
- Geometry is measured on pointer enter and at ~6 Hz while moving — never per frame.
- The cursor loop sleeps as soon as the ring has caught up with the pointer; `will-change` is never left on permanently.

## Typography

One pixel typeface everywhere, in the spirit of a classic OS interface: **VT323** (a terminal / bitmap face). It is declared as the
`"Pixel OS"` family in `assets/css/base.css` (served from Google's font CDN, scaled with `size-adjust: 118%` because its em box is small)
and preloaded in `index.html`. The tokens `--f-display`, `--f-serif` and `--f-sans` all point at it.

- **One weight, no italic.** Hierarchy comes from size, colour and case, never from faux bold or italics (`font-synthesis: none`).
  Bold text inside paragraphs is carried by colour (`p b` is full-strength while the paragraph is dimmed). The accent words that used to be italic are
  accent-coloured instead.
- **Monospaced**, so counters, totals and prices never shift their neighbours as the digits change.
- **No negative letter-spacing, ligatures off** (pixel faces look wrong tightened or ligated).
- **Why VT323:** Pixelify Sans was tried first and rejected: its digit 5 is drawn like an S (and 0 like O), so `৳50B+` read `৳SOB+` and
  `Rice 5kg` read `Rice Skg`. Bitcount draws S like `$`. VT323 has unambiguous digits and capitals, even in small tracked uppercase labels.
  If you swap the face again, check `0 5 8 S O B 1 l I` and the capitals `C` / `O` at 12 px before committing.
- Coverage is Latin. The taka sign `৳` comes from Noto Sans/Serif Bengali, requested with `&text=%E0%A7%B3` so only that single glyph
  downloads (about 11 KB instead of ~290 KB); `✓` and arrows fall back to the system monospace font. If you add other Bengali text, drop the `text=` limit.

## Palette

Deep navy, cool slate-white and one cobalt accent. Tokens live in `:root` (`assets/css/base.css`):

| Token | Value | Used for |
| --- | --- | --- |
| `--ink`, `--ink-2`, `--ink-3` | `#0a1b33`, `#12294a`, `#1b3a66` | dark chapters, device mocks, text on paper |
| `--paper`, `--paper-2`, `--paper-3` | `#f3f6fa`, `#e8edf4`, `#d6dee9` | light chapters, surfaces, rules |
| `--accent` | `#2f6beb` | fills: buttons, highlights, progress, dots |
| `--on-accent` | `#ffffff` | text on an accent fill (4.7:1; dark ink on cobalt would fail at 3.5:1) |
| `--accent-fg` | `#1f55cc` | accent as text on paper (6.0:1) |
| `--accent-hi` | `#7aa2ff` | accent as text on navy (6.9:1; the fill colour is only 3.6:1 there) |
| `--ok`, `--warn`, `--bad` | `#17b27b`, `#f4a62a`, `#ef4452` | semantic states |

Never put dark text on the accent fill, and never use `--accent` as small text on navy: use `--on-accent` and `--accent-hi`.

## Wiring the demo form

The form validates and shows a success state, but it is front-end only. Implement
`CA.submitDemo(data)` in `assets/js/close.js` (a commented `fetch` example is there).

## Performance rules used here

Anything that loops runs only while its section is on screen (IntersectionObserver / `.is-live`);
ambient motion is CSS keyframes or a small canvas; per-frame work uses transforms/opacity only;
no `backdrop-filter` or blend modes over scrolling content.
