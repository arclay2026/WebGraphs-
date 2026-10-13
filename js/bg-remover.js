/* =====================================================================
   WEB GRAPHS — BACKGROUND REMOVER
   Two ways to cut out the subject, both entirely in the browser:
   • AI: MediaPipe's interactive segmenter (js/vendor/mediapipe, model in
     assets/models). It runs once on the centre of the photo, then every
     tap keeps or removes whatever object is under the finger.
   • Plain background: flood-fills a solid backdrop (white wall, studio
     paper) from the edges, or from wherever you click.
   The result is a "keep" mask (0–255 per pixel) that a brush can touch
   up; the edge setting turns it into alpha. Nothing is uploaded.
   ===================================================================== */
(function () {
  'use strict';

  const root = document.getElementById('bgr');
  if (!root) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const view = $('#bgr-view');
  const vctx = view.getContext('2d');
  const stage = $('#bgr-stage');
  const status = $('#bgr-status');
  const brushRing = $('#bgr-ring');
  const MAX_SIDE = 2000;
  const MAX_UNDO = 15;
  const EDGES = { soft: [0.12, 0.88], medium: [0.32, 0.68], sharp: [0.46, 0.54] };

  let W = 0; let H = 0; let name = 'image';
  let src = null; let srcData = null;          // working copy of the photo
  let keep = null;                            // Uint8Array, 255 = keep
  let undo = []; let redo = [];
  let cut = null; let cutCtx = null; let cutData = null;
  let blurred = null;                         // blurred photo for the "Blur" background
  let segmenter = null; let segLoading = null;
  let plainRef = null;                        // [r, g, b] backdrop colour in plain mode
  let plainSeeds = [];                        // extra seed points clicked in plain mode
  let comparing = false;

  const opt = () => ({
    method: $('input[name="bgr-method"]:checked').value,
    tool: $('input[name="bgr-tool"]:checked').value,
    edges: $('input[name="bgr-edges"]:checked').value,
    bg: $('input[name="bgr-bg"]:checked').value,
    color: $('#bgr-color').value,
    size: Number($('#bgr-size').value),
    tol: Number($('#bgr-tol').value),
  });
  function say(text, kind) { status.textContent = text; status.className = `bgr-status${kind ? ` is-${kind}` : ''}`; }

  /* ---------- loading a photo ---------- */
  function openFile(file) {
    if (!file || !(file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(file.name))) { say('Choose a photo — JPG, PNG or WebP.', 'error'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      name = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'image';
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      W = Math.max(1, Math.round(img.naturalWidth * k)); H = Math.max(1, Math.round(img.naturalHeight * k));
      src = document.createElement('canvas'); src.width = W; src.height = H;
      const sc = src.getContext('2d', { willReadFrequently: true });
      sc.drawImage(img, 0, 0, W, H);
      srcData = sc.getImageData(0, 0, W, H).data;
      cut = document.createElement('canvas'); cut.width = W; cut.height = H;
      cutCtx = cut.getContext('2d'); cutData = cutCtx.createImageData(W, H);
      blurred = null;
      keep = new Uint8Array(W * H).fill(255);
      undo = []; redo = []; plainSeeds = []; plainRef = null;
      view.width = W; view.height = H;
      root.classList.add('has-image');
      $('#bgr-dims').textContent = `${W} × ${H}px`;
      run();
    };
    img.onerror = () => { URL.revokeObjectURL(url); say('That photo couldn’t be opened. iPhone HEIC photos: choose it again as a JPG.', 'error'); };
    img.src = url;
  }
  $('#bgr-file').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
  $('#bgr-file2').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
  const drop = $('#bgr-drop');
  ['dragenter', 'dragover'].forEach((t) => root.addEventListener(t, (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault(); drop.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach((t) => root.addEventListener(t, () => drop.classList.remove('is-over')));
  root.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); openFile(e.dataTransfer.files[0]); } });
  document.addEventListener('paste', (e) => { const f = e.clipboardData && e.clipboardData.files[0]; if (f) openFile(f); });

  /* ---------- the AI ---------- */
  function loadSegmenter() {
    if (segmenter) return Promise.resolve(segmenter);
    if (segLoading) return segLoading;
    const base = new URL('js/vendor/mediapipe/', document.baseURI).href;
    segLoading = (async () => {
      say('Loading the AI (about 16 MB the first time)…', 'busy');
      const vision = await import(`${base}vision_bundle.mjs`);
      const fileset = { wasmLoaderPath: `${base}wasm/vision_wasm_internal.js`, wasmBinaryPath: `${base}wasm/vision_wasm_internal.wasm` };
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: new URL('assets/models/magic_touch.tflite', document.baseURI).href, delegate },
        outputConfidenceMasks: true, outputCategoryMask: false,
      });
      try { segmenter = await vision.InteractiveSegmenter.createFromOptions(fileset, opts('GPU')); }
      catch (err) { segmenter = await vision.InteractiveSegmenter.createFromOptions(fileset, opts('CPU')); }
      return segmenter;
    })();
    segLoading.catch(() => { segLoading = null; });
    return segLoading;
  }
  // Ask the model for the object under (x, y) — returns a Uint8Array mask.
  async function objectAt(x, y) {
    const seg = await loadSegmenter();
    const result = seg.segment(src, { keypoint: { x: x / W, y: y / H } });
    const m = result.confidenceMasks[0];
    const f = m.getAsFloat32Array();
    const mw = m.width; const mh = m.height;
    const out = new Uint8Array(W * H);
    if (mw === W && mh === H) { for (let i = 0; i < out.length; i += 1) out[i] = f[i] * 255; }
    else {
      for (let yy = 0; yy < H; yy += 1) {
        const sy = Math.min(mh - 1, Math.floor((yy * mh) / H));
        for (let xx = 0; xx < W; xx += 1) out[yy * W + xx] = f[sy * mw + Math.min(mw - 1, Math.floor((xx * mw) / W))] * 255;
      }
    }
    result.close();
    return out;
  }

  /* ---------- plain background ---------- */
  function cornerColour() {
    const pts = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]];
    const c = [0, 0, 0];
    pts.forEach(([x, y]) => { const i = (y * W + x) * 4; c[0] += srcData[i]; c[1] += srcData[i + 1]; c[2] += srcData[i + 2]; });
    return c.map((v) => v / 4);
  }
  function plainMask() {
    const o = opt();
    const tol = (o.tol / 100) * 160 + 6;
    const t2 = tol * tol;
    const out = new Uint8Array(W * H).fill(255);
    const near = (i, ref) => {
      const p = i * 4; const dr = srcData[p] - ref[0]; const dg = srcData[p + 1] - ref[1]; const db = srcData[p + 2] - ref[2];
      return dr * dr + dg * dg + db * db <= t2;
    };
    // flood outwards from the start pixels through everything close to ref
    const flood = (starts, ref) => {
      const seen = new Uint8Array(W * H); const stack = [];
      const push = (i) => { if (!seen[i] && near(i, ref)) { seen[i] = 1; stack.push(i); } };
      starts.forEach(push);
      while (stack.length) {
        const i = stack.pop(); out[i] = 0;
        const x = i % W;
        if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
        if (i >= W) push(i - W); if (i < W * (H - 1)) push(i + W);
      }
    };
    const base = plainRef || cornerColour();
    if ($('#bgr-everywhere').checked) {
      for (let i = 0; i < out.length; i += 1) if (near(i, base)) out[i] = 0;
    } else {
      const edge = [];
      for (let x = 0; x < W; x += 1) edge.push(x, (H - 1) * W + x);
      for (let y = 0; y < H; y += 1) edge.push(y * W, y * W + W - 1);
      flood(edge, base);
    }
    plainSeeds.forEach((s) => flood([s.i], s.ref));
    // soften the cut so it doesn't look jagged
    return boxBlur(out, W, H, o.edges === 'sharp' ? 0 : o.edges === 'medium' ? 1 : 2);
  }
  function boxBlur(a, w, h, r) {
    if (!r) return a;
    const tmp = new Uint8Array(a.length); const out = new Uint8Array(a.length); const n = r * 2 + 1;
    for (let y = 0; y < h; y += 1) {
      let s = 0; const row = y * w;
      for (let x = -r; x <= r; x += 1) s += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x += 1) {
        tmp[row + x] = s / n;
        s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x += 1) {
      let s = 0;
      for (let y = -r; y <= r; y += 1) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y += 1) {
        out[y * w + x] = s / n;
        s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  /* ---------- first pass ---------- */
  let busy = false;
  async function run() {
    if (!src || busy) return;
    const o = opt();
    busy = true; root.classList.add('is-busy');
    try {
      if (o.method === 'plain') {
        keep = plainMask();
        say('Background removed. Click any leftover background to remove it too.', 'ok');
      } else {
        await loadSegmenter();
        say('Finding the subject…', 'busy');
        const m = await objectAt(W / 2, H / 2);
        keep = m;
        const kept = keep.reduce((s, v) => s + (v > 127), 0) / keep.length;
        say(kept < 0.02
          ? 'Couldn’t find a subject in the centre — tap “Keep” on the thing you want.'
          : 'Done. Tap “Keep” or “Remove” on any part to fix it, or brush the edges.', kept < 0.02 ? 'error' : 'ok');
      }
      undo = []; redo = [];
    } catch (err) {
      say('The AI couldn’t start in this browser. Try an up-to-date Chrome, Edge or Safari — or use “Plain background”.', 'error');
      console.error(err);
    } finally {
      busy = false; root.classList.remove('is-busy');
      syncTools(); render();
    }
  }

  /* ---------- drawing the result ---------- */
  function lut() {
    const [a, b] = EDGES[opt().edges];
    const t = new Uint8Array(256);
    for (let v = 0; v < 256; v += 1) {
      let x = (v / 255 - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x;
      t[v] = Math.round(x * x * (3 - 2 * x) * 255);
    }
    return t;
  }
  function makeCut() {
    const t = lut(); const d = cutData.data;
    for (let i = 0, p = 0; i < keep.length; i += 1, p += 4) {
      d[p] = srcData[p]; d[p + 1] = srcData[p + 1]; d[p + 2] = srcData[p + 2]; d[p + 3] = t[keep[i]];
    }
    cutCtx.putImageData(cutData, 0, 0);
  }
  function paintBackground(ctx, w, h, o) {
    if (o.bg === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    else if (o.bg === 'color') { ctx.fillStyle = o.color; ctx.fillRect(0, 0, w, h); }
    else if (o.bg === 'blur') {
      if (!blurred) {
        blurred = document.createElement('canvas'); blurred.width = W; blurred.height = H;
        const b = blurred.getContext('2d'); const r = Math.max(6, Math.round(Math.max(W, H) / 90));
        b.filter = `blur(${r}px)`; b.drawImage(src, -r * 2, -r * 2, W + r * 4, H + r * 4);
      }
      ctx.drawImage(blurred, 0, 0, w, h);
    }
  }
  function render() {
    if (!src) return;
    const o = opt();
    vctx.clearRect(0, 0, W, H);
    stage.classList.toggle('is-transparent', o.bg === 'transparent' && !comparing);
    if (comparing) { vctx.drawImage(src, 0, 0); return; }
    makeCut();
    paintBackground(vctx, W, H, o);
    vctx.drawImage(cut, 0, 0);
    $$('[data-bgr-need]').forEach((b) => { b.disabled = busy; });
    $('#bgr-undo').disabled = !undo.length; $('#bgr-redo').disabled = !redo.length;
  }

  /* ---------- editing: taps and brush ---------- */
  function snapshot() { undo.push(keep.slice()); if (undo.length > MAX_UNDO) undo.shift(); redo = []; }
  function toImage(e) {
    const r = view.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, k: W / r.width };
  }
  function brushAt(p, prev, value, radius) {
    const steps = prev ? Math.max(1, Math.ceil(Math.hypot(p.x - prev.x, p.y - prev.y) / (radius / 3))) : 1;
    for (let s = 1; s <= steps; s += 1) {
      const cx = prev ? prev.x + ((p.x - prev.x) * s) / steps : p.x;
      const cy = prev ? prev.y + ((p.y - prev.y) * s) / steps : p.y;
      const x0 = Math.max(0, Math.floor(cx - radius)); const x1 = Math.min(W - 1, Math.ceil(cx + radius));
      const y0 = Math.max(0, Math.floor(cy - radius)); const y1 = Math.min(H - 1, Math.ceil(cy + radius));
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const d = Math.hypot(x - cx, y - cy) / radius;
          if (d > 1) continue;
          const f = d < 0.7 ? 1 : (1 - d) / 0.3; // soft rim
          const i = y * W + x;
          keep[i] = value ? Math.max(keep[i], 255 * f) : Math.min(keep[i], 255 * (1 - f));
        }
      }
    }
  }
  let painting = null;
  view.addEventListener('pointerdown', async (e) => {
    if (!src || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const o = opt(); const p = toImage(e);
    e.preventDefault();
    if (o.tool === 'erase' || o.tool === 'restore') {
      view.setPointerCapture(e.pointerId);
      snapshot();
      painting = { prev: p, value: o.tool === 'restore', radius: o.size * p.k / 2 };
      brushAt(p, null, painting.value, painting.radius); render();
      return;
    }
    // taps
    snapshot();
    if (o.method === 'plain') {
      const i = Math.floor(p.y) * W + Math.floor(p.x);
      if (o.tool === 'keep') { brushAt(p, null, true, Math.max(W, H) / 40); render(); return; }
      const px = i * 4;
      plainSeeds.push({ i, ref: [srcData[px], srcData[px + 1], srcData[px + 2]] });
      const before = keep; const m = plainMask();
      for (let j = 0; j < keep.length; j += 1) keep[j] = Math.min(before[j], m[j]);
      render(); return;
    }
    busy = true; root.classList.add('is-busy'); say(o.tool === 'keep' ? 'Adding that part…' : 'Removing that part…', 'busy');
    pulse(e);
    try {
      const m = await objectAt(p.x, p.y);
      for (let i = 0; i < keep.length; i += 1) keep[i] = o.tool === 'keep' ? Math.max(keep[i], m[i]) : Math.min(keep[i], 255 - m[i]);
      say(o.tool === 'keep' ? 'Added. Keep tapping, or brush the edges.' : 'Removed. Keep tapping, or brush the edges.', 'ok');
    } catch (err) { say('The AI couldn’t run that tap. Try again, or use the brush.', 'error'); undo.pop(); }
    finally { busy = false; root.classList.remove('is-busy'); render(); }
  });
  view.addEventListener('pointermove', (e) => {
    moveRing(e);
    if (!painting) return;
    const p = toImage(e);
    brushAt(p, painting.prev, painting.value, painting.radius);
    painting.prev = p; render();
  });
  const endPaint = () => { painting = null; };
  view.addEventListener('pointerup', endPaint);
  view.addEventListener('pointercancel', endPaint);
  view.addEventListener('pointerleave', () => { brushRing.hidden = true; });
  function moveRing(e) {
    const o = opt();
    if (!(o.tool === 'erase' || o.tool === 'restore') || e.pointerType === 'touch') { brushRing.hidden = true; return; }
    const r = stage.getBoundingClientRect();
    brushRing.hidden = false;
    brushRing.style.width = brushRing.style.height = `${o.size}px`;
    brushRing.style.left = `${e.clientX - r.left}px`; brushRing.style.top = `${e.clientY - r.top}px`;
  }
  function pulse(e) {
    const r = stage.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = `bgr-pulse${opt().tool === 'remove' ? ' is-remove' : ''}`;
    dot.style.left = `${e.clientX - r.left}px`; dot.style.top = `${e.clientY - r.top}px`;
    stage.appendChild(dot); setTimeout(() => dot.remove(), 900);
  }

  function step(from, to) { if (!from.length) return; to.push(keep); keep = from.pop(); render(); }
  $('#bgr-undo').addEventListener('click', () => step(undo, redo));
  $('#bgr-redo').addEventListener('click', () => step(redo, undo));
  document.addEventListener('keydown', (e) => {
    if (!src || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    const el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|email|number|url|tel)$/.test(el.type)))) return;
    e.preventDefault(); if (e.shiftKey) step(redo, undo); else step(undo, redo);
  });
  $('#bgr-reset').addEventListener('click', () => { plainSeeds = []; plainRef = null; run(); });
  $('#bgr-new').addEventListener('click', () => { root.classList.remove('has-image'); src = null; say(''); });
  const cmp = $('#bgr-compare');
  const setCompare = (on) => { comparing = on; cmp.classList.toggle('is-on', on); render(); };
  cmp.addEventListener('pointerdown', (e) => { e.preventDefault(); setCompare(true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => cmp.addEventListener(t, () => comparing && setCompare(false)));
  cmp.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setCompare(true); } });
  cmp.addEventListener('keyup', () => setCompare(false));

  /* ---------- controls ---------- */
  function syncTools() {
    const o = opt();
    root.dataset.method = o.method; root.dataset.tool = o.tool;
    $('#bgr-size-row').hidden = !(o.tool === 'erase' || o.tool === 'restore');
    $('#bgr-plain-opts').hidden = o.method !== 'plain';
    $('#bgr-color-row').hidden = o.bg !== 'color';
    $('[data-export="jpg"]').textContent = o.bg === 'transparent' ? 'JPG (white)' : 'JPG';
    const hints = {
      keep: o.method === 'plain' ? 'Click to paint back a part that was removed by mistake.' : 'Tap anything you want to keep — the AI selects the whole object.',
      remove: o.method === 'plain' ? 'Click leftover background (like the inside of an “O”) to remove it.' : 'Tap anything that should go — the AI removes the whole object.',
      erase: 'Brush over bits that should be transparent.',
      restore: 'Brush over parts of the subject that got cut off.',
    };
    $('#bgr-hint').textContent = hints[o.tool];
  }
  $$('input[name="bgr-tool"]').forEach((r) => r.addEventListener('change', syncTools));
  $$('input[name="bgr-method"]').forEach((r) => r.addEventListener('change', () => { plainSeeds = []; plainRef = null; syncTools(); run(); }));
  $$('input[name="bgr-edges"]').forEach((r) => r.addEventListener('change', () => { if (opt().method === 'plain' && src) { snapshot(); keep = plainMask(); } render(); }));
  $$('input[name="bgr-bg"]').forEach((r) => r.addEventListener('change', () => { syncTools(); render(); }));
  $('#bgr-color').addEventListener('input', render);
  $('#bgr-size').addEventListener('input', () => { $('#bgr-size-out').textContent = `${$('#bgr-size').value}px`; });
  let tolTimer;
  $('#bgr-tol').addEventListener('input', () => {
    $('#bgr-tol-out').textContent = $('#bgr-tol').value;
    clearTimeout(tolTimer); tolTimer = setTimeout(() => { if (src && opt().method === 'plain') { keep = plainMask(); render(); } }, 120);
  });
  $('#bgr-everywhere').addEventListener('change', () => { if (src && opt().method === 'plain') { snapshot(); keep = plainMask(); render(); } });

  /* ---------- export ---------- */
  function exportCanvas(kind) {
    const o = opt();
    // trim to the subject (plus a little air) when the background is transparent
    let x0 = 0; let y0 = 0; let x1 = W - 1; let y1 = H - 1;
    if ($('#bgr-trim').checked) {
      const t = lut(); x0 = W; y0 = H; x1 = -1; y1 = -1;
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (t[keep[y * W + x]] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return null;
      const pad = Math.round(Math.max(W, H) * 0.02);
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    }
    const w = x1 - x0 + 1; const h = y1 - y0 + 1;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    makeCut();
    const full = document.createElement('canvas'); full.width = W; full.height = H;
    const f = full.getContext('2d');
    if (kind === 'jpg' && o.bg === 'transparent') { f.fillStyle = '#fff'; f.fillRect(0, 0, W, H); } else paintBackground(f, W, H, o);
    f.drawImage(cut, 0, 0);
    x.drawImage(full, x0, y0, w, h, 0, 0, w, h);
    return c;
  }
  function save(blob, file) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  $$('[data-export]').forEach((btn) => btn.addEventListener('click', () => {
    const kind = btn.dataset.export;
    const c = exportCanvas(kind);
    if (!c) { say('Nothing is kept yet — tap “Keep” on your subject first.', 'error'); return; }
    const file = `${name}-${opt().bg === 'transparent' && kind === 'png' ? 'no-bg' : 'edited'}.${kind}`;
    c.toBlob((b) => { if (b) { save(b, file); say(`Saved ${file} · ${c.width} × ${c.height}px`, 'ok'); } }, kind === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
  }));
  $('#bgr-copy').addEventListener('click', () => {
    const c = exportCanvas('png');
    if (!c) return;
    if (!navigator.clipboard || !window.ClipboardItem) { say('Copying isn’t supported in this browser — use Download PNG.', 'error'); return; }
    c.toBlob((b) => navigator.clipboard.write([new window.ClipboardItem({ 'image/png': b })])
      .then(() => say('Copied — paste it into your document or design.', 'ok'))
      .catch(() => say('Couldn’t copy — use Download PNG instead.', 'error')), 'image/png');
  });

  syncTools();
  // warm the AI up in the background once the page is idle, so the first photo is quick
  const warm = () => { if (opt().method === 'ai') loadSegmenter().then(() => { if (!src) say(''); }).catch(() => {}); };
  root.addEventListener('pointerenter', warm, { once: true });
  root.addEventListener('focusin', warm, { once: true });
})();
