/* 추천용 제품 태그
   solves: 해결하는 문제 heat(열기·더위) humid(습기·결로) odor(냄새·유증기) dust(미세먼지·분진) co2(CO₂·답답함) gas(유해가스·매연) stagnant(공기 정체)
   dirs: 가능한 공기 방향 (exhaust 배기 / intake 흡기·급기 / circ 순환), def: 기본 방향
   area: 적합 면적(㎡) 범위, quiet: 저소음, loud: 소음 큼, corrosion: 내부식, oily: 기름기 대응
   image: assets/products 사진 (없으면 3D 모델 그림으로 대신 표시) */
window.FZ = window.FZ || {};

FZ.TAGS = {
  fandora:        { solves: ['odor', 'dust'], dirs: ['intake'], def: 'intake', area: [10, 600], quiet: 1, oily: 1, image: 'fandora.jpg' },
  fandora_box:    { solves: ['odor', 'dust'], dirs: ['intake', 'exhaust'], def: 'exhaust', area: [20, 1500], oily: 1, image: 'fandora.jpg' },
  purigen:        { solves: ['dust'], dirs: ['intake'], def: 'intake', area: [5, 800], quiet: 1, image: 'purigen.jpg' },
  vent:           { solves: ['humid', 'odor', 'co2'], dirs: ['exhaust'], def: 'exhaust', area: [3, 300], quiet: 1, image: 'plastic_ceiling.jpg' },
  plastic_fan:    { solves: ['humid', 'odor'], dirs: ['exhaust'], def: 'exhaust', area: [2, 150], quiet: 1, corrosion: 1, image: 'plastic_vent.jpg' },
  mini_sirocco:   { solves: ['humid', 'odor', 'co2'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [3, 200], quiet: 1, image: 'multi_sirocco.jpg' },
  multi_sirocco:  { solves: ['humid', 'odor', 'co2'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [5, 300], quiet: 1, image: 'multi_sirocco.jpg' },
  double_sirocco: { solves: ['odor', 'co2', 'heat', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [50, 2000], quiet: 1, oily: 1, image: 'sirocco_double.jpg' },
  large_sirocco:  { solves: ['heat', 'dust', 'gas', 'odor'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [150, 5000], image: 'sirocco_large.jpg' },
  sus_sirocco:    { solves: ['humid', 'odor', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [20, 1500], corrosion: 1, oily: 1, image: 'sirocco_sus.jpg' },
  round_duct:     { solves: ['co2', 'humid', 'odor'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [10, 800], quiet: 1, image: 'duct_mixed.jpg' },
  square_duct:    { solves: ['co2', 'heat', 'odor', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [50, 3000], quiet: 1, image: 'duct_square.jpg' },
  turbo:          { solves: ['odor', 'heat', 'gas'], dirs: ['exhaust'], def: 'exhaust', area: [50, 3000], oily: 1, image: 'duct_square.jpg' },
  turbo_hp:       { solves: ['heat', 'gas', 'dust', 'odor'], dirs: ['exhaust'], def: 'exhaust', area: [200, 10000], oily: 1, image: 'duct_square.jpg' },
  prop_small:     { solves: ['heat', 'odor', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [20, 500], image: 'propeller_guard.jpg' },
  prop_medium:    { solves: ['heat', 'humid', 'dust'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [100, 2000], corrosion: 1, image: 'propeller.jpg' },
  prop_large:     { solves: ['heat', 'dust', 'humid', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [500, 20000], loud: 1, corrosion: 1, image: 'propeller.jpg' },
  prop_barn:      { solves: ['heat', 'gas', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [200, 3000], corrosion: 1, image: 'propeller_stand.jpg' },
  prop_belt:      { solves: ['heat', 'gas', 'humid', 'dust'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [800, 30000], loud: 1, corrosion: 1, image: 'belt_box.jpg' },
  blower_portable:{ solves: ['heat', 'stagnant', 'gas'], dirs: ['circ'], def: 'circ', area: [20, 3000], image: 'portable_orange.jpg' },
  blower_fixed:   { solves: ['dust', 'gas'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [200, 10000], loud: 1, image: 'blower_fixed.jpg' },
  blower_dust:    { solves: ['dust', 'gas'], dirs: ['exhaust'], def: 'exhaust', area: [200, 10000], loud: 1, image: 'blower_fixed.jpg' },
  blower_dry:     { solves: ['humid', 'heat'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [30, 2000], quiet: 1, image: 'sirocco.jpg' },
  hvls_ac:        { solves: ['heat', 'stagnant', 'humid'], dirs: ['circ'], def: 'circ', area: [400, 50000], quiet: 1, image: 'hvls_ac.jpg' },
  hvls_bldc:      { solves: ['heat', 'stagnant', 'humid'], dirs: ['circ'], def: 'circ', area: [400, 50000], quiet: 1, image: 'hvls_bldc.jpg' },
  diffuser:       { solves: ['stagnant'], dirs: ['intake', 'exhaust'], def: 'intake', area: [10, 3000], quiet: 1, image: 'diffuser.jpg' },
  hoodcap:        { solves: ['odor'], dirs: [], def: null, area: [1, 5000], corrosion: 1, image: 'hoodcap.jpg' },
  safety_net:     { solves: [], dirs: [], def: null, area: [50, 50000], image: 'safety_net.jpg' },
  'tfh-h80':        { solves: ['heat', 'humid'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [200, 5000], corrosion: 1, image: null },
  'tfp-g60-chimney':{ solves: ['heat', 'dust', 'gas'], dirs: ['exhaust'], def: 'exhaust', area: [300, 30000], corrosion: 1, image: 'chimney.jpg' },
  'tfu-g110':       { solves: [], dirs: ['circ'], def: 'circ', area: [500, 50000], image: null },
  'tff-f30':        { solves: ['stagnant', 'humid', 'heat'], dirs: ['circ'], def: 'circ', area: [50, 5000], quiet: 1, image: null },
  'tfm-g1000':      { solves: ['gas', 'heat', 'co2'], dirs: ['exhaust', 'intake'], def: 'exhaust', area: [1000, 20000], image: null },
  'tfz-e33':        { solves: ['stagnant', 'gas'], dirs: ['circ'], def: 'circ', area: [500, 20000], quiet: 1, image: 'jet.jpg' },
  'ec-module':      { solves: ['heat'], dirs: ['intake', 'exhaust'], def: 'intake', area: [30, 3000], quiet: 1, image: null },
  'tfd-g75':        { solves: ['heat', 'stagnant'], dirs: ['circ'], def: 'circ', area: [300, 20000], loud: 1, image: 'portable_blue.jpg' }
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
