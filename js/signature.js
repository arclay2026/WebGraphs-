/* =====================================================================
   WEB GRAPHS — SIGNATURE MAKER
   Draw mode: pointer strokes on a canvas, with pen width that thins as
   you move faster (like ink). Strokes are kept as points in a fixed
   1000 × 400 space, so the pad can resize and exports stay sharp.
   Type mode: the name is set in a handwriting font from Google Fonts.
   Exports are trimmed to the signature: PNG (transparent or white), JPG,
   SVG (drawn signatures) and copy to clipboard. Nothing leaves the browser.
   ===================================================================== */
(function () {
  'use strict';

  const pad = document.getElementById('sg-pad');
  if (!pad) return;

  const W = 1000; const H = 400;
  // Signature-style handwriting from Google Fonts, named by feel.
  const FONTS = [
    { name: 'Classic', css: '"Mrs Saint Delafield"', size: 1 },
    { name: 'Executive', css: '"Herr Von Muellerhoff"', size: 1 },
    { name: 'Flowing', css: '"Ms Madi"', size: 0.82 },
    { name: 'Quick', css: '"Hurricane"', size: 0.86 },
    { name: 'Elegant', css: '"Allison"', size: 0.95 },
    { name: 'Light', css: '"Whisper"', size: 0.9 },
    { name: 'Formal', css: '"Mr De Haviland"', size: 1 },
    { name: 'Everyday', css: '"Zeyada"', size: 0.8 },
  ];
  const PENS = { fine: [1.4, 3.4], medium: [2.4, 6.2], bold: [4, 10] };
  // Typed signatures: extra ink around each letter and flourish width, as a share of the font size.
  const INK = { fine: 0, medium: 0.014, bold: 0.034 };
  const SWASH = { fine: 0.028, medium: 0.042, bold: 0.066 };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const canvas = $('#sg-canvas');
  const ctx = canvas.getContext('2d');
  const nameInput = $('#sg-name');
  const inkInput = $('#sg-ink');
  const status = $('#sg-status');

  const state = { mode: 'draw', pen: 'medium', ink: '#111418', bg: 'transparent', font: 0, format: 'full', flourish: 'underline', seed: 1, strokes: [] };
  let current = null;

  /* ---------- rendering ---------- */
  function fontString(f, px) { return `${f.weight || 400} ${px}px ${f.css}`; }

  function drawStrokes(c, strokes, ink) {
    c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round'; c.lineJoin = 'round';
    strokes.forEach((pts) => {
      if (pts.length === 1) {
        c.beginPath(); c.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, Math.PI * 2); c.fill();
        return;
      }
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]; const b = pts[i];
        const prevMid = i === 1 ? a : { x: (pts[i - 2].x + a.x) / 2, y: (pts[i - 2].y + a.y) / 2 };
        const mid = i === pts.length - 1 ? b : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        c.beginPath();
        c.lineWidth = (a.w + b.w) / 2;
        c.moveTo(prevMid.x, prevMid.y);
        c.quadraticCurveTo(a.x, a.y, mid.x, mid.y);
        c.stroke();
      }
    });
  }

  /* ---------- typed signatures ----------
     A real signature isn't neat type: it leans, drifts uphill, starts with
     an oversized capital, letters wobble a little, and it often ends in an
     underline or swoosh. Each letter is placed with small seeded random
     changes, so the same name, style and seed always draw the same way;
     "Try another" changes the seed. */
  const BASE = 100;
  let fontsVersion = 0;
  let sceneCache = { key: '', scene: null };

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (str) => { let h = 2166136261; for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  function signedText() {
    const parts = nameInput.value.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    if (state.format === 'initial' && parts.length > 1) return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).map(cap).join(' ')}`;
    if (state.format === 'initials') return parts.map((w) => w.charAt(0).toUpperCase()).join('');
    return parts.map(cap).join(' ');
  }

  function cubic(p0, p1, p2, p3, n, width, rand) {
    const pts = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n; const u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      // thin where the pen lands, fuller through the stroke, flicking off thin
      const w = width * Math.max(0.18, Math.sin(Math.PI * (0.06 + 0.88 * t)) ** 0.7) * (1.05 - 0.35 * t) * (0.96 + rand() * 0.08);
      pts.push({ x, y, w });
    }
    return pts;
  }

  function buildScene() {
    const text = signedText();
    if (!text) return null;
    const f = FONTS[state.font];
    const rand = rng(hash(text) ^ Math.imul(state.seed, 2654435761) ^ (state.font * 7919));
    const font = fontString(f, BASE);
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font;
    const chars = Array.from(text);
    const glyphs = [];
    const phase = rand() * Math.PI * 2;
    const wobble = 0.018 + rand() * 0.022;
    let x = 0; let prev = 0;
    chars.forEach((ch, i) => {
      const upto = probe.measureText(chars.slice(0, i + 1).join('')).width;
      const adv = upto - prev; prev = upto;
      if (ch === ' ') { x += adv * (0.85 + rand() * 0.35) + 0.04 * BASE; return; }
      const s = i === 0 ? 1.18 + rand() * 0.12 : 1 + (rand() - 0.5) * 0.07;
      glyphs.push({
        ch, s,
        x: x + (rand() - 0.5) * 0.02 * BASE,
        y: (Math.sin(i * 0.75 + phase) * wobble + (rand() - 0.5) * 0.014) * BASE,
        r: (rand() - 0.5) * 0.05,
      });
      x += adv * s * (0.96 + rand() * 0.04);
    });
    const X = x;
    const sw = SWASH[state.pen] * BASE;
    let flourish = null;
    const j = () => (rand() - 0.5) * 0.08;
    if (state.flourish === 'underline') {
      flourish = cubic([-0.04 * X, (0.24 + j()) * BASE], [0.3 * X, (0.4 + j()) * BASE], [0.72 * X, (0.28 + j()) * BASE], [(1.05 + j() / 2) * X, (0.06 + j()) * BASE], 90, sw, rand);
    } else if (state.flourish === 'swoosh') {
      flourish = cubic([0.98 * X, -0.08 * BASE], [(1.12 + j()) * X, (0.62 + j()) * BASE], [(0.5 + j()) * X, (0.6 + j()) * BASE], [-0.06 * X, (0.2 + j()) * BASE], 110, sw, rand);
    }
    const scene = {
      font, glyphs, flourish, weight: INK[state.pen] * BASE,
      slant: 0.04 + rand() * 0.08,
      rise: -(0.015 + rand() * 0.035),
    };
    scene.bounds = measureScene(scene, X);
    return scene;
  }

  function paintScene(c, sc, ink) {
    c.save();
    c.rotate(sc.rise);
    c.transform(1, 0, -sc.slant, 1, 0, 0);
    c.fillStyle = ink; c.strokeStyle = ink; c.lineJoin = 'round'; c.lineCap = 'round';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.font = sc.font;
    sc.glyphs.forEach((g) => {
      c.save();
      c.translate(g.x, g.y); c.rotate(g.r); c.scale(g.s, g.s);
      c.fillText(g.ch, 0, 0);
      if (sc.weight) { c.lineWidth = sc.weight / g.s; c.strokeText(g.ch, 0, 0); }
      c.restore();
    });
    if (sc.flourish) drawStrokes(c, [sc.flourish], ink);
    c.restore();
  }

  // Draw the scene small, off screen, and read back where the ink landed.
  function measureScene(sc, X) {
    const pw = 900; const ph = 500;
    const k = Math.min(600 / Math.max(X, 1), 140 / BASE);
    const tx = (pw - X * k) / 2; const ty = ph * 0.55;
    const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
    const c = pc.getContext('2d');
    c.translate(tx, ty); c.scale(k, k);
    paintScene(c, sc, '#000');
    const d = c.getImageData(0, 0, pw, ph).data;
    let x0 = pw; let y0 = ph; let x1 = -1; let y1 = -1;
    for (let y = 0; y < ph; y += 1) {
      for (let x = 0; x < pw; x += 1) {
        if (d[(y * pw + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    if (x1 < 0) return { x: 0, y: -BASE, w: Math.max(X, 1), h: BASE };
    return { x: (x0 - 1 - tx) / k, y: (y0 - 1 - ty) / k, w: (x1 - x0 + 3) / k, h: (y1 - y0 + 3) / k };
  }

  function typedScene() {
    const key = [signedText(), state.font, state.seed, state.pen, state.flourish, fontsVersion].join('|');
    if (sceneCache.key !== key) sceneCache = { key, scene: buildScene() };
    return sceneCache.scene;
  }

  // Fit the signature inside the pad, resting on the signature line when it can.
  function drawTyped(c, ink) {
    const sc = typedScene();
    if (!sc) return;
    const b = sc.bounds;
    const s = Math.min((W * 0.86) / b.w, (H * 0.82) / b.h, 2.1);
    const tx = W / 2 - (b.x + b.w / 2) * s;
    let ty = H * 0.68;
    const minTy = H * 0.06 - b.y * s; const maxTy = H * 0.95 - (b.y + b.h) * s;
    ty = minTy > maxTy ? H / 2 - (b.y + b.h / 2) * s : Math.min(Math.max(ty, minTy), maxTy);
    c.save();
    c.translate(tx, ty); c.scale(s, s);
    paintScene(c, sc, ink);
    c.restore();
  }

  function hasSignature() {
    return state.mode === 'draw' ? state.strokes.length > 0 : nameInput.value.trim().length > 0;
  }

  function render() {
    const scale = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.mode === 'draw') {
      drawStrokes(ctx, state.strokes, state.ink);
      if (current) drawStrokes(ctx, [current], state.ink);
    } else {
      drawTyped(ctx, state.ink);
    }
    const has = hasSignature() || !!current;
    $('#sg-placeholder').hidden = has;
    $$('[data-export], #sg-copy').forEach((b) => { b.disabled = !hasSignature(); });
    $('[data-export="svg"]').hidden = state.mode !== 'draw';
    $('#sg-undo').disabled = !state.strokes.length;
    $('#sg-clear').disabled = !state.strokes.length;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const r = pad.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * dpr * (H / W));
    render();
  }
  new ResizeObserver(resize).observe(pad);

  /* ---------- drawing ---------- */
  let last = null; let velocity = 0;
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, t: e.timeStamp };
  };
  function addPoint(p) {
    const [minW, maxW] = PENS[state.pen];
    if (!last) {
      velocity = 0;
      p.w = (minW + maxW) / 2;
    } else {
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < 1.2) return;
      const dt = Math.max(1, p.t - last.t);
      velocity = 0.7 * (d / dt) + 0.3 * velocity;
      const target = Math.max(minW, maxW / (velocity * 0.9 + 1));
      p.w = last.w + (target - last.w) * 0.35;
    }
    current.push(p); last = p;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'draw' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true }); // so keyboard shortcuts reach the pad
    canvas.setPointerCapture(e.pointerId);
    current = []; last = null;
    addPoint(toLocal(e));
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (events.length ? events : [e]).forEach((ev) => addPoint(toLocal(ev)));
    render();
  });
  const finish = () => {
    if (!current) return;
    if (current.length) state.strokes.push(current);
    current = null; last = null;
    render();
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('lostpointercapture', finish);

  $('#sg-undo').addEventListener('click', () => { state.strokes.pop(); render(); });
  $('#sg-clear').addEventListener('click', () => { state.strokes = []; render(); });
  // Ctrl/Cmd + Z undoes a stroke, except while typing in a text box
  // (radio buttons and switches keep focus after a click, so they mustn't block it).
  const isTyping = (el) => el && (el.isContentEditable || el.tagName === 'TEXTAREA'
    || (el.tagName === 'INPUT' && !['radio', 'checkbox', 'button', 'range', 'color', 'submit', 'reset'].includes(el.type)));
  document.addEventListener('keydown', (e) => {
    if (state.mode === 'draw' && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isTyping(document.activeElement)) {
      e.preventDefault(); state.strokes.pop(); render();
    }
  });

  /* ---------- controls ---------- */
  const fontsWrap = $('#sg-fonts');
  fontsWrap.innerHTML = FONTS.map((f, i) => `<label class="sg-font"><input type="radio" name="sg-font" value="${i}"${i === 0 ? ' checked' : ''}><span style="font-family:${f.css.replace(/"/g, '&quot;')}" data-scale="${f.size}"></span><small>${f.name}</small></label>`).join('');
  const paintFontSamples = () => {
    const text = signedText() || 'Your Name';
    $$('.sg-font span', fontsWrap).forEach((s) => { s.textContent = text; s.style.fontSize = `${Math.round(36 * Number(s.dataset.scale))}px`; });
  };

  function setMode(mode) {
    state.mode = mode;
    $$('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== mode; });
    pad.classList.toggle('is-typing', mode === 'type');
    canvas.setAttribute('aria-label', mode === 'draw' ? 'Signature pad. Draw your signature here.' : 'Preview of your typed signature.');
    $('#sg-hint').innerHTML = mode === 'draw'
      ? 'Draw with your mouse, finger or stylus. Press <kbd>Ctrl</kbd> + <kbd>Z</kbd> to undo a stroke.'
      : 'Pick a style you like, then press “Try another” until it looks like you.';
    $('#sg-placeholder').textContent = mode === 'draw' ? 'Sign here' : 'Type your name';
    status.textContent = '';
    render();
    if (mode === 'type' && window.matchMedia('(hover: hover)').matches) nameInput.focus({ preventScroll: true });
  }
  $$('input[name="sg-mode"]').forEach((r) => r.addEventListener('change', () => setMode(r.value)));
  $$('input[name="sg-pen"]').forEach((r) => r.addEventListener('change', () => { state.pen = r.value; render(); }));
  $$('input[name="sg-format"]').forEach((r) => r.addEventListener('change', () => { state.format = r.value; paintFontSamples(); render(); }));
  $$('input[name="sg-flourish"]').forEach((r) => r.addEventListener('change', () => { state.flourish = r.value; render(); }));
  $('#sg-shuffle').addEventListener('click', () => { state.seed += 1; render(); });
  $$('input[name="sg-bg"]').forEach((r) => r.addEventListener('change', () => { state.bg = r.value; pad.classList.toggle('is-white', r.value === 'white'); }));
  fontsWrap.addEventListener('change', (e) => { state.font = Number(e.target.value); render(); });
  nameInput.addEventListener('input', () => { paintFontSamples(); render(); });

  function setInk(c) {
    state.ink = c;
    inkInput.value = c;
    $$('#sg-swatches .swatch').forEach((s) => s.classList.toggle('is-on', s.dataset.ink.toLowerCase() === c.toLowerCase()));
    if (window.wgColorPickerRefresh) window.wgColorPickerRefresh();
    render();
  }
  $('#sg-swatches').addEventListener('click', (e) => { const s = e.target.closest('[data-ink]'); if (s) setInk(s.dataset.ink); });
  inkInput.addEventListener('input', () => setInk(inkInput.value));

  // Re-render once the handwriting fonts have loaded.
  if (document.fonts) {
    // the handwriting stylesheet loads without blocking the page; load (again) once it arrives
    const loadFonts = () => {
      FONTS.forEach((f) => document.fonts.load(fontString(f, 40), 'Aa').then(() => { fontsVersion += 1; render(); }).catch(() => {}));
      document.fonts.ready.then(() => { fontsVersion += 1; paintFontSamples(); render(); });
    };
    // fetched after the page has loaded, so they don't compete with it (they're only needed for typing)
    if (document.readyState === 'complete') loadFonts(); else window.addEventListener('load', loadFonts, { once: true });
    window.addEventListener('wg-sigfonts', () => { if (document.readyState === 'complete') loadFonts(); });
  }

  /* ---------- export ---------- */
  const SCALE = 3;
  function trimmedCanvas(whiteBg) {
    const full = document.createElement('canvas');
    full.width = W * SCALE; full.height = H * SCALE;
    const c = full.getContext('2d');
    c.scale(SCALE, SCALE);
    if (state.mode === 'draw') drawStrokes(c, state.strokes, state.ink); else drawTyped(c, state.ink);
    const data = c.getImageData(0, 0, full.width, full.height).data;
    let x0 = full.width; let y0 = full.height; let x1 = -1; let y1 = -1;
    for (let y = 0; y < full.height; y += 1) {
      for (let x = 0; x < full.width; x += 1) {
        if (data[(y * full.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const m = 12 * SCALE;
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1 + m * 2; out.height = y1 - y0 + 1 + m * 2;
    const o = out.getContext('2d');
    if (whiteBg) { o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height); }
    o.drawImage(full, x0 - m, y0 - m, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function svgMarkup() {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    state.strokes.flat().forEach((p) => {
      x0 = Math.min(x0, p.x - p.w); y0 = Math.min(y0, p.y - p.w); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.w);
    });
    const m = 12; const r = (n) => Math.round(n * 10) / 10;
    let body = '';
    state.strokes.forEach((pts) => {
      if (pts.length === 1) { body += `<circle cx="${r(pts[0].x)}" cy="${r(pts[0].y)}" r="${r(pts[0].w / 2)}" fill="${state.ink}"/>`; return; }
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]; const b = pts[i];
        const pm = i === 1 ? a : { x: (pts[i - 2].x + a.x) / 2, y: (pts[i - 2].y + a.y) / 2 };
        const mid = i === pts.length - 1 ? b : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        body += `<path d="M${r(pm.x)} ${r(pm.y)}Q${r(a.x)} ${r(a.y)} ${r(mid.x)} ${r(mid.y)}" stroke-width="${r((a.w + b.w) / 2)}"/>`;
      }
    });
    const vb = [x0 - m, y0 - m, x1 - x0 + m * 2, y1 - y0 + m * 2].map(r);
    const bg = state.bg === 'white' ? `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#fff"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}">${bg}<g fill="none" stroke="${state.ink}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  }

  function fileName(ext) {
    const n = state.mode === 'type' ? nameInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
    return `signature${n ? `-${n}` : ''}.${ext}`;
  }
  function save(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    status.textContent = `Saved ${name}`;
  }

  $$('[data-export]').forEach((btn) => btn.addEventListener('click', () => {
    const kind = btn.dataset.export;
    if (!hasSignature()) return;
    if (kind === 'svg') { save(new Blob([svgMarkup()], { type: 'image/svg+xml' }), fileName('svg')); return; }
    const c = trimmedCanvas(kind === 'jpg' || state.bg === 'white');
    if (!c) return;
    c.toBlob((b) => b && save(b, fileName(kind)), kind === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
  }));

  $('#sg-copy').addEventListener('click', () => {
    const c = trimmedCanvas(state.bg === 'white');
    if (!c) return;
    if (!navigator.clipboard || !window.ClipboardItem) { status.textContent = 'Copying isn’t supported in this browser — use Download PNG.'; return; }
    c.toBlob((b) => {
      navigator.clipboard.write([new window.ClipboardItem({ 'image/png': b })])
        .then(() => { status.textContent = 'Copied — paste it into your document.'; })
        .catch(() => { status.textContent = 'Couldn’t copy — use Download PNG instead.'; });
    }, 'image/png');
  });

  /* ---------- start ---------- */
  setInk(state.ink);
  paintFontSamples();
  setMode('draw');
})();
