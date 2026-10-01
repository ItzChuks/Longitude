(function () {
  'use strict';
  const L = window.LGT, API = window.LGT_API;
  const $ = (s, r = document) => r.querySelector(s);
  const state = { from: 'lagos', to: 'london', mode: 'air', weight: 100 };
  let lastQuote = null;

  /* ---------- setup ---------- */
  $('#year').textContent = new Date().getFullYear();
  if (API.demo) { $('#demoBanner').hidden = false; $('#demoHint').hidden = false; }
  document.querySelectorAll('[data-icon]').forEach(n => { n.innerHTML = L.ICONS[n.dataset.icon].replace('width="22" height="22"', 'width="34" height="34"'); });
  document.querySelectorAll('#modeBtns button').forEach(b => { b.innerHTML = L.ICONS[b.dataset.mode] + L.MODES[b.dataset.mode].label; });

  const opts = L.CITIES.map(c => `<option value="${c.id}">${L.esc(c.name)}, ${L.esc(c.country)}</option>`).join('');
  $('#from').innerHTML = opts; $('#to').innerHTML = opts;
  $('#from').value = state.from; $('#to').value = state.to;

  /* ---------- hero chart ---------- */
  const chart = $('#chart');
  function drawChart() {
    const mobile = window.innerWidth < 1024;
    chart.style.aspectRatio = mobile ? '4 / 3' : '1000 / 430';
    const ok = lastQuote && !lastQuote.error;
    L.renderChart(chart, {
      from: state.from, to: state.to, mode: state.mode, fit: mobile, aspect: 4 / 3, animate: true,
      label: ok ? `${L.fmtNum(lastQuote.distance)} km · about ${lastQuote.days} days` : ''
    });
  }

  /* ---------- planner ---------- */
  function update() {
    const av = L.availability(state.from, state.to);
    if (!av[state.mode]) state.mode = 'air';
    document.querySelectorAll('#modeBtns button').forEach(b => {
      const m = b.dataset.mode;
      b.disabled = !av[m];
      b.title = av[m] ? '' : av.reason[m];
      b.setAttribute('aria-pressed', String(m === state.mode));
    });
    lastQuote = L.quote(state);
    const q = lastQuote;
    if (q.error) {
      $('#qPrice').textContent = '—'; $('#qDays').textContent = '—'; $('#qDist').textContent = '—';
      $('#qNote').textContent = q.error;
    } else {
      $('#qPrice').textContent = L.fmtMoney(q.price);
      $('#qDays').textContent = `About ${q.days} ${q.days === 1 ? 'day' : 'days'}`;
      $('#qDist').textContent = `${L.fmtNum(q.distance)} km`;
      $('#qNote').textContent = q.customs ? `Includes fuel and ${L.fmtMoney(q.customs)} customs handling.` : 'Includes fuel. No customs fee on domestic routes.';
    }
    drawChart();
    updateSummary();
  }

  $('#from').addEventListener('change', e => { state.from = e.target.value; update(); });
  $('#to').addEventListener('change', e => { state.to = e.target.value; update(); });
  $('#swap').addEventListener('click', () => {
    [state.from, state.to] = [state.to, state.from];
    $('#from').value = state.from; $('#to').value = state.to; update();
  });
  $('#modeBtns').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    state.mode = b.dataset.mode; update();
  });
  $('#weight').addEventListener('input', e => { state.weight = parseFloat(e.target.value) || 0; update(); });
  $('#bookBtn').addEventListener('click', () => { $('#book').scrollIntoView({ behavior: 'smooth' }); $('#senderName').focus({ preventScroll: true }); });
  $('#planner').addEventListener('submit', e => e.preventDefault());

  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawChart, 200); });

  /* ---------- booking ---------- */
  function updateSummary() {
    const a = L.CITY[state.from], b = L.CITY[state.to], q = lastQuote;
    $('#bookSummary').innerHTML = q && !q.error
      ? `<p class="font-display text-lg font-extrabold">${L.esc(a.name)} to ${L.esc(b.name)}</p>
         <p class="mt-1 text-ink/70">${L.modeOf(state.mode).label} freight, ${L.fmtNum(state.weight)} kg</p>
         <p class="mt-3 flex items-baseline justify-between border-t border-dashed border-ink/25 pt-3"><span class="text-ink/70">Estimated price</span><strong class="text-lg">${L.fmtMoney(q.price)}</strong></p>`
      : `<p class="text-ink/70">${L.esc(q ? q.error : 'Choose a route above.')}</p>`;
  }

  $('#bookForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#bookError'), btn = $('#bookSubmit');
    err.textContent = '';
    if (!lastQuote || lastQuote.error) { err.textContent = lastQuote ? lastQuote.error : 'Choose a route first.'; return; }
    if (!(state.weight >= 1)) { err.textContent = 'Enter a weight of at least 1 kg.'; return; }
    const a = L.CITY[state.from], b = L.CITY[state.to];
    const data = {
      mode: state.mode, origin: a.id, destination: b.id, originName: a.name, destName: b.name,
      weightKg: state.weight, priceUsd: lastQuote.price, etaDays: lastQuote.days,
      cargoType: $('#cargoType').value, description: $('#description').value.trim(),
      senderName: $('#senderName').value.trim(), senderEmail: $('#senderEmail').value.trim(),
      receiverName: $('#receiverName').value.trim(), receiverPhone: $('#receiverPhone').value.trim()
    };
    btn.disabled = true; btn.textContent = 'Booking…';
    try {
      const s = await API.createShipment(data);
      $('#bookForm').hidden = true;
      const done = $('#bookDone'); done.hidden = false;
      done.innerHTML = `
        <h3 class="text-2xl font-extrabold">Booking confirmed</h3>
        <p class="mt-2 text-ink/75">Keep this tracking ID. We will contact ${L.esc(data.senderEmail)} to arrange pickup.</p>
        <p class="mt-5 rounded-xl border border-dashed border-ink/30 bg-chart px-4 py-4 font-display text-3xl font-extrabold tracking-wide">${L.esc(s.trackingId)}</p>
        <div class="mt-5 flex flex-wrap gap-3">
          <button class="btn" id="trackNow" type="button">Track this shipment</button>
          <button class="btn btn-ghost" id="copyId" type="button">Copy ID</button>
          <button class="btn btn-ghost" id="another" type="button">Book another</button>
        </div>`;
      $('#trackNow').onclick = () => { $('#trackId').value = s.trackingId; track(s.trackingId); $('#track').scrollIntoView({ behavior: 'smooth' }); };
      $('#copyId').onclick = async ev => { try { await navigator.clipboard.writeText(s.trackingId); ev.target.textContent = 'Copied'; } catch (x) { ev.target.textContent = 'Copy failed'; } };
      $('#another').onclick = () => { done.hidden = true; $('#bookForm').hidden = false; $('#bookForm').reset(); };
    } catch (ex) {
      err.textContent = 'We could not save the booking. Check your connection and try again.';
      console.error(ex);
    } finally { btn.disabled = false; btn.textContent = 'Confirm booking'; }
  });

  /* ---------- tracking ---------- */
  async function track(raw) {
    const id = String(raw || '').trim().toUpperCase();
    const box = $('#trackResult');
    if (!id) return;
    box.className = 'grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-ink/25 p-6 text-center text-ink/60';
    box.textContent = 'Looking up ' + id + '…';
    try {
      const r = await API.trackShipment(id);
      if (!r) { box.textContent = `No shipment found for ${id}. Check the ID in your confirmation and try again.`; return; }
      renderTrack(box, r);
    } catch (ex) {
      console.error(ex);
      box.textContent = 'Tracking is unavailable right now. Try again in a moment.';
    }
  }

  function renderTrack(box, { shipment: s, events }) {
    const evs = events.length ? events : [{ status: 'Booking received', location: s.originName, note: '', $createdAt: s.$createdAt }];
    const latest = evs[evs.length - 1];
    const col = L.statusColor(latest.status, s.mode);
    const progress = L.statusProgress(evs, s.status);
    box.className = 'overflow-hidden rounded-2xl border border-ink/15 bg-white text-left';
    box.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-ink/25 px-5 py-4 sm:px-6">
        <div>
          <p class="text-xs font-semibold text-ink/60">Tracking ID</p>
          <p class="font-display text-2xl font-extrabold tracking-wide">${L.esc(s.trackingId)}</p>
        </div>
        <span class="pill" style="background:${col}">${L.esc(latest.status)}</span>
      </div>
      <div class="bg-[#0E2F4A]"><svg id="trackChart" class="block w-full" style="aspect-ratio:16/10" role="img" aria-label="Shipment progress on route"></svg></div>
      <div class="grid gap-6 px-5 py-6 sm:px-6 md:grid-cols-[1fr_1.2fr]">
        <dl class="space-y-3 text-sm">
          <div><dt class="text-ink/60">Route</dt><dd class="font-semibold">${L.esc(s.originName)} to ${L.esc(s.destName)}</dd></div>
          <div><dt class="text-ink/60">Mode and weight</dt><dd class="font-semibold">${L.modeOf(s.mode).label}, ${L.fmtNum(s.weightKg)} kg</dd></div>
          <div><dt class="text-ink/60">Cargo</dt><dd class="font-semibold">${L.esc(s.cargoType)}</dd></div>
          <div><dt class="text-ink/60">Receiver</dt><dd class="font-semibold">${L.esc(s.receiverName)}</dd></div>
          <div><dt class="text-ink/60">Booked</dt><dd class="font-semibold">${L.fmtDate(s.$createdAt)}</dd></div>
        </dl>
        <ol class="tl" style="--c:${col}">
          ${evs.slice().reverse().map((e, i) => `
            <li class="${i === 0 ? 'now' : ''}" style="--c:${L.statusColor(e.status, s.mode)}">
              <span class="dot"></span>
              <p class="font-semibold">${L.esc(e.status)}</p>
              <p class="text-sm text-ink/70">${L.esc(e.location || '')}${e.note ? (e.location ? ' · ' : '') + L.esc(e.note) : ''}</p>
              <p class="text-xs text-ink/50">${L.fmtDate(e.$createdAt)}</p>
            </li>`).join('')}
        </ol>
      </div>`;
    L.renderChart($('#trackChart'), { from: s.origin, to: s.destination, mode: s.mode, fit: true, aspect: 1.6, progress });
  }

  $('#trackForm').addEventListener('submit', e => { e.preventDefault(); track($('#trackId').value); });
  document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => { $('#trackId').value = b.dataset.demo; track(b.dataset.demo); }));

  update();
  const hashId = (location.hash.match(/track=([\w-]+)/i) || [])[1];
  if (hashId) { $('#trackId').value = hashId.toUpperCase(); track(hashId); }
})();
