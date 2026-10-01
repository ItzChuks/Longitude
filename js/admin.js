(function () {
  'use strict';
  const L = window.LGT, API = window.LGT_API;
  const $ = (s, r = document) => r.querySelector(s);
  let ships = [], filter = 'all', query = '', sel = null;

  const FILTERS = [
    ['all', 'All', () => true],
    ['active', 'Active', s => s.status !== 'Delivered'],
    ['delayed', 'Delayed', s => s.status === 'Delayed'],
    ['delivered', 'Delivered', s => s.status === 'Delivered']
  ];

  if (API.demo) $('#demoBanner').hidden = false;

  /* ---------- auth: only signed-in admins may see this page ---------- */
  async function boot() {
    const u = await API.currentUser();
    if (!u) { location.replace('admin.html'); return; }
    $('#who').textContent = u.email || '';
    await load();
  }
  $('#logout').addEventListener('click', async () => { await API.logout(); location.replace('admin.html'); });

  /* ---------- list ---------- */
  async function load() {
    $('#listError').textContent = '';
    try { ships = await API.listShipments(); }
    catch (ex) { console.error(ex); $('#listError').textContent = 'Could not load shipments. Check your Appwrite settings and permissions.'; ships = []; }
    render();
  }
  function visible() {
    const f = FILTERS.find(x => x[0] === filter)[2], q = query.toLowerCase();
    return ships.filter(f).filter(s => !q || [s.trackingId, s.senderName, s.receiverName, s.originName, s.destName].join(' ').toLowerCase().includes(q));
  }
  function render() {
    $('#filters').innerHTML = FILTERS.map(([id, label, fn]) =>
      `<button type="button" data-f="${id}" class="btn ${filter === id ? '' : 'btn-ghost'} !px-4 !py-1.5 text-sm">${label} (${ships.filter(fn).length})</button>`).join('');
    const n = f => ships.filter(f).length;
    $('#stats').innerHTML = [['Total', n(() => true)], ['Active', n(FILTERS[1][2])], ['Delayed', n(FILTERS[2][2])], ['Delivered', n(FILTERS[3][2])]].map(([t, v]) =>
      `<div class="rounded-2xl border border-ink/10 bg-white p-4"><p class="text-sm text-ink/60">${t}</p><p class="font-display text-3xl font-extrabold">${v}</p></div>`).join('');
    const rows = visible();
    $('#empty').hidden = rows.length > 0;
    $('#rows').innerHTML = rows.map(s => `
      <tr class="cursor-pointer hover:bg-ink/5" data-id="${L.esc(s.$id)}" tabindex="0">
        <td class="px-4 py-3 font-semibold">${L.esc(s.trackingId)}</td>
        <td class="px-4 py-3">${L.esc(s.originName)} to ${L.esc(s.destName)}</td>
        <td class="px-4 py-3"><span class="pill" style="background:${L.modeOf(s.mode).color}">${L.modeOf(s.mode).label}</span></td>
        <td class="px-4 py-3">${L.fmtNum(s.weightKg)} kg</td>
        <td class="px-4 py-3"><span class="pill" style="background:${L.statusColor(s.status, s.mode)}">${L.esc(s.status)}</span></td>
        <td class="px-4 py-3 text-ink/70">${L.fmtDate(s.$createdAt)}</td>
      </tr>`).join('');
  }
  $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; render(); } });
  $('#search').addEventListener('input', e => { query = e.target.value; render(); });
  $('#refresh').addEventListener('click', load);
  $('#rows').addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) openDrawer(tr.dataset.id); });
  $('#rows').addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr'); if (tr) openDrawer(tr.dataset.id); } });

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); scrim.hidden = true; sel = null; }
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sel) closeDrawer(); });

  async function openDrawer(id) {
    sel = ships.find(s => s.$id === id); if (!sel) return;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false;
    drawer.innerHTML = '<p class="p-6 text-ink/60">Loading…</p>';
    try { drawerView(await API.listEvents(sel.trackingId)); }
    catch (ex) { console.error(ex); drawer.innerHTML = '<p class="p-6 text-red-700">Could not load this shipment.</p>'; }
  }

  function drawerView(events) {
    const s = sel;
    const evs = events.length ? events : [{ status: 'Booking received', location: s.originName, note: '', $createdAt: s.$createdAt }];
    const progress = L.statusProgress(evs, s.status);
    drawer.innerHTML = `
      <div class="flex items-start justify-between gap-3 border-b border-dashed border-ink/25 px-6 py-5">
        <div><p class="text-xs font-semibold text-ink/60">Tracking ID</p><p class="font-display text-2xl font-extrabold">${L.esc(s.trackingId)}</p></div>
        <button id="closeDrawer" class="btn btn-ghost !px-3 !py-1.5 text-sm" type="button">Close</button>
      </div>
      <div class="bg-[#0E2F4A]"><svg id="drawerChart" class="block w-full" style="aspect-ratio:16/9" role="img" aria-label="Route progress"></svg></div>
      <div class="space-y-6 px-6 py-6">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt class="text-ink/60">Sender</dt><dd class="font-semibold">${L.esc(s.senderName)}</dd><dd class="text-ink/70">${L.esc(s.senderEmail)}</dd></div>
          <div><dt class="text-ink/60">Receiver</dt><dd class="font-semibold">${L.esc(s.receiverName)}</dd><dd class="text-ink/70">${L.esc(s.receiverPhone)}</dd></div>
          <div><dt class="text-ink/60">Cargo</dt><dd class="font-semibold">${L.esc(s.cargoType)}, ${L.fmtNum(s.weightKg)} kg</dd></div>
          <div><dt class="text-ink/60">Quoted</dt><dd class="font-semibold">${L.fmtMoney(s.priceUsd || 0)}</dd></div>
          <div class="col-span-2"><dt class="text-ink/60">Description</dt><dd>${L.esc(s.description)}</dd></div>
        </dl>

        <form id="updateForm" class="space-y-3 rounded-2xl border border-ink/15 p-4">
          <p class="font-semibold">Post an update</p>
          <div><label class="label" for="uStatus">Status</label>
            <select id="uStatus" class="field">${L.STATUSES.map(x => `<option ${x === s.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div><label class="label" for="uLoc">Location</label><input id="uLoc" class="field" maxlength="120" placeholder="e.g. Lagos hub, Rotterdam port"></div>
          <div><label class="label" for="uNote">Note for the customer (optional)</label><input id="uNote" class="field" maxlength="240"></div>
          <p id="uErr" class="text-sm font-medium text-red-700" role="alert"></p>
          <button class="btn w-full" type="submit" id="uBtn">Post update</button>
        </form>

        <ol class="tl" style="--c:${L.statusColor(s.status, s.mode)}">
          ${evs.slice().reverse().map((e, i) => `
            <li class="${i === 0 ? 'now' : ''}" style="--c:${L.statusColor(e.status, s.mode)}"><span class="dot"></span>
              <p class="font-semibold">${L.esc(e.status)}</p>
              <p class="text-sm text-ink/70">${L.esc(e.location || '')}${e.note ? (e.location ? ' · ' : '') + L.esc(e.note) : ''}</p>
              <p class="text-xs text-ink/50">${L.fmtDate(e.$createdAt)}</p></li>`).join('')}
        </ol>

        <button id="delBtn" class="text-sm font-medium text-red-700 underline" type="button">Delete this shipment</button>
      </div>`;
    L.renderChart($('#drawerChart'), { from: s.origin, to: s.destination, mode: s.mode, fit: true, aspect: 16 / 9, progress });
    $('#closeDrawer').onclick = closeDrawer;

    $('#updateForm').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#uBtn'); $('#uErr').textContent = ''; btn.disabled = true; btn.textContent = 'Posting…';
      try {
        await API.addEvent(s, { status: $('#uStatus').value, location: $('#uLoc').value.trim(), note: $('#uNote').value.trim() });
        const id = s.$id; await load(); openDrawer(id);
      } catch (ex) {
        console.error(ex); $('#uErr').textContent = 'Update failed. Check that your account has the "admin" label and the collection permissions are set.';
        btn.disabled = false; btn.textContent = 'Post update';
      }
    };
    $('#delBtn').onclick = async () => {
      if (!confirm(`Delete ${s.trackingId} and its history? This cannot be undone.`)) return;
      try { await API.deleteShipment(s); closeDrawer(); await load(); }
      catch (ex) { console.error(ex); alert('Could not delete this shipment.'); }
    };
  }

  /* ---------- new shipment ---------- */
  const modal = $('#newModal'), nForm = $('#newForm'), nDone = $('#nDone');
  const opts = L.CITIES.map(c => `<option value="${c.id}">${L.esc(c.name)}, ${L.esc(c.country)}</option>`).join('');
  $('#nFrom').innerHTML = opts; $('#nTo').innerHTML = opts; $('#nFrom').value = 'lagos'; $('#nTo').value = 'london';
  const openNew = () => { nForm.hidden = false; nDone.hidden = true; nForm.reset(); $('#nFrom').value = 'lagos'; $('#nTo').value = 'london'; modal.hidden = false; $('#nFrom').focus(); };
  const closeNew = () => { modal.hidden = true; };
  $('#newBtn').onclick = openNew; $('#newBtn2').onclick = openNew; $('#newClose').onclick = closeNew; $('#nOk').onclick = closeNew; $('#nAgain').onclick = openNew;
  nForm.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#nErr'), btn = $('#nBtn'); err.textContent = '';
    const from = $('#nFrom').value, to = $('#nTo').value, mode = $('#nMode').value, weight = parseFloat($('#nWeight').value);
    const q = L.quote({ from, to, mode, weight });
    if (q.error) { err.textContent = q.error; return; }
    const a = L.CITY[from], b = L.CITY[to];
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const s = await API.createShipment({ mode, origin: a.id, destination: b.id, originName: a.name, destName: b.name, weightKg: weight, priceUsd: q.price, etaDays: q.days,
        cargoType: $('#nCargo').value, description: $('#nDesc').value.trim(), senderName: $('#nSender').value.trim(), senderEmail: $('#nSenderEmail').value.trim(),
        receiverName: $('#nReceiver').value.trim(), receiverPhone: $('#nPhone').value.trim() });
      nForm.hidden = true; nDone.hidden = false; $('#nId').textContent = s.trackingId;
      $('#nCopy').onclick = async ev => { try { await navigator.clipboard.writeText(s.trackingId); ev.target.textContent = 'Copied'; } catch (x) { ev.target.textContent = 'Copy failed'; } };
      load();
    } catch (ex) { console.error(ex); err.textContent = 'Could not save the shipment. Check your connection and Appwrite permissions.'; }
    finally { btn.disabled = false; btn.textContent = 'Create shipment and generate ID'; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeNew(); });

  boot();
})();
