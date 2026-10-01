/* Longitude — shared data, pricing rules and the route-chart renderer */
(function () {
  'use strict';
  const W = 1000, H = 430;

  const CITIES = [
    { id: 'lagos', name: 'Lagos', country: 'Nigeria', lon: 3.39, lat: 6.52, land: 'AF' },
    { id: 'accra', name: 'Accra', country: 'Ghana', lon: -0.19, lat: 5.6, land: 'AF' },
    { id: 'durban', name: 'Durban', country: 'South Africa', lon: 31.02, lat: -29.86, land: 'AF' },
    { id: 'mombasa', name: 'Mombasa', country: 'Kenya', lon: 39.67, lat: -4.04, land: 'AF' },
    { id: 'cairo', name: 'Cairo', country: 'Egypt', lon: 31.24, lat: 30.04, land: 'AF' },
    { id: 'london', name: 'London', country: 'United Kingdom', lon: -0.12, lat: 51.5, land: 'EU' },
    { id: 'rotterdam', name: 'Rotterdam', country: 'Netherlands', lon: 4.48, lat: 51.92, land: 'EU' },
    { id: 'hamburg', name: 'Hamburg', country: 'Germany', lon: 9.99, lat: 53.55, land: 'EU' },
    { id: 'istanbul', name: 'Istanbul', country: 'Turkey', lon: 28.98, lat: 41.01, land: 'EU' },
    { id: 'newyork', name: 'New York', country: 'USA', lon: -74.0, lat: 40.71, land: 'NA' },
    { id: 'losangeles', name: 'Los Angeles', country: 'USA', lon: -118.24, lat: 34.05, land: 'NA' },
    { id: 'saopaulo', name: 'São Paulo', country: 'Brazil', lon: -46.63, lat: -23.55, land: 'SA' },
    { id: 'dubai', name: 'Dubai', country: 'UAE', lon: 55.27, lat: 25.2, land: 'ME' },
    { id: 'mumbai', name: 'Mumbai', country: 'India', lon: 72.88, lat: 19.08, land: 'IN' },
    { id: 'singapore', name: 'Singapore', country: 'Singapore', lon: 103.82, lat: 1.35, land: 'SG' },
    { id: 'shanghai', name: 'Shanghai', country: 'China', lon: 121.47, lat: 31.23, land: 'CN' },
    { id: 'tokyo', name: 'Tokyo', country: 'Japan', lon: 139.69, lat: 35.68, land: 'JP' },
    { id: 'sydney', name: 'Sydney', country: 'Australia', lon: 151.21, lat: -33.87, land: 'OC' }
  ];
  const CITY = Object.fromEntries(CITIES.map(c => [c.id, c]));

  // rate = USD per kg per km, route = detour factor, bulge = arc curvature on the chart
  const MODES = {
    road: { label: 'Road', color: '#B98700', rate: 0.00055, min: 90, route: 1.25, kmPerDay: 650, base: 1, bulge: 0.05, anim: 7000 },
    sea: { label: 'Sea', color: '#0E7C86', rate: 0.00009, min: 140, route: 1.4, kmPerDay: 700, base: 6, bulge: 0.1, anim: 10000 },
    air: { label: 'Air', color: '#F0562B', rate: 0.0011, min: 180, route: 1.05, kmPerDay: 7000, base: 1, bulge: 0.3, anim: 4500 }
  };

  const STATUSES = ['Booking received', 'Picked up', 'Departed origin hub', 'In transit', 'Customs clearance',
    'Arrived at destination hub', 'Out for delivery', 'Delivered', 'Delayed'];
  const PROGRESS = { 'Booking received': 0, 'Picked up': 0.02, 'Departed origin hub': 0.1, 'In transit': 0.5,
    'Customs clearance': 0.92, 'Arrived at destination hub': 0.96, 'Out for delivery': 0.98, 'Delivered': 1, 'Delayed': null };

  const ICONS = {
    road: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
    sea: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/></svg>',
    air: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>'
  };

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtMoney = n => '$' + Math.round(n).toLocaleString('en-US');
  const fmtNum = n => Math.round(n).toLocaleString('en-US');
  const fmtDate = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const modeOf = m => MODES[m] || MODES.air;
  function newTrackingId() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const a = new Uint32Array(8); crypto.getRandomValues(a);
    return 'LGT-' + Array.from(a, n => abc[n % abc.length]).join('');
  }
  function statusColor(status, mode) {
    if (status === 'Delivered') return '#1E8E5A';
    if (status === 'Delayed') return '#C0392B';
    return modeOf(mode).color;
  }
  function statusProgress(events, fallback) {
    const list = (events && events.length) ? events.map(e => e.status) : [fallback || 'Booking received'];
    for (let i = list.length - 1; i >= 0; i--) { const p = PROGRESS[list[i]]; if (p != null) return p; }
    return 0;
  }

  /* ---------- geography & pricing ---------- */
  const project = c => ({ x: (c.lon + 180) / 360 * W, y: (78 - c.lat) / 136 * H });
  function distanceKm(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function availability(from, to) {
    const a = CITY[from], b = CITY[to];
    const road = !!(a && b && a.land === b.land && !['JP', 'OC'].includes(a.land));
    return { air: true, sea: true, road, reason: { road: 'Road freight only runs between cities on the same landmass.' } };
  }
  function quote({ from, to, mode, weight }) {
    const a = CITY[from], b = CITY[to];
    if (!a || !b || from === to) return { error: 'Choose two different cities.' };
    const av = availability(from, to);
    if (!av[mode]) return { error: av.reason[mode] || 'This mode is not available on this route.' };
    const m = MODES[mode];
    const dist = distanceKm(a, b), km = dist * m.route;
    const w = Math.max(1, Number(weight) || 0);
    const freight = Math.max(m.min, w * km * m.rate);
    const fuel = freight * 0.08;
    const customs = a.country === b.country ? 0 : 45;
    return { distance: dist, days: m.base + Math.ceil(km / m.kmPerDay), price: Math.round(freight + fuel + customs), freight, fuel, customs };
  }

  /* ---------- dot-matrix land (rough outlines, drawn as a dotted chart) ---------- */
  const POLYS = [
    [[-168,66],[-162,70],[-141,70],[-125,70],[-110,73],[-95,72],[-85,70],[-65,62],[-60,55],[-56,52],[-66,45],[-70,42],[-75,38],[-76,35],[-81,31],[-80,26],[-83,29],[-90,30],[-97,27],[-97,20],[-91,18],[-88,21],[-87,15],[-83,10],[-78,8],[-82,8],[-86,11],[-92,14],[-96,16],[-105,20],[-110,27],[-115,30],[-117,33],[-121,35],[-124,40],[-124,48],[-130,54],[-135,58],[-145,60],[-152,59],[-160,58],[-165,62]],
    [[-52,64],[-44,60],[-40,65],[-22,70],[-19,78],[-45,78],[-58,75],[-55,68]],
    [[-78,8],[-72,12],[-62,10],[-52,5],[-50,0],[-44,-2],[-35,-6],[-37,-12],[-40,-20],[-48,-26],[-54,-34],[-58,-38],[-65,-42],[-68,-50],[-69,-55],[-74,-52],[-74,-42],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-77,4]],
    [[-10,36],[-9,43],[-2,43.5],[-1,46],[-4,48],[2,51],[5,53],[8,54],[8,57],[5,59],[5,62],[12,66],[18,70],[28,71],[40,67],[44,68],[60,69],[70,73],[80,73],[100,77],[115,74],[130,72],[142,72],[160,70],[175,69],[180,66],[165,60],[156,52],[141,53],[140,47],[132,43],[129,40],[129,35],[126,35],[125,39],[122,40],[121,37],[119,35],[122,30],[120,26],[113,22],[108,21],[106,17],[109,12],[105,9],[103,1.3],[101,3],[98,8],[99,13],[97,17],[94,17],[92,22],[88,22],[85,20],[80,15],[78,8],[76,10],[73,17],[72,21],[67,24],[62,25],[57,26],[56,27],[52,28],[48,30],[50,26],[52,24],[56,24],[59,22],[55,17],[45,13],[43,13],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[23,38],[21,40],[19,42],[14,45],[8,44],[3,43],[-1,38],[-5,36]],
    [[-17,21],[-13,28],[-9,32],[-6,36],[10,37],[11,33],[20,31],[25,32],[32,31],[34,28],[38,20],[43,12],[51,12],[48,5],[40,-3],[40,-11],[40,-15],[35,-24],[33,-27],[32,-29],[27,-34],[19,-34],[15,-27],[12,-18],[13,-8],[9,-1],[9,4],[5,6],[-2,5],[-8,4],[-13,8],[-17,14]],
    [[114,-22],[122,-17],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-34],[129,-32],[115,-34]],
    [[130,31],[136,34],[141,36],[142,43],[139,41],[135,36],[131,34]],
    [[-5,50],[1,51],[2,53],[-2,56],[-3,58.5],[-6,57],[-3,54],[-5,52]],
    [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
    [[95,5],[104,-2],[106,-6],[100,-1]],
    [[109,2],[117,7],[119,1],[116,-4],[110,-3]],
    [[131,-1],[141,-3],[150,-10],[141,-9],[135,-4]]
  ];
  function inPoly(x, y, p) {
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  let LAND_D = '';
  function landPath() {
    if (LAND_D) return LAND_D;
    let row = 0, d = '';
    for (let lat = 76; lat >= -56; lat -= 3, row++) {
      for (let lon = -170 + (row % 2 ? 1.7 : 0); lon <= 178; lon += 3.4) {
        if (POLYS.some(p => inPoly(lon, lat, p))) {
          const q = project({ lon, lat });
          d += `M${q.x.toFixed(1)} ${q.y.toFixed(1)}h.01`;
        }
      }
    }
    return (LAND_D = d);
  }

  /* ---------- route chart ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderChart(svg, o) {
    if (svg._raf) cancelAnimationFrame(svg._raf);
    const a = CITY[o.from], b = CITY[o.to];
    const same = !a || !b || o.from === o.to;
    const mode = modeOf(o.mode);
    const A = a ? project(a) : { x: 0, y: 0 }, B = b ? project(b) : { x: 0, y: 0 };
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const C = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - len * mode.bulge };

    let vb = [0, 0, W, H];
    if (o.fit && !same) {
      const aspect = o.aspect || W / H;
      const xs = [A.x, B.x, C.x], ys = [A.y, B.y, A.y + (C.y - A.y) * 0.5];
      const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      let w = Math.max((maxx - minx) * 1.6, 420), h = w / aspect;
      if (h < (maxy - miny) * 1.7) { h = (maxy - miny) * 1.7; w = h * aspect; }
      if (w > W) { w = W; h = w / aspect; }
      const x = Math.max(0, Math.min(W - w, (minx + maxx) / 2 - w / 2));
      const y = Math.max(0, Math.min(H - h, (miny + maxy) / 2 - h / 2));
      vb = [x, y, w, h];
    }
    svg.setAttribute('viewBox', vb.join(' '));
    svg.innerHTML = '';
    const fs = 5 + 9 * (vb[2] / W);

    // graticule + land
    let g = '';
    for (let lo = -150; lo <= 180; lo += 30) { const x = (lo + 180) / 360 * W; g += `M${x} 0V${H}`; }
    for (let la = 60; la >= -45; la -= 15) { const y = (78 - la) / 136 * H; g += `M0 ${y}H${W}`; }
    el('path', { d: g, stroke: '#1B4263', 'stroke-width': 0.7, fill: 'none' }, svg);
    el('path', { d: landPath(), stroke: '#33597B', 'stroke-width': 3.2, 'stroke-linecap': 'round', fill: 'none' }, svg);

    // city nodes
    CITIES.forEach(c => {
      if (c.id === o.from || c.id === o.to) return;
      const p = project(c);
      el('circle', { cx: p.x, cy: p.y, r: 2.2, fill: '#7FA6C6' }, svg);
    });

    const d = `M${A.x} ${A.y}Q${C.x} ${C.y} ${B.x} ${B.y}`;
    const pt = t => ({ x: (1 - t) ** 2 * A.x + 2 * (1 - t) * t * C.x + t * t * B.x, y: (1 - t) ** 2 * A.y + 2 * (1 - t) * t * C.y + t * t * B.y });
    const ang = t => Math.atan2(2 * (1 - t) * (C.y - A.y) + 2 * t * (B.y - C.y), 2 * (1 - t) * (C.x - A.x) + 2 * t * (B.x - C.x)) * 180 / Math.PI;

    const draws = [];
    if (!same) {
      if (o.progress == null) {
        draws.push(el('path', { d, fill: 'none', stroke: mode.color, 'stroke-width': 10, opacity: 0.2, 'stroke-linecap': 'round', pathLength: 1, class: 'route-draw' }, svg));
        draws.push(el('path', { d, fill: 'none', stroke: mode.color, 'stroke-width': 2.6, 'stroke-linecap': 'round', pathLength: 1, class: 'route-draw' }, svg));
      } else {
        el('path', { d, fill: 'none', stroke: '#5C86A8', 'stroke-width': 2, 'stroke-dasharray': '4 6' }, svg);
        el('path', { d, fill: 'none', stroke: mode.color, 'stroke-width': 3, pathLength: 1, 'stroke-dasharray': `${o.progress} 2` }, svg);
      }
      if (o.label) {
        const m = pt(0.5);
        el('text', { x: m.x, y: m.y - 9, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 600, fill: '#EAF2F8', stroke: '#0E2F4A', 'stroke-width': 3, 'paint-order': 'stroke' }, svg).textContent = o.label;
      }
    }

    // endpoints with labels
    [a, b].forEach((c, i) => {
      if (!c) return;
      const p = project(c);
      el('circle', { cx: p.x, cy: p.y, r: 5.5, fill: '#0E2F4A', stroke: mode.color, 'stroke-width': 2.2 }, svg);
      el('circle', { cx: p.x, cy: p.y, r: 2.2, fill: '#fff' }, svg);
      const below = p.y < vb[1] + 28;
      el('text', { x: p.x, y: below ? p.y + fs + 8 : p.y - 11, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, fill: '#fff', stroke: '#0E2F4A', 'stroke-width': 3, 'paint-order': 'stroke' }, svg).textContent = c.name;
    });

    if (same) return;

    // vehicle
    const veh = el('g', {}, svg);
    const sh = { fill: '#fff', stroke: mode.color, 'stroke-width': 1.6, 'stroke-linejoin': 'round' };
    if (o.mode === 'air') el('path', { ...sh, d: 'M0-11L2-4L11 3V5.5L2 3L1.5 8L5 10.5V12L0 11L-5 12V10.5L-1.5 8L-2 3L-11 5.5V3L-2-4Z' }, veh);
    else if (o.mode === 'sea') { el('path', { ...sh, d: 'M0-12C5-8 6-2 6 4V10H-6V4C-6-2-5-8 0-12Z' }, veh); el('rect', { x: -3, y: -1, width: 6, height: 6, fill: mode.color }, veh); }
    else { el('rect', { ...sh, x: -5, y: -3, width: 10, height: 13 }, veh); el('rect', { ...sh, x: -4.5, y: -10, width: 9, height: 6.5 }, veh); }
    const s = 0.5 + 1.3 * (vb[2] / W);
    const place = t => { const p = pt(t); veh.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang(t) + 90}) scale(${s})`); };

    if (o.progress != null) place(Math.min(0.999, Math.max(0.001, o.progress)));
    else if (o.animate && !reduced()) {
      const t0 = performance.now() + 1100;
      const tick = now => {
        const e = now - t0;
        if (e < 0) place(0.001);
        else { const t = (e / mode.anim) % 1; place(t * t * (3 - 2 * t)); }
        svg._raf = requestAnimationFrame(tick);
      };
      svg._raf = requestAnimationFrame(tick);
    } else place(0.5);

    void svg.getBoundingClientRect();
    draws.forEach(p => p.classList.add('on'));
  }

  window.LGT = { CITIES, CITY, MODES, STATUSES, PROGRESS, ICONS, esc, fmtMoney, fmtNum, fmtDate, modeOf,
    newTrackingId, statusColor, statusProgress, distanceKm, availability, quote, renderChart };
})();
