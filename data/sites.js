/* 용도별 기본 조건(프리셋) 12종 + 환경 조건 → 가상 현장 + 추천 점수.
   아래 12개 정의는 용도 프리셋으로만 쓰이며, 화면에서는 사용자가 정한 면적·높이·문제에 맞춰 다시 만들어진다.
   (원래: 설치 현장 정의 메트릭스 10곳 + 온실·지하주차장) 치수 m, 온도 ℃, 발열 kW, UA(외피 열손실) kW/K.
   pollutant.c0 = 기존(자연환기) 상태의 평균 농도 → 발생량은 c0 기준으로 역산.
   pm = 미세먼지(PM2.5) 보조 지표, 필터 제품 효과가 반영됨.
   target = 배기 제품 전체가 나눠 맡을 목표 환기량 기준, defaults = 처음 선택되는 추천 제품 */
window.FZ = window.FZ || {};

(function () {
  const PM = { name: '미세먼지(PM2.5)', unit: '㎍/㎥', cOut: 35, c0: 45, limit: 35, limitLabel: '실내 권고 35', dec: 0 };

  FZ.SITES = [
    {
      id: 'house', name: '주택', sub: '아파트 거실·주방·욕실', kind: 'house',
      dims: { L: 12, W: 8, H: 2.6 }, roof: 'flat', tint: 0xe3d7c6,
      cond: { tOut: 26, tIn: 25, heat: 0, UA: 1, ach0: 0.5, rh: 60, workers: 3 },
      pollutant: { name: '이산화탄소(CO₂)', unit: 'ppm', cOut: 420, c0: 1800, limit: 1000, limitLabel: '실내 기준 1,000', dec: 0 },
      pm: { ...PM }, tempOff: true, mode: 'none', hours: 8, days: 365,
      target: { type: 'ach', value: 3 },
      defaults: ['vent', 'round_duct', 'purigen'],
      heatSources: [], inlets: ['+z'],
      story: '욕실·주방 환풍기와 덕트팬으로 습기·CO₂를 빼고, HEPA 디퓨져 필터로 미세먼지를 걸러냅니다.'
    },
    {
      id: 'commercial', name: '상업시설', sub: '매장·카페·사무실', kind: 'office',
      dims: { L: 30, W: 20, H: 3.5 }, roof: 'flat', tint: 0xb9c6d3,
      cond: { tOut: 27, heat: 0, UA: 3, ach0: 0.5, rh: 50, workers: 60 },
      pollutant: { name: '이산화탄소(CO₂)', unit: 'ppm', cOut: 420, c0: 1750, limit: 1000, limitLabel: '실내 기준 1,000', dec: 0 },
      pm: { ...PM }, tempOff: true, mode: 'office', hours: 12, days: 330,
      target: { type: 'perPerson', value: 30 },
      defaults: ['square_duct', 'fandora', 'hoodcap'],
      heatSources: [], inlets: ['+z'],
      story: '저소음 사각 덕트팬으로 손님이 몰려도 CO₂를 기준 아래로 유지하고, 팬도라 필터로 냄새·먼지를 줄입니다.'
    },
    {
      id: 'hospital', name: '병원', sub: '병동·대기실·진료실', kind: 'hospital',
      dims: { L: 30, W: 15, H: 3 }, roof: 'flat', tint: 0xdfe8ef,
      cond: { tOut: 26, heat: 0, UA: 2, ach0: 1, rh: 50, workers: 40 },
      pollutant: { name: '이산화탄소(CO₂)', unit: 'ppm', cOut: 420, c0: 1500, limit: 1000, limitLabel: '실내 기준 1,000', dec: 0 },
      pm: { ...PM }, tempOff: true, mode: 'none', hours: 24, days: 365,
      target: { type: 'ach', value: 6 },
      defaults: ['sus_sirocco', 'purigen', 'diffuser_fan'],
      heatSources: [], inlets: ['+z'],
      story: '위생적인 SUS 시로코팬으로 병실 환기횟수를 확보하고, HEPA 디퓨져 필터로 깨끗한 공기를 공급합니다.'
    },
    {
      id: 'restaurant', name: '식당', sub: '업소용 주방·단체급식', kind: 'kitchen',
      dims: { L: 15, W: 10, H: 3.2 }, roof: 'flat', tint: 0xd6c7b8,
      cond: { tOut: 31, heat: 20, UA: 1, ach0: 10, rh: 65, workers: 8 },
      pollutant: { name: '유증기', unit: 'mg/㎥', cOut: 0, c0: 3, limit: 1, limitLabel: '참고 관리값 1.0', dec: 2 },
      mode: 'worker', hours: 12, days: 330,
      target: { type: 'ach', value: 30 },
      defaults: ['double_sirocco', 'fandora', 'hoodcap'],
      heatSources: [[0, -0.3, 0.35, 1]], inlets: ['+z'],
      story: '양흡 시로코팬으로 기름 섞인 열기를 덕트 끝까지 뽑고, 팬도라 필터·후드캡으로 배출구를 깔끔하게 마감합니다.'
    },
    {
      id: 'factory', name: '공장', sub: '제조 공장·생산동', kind: 'factory',
      dims: { L: 60, W: 30, H: 10 }, roof: 'gable', tint: 0x8fa3b8,
      cond: { tOut: 30, heat: 120, UA: 11, ach0: 1, rh: 60, workers: 40 },
      pollutant: { name: '미세먼지(PM10)', unit: '㎍/㎥', cOut: 40, c0: 300, limit: 100, limitLabel: '실내 관리기준 100', dec: 0, filterable: true },
      mode: 'worker', hours: 10, days: 300,
      target: { type: 'ach', value: 8 },
      defaults: ['prop_large', 'tfp-g60-chimney', 'hvls'],
      heatSources: [[-0.25, -0.15, 0.18, 1], [0.1, 0.2, 0.15, 0.8], [0.3, -0.2, 0.12, 0.7]], inlets: ['-x'],
      story: '측벽 대형 고압팬과 굴뚝팬으로 열기를 빼고, 대형실링팬으로 작업자 체감온도를 낮춥니다.'
    },
    {
      id: 'logistics', name: '물류센터', sub: '물류창고·대형 매장', kind: 'logistics',
      dims: { L: 100, W: 50, H: 12 }, roof: 'flat', tint: 0xa7b4c2,
      cond: { tOut: 33, heat: 150, UA: 30, ach0: 0.5, rh: 60, workers: 60 },
      pollutant: { name: '미세먼지(PM10)', unit: '㎍/㎥', cOut: 40, c0: 250, limit: 100, limitLabel: '실내 관리기준 100', dec: 0, filterable: true },
      mode: 'worker', hours: 12, days: 330,
      target: { type: 'ach', value: 2 },
      defaults: ['hvls', 'tfp-g60-chimney'],
      heatSources: [[0, 0, 0.5, 0.6]], inlets: ['-x', '+z'],
      story: '대형실링팬 몇 대로 선풍기 수십 대를 대체하고, 굴뚝팬으로 축열된 상부 열기를 배출합니다.'
    },
    {
      id: 'barn', name: '축사', sub: '육계·산란계 계사', kind: 'barn',
      dims: { L: 90, W: 14, H: 3.5 }, roof: 'gable', tint: 0xc9b99a,
      cond: { tOut: 32, heat: 160, UA: 4, ach0: 15, rh: 70, animals: 20000 },
      pollutant: { name: '암모니아(NH₃)', unit: 'ppm', cOut: 0, c0: 25, limit: 20, limitLabel: '권장 20 이하', dec: 1 },
      mode: 'livestock', hours: 16, days: 150,
      livestock: { label: '육계', value: 3000, flocks: 1.5 },
      target: { type: 'velocity', value: 2.5 },
      defaults: ['prop_belt', 'safety_net'],
      heatSources: [[0, 0, 0.6, 0.5]], inlets: ['-x'],
      story: '박공벽에 벨트형 고압팬을 모아 다는 터널 환기로 계사 전체에 2.5m/s 바람을 만들어 열 스트레스를 줄입니다.'
    },
    {
      id: 'datacenter', name: '데이터센터', sub: '서버실·통신실', kind: 'datacenter',
      dims: { L: 30, W: 20, H: 4 }, roof: 'flat', tint: 0x7d8ea3,
      cond: { tOut: 18, heat: 200, UA: 0, ach0: 0, q0: 40000, rh: 45 },
      pollutant: null,
      mode: 'it', hours: 24, days: 365,
      target: { type: 'heat', value: 12 },
      defaults: ['ec-module'],
      heatSources: [[0, 0, 0.55, 0.9]], inlets: ['-x'],
      story: '항온항습기 팬월을 EC팬으로 구성해 같은 풍량을 30~50% 적은 전력으로 공급합니다.'
    },
    {
      id: 'plant', name: '플랜트', sub: '제철·화학·발전 플랜트', kind: 'heavy',
      dims: { L: 120, W: 40, H: 20 }, roof: 'gable', tint: 0x8c7f75,
      cond: { tOut: 33, heat: 800, UA: 40, ach0: 2, rh: 60, workers: 50 },
      pollutant: { name: '흄·분진', unit: 'mg/㎥', cOut: 0.05, c0: 6, limit: 5, limitLabel: '노출기준 5 (참고)', dec: 2 },
      mode: 'worker', hours: 16, days: 300,
      target: { type: 'ach', value: 5 },
      defaults: ['tfp-g60-chimney', 'tfd-g75'],
      heatSources: [[-0.2, 0, 0.12, 1.4], [0.25, 0.1, 0.1, 1.1]], inlets: ['-z', '+z'],
      story: '굴뚝팬으로 고열을 배출하고, 이동식 대형 덕트팬으로 열원 주변 작업자를 집중 냉각합니다.'
    },
    {
      id: 'pool', name: '수영장', sub: '실내수영장·고습 시설', kind: 'pool',
      dims: { L: 25, W: 15, H: 6 }, roof: 'gable', tint: 0xbfd3e6,
      cond: { tOut: 28, tIn: 30, heat: 0, UA: 3, ach0: 1, rh: 60 },
      pollutant: { name: '실내 습도', unit: '%RH', kind: 'moisture', xOut: 10, evap: 56000, limit: 65, limitLabel: '결로 방지 65', dec: 0 },
      tempOff: true, mode: 'none', hours: 14, days: 330,
      target: { type: 'ach', value: 6 },
      defaults: ['sus_sirocco'],
      heatSources: [], inlets: ['-z'],
      story: '내부식 SUS 시로코팬이 수면에서 올라오는 습기를 계속 빼내 결로와 곰팡이, 철골 부식을 막습니다.'
    },
    {
      id: 'greenhouse', name: '온실', sub: '시설원예 하우스', kind: 'greenhouse', matrixOut: true,
      dims: { L: 50, W: 20, H: 5 }, roof: 'arch', tint: 0xcfe8e2,
      cond: { tOut: 32, heat: 300, UA: 12, ach0: 10, rh: 75, workers: 4 },
      pollutant: null,
      mode: 'crop', hours: 10, days: 120,
      target: { type: 'ach', value: 30 },
      defaults: ['tfh-h80', 'vane_duct', 'tfu-g110'],
      heatSources: [[0, 0, 0.6, 0.7]], inlets: ['-x'],
      story: '하우스팬으로 한낮 고온을 배출하고 덕트팬으로 정체 구역에 바람을 보냅니다. 겨울에는 그린팬(방제팬)이 냉해를 막습니다.'
    },
    {
      id: 'parking', name: '지하주차장', sub: '아파트·상가 지하주차장', kind: 'parking', matrixOut: true,
      dims: { L: 80, W: 50, H: 3.5 }, roof: 'under', tint: 0x9aa5b1,
      cond: { tOut: 26, heat: 20, UA: 10, ach0: 1, rh: 70 },
      pollutant: { name: '일산화탄소(CO)', unit: 'ppm', cOut: 0.5, c0: 40, limit: 25, limitLabel: '주차장 기준 25', dec: 1 },
      mode: 'none', hours: 14, days: 365,
      target: { type: 'flowPerArea', value: 25 },
      defaults: ['square_duct', 'tfz-e33'],
      heatSources: [], inlets: ['-x'],
      story: '인라인 덕트팬·주차장팬으로 법정 환기량을 확보하고, 유인팬이 덕트 없이 매연 정체 구역을 배기구 쪽으로 밀어냅니다.'
    }
  ];

  /* ---------- 용도별 기본 조건 (위 12개 정의를 용도 프리셋으로 사용) ---------- */
  const USE_META = {
    house:      { label: '주거', polCat: 'co2', problems: ['humid', 'co2', 'dust'], mounts: ['wall', 'ceiling', 'duct'], special: [] },
    commercial: { label: '상업·사무', polCat: 'co2', problems: ['co2', 'odor'], mounts: ['ceiling', 'duct'], special: ['quiet'] },
    hospital:   { label: '병원·위생', polCat: 'co2', problems: ['co2', 'dust', 'odor'], mounts: ['ceiling', 'duct'], special: ['quiet'] },
    restaurant: { label: '주방·식당', polCat: 'odor', problems: ['odor', 'heat'], mounts: ['wall', 'ceiling', 'duct'], special: ['oily'] },
    factory:    { label: '공장·작업장', polCat: 'dust', problems: ['heat', 'dust'], mounts: ['wall', 'roof', 'ceiling', 'floor'], special: [] },
    logistics:  { label: '창고·물류', polCat: 'dust', problems: ['heat', 'stagnant', 'dust'], mounts: ['wall', 'roof', 'ceiling'], special: [] },
    barn:       { label: '축사', polCat: 'gas', problems: ['heat', 'gas'], mounts: ['wall'], special: ['corrosion'] },
    greenhouse: { label: '온실·농업', polCat: null, problems: ['heat', 'humid'], mounts: ['wall', 'ceiling', 'floor'], special: ['corrosion'] },
    parking:    { label: '지하·주차장', polCat: 'gas', problems: ['gas', 'stagnant'], mounts: ['wall', 'ceiling', 'duct'], special: [] },
    datacenter: { label: '서버·전기실', polCat: null, problems: ['heat'], mounts: ['wall', 'duct'], special: [] },
    pool:       { label: '고습(수영장·욕실)', polCat: 'humid', problems: ['humid'], mounts: ['wall', 'ceiling', 'duct'], special: ['corrosion'] },
    plant:      { label: '플랜트·중공업', polCat: 'dust', problems: ['heat', 'dust', 'gas'], mounts: ['wall', 'roof', 'floor'], special: [] }
  };
  // prefer: 용도별 대표 제품(영업 경험상 우선 제안) — 추천 점수 +2
  FZ.SITES.forEach(s => { USE_META[s.id].prefer = s.defaults; });
  FZ.USES = FZ.SITES.map(s => ({ id: s.id, ...USE_META[s.id] }));
  const preset = id => FZ.SITES.find(s => s.id === id);
  const clone = o => JSON.parse(JSON.stringify(o));
  const POL = {
    dust: { name: '미세먼지·분진(PM10)', unit: '㎍/㎥', cOut: 40, c0: 250, limit: 100, limitLabel: '실내 관리기준 100', dec: 0, filterable: true },
    co2: { name: '이산화탄소(CO₂)', unit: 'ppm', cOut: 420, c0: 1700, limit: 1000, limitLabel: '실내 기준 1,000', dec: 0 },
    odor: { name: '냄새 지수', unit: '지수', cOut: 0, c0: 100, limit: 30, limitLabel: '참고 30', dec: 0, filterable: true },
    gas: { name: '유해가스(CO 등)', unit: 'ppm', cOut: 0.5, c0: 40, limit: 25, limitLabel: '기준 25', dec: 1 }
  };
  const ORDER = ['gas', 'odor', 'humid', 'co2', 'dust'];

  const E = FZ.env = {};
  // 용도의 기본 조건
  E.defaultCond = function (use) {
    const p = preset(use), m = USE_META[use];
    const mounts = {}; FZ.MOUNTS.forEach(x => { mounts[x.id] = m.mounts.includes(x.id); });
    const special = {}; FZ.SPECIALS.forEach(x => { special[x.id] = m.special.includes(x.id); });
    return { use, area: Math.round(p.dims.L * p.dims.W), H: p.dims.H, problems: [...m.problems], mounts, special };
  };
  // 조건 → 시뮬레이션용 가상 현장
  E.build = function (cond) {
    const P = preset(cond.use), m = USE_META[cond.use];
    const s = clone(P);
    const area = Math.max(10, cond.area), H = Math.max(2.2, cond.H);
    const ratio = P.dims.L / P.dims.W;
    const W = Math.sqrt(area / ratio), L = area / W;
    const k = area / (P.dims.L * P.dims.W);
    s.dims = { L: +L.toFixed(1), W: +W.toFixed(1), H };
    const c = s.cond;
    c.heat = (c.heat || 0) * k; c.UA = (c.UA || 0) * k;
    if (c.q0 != null) c.q0 *= k;
    if (c.workers != null) c.workers = Math.max(1, Math.round(c.workers * k));
    if (c.animals != null) c.animals = Math.max(10, Math.round(c.animals * k));
    const problems = cond.problems.length ? cond.problems : m.problems;
    // 온도 모델
    const tempNeeded = problems.includes('heat') || ['livestock', 'crop', 'it'].includes(P.mode);
    s.tempOff = !tempNeeded;
    if (tempNeeded && !(c.heat > 0)) { c.heat = area * 0.04; c.UA = c.UA || area * 0.006; }
    if (!c.tIn) c.tIn = tempNeeded ? 28 : 26;
    // 주 오염물
    const V = L * W * H, Q0 = c.q0 != null ? c.q0 : (c.ach0 || 0) * V;
    let cat = null;
    if (m.polCat && problems.includes(m.polCat)) { cat = m.polCat; }
    else {
      cat = problems.find(x => ORDER.includes(x)) || null;
      if (cat === 'humid') {
        const xs = FZ.sim.xsat(c.tIn);
        s.pollutant = { name: '실내 습도', unit: '%RH', kind: 'moisture', xOut: 10, evap: Math.max(1000, (0.88 * xs - 10) * 1.2 * Q0), limit: 65, limitLabel: '결로 방지 65', dec: 0 };
      } else s.pollutant = cat ? { ...POL[cat] } : null;
    }
    // 미세먼지 보조 지표
    s.pm = problems.includes('dust') && cat !== 'dust' ? { name: '미세먼지(PM2.5)', unit: '㎍/㎥', cOut: 35, c0: 45, limit: 35, limitLabel: '실내 권고 35', dec: 0 } : null;
    if (P.mode === 'office' && cat !== 'co2') s.mode = 'none';
    if (P.mode === 'worker' && !tempNeeded) s.mode = 'none';
    s.name = m.label;
    s.sub = `${Math.round(area).toLocaleString()}㎡ · 천장 ${H}m`;
    s.problems = problems; s.cond_ = cond;
    s.story = '';
    s.products = [];
    return s;
  };

  /* ---------- 적합도·배치 도우미 ---------- */
  const RANK = { '◎': 0, '○': 1, '△': 2 };
  const C = FZ.catalog = {};
  C.RATING_LABEL = { '◎': '최적', '○': '적합', '△': '가능' };
  C.rating = function (useId, pid) {
    const m = FZ.MATRIX[pid];
    if (m && m[useId]) return { r: m[useId], src: 'matrix' };
    const x = FZ.EXTRA_MATRIX[useId];
    if (x && x[pid]) return { r: x[pid], src: 'extra' };
    return null;
  };
  C.placeFor = function (site, p) {
    switch (p.mount) {
      case 'wall': return site.kind === 'barn' || site.kind === 'greenhouse' ? 'wallEnd' : 'wallSide';
      case 'duct': return 'ductLine';
      case 'floor': return p.role === 'exhaust' ? 'floorWall' : 'floorSpots';
      case 'hang': return p.role === 'hvls' ? 'ceilingGrid' : 'hangGrid';
      case 'ceiling': return 'ceilingSmall';
      case 'exterior': return 'exterior';
      case 'roof': return 'roofLine';
      case 'rack': return 'rack';
      case 'pole': return 'outdoorPoles';
      default: return 'none';
    }
  };
  C.sizingFor = function (site, id, nEx) {
    const p = FZ.eff(id);
    if (p.role === 'exhaust') return { type: 'share', share: 1 / Math.max(1, nEx) };
    if (p.role === 'hvls') return { type: 'cover' };
    if (p.role === 'circulate') return { type: 'perArea', value: 120 };
    if (p.role === 'spot') {
      if (p.model3d === 'jet') return { type: 'cover' };
      return site.cond.workers ? { type: 'perWorkers', value: 6 } : { type: 'perArea', value: 200 };
    }
    if (id === 'purigen') return { type: 'perArea', value: 30 };
    if (id === 'fandora') return p.mount === 'duct' ? { type: 'fixed', n: 2 } : { type: 'perArea', value: 60 };
    if (id === 'hoodcap') return p.mount === 'ceiling' ? { type: 'perArea', value: 40 } : { type: 'fixed', n: 2 };
    if (id === 'safety_net' || id === 'shutter_unit' || id === 'guard_box') return { type: 'matchWall' };
    if (id === 'controller' || id === 'phase_ctrl') return { type: 'fixed', n: 1 };
    return { type: 'fixed', n: 2 };
  };
  // 선택 제품 → 계산·배치 항목 (dirs: 제품별 흡기/배기)
  C.items = function (site, ids, dirs) {
    const nEx = ids.filter(id => FZ.eff(id).role === 'exhaust').length;
    const lanes = {};
    return ids.map(id => {
      const p = FZ.eff(id);
      const place = C.placeFor(site, p);
      const lane = lanes[place] = (lanes[place] ?? -1) + 1;
      const mode = (dirs && dirs[id]) || (FZ.TAGS[id] && FZ.TAGS[id].def) || null;
      return { id, place, lane, mode, sizing: C.sizingFor(site, id, nEx) };
    });
  };

  /* ---------- 추천 점수 ---------- */
  const R = FZ.recommend = {};
  const MOUNT_REQ = { wall: 'wall', rack: 'wall', exterior: 'wall', duct: 'duct', ceiling: 'ceiling', hang: 'ceiling', roof: 'roof', floor: 'floor', pole: 'floor', none: null };
  const PLABEL = id => (FZ.PROBLEMS.find(x => x.id === id) || {}).label;
  R.mountLabel = { wall: '벽 설치', duct: '덕트 연결', ceiling: '천장 설치', roof: '지붕 설치', floor: '바닥 설치' };
  // 조건의 목표 환기량 (대수 적정성 판단용)
  R.needQ = function (cond) { const s = E.build(cond); return Math.max(0, FZ.sim.targetQ(s) - (s.cond.q0 != null ? 0 : (s.cond.ach0 || 0) * s.dims.L * s.dims.W * s.dims.H)); };
  R.score = function (cond, pid, needQ) {
    const p = FZ.eff(pid), t = FZ.TAGS[pid];
    const req = MOUNT_REQ[p.mount];
    if (req && !cond.mounts[req]) return { ok: false, score: -9, reasons: [], why: `${R.mountLabel[req]} 불가` };
    if (p.minHeight && cond.H < p.minHeight) return { ok: false, score: -9, reasons: [], why: `천장 ${p.minHeight}m 이상 필요` };
    const rt = C.rating(cond.use, pid);
    let s = 0; const reasons = [];
    if (rt) { s += { '◎': 3, '○': 2, '△': 1 }[rt.r]; reasons.push(`${rt.src === 'matrix' ? '메트릭스' : '용도'} ${rt.r}`); }
    const hit = t.solves.filter(x => cond.problems.includes(x));
    s += hit.length * 2; hit.forEach(x => reasons.push(PLABEL(x) + ' ✓'));
    if (cond.area >= t.area[0] && cond.area <= t.area[1]) s += 1;
    else if (cond.area < t.area[0] * 0.5 || cond.area > t.area[1] * 2) s -= 2;
    // 환기 제품 대수 적정성: 너무 많이 필요하면 감점, 적당하면 가점
    if (p.role === 'exhaust' && needQ != null && p.airflow) {
      const best = R.bestSpec(pid, needQ);
      const q = best != null ? FZ.specOf(pid, best).airflow : p.airflow;
      const n = needQ / (q * (p.eff || 1));
      if (n > 25) s -= 3; else if (n >= 0.5 && n <= 14) s += 1;
    }
    if ((USE_META[cond.use].prefer || []).includes(pid)) { s += 2; reasons.unshift('대표 제품'); }
    if (cond.special.corrosion && t.corrosion) { s += 2; reasons.push('내부식'); }
    if (cond.special.oily && t.oily) { s += 2; reasons.push('기름기 대응'); }
    if (cond.special.quiet && t.quiet) { s += 1; reasons.push('저소음'); }
    if (cond.special.quiet && t.loud) s -= 2;
    if (req) reasons.push(R.mountLabel[req]);
    return { ok: true, score: s, reasons, rating: rt };
  };
  // 필요 풍량(㎥/h)에 맞는 사양: 대수가 2~12대인 모델 중 총 소비전력이 가장 작은 것
  R.bestSpec = function (pid, needQ) {
    const S = FZ.SPECS[pid];
    if (!S || S.rows.length < 2 || !(needQ > 0)) return S ? S.def : null;
    const eff = FZ.PRODUCTS[pid].eff || 1;
    let best = null, bestCost = Infinity;
    S.rows.forEach((r, i) => {
      const s = FZ.specOf(pid, i);
      if (!s.airflow) return;
      const n = Math.max(1, Math.ceil(needQ / (s.airflow * eff)));
      const fit = n >= 2 && n <= 12 ? 0 : (n < 2 ? (2 - n) * 0.15 : (n - 12) * 0.1);
      const cost = n * s.power * (1 + fit) + (s.phase.startsWith('3') ? 0 : 0.001);
      if (cost < bestCost) { bestCost = cost; best = i; }
    });
    return best;
  };
  // 조건에 맞는 제품 전체 (점수순)
  R.candidates = function (cond) {
    const nq = R.needQ(cond);
    return Object.keys(FZ.PRODUCTS)
      .map(id => ({ id, ...R.score(cond, id, nq) }))
      .filter(x => x.ok && x.score > 0 && (x.rating || x.score >= 3))
      .sort((a, b) => b.score - a.score || (a.rating ? RANK[a.rating.r] : 3) - (b.rating ? RANK[b.rating.r] : 3));
  };
  // 역할별로 고른 추천 세트 (2~4종)
  R.set = function (cond) {
    const cs = R.candidates(cond), role = id => FZ.PRODUCTS[id].role;
    const pick = [];
    const movers = cs.filter(x => role(x.id) === 'exhaust');
    if (movers[0]) pick.push(movers[0]);
    const m2 = movers.find(x => x !== movers[0] && FZ.eff(x.id).mount !== FZ.eff(movers[0].id).mount && x.score >= movers[0].score - 2);
    if (m2 && cond.area >= 600) pick.push(m2);
    if (cond.problems.includes('heat') || cond.problems.includes('stagnant')) {
      const circ = cs.filter(x => ['hvls', 'circulate', 'spot'].includes(role(x.id)) && x.score >= 4);
      const hv = circ.find(x => role(x.id) === 'hvls');
      const cir = (cond.area >= 600 && hv && circ[0] && hv.score >= circ[0].score - 1) ? hv : circ[0];
      if (cir) pick.push(cir);
    }
    if (cond.problems.includes('dust') || cond.problems.includes('odor')) {
      const f = cs.find(x => role(x.id) === 'filter' && x.score >= 3);
      if (f) pick.push(f);
    }
    if (pick.length < 4) {
      const has = m => pick.some(x => FZ.eff(x.id).mount === m && role(x.id) === 'exhaust');
      const acc = cs.find(x => role(x.id) === 'accessory' && x.score >= 4 && !pick.includes(x) &&
        (['safety_net', 'shutter_unit', 'controller', 'phase_ctrl'].includes(x.id) ? has('wall') : x.id === 'guard_box' ? pick.some(y => y.id === 'belt_parking') : x.id === 'hoodcap' ? (has('duct') || has('ceiling')) : true));
      if (acc) pick.push(acc);
    }
    if (!pick.length) cs.slice(0, 2).forEach(x => pick.push(x));
    return pick.slice(0, 4);
  };
  // 제품 → 용도별 적합 순위 (영업 학습용)
  R.forProduct = function (pid) {
    return FZ.USES.map(u => {
      const cond = E.defaultCond(u.id);
      FZ.MOUNTS.forEach(m => { cond.mounts[m.id] = true; });
      return { use: u, cond, ...R.score(cond, pid, R.needQ(cond)) };
    }).sort((a, b) => b.score - a.score);
  };
})();
