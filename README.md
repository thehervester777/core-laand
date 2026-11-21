# Core Agency — landing page

An immersive, scroll-driven landing page for Core Agency (cloud POS for Bangladesh).
Static and build-free: plain HTML / CSS / vanilla JS. Everything is self-hosted (GSAP, ScrollTrigger and Lenis in `assets/vendor/`,
fonts in `assets/fonts/`), so the site makes no third-party requests apart from sending the demo form.

## Go live on cPanel

1. **Settings.** Open `assets/js/config.js` and fill in:
   - `web3formsKey`: create a free key at https://web3forms.com with the inbox that should receive demo requests;
   - `whatsapp`: the number that receives WhatsApp messages (country code + number, digits only).
2. **Domain.** The site assumes `https://coreagency.com.bd/`. If yours differs, replace that address everywhere it appears
   (`index.html`, `privacy.html`, `terms.html`, `robots.txt`, `sitemap.xml`).
3. **SSL.** In cPanel, make sure AutoSSL (or Let's Encrypt) has issued a certificate for the domain. `.htaccess` redirects everything to HTTPS.
4. **Upload.** In cPanel → File Manager → `public_html`, upload the contents of the deploy zip (or these files):
   `index.html`, `privacy.html`, `terms.html`, `404.html`, `.htaccess`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `assets/`.
   Turn on *Show Hidden Files* in File Manager's settings to see `.htaccess`. Don't upload `README.md`, `video/` or `.claude/`.
5. **Check.** Open the site on a phone, send yourself a test demo request, and confirm the email arrives.
   Then submit `https://your-domain/sitemap.xml` in Google Search Console.

## Receiving demo requests

The form validates in the browser, then emails the request to you through Web3Forms. After sending, the visitor can continue on
WhatsApp with their details pre-filled. If the email can't be sent (no key yet, network trouble), the form offers WhatsApp and
your phone number instead, so a request is never lost. All of this is in `assets/js/close.js`; the settings are in `assets/js/config.js`.

## Run it

- Just open `index.html` in a browser, **or**
- serve the folder locally (Windows, no Node/Python needed):
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
assets/js/config.js     site settings: Web3Forms key, WhatsApp number
assets/css/page.css     privacy · terms · 404 pages
assets/vendor/          GSAP 3.13, ScrollTrigger, Lenis (self-hosted)
assets/fonts/           Aleo (variable, roman + italic) and a tiny Bengali subset
privacy.html, terms.html, 404.html
.htaccess               HTTPS, short URLs, 404, compression, caching, security headers (Apache / cPanel)
robots.txt, sitemap.xml, site.webmanifest, assets/og-image.png (link previews), PNG icons
```

## Behaviour

- **Every screen (desktop, tablet, phone):** the same pinned, scrubbed scenes — hero → iris → philosophy, the engine modules,
  the horizontal industries gallery and the stacking use-case cards. Phones and tablets get their own layouts for each scene
  (engine modules as tabs under the live stage; cards taller than the screen hold with their bottom edge in view).
- **Mouse / trackpad:** Lenis smooth scrolling. **Touch:** native scrolling, with scrubbed scenes easing over 0.5 s (`CA.scrub`).
- **Short landscape screens (< 520 px tall):** no pins; flowing layouts (swipeable gallery, auto-cycling engine stage).
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

One family everywhere: **Aleo**, a modern slab serif with real weights (variable, 100-900) and true italics, self-hosted in `assets/fonts/`
(`@font-face` rules at the top of `assets/css/base.css`) and set once in `:root` as `--f-aleo`. The tokens `--f-display`, `--f-serif` and `--f-sans` are kept as three names
(the stylesheets were written for a display / body split) but all three resolve to Aleo.

- **Hierarchy** comes from size, weight and the italic accent words, not from a second family. Display sizes are light (weights 300-380) with mildly
  negative tracking (about -0.01 to -0.018em); body and UI text are 400-600 with no tracking. The accent words (class `.serif`, and `em` in the
  philosophy statement) are true Aleo italics in the accent colour. Small labels are tracked uppercase.
- **Numerals:** Aleo has no tabular-figures feature, but its digits are within about 5% of equal width, so changing numbers barely move. Big counters are
  left-aligned (as in the original design) so they never shift their neighbours.
- **Coverage** is Latin. The taka sign `৳` and the word ধন্যবাদ come from an 8 KB subset of Noto Sans Bengali; `✓` falls back to the
  system font. If you add other Bengali text, rebuild the subset with fontTools:
  `pyftsubset NotoSansBengali.woff2 --text="৳ধন্যবাদ…" --layout-features='*' --flavor=woff2 --output-file=assets/fonts/noto-sans-bengali-subset.woff2`.
- **History:** the page moved from Fraunces + Instrument Sans to a pixel face (Pixelify Sans, then VT323) and a pixel + Roboto Condensed mix before settling on
  Aleo. The pixel faces were dropped because they read as cheap, and Pixelify Sans drew its digit 5 like an S (`৳50B+` read `৳SOB+`). If you swap
  the face again, check `0 5 8 S O B 1 l I` and the capitals `C` / `O` at 12 px before committing.

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

## Performance rules used here

Anything that loops runs only while its section is on screen (IntersectionObserver / `.is-live`);
ambient motion is CSS keyframes or a small canvas; per-frame work uses transforms/opacity only;
no `backdrop-filter` or blend modes over scrolling content.
