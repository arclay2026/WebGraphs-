# Uber & Bolt fingerprint capture ad (1080×1920, 60 fps, ~37 s)

Same glass style as `../video-ad-webdev`: one frosted panel morphs from a driver sign-up card → the scanner photo (scan + "Captured") → the documents checklist → the R350 price with the next steps → the free driver checker on a phone → the end card.

- `uber.html` — the animation (`render(t)`, cues in `const C`, override with `window.CUES`).
- `webgraphs-uber-voiceover.txt` — the ElevenLabs script.
- Render with `../video-ad/render.js` (set `PAGE` to this page's URL).

Facts shown come from the site: R350 per capture, walk-in with no appointment, SA ID or passport (original), proof of residence not older than 3 months (utility bill, bank statement or affidavit), licence or PrDP optional; approval and timing are set by Uber and Bolt.
