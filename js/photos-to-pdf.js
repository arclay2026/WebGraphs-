/* =====================================================================
   WEB GRAPHS — PHOTOS TO PDF
   Turns photos (e.g. of an ID, proof of residence or payslips) into one
   PDF. Pages can be reordered (drag, or the arrow buttons), rotated and
   removed, and given a black-and-white "scanned" look. Each photo is
   redrawn on a canvas, saved as JPEG and placed on a page by the small
   PDF writer at the bottom, so no library is needed and nothing is
   uploaded anywhere.
   ===================================================================== */
(function () {
  'use strict';

  const root = document.getElementById('p2p');
  if (!root) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const grid = $('#p2p-grid');
  const drop = $('#p2p-drop');
  const status = $('#p2p-status');
  const nameInput = $('#p2p-name');
  const MAX_PAGES = 40;

  const PAGE = { a4: [595.28, 841.89], letter: [612, 792] };
  const MARGIN = { none: 0, small: 20, large: 42 };
  const QUALITY = { standard: [1700, 0.8], high: [2500, 0.9] };

  let pages = []; // { id, file, url, rot }
  let nextId = 1;
  const opt = () => ({
    size: $('input[name="p2p-size"]:checked').value,
    margin: $('input[name="p2p-margin"]:checked').value,
    look: $('input[name="p2p-look"]:checked').value,
    quality: $('input[name="p2p-quality"]:checked').value,
  });

  /* ---------- adding photos ---------- */
  function addFiles(list) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name));
    const room = MAX_PAGES - pages.length;
    if (!files.length) { say('Those files aren’t photos — choose JPG, PNG or WebP images.', 'error'); return; }
    files.slice(0, room).forEach((file) => pages.push({ id: nextId++, file, url: URL.createObjectURL(file), rot: 0 }));
    if (files.length > room) say(`Only the first ${MAX_PAGES} photos fit in one PDF.`, 'error'); else say('');
    paint();
  }
  $('#p2p-files').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  $('#p2p-camera').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault(); drop.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault(); addFiles(e.dataTransfer.files);
  });
  document.addEventListener('paste', (e) => {
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []);
    if (files.length) addFiles(files);
  });

  /* ---------- page grid ----------
     Cards are kept (keyed by page id) rather than redrawn, so they move
     with real physics. Each card hangs on a damped spring tied to its slot
     in the grid: when the order changes it is pushed back to where it was
     and the spring pulls it home, overshooting a little and leaning with
     its sideways speed. Dragging (mouse, or press and hold on a phone)
     lifts the card; let go and it is thrown back into its slot with the
     speed it had. Removed pages hop and fall under gravity, new ones drop
     in and settle, and rotating swings the photo round on a spring. */
  const ICON = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const MOVE = { k: 230, c: 21 };   // position spring: stiffness, damping (mass 1)
  const TILT = { k: 320, c: 20 };   // lean that follows sideways speed
  const SCALE = { k: 380, c: 22 };
  const SPIN = { k: 170, c: 15 };   // photo rotation: a looser, wobblier spring
  const GRAVITY = 2600;             // px/s² for pages that are removed
  const bodies = new Map();         // page id -> spring state of its card
  const falling = new Set();
  let raf = 0; let last = 0;

  const cards = () => $$('.p2p-page:not(.is-falling)', grid);
  const bodyOf = (li) => bodies.get(li.dataset.id);
  function wake() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
  const spring = (pos, vel, target, sp, dt) => vel + (-sp.k * (pos - target) - sp.c * vel) * dt;

  function step(b, dt) {
    if (b.delay > 0) { b.delay -= dt; return; }
    if (!b.held) {
      b.vx = spring(b.x, b.vx, 0, MOVE, dt); b.vy = spring(b.y, b.vy, 0, MOVE, dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
    const lean = Math.max(-9, Math.min(9, b.vx * (b.held ? 0.018 : 0.012)));
    b.vr = spring(b.r, b.vr, lean, TILT, dt); b.r += b.vr * dt;
    b.vs = spring(b.s, b.vs, b.held ? 1.06 : 1, SCALE, dt); b.s += b.vs * dt;
    b.va = spring(b.a, b.va, b.aT, SPIN, dt); b.a += b.va * dt;
  }
  const still = (b) => !b.held && b.delay <= 0 && Math.abs(b.x) + Math.abs(b.y) + Math.abs(b.r) + Math.abs(b.s - 1) + Math.abs(b.a - b.aT) < 0.08
    && Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr) + Math.abs(b.vs) + Math.abs(b.va) < 0.5;
  function draw(b) {
    b.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${b.r.toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
    b.el.style.zIndex = b.held ? 5 : (Math.abs(b.vx) + Math.abs(b.vy) > 40 ? 2 : '');
    b.img.style.rotate = `${b.a.toFixed(2)}deg`;
  }
  function rest(b) {
    b.x = b.y = b.r = b.vx = b.vy = b.vr = b.vs = b.va = 0; b.s = 1; b.a = b.aT; b.delay = 0;
    b.el.style.transform = ''; b.el.style.zIndex = ''; b.img.style.rotate = `${b.aT}deg`;
    b.awake = false;
  }
  function tick(t) {
    const dt = last ? Math.min(0.034, (t - last) / 1000) : 1 / 60; last = t;
    let busy = false;
    bodies.forEach((b) => {
      if (!b.awake) return;
      if (calm.matches && !b.held) { rest(b); return; }
      for (let n = 0, sub = Math.ceil(dt / 0.008); n < sub; n += 1) step(b, dt / sub);
      if (still(b)) rest(b); else { draw(b); busy = true; }
    });
    falling.forEach((f) => {
      f.vy += GRAVITY * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; f.t += dt;
      f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0) rotate(${f.r}deg) scale(${Math.max(0.7, 1 - f.t * 0.25)})`;
      f.el.style.opacity = Math.max(0, 1 - Math.max(0, f.y) / 320);
      if (calm.matches || f.t > 1.4 || f.y > 360) { f.el.remove(); falling.delete(f); } else busy = true;
    });
    raf = busy ? requestAnimationFrame(tick) : 0;
  }
  function nudge(b) { b.awake = true; wake(); }

  function make(p) {
    const li = document.createElement('li');
    li.className = 'p2p-page'; li.dataset.id = p.id;
    li.innerHTML = `
        <div class="p2p-thumb"><img src="${p.url}" alt="" draggable="false"></div>
        <span class="p2p-num"></span>
        <div class="p2p-actions">
          <button type="button" data-act="left">${ICON.left}</button>
          <button type="button" data-act="rotate">${ICON.rotate}</button>
          <button type="button" data-act="right">${ICON.right}</button>
          <button type="button" data-act="remove" class="p2p-del">${ICON.remove}</button>
        </div>`;
    const b = { el: li, img: li.querySelector('img'), x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, s: 1, vs: 0, a: p.rot, va: 0, aT: p.rot, delay: 0, held: false, awake: false };
    bodies.set(String(p.id), b);
    b.img.style.rotate = `${p.rot}deg`;
    return li;
  }
  function fall(li) {
    const b = bodyOf(li); bodies.delete(li.dataset.id);
    const box = [li.offsetLeft, li.offsetTop, li.offsetWidth];   // measure before it leaves the flow
    li.classList.add('is-falling'); li.inert = true;
    li.style.left = `${box[0]}px`; li.style.top = `${box[1]}px`; li.style.width = `${box[2]}px`;
    // a small hop, a sideways drift and a spin, then gravity takes it
    falling.add({ el: li, x: b ? b.x : 0, y: b ? b.y : 0, r: b ? b.r : 0, t: 0,
      vx: (Math.random() - 0.5) * 220, vy: -420 - Math.random() * 120, vr: (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 160) });
    wake();
  }

  function paint() {
    const scan = opt().look === 'scan';
    const before = new Map(cards().map((li) => [li.dataset.id, [li.offsetLeft, li.offsetTop]]));
    const keep = new Set(pages.map((p) => String(p.id)));
    cards().forEach((li) => { if (!keep.has(li.dataset.id)) fall(li); });
    let fresh = 0;
    pages.forEach((p, i) => {
      let li = grid.querySelector(`.p2p-page[data-id="${p.id}"]:not(.is-falling)`);
      if (!li) {
        li = make(p);
        const b = bodyOf(li);
        if (!calm.matches) { b.y = -70; b.s = 0.82; b.vr = (Math.random() - 0.5) * 120; b.delay = fresh * 0.07; li.style.animationDelay = `${fresh * 70}ms`; li.classList.add('is-new'); li.addEventListener('animationend', () => li.classList.remove('is-new'), { once: true }); nudge(b); draw(b); }
        fresh += 1;
      }
      const at = cards()[i];
      if (at !== li) grid.insertBefore(li, at || null);
      li.querySelector('.p2p-thumb').classList.toggle('is-scan', scan);
      li.querySelector('.p2p-num').textContent = i + 1;
      const n = i + 1;
      li.querySelector('[data-act="left"]').setAttribute('aria-label', `Move page ${n} earlier`);
      li.querySelector('[data-act="right"]').setAttribute('aria-label', `Move page ${n} later`);
      li.querySelector('[data-act="rotate"]').setAttribute('aria-label', `Rotate page ${n}`);
      li.querySelector('[data-act="remove"]').setAttribute('aria-label', `Remove page ${n}`);
      li.querySelector('[data-act="left"]').disabled = i === 0;
      li.querySelector('[data-act="right"]').disabled = i === pages.length - 1;
    });
    // FLIP: every card that changed slot starts where it was and springs home
    cards().forEach((li) => {
      const was = before.get(li.dataset.id);
      if (!was) return;
      const dx = was[0] - li.offsetLeft; const dy = was[1] - li.offsetTop;
      if (dx || dy) { const b = bodyOf(li); b.x += dx; b.y += dy; nudge(b); }
    });
    const has = pages.length > 0;
    root.classList.toggle('has-pages', has);
    $('#p2p-count').textContent = has ? `${pages.length} page${pages.length === 1 ? '' : 's'}` : 'No pages yet';
    $$('[data-p2p-need]').forEach((b) => { b.disabled = !has; });
    $('#p2p-clear').hidden = !has;
  }
  const indexOf = (id) => pages.findIndex((p) => p.id === Number(id));
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.p2p-page').dataset.id;
    const i = indexOf(id);
    const act = btn.dataset.act;
    if (act === 'rotate') {
      pages[i].rot = (pages[i].rot + 90) % 360;
      const b = bodies.get(id); b.aT += 90; nudge(b);
      return;
    }
    let focusId = id; let focusAct = act;
    if (act === 'remove') {
      URL.revokeObjectURL(pages[i].url); pages.splice(i, 1);
      const next = pages[Math.min(i, pages.length - 1)];
      focusId = next ? String(next.id) : null; focusAct = 'rotate';
    } else {
      const j = act === 'left' ? i - 1 : i + 1;
      if (j < 0 || j >= pages.length) return;
      [pages[i], pages[j]] = [pages[j], pages[i]];
      const b = bodies.get(id); b.vs += 2.4; b.vy -= 160;   // the moved page hops over its neighbour
    }
    paint();
    if (!focusId) return;
    const card = grid.querySelector(`.p2p-page[data-id="${focusId}"]:not(.is-falling)`);
    if (!card) return;
    let again = card.querySelector(`[data-act="${focusAct}"]`);
    if (again.disabled) again = card.querySelector('[data-act="rotate"]');
    if (document.activeElement !== again) again.focus({ preventScroll: true });
  });

  // Drag to reorder with pointer events: a mouse starts dragging after a few
  // pixels, a finger after a short press and hold (so swiping still scrolls).
  let drag = null;
  const slotXY = (li) => { const r = grid.getBoundingClientRect(); return { x: r.left + li.offsetLeft, y: r.top + li.offsetTop }; };
  function begin() {
    if (!drag) return;
    drag.started = true;
    const b = bodyOf(drag.li); b.held = true; b.vx = 0; b.vy = 0; nudge(b);
    drag.li.classList.add('is-held'); root.classList.add('is-sorting');
  }
  function end() {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.started) {
      const b = bodyOf(drag.li);
      if (b) { b.held = false; nudge(b); }        // thrown home with the speed it had
      drag.li.classList.remove('is-held'); root.classList.remove('is-sorting');
    }
    drag = null;
  }
  grid.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const li = e.target.closest('.p2p-page:not(.is-falling)');
    if (!li) return;
    const b = bodyOf(li); const slot = slotXY(li);
    drag = { li, pid: e.pointerId, touch: e.pointerType !== 'mouse', started: false, timer: 0,
      sx: e.clientX, sy: e.clientY, gx: e.clientX - slot.x - b.x, gy: e.clientY - slot.y - b.y, lx: e.clientX, lt: e.timeStamp };
    if (drag.touch) drag.timer = setTimeout(begin, 260);
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.started) {
      const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
      if (drag.touch) { if (moved > 10) end(); return; }
      if (moved < 5) return;
      begin();
    }
    e.preventDefault();
    const li = drag.li; const b = bodyOf(li);
    const dt = Math.max(0.004, (e.timeStamp - drag.lt) / 1000);
    b.vx = b.vx * 0.5 + ((e.clientX - drag.lx) / dt) * 0.5;   // smoothed pointer speed
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    const slot = slotXY(li);
    b.x = e.clientX - drag.gx - slot.x; b.y = e.clientY - drag.gy - slot.y;
    // swap into whichever slot the card's centre is now over
    const cx = li.offsetLeft + b.x + li.offsetWidth / 2; const cy = li.offsetTop + b.y + li.offsetHeight / 2;
    const over = cards().find((o) => o !== li && cx > o.offsetLeft && cx < o.offsetLeft + o.offsetWidth && cy > o.offsetTop && cy < o.offsetTop + o.offsetHeight);
    if (over) {
      const from = indexOf(li.dataset.id); const to = indexOf(over.dataset.id);
      const [moved] = pages.splice(from, 1); pages.splice(to, 0, moved);
      paint();
    }
  }, { passive: false });
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  // while a finger is dragging a page, stop the page from scrolling instead
  grid.addEventListener('touchmove', (e) => { if (drag && drag.started) e.preventDefault(); }, { passive: false });
  grid.addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); });
  grid.addEventListener('dragstart', (e) => e.preventDefault());

  $('#p2p-clear').addEventListener('click', () => { pages.forEach((p) => URL.revokeObjectURL(p.url)); pages = []; say(''); paint(); });
  $$('input[name="p2p-look"]').forEach((r) => r.addEventListener('change', paint));

  /* ---------- making the PDF ---------- */
  function say(text, kind) { status.textContent = text; status.className = `p2p-status${kind ? ` is-${kind}` : ''}`; }
  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  const toBytes = (canvas, q) => new Promise((resolve) => canvas.toBlob((b) => b.arrayBuffer().then((a) => resolve(new Uint8Array(a))), 'image/jpeg', q));

  // Black and white with the paper pushed to white: grey, then stretch the
  // levels between the dark ink and the bright paper.
  function scanLook(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      d[i] = g; hist[g | 0] += 1;
    }
    const total = w * h; let acc = 0; let white = 255; let black = 0;
    for (let v = 0; v < 256; v += 1) { acc += hist[v]; if (acc > total * 0.02 && !black) black = v; if (acc > total * 0.6) { white = v; break; } }
    const lo = Math.min(black + 10, white - 40); const span = Math.max(30, white - lo);
    for (let i = 0; i < d.length; i += 4) {
      let v = ((d[i] - lo) / span) * 255;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      v = 255 * Math.pow(v / 255, 1.35);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
  }

  async function renderPage(p, o) {
    const img = await loadImage(p.url);
    const [maxSide, q] = QUALITY[o.quality];
    const turned = p.rot % 180 !== 0;
    const sw = img.naturalWidth; const sh = img.naturalHeight;
    const k = Math.min(1, maxSide / Math.max(sw, sh));
    const w = Math.round((turned ? sh : sw) * k); const h = Math.round((turned ? sw : sh) * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: o.look === 'scan' });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2); ctx.rotate((p.rot * Math.PI) / 180);
    ctx.drawImage(img, (-sw * k) / 2, (-sh * k) / 2, sw * k, sh * k);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (o.look === 'scan') scanLook(ctx, w, h);
    return { jpg: await toBytes(c, q), w, h };
  }

  function layout(w, h, o) {
    const m = MARGIN[o.margin];
    let pw; let ph;
    if (o.size === 'photo') { pw = 595.28; ph = (pw - 2 * m) * (h / w) + 2 * m; }
    else {
      [pw, ph] = PAGE[o.size];
      if (w > h) [pw, ph] = [ph, pw]; // landscape photos get a landscape page
    }
    const s = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
    const dw = w * s; const dh = h * s;
    return { pw, ph, x: (pw - dw) / 2, y: (ph - dh) / 2, dw, dh };
  }

  // A minimal PDF 1.4 writer: one JPEG image per page.
  function writePdf(list, title) {
    const enc = new TextEncoder();
    const parts = []; let len = 0; const offsets = [];
    const put = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const n = (v) => (Math.round(v * 100) / 100).toString();
    const esc = (t) => t.replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '');
    const count = 3 + list.length * 3;
    put('%PDF-1.4\n%\xff\xff\xff\xff\n');
    const obj = (id, body, stream) => {
      offsets[id] = len;
      put(`${id} 0 obj\n${body}`);
      if (stream) { put('\nstream\n'); put(stream); put('\nendstream'); }
      put('\nendobj\n');
    };
    const kids = list.map((_, i) => `${4 + i * 3} 0 R`).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${list.length} >>`);
    obj(3, `<< /Title (${esc(title)}) /Producer (Web Graphs Technologies) /Creator (webgraphs photos to pdf) >>`);
    list.forEach((pg, i) => {
      const id = 4 + i * 3;
      const content = enc.encode(`q ${n(pg.dw)} 0 0 ${n(pg.dh)} ${n(pg.x)} ${n(pg.y)} cm /Im0 Do Q`);
      obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pg.pw)} ${n(pg.ph)}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
      obj(id + 1, `<< /Length ${content.length} >>`, content);
      obj(id + 2, `<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpg.length} >>`, pg.jpg);
    });
    const xref = len;
    let table = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= count; id += 1) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    put(table);
    put(`trailer\n<< /Size ${count + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  function fileName() {
    const base = (nameInput.value.trim() || 'documents').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
    return `${base || 'documents'}.pdf`;
  }
  const size = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

  let busy = false;
  async function makePdf() {
    if (busy || !pages.length) return null;
    busy = true; root.classList.add('is-busy');
    const o = opt();
    try {
      const out = [];
      for (let i = 0; i < pages.length; i += 1) {
        say(`Preparing page ${i + 1} of ${pages.length}…`);
        try {
          const r = await renderPage(pages[i], o);
          out.push({ ...r, ...layout(r.w, r.h, o) });
        } catch (err) {
          say(`Page ${i + 1} (${pages[i].file.name}) couldn’t be opened. If it’s an iPhone HEIC photo, choose it again as a JPG.`, 'error');
          return null;
        }
      }
      const blob = writePdf(out, fileName().replace(/\.pdf$/, ''));
      return new File([blob], fileName(), { type: 'application/pdf' });
    } finally {
      busy = false; root.classList.remove('is-busy');
    }
  }

  $('#p2p-download').addEventListener('click', async () => {
    const file = await makePdf();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    say(`Saved ${file.name} · ${pages.length} page${pages.length === 1 ? '' : 's'} · ${size(file.size)}`, 'ok');
  });

  const shareBtn = $('#p2p-share');
  const canShare = (() => {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] })); } catch (err) { return false; }
  })();
  shareBtn.hidden = !canShare;
  shareBtn.addEventListener('click', async () => {
    const file = await makePdf();
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: file.name });
      say(`Shared ${file.name} · ${size(file.size)}`, 'ok');
    } catch (err) {
      if (err && err.name !== 'AbortError') say('Sharing didn’t work here — use Download PDF instead.', 'error');
      else say('');
    }
  });

  paint();
})();
