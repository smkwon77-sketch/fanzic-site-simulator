/* 설치 현장 정의 (메트릭스 10곳 + 온실·지하주차장). 치수 m, 온도 ℃, 발열 kW, UA(외피 열손실) kW/K.
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
      defaults: ['square_duct', 'fandora', 'diffuser'],
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
      defaults: ['sus_sirocco', 'purigen', 'diffuser'],
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
      defaults: ['double_sirocco', 'fandora_box', 'hoodcap'],
      heatSources: [[0, -0.3, 0.35, 1]], inlets: ['+z'],
      story: '양흡 시로코팬으로 기름 섞인 열기를 덕트 끝까지 뽑고, 팬도라 필터박스·후드캡으로 배출구를 깔끔하게 마감합니다.'
    },
    {
      id: 'factory', name: '공장', sub: '제조 공장·생산동', kind: 'factory',
      dims: { L: 60, W: 30, H: 10 }, roof: 'gable', tint: 0x8fa3b8,
      cond: { tOut: 30, heat: 120, UA: 11, ach0: 1, rh: 60, workers: 40 },
      pollutant: { name: '미세먼지(PM10)', unit: '㎍/㎥', cOut: 40, c0: 300, limit: 100, limitLabel: '실내 관리기준 100', dec: 0, filterable: true },
      mode: 'worker', hours: 10, days: 300,
      target: { type: 'ach', value: 8 },
      defaults: ['prop_large', 'tfp-g60-chimney', 'hvls_bldc'],
      heatSources: [[-0.25, -0.15, 0.18, 1], [0.1, 0.2, 0.15, 0.8], [0.3, -0.2, 0.12, 0.7]], inlets: ['-x'],
      story: '측벽 대형 고압팬과 지붕 루프팬으로 열기를 빼고, 대형 실링팬으로 작업자 체감온도를 낮춥니다.'
    },
    {
      id: 'logistics', name: '물류센터', sub: '물류창고·대형 매장', kind: 'logistics',
      dims: { L: 100, W: 50, H: 12 }, roof: 'flat', tint: 0xa7b4c2,
      cond: { tOut: 33, heat: 150, UA: 30, ach0: 0.5, rh: 60, workers: 60 },
      pollutant: { name: '미세먼지(PM10)', unit: '㎍/㎥', cOut: 40, c0: 250, limit: 100, limitLabel: '실내 관리기준 100', dec: 0, filterable: true },
      mode: 'worker', hours: 12, days: 330,
      target: { type: 'ach', value: 2 },
      defaults: ['hvls_bldc', 'tfp-g60-chimney'],
      heatSources: [[0, 0, 0.5, 0.6]], inlets: ['-x', '+z'],
      story: '대형 실링팬 몇 대로 선풍기 수십 대를 대체하고, 지붕 루프팬으로 축열된 상부 열기를 배출합니다.'
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
      story: '지붕 루프팬으로 고열을 배출하고, 스탠드형 대형 베인 축류팬으로 열원 주변 작업자를 집중 냉각합니다.'
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
      defaults: ['tfh-h80', 'tff-f30', 'tfu-g110'],
      heatSources: [[0, 0, 0.6, 0.7]], inlets: ['-x'],
      story: '온실 전용팬으로 한낮 고온을 배출하고 서큘레이션팬으로 정체 구역을 없앱니다. 겨울에는 서리방지팬이 냉해를 막습니다.'
    },
    {
      id: 'parking', name: '지하주차장', sub: '아파트·상가 지하주차장', kind: 'parking', matrixOut: true,
      dims: { L: 80, W: 50, H: 3.5 }, roof: 'under', tint: 0x9aa5b1,
      cond: { tOut: 26, heat: 20, UA: 10, ach0: 1, rh: 70 },
      pollutant: { name: '일산화탄소(CO)', unit: 'ppm', cOut: 0.5, c0: 40, limit: 25, limitLabel: '주차장 기준 25', dec: 1 },
      mode: 'none', hours: 14, days: 365,
      target: { type: 'flowPerArea', value: 25 },
      defaults: ['tfm-g1000', 'tfz-e33'],
      heatSources: [], inlets: ['-x'],
      story: '대형 덕트 인라인팬으로 법정 환기량을 확보하고, 유인 제트팬이 덕트 없이 매연 정체 구역을 배기구 쪽으로 밀어냅니다.'
    }
  ];

  /* ---------- 제품 선택 도우미 ---------- */
  const RANK = { '◎': 0, '○': 1, '△': 2 };
  const C = FZ.catalog = {};
  C.RATING_LABEL = { '◎': '최적', '○': '적합', '△': '가능' };

  C.rating = function (siteId, pid) {
    const m = FZ.MATRIX[pid];
    if (m && m[siteId]) return { r: m[siteId], src: 'matrix' };
    const x = FZ.EXTRA_MATRIX[siteId];
    if (x && x[pid]) return { r: x[pid], src: 'extra' };
    return null;
  };
  // 이 현장에 적합도가 있는 제품 (◎ → ○ → △)
  C.candidates = function (site) {
    return Object.keys(FZ.PRODUCTS)
      .map(id => ({ id, ...C.rating(site.id, id) }))
      .filter(x => x.r)
      .sort((a, b) => RANK[a.r] - RANK[b.r]);
  };
  // 3D 배치 방식
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
  // 권장 대수 산정 기준
  C.sizingFor = function (site, id, nEx) {
    const p = FZ.PRODUCTS[id];
    if (p.role === 'exhaust') return { type: 'share', share: 1 / Math.max(1, nEx) };
    if (p.role === 'hvls') return { type: 'cover' };
    if (p.role === 'circulate') return { type: 'perArea', value: 120 };
    if (p.role === 'spot') {
      if (p.model3d === 'jet') return { type: 'cover' };
      return site.cond.workers ? { type: 'perWorkers', value: 6 } : { type: 'perArea', value: 200 };
    }
    if (id === 'purigen') return { type: 'perArea', value: 30 };
    if (id === 'fandora') return { type: 'perArea', value: 60 };
    if (id === 'fandora_box') return { type: 'fixed', n: 2 };
    if (id === 'diffuser') return { type: 'perArea', value: 40 };
    if (id === 'hoodcap') return { type: 'fixed', n: 2 };
    if (id === 'safety_net') return { type: 'matchWall' };
    return { type: 'fixed', n: 2 };
  };
  // 선택된 제품 id 목록 → 계산·배치용 항목
  C.items = function (site, ids) {
    const nEx = ids.filter(id => FZ.PRODUCTS[id].role === 'exhaust').length;
    const lanes = {};
    return ids.map(id => {
      const p = FZ.PRODUCTS[id];
      const place = C.placeFor(site, p);
      const lane = lanes[place] = (lanes[place] ?? -1) + 1;
      return { id, place, lane, sizing: C.sizingFor(site, id, nEx) };
    });
  };

  FZ.SITES.forEach(s => { s.products = C.items(s, s.defaults); });
})();
