# Web & app development ad (1080×1920, 60 fps, ~40 s)

Glass ("glassmorphism") panels on navy, with one frosted panel that morphs from scene to scene:
social post → website → package ladder → phone → web-app dashboard → end card.

- `webdev.html` — the animation; every frame is a pure function of time (`render(t)`). Cue times are in `const C` and can be overridden with `window.CUES` to sync to the voiceover.
- `webgraphs-webdev-voiceover.txt` — the ElevenLabs script.
- Render with `../video-ad/render.js` (set `PAGE` to this page's URL).

Prices and features shown come from `pricing.html` (Landing page R3,500, Business website R7,500, Pro website with bookings R14,500, Online store from R22,000; mobile apps "coming soon").
