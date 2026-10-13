/* =====================================================================
   WEB GRAPHS TECHNOLOGIES — SITE SCRIPT
   Shared by every page. Each init function checks for its own markup
   and returns early when the page doesn't have it.
   ===================================================================== */
(function () {
  'use strict';

  const WHATSAPP = '27787347867';
  const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

  /* ---------- Header: scrolled state + mobile menu ---------- */
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const toggle = header.querySelector('.nav-toggle');
    const menu = document.getElementById('mobile-nav');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', (mq) => { if (mq.matches) setOpen(false); });
  }

  /* ---------- Theme switch (footer) ----------
     Light by default. Dark is remembered; System is remembered too and
     follows the device. The change cross-fades where the browser supports
     view transitions, and the browser bar colour follows the choice. */
  function initThemeSwitch() {
    const root = document.documentElement;
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    metas.forEach((m) => { m.dataset.auto = m.content; });
    const syncBar = () => {
      const forced = root.getAttribute('data-wg-theme');
      metas.forEach((m) => { m.content = forced ? (forced === 'dark' ? '#000e17' : '#ffffff') : m.dataset.auto; });
    };
    syncBar();
    const btns = document.querySelectorAll('[data-theme-set]');
    if (!btns.length) return;
    const saved = () => root.getAttribute('data-wg-theme') || 'system';
    const mark = () => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === saved())));
    const apply = (mode) => {
      if (mode === 'system') root.removeAttribute('data-wg-theme');
      else root.setAttribute('data-wg-theme', mode);
      for (const store of [window.localStorage, window.sessionStorage]) {
        try { store.setItem('wg-theme', mode); } catch (err) { /* storage blocked */ }
      }
      mark();
      syncBar();
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      const mode = b.dataset.themeSet;
      if (mode === saved()) return;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (document.startViewTransition && !calm) document.startViewTransition(() => apply(mode));
      else apply(mode);
    }));
    mark();
  }

  /* ---------- Opening splash ----------
     Once per visit, on a plain navy screen: the red W is traced and fills,
     "WebGraphs" wipes in, "TECHNOLOGIES" follows, then the curtain lifts
     and the logo glides into its place in the header. The logo artwork is
     assets/logo-footer.svg (the same file as the footer logo). Click, tap
     or any key speeds it up. */
  function initSplash() {
    const root = document.documentElement;
    if (!root.classList.contains('wg-splash')) return;
    const headLogo = document.querySelector('.site-header .logo');
    const headMark = headLogo && headLogo.querySelector('.logo-mark');
    const headWord = headLogo && headLogo.querySelector('.logo-word');
    const bail = () => root.classList.remove('wg-splash');
    if (!headMark || !Element.prototype.animate || !window.fetch || !window.DOMParser) { bail(); return; }
    fetch(new URL('assets/logo-footer.svg', document.baseURI))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('logo'))))
      .then((text) => playSplash(new DOMParser().parseFromString(text, 'image/svg+xml').documentElement))
      .catch(bail);

    function playSplash(art) {
      const vb = art.getAttribute('viewBox');
      const part = (sel) => { const n = art.querySelector(sel); return n ? n.outerHTML : ''; };
      if (!part('.lf-mark')) { bail(); return; }
      const svg = (inner, cls) => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
      const el = document.createElement('div');
      el.className = 'splash';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `
        <div class="splash-bg"></div>
        <div class="splash-edge"></div>
        <div class="splash-stage">
          <div class="splash-lockup">
            ${svg(part('.lf-mark') + part('.lf-mark').replace('lf-mark', 'lf-mark splash-trace'), 'splash-svg splash-svg--mark')}
            <div class="splash-wipe splash-wipe--word">${svg(part('.lf-word'), 'splash-svg')}</div>
            <div class="splash-wipe splash-wipe--tech">${svg(part('.lf-tech'), 'splash-svg')}</div>
          </div>
        </div>
        <button type="button" class="splash-skip" tabindex="-1">Skip intro</button>`;
      document.body.appendChild(el);
      root.classList.add('splash-on');
      root.classList.remove('wg-splash');

      const $s = (q) => el.querySelector(q);
      const lockup = $s('.splash-lockup');
      const mark = $s('.splash-svg--mark .lf-mark:not(.splash-trace)');
      const trace = $s('.splash-trace');
      const wordPath = $s('.splash-wipe--word .lf-word');
      const len = trace.getTotalLength ? trace.getTotalLength() : 1200;
      const ease = 'cubic-bezier(.16, 1, .3, 1)';
      const inOut = 'cubic-bezier(.76, 0, .24, 1)';
      const anims = [];
      const play = (node, frames, opts) => { const a = node.animate(frames, { fill: 'both', ...opts }); anims.push(a); return a; };

      // 1. the W is traced in red, then fills in
      trace.style.strokeDasharray = `${len}`;
      play(trace, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(.65, 0, .35, 1)' });
      play(trace, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 900 });
      play(mark, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 650, easing: 'ease-out' });
      // 2. "WebGraphs" wipes in from behind the W, then "TECHNOLOGIES"
      play($s('.splash-wipe--word'), [{ clipPath: 'inset(-10% 66% -10% 34%)' }, { clipPath: 'inset(-10% -1% -10% 34%)' }], { duration: 650, delay: 1000, easing: ease });
      play($s('.splash-wipe--word svg'), [{ transform: 'translateX(-4%)' }, { transform: 'none' }], { duration: 650, delay: 1000, easing: ease });
      play($s('.splash-wipe--tech'), [{ clipPath: 'inset(-10% 66% -10% 34%)', opacity: 0 }, { clipPath: 'inset(-10% -1% -10% 34%)', opacity: 1 }], { duration: 700, delay: 1350, easing: ease });
      play($s('.splash-skip'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600 });

      // 3. curtain lifts; the W glides onto the header's W and hands over to it
      const T = 2250;
      const from = mark.getBoundingClientRect();
      const to = headMark.getBoundingClientRect();
      const L = lockup.getBoundingClientRect();
      const k = to.width / from.width;
      const tx = to.left - L.left - (from.left - L.left) * k;
      const ty = to.top - L.top - (from.top - L.top) * k;
      play(lockup, [{ transform: 'none' }, { transform: `translate(${tx}px, ${ty}px) scale(${k})` }], { duration: 850, delay: T, easing: inOut });
      play(lockup, [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 850, delay: T, fill: 'forwards' });
      play($s('.splash-wipe--tech'), [{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: T, fill: 'forwards', composite: 'replace' });
      if (headWord) play(wordPath, [{ fill: '#ffffff' }, { fill: getComputedStyle(headWord).fill }], { duration: 850, delay: T, easing: inOut });
      play($s('.splash-skip'), [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: T, fill: 'forwards' });
      play($s('.splash-bg'), [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 850, delay: T + 50, easing: inOut });
      play($s('.splash-edge'), [
        { transform: `translateY(${window.innerHeight}px)`, opacity: 0 },
        { opacity: 1, offset: 0.04 },
        { transform: 'translateY(0)', opacity: 1, offset: 0.94 },
        { transform: 'translateY(0)', opacity: 0 },
      ], { duration: 900, delay: T + 50, easing: inOut });
      // the header logo fades in under the gliding W as it lands
      const headIn = headLogo.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 850, delay: T, fill: 'both' });
      anims.push(headIn);

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        root.classList.remove('splash-on');
        el.remove();
        headIn.cancel();
        removeEventListener('keydown', hurry, true);
      };
      const hurry = () => anims.forEach((a) => a.updatePlaybackRate(5));
      Promise.all(anims.map((a) => a.finished)).then(finish, finish);
      setTimeout(finish, 6000);
      el.addEventListener('pointerdown', hurry);
      el.addEventListener('wheel', hurry, { passive: true });
      addEventListener('keydown', hurry, true);
    }
  }

  /* ---------- Nav dropdown (Pricing) ----------
     CSS opens it on hover and focus; the caret button toggles it for touch
     and keyboard, and Escape or a click elsewhere closes it. */
  function initNavMenus() {
    document.querySelectorAll('.nav-item.has-menu').forEach((item) => {
      const caret = item.querySelector('.nav-caret');
      const setOpen = (open) => {
        item.classList.toggle('is-open', open);
        item.classList.toggle('is-closed', !open);
        caret.setAttribute('aria-expanded', String(open));
      };
      caret.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!item.classList.contains('is-open')); });
      item.addEventListener('mouseenter', () => item.classList.remove('is-closed'));
      item.addEventListener('focusin', () => item.classList.remove('is-closed'));
      item.querySelectorAll('.nav-menu a').forEach((a) => a.addEventListener('click', () => { setOpen(false); a.blur(); }));
      document.addEventListener('click', (e) => { if (!item.contains(e.target) && item.classList.contains('is-open')) setOpen(false); });
      item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); caret.focus(); } });
    });
  }

  /* ---------- Custom dropdowns ----------
     Every <select> gets a styled button and option list. The native
     select stays in the page (visually hidden) and keeps the value, so
     forms and scripts read it as before; it receives change/input events.
     Keyboard: arrows, Home/End, Enter/Space, Escape, type-ahead. */
  const CHEVRON = '<svg class="sel-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const TICK = '<svg class="sel-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  let selCount = 0;

  function initSelects() {
    document.querySelectorAll('select:not([multiple])').forEach((sel) => {
      const uid = sel.id || `sel-${++selCount}`;
      const wrap = document.createElement('div');
      wrap.className = 'sel';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('sel-native');
      sel.tabIndex = -1;
      sel.setAttribute('aria-hidden', 'true');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sel-btn';
      btn.id = `${uid}-btn`;
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', `${uid}-list`);
      btn.innerHTML = `<span class="sel-value"></span>${CHEVRON}`;
      const label = sel.id ? document.querySelector(`label[for="${sel.id}"]`) : null;
      if (label) {
        label.htmlFor = btn.id;
        if (!label.id) label.id = `${uid}-label`;
        btn.setAttribute('aria-labelledby', `${label.id} ${btn.id}`);
      }

      const list = document.createElement('ul');
      list.className = 'sel-list';
      list.id = `${uid}-list`;
      list.setAttribute('role', 'listbox');
      list.tabIndex = -1;
      list.hidden = true;
      if (label) list.setAttribute('aria-labelledby', label.id);
      const opts = Array.from(sel.options);
      list.innerHTML = opts.map((o, i) => `<li role="option" id="${uid}-opt-${i}" data-i="${i}" aria-selected="false"><span>${o.textContent}</span>${TICK}</li>`).join('');
      wrap.append(btn, list);
      const items = Array.from(list.children);
      let active = sel.selectedIndex;

      const paint = () => {
        btn.querySelector('.sel-value').textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
        items.forEach((li, i) => li.setAttribute('aria-selected', String(i === sel.selectedIndex)));
      };
      const highlight = (i) => {
        active = Math.max(0, Math.min(items.length - 1, i));
        items.forEach((li, j) => li.classList.toggle('is-active', j === active));
        btn.setAttribute('aria-activedescendant', items[active].id);
        const li = items[active];
        if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 6;
        else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 6;
      };
      const isOpen = () => !list.hidden;
      const open = () => {
        if (isOpen()) return;
        document.querySelectorAll('.sel.is-open .sel-btn').forEach((b) => b !== btn && b.click());
        list.hidden = false;
        wrap.classList.add('is-open');
        const r = btn.getBoundingClientRect();
        wrap.classList.toggle('is-up', r.bottom + list.offsetHeight + 16 > window.innerHeight && r.top > list.offsetHeight + 16);
        btn.setAttribute('aria-expanded', 'true');
        highlight(sel.selectedIndex);
      };
      const close = () => {
        if (!isOpen()) return;
        list.hidden = true;
        wrap.classList.remove('is-open', 'is-up');
        btn.setAttribute('aria-expanded', 'false');
        btn.removeAttribute('aria-activedescendant');
      };
      const choose = (i) => {
        const changed = sel.selectedIndex !== i;
        sel.selectedIndex = i;
        paint();
        close();
        btn.focus();
        if (changed) {
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };

      btn.addEventListener('click', () => (isOpen() ? close() : open()));
      list.addEventListener('mousedown', (e) => e.preventDefault());
      list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(Number(li.dataset.i)); });
      list.addEventListener('mousemove', (e) => { const li = e.target.closest('li'); if (li && Number(li.dataset.i) !== active) highlight(Number(li.dataset.i)); });
      let typed = ''; let typedAt = 0;
      btn.addEventListener('keydown', (e) => {
        const k = e.key;
        if (!isOpen()) {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); open(); }
          return;
        }
        if (k === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
        else if (k === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
        else if (k === 'Home') { e.preventDefault(); highlight(0); }
        else if (k === 'End') { e.preventDefault(); highlight(items.length - 1); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); }
        else if (k === 'Escape') { e.preventDefault(); close(); }
        else if (k === 'Tab') close();
        else if (k.length === 1) {
          const t = Date.now();
          typed = t - typedAt > 700 ? k.toLowerCase() : typed + k.toLowerCase();
          typedAt = t;
          const hit = opts.findIndex((o) => o.textContent.trim().toLowerCase().startsWith(typed));
          if (hit > -1) highlight(hit);
        }
      });
      document.addEventListener('pointerdown', (e) => { if (isOpen() && !wrap.contains(e.target)) close(); });
      sel.addEventListener('change', paint);
      if (sel.form) sel.form.addEventListener('reset', () => setTimeout(paint, 0));
      paint();
    });
  }

  /* ---------- Open / closed status (Johannesburg time) ----------
     Mon–Fri 8:00–17:00, Sat 8:00–13:00, closed Sunday. */
  const HOURS = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 13] };
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function johannesburgNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }

  function statusText() {
    const { day, minutes } = johannesburgNow();
    const today = HOURS[day];
    if (today && minutes >= today[0] * 60 && minutes < today[1] * 60) {
      return { open: true, text: `Open now · until ${today[1]}:00` };
    }
    if (today && minutes < today[0] * 60) {
      return { open: false, text: `Closed · opens today at ${today[0]}:00` };
    }
    for (let i = 1; i <= 7; i += 1) {
      const d = (day + i) % 7;
      if (HOURS[d]) {
        const when = i === 1 ? 'tomorrow' : DAY_NAMES[d];
        return { open: false, text: `Closed · opens ${when} at ${HOURS[d][0]}:00` };
      }
    }
    return { open: false, text: 'Closed' };
  }

  function initStatus() {
    const pills = document.querySelectorAll('[data-open-status]');
    if (!pills.length) return;
    const update = () => {
      let s;
      try { s = statusText(); } catch (err) { return; }
      pills.forEach((el) => {
        el.classList.toggle('is-open', s.open);
        const label = el.querySelector('[data-status-text]');
        if (label) label.textContent = s.text;
      });
    };
    update();
    setInterval(update, 60 * 1000);
  }

  /* ---------- Headline reveals ----------
     Big headings rise into view word by word. Each word gets a mask
     (.hl-w) and an inner span that slides up (.hl-i); markup inside the
     heading (like the red <em> on the home page) is kept. Screen readers
     get the heading's plain text. Skipped for reduced motion. */
  function initHeadlines() {
    const root = document.documentElement;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const heads = document.querySelectorAll('.hero h1, .page-hero h1, .section-head h2, .fp-copy h2, .cta-band h2');
    if (!heads.length) return;
    heads.forEach((h) => {
      h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
      let n = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span'); w.className = 'hl-w'; w.setAttribute('aria-hidden', 'true');
              const i = document.createElement('span'); i.className = 'hl-i'; i.style.setProperty('--hl', n++);
              i.textContent = part; w.appendChild(i); frag.appendChild(w);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            child.setAttribute('aria-hidden', 'true');
            walk(child);
          }
        });
      };
      walk(h);
    });
    const show = (h) => {
      // wait for the opening intro to finish so the first headline isn't hidden behind it
      if (root.classList.contains('splash-on') || root.classList.contains('wg-splash')) { setTimeout(() => show(h), 150); return; }
      h.classList.add('hl-in');
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    heads.forEach((h) => io.observe(h));
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // Items at the very foot of the page (data-reveal="edge") can never
    // scroll past the -8% margin, so they get a plain observer.
    const edge = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          edge.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    items.forEach((el) => (el.dataset.reveal === 'edge' ? edge : io).observe(el));
  }

  /* ---------- Services page: quick picker → WhatsApp ---------- */
  function initQuickPick() {
    const form = document.getElementById('quick-pick');
    if (!form) return;
    const note = document.getElementById('quick-pick-note');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = form.querySelector('[name="name"]');
      const name = nameEl.value.trim();
      const service = form.querySelector('[name="service"]').value;
      if (!name) {
        note.textContent = 'Add your name so we know who’s messaging.';
        nameEl.focus();
        return;
      }
      note.textContent = 'Opening WhatsApp — we usually reply within the day.';
      window.open(waLink(`Hi, I'm ${name}. I'd like to ask about ${service}.`), '_blank', 'noopener');
    });
  }

  /* ---------- Courses page: bundle calculator ---------- */
  function initBundle() {
    const root = document.getElementById('bundle');
    if (!root) return;

    // Bundle prices and lengths. "months" is the longest length, used for the timeline.
    const BUNDLES = [
      { combo: ['Ai'], price: 2000, duration: '1 month', months: 1 },
      { combo: ['Ai', 'Lr'], price: 2500, duration: '1–2 months', months: 2 },
      { combo: ['Ps', 'Ai'], price: 4500, duration: '2 months', months: 2 },
      { combo: ['Ps', 'Ai', 'Lr'], price: 4500, duration: '3 months', months: 3 },
      { combo: ['Ai', 'Pr'], price: 5000, duration: '2 months', months: 2 },
      { combo: ['Ps', 'Ai', 'Lr', 'Pr'], price: 7500, duration: '4 months', months: 4, tag: 'All four apps' },
    ];
    const NAMES = { Ps: 'Photoshop', Ai: 'Illustrator', Lr: 'Lightroom', Pr: 'Premiere Pro' };
    const ORDER = ['Ps', 'Ai', 'Lr', 'Pr'];
    const ICON = (k, size) => `<img src="assets/icons/${k.toLowerCase()}.svg" alt="" width="${size}" height="${size}">`;
    const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    const WA = '<svg class="i-wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';
    const sort = (list) => ORDER.filter((k) => list.includes(k));
    const nameOf = (list) => (list.length === 4 ? 'All four apps' : sort(list).map((k) => NAMES[k]).join(' + '));
    const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
    const money = (n) => `R${n}`;

    const boxes = Array.from(root.querySelectorAll('input[type="checkbox"]'));
    const out = document.getElementById('bundle-out');
    const list = document.getElementById('bundle-list');
    const picked = () => boxes.filter((b) => b.checked).map((b) => b.value);
    const setPicked = (combo) => { boxes.forEach((b) => { b.checked = combo.includes(b.value); }); update(); };

    // Month-by-month length bar (the course runs up to 4 months).
    const timeline = (b) => `<div class="bb-months" aria-hidden="true">${[1, 2, 3, 4].map((m) => `<i class="${m <= b.months ? 'is-on' : ''}"></i>`).join('')}</div>`;

    let shown = 0;
    function countTo(el, target) {
      const from = shown; shown = target;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === target) { el.textContent = money(target); return; }
      const t0 = performance.now(); const dur = 520;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
        el.textContent = money(Math.round((from + (target - from) * e) / 10) * 10);
        if (k < 1) requestAnimationFrame(step); else el.textContent = money(target);
      };
      requestAnimationFrame(step);
    }

    function update() {
      const p = picked();
      if (!p.length) {
        shown = 0;
        out.dataset.state = 'empty';
        out.innerHTML = `
          <div class="bb-empty">
            <div class="bb-ghosts" aria-hidden="true">${ORDER.map((k) => ICON(k, 44)).join('')}</div>
            <p class="bb-empty-t">Pick one or more apps</p>
            <p>Courses start from <b>${money(Math.min(...BUNDLES.map((b) => b.price)))}</b> for one app over a month.</p>
          </div>`;
      } else {
        const found = BUNDLES.find((b) => sameSet(b.combo, p));
        if (found) {
          out.dataset.state = 'match';
          const names = nameOf(found.combo);
          out.innerHTML = `
            <div class="bb-sum">
              <div class="bb-sum-top"><div class="bb-stack">${sort(found.combo).map((k) => ICON(k, 44)).join('')}</div><span class="bb-badge">${CHECK}Bundle available</span></div>
              <p class="bb-sum-name">${names}</p>
              <p class="bb-price"><span id="bundle-amount">${money(shown || found.price)}</span><small>once-off</small></p>
              <div class="bb-len"><span>Course length</span><b>${found.duration}</b></div>
              ${timeline(found)}
              <ul class="bb-incl">${sort(found.combo).map((k) => `<li>${CHECK}${NAMES[k]}</li>`).join('')}</ul>
              <a class="btn btn--primary bb-cta" target="_blank" rel="noopener" href="${waLink(`Hi, I'd like to enrol in the ${names} course bundle (${money(found.price)}, ${found.duration}).`)}">${WA}Enrol on WhatsApp</a>
            </div>`;
          countTo(out.querySelector('#bundle-amount'), found.price);
        } else {
          out.dataset.state = 'suggest';
          shown = 0;
          const names = nameOf(p);
          const covers = BUNDLES.filter((b) => p.every((k) => b.combo.includes(k))).sort((a, b) => a.price - b.price)[0];
          out.innerHTML = `
            <div class="bb-sum">
              <p class="bb-sum-kicker">${names}</p>
              <p class="bb-sum-name">${p.length === 1 ? `${NAMES[p[0]]} isn’t offered on its own yet.` : 'This exact mix isn’t a set bundle yet.'}</p>
              ${covers ? `
              <div class="bb-suggest">
                <span class="bb-suggest-k">Closest bundle that includes it</span>
                <div class="bb-suggest-row"><div class="bb-stack bb-stack--sm">${sort(covers.combo).map((k) => ICON(k, 32)).join('')}</div><div><b>${nameOf(covers.combo)}</b><small>${covers.duration}</small></div><strong>${money(covers.price)}</strong></div>
                <button type="button" class="btn btn--primary bb-switch" data-combo="${covers.combo.join(',')}">Switch to this bundle</button>
              </div>` : ''}
              <a class="text-link bb-quote" target="_blank" rel="noopener" href="${waLink(`Hi, I'd like a quote for a custom course bundle: ${names}.`)}">Or ask us for a custom quote<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            </div>`;
        }
      }
      list.querySelectorAll('.bb-card').forEach((c) => {
        const on = sameSet(c.dataset.combo.split(','), p);
        c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on));
      });
    }

    list.innerHTML = BUNDLES.map((b) => `
      <button type="button" class="bb-card" data-combo="${b.combo.join(',')}" aria-pressed="false">
        <span class="bb-card-top"><span class="bb-stack bb-stack--sm">${sort(b.combo).map((k) => ICON(k, 34)).join('')}</span>${b.tag ? `<span class="bb-card-tag">${b.tag}</span>` : ''}</span>
        <span class="bb-card-name">${nameOf(b.combo)}</span>
        <span class="bb-card-foot"><span class="bb-card-len">${b.duration}</span><span class="bb-card-price">${money(b.price)}</span></span>
        <span class="bb-card-on">${CHECK}Selected</span>
      </button>`).join('');

    list.addEventListener('click', (e) => {
      const c = e.target.closest('.bb-card'); if (!c) return;
      setPicked(c.dataset.combo.split(','));
      if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    out.addEventListener('click', (e) => { const b = e.target.closest('.bb-switch'); if (b) setPicked(b.dataset.combo.split(',')); });
    boxes.forEach((b) => b.addEventListener('change', update));
    update();
  }

  /* ---------- Popups ----------
     Two quiet, helpful popups, both in the mist grey .wg-pop style:
     • Fingerprint nudge: after someone scrolls past the fingerprint
       section (home / services), a small card suggests the driver checker.
       Once per visit.
     • Package details: every pricing card gets a "How it works & details"
       button that opens a dialog with what's included, the steps and an
       Enquire on WhatsApp button. Esc, the ✕, the backdrop or "Back" close it. */
  const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function initFingerprintNudge() {
    const target = document.querySelector('.fp-section, #fingerprint');
    if (!target || !('IntersectionObserver' in window)) return;
    const KEY = 'wg-nudge-fp';
    try { if (sessionStorage.getItem(KEY)) return; } catch (err) { /* storage blocked */ }
    const card = document.createElement('aside');
    card.className = 'wg-pop wg-nudge';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Driver checker');
    card.innerHTML = `
      <button type="button" class="wg-x" aria-label="Close">${CLOSE_SVG}</button>
      <div class="wg-nudge-top"><span class="wg-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11.5 11 13.5l4-4"/><rect x="4" y="3" width="16" height="18" rx="3"/></svg></span><b>Coming in for fingerprints?</b></div>
      <p>Check you’ve got everything in 30 seconds — no wasted trip.</p>
      <div class="wg-nudge-row"><a class="wg-btn" href="driver-checker.html">Check now</a><button type="button" class="wg-later">Maybe later</button></div>`;
    const hide = () => { card.classList.remove('is-in'); setTimeout(() => card.remove(), 300); };
    card.querySelector('.wg-x').addEventListener('click', hide);
    card.querySelector('.wg-later').addEventListener('click', hide);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && card.isConnected) hide(); });
    let seen = false; let shown = false;
    const show = () => {
      if (shown) return;
      if (document.documentElement.classList.contains('splash-on')) { setTimeout(show, 400); return; }
      shown = true;
      try { sessionStorage.setItem(KEY, '1'); } catch (err) { /* storage blocked */ }
      document.body.appendChild(card);
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-in')));
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) seen = true;
        else if (seen && e.boundingClientRect.top < 0) { io.disconnect(); setTimeout(show, 400); }
      });
    });
    io.observe(target);
  }

  function initPackageDetails() {
    const cards = document.querySelectorAll('.price-panel .price-card');
    if (!cards.length || !window.HTMLDialogElement) return;
    const STEPS = {
      design: ['Quick chat about what you need', 'We design and send you the first drafts', 'Changes until you’re happy', 'Your final files handed over'],
      web: ['Chat about your business and the pages you need', 'We design your site and share a preview', 'Changes, then we launch it', 'Support after launch'],
    };
    const dlg = document.createElement('dialog');
    dlg.className = 'wg-pop wg-modal';
    dlg.setAttribute('aria-labelledby', 'pd-title');
    dlg.innerHTML = `
      <button type="button" class="wg-x" aria-label="Close">${CLOSE_SVG}</button>
      <span class="wg-k" id="pd-kicker"></span>
      <h2 id="pd-title"></h2>
      <p class="wg-blurb" id="pd-blurb"></p>
      <p class="wg-price"><b id="pd-price"></b><span id="pd-per"></span></p>
      <div class="wg-cols">
        <div><p class="wg-h">What’s included</p><ul class="wg-feats" id="pd-feats"></ul></div>
        <div><p class="wg-h">How it works</p><ol class="wg-steps" id="pd-steps"></ol></div>
      </div>
      <div class="wg-actions"><a class="wg-btn wg-btn--lg" id="pd-cta" target="_blank" rel="noopener"><svg class="i-wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>Enquire on WhatsApp</a><button type="button" class="wg-later" id="pd-back">Back to packages</button></div>`;
    document.body.appendChild(dlg);
    const $d = (id) => dlg.querySelector(`#${id}`);
    const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    let opener = null;
    const close = () => { if (dlg.open) dlg.close(); };
    dlg.addEventListener('close', () => { document.documentElement.classList.remove('wg-lock'); if (opener) opener.focus({ preventScroll: true }); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    $d('pd-back').addEventListener('click', close);
    dlg.querySelector('.wg-x').addEventListener('click', close);

    cards.forEach((card) => {
      const panel = card.closest('.price-panel');
      const kind = panel && panel.id === 'web' ? 'web' : 'design';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'text-link price-more';
      btn.innerHTML = 'How it works &amp; details<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
      btn.setAttribute('aria-haspopup', 'dialog');
      card.appendChild(btn);
      btn.addEventListener('click', () => {
        const q = (sel) => card.querySelector(sel);
        $d('pd-kicker').textContent = `${kind === 'web' ? 'Web design & development' : 'Graphic design'} · package`;
        $d('pd-title').textContent = q('h3').textContent;
        $d('pd-blurb').textContent = q('.price-blurb') ? q('.price-blurb').textContent : '';
        $d('pd-price').textContent = q('.price-amount b') ? q('.price-amount b').textContent : '';
        $d('pd-per').textContent = q('.price-amount span') ? q('.price-amount span').textContent : '';
        $d('pd-feats').innerHTML = Array.from(card.querySelectorAll('.price-feats li')).map((li) => `<li>${TICK}<span>${li.textContent.trim()}</span></li>`).join('');
        $d('pd-steps').innerHTML = STEPS[kind].map((t, i) => `<li><span>${i + 1}</span>${t}</li>`).join('');
        const go = q('.btn');
        $d('pd-cta').href = go ? go.href : 'https://wa.me/27787347867';
        opener = btn;
        document.documentElement.classList.add('wg-lock');
        dlg.showModal();
        $d('pd-cta').focus({ preventScroll: true });
      });
    });
  }

  /* ---------- Pricing: category tabs ----------
     Shows one category at a time; #design / #web in the link opens that tab. */
  function initPricingTabs() {
    const tabs = Array.from(document.querySelectorAll('.price-tabs [role="tab"]'));
    if (!tabs.length) return;
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => {
        select(t);
        history.replaceState(null, '', '#' + t.getAttribute('aria-controls'));
      });
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next, true);
      });
    });
    const fromHash = () => tabs.find((t) => '#' + t.getAttribute('aria-controls') === location.hash);
    select(fromHash() || tabs[0]);
    window.addEventListener('hashchange', () => { const t = fromHash(); if (t) select(t); });
  }

  /* ---------- FAQ: live filter ---------- */
  function initFaqFilter() {
    const input = document.getElementById('faq-filter');
    if (!input) return;
    const items = Array.from(document.querySelectorAll('.faq-item'));
    const groups = Array.from(document.querySelectorAll('.faq-group'));
    const empty = document.getElementById('faq-empty');

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      items.forEach((item) => {
        const hit = !q || item.textContent.toLowerCase().includes(q);
        item.hidden = !hit;
        if (q && hit) item.open = true;
        if (!q) item.open = false;
      });
      groups.forEach((g) => { g.hidden = !g.querySelector('.faq-item:not([hidden])'); });
      empty.hidden = items.some((i) => !i.hidden);
    });
  }

  /* ---------- Contact form → WhatsApp ---------- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const rules = {
      name: [(v) => v.length >= 2, 'Please enter your full name.'],
      age: [(v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 120, 'Enter a valid age (1–120).'],
      email: [(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.'],
      phone: [(v) => /^(\+27|0)[1-8][0-9]{8}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid South African number, e.g. 078 734 7867.'],
      address: [(v) => v.length >= 5, 'Please enter your address.'],
    };
    const success = document.getElementById('form-success');

    const setError = (name, message) => {
      const input = form.elements[name];
      const field = input.closest('.field');
      const err = field.querySelector('.error');
      field.classList.toggle('has-error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (err) err.textContent = message || '';
    };

    Object.keys(rules).forEach((name) => {
      form.elements[name].addEventListener('input', () => setError(name, ''));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      success.hidden = true;
      let firstBad = null;
      Object.entries(rules).forEach(([name, [check, message]]) => {
        const ok = check(form.elements[name].value.trim());
        setError(name, ok ? '' : message);
        if (!ok && !firstBad) firstBad = form.elements[name];
      });
      if (firstBad) { firstBad.focus(); return; }

      const v = (name) => form.elements[name].value.trim();
      const lines = [
        "Hi Web Graphs Technologies, I'd like to get in touch.",
        `Name: ${v('name')}`,
        `Age: ${v('age')}`,
        `Email: ${v('email')}`,
        `Phone: ${v('phone')}`,
        `Address: ${v('address')}`,
        `Service: ${v('service')}`,
      ];
      if (v('message')) lines.push(`Message: ${v('message')}`);

      window.open(waLink(lines.join('\n')), '_blank', 'noopener');
      success.hidden = false;
      form.reset();
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    initSplash();
    initThemeSwitch();
    initSelects();
    initNavMenus();
    initHeader();
    initStatus();
    initHeadlines();
    initReveal();
    initQuickPick();
    initBundle();
    initPricingTabs();
    initPackageDetails();
    initFingerprintNudge();
    initFaqFilter();
    initContactForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
