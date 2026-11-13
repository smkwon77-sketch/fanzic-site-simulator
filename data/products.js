/* 팬직 제품 데이터 — 국문 카탈로그(20251208 HOME) ALL PRODUCT 41개 + EC 팬 모듈.
   - 순서·분류(group)는 카탈로그 목차를 따름. 묶인 제품(미니&멀티, 대형 고압팬_축사용팬 등)은 1개 제품 + 모델 선택(specs.js)
   - 사양 수치의 기준은 specs.js 대표 모델(def), 아래 airflow·power 는 사양표가 없을 때의 값
   - extra:true: 「제품별 용도 메트릭스」에 없던 제품(카탈로그 용도 문구 기준으로 추천)
   - rep:true: 카탈로그에 수치가 없어 시뮬레이션용으로 가정한 값이 포함됨
   role: exhaust(환기량 산입) · hvls · circulate · spot · filter · accessory · none
   mount: wall · duct · floor · hang · ceiling · exterior · roof · rack · pole · none
   eff: 실제 설치 정압을 감안한 풍량 보정 계수 */
window.FZ = window.FZ || {};

FZ.PRODUCTS = {
  /* ---------- 시로코팬 (CENTRIFUGAL FANS) ---------- */
  mini_sirocco: { name: '미니&멀티 시로코팬', model: 'TFB-F10 AS', group: '시로코팬', model3d: 'sirocoBox', role: 'exhaust', mount: 'duct', size: 0.32,
    airflow: 201, power: 32, pressure: '10mmAq', eff: 0.75,
    features: ['소형 공간 단독 급·배기 (미니)', '흡입 플랜지 2~3개로 여러 곳 동시 배기 (멀티)', '정압이 약한 천장형 환풍기 보완'] },
  small_sirocco: { name: '소형 시로코팬', model: 'TFB-F19 DS', group: '시로코팬', model3d: 'sirocoBox', role: 'exhaust', mount: 'duct', size: 0.5, extra: true,
    airflow: 1400, power: 250, pressure: '21mmAq', eff: 0.75,
    features: ['저소음형 날개·케이싱', '모터·팬 직결형으로 소형·경량', '설치 상태로 모터·날개 분리 점검'] },
  sus_sirocco: { name: '소형 시로코팬 SUS', model: 'TFB-F19 DS-S', group: '시로코팬', model3d: 'centrifugalSus', role: 'exhaust', mount: 'duct', size: 0.5,
    airflow: 1400, power: 250, pressure: '21mmAq', eff: 0.75,
    features: ['스테인리스(SUS) 재질 – 부식 환경 대응', '주방·병원·수영장 등 습한 곳', '저소음'] },
  large_sirocco: { name: '대형 시로코팬', model: 'TFB-G31 FS', group: '시로코팬', model3d: 'sirocoFrame', role: 'exhaust', mount: 'duct', size: 0.75,
    airflow: 4900, power: 770, pressure: '33mmAq', eff: 0.75,
    features: ['대풍량·고정압', '사각 프레임형으로 설치 효율', '-10~50℃, 습도 90%까지 운전'] },
  blower_fixed: { name: '고정압 시로코팬', model: 'TFB-F33 HS', group: '시로코팬', model3d: 'sirocoFrame', role: 'exhaust', mount: 'floor', size: 0.9,
    airflow: 7920, power: 2450, pressure: '101mmAq', eff: 0.8,
    features: ['고정압·대풍량', '집진기·설비 급·배기', '방진 기초 위 설치'] },
  blower_dry: { name: '스트레이트 시로코팬', model: 'TFS-GD20 CS', group: '시로코팬', model3d: 'cabinet', role: 'exhaust', mount: 'duct', size: 0.5,
    airflow: 1250, power: 107, pressure: '13mmAq', eff: 0.75,
    features: ['덕트 저항이 변해도 풍량 변화 적음', '정압이 높아지면 소음 감소', '공기 정화·일반 환기·급배기'] },
  double_sirocco: { name: '양흡 시로코팬', model: 'TFB-GD23 DS', group: '시로코팬', model3d: 'sirocoDouble', role: 'exhaust', mount: 'duct', size: 0.6,
    airflow: 2400, power: 423, pressure: '20mmAq', eff: 0.75,
    features: ['양쪽 흡입으로 큰 풍량', '저소음 날개·케이싱', '모터·팬 분리 점검 용이'] },
  turbo: { name: '터보 믹스드팬', model: 'TFX-F31 FS', group: '시로코팬', model3d: 'sirocoFrame', role: 'exhaust', mount: 'duct', size: 0.62,
    airflow: 3500, power: 607, pressure: '48mmAq', eff: 0.75,
    features: ['알루미늄 터보 날개 – 고정압·경량', '기름이 많은 주방 배기에 적합', '긴 덕트에 유리한 높은 정압'] },
  fandora: { name: '팬도라 (필터)', model: 'FG-300A (그릴형)', group: '시로코팬', model3d: 'filterbox', role: 'filter', mount: 'ceiling', size: 0.45,
    airflow: 1000, power: 0, pressure: '압력손실 6~15mmAq', filterEff: 0.5, rep: true,
    features: ['3중 필터: 염화비닐 → 프리필터 → 카본필터', '그릴형(천장) / 브릿지형(덕트 중간) 2가지', '필터 교체가 쉬운 구조'] },

  /* ---------- 고압팬 (PROPELLER FANS) ---------- */
  prop_small: { name: '소형 고압팬', model: 'TFP-F20 ASE', group: '고압팬', model3d: 'propSmall', role: 'exhaust', mount: 'wall', size: 0.5,
    airflow: 3500, power: 146, pressure: '–', eff: 0.8,
    features: ['유선형 날개로 저소음', '방청·방진 구조', '공장·작업장·창고·식당'] },
  prop_medium: { name: '중형 고압팬', model: 'TFP-F50 ES', group: '고압팬', model3d: 'propellerDark', role: 'exhaust', mount: 'wall', size: 0.6,
    airflow: 7000, power: 420, pressure: '–', eff: 0.8,
    features: ['대풍량·고정압 전용 날개', '스테인리스 날개 – 방식', '공장·창고·온실·축사'] },
  shutter_unit: { name: '셔터 / 풍압식 개폐장치', model: 'SHP-40', group: '고압팬', model3d: 'shutterBox', role: 'accessory', mount: 'none', size: 0.55, extra: true,
    airflow: 0, power: 0, pressure: '–',
    features: ['알루미늄 날개로 경량, 작동 소음 없음', '고압팬 정지 시 외기·빗물·먼지 유입 차단', '내식성'] },
  safety_net: { name: '고압팬 안전망', model: '고압팬용 안전망', group: '고압팬', model3d: 'none', role: 'accessory', mount: 'none', size: 1,
    airflow: 0, power: 0, pressure: '–',
    features: ['고압팬 흡입측 보호', '작업자 손·이물질 접촉 방지', '축사·공장 필수 안전 부속'] },
  prop_large: { name: '대형 고압팬 · 축사용팬', model: 'TFP-H100 FS', group: '고압팬', model3d: 'propeller', role: 'exhaust', mount: 'wall', size: 1.1,
    airflow: 20500, power: 500, pressure: '–', eff: 0.85,
    features: ['Ø1,000~1,200mm 대풍량 날개', '축사 환경(습기·암모니아) 대응 해머톤 도장', '대형 공장·물류창고·축사 환기'] },
  controller: { name: '제어기', model: 'TFA-NF30 AT', group: '고압팬', model3d: 'controllerBox', role: 'accessory', mount: 'none', size: 0.5, extra: true,
    airflow: 0, power: 0, pressure: '–',
    features: ['온도 감지 센서로 자동 운전', '1~6단(인버터 1~10단) 속도 제어', 'ON/OFF 시간 타이머, 보조 출력(램프·히터)'] },
  phase_ctrl: { name: '위상 제어기', model: 'FFC-8K', group: '고압팬', model3d: 'controllerPanel', role: 'accessory', mount: 'none', size: 0.4, extra: true,
    airflow: 0, power: 0, pressure: '–',
    features: ['1% 단위 속도 제어 (3상 10%)', '축사용 대형 고압팬 전용 (TFP-H100)', '온도 센서·타이머 자동 제어'] },
  prop_belt: { name: '벨트형 고압팬 · 양계장팬', model: 'TFH-FK130 FS', group: '고압팬', model3d: 'belt', role: 'exhaust', mount: 'wall', size: 1.375,
    airflow: 36900, power: 1270, pressure: '–', eff: 0.9,
    features: ['SUS 날개·벨트 구동', 'Ø1,270mm 초대풍량', '자동 셔터 일체형'] },
  belt_parking: { name: '벨트형 고압팬 · 주차장팬', model: 'TFH-F100 ETA', group: '고압팬', model3d: 'boxMesh', role: 'exhaust', mount: 'wall', size: 1.0, extra: true,
    airflow: 16500, power: 874, pressure: '–', eff: 0.85,
    features: ['벽체 매립 시공 (설치용 슬리브 별도)', 'FD·BDD·루버 일체형 자력식 셔터', '지하주차장·공장·체육시설 급·배기'] },
  'tfh-h80': { name: '하우스팬', model: 'TFH-H80 FT-DS', group: '고압팬', model3d: 'belt', role: 'exhaust', mount: 'wall', size: 0.9, extra: true,
    airflow: 14100, power: 610, pressure: '–', eff: 0.85, hz: 60,
    features: ['IP55 모터, 직결 구동', '셔터형 / 안전망형', '여름철 고온 배출·겨울철 냉해 예방'] },
  guard_box: { name: '슬리브 / 가드박스', model: '슬리브+가드박스', group: '고압팬', model3d: 'sleeveGuard', role: 'accessory', mount: 'none', size: 1.0, extra: true,
    airflow: 0, power: 0, pressure: '–',
    features: ['주차장팬 설치용 어댑터(슬리브)', '토출측 안전망(가드박스)', '주차장팬과 같은 재질로 외관 통일'] },
  'tfp-g60-chimney': { name: '굴뚝팬', model: 'TFP-G60 FT', group: '고압팬', model3d: 'roof', role: 'exhaust', mount: 'roof', size: 0.72, extra: true,
    airflow: 12373, power: 373, pressure: '–', eff: 0.8,
    features: ['SUS 임펠러', '굴뚝·지붕 설치로 상부 열기를 빠르게 배출', '공장·창고 어디든 환기'] },
  'tfu-g110': { name: '그린팬 / 방제팬', model: 'TFU-G110 HT', group: '고압팬', model3d: 'defroster', role: 'none', mount: 'pole', size: 1.1, extra: true,
    airflow: 26500, power: 3700, pressure: '–', hz: 60,
    features: ['틸팅 헤드·방수', '자동 컨트롤러 운전', '농장·골프장 서리 피해 예방(겨울철, 여름 효과 계산 제외)'] },

  /* ---------- 축류·덕트팬 (AXIAL FANS) ---------- */
  vane_duct: { name: '덕트팬', model: 'TFD-F40 ES', group: '축류·덕트팬', model3d: 'vaneAxial', role: 'exhaust', mount: 'duct', size: 0.45, extra: true,
    airflow: 4600, power: 390, pressure: '–', eff: 0.8,
    features: ['저소음·경량 설계, 고정압·대풍량', '전폐형 모터로 내구성 향상', '터널·빌딩·공장 공조, 축사·비닐하우스 급·배기'] },
  round_duct: { name: '사류 덕트팬', model: 'TFJ-F25 BS', group: '축류·덕트팬', model3d: 'inline', role: 'exhaust', mount: 'duct', size: 0.3,
    airflow: 1200, power: 76, pressure: '–', eff: 0.7,
    features: ['유체역학 기반 사류 날개 + 후면 정류 날개로 저소음', '본체 중앙 고정 다리·방진고무대', '빌딩·맨션·병원 공조, 공장·창고 급·배기'] },
  'tfd-g75': { name: '대형 덕트팬 1·2·3', model: 'TFD-G75 SP', group: '축류·덕트팬', model3d: 'axialStandBlue', role: 'spot', mount: 'floor', size: 0.95, extra: true,
    airflow: 25000, power: 1650, pressure: '–', cover: 220, speed: 2.2, hz: 60,
    features: ['대풍량·저소음 이동/고정식', '제철·조선 등 중공업 작업자 스폿 냉각', 'Hot Coil 냉각·Steam 배기'] },
  square_duct: { name: '인라인 덕트팬', model: 'TFM-F400 RT', group: '축류·덕트팬', model3d: 'squareInline', role: 'exhaust', mount: 'duct', size: 0.5,
    airflow: 3124, power: 249, pressure: '–', eff: 0.7,
    features: ['흡음재로 매우 낮은 소음', '풍량 변화에도 일정한 정압', '기계실·전기실·주차장 급배기 (최대 40,500㎥/h)'] },
  blower_portable: { name: '포터블팬', model: 'TFT-20', group: '축류·덕트팬', model3d: 'portableDrum', role: 'spot', mount: 'floor', size: 0.3,
    airflow: 1500, power: 255, pressure: '–', cover: 60, speed: 1.6, hz: 60,
    features: ['가벼운 중량·간편한 휴대', '덕트 연결 배기 가능', '현장 국소 냉각·환기'] },
  'tfz-e33': { name: '유인팬', model: 'TFZ-E33 ES', group: '축류·덕트팬', model3d: 'jet', role: 'spot', mount: 'hang', size: 0.44, extra: true,
    airflow: 3000, power: 250, pressure: '–', cover: 400, speed: 0.6, rep: true,
    features: ['덕트 없이 급기구→배기구로 기류 유도', '공기 정체구역 해소', '무덕트 행거형으로 설치·유지 간편'] },

  /* ---------- 플라스틱팬 (PLASTIC FANS) ---------- */
  vent: { name: '실링팬 1', model: 'TFV 11-□DS', group: '플라스틱팬', model3d: 'ceilvent', role: 'exhaust', mount: 'ceiling', size: 0.25,
    airflow: 192, power: 20, pressure: '약 10mmAq', eff: 0.7, hz: 60,
    features: ['고급 ABS 그릴 5종 선택', '고풍량 저소음 시로코 임펠러', '역류 방지 댐퍼, 토출 Ø100'] },
  ceiling_fan2: { name: '실링팬 2', model: 'TFV-D15 ZPE', group: '플라스틱팬', model3d: 'ceilventRing', role: 'exhaust', mount: 'ceiling', size: 0.33, extra: true,
    airflow: 220, power: 26, pressure: '약 12mmAq', eff: 0.7,
    features: ['최적 모터로 풍량 향상', '그릴 커버 간편 탈부착', '마그네틱 댐퍼로 역류 방지'] },
  plastic_fan: { name: '플라스틱팬', model: 'TFV-D10 XPA', group: '플라스틱팬', model3d: 'ceilventPlain', role: 'exhaust', mount: 'ceiling', size: 0.23,
    airflow: 75, power: 11, pressure: '약 8mmAq', eff: 0.7,
    features: ['전원램프(LED)', '그릴 커버 간편 탈부착', '저소음·긴 수명(볼베어링)'] },
  plastic_vent: { name: '플라스틱 환풍기', model: 'TFV-20 ASG', group: '플라스틱팬', model3d: 'plasticWall', role: 'exhaust', mount: 'wall', size: 0.3, extra: true,
    airflow: 600, power: 27, pressure: '–', eff: 0.65, hz: 60,
    features: ['자동개폐 셔터형·천장형 등 다양한 타입', '저소음·절전형 모터', '주거·업무·업소용 냄새 배기'] },
  diffuser_fan: { name: '디퓨져팬', model: 'TFV-E15 AS', group: '플라스틱팬', model3d: 'pipefan', role: 'exhaust', mount: 'duct', size: 0.18, extra: true,
    airflow: 190, power: 8, pressure: '–', eff: 0.65, hz: 60,
    features: ['저소음·저소비전력', '천장·벽 부착 가능', '빌딩·맨션·병원 공조 환기'] },

  /* ---------- 기타 (ETC) ---------- */
  aspirator: { name: '흡출기', model: 'TFC-F17 AS', group: '기타', model3d: 'aspirator', role: 'exhaust', mount: 'roof', size: 0.3, extra: true,
    airflow: 480, power: 44, pressure: '–', eff: 0.8, hz: 60,
    features: ['메탄·암모니아 가스에 강한 내식성 (본체 아연도, 팬 SUS)', '배관 Ø100 / Ø125 / Ø150', '난로·정화조·분뇨탱크·축사 연기·가스 배출'] },
  roof_ec: { name: '루프팬 (EC)', model: 'TFR-F31 DS', group: '기타', model3d: 'roofEC', role: 'exhaust', mount: 'roof', size: 0.62, extra: true, ec: true,
    airflow: 2000, power: 320, pressure: '–', eff: 0.85,
    features: ['EC 모터 + 컨트롤러 + 차압 센서 일체형', '층별 풍량 변화에도 일정 정압 유지', 'AC 대비 최대 60% 소비전력 감소, RS485'] },
  hanger_fan: { name: '행거팬', model: 'TFN-FD25 GT-B', group: '기타', model3d: 'hangerBox', role: 'exhaust', mount: 'duct', size: 1.3, extra: true,
    airflow: 12000, power: 1500, pressure: '24mmAq', eff: 0.85, hz: 60,
    features: ['팬·루버 일체형 – 팬룸·덕트 공사 불필요', '천장 행거 로드 설치, 낮은 층고 가능', 'V벨트 구동, 지하주차장 급·배기'] },
  custom_blower: { name: '주문형 송풍기 (에어포일·다익형)', model: '주문 제작', group: '기타', model3d: 'centrifugal', role: 'exhaust', mount: 'floor', size: 0.9, extra: true, rep: true,
    airflow: 10000, power: 5500, pressure: '100mmAq', eff: 0.85,
    features: ['풍량·정압 맞춤 제작 (에어포일 고효율 / 다익형 소형)', '냉난방·열풍 건조·집진·클린룸 부스', '지하주차장·기계실·소방 제연 급·배기'] },
  industrial_fan: { name: '산업용 선풍기', model: 'TFE-F45 CS', group: '기타', model3d: 'standFan', role: 'spot', mount: 'floor', size: 0.5, extra: true, rep: true,
    airflow: 4500, power: 126, pressure: '–', cover: 50, speed: 1.2, hz: 60,
    features: ['3단 바람세기·좌우 회전', '스탠드·삼각대·이동형·벽걸이형', '모든 업소에서 사용'] },
  hvls: { name: '대형실링팬 (AC / BLDC)', model: 'TFL-FG730GT (AC)', group: '기타', model3d: 'hvls', role: 'hvls', mount: 'hang', size: 7.3,
    airflow: 791100, power: 1500, pressure: '–', cover: 1800, speed: 1.2, rep: true, minHeight: 4.5,
    features: ['AC: 독일 노드 기어드 모터·보쉬 렉스로스 컨트롤러', 'BLDC: 경량 모터·IP66 컨트롤러, 0~100% 무단 조절', '날개 3~7.3M, 소음 38~45dB 이하'] },
  purigen: { name: '퓨리젠', model: 'FP-300HB / FP-300M', group: '기타', model3d: 'purigen', role: 'filter', mount: 'ceiling', size: 0.26,
    airflow: 150, power: 0, pressure: '–', filterEff: 0.9975, rep: true,
    features: ['H13 HEPA 필터 – 미세먼지 99.75% 저감(카탈로그)', '가정용 후크형 / 상업용 자석형', '항바이러스·탈취 필터 옵션'] },
  hoodcap: { name: '후드캡 / 디퓨져', model: '스테인리스 후드캡', group: '기타', model3d: 'hoodcap', role: 'accessory', mount: 'exterior', size: 0.3,
    airflow: 0, power: 0, pressure: '–',
    features: ['후드캡: 외벽 배기구 마감, 빗물·역풍·벌레 차단', '디퓨져: 천장 급·배기구 마감, 바람 쏠림 감소', '원형·사각 디퓨져'] },

  /* ---------- EC팬 (카탈로그 외) ---------- */
  'ec-module': { name: 'EC 팬 모듈', model: 'Fanzic EC FAN Ø500', group: 'EC팬', model3d: 'ec', role: 'exhaust', mount: 'rack', size: 0.62,
    airflow: 10000, power: 750, pressure: '–', eff: 0.9, ec: true, extra: true, rep: true,
    features: ['AC팬 대비 30~50% 에너지 절감', '0-10V / RS485로 인버터 없이 정밀 제어', 'IP55 방진·방수, 분리형 구조'] }
};

/* 메트릭스 외 현장(온실·지하주차장)과 메트릭스 외 제품의 적합도 — 카탈로그 용도 문구 기준 */
FZ.EXTRA_MATRIX = {
  greenhouse: { 'tfh-h80': '◎', prop_medium: '◎', 'tfu-g110': '◎', prop_large: '○', prop_belt: '○', prop_small: '△', blower_portable: '△', safety_net: '○', shutter_unit: '○', controller: '○', vane_duct: '○', industrial_fan: '△' },
  parking: { square_duct: '◎', 'tfz-e33': '◎', belt_parking: '◎', hanger_fan: '◎', guard_box: '○', prop_belt: '○', custom_blower: '○', prop_large: '△', large_sirocco: '△', hoodcap: '○', vane_duct: '△' },
  factory: { 'tfp-g60-chimney': '◎', 'tfd-g75': '○', square_duct: '○', 'ec-module': '△', vane_duct: '○', custom_blower: '○', industrial_fan: '○', roof_ec: '○', belt_parking: '△', small_sirocco: '△' },
  logistics: { 'tfp-g60-chimney': '◎', 'tfz-e33': '△', industrial_fan: '○', roof_ec: '○', belt_parking: '○' },
  plant: { 'tfp-g60-chimney': '◎', 'tfd-g75': '◎', square_duct: '○', custom_blower: '◎', vane_duct: '○' },
  datacenter: { 'ec-module': '◎', square_duct: '○', roof_ec: '○' },
  barn: { 'tfh-h80': '△', aspirator: '◎', controller: '◎', phase_ctrl: '◎', shutter_unit: '◎', vane_duct: '○', industrial_fan: '△' },
  house: { plastic_vent: '◎', ceiling_fan2: '◎', diffuser_fan: '○', small_sirocco: '△', aspirator: '△' },
  commercial: { plastic_vent: '○', ceiling_fan2: '○', diffuser_fan: '○', small_sirocco: '○', roof_ec: '○', industrial_fan: '△' },
  hospital: { ceiling_fan2: '○', diffuser_fan: '◎', small_sirocco: '○', roof_ec: '○' },
  restaurant: { small_sirocco: '○', plastic_vent: '○', custom_blower: '△', industrial_fan: '○' },
  pool: { ceiling_fan2: '○', plastic_vent: '○' }
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
