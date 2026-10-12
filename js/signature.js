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
  const FONTS = [
    { name: 'Great Vibes', css: '"Great Vibes"', size: 1 },
    { name: 'Dancing Script', css: '"Dancing Script"', size: 0.82, weight: 600 },
    { name: 'Sacramento', css: '"Sacramento"', size: 1.05 },
    { name: 'Allura', css: '"Allura"', size: 1 },
    { name: 'Alex Brush', css: '"Alex Brush"', size: 0.95 },
    { name: 'Mr Dafoe', css: '"Mr Dafoe"', size: 1 },
    { name: 'Homemade Apple', css: '"Homemade Apple"', size: 0.62 },
    { name: 'Caveat', css: '"Caveat"', size: 0.9, weight: 500 },
  ];
  const PENS = { fine: [1.4, 3.4], medium: [2.4, 6.2], bold: [4, 10] };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const canvas = $('#sg-canvas');
  const ctx = canvas.getContext('2d');
  const nameInput = $('#sg-name');
  const inkInput = $('#sg-ink');
  const status = $('#sg-status');

  const state = { mode: 'draw', pen: 'medium', ink: '#111418', bg: 'transparent', font: 0, strokes: [] };
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

  // Typed name: largest size that fits 86% of the width, sitting on the line.
  function typedLayout(c) {
    const text = nameInput.value.trim();
    if (!text) return null;
    const f = FONTS[state.font];
    let px = 170 * f.size;
    c.font = fontString(f, px);
    const maxW = W * 0.86;
    const w = c.measureText(text).width;
    if (w > maxW) { px *= maxW / w; c.font = fontString(f, px); }
    return { text, font: c.font, y: H * 0.7 };
  }
  function drawTyped(c, ink) {
    const l = typedLayout(c);
    if (!l) return;
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = l.font;
    c.fillText(l.text, W / 2, l.y);
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
  document.addEventListener('keydown', (e) => {
    if (state.mode === 'draw' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault(); state.strokes.pop(); render();
    }
  });

  /* ---------- controls ---------- */
  const fontsWrap = $('#sg-fonts');
  fontsWrap.innerHTML = FONTS.map((f, i) => `<label class="sg-font"><input type="radio" name="sg-font" value="${i}"${i === 0 ? ' checked' : ''}><span style="font-family:${f.css.replace(/"/g, '&quot;')};font-weight:${f.weight || 400}" data-scale="${f.size}"></span><small>${f.name}</small></label>`).join('');
  const paintFontSamples = () => {
    const text = nameInput.value.trim() || 'Your Name';
    $$('.sg-font span', fontsWrap).forEach((s) => { s.textContent = text; s.style.fontSize = `${Math.round(27 * Number(s.dataset.scale))}px`; });
  };

  function setMode(mode) {
    state.mode = mode;
    $$('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== mode; });
    pad.classList.toggle('is-typing', mode === 'type');
    canvas.setAttribute('aria-label', mode === 'draw' ? 'Signature pad. Draw your signature here.' : 'Preview of your typed signature.');
    $('#sg-hint').innerHTML = mode === 'draw'
      ? 'Draw with your mouse, finger or stylus. Press <kbd>Ctrl</kbd> + <kbd>Z</kbd> to undo a stroke.'
      : 'Type your name, then pick a handwriting style you like.';
    $('#sg-placeholder').textContent = mode === 'draw' ? 'Sign here' : 'Type your name';
    status.textContent = '';
    render();
    if (mode === 'type' && window.matchMedia('(hover: hover)').matches) nameInput.focus({ preventScroll: true });
  }
  $$('input[name="sg-mode"]').forEach((r) => r.addEventListener('change', () => setMode(r.value)));
  $$('input[name="sg-pen"]').forEach((r) => r.addEventListener('change', () => { state.pen = r.value; }));
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
    FONTS.forEach((f) => document.fonts.load(fontString(f, 40), 'Aa').catch(() => {}));
    document.fonts.ready.then(() => { paintFontSamples(); render(); });
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
