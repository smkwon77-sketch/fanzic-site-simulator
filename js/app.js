/* 앱 상태·화면 구성 */
(function () {
  const T = THREE, E = FZ.engine, P = FZ.PRODUCTS, I = FZ.install, X = FZ.fx;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d = 0) => (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const clone = o => JSON.parse(JSON.stringify(o));

  const st = {
    view: 'map', site: null, qty: {}, prm: { ...FZ.DEFAULTS },
    tab: 'install', step: 0, stepK: 0, stepPlay: true,
    t: 0, simPlay: false, heat: 'temp', metric: 'temp', hover: null, spin: 0
  };
  let S = null; // 현장 3D 리소스
  let liveTimer = 0, heatTimer = 0, lastRun = null;

  /* ---------- 공통 계산 ---------- */
  function recQty(site) { const q = {}; site.products.forEach(it => { q[it.id] = FZ.sim.recommend(site, it); }); return q; }
  function computeFor(site, qty) { return FZ.sim.compute(site, qty, st.prm); }
  function sizingText(site, it) {
    const s = it.sizing, p = P[it.id];
    switch (s.type) {
      case 'ach': return `환기횟수 ${s.target}회/h 기준`;
      case 'velocity': return `터널 풍속 ${s.target}m/s 기준`;
      case 'cover': return `대당 약 ${fmt(p.cover)}㎡ 커버`;
      case 'perArea': return `${s.value}㎡당 1대`;
      case 'flowPerArea': return `바닥 1㎡당 ${s.value}㎥/h 기준`;
      case 'perPerson': return `1인당 ${s.value}㎥/h 기준`;
      case 'perWorkers': return `작업자 ${s.value}명당 1대`;
      case 'heat': return `IT 발열 ${site.cond.heat}kW · 급배기 온도차 ${s.dT}℃ 기준`;
      default: return '기본 구성';
    }
  }
  function mountOf(it) {
    return { wallEnd: 'wall', wallSide: 'wall', roofLine: 'roof', ceilingGrid: 'ceiling', hangGrid: 'hang', ceilingSmall: 'ceilingSmall', ductLine: 'duct', rack: 'rack', outdoorPoles: 'pole', floorSpots: 'floor' }[it.place];
  }
  function status(v, limit, lowerIsBetter = true) {
    if (limit == null) return null;
    const ok = lowerIsBetter ? v <= limit : v >= limit;
    const near = lowerIsBetter ? v <= limit * 1.15 : v >= limit * 0.85;
    return ok ? ['good', '기준 충족'] : near ? ['mid', '기준 근접'] : ['bad', '기준 초과'];
  }

  // 효과 표 (지도 요약·상담 요약 공용)
  function effectRows(r) {
    const rows = [];
    rows.push({ k: '환기 횟수', u: '회/h', a: r.ach0, b: r.ach, d: 1 });
    rows.push({ k: '총 환기량', u: '㎥/h', a: r.Q0, b: r.Q, d: 0 });
    if (r.pol) rows.push({ k: r.pol.name, u: r.pol.unit, a: r.pol.c0, b: r.pol.c1, d: r.pol.dec, lim: r.pol.limit });
    if (r.tempOn) {
      rows.push({ k: '실내 온도', u: '℃', a: r.T0, b: r.T1, d: 1 });
      rows.push({ k: r.animal ? '체감 온도(가축)' : '체감 온도', u: '℃', a: r.Teff0, b: r.steady.Teff, d: 1 });
    }
    rows.push({ k: '평균 풍속', u: 'm/s', a: r.v0, b: r.v1, d: 2 });
    const p = r.prod;
    if (p) {
      if (p.kind === 'livestock') {
        rows.push({ k: '열 스트레스 지수(THI)', u: '', a: p.thi0, b: p.thi1, d: 1 });
        rows.push({ k: '고온기 폐사율', u: '%', a: p.mort0, b: p.mort1, d: 1 });
        rows.push({ k: '증체 저하', u: '%', a: p.g0, b: p.g1, d: 1 });
      } else rows.push({ k: p.label, u: p.unit, a: p.before, b: p.after, d: 1, lim: p.limit });
    }
    return rows;
  }

  /* ---------- 초기화 ---------- */
  function init() {
    $('logo').src = FZ.LOGO;
    E.init($('gl'));
    E.buildMap(FZ.SITES);
    E.frameFns.push(tick);
    E.orbit.onTap = onTap;
    $('gl').addEventListener('pointermove', onHover);
    $('crumbHome').addEventListener('click', () => goMap());
    buildPins();
    const id = (location.hash || '').slice(1);
    if (FZ.SITES.some(s => s.id === id)) enterSite(id, true); else showMap(true);
    window.addEventListener('hashchange', () => {
      const h = (location.hash || '').slice(1);
      if (FZ.SITES.some(s => s.id === h)) { if (!st.site || st.site.id !== h) enterSite(h); }
      else if (st.view === 'site') goMap();
    });
  }

  /* ---------- 지도 ---------- */
  function mapCam(dur) {
    const o = E.orbit; o.minR = 40; o.maxR = 220; o.minPhi = 0.25; o.maxPhi = 1.3;
    o.set({ target: new T.Vector3(0, 0, 2), radius: innerWidth < 760 ? 150 : 112, theta: 0.5, phi: 0.92 }, dur);
    o.auto = 0.025;
  }
  function showMap(first) {
    st.view = 'map'; st.site = null;
    E.scene = E.mapScene;
    mapCam(first ? 0 : 0);
    $('pins').hidden = false; $('hud').hidden = true; $('legend').hidden = true; $('stepCap').hidden = true; $('sheet').hidden = true;
    $('hint').hidden = false;
    $('crumbSep').hidden = true; $('crumbSite').textContent = '';
    renderMapPanels();
  }
  function goMap() {
    if (st.view === 'map') return;
    fade(() => { disposeSite(); showMap(); if (location.hash) history.replaceState(null, '', location.pathname + location.search); });
  }
  function buildPins() {
    const box = $('pins'); box.innerHTML = '';
    E.minis.forEach(m => {
      const site = FZ.SITES.find(s => s.id === m.id);
      const b = document.createElement('button');
      b.className = 'pin'; b.type = 'button'; b.textContent = site.name; b.dataset.id = m.id;
      b.addEventListener('click', () => enterSite(m.id));
      b.addEventListener('pointerenter', () => setHover(m.id));
      b.addEventListener('pointerleave', () => setHover(null));
      box.appendChild(b); m.pin = b;
    });
  }
  function setHover(id) {
    st.hover = id;
    document.querySelectorAll('.pin, .site-btn').forEach(el => el.classList.toggle('hover', el.dataset.id === id));
  }
  function onHover(e) {
    if (st.view !== 'map' || e.pointerType === 'touch') return;
    const hit = E.pick(e, E.minis.map(m => m.group).concat(E.minis.map(m => m.holder)));
    const id = hit ? hit.object.userData.siteId || null : null;
    if (id !== st.hover) setHover(id);
    $('gl').style.cursor = id ? 'pointer' : '';
  }
  function onTap(e) {
    if (st.view !== 'map') return;
    const hit = E.pick(e, E.minis.map(m => m.group).concat(E.minis.map(m => m.holder)));
    if (hit && hit.object.userData.siteId) enterSite(hit.object.userData.siteId);
  }

  function renderMapPanels() {
    const rows = FZ.SITES.map(s => ({ s, r: computeFor(s, recQty(s)) }));
    const kpi = r => r.pol ? `${shortName(r.pol.name)} ${fmt(r.pol.c0, r.pol.dec)}→${fmt(r.pol.c1, r.pol.dec)}` : r.site.mode === 'it' ? `서버실 ${fmt(r.T0, 1)}→${fmt(r.T1, 1)}℃` : `체감 ${fmt(r.Teff0, 1)}→${fmt(r.steady.Teff, 1)}℃`;
    $('left').innerHTML = `
      <div>
        <div class="eyebrow">설치 현장 ${FZ.SITES.length}곳</div>
        <h2>어디에 설치하시나요?</h2>
        <p class="muted small" style="margin-top:6px">현장을 고르면 권장 제품과 대수가 자동으로 잡히고, 설치 과정과 도입 효과를 3D로 보여줍니다.</p>
      </div>
      <div class="sites">${rows.map(({ s, r }) => `
        <button type="button" class="site-btn" data-id="${s.id}">
          <b>${esc(s.name)}</b><span class="kpi">${fmt(r.ach0, 1)}→${fmt(r.ach, 1)}회/h</span>
          <span class="sub">${esc(s.sub)} · ${s.products.map(it => esc(P[it.id].family)).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</span>
        </button>`).join('')}
      </div>`;
    $('left').querySelectorAll('.site-btn').forEach(b => {
      b.addEventListener('click', () => enterSite(b.dataset.id));
      b.addEventListener('pointerenter', () => setHover(b.dataset.id));
      b.addEventListener('pointerleave', () => setHover(null));
    });
    $('right').innerHTML = `
      <div>
        <div class="eyebrow">권장 구성 기준 예상 효과</div>
        <h2>현장별 한눈에 보기</h2>
      </div>
      <div style="overflow-x:auto">
      <table class="overview">
        <thead><tr><th>현장</th><th>핵심 지표 (기존→도입)</th><th style="text-align:right">연간 효과</th></tr></thead>
        <tbody>${rows.map(({ s, r }) => `
          <tr data-id="${s.id}">
            <td><b>${esc(s.name)}</b></td>
            <td class="num" style="text-align:left">${esc(kpi(r))}${r.pol ? ' ' + esc(r.pol.unit) : ''}</td>
            <td class="num">${r.totalBenefit > 0 ? fmt(r.totalBenefit) + '만원' : `<span class="muted">${r.pol && r.pol.c1 <= r.pol.limit ? '기준 충족' : '–'}</span>`}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="note">연간 효과는 전기요금 절감과 생산성·축산 개선을 금액으로 환산한 값입니다. 모든 수치는 현장 크기·발열 등 대표 조건을 넣은 단순 모델의 참고 추정치이며, 현장 조건을 바꾸면 다시 계산됩니다. 제품 사양은 카탈로그 최대 성능(60Hz) 기준입니다.</p>`;
    $('right').querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => enterSite(tr.dataset.id)));
  }
  function shortName(n) { return n.replace(/\(.*?\)/g, '').trim(); }

  /* ---------- 현장 진입 ---------- */
  function fade(fn) {
    const f = $('fade'); f.classList.add('on');
    setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 360);
  }
  function enterSite(id, instant) {
    const base = FZ.SITES.find(s => s.id === id);
    const m = E.minis.find(x => x.id === id);
    const go = () => {
      disposeSite();
      st.view = 'site';
      st.site = clone(base);
      st.qty = recQty(st.site);
      st.tab = 'install'; st.step = 0; st.stepK = 0; st.stepPlay = true; st.t = 0; st.simPlay = false; st.spin = 0;
      st.heat = st.site.tempOff ? 'pol' : 'temp';
      st.metric = st.site.pollutant ? 'pol' : 'temp';
      buildSite();
      $('pins').hidden = true; $('hint').hidden = false;
      $('crumbSep').hidden = false; $('crumbSite').textContent = st.site.name;
      if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
      renderAll();
    };
    if (instant || !m) { go(); return; }
    E.orbit.auto = 0;
    E.orbit.set({ target: new T.Vector3(m.x, 1, m.z), radius: 26, phi: 0.85 }, 0.7);
    setTimeout(() => fade(go), 450);
  }

  function buildSite() {
    const site = st.site, { L, W, H } = site.dims;
    const scene = new T.Scene();
    scene.background = new T.Color(0x0a1422);
    const span = Math.max(L, W) * 0.7 + 12;
    E.lights(scene, span);
    const grid = new T.GridHelper(Math.ceil(span * 5 / 10) * 10, Math.ceil(span * 5 / 10), 0x1e3554, 0x132640);
    grid.position.y = -0.21; scene.add(grid);
    const ground = new T.Mesh(new T.PlaneGeometry(span * 5, span * 5), new T.MeshStandardMaterial({ color: 0x0c1828, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.23; ground.receiveShadow = true; scene.add(ground);
    const bld = FZ.models.building(site, false); scene.add(bld);
    const inter = FZ.models.interior(site); scene.add(inter);
    inter.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const panel = new T.Group();
    const pb = new T.Mesh(new T.BoxGeometry(0.8, 1.5, 0.35), FZ.models.MAT.navy); pb.position.y = 0.95; panel.add(pb);
    const scr = new T.Mesh(new T.PlaneGeometry(0.5, 0.3), new T.MeshBasicMaterial({ color: 0x22d3ee })); scr.position.set(0, 1.3, 0.18); panel.add(scr);
    panel.position.set(-L / 2 + 0.9, 0, -W / 2 + 0.6);
    scene.add(panel);
    S = { scene, bld, inter, panelPos: new T.Vector3(-L / 2 + 0.9, 1.7, -W / 2 + 0.6), fanRoot: new T.Group(), groups: [], steam: [] };
    inter.traverse(o => { if (o.name === 'steam') S.steam.push(o); });
    scene.add(S.fanRoot);
    rebuildFans();
    E.scene = scene;
    const o = E.orbit; const big = Math.max(L, W);
    o.minR = Math.max(4, big * 0.25); o.maxR = big * 3 + 40; o.minPhi = 0.15; o.maxPhi = 1.48; o.auto = 0;
    const slim = Math.min(1, W / L); // 긴 건물은 옆에서 길게 보이도록
    const asp = Math.max(0.6, E.camera.aspect || 1);
    const hf = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(E.camera.fov / 2)) * asp); // 가로 시야각
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
    S.pls = pls;
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

  /* ---------- 렌더: 패널 ---------- */
  function renderAll() { renderLeft(); renderRight(); renderHud(); applyTabVisibility(); }

  function renderLeft() {
    const s = st.site, c = s.cond, d = s.dims;
    const people = s.mode === 'livestock' ? ['animals', '사육 수(수)'] : (c.workers != null ? ['workers', s.mode === 'office' ? '재실 인원(명)' : '작업자(명)'] : null);
    $('left').innerHTML = `
      <div>
        <div class="eyebrow">${esc(s.sub)}</div>
        <h2>${esc(s.name)}</h2>
        <p class="muted small" style="margin-top:6px">${esc(s.story)}</p>
      </div>
      <div class="card">
        <div class="row"><h3>현장 조건</h3><span class="muted small num">${fmt(d.L * d.W)}㎡ · ${fmt(d.L * d.W * d.H)}㎥</span></div>
        <div class="fields">
          ${fld('dimL', '길이(m)', d.L)}${fld('dimW', '폭(m)', d.W)}${fld('dimH', '높이(m)', d.H)}
          ${fld('cTout', s.id === 'datacenter' ? '급기 온도(℃)' : '외기 온도(℃)', c.tOut)}
          ${s.tempOff ? '' : fld('cHeat', '내부 발열(kW)', c.heat)}
          ${people ? fld('cPeople', people[1], c[people[0]]) : ''}
        </div>
      </div>
      <div class="row"><h3>설치 제품</h3><button type="button" class="linkbtn" id="resetQty">권장 대수로 맞추기</button></div>
      ${s.products.map(it => prodCard(s, it)).join('')}
    `;
    const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : null; };
    const bind = (id, fn, rebuild) => { const el = $(id); if (!el) return; el.addEventListener('change', () => { const v = num(id); if (v == null || v < 0) { renderLeft(); return; } fn(v); onSiteChange(rebuild); }); };
    bind('dimL', v => { s.dims.L = Math.max(8, Math.min(300, v)); }, true);
    bind('dimW', v => { s.dims.W = Math.max(6, Math.min(200, v)); }, true);
    bind('dimH', v => { s.dims.H = Math.max(2.4, Math.min(40, v)); }, true);
    bind('cTout', v => { c.tOut = v; });
    bind('cHeat', v => { c.heat = v; });
    if (people) bind('cPeople', v => { c[people[0]] = Math.round(v); });
    $('resetQty').addEventListener('click', () => { st.qty = recQty(s); rebuildFans(); renderLeft(); renderRight(); });
    $('left').querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id, dv = +b.dataset.q;
      st.qty[id] = Math.max(1, Math.min(40, st.qty[id] + dv));
      rebuildFans(); renderLeft(); renderRight();
    }));
  }
  function fld(id, label, v) { return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" value="${v}"></div>`; }
  function prodCard(s, it) {
    const p = P[it.id], n = st.qty[it.id], rec = FZ.sim.recommend(s, it);
    return `<div class="prod">
      <div class="head">
        <div><b>${esc(p.name)}</b><div class="model">${esc(p.model)}</div></div>
        <div class="stepper" role="group" aria-label="${esc(p.name)} 수량">
          <button type="button" data-q="-1" data-id="${it.id}" aria-label="한 대 줄이기">−</button>
          <output class="num">${n}</output>
          <button type="button" data-q="1" data-id="${it.id}" aria-label="한 대 늘리기">+</button>
        </div>
      </div>
      <div class="specs">
        <div><span>대당 풍량</span><em>${p.airflow ? fmt(p.airflow) : '–'}</em></div>
        <div><span>소비전력</span><em>${fmt(p.power / 1000, 2)}kW</em></div>
        <div><span>정압</span><em>${p.pressure ? p.pressure + 'mmAq' : '–'}</em></div>
      </div>
      <p class="small muted">${esc(p.note)}</p>
      <div class="chips">
        <span class="chip">${I.MOUNT_LABEL[mountOf(it)]}</span>
        <span class="chip">권장 ${rec}대 · ${esc(sizingText(s, it))}</span>
        ${p.acc.map(a => `<span class="chip">${esc(a)}</span>`).join('')}
        ${p.rep ? '<span class="chip rep">대표값</span>' : ''}
      </div>
    </div>`;
  }
  function onSiteChange(rebuild) {
    if (rebuild) {
      const keepTab = st.tab;
      st.qty = recQty(st.site);
      disposeSite(); buildSite();
      st.tab = keepTab;
    } else { st.res = computeFor(st.site, st.qty); }
    renderLeft(); renderRight(); applyTabVisibility();
  }

  function renderRight() {
    const r = st.res = computeFor(st.site, st.qty);
    if (st.tab === 'install') renderInstall();
    else if (st.tab === 'effect') renderEffect(r);
    else renderSummaryPanel(r);
  }

  function renderInstall() {
    const mounts = [...new Set(st.site.products.map(mountOf))];
    $('right').innerHTML = `
      <div>
        <div class="eyebrow">설치 과정 · ${mounts.map(m => I.MOUNT_LABEL[m]).join(' · ')}</div>
        <h2>${S.groups.length}대 설치 순서</h2>
      </div>
      <ol class="steps">${I.STEPS.map((s, i) => `
        <li class="${i === st.step ? 'cur' : i < st.step ? 'done' : ''}">
          <button type="button" data-step="${i}">
            <span class="no">${i + 1}</span><span class="t">${s.title}</span>
            <span class="d mounts">${mounts.map(m => `<p><b>${I.MOUNT_LABEL[m]}</b> ${esc(I.TEXT[m][i])}</p>`).join('')}</span>
          </button>
        </li>`).join('')}
      </ol>
      <p class="note">실제 시공은 현장 구조·전기 용량 검토 후 팬직 기술지원팀과 협의해 진행합니다. 단계를 누르면 해당 장면으로 이동합니다.</p>`;
    $('right').querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { st.step = +b.dataset.step; st.stepK = 0; st.stepPlay = true; updateStepUI(); }));
    updateCaption();
  }
  function updateStepUI() {
    if (st.tab !== 'install') return;
    $('right').querySelectorAll('.steps li').forEach((li, i) => { li.className = i === st.step ? 'cur' : i < st.step ? 'done' : ''; });
    updateCaption(); renderHud();
  }
  function updateCaption() {
    const cap = $('stepCap');
    if (st.tab !== 'install') { cap.hidden = true; return; }
    const m = mountOf(st.site.products[0]);
    cap.hidden = false;
    cap.innerHTML = `<span class="n">STEP ${st.step + 1} / 6</span><b>${I.STEPS[st.step].title}</b><span class="small muted">${esc(I.TEXT[m][st.step])}</span>`;
  }

  function renderEffect(r) {
    const s = st.site;
    const cards = [];
    cards.push(kpiCard('ach', '환기 횟수', '회/h'));
    if (r.pol) cards.push(kpiCard('pol', r.pol.name, r.pol.unit));
    const it = s.mode === 'it';
    if (r.tempOn && !it) cards.push(kpiCard('teff', r.animal ? '체감 온도(가축)' : '체감 온도', '℃'));
    if (r.tempOn) cards.push(kpiCard('temp', it ? '서버실 평균 온도' : '실내 온도', '℃'));
    cards.push(kpiCard('v', '평균 풍속', 'm/s'));
    cards.push(kpiCard('kw', '설비 소비전력', 'kW'));
    const metrics = [];
    if (r.pol) metrics.push(['pol', '공기질']);
    if (r.tempOn) metrics.push(['temp', it ? '서버실 온도' : '체감 온도']);
    if (!metrics.some(m => m[0] === st.metric)) st.metric = metrics[0][0];
    const e = r.energy;
    $('right').innerHTML = `
      <div>
        <div class="eyebrow">효과 시뮬레이션 · 가동 후 60분</div>
        <h2 id="effTitle">가동 전</h2>
      </div>
      <div class="kpis">${cards.join('')}</div>
      <div class="chartbox">
        <div class="row"><h3>시간에 따른 변화</h3>
          <div class="seg" role="group" aria-label="차트 지표">${metrics.map(m => `<button type="button" data-metric="${m[0]}" aria-pressed="${st.metric === m[0]}">${m[1]}</button>`).join('')}</div>
        </div>
        <canvas id="chart" aria-label="시간에 따른 변화 차트"></canvas>
        <div class="keys"><span><i></i>팬 가동 후</span><span><i class="b"></i>기존 상태</span></div>
      </div>
      ${prodBlock(r)}
      <div class="card">
        <div class="row"><h3>에너지·비용</h3><span class="muted small">연 ${fmt(e.hrs)}시간 가동</span></div>
        <div class="row small"><span class="muted">연간 전력량</span><span class="num">${fmt(e.kWh)} kWh</span></div>
        <div class="row small"><span class="muted">연간 전기요금</span><span class="num">${fmt(e.costWon / 10000)} 만원</span></div>
        ${e.saveKWh > 0 ? `
        <div class="row small"><span class="muted">기존 대비 절감</span><span class="num" style="color:var(--good)">${fmt(e.saveWon / 10000)} 만원/년</span></div>
        <div class="row small"><span class="muted">CO₂ 감축</span><span class="num">${fmt(e.co2t, 1)} tCO₂/년</span></div>
        <p class="note">비교 기준: ${esc(e.baseNotes.join(', '))}</p>` : '<p class="note">이 현장은 환기 성능 확보가 목적이라 기존 설비 대비 절감액은 계산하지 않았습니다.</p>'}
        ${r.payback ? `<div class="row small"><span class="muted">투자 회수 기간</span><span class="num">${fmt(r.payback, 1)} 년</span></div>` : ''}
      </div>
      <details class="assume">
        <summary>계산 가정값 바꾸기</summary>
        <div class="fields">
          ${fld('pPrice', '전기요금(원/kWh)', st.prm.elecPrice)}
          ${fld('pCo2', '배출계수(kg/kWh)', st.prm.co2Factor)}
          ${fld('pEc', 'EC 절감률(%)', st.prm.ecSave)}
          ${fld('pLoss', '1℃당 효율저하(%)', st.prm.heatLoss)}
          ${fld('pWage', '1인 연인건비(만원)', st.prm.wage)}
          ${fld('pHot', '고온기 일수', st.prm.hotDays)}
          ${fld('pCost', '총 설치비(만원)', st.prm.installCost)}
        </div>
      </details>
      <p class="note">단순 모델 기반 참고 추정치입니다. 환기: C(t)=C∞+(C₀−C∞)·e^(−ACH·t), 온도: T=T외기+발열/(UA+Q/3000), 체감: 풍속에 따른 냉각효과(사람 최대 4.5℃, 가축 최대 7℃). 정확한 선정은 현장 실측 후 진행합니다.</p>`;
    $('right').querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => { st.metric = b.dataset.metric; $('right').querySelectorAll('[data-metric]').forEach(x => x.setAttribute('aria-pressed', x.dataset.metric === st.metric)); drawChart(); }));
    const map = { pPrice: 'elecPrice', pCo2: 'co2Factor', pEc: 'ecSave', pLoss: 'heatLoss', pWage: 'wage', pHot: 'hotDays', pCost: 'installCost' };
    Object.entries(map).forEach(([id, k]) => $(id).addEventListener('change', () => {
      const v = parseFloat($(id).value); if (isFinite(v) && v >= 0) st.prm[k] = k === 'ecSave' ? Math.min(80, v) : v;
      const open = true; renderRight(); $('right').querySelector('details').open = open;
    }));
    updateLive(true);
  }
  function kpiCard(key, lab, unit) {
    return `<div class="kpi" data-k="${key}"><span class="lab">${esc(lab)}</span><span class="val"><span class="v">–</span><small>${esc(unit)}</small></span><span class="was"></span><span class="st" hidden></span></div>`;
  }
  function prodBlock(r) {
    const p = r.prod; if (!p) return '';
    const val = p.value > 0 ? `<div class="row small"><span class="muted">연간 환산 효과</span><span class="num" style="color:var(--good)">${fmt(p.value)} 만원</span></div><p class="note">${esc(p.valueLabel)}</p>` : '';
    if (p.kind === 'livestock') return `<div class="card"><h3>가축 열 스트레스</h3>
      <div class="row small"><span class="muted">THI (열 스트레스 지수)</span><span class="num">${fmt(p.thi0, 1)} → <b>${fmt(p.thi1, 1)}</b></span></div>
      <div class="row small"><span class="muted">고온기 폐사율</span><span class="num">${fmt(p.mort0, 1)}% → <b>${fmt(p.mort1, 1)}%</b></span></div>
      <div class="row small"><span class="muted">증체 저하</span><span class="num">${fmt(p.g0, 1)}% → <b>${fmt(p.g1, 1)}%</b></span></div>
      <div class="row small"><span class="muted">폐사 감소</span><span class="num">${fmt(p.heads)} 수</span></div>${val}</div>`;
    if (p.kind === 'it') {
      const s0 = status(p.before, 27), s1 = status(p.after, 27);
      return `<div class="card"><h3>서버 흡기 온도</h3><div class="row small"><span class="muted">기존 → EC 팬월</span><span class="num">${fmt(p.before, 1)}℃ → <b>${fmt(p.after, 1)}℃</b></span></div><p class="note">ASHRAE 권장 흡기 온도 18~27℃. 기존 ${s0[1]}, 도입 후 ${s1[1]}. 핵심 효과는 아래 에너지 절감입니다.</p></div>`;
    }
    return `<div class="card"><h3>${esc(p.label)}</h3><div class="row small"><span class="muted">기존 → 도입 후</span><span class="num">${fmt(p.before, 1)}% → <b>${fmt(p.after, 1)}%</b></span></div>${val}</div>`;
  }

  // 시간에 따라 바뀌는 값 갱신
  function updateLive(force) {
    if (st.tab !== 'effect' || !st.res) return;
    const r = st.res, now = r.at(st.t), was = r.at(0);
    const title = $('effTitle'); if (title) title.textContent = st.t <= 0 ? '가동 전 (기존 상태)' : st.t < 1 ? `가동 ${Math.round(st.t * 60)}초 후` : `가동 ${Math.floor(st.t)}분 후`;
    const set = (k, v, w, d, lim, lower = true) => {
      const el = $('right').querySelector(`.kpi[data-k="${k}"]`); if (!el) return;
      el.querySelector('.v').textContent = fmt(v, d);
      el.querySelector('.was').textContent = st.t > 0 ? `기존 ${fmt(w, d)}` : ' ';
      const sb = el.querySelector('.st');
      const ss = status(v, lim, lower);
      if (ss) { sb.hidden = false; sb.className = 'st ' + ss[0]; sb.textContent = ss[1]; } else sb.hidden = true;
    };
    const achNow = st.t > 0 ? r.ach : r.ach0;
    set('ach', achNow, r.ach0, 1);
    if (r.pol) set('pol', now.C, was.C, r.pol.dec, r.pol.limit);
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
    const r = st.res;
    const N = 61, after = [];
    if (st.metric === 'pol' && r.pol) {
      for (let i = 0; i < N; i++) after.push(r.at(Math.max(0.001, i)).C);
      X.chart(cv, { after, before: r.pol.c0, limit: r.pol.limit, t: st.t, zero: true, fmt: v => fmt(v, r.pol.dec > 1 ? 1 : r.pol.dec), valueAt: t => r.at(Math.max(0.001, t)).C });
    } else {
      const key = st.site.mode === 'it' ? 'T' : 'Teff';
      for (let i = 0; i < N; i++) after.push(r.at(Math.max(0.001, i))[key]);
      X.chart(cv, { after, before: r.at(0)[key], limit: r.animal || key === 'T' ? null : 28, t: st.t, fmt: v => fmt(v, 0) + '℃', valueAt: t => r.at(Math.max(0.001, t))[key] });
    }
  }

  function renderSummaryPanel(r) {
    $('right').innerHTML = `
      <div><div class="eyebrow">상담 요약</div><h2>제안 내용 정리</h2></div>
      <p class="muted small">현장 조건, 제품 구성, 예상 효과를 한 장으로 정리했습니다. 요약 텍스트를 복사해 메신저나 견적 메일에 붙여 넣을 수 있습니다.</p>
      <button type="button" class="ctrl primary" id="openSheet">요약 시트 열기</button>`;
    $('openSheet').addEventListener('click', openSheet);
    openSheet();
  }

  function openSheet() {
    const r = st.res, s = st.site, e = r.energy;
    const today = new Date();
    const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    const rows = effectRows(r);
    const polRow = r.pol ? `${shortName(r.pol.name)} ${fmt(r.pol.c0, r.pol.dec)} → ${fmt(r.pol.c1, r.pol.dec)}${r.pol.unit}` : null;
    const big2 = r.pol ? ['공기질 (' + shortName(r.pol.name) + ')', `${fmt(r.pol.c0, r.pol.dec)}→${fmt(r.pol.c1, r.pol.dec)}`] : ['체감 온도', `${fmt(r.Teff0, 1)}→${fmt(r.steady.Teff, 1)}℃`];
    $('sheet').innerHTML = `
      <div class="paper" role="dialog" aria-label="상담 요약">
        <div class="meta">
          <div><img src="${FZ.LOGO}" alt="FANZIC"><h2 style="margin-top:10px">${esc(s.name)} 환기 제안 요약</h2><p class="story">${esc(s.story)}</p></div>
          <div class="num" style="font-size:12px;color:#5a6b80;text-align:right">${date}<br>${fmt(s.dims.L)}×${fmt(s.dims.W)}×${fmt(s.dims.H)}m · ${fmt(r.g.V)}㎥</div>
        </div>
        <div class="big">
          <div><span>환기 횟수</span><b>${fmt(r.ach0, 1)}→${fmt(r.ach, 1)}</b> 회/h</div>
          <div><span>${esc(big2[0])}</span><b>${esc(big2[1])}</b></div>
          <div><span>연간 환산 효과</span><b>${r.totalBenefit > 0 ? fmt(r.totalBenefit) : '–'}</b> 만원</div>
        </div>
        <div class="tw"><table>
          <thead><tr><th>제품</th><th>모델</th><th>설치 방식</th><th class="num">수량</th><th class="num">대당 풍량(㎥/h)</th><th class="num">대당 전력(kW)</th></tr></thead>
          <tbody>${s.products.map(it => { const p = P[it.id]; return `<tr><td>${esc(p.name)}${p.rep ? ' *' : ''}</td><td class="num">${esc(p.model)}</td><td>${I.MOUNT_LABEL[mountOf(it)]}</td><td class="num">${st.qty[it.id]}</td><td class="num">${p.airflow ? fmt(p.airflow) : '–'}</td><td class="num">${fmt(p.power / 1000, 2)}</td></tr>`; }).join('')}</tbody>
        </table></div>
        <div class="tw"><table>
          <thead><tr><th>항목</th><th class="num">기존</th><th class="num">도입 후</th><th class="num">변화</th></tr></thead>
          <tbody>${rows.map(x => `<tr><td>${esc(x.k)}${x.lim != null ? ` <span style="color:#5a6b80;font-size:11px">(기준 ${fmt(x.lim, x.d)})</span>` : ''}</td><td class="num">${fmt(x.a, x.d)} ${esc(x.u)}</td><td class="num"><b>${fmt(x.b, x.d)}</b> ${esc(x.u)}</td><td class="num">${x.b - x.a >= 0 ? '+' : ''}${fmt(x.b - x.a, x.d)}</td></tr>`).join('')}
            <tr><td>설비 소비전력 / 연간 전기요금</td><td class="num">–</td><td class="num">${fmt(e.kW, 1)} kW / ${fmt(e.costWon / 10000)}만원</td><td></td></tr>
            ${e.saveKWh > 0 ? `<tr><td>기존 대비 전기요금 절감 / CO₂ 감축</td><td class="num">–</td><td class="num" style="color:#15803d"><b>${fmt(e.saveWon / 10000)}만원</b> / ${fmt(e.co2t, 1)}t</td><td></td></tr>` : ''}
            ${r.prod && r.prod.value > 0 ? `<tr><td>생산성·축산 개선 환산</td><td class="num">–</td><td class="num" style="color:#15803d"><b>${fmt(r.prod.value)}만원</b>/년</td><td></td></tr>` : ''}
            ${r.payback ? `<tr><td>투자 회수 기간</td><td class="num">–</td><td class="num"><b>${fmt(r.payback, 1)}년</b></td><td></td></tr>` : ''}
          </tbody>
        </table></div>
        <div class="foot">가정값: 전기요금 ${fmt(st.prm.elecPrice)}원/kWh · 배출계수 ${st.prm.co2Factor}kgCO₂/kWh · EC 절감률 ${st.prm.ecSave}% · 연 가동 ${fmt(e.hrs)}시간(부하율 80%)${r.prod && r.prod.valueLabel ? ' · ' + esc(r.prod.valueLabel) : ''}.<br>
          본 자료는 대표 조건을 넣은 단순 모델의 참고 추정치이며 성능을 보증하지 않습니다. 제품 사양은 카탈로그 최대 성능(60Hz) 기준이고, * 표시는 대표값입니다. 정확한 선정은 현장 실측 후 팬직 기술지원팀이 진행합니다.</div>
        <div class="acts"><button type="button" id="copySum" class="pri">요약 텍스트 복사</button><button type="button" id="closeSheet">닫기</button></div>
        <textarea id="copyBox" readonly hidden style="width:100%;height:160px;font:12px var(--f-mono)"></textarea>
      </div>`;
    $('sheet').hidden = false;
    const text = [
      `[팬직 ${s.name} 환기 제안 요약] ${date}`,
      `현장: ${s.dims.L}×${s.dims.W}×${s.dims.H}m (${fmt(r.g.V)}㎥)`,
      `제품: ` + s.products.map(it => `${P[it.id].name} ${P[it.id].model} ${st.qty[it.id]}대`).join(', '),
      ...rows.map(x => `- ${x.k}: ${fmt(x.a, x.d)} → ${fmt(x.b, x.d)} ${x.u}`),
      `- 설비 전력 ${fmt(e.kW, 1)}kW, 연간 전기요금 약 ${fmt(e.costWon / 10000)}만원` + (e.saveKWh > 0 ? `, 기존 대비 절감 ${fmt(e.saveWon / 10000)}만원/년` : ''),
      r.totalBenefit > 0 ? `- 연간 환산 효과 약 ${fmt(r.totalBenefit)}만원` : '',
      `※ 단순 모델 기반 참고 추정치, 현장 실측 후 확정`
    ].filter(Boolean).join('\n');
    $('copySum').addEventListener('click', () => {
      const btn = $('copySum');
      const fallback = () => { const b = $('copyBox'); b.hidden = false; b.value = text; b.focus(); b.select(); btn.textContent = '아래 텍스트를 복사하세요'; };
      try {
        navigator.clipboard.writeText(text).then(() => { btn.textContent = '복사했습니다'; setTimeout(() => { btn.textContent = '요약 텍스트 복사'; }, 1800); }, fallback);
      } catch (err) { fallback(); }
    });
    $('closeSheet').addEventListener('click', () => { $('sheet').hidden = true; });
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    const hud = $('hud');
    if (st.view !== 'site') { hud.hidden = true; return; }
    hud.hidden = false;
    const tabs = [['install', '설치 과정'], ['effect', '효과 시뮬레이션'], ['summary', '상담 요약']];
    let ctrls = '';
    if (st.tab === 'install') {
      ctrls = `<button type="button" class="ctrl" id="sPrev" ${st.step === 0 ? 'disabled' : ''}>이전</button>
        <button type="button" class="ctrl primary" id="sPlay">${st.stepPlay ? '일시정지' : (st.step === 5 && st.stepK >= 1 ? '처음부터' : '재생')}</button>
        <button type="button" class="ctrl" id="sNext" ${st.step === 5 ? 'disabled' : ''}>다음</button>
        ${st.step === 5 && st.stepK >= 1 ? '<button type="button" class="ctrl primary" id="toEffect">효과 보기</button>' : ''}`;
    } else if (st.tab === 'effect') {
      ctrls = `<button type="button" class="ctrl primary" id="tPlay">${st.simPlay ? '일시정지' : st.t >= 60 ? '다시 가동' : st.t > 0 ? '계속' : '팬 가동'}</button>
        <div class="timebox"><input type="range" id="tSlider" min="0" max="60" step="0.5" value="${st.t}" aria-label="가동 시간(분)"><span class="clock" id="clock">00:00</span></div>`;
    }
    hud.innerHTML = `<div class="bar"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${st.tab === k}">${l}</button>`).join('')}</div>${ctrls}</div>`;
    hud.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('sPrev', () => { st.step = Math.max(0, st.step - 1); st.stepK = 0; st.stepPlay = true; updateStepUI(); });
    on('sNext', () => { st.step = Math.min(5, st.step + 1); st.stepK = 0; st.stepPlay = true; updateStepUI(); });
    on('sPlay', () => {
      if (st.step === 5 && st.stepK >= 1 && !st.stepPlay) { st.step = 0; st.stepK = 0; st.stepPlay = true; }
      else st.stepPlay = !st.stepPlay;
      updateStepUI();
    });
    on('toEffect', () => setTab('effect'));
    on('tPlay', () => { if (st.t >= 60) st.t = 0; st.simPlay = !st.simPlay; renderHud(); updateLive(); });
    const sl = $('tSlider');
    if (sl) sl.addEventListener('input', () => { st.t = +sl.value; st.simPlay = false; renderHudBtn(); updateLive(); heatTimer = 1; });
    updateLive();
  }
  function renderHudBtn() { const b = $('tPlay'); if (b) b.textContent = st.simPlay ? '일시정지' : st.t >= 60 ? '다시 가동' : st.t > 0 ? '계속' : '팬 가동'; }

  function setTab(tab) {
    st.tab = tab;
    $('sheet').hidden = true;
    if (tab === 'effect') { st.t = 0; st.simPlay = true; }
    if (tab === 'install') { st.step = 0; st.stepK = 0; st.stepPlay = true; }
    renderRight(); renderHud(); applyTabVisibility();
  }
  function applyTabVisibility() {
    if (!S) return;
    const eff = st.tab !== 'install';
    S.heatmap.mesh.visible = eff;
    $('legend').hidden = !eff || st.view !== 'site';
    $('stepCap').hidden = st.tab !== 'install';
    if (eff) { renderLegend(); I.apply(S.groups, 6, 1, 0); }
    heatTimer = 1; lastRun = null;
  }
  function renderLegend() {
    const r = st.res, lg = $('legend');
    const modes = [];
    if (r.tempOn) { modes.push(['temp', '실내 온도']); if (st.site.mode !== 'it') modes.push(['feel', '체감 온도']); }
    if (r.pol) modes.push(['pol', '공기질']);
    if (!modes.some(m => m[0] === st.heat)) st.heat = modes[0][0];
    const R = st.heat === 'pol' ? X.RAMP_C : X.RAMP_T;
    const lo = R[0][0], hi = R[R.length - 1][0];
    const g = R.map(([v, c]) => `rgb(${c.join(',')}) ${((v - lo) / (hi - lo) * 100).toFixed(0)}%`).join(',');
    const ends = st.heat === 'pol' ? ['깨끗', '기준', '기준 2배+'] : ['16℃', '27℃', '38℃'];
    lg.innerHTML = `<div class="seg" role="group" aria-label="바닥 색 표시">${modes.map(m => `<button type="button" data-heat="${m[0]}" aria-pressed="${st.heat === m[0]}">${m[1]}</button>`).join('')}</div>
      <div class="grad" style="background:linear-gradient(90deg,${g})"></div><div class="ends"><span>${ends[0]}</span><span>${ends[1]}</span><span>${ends[2]}</span></div>`;
    lg.querySelectorAll('[data-heat]').forEach(b => b.addEventListener('click', () => { st.heat = b.dataset.heat; renderLegend(); heatTimer = 1; }));
  }

  /* ---------- 프레임 ---------- */
  const SPIN = { hvls: 1.4, belt: 9, propeller: 11, roof: 10, inline: 14, centrifugal: 14, circ: 12, jet: 16, ec: 13, diffuser: 0, axialStand: 12, defroster: 7 };
  function spinFan(f, rate, dt) {
    if (!f.rotor) return;
    if (f.axis === 'y') f.rotor.rotation.y += rate * dt; else f.rotor.rotation.z += rate * dt;
  }
  function tick(dt, time) {
    if (st.view === 'map') {
      E.minis.forEach(m => {
        spinFan(m.fan, SPIN[m.fan.group.userData.kind] || 6, dt);
        const tgt = st.hover === m.id ? 0.9 : 0;
        m.glow.material.opacity += (tgt - m.glow.material.opacity) * Math.min(1, dt * 8);
        if (m.pin) { const p = E.project(m.labelPos); m.pin.style.left = p.x + 'px'; m.pin.style.top = p.y + 'px'; m.pin.style.visibility = p.vis ? 'visible' : 'hidden'; }
      });
      return;
    }
    if (!S) return;
    let running = false;
    if (st.tab === 'install') {
      if (st.stepPlay) {
        st.stepK += dt / 3.2;
        if (st.stepK >= 1) {
          if (st.step < 5) { st.step++; st.stepK = 0; } else { st.stepK = 1; st.stepPlay = false; }
          updateStepUI();
        }
      }
      I.apply(S.groups, st.step, st.stepK, time);
      running = st.step === 5 && st.stepK > 0.15;
    } else {
      if (st.simPlay) {
        st.t = Math.min(60, st.t + dt * 3);
        if (st.t >= 60) { st.simPlay = false; renderHudBtn(); }
      }
      running = st.t > 0;
      liveTimer += dt;
      if (liveTimer > 0.12 && st.tab === 'effect') { liveTimer = 0; updateLive(); }
    }
    st.spin += ((running ? 1 : 0) - st.spin) * Math.min(1, dt * 1.6);
    S.groups.forEach(g => {
      spinFan(g.fan, (SPIN[g.pl.kind] || 10) * st.spin, dt);
      const sh = g.fan.group.getObjectByName('shutter');
      if (sh) sh.children.forEach(pv => { pv.rotation.x = -1.25 * st.spin; });
    });
    // 히트맵·파티클
    const showFlow = st.tab !== 'install' || running;
    S.particles.points.visible = showFlow;
    if (st.tab !== 'install') {
      if (lastRun !== running) { S.heatmap.sampleField(running, time); lastRun = running; heatTimer = 1; }
      heatTimer += dt;
      if (heatTimer > 0.2) { heatTimer = 0; const a = st.res.at(st.t); S.heatmap.update({ ...a, on: running }, st.res, st.heat); }
    }
    if (showFlow) {
      const effTab = st.tab !== 'install';
      const R = st.heat === 'pol' ? X.RAMP_C : X.RAMP_T;
      const cool = [125, 211, 252];
      S.particles.update(dt, running, time, effTab ? (x, z) => X.ramp(R, S.heatmap.valueAt(x, z)) : () => cool);
    }
    if (S.steam.length && st.res.pol) {
      const rh = st.res.at(st.tab === 'install' ? 0 : st.t).C;
      S.steam.forEach((m, i) => { m.material.opacity = 0.015 + 0.11 * Math.max(0, (rh - 40) / 60); m.position.y += Math.sin(time + i) * 0.002; });
    }
  }

  // 미니 팬 종류 기록 (지도 회전 속도용)
  const _fan = FZ.models.fan;
  FZ.models.fan = function (kind, s) { const f = _fan(kind, s); f.group.userData.kind = kind; return f; };

  window.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
