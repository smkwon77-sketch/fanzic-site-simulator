/* 제품사양 선택(설계) 탭: 공간 치수 → 평면도에 구역 그리기 → 덕트 경로 그리기 → 필요 환기량·압력손실 → 모델·대수 추천.
   공조 설계 프로그램으로 넓힐 수 있도록 프로젝트 데이터 { room, zones, systems, load } 와 계산(FZ.design.calc)을 분리함. */
window.FZ = window.FZ || {};

(function () {
  const D = {};
  const V = FZ.VENT, ZT = {}; V.zoneTypes.forEach(z => { ZT[z.id] = z; });
  const KEY = 'fz-design-v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const snap = v => Math.round(v * 2) / 2;
  let uid = 1; const nid = p => p + (uid++);

  /* ---------- 프로젝트 ---------- */
  function zoneFrom(type, x, y, w, h) {
    const t = ZT[type] || ZT.etc;
    const z = { id: nid('z'), type, x, y, w, h, people: 0, tables: 0, seats: V.seatsPerTable, hoods: t.hoods ? 1 : 0,
      std: { perPerson: t.perPerson || 0, ach: t.ach || 0, perArea: t.perArea || 0 } };
    if (t.tables) z.tables = Math.max(1, Math.round(w * h / 2.5));
    else if (t.density) z.people = Math.max(1, Math.round(w * h * t.density));
    return z;
  }
  function newProject(use, L, W, H) {
    const p = { room: { use, L, W, H }, zones: [], systems: [], load: 0.85 };
    let x = 0; const tpl = V.templates[use] || [['etc', 1, 1]];
    let col = null;
    tpl.forEach(([type, fx, fy]) => {
      const w = snap(L * fx), h = snap(W * fy);
      if (fy < 1 && col && col.x === x) { p.zones.push(zoneFrom(type, x, col.y, w, h)); col.y += h; if (col.y >= W - 0.01) { x += w; col = null; } return; }
      if (fy < 1) { col = { x, y: h }; p.zones.push(zoneFrom(type, x, 0, w, h)); return; }
      p.zones.push(zoneFrom(type, x, 0, Math.min(w, L - x), W)); x += w; col = null;
    });
    const ex = p.zones.filter(z => z.type !== 'living');
    p.systems.push({ id: nid('s'), name: '배기 계통 1', kind: 'exhaust', zoneIds: (ex.length ? ex : p.zones).map(z => z.id), dia: 0, vert: Math.max(1, H - 0.5), terminal: 'hoodcap', route: [], pick: null });
    return p;
  }
  let P = null;
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) { const o = JSON.parse(s); if (o && o.room && o.zones) { P = o; uid = 1000 + Math.floor(Math.random() * 1000); return; } } } catch (e) { /* 저장소 사용 불가 */ }
    P = newProject('restaurant', 15, 10, 3.2);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* 무시 */ } }

  /* ---------- 계산 ---------- */
  const C = D.calc = {};
  C.zoneArea = z => z.w * z.h;
  C.people = z => ZT[z.type] && ZT[z.type].tables ? z.tables * z.seats : z.people;
  C.zoneQ = function (z, H) {
    const A = C.zoneArea(z), vol = A * H, n = C.people(z);
    const parts = [
      { k: 'perPerson', q: n * (z.std.perPerson || 0), t: `${fmt(n)}인 × ${fmt(z.std.perPerson)}㎥/h` },
      { k: 'ach', q: vol * (z.std.ach || 0), t: `${fmt(vol)}㎥ × ${fmt(z.std.ach, z.std.ach < 1 ? 1 : 0)}회/h` },
      { k: 'perArea', q: A * (z.std.perArea || 0), t: `${fmt(A, 1)}㎡ × ${fmt(z.std.perArea)}㎥/h·㎡` }
    ];
    const best = parts.reduce((a, b) => (b.q > a.q ? b : a));
    return { A, vol, n, q: best.q, by: best.q > 0 ? best.t : '기준값 없음' };
  };
  // 덕트 경로: 구간 길이·꺾임 각도
  C.route = function (sys) {
    const pts = sys.route || [], segs = [], bends = [];
    let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); L += l; }
    for (let i = 1; i < pts.length - 1; i++) {
      const a1 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x), a2 = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      let d = Math.abs(a2 - a1) * 180 / Math.PI; if (d > 180) d = 360 - d;
      if (d >= 10) bends.push(d);
    }
    if (sys.vert > 0 && pts.length) bends.push(90); // 수직으로 꺾여 올라가는 곳
    return { segs, bends, Lh: L, L: L + (sys.vert || 0) };
  };
  // 압력손실 (Pa) — Q ㎥/h, Dmm
  C.loss = function (Q, Dmm, Lm, bends, nBranch, termK) {
    const d = V.duct, Dm = Dmm / 1000, A = Math.PI * Dm * Dm / 4, v = Q / 3600 / A;
    const Re = v * Dm / d.nu, f1 = 0.11 * Math.pow(d.eps / Dm + 68 / Re, 0.25), f = f1 >= 0.018 ? f1 : 0.85 * f1 + 0.0028;
    const pv = d.rho * v * v / 2;
    const fric = f * Lm / Dm * pv;
    const kB = bends.reduce((a, th) => a + d.kElbow90 * th / 90, 0);
    const kSum = kB + d.kEntry + nBranch * d.kBranch + termK;
    return { v, pv, fric, fit: kSum * pv, kSum, pa: fric + kSum * pv, mmAq: (fric + kSum * pv) / 9.81, f };
  };
  C.suggestDia = Q => V.duct.sizes.find(s => Q / 3600 / (Math.PI * (s / 1000) ** 2 / 4) <= V.duct.vTarget) || V.duct.sizes[V.duct.sizes.length - 1];
  // 계통 계산
  C.system = function (sys, p) {
    const H = p.room.H, zs = p.zones.filter(z => sys.zoneIds.includes(z.id));
    const Q = zs.reduce((a, z) => a + C.zoneQ(z, H).q, 0);
    const Qsel = Q / Math.max(0.3, p.load);
    const r = C.route(sys);
    const dia = sys.dia || C.suggestDia(Qsel);
    const term = V.duct.terminals.find(t => t.id === sys.terminal) || V.duct.terminals[0];
    const ls = Q > 0 ? C.loss(Qsel, dia, r.L, r.bends, Math.max(0, zs.length - 1), term.k) : null;
    return { zs, Q, Qsel, r, dia, autoDia: !sys.dia, term, ls, mmAq: ls ? ls.mmAq : 0 };
  };
  // 모델 후보: 덕트 연결형 배기 제품의 모든 모델 행
  C.candidates = function (res, p) {
    const out = [], kitchen = res.zs.some(z => z.type === 'kitchen');
    Object.keys(FZ.PRODUCTS).forEach(pid => {
      const P0 = FZ.PRODUCTS[pid], S = FZ.SPECS[pid];
      if (P0.role !== 'exhaust' || !S) return;
      S.rows.forEach((row, i) => {
        const mount = (row[7] && row[7].mount) || P0.mount;
        if (!['duct', 'floor'].includes(mount)) return;
        const s = FZ.specOf(pid, i);
        if (!s.perf || !s.airflow) return;
        const known = s.pressure != null && s.pressure > 0;
        let q = s.airflow;
        if (known) { const x = 1 - res.mmAq / s.pressure; if (x <= 0.05) return; q = s.airflow * Math.sqrt(x); } // 덕트 압력에서의 풍량(추정)
        const n = Math.max(1, Math.ceil(res.Qsel / q));
        if (n > 12) return;
        const tag = FZ.TAGS[pid] || {};
        const rating = FZ.catalog.rating(p.room.use, pid);
        const load = res.Q / (n * q);
        out.push({ pid, idx: i, name: P0.name, model: s.model, q, n, load, kw: n * s.power / 1000, pressure: s.pressure, known, hz: s.hz,
          rating: rating && rating.r, oily: !!tag.oily, kitchenOk: !kitchen || !!tag.oily });
      });
    });
    const rk = r => ({ '◎': 0, '○': 0.05, '△': 0.1 }[r] ?? 0.15);
    // 총 소비전력 + 대수가 많을수록 설치·덕트 분기 부담(대당 4%) + 용도 적합도
    const cost = c => c.kw * (1 + rk(c.rating)) * (1 + 0.04 * (c.n - 1));
    out.sort((a, b) => (b.known - a.known) || (b.kitchenOk - a.kitchenOk) || (cost(a) - cost(b)));
    return out;
  };

  /* ---------- 화면 ---------- */
  const st = { tool: 'select', sel: null, selSys: null, drag: null, zoneType: 'kitchen', active: false };
  let cv = null, ctx = null, view = { s: 30, ox: 40, oy: 40 };
  function ensureCanvas() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.id = 'plan'; cv.setAttribute('aria-label', '평면도');
    $('stage').appendChild(cv); ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up);
    cv.addEventListener('dblclick', () => { if (st.tool === 'duct') { st.tool = 'select'; refresh(true); } });
    window.addEventListener('keydown', e => {
      if (!st.active || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { delSel(); e.preventDefault(); }
      if (e.key === 'Escape' || e.key === 'Enter') { st.tool = 'select'; refresh(true); }
    });
    new ResizeObserver(() => draw()).observe($('stage'));
  }
  D.enter = function () {
    if (!P) load();
    ensureCanvas();
    st.active = true;
    $('gl').style.visibility = 'hidden'; cv.hidden = false; $('hud').hidden = true;
    ['legend', 'stepCap'].forEach(i => { const e = $(i); if (e) e.hidden = true; });
    if (!st.selSys || !P.systems.some(s => s.id === st.selSys)) st.selSys = P.systems[0] && P.systems[0].id;
    refresh(true);
  };
  D.leave = function () { st.active = false; if (cv) cv.hidden = true; $('gl').style.visibility = ''; };

  function fit() {
    const r = $('stage').getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr);
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { L, W } = P.room, m = 54, top = 48;
    view.s = Math.max(4, Math.min((r.width - m * 2) / L, (r.height - m - top - 24) / W));
    view.ox = (r.width - L * view.s) / 2; view.oy = top + (r.height - top - 24 - W * view.s) / 2;
    return r;
  }
  const X = x => view.ox + x * view.s, Y = y => view.oy + y * view.s;
  const toM = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s }; };
  const clampR = (x, y) => ({ x: Math.max(0, Math.min(P.room.L, x)), y: Math.max(0, Math.min(P.room.W, y)) });

  function draw() {
    if (!cv || cv.hidden || !P) return;
    const r = fit(), { L, W } = P.room;
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.fillStyle = '#f4f6f9'; ctx.fillRect(0, 0, r.width, r.height);
    // 격자
    ctx.lineWidth = 1;
    for (let x = 0; x <= L + 1e-6; x += 0.5) { ctx.strokeStyle = x % 1 ? '#e8edf3' : '#d9e1ea'; ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(W)); ctx.stroke(); }
    for (let y = 0; y <= W + 1e-6; y += 0.5) { ctx.strokeStyle = y % 1 ? '#e8edf3' : '#d9e1ea'; ctx.beginPath(); ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(L), Y(y)); ctx.stroke(); }
    // 구역
    ctx.font = '600 12px "IBM Plex Sans KR", sans-serif'; ctx.textBaseline = 'top';
    P.zones.forEach(z => {
      const t = ZT[z.type] || ZT.etc, q = C.zoneQ(z, P.room.H), on = st.sel === z.id;
      ctx.fillStyle = t.color + (on ? '55' : '33'); ctx.fillRect(X(z.x), Y(z.y), z.w * view.s, z.h * view.s);
      ctx.strokeStyle = on ? '#0b4a8b' : t.color; ctx.lineWidth = on ? 2.5 : 1.5; ctx.strokeRect(X(z.x), Y(z.y), z.w * view.s, z.h * view.s);
      ctx.save(); ctx.beginPath(); ctx.rect(X(z.x), Y(z.y), z.w * view.s, z.h * view.s); ctx.clip(); // 글자는 구역 안에서만
      ctx.fillStyle = '#0d1b2e';
      const lx = X(z.x) + 6, ly = Y(z.y) + 5;
      ctx.fillText(`${t.name} ${fmt(q.A, 1)}㎡`, lx, ly);
      ctx.font = '11px "IBM Plex Sans KR", sans-serif'; ctx.fillStyle = '#334155';
      ctx.fillText(`${fmt(q.q)}㎥/h${q.n ? ' · ' + fmt(q.n) + '인' : ''}`, lx, ly + 16);
      ctx.font = '600 12px "IBM Plex Sans KR", sans-serif';
      ctx.restore();
      if (on) { ctx.fillStyle = '#0b4a8b'; ctx.fillRect(X(z.x + z.w) - 6, Y(z.y + z.h) - 6, 12, 12); }
    });
    // 외곽 + 치수
    ctx.strokeStyle = '#0b2a52'; ctx.lineWidth = 3; ctx.strokeRect(X(0), Y(0), L * view.s, W * view.s);
    ctx.fillStyle = '#0b2a52'; ctx.font = '700 12px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`가로 ${fmt(L, 1)}m`, X(L / 2), Y(0) - 20);
    ctx.save(); ctx.translate(X(0) - 22, Y(W / 2)); ctx.rotate(-Math.PI / 2); ctx.fillText(`세로 ${fmt(W, 1)}m`, 0, -6); ctx.restore();
    ctx.textAlign = 'left';
    // 덕트
    P.systems.forEach((sys, si) => {
      const pts = sys.route || []; if (!pts.length) return;
      const on = st.selSys === sys.id, col = on ? '#ea580c' : '#9a3412';
      ctx.strokeStyle = col; ctx.lineWidth = on ? 7 : 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))); ctx.stroke();
      ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 1.5; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))); ctx.stroke();
      ctx.font = '600 11px "IBM Plex Sans KR", sans-serif'; ctx.fillStyle = '#7c2d12'; ctx.textAlign = 'center';
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        ctx.fillText(`${fmt(l, 1)}m`, (X(pts[i].x) + X(pts[i - 1].x)) / 2, (Y(pts[i].y) + Y(pts[i - 1].y)) / 2 - 16);
      }
      const rr = C.route(sys);
      for (let i = 1; i < pts.length - 1; i++) {
        const a1 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x), a2 = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
        let d = Math.abs(a2 - a1) * 180 / Math.PI; if (d > 180) d = 360 - d;
        if (d >= 10) { ctx.fillStyle = '#b45309'; ctx.fillText(`${fmt(d)}°`, X(pts[i].x) + 14, Y(pts[i].y) + 4); }
      }
      void rr;
      ctx.textAlign = 'left';
      pts.forEach((p, i) => { ctx.fillStyle = i === 0 ? '#0b4a8b' : i === pts.length - 1 ? '#16a34a' : '#ea580c'; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), i === 0 || i === pts.length - 1 ? 7 : 4.5, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#0b4a8b'; ctx.font = '700 11px "IBM Plex Sans KR", sans-serif';
      ctx.fillText(`팬 · ${sys.name}`, X(pts[0].x) + 10, Y(pts[0].y) - 18);
      if (pts.length > 1) { const e = pts[pts.length - 1]; ctx.fillStyle = '#15803d'; ctx.fillText((V.duct.terminals.find(t => t.id === sys.terminal) || {}).name || '말단', X(e.x) + 10, Y(e.y) + 6); }
    });
    // 그리는 중인 구역
    if (st.drag && st.drag.mode === 'new') {
      const d = st.drag, x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#0b4a8b'; ctx.lineWidth = 2; ctx.strokeRect(X(x), Y(y), Math.abs(d.x1 - d.x0) * view.s, Math.abs(d.y1 - d.y0) * view.s); ctx.setLineDash([]);
      ctx.fillStyle = '#0b4a8b'; ctx.fillText(`${fmt(Math.abs(d.x1 - d.x0), 1)} × ${fmt(Math.abs(d.y1 - d.y0), 1)}m`, X(x) + 4, Y(y) - 16);
    }
    // 도구 안내
    const tip = st.tool === 'zone' ? `구역 그리기: 평면을 끌어서 '${ZT[st.zoneType].name}' 구역을 만드세요` : st.tool === 'duct' ? '덕트 그리기: 팬 위치부터 배출구까지 점을 클릭, 더블클릭·Enter로 끝' : '선택: 구역을 끌어 이동, 오른쪽 아래 손잡이로 크기 조절, Delete로 삭제';
    ctx.fillStyle = '#334155'; ctx.font = '12px "IBM Plex Sans KR", sans-serif'; ctx.fillText(tip, 14, r.height - 20);
  }

  /* ---------- 마우스 ---------- */
  function hitZone(m) { for (let i = P.zones.length - 1; i >= 0; i--) { const z = P.zones[i]; if (m.x >= z.x && m.x <= z.x + z.w && m.y >= z.y && m.y <= z.y + z.h) return z; } return null; }
  function hitPoint(m) {
    for (const sys of P.systems) for (let i = 0; i < (sys.route || []).length; i++) { const p = sys.route[i]; if (Math.hypot(p.x - m.x, p.y - m.y) * view.s < 10) return { sys, i }; }
    return null;
  }
  function down(e) {
    const m = toM(e); cv.setPointerCapture(e.pointerId);
    if (st.tool === 'zone') { const c = clampR(snap(m.x), snap(m.y)); st.drag = { mode: 'new', x0: c.x, y0: c.y, x1: c.x, y1: c.y }; return; }
    if (st.tool === 'duct') {
      let sys = P.systems.find(s => s.id === st.selSys); if (!sys) { addSystem(); sys = P.systems.find(s => s.id === st.selSys); }
      const c = clampR(snap(m.x), snap(m.y)), last = sys.route[sys.route.length - 1];
      if (!last || last.x !== c.x || last.y !== c.y) sys.route.push(c);
      refresh(false); return;
    }
    const hp = hitPoint(m);
    if (hp) { st.selSys = hp.sys.id; st.sel = null; st.drag = { mode: 'pt', sys: hp.sys, i: hp.i }; refresh(true); return; }
    const sz = P.zones.find(z => z.id === st.sel);
    if (sz && Math.abs(m.x - (sz.x + sz.w)) * view.s < 10 && Math.abs(m.y - (sz.y + sz.h)) * view.s < 10) { st.drag = { mode: 'size', z: sz }; return; }
    const z = hitZone(m);
    if (z) { st.sel = z.id; st.drag = { mode: 'move', z, dx: m.x - z.x, dy: m.y - z.y }; refresh(true); return; }
    st.sel = null; refresh(true);
  }
  function move(e) {
    const d = st.drag; if (!d) { cv.style.cursor = st.tool === 'select' ? 'default' : 'crosshair'; return; }
    const m = toM(e), { L, W } = P.room;
    if (d.mode === 'new') { const c = clampR(snap(m.x), snap(m.y)); d.x1 = c.x; d.y1 = c.y; }
    else if (d.mode === 'move') { d.z.x = Math.max(0, Math.min(L - d.z.w, snap(m.x - d.dx))); d.z.y = Math.max(0, Math.min(W - d.z.h, snap(m.y - d.dy))); }
    else if (d.mode === 'size') { d.z.w = Math.max(0.5, Math.min(L - d.z.x, snap(m.x - d.z.x))); d.z.h = Math.max(0.5, Math.min(W - d.z.y, snap(m.y - d.z.y))); }
    else if (d.mode === 'pt') { const c = clampR(snap(m.x), snap(m.y)); d.sys.route[d.i] = c; }
    refresh(false);
  }
  function up() {
    const d = st.drag; st.drag = null;
    if (d && d.mode === 'new') {
      const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
      if (w >= 0.5 && h >= 0.5) {
        const z = zoneFrom(st.zoneType, Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), w, h);
        P.zones.push(z); st.sel = z.id; st.tool = 'select';
        const sys = P.systems.find(s => s.id === st.selSys); if (sys && z.type !== 'living') sys.zoneIds.push(z.id);
      }
      refresh(true); return;
    }
    if (d) refresh(true);
  }
  function delSel() {
    if (st.sel) { P.zones = P.zones.filter(z => z.id !== st.sel); P.systems.forEach(s => { s.zoneIds = s.zoneIds.filter(i => i !== st.sel); }); st.sel = null; }
    else if (st.selSys) { const s = P.systems.find(x => x.id === st.selSys); if (s && s.route.length) s.route.pop(); }
    refresh(true);
  }
  function addSystem() {
    const s = { id: nid('s'), name: `배기 계통 ${P.systems.length + 1}`, kind: 'exhaust', zoneIds: [], dia: 0, vert: Math.max(1, P.room.H - 0.5), terminal: 'hoodcap', route: [], pick: null };
    P.systems.push(s); st.selSys = s.id; return s;
  }

  /* ---------- 패널 ---------- */
  function refresh(full) { save(); draw(); renderRight(); if (full) renderLeft(); }
  function renderLeft() {
    const p = P, r = p.room;
    const uses = FZ.USES.map(u => `<option value="${u.id}" ${u.id === r.use ? 'selected' : ''}>${esc(u.label)}</option>`).join('');
    const typeOpts = cur => V.zoneTypes.map(t => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    $('left').innerHTML = `
      <div><div class="eyebrow">제품사양 선택</div><h2>현장 치수로 사양 고르기</h2>
        <p class="muted small" style="margin-top:4px">공간 → 구역 → 덕트 순서로 넣으면 필요 환기량과 덕트 압력손실을 계산해 맞는 모델과 대수를 추천합니다.</p></div>
      <div class="card dz"><h3>① 공간 치수</h3>
        <div class="dgrid3"><label>가로(m)<input type="number" min="1" max="200" step="0.5" data-room="L" value="${r.L}"></label>
          <label>세로(m)<input type="number" min="1" max="200" step="0.5" data-room="W" value="${r.W}"></label>
          <label>높이(m)<input type="number" min="2" max="30" step="0.1" data-room="H" value="${r.H}"></label></div>
        <label class="drow">용도<select id="dUse">${uses}</select></label>
        <div class="row"><span class="small muted">바닥 ${fmt(r.L * r.W, 1)}㎡ · 체적 ${fmt(r.L * r.W * r.H)}㎥</span><button type="button" class="linkbtn" id="dReset">용도 예시로 구역 다시 채우기</button></div></div>
      <div class="card dz"><h3>② 구역 (설치 장소 구조)</h3>
        <div class="dtools" role="group" aria-label="평면 도구">
          <button type="button" data-tool="select" aria-pressed="${st.tool === 'select'}">선택·이동</button>
          <button type="button" data-tool="zone" aria-pressed="${st.tool === 'zone'}">구역 그리기</button>
          <select id="dZoneType" aria-label="그릴 구역 종류">${typeOpts(st.zoneType)}</select></div>
        <div class="dzones">${p.zones.map(z => zoneRow(z, typeOpts)).join('') || '<p class="muted small">평면도에서 구역을 그려 주세요.</p>'}</div></div>
      <div class="card dz"><h3>③ 덕트 계통</h3>
        <div class="dtools"><button type="button" data-tool="duct" aria-pressed="${st.tool === 'duct'}">덕트 경로 그리기</button><button type="button" id="dAddSys">계통 추가</button><button type="button" id="dClrRoute">경로 지우기</button></div>
        ${p.systems.map(s => sysRow(s)).join('')}</div>
      <div class="card dz"><h3>④ 선정 조건</h3>
        <label class="drow">운전 부하율 <span><input type="number" min="50" max="100" step="1" id="dLoad" value="${Math.round(p.load * 100)}"> %</span></label>
        <p class="small muted">정격 풍량의 ${Math.round(p.load * 100)}%로 운전해도 필요 환기량을 채우는 모델을 고릅니다. 전원 주파수는 위쪽 60/50Hz 전환을 따릅니다.</p>
        <div class="dtools"><button type="button" id="dExport">JSON 저장</button><label class="filebtn">JSON 불러오기<input type="file" id="dImport" accept="application/json" hidden></label><button type="button" id="dNew">새로 시작</button></div></div>`;
    bindLeft();
  }
  function zoneRow(z, typeOpts) {
    const t = ZT[z.type] || ZT.etc, q = C.zoneQ(z, P.room.H), on = st.sel === z.id;
    return `<div class="dzone ${on ? 'on' : ''}" data-zid="${z.id}">
      <div class="row"><span class="sw" style="background:${t.color}"></span><select data-zf="type">${typeOpts(z.type)}</select>
        <span class="small">${fmt(z.w, 1)}×${fmt(z.h, 1)}m · ${fmt(q.A, 1)}㎡</span><button type="button" class="linkbtn" data-zdel="${z.id}" aria-label="구역 삭제">삭제</button></div>
      <div class="dgrid3">
        ${t.tables ? `<label>테이블<input type="number" min="0" data-zf="tables" value="${z.tables}"></label><label>좌석/테이블<input type="number" min="1" data-zf="seats" value="${z.seats}"></label>` : `<label>인원<input type="number" min="0" data-zf="people" value="${z.people}"></label>`}
        ${t.hoods ? `<label>후드 수<input type="number" min="0" data-zf="hoods" value="${z.hoods}"></label>` : ''}
        <label>㎥/h·인<input type="number" min="0" data-zs="perPerson" value="${z.std.perPerson}"></label>
        <label>환기횟수<input type="number" min="0" step="0.5" data-zs="ach" value="${z.std.ach}"></label>
        <label>㎥/h·㎡<input type="number" min="0" data-zs="perArea" value="${z.std.perArea}"></label></div>
      <div class="small muted">필요 ${fmt(q.q)}㎥/h (${esc(q.by)}) · 기준: ${esc(t.src)}</div></div>`;
  }
  function sysRow(s) {
    const on = st.selSys === s.id, res = C.system(s, P);
    return `<div class="dsys ${on ? 'on' : ''}" data-sid="${s.id}">
      <div class="row"><input type="text" data-sf="name" value="${esc(s.name)}" aria-label="계통 이름"><button type="button" class="linkbtn" data-ssel="${s.id}">${on ? '편집 중' : '선택'}</button>${P.systems.length > 1 ? `<button type="button" class="linkbtn" data-sdel="${s.id}">삭제</button>` : ''}</div>
      <div class="chips">${P.zones.map(z => `<label class="chk"><input type="checkbox" data-szone="${z.id}" ${s.zoneIds.includes(z.id) ? 'checked' : ''}>${esc((ZT[z.type] || ZT.etc).name)} ${fmt(C.zoneArea(z), 0)}㎡</label>`).join('')}</div>
      <div class="dgrid3"><label>덕트 Ø(mm)<select data-sf="dia"><option value="0" ${!s.dia ? 'selected' : ''}>자동 (${res.dia})</option>${V.duct.sizes.map(d => `<option value="${d}" ${s.dia === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label>수직 길이(m)<input type="number" min="0" step="0.5" data-sf="vert" value="${s.vert}"></label>
        <label>말단<select data-sf="terminal">${V.duct.terminals.map(t => `<option value="${t.id}" ${t.id === s.terminal ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label></div>
      <div class="small muted">평면 ${fmt(res.r.Lh, 1)}m + 수직 ${fmt(s.vert, 1)}m · 꺾임 ${res.r.bends.length}곳 · ${s.route.length < 2 ? '평면도에 경로를 그려 주세요' : '경로 ' + s.route.length + '점'}</div></div>`;
  }
  function bindLeft() {
    const L0 = $('left');
    L0.querySelectorAll('[data-room]').forEach(i => i.addEventListener('change', () => {
      const k = i.dataset.room, v = Math.max(+i.min, Math.min(+i.max, +i.value || P.room[k]));
      P.room[k] = k === 'H' ? Math.round(v * 10) / 10 : snap(v);
      P.zones.forEach(z => { z.x = Math.min(z.x, Math.max(0, P.room.L - 0.5)); z.y = Math.min(z.y, Math.max(0, P.room.W - 0.5)); z.w = Math.min(z.w, P.room.L - z.x); z.h = Math.min(z.h, P.room.W - z.y); });
      P.systems.forEach(s => { s.route = s.route.map(p => clampR(p.x, p.y)); });
      refresh(true);
    }));
    $('dUse').addEventListener('change', e => { P.room.use = e.target.value; refresh(true); });
    $('dReset').addEventListener('click', () => { const r = P.room; const load0 = P.load; P = newProject(r.use, r.L, r.W, r.H); P.load = load0; st.sel = null; st.selSys = P.systems[0].id; refresh(true); });
    L0.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { st.tool = b.dataset.tool; if (st.tool === 'duct' && !P.systems.length) addSystem(); refresh(true); }));
    $('dZoneType').addEventListener('change', e => { st.zoneType = e.target.value; st.tool = 'zone'; refresh(true); });
    L0.querySelectorAll('[data-zid]').forEach(row => {
      const z = P.zones.find(x => x.id === row.dataset.zid);
      row.addEventListener('click', e => { if (e.target.closest('input,select,button')) return; st.sel = z.id; refresh(true); });
      row.querySelectorAll('[data-zf]').forEach(i => i.addEventListener('change', () => {
        const k = i.dataset.zf;
        if (k === 'type') { const t = ZT[i.value]; z.type = i.value; z.std = { perPerson: t.perPerson || 0, ach: t.ach || 0, perArea: t.perArea || 0 }; if (t.tables && !z.tables) z.tables = Math.max(1, Math.round(C.zoneArea(z) / 2.5)); if (t.density && !z.people) z.people = Math.max(1, Math.round(C.zoneArea(z) * t.density)); }
        else z[k] = Math.max(0, +i.value || 0);
        refresh(true);
      }));
      row.querySelectorAll('[data-zs]').forEach(i => i.addEventListener('change', () => { z.std[i.dataset.zs] = Math.max(0, +i.value || 0); refresh(true); }));
    });
    L0.querySelectorAll('[data-zdel]').forEach(b => b.addEventListener('click', () => { st.sel = b.dataset.zdel; delSel(); }));
    L0.querySelectorAll('[data-sid]').forEach(row => {
      const s = P.systems.find(x => x.id === row.dataset.sid);
      row.querySelectorAll('[data-sf]').forEach(i => i.addEventListener('change', () => {
        const k = i.dataset.sf; s[k] = k === 'name' || k === 'terminal' ? i.value : Math.max(0, +i.value || 0); s.pick = null; refresh(true);
      }));
      row.querySelectorAll('[data-szone]').forEach(c => c.addEventListener('change', () => { const id = c.dataset.szone; s.zoneIds = c.checked ? [...new Set([...s.zoneIds, id])] : s.zoneIds.filter(x => x !== id); s.pick = null; refresh(true); }));
    });
    L0.querySelectorAll('[data-ssel]').forEach(b => b.addEventListener('click', () => { st.selSys = b.dataset.ssel; st.sel = null; refresh(true); }));
    L0.querySelectorAll('[data-sdel]').forEach(b => b.addEventListener('click', () => { P.systems = P.systems.filter(s => s.id !== b.dataset.sdel); st.selSys = P.systems[0] && P.systems[0].id; refresh(true); }));
    $('dAddSys').addEventListener('click', () => { addSystem(); st.tool = 'duct'; refresh(true); });
    $('dClrRoute').addEventListener('click', () => { const s = P.systems.find(x => x.id === st.selSys); if (s) s.route = []; refresh(true); });
    $('dLoad').addEventListener('change', e => { P.load = Math.max(0.5, Math.min(1, (+e.target.value || 85) / 100)); refresh(true); });
    $('dExport').addEventListener('click', () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }));
      a.download = 'fanzic-설계.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('dImport').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => { try { const o = JSON.parse(t); if (o.room && o.zones && o.systems) { P = o; st.sel = null; st.selSys = P.systems[0] && P.systems[0].id; refresh(true); } } catch (err) { alert('JSON 형식이 맞지 않습니다.'); } });
    });
    $('dNew').addEventListener('click', () => { P = newProject(P.room.use, P.room.L, P.room.W, P.room.H); st.sel = null; st.selSys = P.systems[0].id; refresh(true); });
  }

  function renderRight() {
    if (!st.active) return;
    const p = P, H = p.room.H;
    const zq = p.zones.map(z => ({ z, q: C.zoneQ(z, H) })), tot = zq.reduce((a, x) => a + x.q.q, 0);
    const sysHtml = p.systems.map(s => {
      const res = C.system(s, p), ls = res.ls;
      const cands = res.Q > 0 ? C.candidates(res, p).slice(0, 5) : [];
      const pick = s.pick && cands.find(c => c.pid === s.pick.pid && c.idx === s.pick.idx) || cands[0];
      return `<div class="card"><div class="row"><h3>${esc(s.name)}</h3><span class="small muted">담당 ${res.zs.length}구역</span></div>
        <div class="specs"><div><span>필요 환기량</span><em>${fmt(res.Q)}㎥/h</em></div><div><span>선정 기준 (÷${Math.round(p.load * 100)}%)</span><em>${fmt(res.Qsel)}㎥/h</em></div><div><span>덕트 압력손실</span><em>${ls ? fmt(res.mmAq, 1) + 'mmAq' : '–'}</em></div></div>
        ${ls ? `<p class="small muted">덕트 Ø${res.dia}${res.autoDia ? '(자동)' : ''} · 길이 ${fmt(res.r.L, 1)}m · 꺾임 ${res.r.bends.length}곳(K ${fmt(res.ls.kSum, 2)}) · 풍속 ${fmt(ls.v, 1)}m/s${ls.v > 12 ? ' <b style="color:#b91c1c">풍속 과다(소음) – 지름을 키우세요</b>' : ''} · 마찰 ${fmt(ls.fric / 9.81, 1)} + 국부 ${fmt(ls.fit / 9.81, 1)}mmAq</p>` : '<p class="small muted">담당 구역을 체크하면 계산합니다.</p>'}
        ${cands.length ? `<div class="tw"><table class="spect"><thead><tr><th>추천</th><th>모델</th><th class="num">대수</th><th class="num">대당 풍량*</th><th class="num">부하율</th><th class="num">kW</th></tr></thead><tbody>
          ${cands.map(c => `<tr class="${c === pick ? 'on' : ''}" data-pick="${s.id}|${c.pid}|${c.idx}" tabindex="0"><td>${c.rating ? `<span class="rate ${({ '◎': 'r0', '○': 'r1', '△': 'r2' })[c.rating]}">${c.rating}</span>` : ''}${esc(c.name)}</td><td>${esc(c.model)}${c.known ? '' : ' <span class="chip warn">정압 미확인</span>'}${c.kitchenOk ? '' : ' <span class="chip warn">기름기 주의</span>'}</td><td class="num">${c.n}</td><td class="num">${fmt(c.q)}</td><td class="num">${fmt(c.load * 100)}%</td><td class="num">${fmt(c.kw, 2)}</td></tr>`).join('')}
          </tbody></table></div><p class="note">* 대당 풍량은 덕트 압력손실을 넣은 운전점 추정치(성능곡선 대신 정격 풍량·정압으로 근사). 행을 누르면 선택됩니다.</p>
          ${pick ? `<button type="button" class="ctrl primary wide" data-sim="${s.id}|${pick.pid}|${pick.idx}">${esc(pick.name)} ${esc(pick.model)} ${pick.n}대로 3D 시뮬레이션 →</button>` : ''}` : (res.Q > 0 ? '<p class="note">이 조건(풍량·정압)을 만족하는 덕트형 모델이 없습니다. 계통을 나누거나 덕트 지름을 키워 보세요.</p>' : '')}</div>`;
    }).join('');
    $('right').innerHTML = `
      <div><div class="eyebrow">결과</div><h2>필요 환기량 · 추천 사양</h2></div>
      <div class="card"><h3>구역별 필요 환기량</h3><div class="tw"><table class="spect"><thead><tr><th>구역</th><th class="num">면적㎡</th><th class="num">인원</th><th class="num">㎥/h</th><th>기준</th></tr></thead><tbody>
        ${zq.map(({ z, q }) => `<tr><td>${esc((ZT[z.type] || ZT.etc).name)}</td><td class="num">${fmt(q.A, 1)}</td><td class="num">${fmt(q.n)}</td><td class="num">${fmt(q.q)}</td><td>${esc(q.by)}</td></tr>`).join('')}
        <tr class="on"><td>합계</td><td class="num">${fmt(zq.reduce((a, x) => a + x.q.A, 0), 1)}</td><td class="num">${fmt(zq.reduce((a, x) => a + x.q.n, 0))}</td><td class="num">${fmt(tot)}</td><td>환기횟수 환산 ${fmt(tot / (p.room.L * p.room.W * H), 1)}회/h</td></tr>
      </tbody></table></div></div>
      ${sysHtml}
      <p class="note">기준값은 법정 기준·설계 관행의 참고값이며 현장 조건과 최신 고시로 확인하세요. 다음 단계에서 냉난방 부하·급기 계통을 더할 예정입니다.</p>`;
    $('right').querySelectorAll('[data-pick]').forEach(tr => {
      const pickRow = () => { const [sid, pid, idx] = tr.dataset.pick.split('|'); const s = P.systems.find(x => x.id === sid); s.pick = { pid, idx: +idx }; save(); renderRight(); };
      tr.addEventListener('click', pickRow); tr.addEventListener('keydown', e => { if (e.key === 'Enter') pickRow(); });
    });
    $('right').querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () => {
      const [, pid, idx] = b.dataset.sim.split('|');
      FZ.SEL.spec[pid] = +idx; FZ.SEL.manual[pid] = true;
      const cond = FZ.env.defaultCond(P.room.use); cond.area = Math.round(P.room.L * P.room.W); cond.H = P.room.H;
      D.leave();
      if (FZ.app && FZ.app.enterEnv) FZ.app.enterEnv(cond, { sel: [pid], dir: { [pid]: 'exhaust' } });
    }));
  }

  D.project = () => P;
  D.refresh = () => refresh(true);
  // 평면 좌표(m) → 화면 좌표 (자동 점검용)
  D.toScreen = (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + X(x), y: r.top + Y(y) }; };
  FZ.design = D;
})();
