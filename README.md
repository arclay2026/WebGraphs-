# Web Graphs Technologies — Website

The redesigned website for Web Graphs Technologies, a Johannesburg studio offering
Uber & Bolt fingerprint capture, web & app development, graphic design, Adobe
design courses, office printing and software installation.

Plain HTML, CSS and JavaScript — no build step, no dependencies. Upload the folder
to any static host (Hostinger, Netlify, GitHub Pages, cPanel) and it works.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home — hero, services, fingerprint capture, courses, work, visit, CTA |
| `services.html` | All six services in detail, plus a "pick a service" WhatsApp form |
| `courses.html` | Curriculum for each Adobe course, bundle price calculator, full price table |
| `pricing.html` | Design and website packages (4 each) with prices, plus app development coming soon |
| `about.html` | Story, mission, values and location |
| `faq.html` | Searchable FAQ grouped by topic |
| `contact.html` | Contact details, map and a form that opens WhatsApp pre-filled |
| `driver-checker.html` | Uber & Bolt driver checker — what to bring for fingerprint capture, proof-of-residence date check, visit day, WhatsApp checklist |
| `signature-maker.html` | Signature maker — draw a signature, or type a name and get a realistic pen-style signature (style, flourish, "Try another"), download a trimmed transparent PNG, JPG or SVG |
| `photos-to-pdf.html` | Photos to PDF — combine document photos into one PDF (reorder, rotate, scanned look, A4/Letter, download or share) |
| `bg-remover.html` | Background remover — AI cut-out (tap to keep/remove), plain-backdrop mode, erase/restore brush, new backgrounds, PNG/JPG export |
| `qr-code.html` | QR code studio — 10 content types, dot/corner styles, colours and gradients, logos, frames, PNG/SVG/JPG/WebP export |

## Files

- `css/site.css` — the one stylesheet for every page. Colours, fonts and spacing are
  CSS variables at the top (`--accent` red, `--ink` navy, `--mist`, `--font`, …).
- `js/site.js` — the one script for every page: mobile menu, live open/closed status,
  scroll reveals, pricing tabs and nav dropdown, theme toggle, bundle calculator, FAQ search, contact form.
- `js/driver-checker.js` — the Uber & Bolt driver checker, used by `driver-checker.html` only (opening hours are repeated at the top).
- `js/signature.js` — the signature maker (drawing pad, handwriting fonts, exports), used by `signature-maker.html` only.
- `js/photos-to-pdf.js` — the photos to PDF tool, with its own small PDF writer, used by `photos-to-pdf.html` only.
- `js/bg-remover.js` — the background remover, used by `bg-remover.html` only. Its AI is MediaPipe (Apache 2.0), kept in `js/vendor/mediapipe/` with the model in `assets/models/`; both only download when someone uses the tool.
- `js/color-picker.js` — the custom colour picker used on the QR and signature pages (replaces the browser's colour popup).
- `js/qr-studio.js` — the QR code studio (content builders, styling, SVG and canvas export), used by `qr-code.html` only.
- `js/vendor/qrcode.js` — QR code engine (MIT, Kazuhiko Arase), used by the studio.
- `assets/` — logos (`logo.svg` for light backgrounds, `logo-white.svg` for navy), favicon, course icons and the driver checklist PDF. Your original logo files are in `assets/brand/`. Uber and Bolt logos are in `assets/partners/` (shown via CSS, so Uber turns white in dark mode).

## Common edits

- **Phone / WhatsApp number** — search all files for `27787347867`.
- **Opening hours** — update the text in the pages and the `HOURS` table near the top
  of `js/site.js` (it powers the "Open now" badge, using Johannesburg time) and in
  `js/driver-checker.js` (the visit days).
- **Package prices** — edit the cards in `pricing.html` (and the "From" prices in the
  pricing preview on `index.html`, the services page and the FAQ).
- **Course bundles and prices** — update the `BUNDLES` list in `js/site.js` and the
  price table in `courses.html`.
- **Header and footer** — they are repeated in every page; change all twelve files.

## Opening intro

The first page someone opens in a visit plays a short logo intro (skipped for
visitors who prefer reduced motion; a click or key press speeds it up). It's
`initSplash` in `js/site.js` and the "Opening splash" styles in `css/site.css`.
Add `?intro` to any page address to replay it, e.g. `index.html?intro`.

## Running locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
