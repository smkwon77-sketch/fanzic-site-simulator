/* 앱 상태·화면 구성
   view: home | env(환경에서 찾기) | product(제품에서 찾기)
   env 단계: cond(환경 설정) → pick(제품 선택) → install → effect → summary */
(function () {
  const T = THREE, E = FZ.engine, P = FZ.PRODUCTS, I = FZ.install, X = FZ.fx, R = FZ.recommend, SC = FZ.showcase;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d = 0) => (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const RCLS = { '◎': 'r0', '○': 'r1', '△': 'r2' };
  const role = id => P[id].role;
  const tag = id => FZ.TAGS[id] || { solves: [], dirs: [], def: null, area: [0, 1e9] };

  const st = {
    view: 'home', step: 'cond', cond: null, site: null, sel: [], dir: {}, qty: {}, rec: [],
    prm: { ...FZ.DEFAULTS }, filter: '전체', pfilter: '전체',
    stepI: 0, stepK: 0, stepPlay: true, t: 0, simPlay: false, heat: 'temp', metric: 'temp', spin: 0,
    pid: 'prop_belt', pmode: 'exhaust', pOn: true
  };
  let S = null, SHOW = null;
  let liveTimer = 0, heatTimer = 0, lastRun = null, condTimer = 0;

  /* ---------- 공통 ---------- */
  function rateBadge(r) { return r ? `<span class="rate ${RCLS[r]}" title="${FZ.catalog.RATING_LABEL[r]}">${r}</span>` : ''; }
  function photo(pid) {
    const im = SC.imageOf(pid);
    return `<span class="ph"><img src="${im.src}" alt="${esc(P[pid].name)}" loading="lazy">${im.real ? '' : '<span class="soon">사진 준비 중 · 3D 모델</span>'}</span>`;
  }
  function dirSeg(pid, cur, attr) {
    const ds = tag(pid).dirs.filter(d => d !== 'circ');
    if (ds.length === 0) return tag(pid).dirs.includes('circ') ? '<span class="chip">순환형</span>' : '';
    return `<span class="seg" role="group" aria-label="공기 방향">${ds.map(d => `<button type="button" class="${d === 'intake' ? 'in' : 'ex'}" ${attr}="${pid}" data-d="${d}" aria-pressed="${cur === d}">${FZ.DIR_LABEL[d]}</button>`).join('')}</span>`;
  }
  function recQty(site) { const q = {}; site.products.forEach(it => { q[it.id] = FZ.sim.recommend(site, it); }); return q; }
  function computeFor(site, qty) { return FZ.sim.compute(site, qty, st.prm); }
  function mountOf(it) {
    return { wallEnd: 'wall', wallSide: 'wall', roofLine: 'roof', ceilingGrid: 'ceiling', hangGrid: 'hang', ceilingSmall: 'ceilingSmall', ductLine: 'duct', rack: 'rack', outdoorPoles: 'pole', floorSpots: 'floor', floorWall: 'floor', exterior: 'exterior', none: 'none' }[it.place];
  }
  function sizingText(site, it) {
    const s = it.sizing, p = P[it.id];
    switch (s.type) {
      case 'share': return `${FZ.sim.targetText(site)} 기준` + (s.share < 1 ? ` · ${Math.round(s.share * 100)}% 분담` : '');
      case 'matchWall': return '벽부 고압팬 대수만큼';
      case 'cover': return `대당 약 ${fmt(p.cover)}㎡`;
      case 'perArea': return `${s.value}㎡당 1대`;
      case 'perWorkers': return `작업자 ${s.value}명당 1대`;
      case 'fixed': return `기본 ${s.n}대`;
    }
    return '';
  }
  function status(v, limit, lower = true) {
    if (limit == null) return null;
    const ok = lower ? v <= limit : v >= limit, near = lower ? v <= limit * 1.15 : v >= limit * 0.85;
    return ok ? ['good', '기준 충족'] : near ? ['mid', '기준 근접'] : ['bad', '기준 초과'];
  }
  function shortName(n) { return n.replace(/\(.*?\)/g, '').trim(); }
  function effectRows(r) {
    const rows = [];
    rows.push({ k: '환기 횟수', u: '회/h', a: r.ach0, b: r.ach, d: 1 });
    rows.push({ k: '총 환기량', u: '㎥/h', a: r.Q0, b: r.Q, d: 0 });
    if (r.pol) rows.push({ k: r.pol.name + (r.pol.filtered ? ' (필터 포함)' : ''), u: r.pol.unit, a: r.pol.c0, b: r.pol.c1, d: r.pol.dec, lim: r.pol.limit });
    if (r.pm) rows.push({ k: r.pm.name + (r.pm.filtered ? ' (필터 포함)' : ''), u: r.pm.unit, a: r.pm.c0, b: r.pm.c1, d: 0, lim: r.pm.limit });
    if (r.tempOn) {
      rows.push({ k: '실내 온도', u: '℃', a: r.T0, b: r.T1, d: 1 });
      if (st.site.mode !== 'it') rows.push({ k: r.animal ? '체감 온도(가축)' : '체감 온도', u: '℃', a: r.Teff0, b: r.steady.Teff, d: 1 });
    }
    rows.push({ k: '평균 풍속', u: 'm/s', a: r.v0, b: r.v1, d: 2 });
    const p = r.prod;
    if (p) {
      if (p.kind === 'livestock') {
        rows.push({ k: '열 스트레스 지수(THI)', u: '', a: p.thi0, b: p.thi1, d: 1 });
        rows.push({ k: '고온기 폐사율', u: '%', a: p.mort0, b: p.mort1, d: 1 });
      } else rows.push({ k: p.label, u: p.unit, a: p.before, b: p.after, d: 1, lim: p.limit });
    }
    return rows;
  }
  function fade(fn) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 300); }

  /* ---------- 초기화 ---------- */
  function init() {
    $('logo').src = FZ.LOGO; $('homeLogo').src = FZ.LOGO;
    E.init($('gl'));
    E.frameFns.push(tick);
    $('stripEnv').innerHTML = ['prop_belt', 'double_sirocco', 'hvls_bldc', 'purigen'].map(id => `<img src="assets/products/${FZ.TAGS[id].image}" alt="">`).join('');
    $('stripProd').innerHTML = ['sirocco_sus.jpg', 'duct_square.jpg', 'propeller.jpg', 'hoodcap.jpg'].map(f => `<img src="assets/products/${f}" alt="">`).join('');
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    document.querySelectorAll('.modes [data-mode]').forEach(b => b.addEventListener('click', () => go(b.dataset.mode)));
    $('logo').addEventListener('click', () => { $('home').hidden = false; setModeButtons(null); });
  }
  function setModeButtons(m) { document.querySelectorAll('.modes [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m)); }
  function go(mode) {
    $('home').hidden = true;
    if (mode === 'matrix') { if (st.view === 'home') enterEnv(); openMatrix(); return; }
    if (mode === 'product') enterProduct(st.pid); else enterEnv(st.cond);
  }

  /* =========================================================
     환경에서 찾기
     ========================================================= */
  function enterEnv(cond, preset) {
    st.view = 'env'; setModeButtons('env');
    st.cond = cond ? JSON.parse(JSON.stringify(cond)) : FZ.env.defaultCond('factory');
    st.step = preset ? 'pick' : 'cond';
    buildEnv(preset);
    renderAll();
  }
  // 조건 → 가상 현장 + 추천 (preset: {sel, dir} 이면 그 선택을 유지)
  function buildEnv(preset) {
    st.site = FZ.env.build(st.cond);
    st.rec = R.set(st.cond);
    if (preset) { st.sel = preset.sel; st.dir = preset.dir || {}; }
    else { st.sel = st.rec.map(x => x.id); st.dir = {}; }
    st.sel.forEach(id => { if (!st.dir[id]) st.dir[id] = tag(id).def; });
    applySel(false);
    disposeSite(); buildSite();
  }
  function applySel(rebuild = true) {
    st.site.products = FZ.catalog.items(st.site, st.sel, st.dir);
    st.qty = recQty(st.site);
    st.res = computeFor(st.site, st.qty);
    if (rebuild && S) rebuildFans();
  }
  function setSel(ids) {
    st.sel = ids; ids.forEach(id => { if (!st.dir[id]) st.dir[id] = tag(id).def; });
    if (st.step === 'install') { st.stepI = 0; st.stepK = 0; st.stepPlay = true; }
    applySel(); renderLeft(); renderRight(); renderHud();
  }

  function buildSite() {
    const site = st.site, { L, W, H } = site.dims;
    const scene = new T.Scene();
    scene.background = new T.Color(0xeef1f5);
    const span = Math.max(L, W) * 0.7 + 12;
    E.lights(scene, span);
    const gsz = Math.ceil(span * 5 / 10) * 10;
    const grid = new T.GridHelper(gsz, Math.ceil(gsz / 2), 0xcfd7e0, 0xdfe5ec);
    grid.position.y = -0.21; scene.add(grid);
    const ground = new T.Mesh(new T.PlaneGeometry(span * 5, span * 5), new T.MeshStandardMaterial({ color: 0xe8ecf1, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.23; ground.receiveShadow = true; scene.add(ground);
    scene.add(FZ.models.building(site, false));
    const inter = FZ.models.interior(site); scene.add(inter);
    inter.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const panel = new T.Group();
    const pb = new T.Mesh(new T.BoxGeometry(0.8, 1.5, 0.35), FZ.models.MAT.navy); pb.position.y = 0.95; panel.add(pb);
    const scr = new T.Mesh(new T.PlaneGeometry(0.5, 0.3), new T.MeshBasicMaterial({ color: 0x22d3ee })); scr.position.set(0, 1.3, 0.18); panel.add(scr);
    panel.position.set(-L / 2 + 0.9, 0, -W / 2 + 0.6); scene.add(panel);
    S = { scene, panelPos: new T.Vector3(-L / 2 + 0.9, 1.7, -W / 2 + 0.6), fanRoot: new T.Group(), groups: [] };
    scene.add(S.fanRoot);
    rebuildFans();
    E.scene = scene;
    const o = E.orbit, big = Math.max(L, W);
    o.minR = Math.max(4, big * 0.25); o.maxR = big * 3 + 40; o.minPhi = 0.15; o.maxPhi = 1.48; o.auto = 0;
    const slim = Math.min(1, W / L), asp = Math.max(0.6, E.camera.aspect || 1);
    const hf = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(E.camera.fov / 2)) * asp);
    const fit = big * 0.5 / Math.tan(hf / 2);
    o.set({ target: new T.Vector3(0, H * 0.3, 0), radius: fit * (slim < 0.3 ? 1.0 : 0.95) + H * 1.5 + 4, theta: 0.2 + 0.55 * slim, phi: slim < 0.3 ? 0.92 : 0.98 }, 0);
  }
  function rebuildFans() {
    const site = st.site;
    S.groups.forEach(g => S.fanRoot.remove(g.group));
    if (S.particles) S.particles.dispose();
    if (S.heatmap) S.heatmap.dispose();
    const items = site.products.map(it => ({ ...it, n: st.qty[it.id] }));
    const pls = FZ.models.placements(site, items);
    S.groups = pls.map(pl => { const g = FZ.models.installGroup(pl, site, S.panelPos); S.fanRoot.add(g.group); return g; });
    S.field = new X.Field(site, pls);
    const n = Math.round(Math.min(2400, Math.max(1200, Math.max(site.dims.L, site.dims.W) * 22)));
    S.particles = new X.Particles(S.scene, site, S.field, n);
    S.heatmap = new X.Heatmap(S.scene, site, S.field);
    lastRun = null;
    st.res = computeFor(site, st.qty);
    applyTabVisibility();
  }
  function disposeSite() {
    if (!S) return;
    if (S.particles) S.particles.dispose();
    if (S.heatmap) S.heatmap.dispose();
    S.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    S = null;
  }

  /* ---------- 렌더 ---------- */
  function renderAll() { $('hint').hidden = false; renderLeft(); renderRight(); renderHud(); applyTabVisibility(); }
  function renderLeft() {
    if (st.view === 'product') return renderProductList();
    const keep = $('left').scrollTop;
    if (st.step === 'cond') renderCond(); else renderSelected();
    $('left').scrollTop = keep;
  }
  function renderRight() {
    if (st.view === 'product') return renderProductDetail();
    st.res = computeFor(st.site, st.qty);
    if (st.step === 'cond' || st.step === 'pick') renderRecommend();
    else if (st.step === 'install') renderInstall();
    else if (st.step === 'effect') renderEffect(st.res);
    else renderSummaryPanel();
  }

  // ① 환경 설정
  function renderCond() {
    const c = st.cond, u = FZ.USES.find(x => x.id === c.use);
    const areaMax = { house: 400, commercial: 3000, hospital: 5000, restaurant: 1000 }[c.use] || 20000;
    $('left').innerHTML = `
      <div><div class="eyebrow">① 환경 설정</div><h2>어떤 공간인가요?</h2>
        <p class="muted small" style="margin-top:4px">조건을 바꾸면 3D 공간과 오른쪽 추천 제품이 바로 바뀝니다.</p></div>
      <div class="fset"><span class="lab">공간 용도</span>
        <div class="chips">${FZ.USES.map(x => `<button type="button" class="tog" data-use="${x.id}" aria-pressed="${x.id === c.use}">${esc(x.label)}</button>`).join('')}</div></div>
      <div class="fset"><span class="lab">면적 <span class="muted">바닥 면적</span></span>
        <div class="range"><input type="range" id="area" min="10" max="${areaMax}" step="${areaMax > 5000 ? 50 : 5}" value="${Math.min(areaMax, c.area)}" aria-label="면적"><output id="areaOut">${fmt(c.area)}㎡</output></div></div>
      <div class="fset"><span class="lab">천장 높이</span>
        <div class="range"><input type="range" id="hgt" min="2.2" max="25" step="0.1" value="${c.H}" aria-label="천장 높이"><output id="hgtOut">${c.H}m</output></div></div>
      <div class="fset"><span class="lab">주된 문제 <span class="muted">여러 개 선택</span></span>
        <div class="chips">${FZ.PROBLEMS.map(x => `<button type="button" class="tog" data-prob="${x.id}" aria-pressed="${c.problems.includes(x.id)}">${x.label}</button>`).join('')}</div></div>
      <div class="fset"><span class="lab">설치 가능 위치</span>
        <div class="chips">${FZ.MOUNTS.map(x => `<button type="button" class="tog" data-mnt="${x.id}" aria-pressed="${!!c.mounts[x.id]}">${x.label}</button>`).join('')}</div></div>
      <div class="fset"><span class="lab">특이사항</span>
        <div class="chips">${FZ.SPECIALS.map(x => `<button type="button" class="tog" data-spc="${x.id}" aria-pressed="${!!c.special[x.id]}">${x.label}</button>`).join('')}</div></div>
      <button type="button" class="ctrl primary wide" id="toPick">추천 제품 확인하기 →</button>
      <p class="note">면적과 천장 높이로 공간 크기를 만들고, 용도별 기본 조건(발열·인원·자연환기)을 면적에 맞춰 조정합니다. "${esc(u.label)}" 기준 기본값입니다.</p>`;
    const L = $('left');
    L.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => { st.cond = FZ.env.defaultCond(b.dataset.use); condChanged(true); }));
    L.querySelectorAll('[data-prob]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.prob, ps = st.cond.problems;
      st.cond.problems = ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id];
      if (!st.cond.problems.length) st.cond.problems = [id];
      condChanged(true);
    }));
    L.querySelectorAll('[data-mnt]').forEach(b => b.addEventListener('click', () => { st.cond.mounts[b.dataset.mnt] = !st.cond.mounts[b.dataset.mnt]; condChanged(true); }));
    L.querySelectorAll('[data-spc]').forEach(b => b.addEventListener('click', () => { st.cond.special[b.dataset.spc] = !st.cond.special[b.dataset.spc]; condChanged(true); }));
    $('area').addEventListener('input', e => { st.cond.area = +e.target.value; $('areaOut').textContent = fmt(st.cond.area) + '㎡'; condChanged(false); });
    $('hgt').addEventListener('input', e => { st.cond.H = +e.target.value; $('hgtOut').textContent = st.cond.H + 'm'; condChanged(false); });
    $('toPick').addEventListener('click', () => setStep('pick'));
  }
  function condChanged(rerenderLeft) {
    clearTimeout(condTimer);
    const run = () => { buildEnv(); if (rerenderLeft) renderLeft(); renderRight(); renderHud(); applyTabVisibility(); };
    if (rerenderLeft) run(); else condTimer = setTimeout(run, 220);
  }

  // ②~⑤ 왼쪽: 선택한 제품
  function renderSelected() {
    const s = st.site, units = st.sel.reduce((a, id) => a + (st.qty[id] || 0), 0);
    const hasEx = st.sel.some(id => role(id) === 'exhaust' && st.dir[id] === 'exhaust');
    const hasIn = st.sel.some(id => role(id) === 'exhaust' && st.dir[id] === 'intake');
    $('left').innerHTML = `
      <div><div class="eyebrow">${esc(s.name)} · ${esc(s.sub)}</div><h2>선택한 제품</h2>
        <div class="chips" style="margin-top:6px">${s.problems.map(p => `<span class="chip">${esc(FZ.PROBLEMS.find(x => x.id === p).label)}</span>`).join('')}
          <button type="button" class="linkbtn" id="editCond">조건 바꾸기</button></div></div>
      <div class="row"><span class="small"><b>${st.sel.length}종</b> · 총 <span class="num">${units}</span>대</span><button type="button" class="linkbtn" id="resetQty">권장 대수로</button></div>
      <div class="flowkey"><span><i style="background:var(--intake)"></i>흡기(급기) 신선 공기</span><span><i style="background:var(--exhaust)"></i>배기 오염 공기</span></div>
      ${hasIn && !hasEx ? '<p class="chip warn" style="white-space:normal">배기 제품이 없어 실내 공기는 문·창 틈으로 빠진다고 가정했습니다.</p>' : ''}
      ${st.sel.length ? st.sel.map(id => selCard(id)).join('') : '<p class="muted small">오른쪽 추천·다른 제품에서 제품을 넣어 주세요.</p>'}`;
    $('editCond').addEventListener('click', () => setStep('cond'));
    $('resetQty').addEventListener('click', () => { st.qty = recQty(st.site); rebuildFans(); renderLeft(); renderRight(); });
    bindSelControls($('left'));
  }
  function selCard(id) {
    const s = st.site, p = P[id], it = s.products.find(x => x.id === id), rt = FZ.catalog.rating(s.id, id);
    return `<div class="pcard on">${photo(id)}
      <div class="pinfo">
        <div class="row" style="align-items:flex-start"><div><b>${esc(p.name)}</b><div class="model">${esc(p.model)}</div></div>${rateBadge(rt && rt.r)}</div>
        <div class="pact">
          <span class="stepper" role="group" aria-label="${esc(p.name)} 수량"><button type="button" data-q="-1" data-id="${id}" aria-label="한 대 줄이기">−</button><output class="num">${st.qty[id]}</output><button type="button" data-q="1" data-id="${id}" aria-label="한 대 늘리기">+</button></span>
          ${dirSeg(id, st.dir[id], 'data-dir')}
        </div>
        <span class="small muted">${esc(I.MOUNT_LABEL[mountOf(it)])} · 권장 ${FZ.sim.recommend(s, it)}대 (${esc(sizingText(s, it))})</span>
        <button type="button" class="linkbtn" style="align-self:flex-start;color:var(--muted)" data-remove="${id}">빼기</button>
      </div></div>`;
  }
  function bindSelControls(root) {
    root.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id; st.qty[id] = Math.max(1, Math.min(40, st.qty[id] + +b.dataset.q));
      st.res = computeFor(st.site, st.qty); rebuildFans(); renderLeft(); renderRight();
    }));
    root.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => { st.dir[b.dataset.dir] = b.dataset.d; applySel(); renderLeft(); renderRight(); }));
    root.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => setSel(st.sel.filter(x => x !== b.dataset.remove))));
    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.add;
      if (st.step === 'cond') st.step = 'pick';
      setSel(st.sel.includes(id) ? st.sel.filter(x => x !== id) : [...st.sel, id]);
    }));
  }

  // ①② 오른쪽: 추천 + 다른 제품
  function renderRecommend() {
    const c = st.cond, cands = R.candidates(c), recIds = st.rec.map(x => x.id);
    const others = cands.filter(x => !recIds.includes(x.id));
    const groups = ['전체', ...new Set(others.map(x => P[x.id].group))];
    if (!groups.includes(st.filter)) st.filter = '전체';
    const list = others.filter(x => st.filter === '전체' || P[x.id].group === st.filter);
    $('right').innerHTML = `
      <div><div class="eyebrow">② 추천 제품</div><h2>이 환경에 맞는 팬직 제품</h2>
        <p class="muted small" style="margin-top:4px">용도 적합도(「제품별 용도 메트릭스」)·해결하는 문제·설치 위치·특이사항으로 점수를 매겨 역할별로 골랐습니다.</p></div>
      <div class="rec">${st.rec.length ? st.rec.map(x => recCard(x)).join('') : '<p class="muted small">조건에 맞는 제품이 없습니다. 설치 가능 위치를 더 열어 보세요.</p>'}</div>
      ${st.step === 'cond' ? '<button type="button" class="ctrl primary wide" id="toPick2">이 추천으로 진행 →</button>' : '<button type="button" class="ctrl primary wide" id="toInstall">설치 과정 보기 →</button>'}
      <div class="row"><h3>다른 제품 보기 <span class="muted small">${others.length}종</span></h3></div>
      <div class="filt" role="group" aria-label="제품군">${groups.map(g => `<button type="button" class="fchip" data-f="${esc(g)}" aria-pressed="${g === st.filter}">${esc(g)}</button>`).join('')}</div>
      <div class="grid">${list.map(x => tileHtml(x)).join('')}</div>
      <p class="note">사진이 없는 제품은 3D 모델 그림으로 대신 보여 줍니다. 효과·적합도는 참고용이며 현장 실측 후 확정합니다.</p>`;
    const Rp = $('right');
    Rp.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { st.filter = b.dataset.f; renderRight(); }));
    const tp = $('toPick2'); if (tp) tp.addEventListener('click', () => setStep('pick'));
    const ti = $('toInstall'); if (ti) ti.addEventListener('click', () => setStep('install'));
    bindSelControls(Rp);
  }
  function recCard(x) {
    const id = x.id, p = P[id], on = st.sel.includes(id);
    return `<div class="pcard ${on ? 'on' : ''}">${photo(id)}
      <div class="pinfo">
        <div class="row" style="align-items:flex-start"><div><b>${esc(p.name)}</b><div class="model">${esc(p.model)}</div></div>${rateBadge(x.rating && x.rating.r)}</div>
        <div class="chips">${x.reasons.map(r => `<span class="chip ok">${esc(r)}</span>`).join('')}</div>
        <div class="pact">
          <button type="button" class="ctrl ${on ? '' : 'primary'}" data-add="${id}">${on ? '✓ 선택됨 · 빼기' : '+ 넣기'}</button>
          ${on ? dirSeg(id, st.dir[id], 'data-dir') : ''}
        </div>
      </div></div>`;
  }
  function tileHtml(x) {
    const id = x.id, p = P[id], on = st.sel.includes(id);
    return `<button type="button" class="tile ${on ? 'on' : ''}" data-add="${id}" aria-pressed="${on}">${photo(id)}
      <span class="row">${rateBadge(x.rating && x.rating.r)}<span class="st">${on ? '✓ 선택됨' : '+ 넣기'}</span></span>
      <b>${esc(p.name)}</b><span class="model">${esc(p.model)}</span></button>`;
  }

  // ③ 설치 과정
  function renderInstall() {
    const mounts = [...new Set(st.site.products.map(mountOf))].filter(m => m && m !== 'none');
    $('right').innerHTML = `
      <div><div class="eyebrow">③ 설치 과정 · ${mounts.map(m => I.MOUNT_LABEL[m]).join(' · ')}</div><h2>${S.groups.length}대 설치 순서</h2></div>
      <ol class="steps">${I.STEPS.map((s, i) => `
        <li class="${i === st.stepI ? 'cur' : i < st.stepI ? 'done' : ''}"><button type="button" data-step="${i}">
          <span class="no">${i + 1}</span><span class="t">${s.title}</span>
          <span class="d mounts">${mounts.map(m => `<p><b>${I.MOUNT_LABEL[m]}</b> ${esc(I.TEXT[m][i])}</p>`).join('')}</span></button></li>`).join('')}
      </ol>
      <p class="note">마지막 단계에서 파란 화살표는 흡기(바깥 공기 유입), 주황 화살표는 배기(실내 공기 배출) 방향입니다. 실제 시공은 현장 구조·전기 용량 검토 후 팬직 기술지원팀과 협의합니다.</p>`;
    $('right').querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { st.stepI = +b.dataset.step; st.stepK = 0; st.stepPlay = true; updateStepUI(); }));
    updateCaption();
  }
  function updateStepUI() {
    if (st.step !== 'install') return;
    $('right').querySelectorAll('.steps li').forEach((li, i) => { li.className = i === st.stepI ? 'cur' : i < st.stepI ? 'done' : ''; });
    updateCaption(); renderHud();
  }
  function updateCaption() {
    const cap = $('stepCap');
    if (st.view !== 'env' || st.step !== 'install') { cap.hidden = true; return; }
    const first = st.site.products.find(it => mountOf(it) !== 'none');
    cap.hidden = false;
    if (!first) { cap.innerHTML = '<span class="n">설치 과정</span><b>제품을 선택해 주세요</b>'; return; }
    cap.innerHTML = `<span class="n">STEP ${st.stepI + 1} / 6</span><b>${I.STEPS[st.stepI].title}</b><span class="small muted">${esc(I.TEXT[mountOf(first)][st.stepI])}</span>`;
  }

  // ④ 효과
  function renderEffect(r) {
    const s = st.site, it = s.mode === 'it';
    const cards = [kpiCard('ach', '환기 횟수', '회/h')];
    if (r.pol) cards.push(kpiCard('pol', r.pol.name, r.pol.unit));
    if (r.pm) cards.push(kpiCard('pm', r.pm.name, r.pm.unit));
    if (r.tempOn && !it) cards.push(kpiCard('teff', r.animal ? '체감 온도(가축)' : '체감 온도', '℃'));
    if (r.tempOn) cards.push(kpiCard('temp', it ? '서버실 평균 온도' : '실내 온도', '℃'));
    cards.push(kpiCard('v', '평균 풍속', 'm/s'));
    cards.push(kpiCard('kw', '설비 소비전력', 'kW'));
    const metrics = [];
    if (r.pol) metrics.push(['pol', '공기질']);
    if (r.pm) metrics.push(['pm', '미세먼지']);
    if (r.tempOn) metrics.push(['temp', it ? '서버실 온도' : '체감 온도']);
    if (!metrics.length) metrics.push(['temp', '온도']);
    if (!metrics.some(m => m[0] === st.metric)) st.metric = metrics[0][0];
    const e = r.energy;
    $('right').innerHTML = `
      <div><div class="eyebrow">④ 효과 · 가동 후 60분</div><h2 id="effTitle">가동 전</h2></div>
      <div class="flowkey"><span><i style="background:var(--intake)"></i>흡기: 바깥 신선 공기가 들어옴</span><span><i style="background:var(--exhaust)"></i>배기: 실내 공기가 빠져나감</span></div>
      <div class="kpis">${cards.join('')}</div>
      <div class="chartbox">
        <div class="row"><h3>시간에 따른 변화</h3>
          <div class="seg" role="group" aria-label="차트 지표">${metrics.map(m => `<button type="button" data-metric="${m[0]}" aria-pressed="${st.metric === m[0]}">${m[1]}</button>`).join('')}</div></div>
        <canvas id="chart" aria-label="시간에 따른 변화 차트"></canvas>
        <div class="keys"><span><i></i>팬 가동 후</span><span><i class="b"></i>기존 상태</span></div>
      </div>
      ${prodBlock(r)}
      <div class="card">
        <div class="row"><h3>에너지·비용</h3><span class="muted small">연 ${fmt(e.hrs)}시간 가동</span></div>
        <div class="row small"><span class="muted">연간 전력량</span><span class="num">${fmt(e.kWh)} kWh</span></div>
        <div class="row small"><span class="muted">연간 전기요금</span><span class="num">${fmt(e.costWon / 10000)} 만원</span></div>
        ${e.saveKWh > 0 ? `<div class="row small"><span class="muted">기존 대비 절감</span><span class="num" style="color:var(--good)">${fmt(e.saveWon / 10000)} 만원/년</span></div>
        <div class="row small"><span class="muted">CO₂ 감축</span><span class="num">${fmt(e.co2t, 1)} tCO₂/년</span></div>
        <p class="note">비교 기준: ${esc(e.baseNotes.join(', '))}</p>` : '<p class="note">환기 성능 확보가 목적이라 기존 설비 대비 절감액은 계산하지 않았습니다.</p>'}
        ${r.payback ? `<div class="row small"><span class="muted">투자 회수 기간</span><span class="num">${fmt(r.payback, 1)} 년</span></div>` : ''}
      </div>
      <details class="assume"><summary>계산 가정값 바꾸기</summary><div class="fields">
        ${fld('pPrice', '전기요금(원/kWh)', st.prm.elecPrice)}${fld('pCo2', '배출계수(kg/kWh)', st.prm.co2Factor)}
        ${fld('pEc', 'EC 절감률(%)', st.prm.ecSave)}${fld('pLoss', '1℃당 효율저하(%)', st.prm.heatLoss)}
        ${fld('pWage', '1인 연인건비(만원)', st.prm.wage)}${fld('pHot', '고온기 일수', st.prm.hotDays)}
        ${fld('pCost', '총 설치비(만원)', st.prm.installCost)}</div></details>
      <p class="note">단순 모델 기반 참고 추정치입니다. 환기·필터: C∞=(Q·C외기+발생량)/(Q+필터 CADR), 온도: T=T외기+발열/(UA+Q/3000), 체감: 풍속에 따른 냉각효과.</p>`;
    $('right').querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => { st.metric = b.dataset.metric; $('right').querySelectorAll('[data-metric]').forEach(x => x.setAttribute('aria-pressed', x.dataset.metric === st.metric)); drawChart(); }));
    const map = { pPrice: 'elecPrice', pCo2: 'co2Factor', pEc: 'ecSave', pLoss: 'heatLoss', pWage: 'wage', pHot: 'hotDays', pCost: 'installCost' };
    Object.entries(map).forEach(([id, k]) => $(id).addEventListener('change', () => {
      const v = parseFloat($(id).value); if (isFinite(v) && v >= 0) st.prm[k] = k === 'ecSave' ? Math.min(80, v) : v;
      renderRight(); $('right').querySelector('details').open = true;
    }));
    updateLive();
  }
  function fld(id, label, v) { return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" value="${v}"></div>`; }
  function kpiCard(key, lab, unit) { return `<div class="kpi" data-k="${key}"><span class="lab">${esc(lab)}</span><span class="val"><span class="v">–</span><small>${esc(unit)}</small></span><span class="was"></span><span class="st" hidden></span></div>`; }
  function prodBlock(r) {
    const p = r.prod; if (!p) return '';
    const val = p.value > 0 ? `<div class="row small"><span class="muted">연간 환산 효과</span><span class="num" style="color:var(--good)">${fmt(p.value)} 만원</span></div><p class="note">${esc(p.valueLabel)}</p>` : '';
    if (p.kind === 'livestock') return `<div class="card"><h3>가축 열 스트레스</h3>
      <div class="row small"><span class="muted">THI</span><span class="num">${fmt(p.thi0, 1)} → <b>${fmt(p.thi1, 1)}</b></span></div>
      <div class="row small"><span class="muted">고온기 폐사율</span><span class="num">${fmt(p.mort0, 1)}% → <b>${fmt(p.mort1, 1)}%</b></span></div>
      <div class="row small"><span class="muted">폐사 감소</span><span class="num">${fmt(p.heads)} 수</span></div>${val}</div>`;
    if (p.kind === 'it') return `<div class="card"><h3>서버 흡기 온도</h3><div class="row small"><span class="muted">기존 → 도입 후</span><span class="num">${fmt(p.before, 1)}℃ → <b>${fmt(p.after, 1)}℃</b></span></div><p class="note">ASHRAE 권장 흡기 18~27℃. 핵심 효과는 에너지 절감입니다.</p></div>`;
    return `<div class="card"><h3>${esc(p.label)}</h3><div class="row small"><span class="muted">기존 → 도입 후</span><span class="num">${fmt(p.before, 1)}% → <b>${fmt(p.after, 1)}%</b></span></div>${val}</div>`;
  }
  function updateLive() {
    if (st.view !== 'env' || st.step !== 'effect' || !st.res) return;
    const r = st.res, now = r.at(st.t), was = r.at(0);
    const title = $('effTitle'); if (title) title.textContent = st.t <= 0 ? '가동 전 (기존 상태)' : st.t < 1 ? `가동 ${Math.round(st.t * 60)}초 후` : `가동 ${Math.floor(st.t)}분 후`;
    const set = (k, v, w, d, lim) => {
      const el = $('right').querySelector(`.kpi[data-k="${k}"]`); if (!el) return;
      el.querySelector('.v').textContent = fmt(v, d);
      el.querySelector('.was').textContent = st.t > 0 ? `기존 ${fmt(w, d)}` : ' ';
      const sb = el.querySelector('.st'), ss = status(v, lim);
      if (ss) { sb.hidden = false; sb.className = 'st ' + ss[0]; sb.textContent = ss[1]; } else sb.hidden = true;
    };
    set('ach', st.t > 0 ? r.ach : r.ach0, r.ach0, 1);
    if (r.pol) set('pol', now.C, was.C, r.pol.dec, r.pol.limit);
    if (r.pm) set('pm', now.PM, was.PM, 0, r.pm.limit);
    if (r.tempOn) { set('teff', now.Teff, was.Teff, 1, r.animal ? null : 28); set('temp', now.T, was.T, 1); }
    set('v', now.v, was.v, 2);
    set('kw', st.t > 0 ? r.energy.kW : 0, 0, 1);
    const kwEl = $('right').querySelector('.kpi[data-k="kw"] .was'); if (kwEl) kwEl.textContent = `연 ${fmt(r.energy.costWon / 10000)}만원`;
    drawChart();
    const clock = $('clock'); if (clock) clock.textContent = `${String(Math.floor(st.t)).padStart(2, '0')}:${String(Math.floor((st.t % 1) * 60)).padStart(2, '0')}`;
    const sl = $('tSlider'); if (sl && document.activeElement !== sl) sl.value = st.t;
  }
  function drawChart() {
    const cv = $('chart'); if (!cv) return;
    const r = st.res, N = 61, after = [];
    const pick = (key, before, limit, d, zero) => {
      for (let i = 0; i < N; i++) after.push(r.at(Math.max(0.001, i))[key]);
      X.chart(cv, { after, before, limit, t: st.t, zero, fmt: v => fmt(v, d) + (key === 'T' || key === 'Teff' ? '℃' : ''), valueAt: t => r.at(Math.max(0.001, t))[key] });
    };
    if (st.metric === 'pm' && r.pm) pick('PM', r.pm.c0, r.pm.limit, 0, true);
    else if (st.metric === 'pol' && r.pol) pick('C', r.pol.c0, r.pol.limit, r.pol.dec > 1 ? 1 : r.pol.dec, true);
    else { const key = st.site.mode === 'it' || !r.tempOn ? 'T' : 'Teff'; pick(key, r.at(0)[key], r.animal || key === 'T' ? null : 28, 0, false); }
  }

  // ⑤ 상담 요약
  function renderSummaryPanel() {
    $('right').innerHTML = `<div><div class="eyebrow">⑤ 상담 요약</div><h2>제안 내용 정리</h2></div>
      <p class="muted small">환경 조건, 제품 구성(흡기/배기 포함), 예상 효과를 한 장으로 정리했습니다. 텍스트를 복사해 메신저나 견적 메일에 붙여 넣을 수 있습니다.</p>
      <button type="button" class="ctrl primary" id="openSheet">요약 시트 열기</button>`;
    $('openSheet').addEventListener('click', openSheet);
    openSheet();
  }
  function openSheet() {
    const r = st.res, s = st.site, e = r.energy;
    const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const rows = effectRows(r);
    const big2 = r.pol ? ['공기질 (' + shortName(r.pol.name) + ')', `${fmt(r.pol.c0, r.pol.dec)}→${fmt(r.pol.c1, r.pol.dec)}`] : r.tempOn ? ['체감 온도', `${fmt(r.Teff0, 1)}→${fmt(r.steady.Teff, 1)}℃`] : ['평균 풍속', `${fmt(r.v0, 2)}→${fmt(r.v1, 2)}`];
    const probs = s.problems.map(p => FZ.PROBLEMS.find(x => x.id === p).label).join(', ');
    $('sheet').innerHTML = `<div class="paper" role="dialog" aria-label="상담 요약">
      <div class="meta"><div><img src="${FZ.LOGO}" alt="FANZIC"><h2 style="margin-top:10px">${esc(s.name)} 환기 제안 요약</h2>
        <p style="font-size:13px;color:#33475e">${esc(s.sub)} · 주된 문제: ${esc(probs)}</p></div>
        <div class="num" style="font-size:12px;color:#5a6b80;text-align:right">${date}<br>${fmt(s.dims.L, 1)}×${fmt(s.dims.W, 1)}×${fmt(s.dims.H, 1)}m · ${fmt(r.g.V)}㎥</div></div>
      <div class="big"><div><span>환기 횟수</span><b>${fmt(r.ach0, 1)}→${fmt(r.ach, 1)}</b> 회/h</div><div><span>${esc(big2[0])}</span><b>${esc(big2[1])}</b></div><div><span>연간 환산 효과</span><b>${r.totalBenefit > 0 ? fmt(r.totalBenefit) : '–'}</b> 만원</div></div>
      <div class="tw"><table><thead><tr><th>적합도</th><th>제품</th><th>모델</th><th>방향</th><th>설치 방식</th><th class="num">수량</th><th class="num">대당 풍량(㎥/h)</th><th class="num">대당 전력(kW)</th></tr></thead>
        <tbody>${s.products.length ? s.products.map(it => { const p = P[it.id], rt = FZ.catalog.rating(s.id, it.id); return `<tr><td>${rt ? rt.r + ' ' + FZ.catalog.RATING_LABEL[rt.r] : '–'}</td><td>${esc(p.name)}${p.rep ? ' *' : ''}</td><td class="num">${esc(p.model)}</td><td>${it.mode ? FZ.DIR_LABEL[it.mode] : '–'}</td><td>${I.MOUNT_LABEL[mountOf(it)]}</td><td class="num">${st.qty[it.id]}</td><td class="num">${p.airflow ? fmt(p.airflow) : '–'}</td><td class="num">${p.power ? fmt(p.power / 1000, 2) : '–'}</td></tr>`; }).join('') : '<tr><td colspan="8">선택한 제품이 없습니다.</td></tr>'}</tbody></table></div>
      <div class="tw"><table><thead><tr><th>항목</th><th class="num">기존</th><th class="num">도입 후</th><th class="num">변화</th></tr></thead><tbody>
        ${rows.map(x => `<tr><td>${esc(x.k)}${x.lim != null ? ` <span style="color:#5a6b80;font-size:11px">(기준 ${fmt(x.lim, x.d)})</span>` : ''}</td><td class="num">${fmt(x.a, x.d)} ${esc(x.u)}</td><td class="num"><b>${fmt(x.b, x.d)}</b> ${esc(x.u)}</td><td class="num">${x.b - x.a >= 0 ? '+' : ''}${fmt(x.b - x.a, x.d)}</td></tr>`).join('')}
        <tr><td>설비 소비전력 / 연간 전기요금</td><td class="num">–</td><td class="num">${fmt(e.kW, 1)} kW / ${fmt(e.costWon / 10000)}만원</td><td></td></tr>
        ${e.saveKWh > 0 ? `<tr><td>기존 대비 전기요금 절감 / CO₂ 감축</td><td class="num">–</td><td class="num" style="color:#15803d"><b>${fmt(e.saveWon / 10000)}만원</b> / ${fmt(e.co2t, 1)}t</td><td></td></tr>` : ''}
        ${r.prod && r.prod.value > 0 ? `<tr><td>생산성·축산 개선 환산</td><td class="num">–</td><td class="num" style="color:#15803d"><b>${fmt(r.prod.value)}만원</b>/년</td><td></td></tr>` : ''}
      </tbody></table></div>
      <div class="foot">가정값: 전기요금 ${fmt(st.prm.elecPrice)}원/kWh · 배출계수 ${st.prm.co2Factor}kgCO₂/kWh · EC 절감률 ${st.prm.ecSave}% · 연 가동 ${fmt(e.hrs)}시간(부하율 80%).<br>
        본 자료는 대표 조건을 넣은 단순 모델의 참고 추정치이며 성능을 보증하지 않습니다. 적합도는 「제품별 용도 메트릭스」 기준, 사양은 카탈로그 대표 모델(50Hz, 일부 60Hz) 기준이고 * 표시는 가정값이 포함된 제품입니다.</div>
      <div class="acts"><button type="button" id="copySum" class="pri">요약 텍스트 복사</button><button type="button" id="closeSheet">닫기</button></div>
      <textarea id="copyBox" readonly hidden style="width:100%;height:160px;font:12px var(--f-mono)"></textarea></div>`;
    $('sheet').hidden = false;
    const text = [`[팬직 ${s.name} 환기 제안 요약] ${date}`, `환경: ${s.sub}, 주된 문제 ${probs}`,
      `제품: ` + s.products.map(it => `${P[it.id].name} ${P[it.id].model} ${st.qty[it.id]}대${it.mode ? '(' + FZ.DIR_LABEL[it.mode] + ')' : ''}`).join(', '),
      ...rows.map(x => `- ${x.k}: ${fmt(x.a, x.d)} → ${fmt(x.b, x.d)} ${x.u}`),
      `- 설비 전력 ${fmt(e.kW, 1)}kW, 연간 전기요금 약 ${fmt(e.costWon / 10000)}만원` + (e.saveKWh > 0 ? `, 기존 대비 절감 ${fmt(e.saveWon / 10000)}만원/년` : ''),
      `※ 단순 모델 기반 참고 추정치, 현장 실측 후 확정`].join('\n');
    $('copySum').addEventListener('click', () => {
      const btn = $('copySum');
      const fb = () => { const b = $('copyBox'); b.hidden = false; b.value = text; b.focus(); b.select(); btn.textContent = '아래 텍스트를 복사하세요'; };
      try { navigator.clipboard.writeText(text).then(() => { btn.textContent = '복사했습니다'; setTimeout(() => { btn.textContent = '요약 텍스트 복사'; }, 1800); }, fb); } catch (err) { fb(); }
    });
    $('closeSheet').addEventListener('click', () => { $('sheet').hidden = true; });
  }

  /* ---------- HUD ---------- */
  const STEPS = [['cond', '환경 설정'], ['pick', '제품 선택'], ['install', '설치 과정'], ['effect', '효과'], ['summary', '상담 요약']];
  function renderHud() {
    const hud = $('hud');
    if (st.view === 'product') return renderProductHud();
    if (st.view !== 'env') { hud.hidden = true; return; }
    hud.hidden = false;
    let ctrls = '';
    if (st.step === 'install') {
      const done = st.stepI === 5 && st.stepK >= 1;
      ctrls = `<button type="button" class="ctrl" id="sPrev" ${st.stepI === 0 ? 'disabled' : ''}>이전</button>
        <button type="button" class="ctrl primary" id="sPlay">${st.stepPlay ? '일시정지' : done ? '처음부터' : '재생'}</button>
        <button type="button" class="ctrl" id="sNext" ${st.stepI === 5 ? 'disabled' : ''}>다음</button>
        ${done ? '<button type="button" class="ctrl primary" id="toEffect">효과 보기</button>' : ''}`;
    } else if (st.step === 'effect') {
      ctrls = `<button type="button" class="ctrl primary" id="tPlay">${playLabel()}</button>
        <div class="timebox"><input type="range" id="tSlider" min="0" max="60" step="0.5" value="${st.t}" aria-label="가동 시간(분)"><span class="clock" id="clock">00:00</span></div>`;
    }
    hud.innerHTML = `<div class="bar"><div class="tabs" role="tablist">${STEPS.map(([k, l], i) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${st.step === k}"><b>${i + 1}</b>${l}</button>`).join('')}</div>${ctrls}</div>`;
    hud.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => setStep(b.dataset.tab)));
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('sPrev', () => { st.stepI = Math.max(0, st.stepI - 1); st.stepK = 0; st.stepPlay = true; updateStepUI(); });
    on('sNext', () => { st.stepI = Math.min(5, st.stepI + 1); st.stepK = 0; st.stepPlay = true; updateStepUI(); });
    on('sPlay', () => { if (st.stepI === 5 && st.stepK >= 1 && !st.stepPlay) { st.stepI = 0; st.stepK = 0; st.stepPlay = true; } else st.stepPlay = !st.stepPlay; updateStepUI(); });
    on('toEffect', () => setStep('effect'));
    on('tPlay', () => { if (st.t >= 60) st.t = 0; st.simPlay = !st.simPlay; renderHud(); updateLive(); });
    const sl = $('tSlider');
    if (sl) sl.addEventListener('input', () => { st.t = +sl.value; st.simPlay = false; const b = $('tPlay'); if (b) b.textContent = playLabel(); updateLive(); heatTimer = 1; });
    updateLive();
  }
  function playLabel() { return st.simPlay ? '일시정지' : st.t >= 60 ? '다시 가동' : st.t > 0 ? '계속' : '팬 가동'; }
  function setStep(step) {
    if (st.view !== 'env') return;
    st.step = step; $('sheet').hidden = true;
    if (step === 'effect') { st.t = 0; st.simPlay = true; }
    if (step === 'install') { st.stepI = 0; st.stepK = 0; st.stepPlay = true; }
    renderLeft(); renderRight(); renderHud(); applyTabVisibility();
  }
  function applyTabVisibility() {
    if (st.view !== 'env' || !S) { $('legend').hidden = true; $('stepCap').hidden = true; return; }
    const eff = st.step === 'effect' || st.step === 'summary';
    S.heatmap.mesh.visible = eff;
    $('stepCap').hidden = st.step !== 'install';
    $('legend').hidden = !eff;
    if (st.step !== 'install') I.apply(S.groups, 6, 1, 0);
    if (eff) renderLegend();
    heatTimer = 1; lastRun = null;
  }
  function renderLegend() {
    const r = st.res, lg = $('legend'), modes = [];
    if (r.tempOn) { modes.push(['temp', '실내 온도']); if (st.site.mode !== 'it') modes.push(['feel', '체감 온도']); }
    if (r.pol) modes.push(['pol', '공기질']);
    if (!modes.length) modes.push(['temp', '실내 온도']);
    if (!modes.some(m => m[0] === st.heat)) st.heat = modes[0][0];
    const Rr = st.heat === 'pol' ? X.RAMP_C : X.RAMP_T, lo = Rr[0][0], hi = Rr[Rr.length - 1][0];
    const g = Rr.map(([v, c]) => `rgb(${c.join(',')}) ${((v - lo) / (hi - lo) * 100).toFixed(0)}%`).join(',');
    const ends = st.heat === 'pol' ? ['깨끗', '기준', '기준 2배+'] : ['16℃', '27℃', '38℃'];
    lg.innerHTML = `<div class="seg" role="group" aria-label="바닥 색 표시">${modes.map(m => `<button type="button" data-heat="${m[0]}" aria-pressed="${st.heat === m[0]}">${m[1]}</button>`).join('')}</div>
      <div class="grad" style="background:linear-gradient(90deg,${g})"></div><div class="ends"><span>${ends[0]}</span><span>${ends[1]}</span><span>${ends[2]}</span></div>
      <div class="flowkey"><span><i style="background:var(--intake)"></i>흡기</span><span><i style="background:var(--exhaust)"></i>배기</span></div>`;
    lg.querySelectorAll('[data-heat]').forEach(b => b.addEventListener('click', () => { st.heat = b.dataset.heat; renderLegend(); heatTimer = 1; }));
  }

  /* =========================================================
     제품에서 찾기 (영업 학습·타깃 발굴)
     ========================================================= */
  function enterProduct(pid) {
    st.view = 'product'; setModeButtons('product');
    disposeSite();
    $('legend').hidden = true; $('stepCap').hidden = true; $('sheet').hidden = true;
    renderProductList();
    showProduct(pid || st.pid);
  }
  function showProduct(pid) {
    st.pid = pid;
    const t = tag(pid);
    if (!t.dirs.includes(st.pmode)) st.pmode = t.def || 'circ';
    SHOW = SC.build(pid, st.pmode === 'circ' || !st.pmode ? 'circ' : st.pmode);
    E.scene = SHOW.scene;
    const o = E.orbit; o.minR = 3; o.maxR = 30; o.minPhi = 0.2; o.maxPhi = 1.45;
    o.set({ target: SHOW.target, radius: SHOW.radius, theta: 0.9, phi: 1.12 }, 0); o.auto = 0.15;
    renderProductDetail(); renderProductHud();
    $('left').querySelectorAll('.tile').forEach(b => b.classList.toggle('on', b.dataset.pid === pid));
  }
  function renderProductList() {
    const groups = ['전체', ...new Set(Object.values(P).map(p => p.group))];
    const ids = Object.keys(P).filter(id => st.pfilter === '전체' || P[id].group === st.pfilter);
    $('left').innerHTML = `<div><div class="eyebrow">제품에서 찾기</div><h2>팬직 제품 ${Object.keys(P).length}종</h2>
        <p class="muted small" style="margin-top:4px">제품을 고르면 특징·흡기/배기 원리, 잘 맞는 환경과 찾아갈 고객을 보여 줍니다.</p></div>
      <div class="filt" role="group" aria-label="제품군">${groups.map(g => `<button type="button" class="fchip" data-pf="${esc(g)}" aria-pressed="${g === st.pfilter}">${esc(g)}</button>`).join('')}</div>
      <div class="grid">${ids.map(id => `<button type="button" class="tile ${id === st.pid ? 'on' : ''}" data-pid="${id}">${photo(id)}<b>${esc(P[id].name)}</b><span class="model">${esc(P[id].model)}</span></button>`).join('')}</div>`;
    $('left').querySelectorAll('[data-pf]').forEach(b => b.addEventListener('click', () => { st.pfilter = b.dataset.pf; renderProductList(); }));
    $('left').querySelectorAll('[data-pid]').forEach(b => b.addEventListener('click', () => showProduct(b.dataset.pid)));
  }
  function renderProductDetail() {
    const id = st.pid, p = P[id], t = tag(id);
    const good = R.forProduct(id).filter(x => x.ok && x.score > 0);
    const top = good.slice(0, 3);
    const same = Object.keys(P).filter(k => P[k].group === p.group && P[k].airflow > 0 && P[k].role !== 'hvls').slice(0, 8);
    const maxQ = Math.max(...same.map(k => P[k].airflow), 1), maxW = Math.max(...same.map(k => P[k].power), 1);
    const bars = (key, max, unit) => same.map(k => `<div class="b ${k === id ? 'me' : ''}"><span>${esc(P[k].name)}</span><span class="track"><span class="fill" style="width:${(P[k][key] / max * 100).toFixed(0)}%"></span></span><span class="v">${fmt(key === 'power' ? P[k][key] / 1000 : P[k][key], key === 'power' ? 2 : 0)}${unit}</span></div>`).join('');
    const dirText = t.dirs.includes('circ') ? '실내 공기를 순환시켜 바람(풍속)으로 체감온도를 낮추고 정체 구역을 없앱니다. 환기량에는 들어가지 않습니다.'
      : t.dirs.length === 2 ? '흡기(바깥 신선 공기를 들여옴)와 배기(실내 오염 공기를 내보냄) 모두 쓸 수 있습니다. 오염원 가까이는 배기, 사람이 있는 쪽은 흡기가 일반적입니다.'
      : t.dirs[0] === 'intake' ? '흡기(급기) 전용입니다. 바깥 공기를 걸러 실내로 들여보냅니다.' : t.dirs[0] === 'exhaust' ? '배기 전용입니다. 실내의 열기·습기·오염 공기를 밖으로 내보냅니다.' : '부속품으로 공기 방향이 없습니다.';
    const place = FZ.catalog.placeFor({ kind: '' }, p);
    $('right').innerHTML = `
      <div class="hero">${photo(id)}<div><div class="eyebrow">${esc(p.group)}${p.extra ? ' · 메트릭스 외' : ''}</div><h2>${esc(p.name)}</h2><div class="model">${esc(p.model)}</div>
        <div class="chips" style="margin-top:6px">${t.solves.map(x => `<span class="chip ok">${esc(FZ.PROBLEMS.find(q => q.id === x).label)}</span>`).join('')}</div></div></div>
      <div class="specs"><div><span>대당 풍량(㎥/h)</span><em>${p.airflow ? fmt(p.airflow) : '–'}</em></div><div><span>소비전력</span><em>${p.power ? fmt(p.power / 1000, 2) + 'kW' : '–'}</em></div><div><span>정압</span><em>${esc(p.pressure || '–')}</em></div></div>
      <ul class="feat">${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="card"><h3>공기 방향 · 설치 방식</h3><p class="small">${esc(dirText)}</p><p class="small muted">설치: ${esc(I.MOUNT_LABEL[mountOf({ place })] || '–')}${p.rep ? ' · 일부 수치는 가정값' : ''}</p></div>
      ${same.length > 1 ? `<div class="card"><h3>같은 제품군 비교</h3><span class="small muted">풍량(㎥/h)</span><div class="bars">${bars('airflow', maxQ, '')}</div><span class="small muted">소비전력</span><div class="bars">${bars('power', maxW, 'kW')}</div></div>` : ''}
      <div><h3>이런 환경에 맞아요</h3><p class="note" style="margin-top:2px">용도별 기본 조건에서 추천 점수를 계산한 순위입니다. 누르면 그 환경으로 시뮬레이션합니다.</p></div>
      <div class="uses">${good.slice(0, 8).map(x => `<div class="use"><span class="nm">${rateBadge(x.rating && x.rating.r)}${esc(x.use.label)}</span>
          <button type="button" class="ctrl" data-sim="${x.use.id}">시뮬레이션 →</button>
          <span class="meter"><i style="width:${Math.min(100, x.score / 12 * 100)}%"></i></span>
          <span class="chips" style="grid-column:1/-1">${x.reasons.filter(r => !r.includes('설치') && !r.includes('연결')).map(r => `<span class="chip">${esc(r)}</span>`).join('')}</span></div>`).join('') || '<p class="muted small">기본 조건에서 맞는 용도가 없습니다.</p>'}</div>
      <div><h3>이런 고객을 찾아보세요 <span class="chip warn">초안</span></h3><p class="note" style="margin-top:2px">적합 순위 상위 용도의 고객군·발굴 단서·첫 질문·영업 포인트입니다. data/sales.js에서 고쳐 쓸 수 있습니다.</p></div>
      ${top.map(x => { const sd = FZ.SALES[x.use.id]; if (!sd) return ''; return `<div class="card cust"><h4>${rateBadge(x.rating && x.rating.r)}${esc(x.use.label)}</h4>
        <span class="k">찾아갈 고객</span><ul>${sd.customers.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
        <span class="k">이런 신호가 보이면</span><ul>${sd.signals.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
        <span class="k">상담 첫 질문</span><ul>${sd.questions.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
        <span class="k">강조할 점</span><ul>${sd.points.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>`; }).join('')}`;
    $('right').querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () => simulate(b.dataset.sim, id)));
    $('right').scrollTop = 0;
  }
  function renderProductHud() {
    const hud = $('hud'); hud.hidden = false;
    const ds = tag(st.pid).dirs;
    hud.innerHTML = `<div class="bar">
      ${ds.length ? `<span class="seg" role="group" aria-label="공기 방향">${ds.map(d => `<button type="button" class="${d === 'intake' ? 'in' : d === 'exhaust' ? 'ex' : ''}" data-pm="${d}" aria-pressed="${st.pmode === d}">${FZ.DIR_LABEL[d]}</button>`).join('')}</span>` : '<span class="chip">부속품</span>'}
      <button type="button" class="ctrl" id="pOn">${st.pOn ? '정지' : '가동'}</button>
      <span class="flowkey"><span><i style="background:var(--intake)"></i>흡기 신선 공기</span><span><i style="background:var(--exhaust)"></i>배기 실내 공기</span></span>
      <span style="flex:1"></span>
      <button type="button" class="ctrl primary" id="pSim">이 제품으로 시뮬레이션 →</button></div>`;
    hud.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', () => { st.pmode = b.dataset.pm; showProduct(st.pid); }));
    $('pOn').addEventListener('click', () => { st.pOn = !st.pOn; renderProductHud(); });
    $('pSim').addEventListener('click', () => { const best = R.forProduct(st.pid).find(x => x.ok && x.score > 0); simulate(best ? best.use.id : 'factory', st.pid); });
  }
  // 용도 + 제품 → 환경 모드로
  function simulate(useId, pid) {
    const cond = FZ.env.defaultCond(useId);
    const req = { wall: 'wall', rack: 'wall', exterior: 'wall', duct: 'duct', ceiling: 'ceiling', hang: 'ceiling', roof: 'roof', floor: 'floor', pole: 'floor' }[P[pid].mount];
    if (req) cond.mounts[req] = true;
    if (P[pid].minHeight && cond.H < P[pid].minHeight) cond.H = P[pid].minHeight + 0.5;
    const rec = R.set(cond).map(x => x.id);
    const sel = rec.includes(pid) ? rec : [pid, ...rec].slice(0, 4);
    const dir = {}; if (st.view === 'product' && tag(pid).dirs.includes(st.pmode)) dir[pid] = st.pmode;
    $('sheet').hidden = true;
    fade(() => enterEnv(cond, { sel, dir }));
  }

  /* ---------- 적합도 표 ---------- */
  function openMatrix() {
    const uses = FZ.USES, ids = Object.keys(P);
    $('sheet').innerHTML = `<div class="paper" role="dialog" aria-label="제품 × 용도 적합도 표">
      <div class="meta"><div><div class="eyebrow" style="color:#5a6b80">제품 × 용도</div><h2>적합도 한눈에 보기</h2>
        <p style="font-size:12px;color:#5a6b80">◎ 최적 · ○ 적합 · △ 가능 (「제품별 용도 메트릭스」), 점선 칸은 메트릭스 외(브로셔 용도 기준). 칸을 누르면 그 조합으로 시뮬레이션, 제품명을 누르면 제품 설명으로 갑니다.</p></div>
        <div class="acts"><button type="button" id="closeMx">닫기</button></div></div>
      <div class="tw"><table class="mx"><thead><tr><th>제품</th>${uses.map(u => `<th>${esc(u.label)}</th>`).join('')}</tr></thead><tbody>
        ${ids.map(id => `<tr><td><button type="button" class="pn" data-mxp="${id}">${esc(P[id].name)}</button></td>${uses.map(u => { const r = FZ.catalog.rating(u.id, id); return `<td>${r ? `<button type="button" class="${r.src === 'extra' ? 'x' : RCLS[r.r]}" data-mxu="${u.id}" data-mxi="${id}" title="${esc(u.label)} · ${esc(P[id].name)}">${r.r}</button>` : ''}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div></div>`;
    $('sheet').hidden = false;
    $('closeMx').addEventListener('click', () => { $('sheet').hidden = true; });
    $('sheet').querySelectorAll('[data-mxu]').forEach(b => b.addEventListener('click', () => simulate(b.dataset.mxu, b.dataset.mxi)));
    $('sheet').querySelectorAll('[data-mxp]').forEach(b => b.addEventListener('click', () => { $('sheet').hidden = true; enterProduct(b.dataset.mxp); }));
  }

  /* ---------- 프레임 ---------- */
  const SPIN = { hvls: 1.4, belt: 9, propeller: 11, roof: 10, inline: 14, centrifugal: 14, centrifugalSus: 14, ceilvent: 14, circ: 12, jet: 16, ec: 13, diffuser: 0, axialStand: 12, defroster: 7 };
  function spinFan(f, rate, dt) { if (!f.rotor) return; if (f.axis === 'y') f.rotor.rotation.y += rate * dt; else f.rotor.rotation.z += rate * dt; }
  function tick(dt, time) {
    if (st.view === 'product') { if (SHOW) SHOW.tick(dt, time, st.pOn); return; }
    if (st.view !== 'env' || !S) return;
    let running = false;
    if (st.step === 'install') {
      if (st.stepPlay) {
        st.stepK += dt / 3.2;
        if (st.stepK >= 1) { if (st.stepI < 5) { st.stepI++; st.stepK = 0; } else { st.stepK = 1; st.stepPlay = false; } updateStepUI(); }
      }
      I.apply(S.groups, st.stepI, st.stepK, time);
      running = st.stepI === 5 && st.stepK > 0.15;
    } else if (st.step === 'effect') {
      if (st.simPlay) { st.t = Math.min(60, st.t + dt * 3); if (st.t >= 60) { st.simPlay = false; const b = $('tPlay'); if (b) b.textContent = playLabel(); } }
      running = st.t > 0;
      liveTimer += dt; if (liveTimer > 0.12) { liveTimer = 0; updateLive(); }
    } else running = true; // 조건·선택·요약 단계: 미리보기로 계속 가동
    st.spin += ((running ? 1 : 0) - st.spin) * Math.min(1, dt * 1.6);
    S.groups.forEach(g => {
      spinFan(g.fan, (SPIN[g.pl.kind] || 10) * st.spin * (g.pl.mode === 'intake' ? -1 : 1), dt);
      const sh = g.fan.group.getObjectByName('shutter');
      if (sh) sh.children.forEach(pv => { pv.rotation.x = -1.25 * st.spin; });
    });
    const effView = st.step === 'effect' || st.step === 'summary';
    const showFlow = st.step !== 'install' || running;
    S.particles.points.visible = showFlow;
    if (effView) {
      if (lastRun !== running) { S.heatmap.sampleField(running, time); lastRun = running; heatTimer = 1; }
      heatTimer += dt;
      if (heatTimer > 0.2) { heatTimer = 0; const a = st.res.at(st.step === 'summary' ? 60 : st.t); S.heatmap.update({ ...a, on: running }, st.res, st.heat); }
    }
    if (showFlow) {
      const Rr = st.heat === 'pol' ? X.RAMP_C : X.RAMP_T, room = [100, 116, 139];
      S.particles.update(dt, running, time, effView ? (x, z) => X.ramp(Rr, S.heatmap.valueAt(x, z)) : () => room);
    }
  }

  const _fan = FZ.models.fan;
  FZ.models.fan = function (kind, s) { const f = _fan(kind, s); f.group.userData.kind = kind; return f; };

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init); else init();
})();
