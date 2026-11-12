/* 설치 현장 정의. 치수는 m, 온도 ℃, 발열 kW, UA(외피 열손실) kW/K.
   pollutant.c0 = 기존(자연환기) 상태의 평균 농도 → 발생량은 c0 기준으로 역산.
   products[].place: 3D 배치 방식 / sizing: 권장 대수 계산 기준 */
window.FZ = window.FZ || {};

FZ.SITES = [
  {
    id: 'factory', name: '공장', sub: '제조 공장·생산동', kind: 'factory',
    dims: { L: 60, W: 30, H: 10 }, roof: 'gable', tint: 0x8fa3b8,
    cond: { tOut: 30, heat: 120, UA: 11, ach0: 1, rh: 60, workers: 40 },
    pollutant: { name: '미세먼지(PM10)', unit: '㎍/㎥', cOut: 40, c0: 300, limit: 100, limitLabel: '실내 관리기준 100', dec: 0 },
    mode: 'worker', hours: 10, days: 300,
    products: [
      { id: 'tfh-f140', place: 'wallSide', sizing: { type: 'ach', target: 8 } },
      { id: 'tfp-g60-chimney', place: 'roofLine', sizing: { type: 'fixed', n: 4 } },
      { id: 'hvls-73', place: 'ceilingGrid', sizing: { type: 'cover' } }
    ],
    heatSources: [[-0.25, -0.15, 0.18, 1], [0.1, 0.2, 0.15, 0.8], [0.3, -0.2, 0.12, 0.7]],
    inlets: ['-x'],
    story: '측벽 대풍량 배기 + 지붕 루프팬으로 열기를 빼고, 대형 실링팬으로 작업자 체감온도를 낮춥니다.'
  },
  {
    id: 'logistics', name: '물류센터', sub: '물류창고·대형 매장', kind: 'logistics',
    dims: { L: 100, W: 50, H: 12 }, roof: 'flat', tint: 0xa7b4c2,
    cond: { tOut: 33, heat: 150, UA: 30, ach0: 0.5, rh: 60, workers: 60 },
    pollutant: { name: '미세먼지(PM10)', unit: '㎍/㎥', cOut: 40, c0: 250, limit: 100, limitLabel: '실내 관리기준 100', dec: 0 },
    mode: 'worker', hours: 12, days: 330,
    products: [
      { id: 'hvls-73', place: 'ceilingGrid', sizing: { type: 'cover' } },
      { id: 'tfp-g60-chimney', place: 'roofLine', sizing: { type: 'ach', target: 2 } }
    ],
    heatSources: [[0, 0, 0.5, 0.6]],
    inlets: ['-x', '+z'],
    story: '대형 실링팬 몇 대로 선풍기 수십 대를 대체하고, 지붕 루프팬으로 축열된 상부 열기를 배출합니다.'
  },
  {
    id: 'barn', name: '양계장', sub: '육계·산란계 축사', kind: 'barn',
    dims: { L: 90, W: 14, H: 3.5 }, roof: 'gable', tint: 0xc9b99a,
    cond: { tOut: 32, heat: 160, UA: 4, ach0: 15, rh: 70, animals: 20000 },
    pollutant: { name: '암모니아(NH₃)', unit: 'ppm', cOut: 0, c0: 25, limit: 20, limitLabel: '권장 20 이하', dec: 1 },
    mode: 'livestock', hours: 16, days: 150,
    livestock: { label: '육계', value: 3000, flocks: 1.5 },
    products: [
      { id: 'tfh-fk130', place: 'wallEnd', sizing: { type: 'velocity', target: 2.5 } }
    ],
    heatSources: [[0, 0, 0.6, 0.5]],
    inlets: ['-x'],
    story: '박공벽에 벨트 프로펠러팬을 집중 배치하는 터널 환기로 계사 전체에 2.5m/s 바람을 만들어 열 스트레스를 줄입니다.'
  },
  {
    id: 'greenhouse', name: '온실', sub: '시설원예 하우스', kind: 'greenhouse',
    dims: { L: 50, W: 20, H: 5 }, roof: 'arch', tint: 0xcfe8e2,
    cond: { tOut: 32, heat: 300, UA: 12, ach0: 10, rh: 75, workers: 4 },
    pollutant: null,
    mode: 'crop', hours: 10, days: 120,
    products: [
      { id: 'tfh-h80', place: 'wallEnd', sizing: { type: 'ach', target: 30 } },
      { id: 'tff-f30', place: 'hangGrid', sizing: { type: 'perArea', value: 120 } },
      { id: 'tfu-g110', place: 'outdoorPoles', sizing: { type: 'fixed', n: 2 } }
    ],
    heatSources: [[0, 0, 0.6, 0.7]],
    inlets: ['-x'],
    story: '온실 전용팬으로 한낮 고온을 배출하고 서큘레이션팬으로 정체 구역을 없앱니다. 겨울에는 서리방지팬이 냉해를 막습니다.'
  },
  {
    id: 'parking', name: '지하주차장', sub: '아파트·상가 지하주차장', kind: 'parking',
    dims: { L: 80, W: 50, H: 3.5 }, roof: 'under', tint: 0x9aa5b1,
    cond: { tOut: 26, heat: 20, UA: 10, ach0: 1, rh: 70 },
    pollutant: { name: '일산화탄소(CO)', unit: 'ppm', cOut: 0.5, c0: 40, limit: 25, limitLabel: '주차장 기준 25', dec: 1 },
    mode: 'none', hours: 14, days: 365,
    products: [
      { id: 'tfm-g1000', place: 'ductLine', sizing: { type: 'flowPerArea', value: 25 } },
      { id: 'tfz-e33', place: 'hangGrid', sizing: { type: 'cover' } }
    ],
    heatSources: [],
    inlets: ['-x'],
    story: '덕트 인라인팬으로 법정 환기량을 확보하고, 유인 제트팬이 덕트 없이 매연 정체 구역을 배기구 쪽으로 밀어냅니다.'
  },
  {
    id: 'kitchen', name: '식당 주방', sub: '업소용 주방·단체급식', kind: 'kitchen',
    dims: { L: 15, W: 10, H: 3.2 }, roof: 'flat', tint: 0xd6c7b8,
    cond: { tOut: 31, heat: 20, UA: 1, ach0: 10, rh: 65, workers: 8 },
    pollutant: { name: '유증기', unit: 'mg/㎥', cOut: 0, c0: 3, limit: 1, limitLabel: '참고 관리값 1.0', dec: 2 },
    mode: 'worker', hours: 12, days: 330,
    products: [
      { id: 'tfx-f39', place: 'ductLine', sizing: { type: 'ach', target: 40 } }
    ],
    heatSources: [[0, -0.3, 0.35, 1]],
    inlets: ['+z'],
    story: '고정압 터보 원심팬과 FANDORA 3중 필터로 기름 섞인 열기를 덕트 끝까지 확실히 뽑아냅니다.'
  },
  {
    id: 'datacenter', name: '데이터센터', sub: '서버실·통신실', kind: 'datacenter',
    dims: { L: 30, W: 20, H: 4 }, roof: 'flat', tint: 0x7d8ea3,
    cond: { tOut: 18, heat: 200, UA: 0, ach0: 0, q0: 40000, rh: 45 },
    pollutant: null,
    mode: 'it', hours: 24, days: 365,
    products: [
      { id: 'ec-module', place: 'rack', sizing: { type: 'heat', dT: 12 } }
    ],
    baseline: 'ac',
    heatSources: [[0, 0, 0.55, 0.9]],
    inlets: ['-x'],
    story: '항온항습기 팬월을 EC팬으로 구성해 같은 풍량을 30~50% 적은 전력으로 공급합니다.'
  },
  {
    id: 'office', name: '사무실·학교', sub: '사무실·학교·병원', kind: 'office',
    dims: { L: 30, W: 20, H: 3 }, roof: 'flat', tint: 0xb9c6d3,
    cond: { tOut: 26, heat: 0, UA: 3, ach0: 0.5, rh: 50, workers: 60 },
    pollutant: { name: '이산화탄소(CO₂)', unit: 'ppm', cOut: 420, c0: 1750, limit: 1000, limitLabel: '실내 기준 1,000', dec: 0 },
    tempOff: true,
    mode: 'office', hours: 9, days: 250,
    products: [
      { id: 'tfj-f30', place: 'ductLine', sizing: { type: 'perPerson', value: 30 } },
      { id: 'tfv-e20', place: 'ceilingSmall', sizing: { type: 'perArea', value: 60 } }
    ],
    heatSources: [],
    inlets: ['+z'],
    story: '믹스플로우 덕트팬과 HEPA 급기 필터, 천장 디퓨저팬으로 CO₂를 기준치 아래로 유지합니다.'
  },
  {
    id: 'heavy', name: '중공업', sub: '제철소·조선소·주물공장', kind: 'heavy',
    dims: { L: 120, W: 40, H: 20 }, roof: 'gable', tint: 0x8c7f75,
    cond: { tOut: 33, heat: 800, UA: 40, ach0: 2, rh: 60, workers: 50 },
    pollutant: { name: '흄·분진', unit: 'mg/㎥', cOut: 0.05, c0: 6, limit: 5, limitLabel: '노출기준 5 (참고)', dec: 2 },
    mode: 'worker', hours: 16, days: 300,
    products: [
      { id: 'tfp-g60-chimney', place: 'roofLine', sizing: { type: 'ach', target: 5 } },
      { id: 'tfd-g75', place: 'floorSpots', sizing: { type: 'perWorkers', value: 6 } }
    ],
    heatSources: [[-0.2, 0, 0.12, 1.4], [0.25, 0.1, 0.1, 1.1]],
    inlets: ['-z', '+z'],
    story: '지붕 루프팬으로 고열을 배출하고, 스탠드형 대형 베인 축류팬으로 열원 주변 작업자를 집중 냉각합니다.'
  },
  {
    id: 'pool', name: '수영장', sub: '실내수영장·고습 시설', kind: 'pool',
    dims: { L: 25, W: 15, H: 6 }, roof: 'gable', tint: 0xbfd3e6,
    cond: { tOut: 28, tIn: 30, heat: 0, UA: 3, ach0: 1, rh: 60 },
    pollutant: { name: '실내 습도', unit: '%RH', kind: 'moisture', xOut: 10, evap: 56000, limit: 65, limitLabel: '결로 방지 65', dec: 0 },
    tempOff: true,
    mode: 'none', hours: 14, days: 330,
    products: [
      { id: 'tfb-g29-sus', place: 'ductLine', sizing: { type: 'ach', target: 6 } }
    ],
    heatSources: [],
    inlets: ['-z'],
    story: '내부식 SUS 원심팬이 수면에서 올라오는 습기를 계속 빼내 결로와 곰팡이, 철골 부식을 막습니다.'
  }
];
