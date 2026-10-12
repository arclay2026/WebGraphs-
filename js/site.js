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
    const current = () => root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
    const label = () => btn.setAttribute('aria-label', current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('wg-theme', next); } catch (err) { /* storage blocked */ }
      label();
    });
    mq.addEventListener('change', label);
    label();
  }

  /* ---------- Logo intro ----------
     The <head> script adds .logo-intro on the first page of a visit. Remove
     it once the intro has played so hovering the logo doesn't replay it. */
  function initLogoIntro() {
    const root = document.documentElement;
    if (root.classList.contains('logo-intro')) setTimeout(() => root.classList.remove('logo-intro'), 1400);
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
    initLogoIntro();
    initThemeToggle();
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
