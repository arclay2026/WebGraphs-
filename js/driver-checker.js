/* =====================================================================
   WEB GRAPHS — UBER & BOLT DRIVER CHECKER
   Walks a driver through what to bring for fingerprint capture, checks
   the proof-of-residence date (not older than 3 months), shows the next
   open days, and builds a WhatsApp message with their checklist.
   Loaded before site.js so the date dropdowns exist when site.js turns
   every <select> into a custom dropdown. Answers are kept in localStorage.
   ===================================================================== */
(function () {
  'use strict';

  const form = document.getElementById('dc-form');
  if (!form) return;

  const KEY = 'wg-driver-check';
  const WA = '27787347867';
  const HOURS = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 13] };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- dates (Johannesburg time) ---------- */
  function jhbNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    return { date: new Date(get('year'), get('month') - 1, get('day'), 12), minutes: get('hour') * 60 + get('minute') };
  }
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const addMonths = (d, n) => {
    const y = d.getFullYear(); const m = d.getMonth() + n;
    const target = new Date(y, m, 1, 12);
    target.setDate(Math.min(d.getDate(), daysIn(target.getFullYear(), target.getMonth())));
    return target;
  };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmt = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const fmtShort = (d) => `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  const dayDiff = (a, b) => Math.round((a - b) / 86400000);

  const now = jhbNow();
  const today = now.date;

  /* ---------- build the date dropdowns and the visit days ---------- */
  const porDay = $('#dc-por-day');
  const porMonth = $('#dc-por-month');
  porDay.innerHTML = '<option value="">Day</option>' + Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  let monthOpts = '<option value="">Month</option>';
  for (let i = 0; i < 6; i += 1) {
    const d = addMonths(new Date(today.getFullYear(), today.getMonth(), 1, 12), -i);
    monthOpts += `<option value="${d.getFullYear()}-${d.getMonth()}">${MONTHS[d.getMonth()]} ${d.getFullYear()}</option>`;
  }
  porMonth.innerHTML = monthOpts + '<option value="old">Before that</option>';

  const daysWrap = $('#dc-days');
  let html = '';
  for (let i = 0, shown = 0; shown < 6 && i < 10; i += 1) {
    const d = addDays(today, i);
    const h = HOURS[d.getDay()];
    if (!h) continue;
    const closedToday = i === 0 && now.minutes >= h[1] * 60;
    const name = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAYS[d.getDay()];
    html += `<label class="dc-day"><input type="radio" name="day" value="${iso(d)}"${closedToday ? ' disabled' : ''}><span><b>${name}</b><small>${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}</small><small class="dc-day-h">${closedToday ? 'Closed now' : `${h[0]}:00–${h[1]}:00`}</small></span></label>`;
    shown += 1;
  }
  daysWrap.innerHTML = html;

  /* ---------- restore saved answers ---------- */
  const FIELDS = ['platform', 'idType', 'passportValid', 'por', 'porDay', 'porMonth', 'licence', 'money', 'day', 'name'];
  const read = () => {
    const f = new FormData(form);
    return {
      platform: f.get('platform') || '',
      idType: f.get('idType') || '',
      passportValid: $('#dc-passport-ok').checked,
      por: f.get('por') || '',
      porDay: porDay.value,
      porMonth: porMonth.value,
      licence: f.get('licence') || '',
      money: $('#dc-money').checked,
      day: f.get('day') || '',
      name: $('#dc-name').value.trim(),
    };
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    FIELDS.forEach((k) => {
      const v = saved[k];
      if (v === undefined || v === '' || v === false) return;
      if (k === 'passportValid') $('#dc-passport-ok').checked = !!v;
      else if (k === 'money') $('#dc-money').checked = !!v;
      else if (k === 'porDay') porDay.value = v;
      else if (k === 'porMonth') porMonth.value = v;
      else if (k === 'name') $('#dc-name').value = v;
      else {
        const r = form.querySelector(`input[name="${k}"][value="${CSS.escape(v)}"]:not(:disabled)`);
        if (r) r.checked = true;
      }
    });
  } catch (err) { /* storage blocked or bad data */ }

  /* ---------- checks ---------- */
  function checkId(s) {
    const names = { smart: 'Smart ID card', book: 'Green ID book', passport: 'Passport' };
    if (!s.idType) return { state: 'todo', text: 'Choose the ID you’ll bring' };
    if (s.idType === 'none') return { state: 'bad', text: 'You need an ID or valid passport' };
    if (s.idType === 'passport' && !s.passportValid) return { state: 'todo', text: 'Confirm your passport hasn’t expired' };
    return { state: 'ok', text: `${names[s.idType]} — the original`, label: names[s.idType] };
  }
  function checkPor(s) {
    const names = { utility: 'Utility bill', bank: 'Bank statement', affidavit: 'Affidavit' };
    if (!s.por) return { state: 'todo', text: 'Choose your proof of residence' };
    if (s.por === 'none') return { state: 'bad', text: 'Get a bill, bank statement or affidavit' };
    const name = names[s.por];
    if (s.porMonth === 'old') return { state: 'bad', text: `${name} is older than 3 months`, note: 'bad', msg: `This one is too old. You need a ${name.toLowerCase()} dated ${fmt(addMonths(today, -3))} or later.` };
    if (!s.porDay || !s.porMonth) return { state: 'todo', text: `${name} — add the date on it`, label: name };
    const [y, m] = s.porMonth.split('-').map(Number);
    if (Number(s.porDay) > daysIn(y, m)) return { state: 'todo', text: 'Check the date', note: 'bad', msg: `${MONTHS[m]} only has ${daysIn(y, m)} days — check the date on the document.` };
    const dated = new Date(y, m, Number(s.porDay), 12);
    if (dated > today) return { state: 'todo', text: 'Check the date', note: 'bad', msg: 'That date is in the future — check the date on the document.' };
    const until = addMonths(dated, 3);
    if (until < today) {
      return { state: 'bad', text: `${name} is older than 3 months`, note: 'bad', msg: `Dated ${fmt(dated)}, so it’s too old. You need one dated ${fmt(addMonths(today, -3))} or later.` };
    }
    const left = dayDiff(until, today);
    const age = dayDiff(today, dated);
    return {
      state: 'ok', text: `${name} dated ${fmt(dated)}`, label: `${name} dated ${fmt(dated)}`, note: left <= 14 ? 'warn' : 'ok',
      msg: left <= 14
        ? `Valid, but only until ${fmt(until)} — come in before then${left === 0 ? ' (that’s today)' : ''}.`
        : `Valid — it’s ${age === 0 ? 'from today' : age === 1 ? '1 day old' : `${age} days old`} and stays valid until ${fmt(until)}.`,
    };
  }

  /* ---------- render ---------- */
  const ICON = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    todo: '',
    opt: '',
  };
  const ring = $('#dc-ring');
  const CIRC = 2 * Math.PI * 26;
  ring.style.strokeDasharray = `${CIRC}`;

  function update(save) {
    const s = read();
    const id = checkId(s);
    const por = checkPor(s);
    const money = s.money ? { state: 'ok', text: 'R350 for the capture' } : { state: 'todo', text: 'Bring R350 for the capture' };
    const lic = { licence: 'Driver’s licence', both: 'Driver’s licence and PrDP' }[s.licence];

    // inline notes inside the steps
    $('#dc-passport').hidden = s.idType !== 'passport';
    $('#dc-id-none').hidden = s.idType !== 'none';
    $('#dc-id-ok').hidden = !['smart', 'book'].includes(s.idType) && !(s.idType === 'passport' && s.passportValid);
    $('#dc-por-date').hidden = !s.por || s.por === 'none';
    $('#dc-por-none').hidden = s.por !== 'none';
    $('#dc-affidavit').hidden = s.por !== 'affidavit';
    const pn = $('#dc-por-note');
    pn.hidden = !por.msg;
    if (por.msg) { pn.className = `dc-note is-${por.note}`; pn.textContent = por.msg; }
    $('#dc-lic-note').hidden = !s.licence;
    $('#dc-lic-note').textContent = s.licence === 'none'
      ? 'No problem — you don’t need it for the fingerprint capture. You’ll need it later when you register on the app.'
      : 'Great — bring it along. It’s not needed for the capture, but it speeds up your registration on the app.';

    // step completion ticks
    const done = {
      platform: !!s.platform, id: id.state === 'ok', por: por.state === 'ok', licence: !!s.licence, visit: !!s.day && s.money,
    };
    $$('.dc-step').forEach((el) => el.classList.toggle('is-done', !!done[el.dataset.step]));

    // summary
    const required = [id, por, money];
    const ok = required.filter((r) => r.state === 'ok').length;
    const bad = required.some((r) => r.state === 'bad');
    ring.style.strokeDashoffset = `${CIRC * (1 - ok / required.length)}`;
    $('#dc-count').textContent = `${ok}/${required.length}`;
    const card = $('#dc-card');
    card.dataset.state = ok === required.length ? 'ready' : bad ? 'blocked' : 'pending';
    $('#dc-title').textContent = ok === required.length ? 'You’re ready to walk in' : bad ? 'Not quite ready yet' : ok === 0 ? 'Let’s get you ready' : 'Almost there';
    const missing = required.length - ok;
    $('#dc-sub').textContent = ok === required.length
      ? 'Bring everything below — no appointment needed.'
      : bad ? 'Sort out the items marked in red before you come in.'
      : `${missing} thing${missing === 1 ? '' : 's'} left to check.`;

    const items = [
      { title: 'ID or passport', ...id },
      { title: 'Proof of residence', ...por },
      { title: 'Payment', ...money },
      { title: 'Licence / PrDP', state: s.licence && s.licence !== 'none' ? 'ok' : 'opt', text: lic || 'Optional — speeds up registration' },
    ];
    $('#dc-list').innerHTML = items.map((it) => `<li class="dc-item is-${it.state}"><span class="dc-ic">${ICON[it.state]}</span><span class="dc-item-t"><b>${it.title}</b><small>${it.text}</small></span>${it.state === 'opt' ? '<span class="dc-tag">Optional</span>' : ''}</li>`).join('');

    let when = 'Any day we’re open — Mon–Fri 8:00–17:00, Sat 8:00–13:00';
    if (s.day) {
      const d = new Date(`${s.day}T12:00:00`);
      const h = HOURS[d.getDay()];
      when = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${h[0]}:00–${h[1]}:00`;
    }
    $('#dc-when').textContent = when;

    // WhatsApp message
    const mark = (st) => (st === 'ok' ? '✅' : st === 'bad' ? '❌' : '⬜');
    const lines = [
      `Hi Web Graphs, I’d like to come in for my ${s.platform === 'Both' ? 'Uber & Bolt' : s.platform || 'Uber/Bolt'} fingerprint capture.`,
      s.name ? `Name: ${s.name}` : '',
      s.day ? `Planning to come: ${fmtShort(new Date(`${s.day}T12:00:00`))}` : '',
      '',
      'My checklist:',
      `${mark(id.state)} ID: ${id.label || id.text}`,
      `${mark(por.state)} Proof of residence: ${por.label || por.text}`,
      `${s.licence && s.licence !== 'none' ? '✅' : '⬜'} Licence / PrDP: ${lic || 'not yet'}`,
      `${mark(money.state)} R350 for the capture`,
    ].filter((l, i) => l !== '' || i === 3);
    $('#dc-wa').href = `https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`;
    $('#dc-wa-label').textContent = ok === required.length ? 'Tell us you’re coming' : 'Ask us on WhatsApp';

    if (save) {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (err) { /* storage blocked */ }
    }
  }

  form.addEventListener('input', () => update(true));
  form.addEventListener('change', () => update(true));
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#dc-print').addEventListener('click', () => window.print());
  $('#dc-reset').addEventListener('click', () => {
    form.reset();
    try { localStorage.removeItem(KEY); } catch (err) { /* storage blocked */ }
    setTimeout(() => { update(false); form.querySelector('.dc-step').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
  });
  update(false);
})();
