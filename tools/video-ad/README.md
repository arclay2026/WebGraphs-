# Vertical video ad (1080×1920, 60 fps)

- `ad.html` — the whole ad as an animated page. Every frame is a pure function of time (`render(t)`), so it renders perfectly smoothly. Scene timings are in the `C` object near the top; they can be overridden with `window.CUES` to sync to a voiceover.
- `webgraphs-voiceover.txt` — the voiceover script (pasted into ElevenLabs).
- `render.js` — captures every frame with Playwright and encodes an MP4 with ffmpeg:
  `node render.js out.mp4 60 png [voiceover.mp3] [cues.json]`

`ad.html` loads the site's images from `/webgraphs-/assets/`, so serve the folder *above* the site (e.g. `python3 -m http.server 8800` from the parent folder) and open `http://localhost:8800/webgraphs-/tools/video-ad/ad.html` after changing `const A` to `'/webgraphs-/assets/'` or `'../../assets/'`.
