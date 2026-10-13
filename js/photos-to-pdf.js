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

  /* ---------- page grid ---------- */
  const ICON = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };
  function paint() {
    const scan = opt().look === 'scan';
    grid.innerHTML = pages.map((p, i) => `
      <li class="p2p-page" draggable="true" data-id="${p.id}">
        <div class="p2p-thumb${scan ? ' is-scan' : ''}"><img src="${p.url}" alt="" style="rotate:${p.rot}deg" draggable="false"></div>
        <span class="p2p-num">${i + 1}</span>
        <div class="p2p-actions">
          <button type="button" data-act="left" aria-label="Move page ${i + 1} earlier"${i === 0 ? ' disabled' : ''}>${ICON.left}</button>
          <button type="button" data-act="rotate" aria-label="Rotate page ${i + 1}">${ICON.rotate}</button>
          <button type="button" data-act="right" aria-label="Move page ${i + 1} later"${i === pages.length - 1 ? ' disabled' : ''}>${ICON.right}</button>
          <button type="button" data-act="remove" class="p2p-del" aria-label="Remove page ${i + 1}">${ICON.remove}</button>
        </div>
      </li>`).join('');
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
    const i = indexOf(btn.closest('.p2p-page').dataset.id);
    const act = btn.dataset.act;
    if (act === 'rotate') pages[i].rot = (pages[i].rot + 90) % 360;
    else if (act === 'remove') { URL.revokeObjectURL(pages[i].url); pages.splice(i, 1); }
    else {
      const j = act === 'left' ? i - 1 : i + 1;
      if (j < 0 || j >= pages.length) return;
      [pages[i], pages[j]] = [pages[j], pages[i]];
    }
    paint();
    const again = grid.querySelector(`.p2p-page:nth-child(${Math.min(act === 'left' ? i : act === 'right' ? i + 2 : i + 1, pages.length)}) [data-act="${act === 'remove' ? 'rotate' : act}"]`);
    if (again && !again.disabled) again.focus({ preventScroll: true });
  });
  // drag to reorder (mouse); touch users have the arrow buttons
  let dragId = null;
  grid.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.p2p-page'); if (!li) return;
    dragId = li.dataset.id; li.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  grid.addEventListener('dragover', (e) => {
    if (dragId === null) return;
    e.preventDefault();
    const over = e.target.closest('.p2p-page');
    if (!over || over.dataset.id === dragId) return;
    const from = indexOf(dragId); const to = indexOf(over.dataset.id);
    const [moved] = pages.splice(from, 1);
    pages.splice(to, 0, moved);
    paint();
    grid.querySelector(`[data-id="${dragId}"]`).classList.add('is-dragging');
  });
  grid.addEventListener('dragend', () => { dragId = null; $$('.p2p-page.is-dragging', grid).forEach((li) => li.classList.remove('is-dragging')); });
  grid.addEventListener('drop', (e) => { if (dragId !== null) e.preventDefault(); });

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
