/* 팬직 제품 데이터.
   - 메트릭스 28종: 「제품별 용도 메트릭스.xlsx」 제품, 사양은 2026 브로셔·2025 국문 카탈로그 대표 모델(50Hz) 기준
   - extra:true: 메트릭스에 없는 제품(브로셔 용도 기준으로 추천), hz 표기대로 60Hz 사양인 것이 있음
   - rep:true: 카탈로그에 수치가 없어 시뮬레이션용으로 가정한 값이 포함됨
   role: exhaust(환기량 산입) · hvls · circulate · spot · filter · accessory · none
   mount: wall · duct · floor · hang · ceiling · exterior · roof · rack · pole · none
   eff: 실제 설치 정압을 감안한 풍량 보정 계수 */
window.FZ = window.FZ || {};

FZ.PRODUCTS = {
  /* ---------- 필터 환기 ---------- */
  fandora: { name: '팬도라', model: 'FG-300A (그릴형)', group: '필터·부속', model3d: 'filterbox', role: 'filter', mount: 'ceiling', size: 0.45,
    airflow: 1000, power: 0, pressure: '압력손실 6~15mmAq', filterEff: 0.5, rep: true,
    features: ['3중 필터: 염화비닐 → 프리필터 → 카본필터', '큰 오염물·먼지·냄새를 단계별 제거', '필터 교체가 쉬운 구조'] },
  fandora_box: { name: '팬도라 필터박스', model: 'FB-300A (브릿지형)', group: '필터·부속', model3d: 'filterbox', role: 'filter', mount: 'duct', size: 0.5,
    airflow: 1000, power: 0, pressure: '압력손실 6~15mmAq', filterEff: 0.5, rep: true,
    features: ['덕트 중간에 설치하는 브릿지형', '3중 필터(염화비닐·프리·카본)', '연결 덕트 Ø198~Ø448'] },
  purigen: { name: '퓨리젠 디퓨져 필터', model: 'FP-300HB / FP-300M', group: '필터·부속', model3d: 'diffuser', role: 'filter', mount: 'ceiling', size: 0.26,
    airflow: 150, power: 0, pressure: '–', filterEff: 0.9975, rep: true,
    features: ['H13 HEPA 필터 – 미세먼지 99.75% 저감(카탈로그)', '가정용 후크형 / 상업용 자석형', '항바이러스·탈취 필터 옵션'] },

  /* ---------- 환풍기·시로코·덕트팬 ---------- */
  vent: { name: '일반 환풍기', model: 'TFV-D15 ZPE (천장형)', group: '환풍기·덕트팬', model3d: 'ceilvent', role: 'exhaust', mount: 'ceiling', size: 0.3,
    airflow: 220, power: 26, pressure: '약 12mmAq', eff: 0.7,
    features: ['저소음·저전력', '볼베어링 채택', '욕실·화장실·사무실·흡연실 배기'] },
  plastic_fan: { name: '플라스틱팬', model: 'TFV-D10 XPA', group: '환풍기·덕트팬', model3d: 'ceilvent', role: 'exhaust', mount: 'ceiling', size: 0.23,
    airflow: 75, power: 11, pressure: '약 8mmAq', eff: 0.7,
    features: ['LED 작동 표시', '간편 설치', '저소음·저전력(11W)'] },
  mini_sirocco: { name: '미니 시로코팬', model: 'TFB-F10 AS', group: '시로코팬', model3d: 'centrifugal', role: 'exhaust', mount: 'duct', size: 0.32,
    airflow: 201, power: 32, pressure: '10mmAq', eff: 0.75,
    features: ['소형 공간 단독 급·배기', '정압이 약한 천장형 환풍기 보완', '설치·점검 간편'] },
  multi_sirocco: { name: '멀티 시로코팬', model: 'TFM-F14 AS', group: '시로코팬', model3d: 'centrifugal', role: 'exhaust', mount: 'duct', size: 0.36,
    airflow: 314, power: 45, pressure: '14mmAq', eff: 0.75,
    features: ['흡입 플랜지 2~3개 기본 장착', '여러 곳을 한 번에 배기', 'T연결구 불필요'] },
  double_sirocco: { name: '양흡 시로코팬', model: 'TFB-GD23 DS', group: '시로코팬', model3d: 'centrifugal', role: 'exhaust', mount: 'duct', size: 0.6,
    airflow: 2400, power: 423, pressure: '20mmAq', eff: 0.75,
    features: ['양쪽 흡입으로 큰 풍량', '저소음', '모터·팬 분리 점검 용이'] },
  large_sirocco: { name: '대형 시로코팬', model: 'TFB-G31 FT', group: '시로코팬', model3d: 'centrifugal', role: 'exhaust', mount: 'duct', size: 0.75,
    airflow: 4900, power: 770, pressure: '33mmAq', eff: 0.75,
    features: ['대풍량·고정압', '사각 외형으로 설치 효율', '-10~50℃, 습도 90%까지 운전'] },
  sus_sirocco: { name: 'SUS 시로코팬', model: 'TFB-F19 DS-S', group: '시로코팬', model3d: 'centrifugalSus', role: 'exhaust', mount: 'duct', size: 0.5,
    airflow: 1400, power: 250, pressure: '21mmAq', eff: 0.75,
    features: ['스테인리스(SUS) 재질 – 부식 환경 대응', '주방·병원·수영장 등 습한 곳', '저소음'] },
  round_duct: { name: '원형 덕트팬', model: 'TFJ-F25 BS (사류)', group: '환풍기·덕트팬', model3d: 'inline', role: 'exhaust', mount: 'duct', size: 0.3,
    airflow: 1200, power: 76, pressure: '–', eff: 0.7,
    features: ['원형 덕트 중간에 직결', '사류형 고효율 날개', '주택~공장 범용'] },
  square_duct: { name: '사각 덕트팬', model: 'TFM-F400 RT (인라인)', group: '환풍기·덕트팬', model3d: 'inline', role: 'exhaust', mount: 'duct', size: 0.5,
    airflow: 3124, power: 249, pressure: '–', eff: 0.7,
    features: ['흡음재 추가로 매우 낮은 소음', '풍량 변화에도 일정한 정압', '기계실·전기실·주차장 급배기'] },
  turbo: { name: '일반 터보팬', model: 'TFX-F31 FS', group: '시로코팬', model3d: 'centrifugal', role: 'exhaust', mount: 'duct', size: 0.62,
    airflow: 3500, power: 607, pressure: '48mmAq', eff: 0.75,
    features: ['알루미늄 터보 날개 – 고정압·경량', '기름이 많은 주방 배기에 적합', '모터 직결로 설치·정비 간편'] },
  turbo_hp: { name: '고풍압 터보팬', model: 'TFX-F39 HS', group: '시로코팬', model3d: 'centrifugal', role: 'exhaust', mount: 'duct', size: 0.75,
    airflow: 6050, power: 1720, pressure: '64mmAq', eff: 0.75,
    features: ['높은 정압으로 긴 덕트에 유리', '알루미늄 터보 날개', '공장·플랜트 배기'] },

  /* ---------- 고압팬(프로펠러) ---------- */
  prop_small: { name: '소형 고압팬', model: 'TFP-F40 DSE', group: '고압팬', model3d: 'propeller', role: 'exhaust', mount: 'wall', size: 0.5,
    airflow: 3500, power: 146, pressure: '–', eff: 0.8,
    features: ['유선형 날개로 저소음', '방청·방진 구조', '공장·작업장·창고·식당'] },
  prop_medium: { name: '중형 고압팬', model: 'TFP-F50 ET', group: '고압팬', model3d: 'propeller', role: 'exhaust', mount: 'wall', size: 0.6,
    airflow: 7000, power: 420, pressure: '–', eff: 0.8,
    features: ['대풍량·고정압 전용 날개', '스테인리스 날개 – 방식', '공장·창고·온실·축사'] },
  prop_large: { name: '대형 고압팬', model: 'TFP-H100 FS', group: '고압팬', model3d: 'propeller', role: 'exhaust', mount: 'wall', size: 1.1,
    airflow: 20500, power: 500, pressure: '–', eff: 0.8,
    features: ['Ø1,000mm 대풍량 날개', '스테인리스 날개', '대형 공장·물류창고 환기'] },
  prop_barn: { name: '축사용 고압팬', model: 'TFT-G60 ES', group: '고압팬', model3d: 'propeller', role: 'exhaust', mount: 'wall', size: 0.7,
    airflow: 9100, power: 380, pressure: '–', eff: 0.85,
    features: ['축사 환경(습기·암모니아) 대응', '대풍량 배기', '셔터·안전망 조합'] },
  prop_belt: { name: '벨트형 고압팬', model: 'TFH-FK130 FS', group: '고압팬', model3d: 'belt', role: 'exhaust', mount: 'wall', size: 1.375,
    airflow: 36900, power: 1270, pressure: '–', eff: 0.9,
    features: ['SUS 날개·벨트 구동', 'Ø1,270mm 초대풍량', '자동 셔터 부속'] },

  /* ---------- 송풍기 ---------- */
  blower_portable: { name: '이동형 송풍기', model: '포터블팬 TFT-20', group: '송풍기', model3d: 'axialStand', role: 'spot', mount: 'floor', size: 0.45,
    airflow: 1200, power: 253, pressure: '–', cover: 60, speed: 1.6,
    features: ['가벼운 중량·간편한 휴대', '덕트 연결 배기 가능', '현장 국소 냉각·환기'] },
  blower_fixed: { name: '고정형 송풍기', model: 'TFB-F36 KT (고정압)', group: '송풍기', model3d: 'centrifugal', role: 'exhaust', mount: 'floor', size: 0.9,
    airflow: 7800, power: 3670, pressure: '79mmAq', eff: 0.8,
    features: ['고정압·대풍량', '설비 급·배기', '기초 앵커 고정'] },
  blower_dust: { name: '집진설비용 송풍기', model: 'TFB-F33 HT (고정압)', group: '송풍기', model3d: 'centrifugal', role: 'exhaust', mount: 'floor', size: 0.9,
    airflow: 7920, power: 2450, pressure: '101mmAq', eff: 0.8,
    features: ['집진기 연결용 고정압 송풍', '분진·흄 흡인', '방진 기초 설치'] },
  blower_dry: { name: '건조설비용 송풍기', model: 'TFS-GD20 CS (캐비닛)', group: '송풍기', model3d: 'centrifugal', role: 'exhaust', mount: 'floor', size: 0.5,
    airflow: 1250, power: 107, pressure: '13mmAq', eff: 0.75,
    features: ['압력 변화에도 일정 풍량', '건조기·설비 결합용', '저소음'] },

  /* ---------- 대형 실링팬 ---------- */
  hvls_ac: { name: 'HVLS 실링팬 AC', model: 'TFL-FG730GT AC', group: '대형 실링팬', model3d: 'hvls', role: 'hvls', mount: 'hang', size: 7.3,
    airflow: 791100, power: 1500, pressure: '–', cover: 1800, speed: 1.2, rep: true, minHeight: 4.5,
    features: ['독일 노드 AC 기어드 모터', '보쉬 렉스로스 컨트롤러', '속도 50~100% 조절', '소음 45dB 이하'] },
  hvls_bldc: { name: 'HVLS 실링팬 BLDC', model: 'TFL-BL730 FT BLDC', group: '대형 실링팬', model3d: 'hvls', role: 'hvls', mount: 'hang', size: 7.3,
    airflow: 780000, power: 1100, pressure: '–', cover: 1800, speed: 1.2, rep: true, minHeight: 4.5,
    features: ['BLDC 모터 – AC 대비 소비전력↓(1.5→1.1kW)', 'IP66 컨트롤러', '속도 0~100% 무단 조절', '소음 38dB 이하'] },

  /* ---------- 부속 ---------- */
  diffuser: { name: '디퓨져', model: '원형/사각 디퓨져', group: '필터·부속', model3d: 'diffuser', role: 'accessory', mount: 'ceiling', size: 0.3,
    airflow: 0, power: 0, pressure: '–',
    features: ['천장 급·배기구 마감', '공기를 고르게 퍼뜨려 바람 쏠림 감소', '원형·사각 타입'] },
  hoodcap: { name: '후드캡', model: '스테인리스 후드캡', group: '필터·부속', model3d: 'hoodcap', role: 'accessory', mount: 'exterior', size: 0.3,
    airflow: 0, power: 0, pressure: '–',
    features: ['외벽 배기구 마감', '빗물·역풍·벌레 유입 차단', '방충망 일체형'] },
  safety_net: { name: '고압팬 안전망', model: '고압팬용 안전망', group: '필터·부속', model3d: 'none', role: 'accessory', mount: 'none', size: 1,
    airflow: 0, power: 0, pressure: '–',
    features: ['고압팬 흡입측 보호', '작업자 손·이물질 접촉 방지', '축사·공장 필수 안전 부속'] },

  /* ---------- 메트릭스 외 제품 (브로셔 용도 기준) ---------- */
  'tfh-h80': { name: '온실 전용팬', model: 'TFH-H80 FT-DS', group: '고압팬', model3d: 'propeller', role: 'exhaust', mount: 'wall', size: 0.9,
    airflow: 14100, power: 610, pressure: '–', eff: 0.85, extra: true,
    features: ['IP55 모터, 직결 구동', '여름철 고온 배출', '겨울철 냉해 예방'] },
  'tfp-g60-chimney': { name: '루프팬 (굴뚝형)', model: 'TFP-G60 FT', group: '고압팬', model3d: 'roof', role: 'exhaust', mount: 'roof', size: 0.72,
    airflow: 12373, power: 373, pressure: '–', eff: 0.8, extra: true,
    features: ['SUS 임펠러', '지붕 설치로 상부 열기를 빠르게 배출', '공장·창고 어디든 환기'] },
  'tfu-g110': { name: '서리방지팬', model: 'TFU-G110 HT', group: '송풍기', model3d: 'defroster', role: 'none', mount: 'pole', size: 1.1,
    airflow: 26500, power: 3700, pressure: '–', extra: true, hz: 60,
    features: ['틸팅 헤드·방수', '자동 컨트롤러 운전', '농장·골프장 서리 피해 예방(겨울철, 여름 효과 계산 제외)'] },
  'tff-f30': { name: '서큘레이션팬', model: 'TFF-F30BS', group: '송풍기', model3d: 'circ', role: 'circulate', mount: 'hang', size: 0.36,
    airflow: 1466, power: 66, pressure: '–', cover: 90, speed: 0.8, extra: true,
    features: ['IP55, ABS 하우징', '71° 회전으로 넓은 범위', '실내 공기 순환으로 온습도 균일화'] },
  'tfm-g1000': { name: '대형 덕트 인라인팬', model: 'TFM-G1000 RT', group: '환풍기·덕트팬', model3d: 'inline', role: 'exhaust', mount: 'duct', size: 0.9,
    airflow: 28800, power: 7500, pressure: '–', eff: 0.8, extra: true, hz: 60,
    features: ['고효율 모터·저소음', '기계실·전기실 급배기', '주차장 공조·제연 설비'] },
  'tfz-e33': { name: '유인 제트팬', model: 'TFZ-E33 ES', group: '송풍기', model3d: 'jet', role: 'spot', mount: 'hang', size: 0.44,
    airflow: 3000, power: 250, pressure: '–', cover: 400, speed: 0.6, extra: true, rep: true,
    features: ['덕트 없이 급기구→배기구로 기류 유도', '공기 정체구역 해소', '무덕트 행거형으로 설치·유지 간편'] },
  'ec-module': { name: 'EC 팬 모듈', model: 'Fanzic EC FAN Ø500', group: 'EC팬', model3d: 'ec', role: 'exhaust', mount: 'rack', size: 0.62,
    airflow: 10000, power: 750, pressure: '–', eff: 0.9, ec: true, extra: true, rep: true,
    features: ['AC팬 대비 30~50% 에너지 절감', '0-10V / RS485로 인버터 없이 정밀 제어', 'IP55 방진·방수, 분리형 구조'] },
  'tfd-g75': { name: '대형 베인 축류팬 (스탠드형)', model: 'TFD-G75 SP', group: '송풍기', model3d: 'axialStand', role: 'spot', mount: 'floor', size: 0.95,
    airflow: 25000, power: 1650, pressure: '–', cover: 220, speed: 2.2, extra: true, hz: 60,
    features: ['대풍량·저소음', '제철·조선 등 중공업 작업자 스폿 냉각', '열코일 냉각·증기 배출'] }
};

/* 메트릭스 외 현장(온실·지하주차장)과 메트릭스 외 제품의 적합도 — 브로셔 용도 문구 기준 */
FZ.EXTRA_MATRIX = {
  greenhouse: { 'tfh-h80': '◎', prop_medium: '◎', 'tff-f30': '◎', 'tfu-g110': '◎', prop_large: '○', prop_belt: '○', prop_small: '△', blower_portable: '△', safety_net: '○' },
  parking: { 'tfm-g1000': '◎', 'tfz-e33': '◎', prop_belt: '○', square_duct: '○', prop_large: '△', large_sirocco: '△', hoodcap: '○' },
  factory: { 'tfp-g60-chimney': '◎', 'tfd-g75': '○', 'tfm-g1000': '○', 'tff-f30': '△', 'ec-module': '△' },
  logistics: { 'tfp-g60-chimney': '◎', 'tfz-e33': '△', 'tff-f30': '○' },
  plant: { 'tfp-g60-chimney': '◎', 'tfd-g75': '◎', 'tfm-g1000': '○' },
  datacenter: { 'ec-module': '◎', 'tfm-g1000': '○' },
  barn: { 'tff-f30': '○', 'tfh-h80': '△' },
  pool: {}
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
