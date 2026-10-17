/* =====================================================================
   WEB GRAPHS — COLOUR PICKER
   Replaces the browser's colour popup on every .color-field with a
   picker in the site's style: saturation/brightness square, hue slider,
   hex field, eyedropper (where the browser supports it), brand swatches
   and recently used colours. The original <input type="color"> stays in
   the page (hidden) and keeps the value, so forms and scripts that read
   it keep working; it receives an "input" event on every change.
   ===================================================================== */
(function () {
  'use strict';

  const inputs = Array.from(document.querySelectorAll('.color-field input[type="color"]'));
  if (!inputs.length) return;

  const BRAND = ['#001523', '#ff4545', '#000000', '#ffffff', '#3b82f6', '#7b5cff', '#14b8a6', '#f59e0b', '#16a34a', '#e2e9ed'];
  const RECENT_KEY = 'wg-recent-colors';
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((c) => /^#[\da-f]{6}$/i.test(c)); } catch (err) { recent = []; }

  /* ---------- colour maths ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const parseHex = (h) => {
    let s = String(h).trim().replace(/^#/, '');
    if (/^[\da-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
    if (!/^[\da-f]{6}$/i.test(s)) return null;
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  };
  const hsvToRgb = (h, s, v) => {
    const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };

  /* ---------- triggers ---------- */
  const triggers = new Map();
  inputs.forEach((input) => {
    input.hidden = true;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cp-trigger';
    btn.id = input.id + '-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = `<span class="cp-chip"></span><span class="cp-hex" id="${input.id}-hex"></span>`;
    input.after(btn);
    const label = document.querySelector(`label[for="${input.id}"]`);
    // name = label + the hex shown on the button, so the spoken name matches what is visible
    if (label) { label.htmlFor = btn.id; label.id = label.id || `${input.id}-label`; btn.setAttribute('aria-labelledby', `${label.id} ${input.id}-hex`); }
    triggers.set(input, btn);
    btn.addEventListener('click', () => (current === input ? close() : open(input)));
  });
  const paint = (input) => {
    const btn = triggers.get(input);
    $('.cp-chip', btn).style.background = input.value;
    $('.cp-hex', btn).textContent = input.value.toUpperCase();
  };
  function $(s, r = document) { return r.querySelector(s); }
  const refresh = () => inputs.forEach(paint);
  window.wgColorPickerRefresh = refresh;
  refresh();

  /* ---------- popover ---------- */
  const pop = document.createElement('div');
  pop.className = 'cp-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Colour picker');
  pop.hidden = true;
  const eyedrop = 'EyeDropper' in window
    ? '<button type="button" class="cp-icon" data-cp="eye" aria-label="Pick a colour from the screen" title="Pick from screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg></button>'
    : '';
  pop.innerHTML = `
    <div class="cp-sv" data-cp="sv"><span class="cp-sv-thumb" tabindex="0" role="slider" aria-label="Saturation and brightness" data-cp="svthumb"></span></div>
    <input type="range" class="cp-hue" data-cp="hue" min="0" max="360" step="1" aria-label="Hue">
    <div class="cp-row">
      <span class="cp-now" data-cp="now"></span>
      <label class="cp-hexfield"><span>#</span><input type="text" data-cp="hex" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex colour code"></label>
      ${eyedrop}
    </div>
    <div class="cp-group"><p>Brand colours</p><div class="cp-swatches" data-cp="brand"></div></div>
    <div class="cp-group" data-cp="recentwrap"><p>Recently used</p><div class="cp-swatches" data-cp="recent"></div></div>`;
  document.body.appendChild(pop);

  const el = (k) => pop.querySelector(`[data-cp="${k}"]`);
  const sv = el('sv'); const thumb = el('svthumb'); const hue = el('hue'); const hex = el('hex'); const now = el('now');
  const swatchHTML = (list) => list.map((c) => `<button type="button" class="cp-sw" style="--c:${c}" data-color="${c}" aria-label="${c}"></button>`).join('');
  el('brand').innerHTML = swatchHTML(BRAND);

  let current = null; let H = 0; let Sa = 0; let V = 0;

  function show() {
    const [r, g, b] = hsvToRgb(H, Sa, V);
    const value = toHex(r, g, b);
    sv.style.setProperty('--h', H);
    thumb.style.left = `${Sa * 100}%`;
    thumb.style.top = `${(1 - V) * 100}%`;
    thumb.style.background = value;
    thumb.setAttribute('aria-valuetext', value);
    now.style.background = value;
    hue.value = H;
    if (document.activeElement !== hex) hex.value = value.slice(1).toUpperCase();
    pop.querySelectorAll('.cp-sw').forEach((s) => s.classList.toggle('is-on', s.dataset.color.toLowerCase() === value));
    return value;
  }
  function commit() {
    if (!current) return;
    const value = show();
    if (current.value.toLowerCase() !== value) {
      current.value = value;
      current.dispatchEvent(new Event('input', { bubbles: true }));
    }
    paint(current);
  }
  function setFromHex(h) {
    const rgb = parseHex(h);
    if (!rgb) return false;
    const [hh, s, v] = rgbToHsv(...rgb);
    if (s > 0 && v > 0) H = hh;
    Sa = s; V = v;
    commit();
    return true;
  }

  function place() {
    const btn = triggers.get(current);
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth; const h = pop.offsetHeight;
    let left = r.left + window.scrollX;
    left = clamp(left, window.scrollX + 12, window.scrollX + document.documentElement.clientWidth - w - 12);
    let top = r.bottom + window.scrollY + 8;
    if (r.bottom + h + 16 > window.innerHeight && r.top - h - 8 > 0) top = r.top + window.scrollY - h - 8;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }
  function open(input) {
    if (current) close(true);
    current = input;
    const rgb = parseHex(input.value) || [0, 0, 0];
    [H, Sa, V] = rgbToHsv(...rgb);
    el('recent').innerHTML = swatchHTML(recent);
    el('recentwrap').hidden = !recent.length;
    pop.hidden = false;
    show();
    place();
    triggers.get(input).setAttribute('aria-expanded', 'true');
    triggers.get(input).classList.add('is-open');
    requestAnimationFrame(() => thumb.focus({ preventScroll: true }));
  }
  function close(silent) {
    if (!current) return;
    const value = current.value.toLowerCase();
    recent = [value].concat(recent.filter((c) => c !== value)).slice(0, 10);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch (err) { /* storage blocked */ }
    const btn = triggers.get(current);
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-open');
    pop.hidden = true;
    current = null;
    if (!silent) btn.focus({ preventScroll: true });
  }

  /* ---------- interaction ---------- */
  const fromPointer = (e) => {
    const r = sv.getBoundingClientRect();
    Sa = clamp((e.clientX - r.left) / r.width, 0, 1);
    V = 1 - clamp((e.clientY - r.top) / r.height, 0, 1);
    commit();
  };
  sv.addEventListener('pointerdown', (e) => {
    sv.setPointerCapture(e.pointerId);
    fromPointer(e);
    const move = (ev) => fromPointer(ev);
    const up = () => { sv.removeEventListener('pointermove', move); sv.removeEventListener('pointerup', up); };
    sv.addEventListener('pointermove', move);
    sv.addEventListener('pointerup', up);
  });
  thumb.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!k) return;
    e.preventDefault();
    Sa = clamp(Sa + k[0], 0, 1); V = clamp(V + k[1], 0, 1);
    commit();
  });
  hue.addEventListener('input', () => { H = Number(hue.value); commit(); });
  hex.addEventListener('input', () => { const v = hex.value.replace(/[^\da-f]/gi, ''); if (v.length === 3 || v.length === 6) setFromHex(v); });
  hex.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); close(); } });
  hex.addEventListener('blur', () => { hex.value = show().slice(1).toUpperCase(); });
  pop.addEventListener('click', (e) => {
    const sw = e.target.closest('.cp-sw');
    if (sw) { setFromHex(sw.dataset.color); return; }
    if (e.target.closest('[data-cp="eye"]')) {
      new window.EyeDropper().open().then((res) => setFromHex(res.sRGBHex)).catch(() => {});
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!current || pop.contains(e.target) || triggers.get(current).contains(e.target)) return;
    close(true);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) close(); });
  window.addEventListener('resize', () => { if (current) place(); });
  pop.addEventListener('focusout', (e) => {
    if (current && !pop.contains(e.relatedTarget) && e.relatedTarget !== triggers.get(current) && e.relatedTarget) close(true);
  });
})();
