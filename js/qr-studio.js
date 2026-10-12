/* =====================================================================
   WEB GRAPHS — QR CODE STUDIO
   Builds a QR code from one of ten content types and draws it with the
   chosen dot style, corner style, colours, logo and frame. The same
   "scene" is rendered as SVG (preview + SVG download) and onto a canvas
   (PNG / JPG / WebP download and copy). Everything runs in the browser.
   Uses the vendored qrcode-generator engine (js/vendor/qrcode.js).
   ===================================================================== */
(function () {
  'use strict';

  const root = document.getElementById('qrs');
  if (!root || typeof qrcode !== 'function') return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const CELL = 10;
  const f = (v) => Math.round(v * 100) / 100;
  const STORE = 'wg-qr-studio';

  /* ---------- Settings ---------- */
  const DEFAULTS = {
    type: 'url',
    dot: 'rounded', dotScale: 100,
    eyeOuter: 'rounded', eyeInner: 'rounded',
    fillType: 'solid', c1: '#001523', c2: '#ff4545', angle: 45,
    eyeCustom: true, eyeOuterColor: '#ff4545', eyeInnerColor: '#001523',
    bg: '#ffffff', transparent: false,
    logo: 'none', logoData: null, logoSize: 22, logoBg: true, logoShape: 'rounded', logoPad: 8, logoClear: true,
    frame: 'none', caption: 'SCAN ME', frameColor: '#001523', captionColor: '#ffffff', captionSize: 100,
    ecl: 'M', margin: 4, exportSize: 1024,
  };
  const DESIGN_KEYS = Object.keys(DEFAULTS).filter((k) => k !== 'type');

  const PRESETS = {
    classic: { dot: 'square', dotScale: 100, eyeOuter: 'square', eyeInner: 'square', fillType: 'solid', c1: '#000000', eyeCustom: false, bg: '#ffffff', transparent: false, frame: 'none' },
    brand: { dot: 'rounded', dotScale: 100, eyeOuter: 'rounded', eyeInner: 'rounded', fillType: 'solid', c1: '#001523', eyeCustom: true, eyeOuterColor: '#ff4545', eyeInnerColor: '#001523', bg: '#ffffff', transparent: false, frame: 'pill', caption: 'SCAN ME', frameColor: '#ff4545', captionColor: '#ffffff' },
    dots: { dot: 'dots', dotScale: 88, eyeOuter: 'circle', eyeInner: 'circle', fillType: 'linear', c1: '#ff4545', c2: '#001523', angle: 45, eyeCustom: false, bg: '#ffffff', transparent: false, frame: 'none' },
    ocean: { dot: 'classy', dotScale: 100, eyeOuter: 'leaf', eyeInner: 'leaf', fillType: 'radial', c1: '#3b82f6', c2: '#001523', eyeCustom: false, bg: '#ffffff', transparent: false, frame: 'card', caption: 'SCAN ME', frameColor: '#001523', captionColor: '#ffffff' },
    sunset: { dot: 'diamond', dotScale: 100, eyeOuter: 'rounded', eyeInner: 'diamond', fillType: 'linear', c1: '#ff4545', c2: '#f59e0b', angle: 135, eyeCustom: false, bg: '#fffaf5', transparent: false, frame: 'none' },
    lines: { dot: 'vlines', dotScale: 80, eyeOuter: 'rounded', eyeInner: 'circle', fillType: 'solid', c1: '#001523', eyeCustom: true, eyeOuterColor: '#001523', eyeInnerColor: '#ff4545', bg: '#ffffff', transparent: false, frame: 'border', caption: 'SCAN ME', frameColor: '#001523' },
  };

  let S = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && typeof saved === 'object') DESIGN_KEYS.concat('type').forEach((k) => { if (k in saved) S[k] = saved[k]; });
  } catch (err) { /* storage blocked or bad data */ }

  /* ---------- Logo images ---------- */
  const logoIcon = (bg, paths, stroke = true) => {
    const g = stroke
      ? `<g fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(26 26) scale(2)">${paths}</g>`
      : `<g fill="#fff" transform="translate(26 26) scale(2)">${paths}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="${bg}"/>${g}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  const LOGOS = {
    wa: logoIcon('#25d366', '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>', false),
    wifi: logoIcon('#3b82f6', '<path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12a10.5 10.5 0 0 1 14 0"/><path d="M8.5 15.5a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="#fff"/>'),
    mail: logoIcon('#ff4545', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    phone: logoIcon('#14b8a6', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>'),
    pin: logoIcon('#f59e0b', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    link: logoIcon('#001523', '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    wg: null,
  };
  fetch('assets/favicon.svg').then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
    LOGOS.wg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/<svg(?![^>]*\swidth=)/, '<svg width="200" height="200"'));
    const tile = $('.opt[data-logo="wg"] img'); if (tile) tile.src = LOGOS.wg;
    if (S.logo === 'wg') render();
  }).catch(() => { const t = $('.opt[data-logo="wg"]'); if (t) t.hidden = true; });

  const imgCache = new Map();
  const loadImg = (src) => {
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
    }
    return imgCache.get(src);
  };
  const logoSrc = () => (S.logo === 'none' ? null : S.logo === 'upload' ? S.logoData : LOGOS[S.logo]);
  let logoAspect = 1;

  /* ---------- Content ---------- */
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const digits = (v) => {
    let d = v.replace(/[^\d+]/g, '');
    const plus = d.startsWith('+');
    d = d.replace(/\D/g, '');
    if (!plus && d.length === 10 && d.startsWith('0')) d = '27' + d.slice(1);
    return d;
  };
  const wifiEsc = (v) => v.replace(/([\\;,:"])/g, '\\$1');
  const icsDate = (v) => (v ? v.replace(/[-:]/g, '').slice(0, 13) + '00' : '');

  const TYPE_NAMES = { url: 'Link', text: 'Text', wa: 'WhatsApp', phone: 'Phone call', sms: 'SMS', email: 'Email', wifi: 'Wi-Fi', vcard: 'Contact card', location: 'Location', event: 'Event' };

  function content() {
    switch (S.type) {
      case 'url': {
        let u = val('qc-url');
        if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && /\.[a-z]{2,}/i.test(u)) u = 'https://' + u;
        return u;
      }
      case 'text': return val('qc-text');
      case 'wa': {
        const n = digits(val('qc-wa-num'));
        if (!n) return '';
        const m = val('qc-wa-msg');
        return `https://wa.me/${n}` + (m ? `?text=${encodeURIComponent(m)}` : '');
      }
      case 'phone': { const n = digits(val('qc-phone')); return n ? `tel:+${n}` : ''; }
      case 'sms': {
        const n = digits(val('qc-sms-num'));
        return n ? `SMSTO:+${n}:${val('qc-sms-msg')}` : '';
      }
      case 'email': {
        const to = val('qc-email-to');
        if (!to) return '';
        const q = [];
        if (val('qc-email-subject')) q.push('subject=' + encodeURIComponent(val('qc-email-subject')));
        if (val('qc-email-body')) q.push('body=' + encodeURIComponent(val('qc-email-body')));
        return `mailto:${to}` + (q.length ? '?' + q.join('&') : '');
      }
      case 'wifi': {
        const ssid = val('qc-wifi-ssid');
        if (!ssid) return '';
        const enc = val('qc-wifi-enc');
        const hidden = $('#qc-wifi-hidden').checked;
        return `WIFI:T:${enc};S:${wifiEsc(ssid)};` + (enc !== 'nopass' ? `P:${wifiEsc(val('qc-wifi-pass'))};` : '') + (hidden ? 'H:true;' : '') + ';';
      }
      case 'vcard': {
        const first = val('qc-vc-first'); const last = val('qc-vc-last');
        if (!first && !last && !val('qc-vc-org')) return '';
        const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${last};${first};;;`, `FN:${[first, last].filter(Boolean).join(' ')}`];
        if (val('qc-vc-org')) L.push('ORG:' + val('qc-vc-org'));
        if (val('qc-vc-title')) L.push('TITLE:' + val('qc-vc-title'));
        if (val('qc-vc-phone')) L.push('TEL;TYPE=CELL:+' + digits(val('qc-vc-phone')));
        if (val('qc-vc-email')) L.push('EMAIL:' + val('qc-vc-email'));
        if (val('qc-vc-web')) L.push('URL:' + val('qc-vc-web'));
        if (val('qc-vc-street') || val('qc-vc-city') || val('qc-vc-country')) L.push(`ADR;TYPE=WORK:;;${val('qc-vc-street')};${val('qc-vc-city')};;;${val('qc-vc-country')}`);
        L.push('END:VCARD');
        return L.join('\n');
      }
      case 'location': {
        const q = val('qc-loc');
        return q ? 'https://maps.google.com/?q=' + encodeURIComponent(q) : '';
      }
      case 'event': {
        const t = val('qc-ev-title');
        if (!t || !val('qc-ev-start')) return '';
        const L = ['BEGIN:VEVENT', 'SUMMARY:' + t, 'DTSTART:' + icsDate(val('qc-ev-start'))];
        if (val('qc-ev-end')) L.push('DTEND:' + icsDate(val('qc-ev-end')));
        if (val('qc-ev-loc')) L.push('LOCATION:' + val('qc-ev-loc'));
        if (val('qc-ev-desc')) L.push('DESCRIPTION:' + val('qc-ev-desc'));
        L.push('END:VEVENT');
        return L.join('\n');
      }
      default: return '';
    }
  }

  /* ---------- Geometry ---------- */
  function rr(x, y, w, h, r) {
    let [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
    const m = Math.min(w, h) / 2;
    a = Math.min(a, m); b = Math.min(b, m); c = Math.min(c, m); d = Math.min(d, m);
    return `M${f(x + a)} ${f(y)}H${f(x + w - b)}` + (b ? `A${f(b)} ${f(b)} 0 0 1 ${f(x + w)} ${f(y + b)}` : '')
      + `V${f(y + h - c)}` + (c ? `A${f(c)} ${f(c)} 0 0 1 ${f(x + w - c)} ${f(y + h)}` : '')
      + `H${f(x + d)}` + (d ? `A${f(d)} ${f(d)} 0 0 1 ${f(x)} ${f(y + h - d)}` : '')
      + `V${f(y + a)}` + (a ? `A${f(a)} ${f(a)} 0 0 1 ${f(x + a)} ${f(y)}` : '') + 'Z';
  }
  const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  const diamond = (cx, cy, h) => `M${f(cx)} ${f(cy - h)}L${f(cx + h)} ${f(cy)}L${f(cx)} ${f(cy + h)}L${f(cx - h)} ${f(cy)}Z`;

  /* dark(r, c) -> bool for the modules to draw (eyes and logo area already excluded) */
  function modulesPath(n, dark, style, scale) {
    const c = CELL; const k = scale / 100;
    const D = (r, col) => r >= 0 && col >= 0 && r < n && col < n && dark(r, col);
    let d = '';
    if (style === 'vlines' || style === 'hlines') {
      const w = c * k; const o = (c - w) / 2;
      for (let a = 0; a < n; a++) {
        let b = 0;
        while (b < n) {
          const on = style === 'vlines' ? D(b, a) : D(a, b);
          if (!on) { b++; continue; }
          let e = b;
          while (style === 'vlines' ? D(e + 1, a) : D(a, e + 1)) e++;
          const len = (e - b + 1) * c - 2 * o;
          d += style === 'vlines' ? rr(a * c + o, b * c + o, w, len, w / 2) : rr(b * c + o, a * c + o, len, w, w / 2);
          b = e + 1;
        }
      }
      return d;
    }
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        if (!D(r, col)) continue;
        const x = col * c; const y = r * c;
        if (style === 'dots') d += circle(x + c / 2, y + c / 2, (c * k) / 2);
        else if (style === 'diamond') d += diamond(x + c / 2, y + c / 2, (c * k) / 2 * 1.08);
        else if (style === 'rounded' || style === 'classy') {
          const t = D(r - 1, col); const b = D(r + 1, col); const l = D(r, col - 1); const rt = D(r, col + 1);
          const R = c / 2;
          let tl = !t && !l ? R : 0; let tr = !t && !rt ? R : 0; let br = !b && !rt ? R : 0; let bl = !b && !l ? R : 0;
          if (style === 'classy') { tr = 0; bl = 0; }
          d += rr(x, y, c, c, [tl, tr, br, bl]);
        } else {
          const s = c * k; const o = (c - s) / 2;
          d += `M${f(x + o)} ${f(y + o)}h${f(s)}v${f(s)}h${f(-s)}Z`;
        }
      }
    }
    return d;
  }

  /* corner = 'tl' | 'tr' | 'bl' — leaf shapes mirror so they point outwards */
  function eyeOuterPath(x, y, style, corner) {
    const c = CELL;
    const leaf = (big) => (corner === 'tl' ? [big, 0, big, 0] : [0, big, 0, big]);
    const R = { square: [0, 0], rounded: [c * 2, c * 1.2], circle: [c * 3.5, c * 2.5], leaf: [leaf(c * 3), leaf(c * 2)] }[style] || [0, 0];
    return rr(x, y, 7 * c, 7 * c, R[0]) + rr(x + c, y + c, 5 * c, 5 * c, R[1]);
  }
  function eyeInnerPath(x, y, style, corner) {
    const c = CELL; const ix = x + 2 * c; const iy = y + 2 * c;
    if (style === 'diamond') return diamond(ix + 1.5 * c, iy + 1.5 * c, 1.75 * c);
    const leaf = corner === 'tl' ? [1.5 * c, 0, 1.5 * c, 0] : [0, 1.5 * c, 0, 1.5 * c];
    const R = { square: 0, rounded: c * 0.8, circle: c * 1.5, leaf }[style] || 0;
    return rr(ix, iy, 3 * c, 3 * c, R);
  }

  /* ---------- Scene ---------- */
  const captionWidth = (text, size) => text.length * size * 0.62 + size * 2.2;

  function buildScene(text) {
    const qr = qrcode(0, S.ecl);
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const c = CELL; const mg = S.margin * c; const inner = n * c; const Q = inner + 2 * mg;
    const caption = S.frame !== 'none' ? S.caption.trim() : '';
    const capSize = c * 3.6 * (S.captionSize / 100);
    const capH = caption ? capSize * 2.4 : 0;
    const bgFill = S.transparent ? null : S.bg;
    const items = [];
    let W = Q; let H = Q; let qx = 0; let qy = 0;

    if (S.frame === 'border') {
      const p = c * 1.6; const sw = c * 0.7;
      W = Q + 2 * p; H = Q + 2 * p + (caption ? capH - p * 0.6 : 0);
      qx = p; qy = p;
      if (bgFill) items.push({ kind: 'path', d: rr(0, 0, W, H, c * 3.5), fill: bgFill });
      items.push({ kind: 'path', d: rr(sw / 2, sw / 2, W - sw, H - sw, c * 3.2) + rr(sw * 1.5, sw * 1.5, W - sw * 3, H - sw * 3, c * 2.5), fill: S.frameColor, rule: 'evenodd' });
      if (caption) items.push({ kind: 'text', x: W / 2, y: qy + Q + (H - qy - Q - sw) / 2, text: caption, size: capSize, fill: S.frameColor });
    } else if (S.frame === 'card' || S.frame === 'card-top') {
      const p = c * 1.8;
      W = Q + 2 * p; H = Q + 2 * p + (caption ? capH - p * 0.4 : 0);
      qx = p; qy = S.frame === 'card-top' && caption ? H - Q - p : p;
      items.push({ kind: 'path', d: rr(0, 0, W, H, c * 4), fill: S.frameColor });
      items.push({ kind: 'path', d: rr(qx, qy, Q, Q, c * 2.6), fill: bgFill || '#ffffff' });
      if (caption) {
        const ty = S.frame === 'card-top' ? qy / 2 + p * 0.1 : qy + Q + (H - qy - Q) / 2 - p * 0.1;
        items.push({ kind: 'text', x: W / 2, y: ty, text: caption, size: capSize, fill: S.captionColor });
      }
    } else if (S.frame === 'pill') {
      const gap = c * 0.6;
      const ph = capSize * 2.2;
      W = Q; H = Q + (caption ? ph + gap + c : 0);
      if (bgFill) items.push({ kind: 'path', d: rr(0, 0, W, H, S.transparent ? 0 : c * 2), fill: bgFill });
      if (caption) {
        const pw = Math.min(captionWidth(caption, capSize), W - c * 2);
        const py = Q - mg / 2 + gap;
        items.push({ kind: 'path', d: rr((W - pw) / 2, py, pw, ph, ph / 2), fill: S.frameColor });
        items.push({ kind: 'text', x: W / 2, y: py + ph / 2, text: caption, size: capSize, fill: S.captionColor });
        H = Math.max(H, py + ph + mg / 2);
      }
    } else if (bgFill) {
      items.push({ kind: 'path', d: `M0 0H${W}V${H}H0Z`, fill: bgFill });
    }

    /* logo box (relative to the module grid) */
    const src = logoSrc();
    const lw = src ? inner * (S.logoSize / 100) : 0;
    const pad = src && S.logoBg ? lw * (S.logoPad / 100) : 0;
    const l0 = (inner - lw) / 2 - pad; const l1 = (inner + lw) / 2 + pad;
    const inLogo = (r, col) => src && S.logoClear && (col + 1) * c > l0 && col * c < l1 && (r + 1) * c > l0 && r * c < l1;
    const isEye = (r, col) => (r < 7 && col < 7) || (r < 7 && col >= n - 7) || (r >= n - 7 && col < 7);
    const dark = (r, col) => qr.isDark(r, col) && !isEye(r, col) && !inLogo(r, col);

    const ox = qx + mg; const oy = qy + mg;
    const box = { x: 0, y: 0, w: inner, h: inner };
    const dotFill = S.fillType === 'solid' ? S.c1 : { type: S.fillType, c1: S.c1, c2: S.c2, angle: S.angle, box };
    items.push({ kind: 'path', d: modulesPath(n, dark, S.dot, S.dotScale), fill: dotFill, tx: ox, ty: oy });

    const eyes = [[0, 0, 'tl'], [(n - 7) * c, 0, 'tr'], [0, (n - 7) * c, 'bl']];
    const outerD = eyes.map(([x, y, k]) => eyeOuterPath(x, y, S.eyeOuter, k)).join('');
    const innerD = eyes.map(([x, y, k]) => eyeInnerPath(x, y, S.eyeInner, k)).join('');
    items.push({ kind: 'path', d: outerD, fill: S.eyeCustom ? S.eyeOuterColor : dotFill, rule: 'evenodd', tx: ox, ty: oy });
    items.push({ kind: 'path', d: innerD, fill: S.eyeCustom ? S.eyeInnerColor : dotFill, tx: ox, ty: oy });

    if (src) {
      const lx = ox + (inner - lw) / 2; const ly = oy + (inner - lw) / 2;
      const shapeR = (size) => ({ square: size * 0.04, rounded: size * 0.24, circle: size / 2 }[S.logoShape]);
      if (S.logoBg) {
        const s = lw + 2 * pad;
        items.push({ kind: 'path', d: rr(lx - pad, ly - pad, s, s, shapeR(s)), fill: S.transparent ? '#ffffff' : S.bg });
      }
      let iw = lw; let ih = lw;
      if (logoAspect > 1) ih = lw / logoAspect; else iw = lw * logoAspect;
      const ix = lx + (lw - iw) / 2; const iy = ly + (lw - ih) / 2;
      items.push({ kind: 'image', x: ix, y: iy, w: iw, h: ih, href: src, clip: rr(ix, iy, iw, ih, S.logo === 'upload' ? shapeR(Math.min(iw, ih)) : 0) });
    }

    return { W, H, items, n, version: (n - 17) / 4 };
  }

  /* ---------- SVG output ---------- */
  function gradDef(g, id) {
    const { x, y, w, h } = g.box;
    if (g.type === 'radial') {
      return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${f(Math.max(w, h) * 0.6)}"><stop offset="0" stop-color="${g.c1}"/><stop offset="1" stop-color="${g.c2}"/></radialGradient>`;
    }
    const a = (g.angle * Math.PI) / 180; const cx = x + w / 2; const cy = y + h / 2;
    const dx = (Math.cos(a) * w) / 2; const dy = (Math.sin(a) * h) / 2;
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(cx - dx)}" y1="${f(cy - dy)}" x2="${f(cx + dx)}" y2="${f(cy + dy)}"><stop offset="0" stop-color="${g.c1}"/><stop offset="1" stop-color="${g.c2}"/></linearGradient>`;
  }
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function toSVG(sc) {
    let defs = ''; let body = ''; let gi = 0;
    sc.items.forEach((it) => {
      let fill = it.fill;
      if (fill && typeof fill === 'object') { const id = 'qg' + gi++; defs += gradDef(fill, id); fill = `url(#${id})`; }
      const tr = it.tx || it.ty ? ` transform="translate(${f(it.tx || 0)} ${f(it.ty || 0)})"` : '';
      if (it.kind === 'path') body += `<path d="${it.d}" fill="${fill}"${it.rule ? ` fill-rule="${it.rule}"` : ''}${tr}/>`;
      else if (it.kind === 'text') body += `<text x="${f(it.x)}" y="${f(it.y)}" fill="${fill}" font-family="Google Sans, Segoe UI, Arial, sans-serif" font-weight="600" font-size="${f(it.size)}" letter-spacing="${f(it.size * 0.06)}" text-anchor="middle" dominant-baseline="central">${esc(it.text)}</text>`;
      else if (it.kind === 'image') {
        const id = 'qc' + gi++;
        defs += `<clipPath id="${id}"><path d="${it.clip}"/></clipPath>`;
        body += `<image href="${it.href}" x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
      }
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(sc.W)} ${f(sc.H)}" width="${f(sc.W)}" height="${f(sc.H)}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
  }

  /* ---------- Canvas output ---------- */
  async function toCanvas(sc, width, opaque) {
    const k = width / sc.W;
    const cv = document.createElement('canvas');
    cv.width = Math.round(sc.W * k); cv.height = Math.round(sc.H * k);
    const ctx = cv.getContext('2d');
    ctx.scale(k, k);
    if (opaque) { ctx.fillStyle = S.transparent ? '#ffffff' : S.bg; ctx.fillRect(0, 0, sc.W, sc.H); }
    try { await document.fonts.load(`600 20px "Google Sans"`); } catch (err) { /* fallback font */ }
    for (const it of sc.items) {
      ctx.save();
      if (it.tx || it.ty) ctx.translate(it.tx || 0, it.ty || 0);
      let fill = it.fill;
      if (fill && typeof fill === 'object') {
        const { x, y, w, h } = fill.box;
        let g;
        if (fill.type === 'radial') g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.6);
        else {
          const a = (fill.angle * Math.PI) / 180; const cx = x + w / 2; const cy = y + h / 2;
          const dx = (Math.cos(a) * w) / 2; const dy = (Math.sin(a) * h) / 2;
          g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        }
        g.addColorStop(0, fill.c1); g.addColorStop(1, fill.c2);
        fill = g;
      }
      if (it.kind === 'path') { ctx.fillStyle = fill; ctx.fill(new Path2D(it.d), it.rule || 'nonzero'); }
      else if (it.kind === 'text') {
        ctx.fillStyle = fill; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `600 ${it.size}px "Google Sans", "Segoe UI", Arial, sans-serif`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${it.size * 0.06}px`;
        ctx.fillText(it.text, it.x, it.y);
      } else if (it.kind === 'image') {
        const img = await loadImg(it.href);
        ctx.clip(new Path2D(it.clip));
        const ar = img.naturalWidth / img.naturalHeight || 1;
        let sw = img.naturalWidth; let sh = img.naturalHeight; let sx = 0; let sy = 0;
        const target = it.w / it.h;
        if (ar > target) { sw = sh * target; sx = (img.naturalWidth - sw) / 2; } else if (ar < target) { sh = sw / target; sy = (img.naturalHeight - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw || it.w, sh || it.h, it.x, it.y, it.w, it.h);
      }
      ctx.restore();
    }
    return cv;
  }

  /* ---------- Checks ---------- */
  const lum = (hex) => {
    const m = /^#?([\da-f]{6})$/i.exec(hex); if (!m) return 1;
    const v = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const contrast = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  function checks() {
    const out = [];
    const bg = S.transparent ? '#ffffff' : S.bg;
    const fgs = [S.c1].concat(S.fillType !== 'solid' ? [S.c2] : []).concat(S.eyeCustom ? [S.eyeOuterColor, S.eyeInnerColor] : []);
    const worst = Math.min(...fgs.map((c) => contrast(c, bg)));
    if (worst < 3) out.push(['warn', 'Low contrast — the code may not scan. Use darker dots or a lighter background.']);
    if (fgs.some((c) => lum(c) > lum(bg))) out.push(['warn', 'Light dots on a darker background — some older scanners can’t read inverted codes.']);
    if (S.logo !== 'none' && (S.ecl === 'L' || S.ecl === 'M') && S.logoSize > 14) out.push(['warn', 'A logo covers part of the code — switch error correction to High (H).']);
    if (S.logo !== 'none' && S.logoSize > 26 && S.ecl !== 'H') out.push(['warn', 'Big logo — keep it under 25% or use High error correction.']);
    if (S.margin < 2) out.push(['warn', 'Very small quiet zone — leave some space around the code when you print it.']);
    if (S.transparent) out.push(['info', 'Transparent background — place it on a light, plain surface.']);
    if (!out.some((o) => o[0] === 'warn')) out.unshift(['ok', 'Looks good to scan.']);
    return out;
  }

  /* ---------- UI binding ---------- */
  const preview = $('#qrs-preview');
  const info = $('#qrs-info');
  const notes = $('#qrs-notes');
  const errorBox = $('#qrs-error');
  const actions = $$('[data-export], #qrs-copy');
  let scene = null; let text = ''; let raf = 0;

  function readControl(el) {
    const k = el.dataset.k;
    if (el.type === 'radio') { if (el.checked) S[k] = el.value; } else if (el.type === 'checkbox') S[k] = el.checked;
    else if (el.type === 'range' || el.type === 'number') S[k] = Number(el.value);
    else S[k] = el.value;
  }
  function syncControls() {
    $$('[data-k]', root).forEach((el) => {
      const k = el.dataset.k;
      if (el.type === 'radio') el.checked = String(S[k]) === el.value;
      else if (el.type === 'checkbox') el.checked = !!S[k];
      else if (el.type !== 'file') el.value = S[k];
    });
    syncOutputs();
  }
  function syncOutputs() {
    $$('[data-out]', root).forEach((o) => {
      const k = o.dataset.out; const unit = o.dataset.unit || '';
      o.textContent = S[k] + unit;
    });
    $$('[data-when]', root).forEach((el) => {
      const [k, list] = el.dataset.when.split(':');
      const neg = list.startsWith('!');
      const vals = (neg ? list.slice(1) : list).split(',');
      const hit = vals.includes(String(S[k]));
      el.hidden = neg ? hit : !hit;
    });
    const sum = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    const opt = (name) => { const r = $(`input[name="${name}"]:checked`, root); return r ? r.closest('.opt').querySelector('.opt-name').textContent : ''; };
    sum('sv-content', TYPE_NAMES[S.type]);
    sum('sv-pattern', opt('dot'));
    sum('sv-corners', `${opt('eyeOuter')} · ${opt('eyeInner')}`);
    sum('sv-colours', S.fillType === 'solid' ? 'Solid' : S.fillType === 'linear' ? 'Linear gradient' : 'Radial gradient');
    sum('sv-logo', S.logo === 'none' ? 'None' : opt('logo'));
    sum('sv-frame', S.frame === 'none' ? 'None' : `${opt('frame')} · ${S.caption || 'no text'}`);
    sum('sv-output', `${S.ecl} · ${S.exportSize}px`);
  }

  function save() {
    try {
      const o = {}; DESIGN_KEYS.concat('type').forEach((k) => { o[k] = S[k]; });
      if (o.logoData && o.logoData.length > 400000) { o.logoData = null; if (o.logo === 'upload') o.logo = 'none'; }
      localStorage.setItem(STORE, JSON.stringify(o));
    } catch (err) { /* storage full or blocked */ }
  }

  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(async () => {
      text = content();
      errorBox.hidden = true;
      const src = logoSrc();
      if (src) { try { const im = await loadImg(src); logoAspect = im.naturalWidth / im.naturalHeight || 1; } catch (err) { logoAspect = 1; } }
      if (!text) {
        scene = null;
        preview.innerHTML = '<div class="qrs-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/></svg><p>Fill in the content to create your code</p></div>';
        info.textContent = '';
        notes.innerHTML = '';
        actions.forEach((b) => { b.disabled = true; });
      } else {
        try {
          scene = buildScene(text);
          preview.innerHTML = toSVG(scene);
          preview.classList.toggle('is-transparent', S.transparent);
          info.textContent = `Version ${scene.version} · ${scene.n}×${scene.n} modules · ${text.length} characters`;
          notes.innerHTML = checks().map(([t, m]) => `<li class="is-${t}">${m}</li>`).join('');
          actions.forEach((b) => { b.disabled = false; });
        } catch (err) {
          scene = null;
          preview.innerHTML = '';
          errorBox.hidden = false;
          info.textContent = '';
          notes.innerHTML = '';
          actions.forEach((b) => { b.disabled = true; });
        }
      }
      syncOutputs();
      save();
    });
  }

  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.k) {
      const before = S.logo;
      readControl(el);
      if (el.dataset.k === 'logo' && before === 'none' && S.logo !== 'none' && (S.ecl === 'L' || S.ecl === 'M')) { S.ecl = 'H'; syncControls(); }
      if (el.dataset.k === 'logo' && S.logo === 'upload' && !S.logoData) $('#qrs-upload').click();
    }
    render();
  });
  root.addEventListener('change', (e) => { if (e.target.dataset.k && e.target.type === 'radio') { readControl(e.target); render(); } });

  $('#qrs-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      S.logoData = reader.result; S.logo = 'upload';
      if (S.ecl === 'L' || S.ecl === 'M') S.ecl = 'H';
      const prev = $('.opt[data-logo="upload"] img'); if (prev) { prev.src = S.logoData; prev.hidden = false; }
      syncControls(); render();
    };
    reader.readAsDataURL(file);
  });

  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    Object.assign(S, PRESETS[b.dataset.preset]);
    syncControls(); render();
  }));
  $$('[data-swatch]').forEach((b) => b.addEventListener('click', () => {
    S.c1 = b.dataset.swatch; syncControls(); render();
  }));
  $('#qrs-reset').addEventListener('click', () => {
    const type = S.type; S = Object.assign({}, DEFAULTS, { type });
    syncControls(); render();
  });
  $('#qrs-random').addEventListener('click', () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const pal = [['#001523', '#ff4545'], ['#ff4545', '#f59e0b'], ['#3b82f6', '#001523'], ['#7b5cff', '#ff4545'], ['#0f766e', '#001523'], ['#111111', '#555555']];
    const [a, b] = pick(pal);
    Object.assign(S, {
      dot: pick(['square', 'rounded', 'dots', 'classy', 'diamond', 'vlines', 'hlines']), dotScale: pick([80, 90, 100]),
      eyeOuter: pick(['square', 'rounded', 'circle', 'leaf']), eyeInner: pick(['square', 'rounded', 'circle', 'diamond', 'leaf']),
      fillType: pick(['solid', 'linear', 'radial']), c1: a, c2: b, angle: pick([0, 45, 90, 135]),
      eyeCustom: Math.random() > 0.5, eyeOuterColor: b, eyeInnerColor: a, bg: '#ffffff', transparent: false,
    });
    syncControls(); render();
  });

  /* ---------- Export ---------- */
  const fileBase = () => `qr-${S.type}`;
  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const status = $('#qrs-status');
  const say = (m) => { status.textContent = m; clearTimeout(say.t); say.t = setTimeout(() => { status.textContent = ''; }, 3500); };

  $$('[data-export]').forEach((b) => b.addEventListener('click', async () => {
    if (!scene) return;
    const fmt = b.dataset.export;
    if (fmt === 'svg') { download(new Blob([toSVG(scene)], { type: 'image/svg+xml' }), `${fileBase()}.svg`); say('SVG downloaded.'); return; }
    const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const cv = await toCanvas(scene, S.exportSize, fmt === 'jpg');
    cv.toBlob((blob) => { if (blob) { download(blob, `${fileBase()}.${fmt}`); say(`${fmt.toUpperCase()} downloaded (${cv.width}×${cv.height}px).`); } }, mime, 0.95);
  }));
  $('#qrs-copy').addEventListener('click', async () => {
    if (!scene) return;
    try {
      const cv = await toCanvas(scene, S.exportSize, false);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      say('Copied — paste it into WhatsApp, Word or a design app.');
    } catch (err) { say('Your browser blocked copying — use Download PNG instead.'); }
  });

  /* ---------- Option previews (drawn with the same engine) ---------- */
  const SAMPLE = ['1101101', '1011011', '0111010', '1100111', '1011101', '0110110', '1101011'];
  $$('.opt[data-preview="dot"]').forEach((o) => {
    const style = $('input', o).value;
    const d = modulesPath(7, (r, c) => SAMPLE[r][c] === '1', style, style === 'dots' ? 90 : style.endsWith('lines') ? 80 : 100);
    $('.opt-face', o).innerHTML = `<svg viewBox="0 0 70 70" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
  });
  $$('.opt[data-preview="eyeOuter"]').forEach((o) => {
    const style = $('input', o).value;
    $('.opt-face', o).innerHTML = `<svg viewBox="-5 -5 80 80" aria-hidden="true"><path d="${eyeOuterPath(0, 0, style, 'tl')}" fill="currentColor" fill-rule="evenodd"/><path d="${rr(20, 20, 30, 30, 0)}" fill="currentColor" opacity=".35"/></svg>`;
  });
  $$('.opt[data-preview="eyeInner"]').forEach((o) => {
    const style = $('input', o).value;
    $('.opt-face', o).innerHTML = `<svg viewBox="-5 -5 80 80" aria-hidden="true"><path d="${eyeOuterPath(0, 0, 'square', 'tl')}" fill="currentColor" fill-rule="evenodd" opacity=".35"/><path d="${eyeInnerPath(0, 0, style, 'tl')}" fill="currentColor"/></svg>`;
  });
  $$('.opt[data-logo]').forEach((o) => {
    const k = o.dataset.logo; const img = $('img', o);
    if (img && LOGOS[k]) img.src = LOGOS[k];
    if (k === 'upload' && S.logoData && img) { img.src = S.logoData; img.hidden = false; }
  });
  $$('[data-preset]').forEach((b) => {
    const p = Object.assign({}, DEFAULTS, PRESETS[b.dataset.preset], { logo: 'none', frame: 'none', margin: 1 });
    const keep = S; S = p;
    try { $('.preset-face', b).innerHTML = toSVG(buildScene('https://wa.me/27787347867')); } catch (err) { /* ignore */ }
    S = keep;
  });

  syncControls();
  render();
})();
