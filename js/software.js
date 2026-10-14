/* Software & drivers page: category filter, search, and an install list
   that is sent to the studio as a WhatsApp message. The list is kept for
   the visit (sessionStorage) so it survives moving between pages. */
(function () {
  const grid = document.getElementById('sw-grid');
  if (!grid) return;
  const apps = Array.from(grid.querySelectorAll('.sw-app'));
  const chips = Array.from(document.querySelectorAll('.sw-chip'));
  const q = document.getElementById('sw-q');
  const empty = document.getElementById('sw-empty');
  const tray = document.getElementById('sw-tray');
  const count = document.getElementById('sw-count');
  const send = document.getElementById('sw-send');
  const KEY = 'wg-sw-list';
  let filter = 'all';

  const nameOf = (li) => li.querySelector('.sw-app-txt b').textContent;

  function applyFilter() {
    const term = q.value.trim().toLowerCase();
    let shown = 0;
    apps.forEach((li) => {
      const ok = (filter === 'all' || li.dataset.cat === filter) && (!term || li.dataset.name.includes(term));
      li.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
  }

  chips.forEach((chip) => chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    applyFilter();
  }));
  q.addEventListener('input', applyFilter);

  function picked() { return apps.filter((li) => li.classList.contains('is-picked')); }

  function update() {
    const list = picked().map(nameOf);
    count.textContent = list.length + (list.length === 1 ? ' app' : ' apps');
    tray.hidden = list.length === 0;
    document.body.classList.toggle('has-tray', list.length > 0);
    const msg = 'Hi Web Graphs, please install the following on my computer:\n' + list.map((n) => '• ' + n).join('\n');
    send.href = 'https://wa.me/27787347867?text=' + encodeURIComponent(msg);
    try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
  }

  function setPicked(li, on) {
    li.classList.toggle('is-picked', on);
    li.querySelector('.sw-add').setAttribute('aria-pressed', String(on));
  }

  apps.forEach((li) => li.querySelector('.sw-add').addEventListener('click', () => {
    setPicked(li, !li.classList.contains('is-picked'));
    update();
  }));
  document.getElementById('sw-clear').addEventListener('click', () => {
    apps.forEach((li) => setPicked(li, false));
    update();
  });

  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    apps.forEach((li) => { if (saved.includes(nameOf(li))) setPicked(li, true); });
  } catch (e) { /* storage blocked or bad data */ }
  update();
})();
