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
| `qr-code.html` | QR code studio — 10 content types, dot/corner styles, colours and gradients, logos, frames, PNG/SVG/JPG/WebP export |

## Files

- `css/site.css` — the one stylesheet for every page. Colours, fonts and spacing are
  CSS variables at the top (`--accent` red, `--ink` navy, `--mist`, `--font`, …).
- `js/site.js` — the one script for every page: mobile menu, live open/closed status,
  scroll reveals, pricing tabs and nav dropdown, theme toggle, bundle calculator, FAQ search, contact form.
- `js/driver-checker.js` — the Uber & Bolt driver checker, used by `driver-checker.html` only (opening hours are repeated at the top).
- `js/signature.js` — the signature maker (drawing pad, handwriting fonts, exports), used by `signature-maker.html` only.
- `js/photos-to-pdf.js` — the photos to PDF tool, with its own small PDF writer, used by `photos-to-pdf.html` only.
- `js/color-picker.js` — the custom colour picker used on the QR and signature pages (replaces the browser's colour popup).
- `js/qr-studio.js` — the QR code studio (content builders, styling, SVG and canvas export), used by `qr-code.html` only.
- `js/vendor/qrcode.js` — QR code engine (MIT, Kazuhiko Arase), used by the studio.
- `assets/` — logos (`logo.svg` for light backgrounds, `logo-white.svg` for navy; `logo-footer.svg` / `logo-full.svg` are the full "WebGraphs Technologies" lockup in white / navy, used in the footer and the opening intro), favicon, course icons and the driver checklist PDF. Your original logo files are in `assets/brand/`. Uber and Bolt logos are in `assets/partners/` (shown via CSS, so Uber turns white in dark mode). Home page photos are in `assets/photos/` (web-sized JPGs; your original uploads are kept in `assets/photos/source/`). `whatsapp-qr.svg` is the WhatsApp QR code in the footer (desktop and tablet only; it opens wa.me/27787347867).

## Common edits

- **Phone / WhatsApp number** — search all files for `27787347867`.
- **Opening hours** — update the text in the pages and the `HOURS` table near the top
  of `js/site.js` (it powers the "Open now" badge, using Johannesburg time) and in
  `js/driver-checker.js` (the visit days).
- **Package prices** — edit the cards in `pricing.html` (and the "From" prices in the
  pricing preview on `index.html`, the services page and the FAQ).
- **Course bundles and prices** — update the `BUNDLES` list in `js/site.js`; the bundle builder and the bundle cards on `courses.html` are both drawn from it.
- **Header and footer** — they are repeated in every page; change all eleven files.

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

## Share previews (WhatsApp, Facebook, X)

Every page has share tags in its `<head>` pointing at a card in `assets/og/` (1200×630 JPG, one per page). To change a card's wording, edit `tools/share-cards/card.html` and run `node tools/share-cards/render.js` (needs Node and Playwright).

**Once the site has its domain:** see "Going live" below — one command puts the full web address into the share previews.

## Driver checklist PDF

`assets/downloads/uber-bolt-registration-checklist.pdf` (linked from the home, services and driver checker pages) is built from `tools/checklist/checklist.html`. Edit the wording there, then run `node tools/checklist/render.js` (needs Node and Playwright) to rebuild the PDF. The QR code on it opens a WhatsApp chat with the studio.

## Software & drivers page

`software.html` lists the software and drivers we install as app cards (each `<li class="sw-app">`, in either the "Software & apps" or the "Drivers" group). To add or remove an app, copy or delete one `<li>`; `data-cat` must be one of the filter chips' `data-filter` values. App logos live in `assets/apps/` (shown on a white tile with `class="sw-app-ic is-logo"`); apps without a logo use a coloured tile with a line icon. `js/software.js` handles the filters, search and the install list that is sent on WhatsApp.

## Page-to-page photo morph

On browsers with cross-document view transitions (Chrome, Edge, Safari 18+), a photo that links to a page with a photo hero (`.page-hero--photo`) grows into that hero instead of the page just fading, and Back shrinks it again. Any photo inside a link works automatically; a photo that is not itself a link can be tied to a page with `data-morph="page.html"` (the courses photo on the home page uses this for "Full curriculum"). The CSS is under "Photo morph" in `css/site.css`, the script is `initMorph` in `js/site.js`.

## Going live (SEO)

Everything search engines need is in place, waiting for the domain:

- `sitemap.xml` and `robots.txt` — the page list for Google, and where to find it.
- A canonical address and full share-picture address (`og:url`, `og:image`) on every page.
- Business details for Google Search and Maps (address, hours, phone, socials) in a `application/ld+json` block in `index.html`.
- `favicon.ico`, `assets/apple-touch-icon.png` and `site.webmanifest` for search results and phone home screens.
- `404.html` — the page shown for broken links (`.htaccess` points Apache/LiteSpeed hosts to it, adds compression and browser caching).

The domain is set: everything points to **https://webgraphs.co.za** (no www). If the domain ever changes, run `python3 tools/set-domain.py https://new-domain` after replacing `https://webgraphs.co.za` with `https://YOUR-DOMAIN` (a find-and-replace across the `.html` files, `sitemap.xml` and `robots.txt` also works).

Then, after the site is live: turn on SSL and un-comment the four redirect lines at the bottom of `.htaccess` (sends http:// and www. visitors to https://webgraphs.co.za), add the site to Google Search Console and submit `sitemap.xml`, and create/claim the Google Business Profile with the same address and hours. When a page's content changes a lot, update its `<lastmod>` date in `sitemap.xml`.
