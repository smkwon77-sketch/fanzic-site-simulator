/* 추천용 제품 태그
   solves: 해결하는 문제 heat(열기·더위) humid(습기·결로) odor(냄새·유증기) dust(미세먼지·분진) co2(CO₂·답답함) gas(유해가스·매연) stagnant(공기 정체)
   dirs: 가능한 공기 방향 (exhaust 배기 / intake 흡기·급기 / circ 순환), def: 기본 방향
   area: 적합 면적(㎡) 범위, quiet: 저소음, loud: 소음 큼, corrosion: 내부식, oily: 기름기 대응
   image: assets/products 사진 (없으면 3D 모델 그림으로 대신 표시) */
window.FZ = window.FZ || {};

FZ.TAGS = {
  /* 시로코팬 */
  mini_sirocco:   { solves: ['humid', 'odor', 'co2'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [3, 300], quiet: 1, image: 'multi_sirocco.jpg' },
  small_sirocco:  { solves: ['humid', 'odor', 'co2', 'heat'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [20, 1500], quiet: 1, image: null },
  sus_sirocco:    { solves: ['humid', 'odor', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [20, 1500], corrosion: 1, oily: 1, image: 'sirocco_sus.jpg' },
  large_sirocco:  { solves: ['heat', 'dust', 'gas', 'odor'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [150, 5000], image: null },
  blower_fixed:   { solves: ['dust', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [200, 10000], loud: 1, image: null },
  blower_dry:     { solves: ['humid', 'heat', 'co2'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [30, 2000], quiet: 1, image: 'sirocco.jpg' },
  double_sirocco: { solves: ['odor', 'co2', 'heat', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [50, 2000], quiet: 1, oily: 1, image: 'sirocco_double.jpg' },
  turbo:          { solves: ['odor', 'heat', 'gas', 'dust'], dirs: ['exhaust'], def: 'exhaust', area: [50, 10000], oily: 1, image: null },
  fandora:        { solves: ['odor', 'dust'], dirs: ['intake', 'exhaust'], def: 'intake', area: [10, 1500], quiet: 1, oily: 1, image: 'fandora.jpg' },
  /* 고압팬 */
  prop_small:     { solves: ['heat', 'odor', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [20, 500], image: null },
  prop_medium:    { solves: ['heat', 'humid', 'dust'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [100, 2000], corrosion: 1, image: 'propeller_guard.jpg' },
  shutter_unit:   { solves: [], dirs: [], def: null, area: [20, 50000], corrosion: 1, image: 'shutter.jpg' },
  safety_net:     { solves: [], dirs: [], def: null, area: [50, 50000], image: 'safety_net.jpg' },
  prop_large:     { solves: ['heat', 'dust', 'humid', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [300, 20000], loud: 1, corrosion: 1, image: 'propeller.jpg' },
  controller:     { solves: [], dirs: [], def: null, area: [100, 50000], image: 'controller.jpg' },
  phase_ctrl:     { solves: [], dirs: [], def: null, area: [300, 50000], image: null },
  prop_belt:      { solves: ['heat', 'gas', 'humid', 'dust'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [800, 30000], loud: 1, corrosion: 1, image: 'belt_box.jpg' },
  belt_parking:   { solves: ['gas', 'heat', 'co2', 'dust'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [800, 30000], loud: 1, image: null },
  'tfh-h80':      { solves: ['heat', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [200, 5000], corrosion: 1, image: null },
  guard_box:      { solves: [], dirs: [], def: null, area: [800, 50000], image: null },
  'tfp-g60-chimney': { solves: ['heat', 'dust', 'gas'], dirs: ['exhaust'], def: 'exhaust', area: [300, 30000], corrosion: 1, image: null },
  'tfu-g110':     { solves: [], dirs: ['circ'], def: 'circ', area: [500, 50000], image: 'chimney.jpg' },
  /* 축류·덕트팬 */
  vane_duct:      { solves: ['heat', 'humid', 'gas', 'stagnant'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [100, 5000], image: 'duct_round.jpg' },
  round_duct:     { solves: ['co2', 'humid', 'odor'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [10, 800], quiet: 1, image: 'duct_mixed.jpg' },
  'tfd-g75':      { solves: ['heat', 'stagnant'], dirs: ['circ'], def: 'circ', area: [300, 20000], loud: 1, image: 'portable_blue.jpg' },
  square_duct:    { solves: ['co2', 'heat', 'odor', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [50, 20000], quiet: 1, image: 'duct_square.jpg' },
  blower_portable:{ solves: ['heat', 'stagnant', 'gas'], dirs: ['circ'], def: 'circ', area: [20, 1500], image: null },
  'tfz-e33':      { solves: ['stagnant', 'gas'], dirs: ['circ'], def: 'circ', area: [500, 20000], quiet: 1, image: 'jet.jpg' },
  /* 플라스틱팬 */
  vent:           { solves: ['humid', 'odor', 'co2'], dirs: ['exhaust'], def: 'exhaust', area: [3, 200], quiet: 1, image: 'plastic_ceiling.jpg' },
  ceiling_fan2:   { solves: ['humid', 'odor', 'co2'], dirs: ['exhaust'], def: 'exhaust', area: [3, 300], quiet: 1, image: null },
  plastic_fan:    { solves: ['humid', 'odor'], dirs: ['exhaust'], def: 'exhaust', area: [2, 100], quiet: 1, corrosion: 1, image: null },
  plastic_vent:   { solves: ['odor', 'humid'], dirs: ['exhaust'], def: 'exhaust', area: [5, 300], quiet: 1, corrosion: 1, image: null },
  diffuser_fan:   { solves: ['co2', 'humid'], dirs: ['exhaust', 'intake'], def: 'intake', area: [5, 300], quiet: 1, image: 'plastic_vent.jpg' },
  /* 기타 */
  aspirator:      { solves: ['gas', 'odor'], dirs: ['exhaust'], def: 'exhaust', area: [10, 3000], corrosion: 1, image: null },
  roof_ec:        { solves: ['heat', 'co2', 'odor', 'humid'], dirs: ['exhaust'], def: 'exhaust', area: [100, 5000], quiet: 1, image: null },
  hanger_fan:     { solves: ['gas', 'co2', 'heat'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [500, 20000], image: null },
  custom_blower:  { solves: ['dust', 'gas', 'heat'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [300, 30000], loud: 1, image: 'blower_fixed.jpg' },
  industrial_fan: { solves: ['heat', 'stagnant'], dirs: ['circ'], def: 'circ', area: [20, 1500], image: 'industrial_fan.jpg' },
  hvls:           { solves: ['heat', 'stagnant', 'humid'], dirs: ['circ'], def: 'circ', area: [400, 50000], quiet: 1, image: 'hvls_ac.jpg' },
  purigen:        { solves: ['dust'], dirs: ['intake'], def: 'intake', area: [5, 800], quiet: 1, image: 'purigen.jpg' },
  hoodcap:        { solves: ['odor', 'stagnant'], dirs: [], def: null, area: [1, 5000], corrosion: 1, image: 'hoodcap.jpg' },
  /* EC팬 */
  'ec-module':    { solves: ['heat'], dirs: ['intake', 'exhaust'], def: 'intake', area: [30, 3000], quiet: 1, image: null }
};

FZ.PROBLEMS = [
  { id: 'heat', label: '열기·더위' },
  { id: 'humid', label: '습기·결로' },
  { id: 'odor', label: '냄새·유증기' },
  { id: 'dust', label: '미세먼지·분진' },
  { id: 'co2', label: 'CO₂·답답함' },
  { id: 'gas', label: '유해가스·매연' },
  { id: 'stagnant', label: '공기 정체' }
];
FZ.MOUNTS = [
  { id: 'wall', label: '벽' }, { id: 'ceiling', label: '천장' }, { id: 'roof', label: '지붕' },
  { id: 'floor', label: '바닥' }, { id: 'duct', label: '덕트 있음' }
];
FZ.SPECIALS = [
  { id: 'corrosion', label: '부식·고습 환경' }, { id: 'oily', label: '기름기 많음' }, { id: 'quiet', label: '저소음 필요' }
];
FZ.DIR_LABEL = { exhaust: '배기', intake: '흡기', circ: '순환' };
