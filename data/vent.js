/* 제품사양 선택(설계) 탭 — 구역 종류별 필요 환기량 기준과 덕트 저항 계수.
   필요 환기량 = max(인원 × perPerson, 환기횟수 ach × 체적, 바닥면적 × perArea)
   - perPerson: ㎥/h·인 / ach: 회/h / perArea: ㎥/h·㎡ / density: 기본 재실 밀도(인/㎡)
   - src: 기본값의 근거. 법정 값은 「건축물의 설비기준 등에 관한 규칙」 별표 1의6(다중이용시설 필요 환기량),
     공동주택 0.5회/h, 「주차장법 시행규칙」(지하 주차장 바닥 1㎡당 25㎥/h)을 참고했으며 최신 고시로 확인이 필요함.
     '설계값'은 일반 설계 관행 범위의 대표값. 모든 값은 화면에서 구역별로 고칠 수 있음. */
window.FZ = window.FZ || {};

FZ.VENT = {
  zoneTypes: [
    { id: 'kitchen',    name: '주방',        color: '#f59e0b', ach: 40, src: '업소용 주방 설계값 30~60회/h', hoods: true },
    { id: 'dining',     name: '홀·객석',      color: '#3b82f6', perPerson: 29, tables: true, src: '설비기준 규칙 별표1의6 (29㎥/h·인) 참고' },
    { id: 'office',     name: '사무실',       color: '#6366f1', perPerson: 29, density: 0.1, src: '업무시설 29㎥/h·인 참고' },
    { id: 'retail',     name: '매장',        color: '#0ea5e9', perPerson: 29, density: 0.2, src: '판매시설 29㎥/h·인 참고' },
    { id: 'room',       name: '병실·객실',     color: '#14b8a6', perPerson: 36, density: 0.1, src: '의료·숙박시설 36㎥/h·인 참고' },
    { id: 'lobby',      name: '대기실·로비',    color: '#8b5cf6', perPerson: 29, density: 0.3, src: '집회·판매 29㎥/h·인 참고' },
    { id: 'living',     name: '거실·주거',     color: '#a3a3a3', ach: 0.5, perPerson: 0, density: 0.05, src: '공동주택 0.5회/h' },
    { id: 'toilet',     name: '화장실·욕실',    color: '#06b6d4', ach: 10, src: '설계값 10~15회/h' },
    { id: 'storage',    name: '창고',        color: '#94a3b8', ach: 3, src: '설계값 2~5회/h' },
    { id: 'work',       name: '작업장',       color: '#ef4444', ach: 6, perPerson: 25, density: 0.05, src: '설계값 5~10회/h, 그 밖의 시설 25㎥/h·인' },
    { id: 'elec',       name: '전기·기계실',    color: '#64748b', ach: 10, src: '설계값 10회/h (발열 별도)' },
    { id: 'parking',    name: '주차장',       color: '#475569', perArea: 25, src: '주차장법 시행규칙 1㎡당 25㎥/h 참고' },
    { id: 'pool',       name: '수영장·고습',    color: '#22d3ee', ach: 6, src: '설계값 4~8회/h' },
    { id: 'livestock',  name: '축사',        color: '#a16207', ach: 20, src: '설계값 (여름 최대 환기)' },
    { id: 'greenhouse', name: '온실',        color: '#16a34a', ach: 30, src: '설계값 (여름 고온 배출)' },
    { id: 'etc',        name: '기타',        color: '#cbd5e1', ach: 2, src: '설계값' }
  ],
  // 용도(FZ.USES id) → 처음 채워 넣는 구역 예시 [종류, 가로 비율, 세로 비율]
  templates: {
    restaurant: [['kitchen', 0.3, 1], ['dining', 0.7, 1]],
    house: [['living', 0.6, 1], ['kitchen', 0.25, 0.6], ['toilet', 0.25, 0.4]],
    commercial: [['retail', 0.7, 1], ['office', 0.3, 0.7], ['toilet', 0.3, 0.3]],
    hospital: [['room', 0.6, 1], ['lobby', 0.4, 0.7], ['toilet', 0.4, 0.3]],
    factory: [['work', 0.85, 1], ['storage', 0.15, 1]],
    logistics: [['storage', 1, 1]],
    barn: [['livestock', 1, 1]],
    datacenter: [['elec', 1, 1]],
    plant: [['work', 1, 1]],
    pool: [['pool', 0.8, 1], ['toilet', 0.2, 1]],
    greenhouse: [['greenhouse', 1, 1]],
    parking: [['parking', 1, 1]]
  },
  seatsPerTable: 4,
  // 덕트 (아연도 원형) — 마찰은 Darcy–Weisbach + Altshul–Tsal 마찰계수
  duct: {
    rho: 1.2, nu: 1.5e-5, eps: 0.00015,
    kElbow90: 0.3,   // 매끈한 엘보(R/D≈1.5) 90°, 각도에 비례
    kEntry: 0.5, kBranch: 0.5,
    terminals: [
      { id: 'hoodcap', name: '후드캡', k: 1.0 },
      { id: 'louver', name: '루버·그릴', k: 1.5 },
      { id: 'open', name: '개방(덕트 끝)', k: 1.0 },
      { id: 'filter', name: '필터(팬도라 등)', k: 2.5 }
    ],
    sizes: [100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200],
    vTarget: 9 // 권장 덕트 풍속 상한 m/s
  }
};
