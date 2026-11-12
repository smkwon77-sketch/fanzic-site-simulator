/* 팬직 제품 데이터 — 출처: 2026 Fanzic Brochure (60Hz 최대 성능 기준), EC FAN 유인물.
   rep:true 는 카탈로그 수치가 확인되지 않아 대표값을 넣은 항목 (영업 전 확인 필요).
   model3d: 3D 모델 종류 / role: exhaust(배기·급기 환기량 산입), hvls, circulate, spot, terminal, none */
window.FZ = window.FZ || {};

FZ.PRODUCTS = {
  'tfh-fk130': {
    name: '벨트 프로펠러팬 (축사용)', model: 'TFH-FK130 FT', family: '프로펠러팬',
    model3d: 'belt', role: 'exhaust', size: 1.375, impeller: 1270,
    airflow: 42500, power: 1416, pressure: 15, phase: '3Ø 380V',
    eff: 0.9, acc: ['자동 셔터'],
    note: 'SUS 임펠러, 벨트 구동. 계사 터널 환기용 대풍량.'
  },
  'tfh-f140': {
    name: '벨트 프로펠러팬 (공장·주차장)', model: 'TFH-F140 FTA', family: '프로펠러팬',
    model3d: 'belt', role: 'exhaust', size: 1.38, impeller: 1285,
    airflow: 42500, power: 1700, pressure: 15, phase: '3Ø 380V',
    eff: 0.8, acc: ['슬리브', '가드 박스'],
    note: '스테인리스 임펠러, 자동 셔터 연동. 공장·창고·지하주차장 대풍량 환기.'
  },
  'tfp-h100': {
    name: '대형 프로펠러팬', model: 'TFP-H100 FT', family: '프로펠러팬',
    model3d: 'propeller', role: 'exhaust', size: 1.1, impeller: 1000,
    airflow: 22500, power: 650, pressure: 12, phase: '1Ø 220V',
    eff: 0.8, acc: ['셔터', '안전망'],
    note: '공장·창고·온실 등 대풍량이 필요한 곳의 벽부 환기.'
  },
  'tfh-h80': {
    name: '온실 전용팬', model: 'TFH-H80 FT-DS', family: '프로펠러팬',
    model3d: 'propeller', role: 'exhaust', size: 0.9, impeller: 800,
    airflow: 14500, power: 565, pressure: 8, phase: '3Ø 380V',
    eff: 0.85, acc: ['셔터', '안전망'],
    note: 'IP55 모터, 직결 구동. 여름철 고온 배출, 겨울철 냉해 예방.'
  },
  'tfp-g60-chimney': {
    name: '루프팬 (굴뚝형)', model: 'TFP-G60 FT', family: '프로펠러팬',
    model3d: 'roof', role: 'exhaust', size: 0.72, impeller: 580,
    airflow: 14850, power: 600, pressure: 25, phase: '3Ø 220/380V',
    eff: 0.8, acc: ['방수 커브'],
    note: 'SUS 임펠러. 지붕 설치로 상부 열기를 빠르게 배출.'
  },
  'tfu-g110': {
    name: '서리방지팬', model: 'TFU-G110 HT', family: '프로펠러팬',
    model3d: 'defroster', role: 'none', size: 1.1, impeller: 1100,
    airflow: 26500, power: 3700, pressure: 0, phase: '3Ø 220/380V',
    eff: 1, acc: ['자동 컨트롤러'],
    note: '틸팅 헤드, 방수. 농장·골프장 서리 피해 예방(겨울철 운전, 여름 효과 계산에서 제외).'
  },
  'tff-f30': {
    name: '서큘레이션팬', model: 'TFF-F30BS', family: '서큘레이터',
    model3d: 'circ', role: 'circulate', size: 0.36, impeller: 300,
    airflow: 1643, power: 69, pressure: 3, phase: '1Ø 220V',
    eff: 1, cover: 90, speed: 0.8, acc: [],
    note: 'IP55, ABS 하우징, 71° 회전. 실내 공기 순환으로 온습도 균일화.'
  },
  'hvls-73': {
    name: '대형 실링팬 (HVLS)', model: 'Ø7.3m 대형 실링팬', family: '실링팬',
    model3d: 'hvls', role: 'hvls', size: 7.3, impeller: 7300,
    airflow: 0, power: 1500, pressure: 0, phase: '3Ø 380V', rep: true,
    eff: 1, cover: 1500, speed: 1.3, acc: ['안전 와이어'],
    note: '저속 대풍량으로 넓은 면적에 체감 냉방 효과. 수치는 대표값(카탈로그 확인 필요).'
  },
  'tfm-g1000': {
    name: '덕트 인라인팬', model: 'TFM-G1000 RT', family: '축류팬',
    model3d: 'inline', role: 'exhaust', size: 0.9, impeller: 838,
    airflow: 28800, power: 7500, pressure: 45, phase: '3Ø 380V',
    eff: 0.8, acc: ['플렉시블 캔버스'],
    note: '고효율 모터, 저소음. 기계실·전기실 급배기, 주차장 공조, 제연 설비.'
  },
  'tfz-e33': {
    name: '유인 제트팬', model: 'TFZ-E33 ES', family: '기타',
    model3d: 'jet', role: 'spot', size: 0.44, impeller: 330,
    airflow: 3000, power: 250, pressure: 0, phase: '1Ø 220V', rep: true,
    eff: 1, cover: 400, speed: 0.6, acc: [],
    note: '덕트 없이 급기구에서 배기구로 기류를 유도. 공기 정체구역 해소(풍량·전력은 대표값).'
  },
  'tfx-f39': {
    name: '터보 원심팬 (주방 유증기)', model: 'TFX-F39 HT', family: '원심팬',
    model3d: 'centrifugal', role: 'exhaust', size: 0.75, impeller: 390,
    airflow: 9700, power: 2075, pressure: 51, phase: '3Ø 220/380V',
    eff: 0.7, acc: ['FANDORA 필터 (3중 여과)'],
    note: '알루미늄 터보 날개로 고정압. 유증기가 많은 식당 주방 배기.'
  },
  'ec-module': {
    name: 'EC 팬 모듈', model: 'Fanzic EC FAN Ø500', family: 'EC팬',
    model3d: 'ec', role: 'exhaust', size: 0.62, impeller: 500,
    airflow: 10000, power: 750, pressure: 30, phase: '3Ø 380V', rep: true,
    eff: 0.9, ec: true, acc: ['0-10V / RS485 제어'],
    note: 'AC팬 대비 30~50% 에너지 절감, 인버터 없이 정밀 제어, IP55. 팬월 유닛으로 구성(풍량·전력은 대표값).'
  },
  'tfj-f30': {
    name: '믹스플로우 덕트팬', model: 'TFJ-F30 BS', family: '축류팬',
    model3d: 'inline', role: 'exhaust', size: 0.36, impeller: 300,
    airflow: 1870, power: 150, pressure: 20, phase: '1Ø 220V',
    eff: 0.7, acc: ['H13 HEPA 급기 필터'],
    note: '저소음 터보 축류 날개. 건물·호텔·병원 덕트 급배기.'
  },
  'tfv-e20': {
    name: '디퓨저팬', model: 'TFV-E20 AS', family: '플라스틱팬',
    model3d: 'diffuser', role: 'terminal', size: 0.2, impeller: 180,
    airflow: 370, power: 22, pressure: 4, phase: '1Ø 220V',
    eff: 0.7, acc: [],
    note: '저소음·저전력 천장형. 사무실·화장실·흡연실 등 실내 환기 말단.'
  },
  'tfd-g75': {
    name: '대형 베인 축류팬 (스탠드형)', model: 'TFD-G75 SP', family: '축류팬',
    model3d: 'axialStand', role: 'spot', size: 0.95, impeller: 750,
    airflow: 25000, power: 1650, pressure: 30, phase: '3Ø 440V',
    eff: 1, cover: 220, speed: 2.2, acc: ['캐스터'],
    note: '대풍량·저소음. 제철·조선 등 중공업 작업자 스폿 냉각, 열코일 냉각.'
  },
  'tfb-g29-sus': {
    name: 'SUS 원심팬 (고습형)', model: 'TFB-G29 ET (SUS)', family: '원심팬',
    model3d: 'centrifugal', role: 'exhaust', size: 0.4, impeller: 250,
    airflow: 2800, power: 510, pressure: 22, phase: '3Ø 220/380V',
    eff: 0.75, acc: [],
    note: '내부식 스테인리스. 수영장·정화조·화학설비 등 고습 환경 배기.'
  }
};

/* 공통 가정값 (화면에서 수정 가능) */
FZ.DEFAULTS = {
  elecPrice: 170,      // 원/kWh (산업용 평균 수준, 수정 가능)
  co2Factor: 0.4781,   // kgCO2/kWh (전력 배출계수, 수정 가능)
  ecSave: 40,          // EC팬 AC 대비 절감률 % (팬직 자료 30~50%)
  heatLoss: 1.0,       // 체감 25℃ 초과 1℃당 작업 생산성 저하 % (보수적 기본값, 최대 15%)
  wage: 4500,          // 작업자 1인 연간 인건비 (만원)
  hotDays: 90,         // 고온기 일수
  installCost: 0       // 총 설치비 (만원), 0이면 회수기간 계산 생략
};
