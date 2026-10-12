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

  /* ---------- Light / dark theme toggle ----------
     No saved choice = follow the device. Clicking flips to the opposite of
     what is showing now and remembers it. */
  function initThemeToggle() {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const current = () => root.getAttribute('data-wg-theme') || (mq.matches ? 'dark' : 'light');
    const label = () => btn.setAttribute('aria-label', current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-wg-theme', next);
      try { localStorage.setItem('wg-theme', next); } catch (err) { /* storage blocked */ }
      try { sessionStorage.setItem('wg-theme', next); } catch (err) { /* storage blocked */ }
      label();
    });
    mq.addEventListener('change', label);
    label();
  }

  /* ---------- Logo intro ----------
     The <head> script adds .logo-intro on the first page of a visit. Remove
     it once the intro has played so hovering the logo doesn't replay it. */
  /* ---------- Opening splash ----------
     Once per visit: the red W is traced in light and fills, rings ripple
     out, the wordmark wipes in, then the navy curtain lifts and the logo
     flies into its place in the header. Click, tap or any key speeds it up. */
  function initSplash() {
    const root = document.documentElement;
    if (!root.classList.contains('wg-splash')) return;
    const headLogo = document.querySelector('.site-header .logo');
    const mark = headLogo && headLogo.querySelector('.logo-mark');
    const word = headLogo && headLogo.querySelector('.logo-word');
    if (!mark || !word || !Element.prototype.animate) { root.classList.remove('wg-splash'); return; }

    const vb = headLogo.getAttribute('viewBox');
    const el = document.createElement('div');
    el.className = 'splash';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="splash-bg"></div>
      <div class="splash-edge"></div>
      <div class="splash-stage">
        <div class="splash-beam"></div>
        <div class="splash-lockup">
          <div class="splash-glow"></div>
          <div class="splash-ring"></div><div class="splash-ring"></div><div class="splash-ring"></div>
          <svg viewBox="${vb}"><path class="splash-mark" d="${mark.getAttribute('d')}"/><path class="splash-mark-line" d="${mark.getAttribute('d')}"/></svg>
          <div class="splash-word-wrap"><svg viewBox="${vb}"><path class="splash-word" d="${word.getAttribute('d')}"/></svg></div>
          <p class="splash-tag">Technologies</p>
        </div>
      </div>
      <button type="button" class="splash-skip" tabindex="-1">Skip intro</button>`;
    document.body.appendChild(el);
    root.classList.add('splash-on');
    root.classList.remove('wg-splash');

    const $s = (q) => el.querySelector(q);
    const lockup = $s('.splash-lockup');
    const line = $s('.splash-mark-line');
    const len = line.getTotalLength();
    const out = 'cubic-bezier(.16, 1, .3, 1)';
    const inOut = 'cubic-bezier(.76, 0, .24, 1)';
    const anims = [];
    const play = (node, frames, opts) => { const a = node.animate(frames, { fill: 'both', ...opts }); anims.push(a); return a; };

    // 1. trace the W in light, then fill it
    line.style.strokeDasharray = `${len}`;
    play(line, [{ strokeDashoffset: len, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 950, easing: 'cubic-bezier(.65, 0, .35, 1)' });
    play(line, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 950 });
    play($s('.splash-mark'), [
      { opacity: 0, transform: 'scale(.94)' },
      { opacity: 1, transform: 'scale(1.03)', offset: 0.6 },
      { opacity: 1, transform: 'none' },
    ], { duration: 650, delay: 700, easing: out });
    $s('.splash-mark').style.transformBox = 'fill-box';
    $s('.splash-mark').style.transformOrigin = '50% 50%';
    // 2. glow and ripples
    play($s('.splash-glow'), [{ opacity: 0, scale: 0.5 }, { opacity: 0.9, scale: 1.1, offset: 0.35 }, { opacity: 0.35, scale: 1.35 }], { duration: 1300, delay: 800, easing: out });
    el.querySelectorAll('.splash-ring').forEach((r, i) => {
      play(r, [{ opacity: 0, scale: 0.4 }, { opacity: 0.8, scale: 0.55, offset: 0.06 }, { opacity: 0, scale: 3.4 }], { duration: 1400, delay: 900 + i * 160, easing: 'cubic-bezier(.2, .6, .3, 1)' });
    });
    play($s('.splash-beam'), [
      { opacity: 0, transform: 'scaleX(0)' },
      { opacity: 1, transform: 'scaleX(1)', offset: 0.45 },
      { opacity: 0, transform: 'scaleX(1.1)' },
    ], { duration: 900, delay: 720, easing: out });
    // 3. the wordmark wipes in from behind the W
    play($s('.splash-word-wrap'), [{ clipPath: 'inset(-20% 71% -20% 29%)' }, { clipPath: 'inset(-20% -2% -20% 29%)' }], { duration: 700, delay: 1050, easing: out });
    play($s('.splash-word-wrap svg'), [{ transform: 'translateX(-6%)', filter: 'blur(6px)' }, { transform: 'none', filter: 'blur(0)' }], { duration: 750, delay: 1050, easing: out });
    play($s('.splash-tag'), [{ opacity: 0, letterSpacing: '1.1em', textIndent: '1.1em' }, { opacity: 1, letterSpacing: '.5em', textIndent: '.5em' }], { duration: 800, delay: 1300, easing: out });
    play($s('.splash-skip'), [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 600 });

    // 4. curtain lifts, logo flies to the header
    const T = 1950;
    const from = lockup.getBoundingClientRect();
    const to = headLogo.getBoundingClientRect();
    const k = to.width / from.width;
    const fly = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${k})`;
    play(lockup, [{ transform: 'none' }, { transform: fly }], { duration: 850, delay: T, easing: inOut });
    play($s('.splash-word'), [{ fill: '#ffffff' }, { fill: getComputedStyle(word).fill }], { duration: 850, delay: T, easing: inOut });
    if (getComputedStyle(word).display === 'none') play($s('.splash-word-wrap'), [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: T, composite: 'replace' });
    play($s('.splash-tag'), [{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: T, fill: 'forwards' });
    play($s('.splash-skip'), [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: T, fill: 'forwards' });
    play($s('.splash-glow'), [{ opacity: 0.35 }, { opacity: 0 }], { duration: 300, delay: T, fill: 'forwards' });
    play($s('.splash-bg'), [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 900, delay: T + 60, easing: inOut });
    play($s('.splash-edge'), [
      { transform: `translateY(${window.innerHeight}px)`, opacity: 0 },
      { opacity: 1, offset: 0.04 },
      { transform: 'translateY(0)', opacity: 1, offset: 0.92 },
      { transform: 'translateY(0)', opacity: 0 },
    ], { duration: 980, delay: T + 60, easing: inOut });
    const main = document.querySelector('main');
    if (main) play(main, [{ transform: 'translateY(60px) scale(.985)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 1100, delay: T + 120, easing: out, fill: 'backwards' });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.classList.remove('splash-on');
      el.remove();
      anims.forEach((a) => { if (a.effect && a.effect.target === main) a.cancel(); });
      removeEventListener('keydown', hurry, true);
    };
    const hurry = () => anims.forEach((a) => a.updatePlaybackRate(5));
    Promise.all(anims.map((a) => a.finished)).then(finish, finish);
    setTimeout(finish, 6000);
    el.addEventListener('pointerdown', hurry);
    el.addEventListener('wheel', hurry, { passive: true });
    addEventListener('keydown', hurry, true);
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
    items.forEach((el) => io.observe(el));
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

    const BUNDLES = [
      { combo: ['Ai'], price: 2000, duration: '1 month' },
      { combo: ['Ai', 'Lr'], price: 2500, duration: '1/2 months' },
      { combo: ['Ps', 'Ai'], price: 4500, duration: '2 months' },
      { combo: ['Ps', 'Ai', 'Lr'], price: 4500, duration: '3 months' },
      { combo: ['Ai', 'Pr'], price: 5000, duration: '2 months' },
      { combo: ['Ps', 'Ai', 'Lr', 'Pr'], price: 7500, duration: '4 months' },
    ];
    const NAMES = { Ps: 'Photoshop', Ai: 'Illustrator', Lr: 'Lightroom', Pr: 'Premiere Pro' };
    const ORDER = ['Ps', 'Ai', 'Lr', 'Pr'];

    const boxes = Array.from(root.querySelectorAll('input[type="checkbox"]'));
    const empty = document.getElementById('bundle-empty');
    const match = document.getElementById('bundle-match');
    const nomatch = document.getElementById('bundle-nomatch');
    const amount = document.getElementById('bundle-amount');
    const duration = document.getElementById('bundle-duration');
    const combo = document.getElementById('bundle-combo');
    const enroll = document.getElementById('bundle-enroll');
    const custom = document.getElementById('bundle-custom');

    const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));

    function update() {
      const picked = boxes.filter((b) => b.checked).map((b) => b.value);
      empty.hidden = picked.length > 0;
      if (!picked.length) { match.hidden = true; nomatch.hidden = true; return; }

      const names = ORDER.filter((k) => picked.includes(k)).map((k) => NAMES[k]).join(' + ');
      const found = BUNDLES.find((b) => sameSet(b.combo, picked));
      match.hidden = !found;
      nomatch.hidden = Boolean(found);

      if (found) {
        amount.textContent = `R${found.price}`;
        duration.textContent = found.duration;
        combo.textContent = names;
        enroll.href = waLink(`Hi, I'd like to enroll in the ${names} course bundle (R${found.price}).`);
      } else {
        custom.href = waLink(`Hi, I'd like a quote for a custom course bundle: ${names}.`);
      }
    }

    boxes.forEach((b) => b.addEventListener('change', update));
    update();
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
    initThemeToggle();
    initSelects();
    initNavMenus();
    initHeader();
    initStatus();
    initReveal();
    initQuickPick();
    initBundle();
    initPricingTabs();
    initFaqFilter();
    initContactForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
