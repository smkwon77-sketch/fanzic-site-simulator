/* 설치 과정: 6단계 타임라인 */
window.FZ = window.FZ || {};

(function () {
  const STEPS = [
    { key: 'survey', title: '위치 선정·현장 실측' },
    { key: 'open', title: '개구부·앵커·덕트 시공' },
    { key: 'bracket', title: '브라켓·프레임 고정' },
    { key: 'body', title: '본체 거치·체결' },
    { key: 'wire', title: '전원·제어 배선' },
    { key: 'test', title: '시운전·성능 확인' }
  ];
  // 설치 방식별 단계 설명
  const TEXT = {
    wall: [
      '급기구 반대편 벽에 배기 방향을 잡고, 외부 장애물·민원(소음) 방향을 확인합니다.',
      '프레임 치수보다 약 20mm 크게 벽체를 타공하고 슬리브(베이스 레일)를 설치합니다.',
      '앵글 프레임과 방진 패드를 앵커 볼트로 고정합니다.',
      '본체를 거치해 볼트로 체결하고, 외부에 셔터·안전망을 장착합니다.',
      '3Ø 380V 전원과 차단기, 온도·타이머 컨트롤러를 결선합니다.',
      '회전 방향과 셔터 개폐를 확인하고 진동·소음·전류를 점검합니다.'
    ],
    roof: [
      '지붕 트러스 하중과 상부 열기가 모이는 위치(용마루)를 확인합니다.',
      '지붕을 개구하고 방수 커브·플래싱을 시공합니다.',
      '베이스 프레임을 커브 위에 고정합니다.',
      '본체를 양중해 올리고 M8 플랜지 볼트로 체결합니다.',
      '방수 글랜드로 전원선을 인입하고 제어반에 연결합니다.',
      '시운전 후 우천 시 누수 여부를 점검합니다.'
    ],
    ceiling: [
      '보(빔) 위치와 하중, 바닥~날개 3m 이상, 스프링클러·조명 간섭을 확인합니다.',
      '빔 클램프 브라켓을 H빔에 고정합니다.',
      '익스텐션 튜브를 연결하고 4방향 안전 와이어(가이 와이어)를 설치합니다.',
      '모터를 거치하고 블레이드 6개를 장착해 토크 렌치로 체결합니다.',
      '인버터 컨트롤러와 벽부 조작반을 결선합니다.',
      '저속에서 고속까지 단계별로 돌려 흔들림·소음을 점검합니다.'
    ],
    duct: [
      '덕트 경로와 필요 정압(mmAq)을 계산해 팬 위치를 정합니다.',
      '천장 슬래브에 앵커를 박고 덕트 행거를 설치합니다.',
      '방진 행거 또는 받침대를 설치합니다.',
      '본체를 거치하고 플렉시블 캔버스로 덕트와 연결합니다.',
      '전원과 연동 신호(CO·화재 감지, 후드 스위치)를 결선합니다.',
      '풍량을 측정하고(TAB) 댐퍼로 균형을 맞춥니다.'
    ],
    hang: [
      '기류가 막히는 정체 구역과 배기구 방향을 확인합니다.',
      '천장 또는 구조물에 행거용 앵커를 설치합니다.',
      '행거 브라켓을 고정합니다.',
      '본체를 매달고 토출 방향을 배기구 쪽으로 맞춥니다.',
      '전원과 컨트롤러(타이머·센서 연동)를 결선합니다.',
      '기류 방향과 진동을 확인합니다.'
    ],
    ceilingSmall: [
      '천장 내 덕트 경로와 배치 간격을 확인합니다.',
      '천장재를 타공합니다.',
      '본체 고정 브라켓을 설치합니다.',
      '본체를 고정하고 그릴을 장착합니다.',
      '전원과 스위치·타이머를 연결합니다.',
      '작동음과 흡입을 확인합니다.'
    ],
    rack: [
      '항온항습기 팬월 위치와 냉복도·열복도 방향을 확인합니다.',
      '팬월 개구부를 정리합니다.',
      '랙 프레임을 고정합니다.',
      'EC 팬 모듈을 끼워 넣고 커넥터를 체결합니다.',
      '0-10V / RS485 제어선을 BMS와 연결합니다.',
      '회전수를 단계별로 바꾸며 풍량·전력을 확인합니다.'
    ],
    pole: [
      '서리가 모이는 저지대와 바람 방향을 확인합니다.',
      '콘크리트 기초를 타설합니다.',
      '폴 베이스를 앵커로 고정합니다.',
      '폴을 세우고 틸팅 헤드를 장착합니다.',
      '온도 센서 연동 자동 컨트롤러를 결선합니다.',
      '헤드 회전·각도를 확인합니다.'
    ],
    exterior: [
      '배기 덕트가 외벽으로 나가는 위치와 빗물 방향을 확인합니다.',
      '외벽을 덕트 지름에 맞춰 코어 타공합니다.',
      '덕트 슬리브를 넣고 실리콘으로 기밀 처리합니다.',
      '후드캡을 끼우고 스크루로 고정합니다.',
      '전원 연결은 필요 없으며 연결 덕트를 점검합니다.',
      '역류 방지 댐퍼 작동과 누수 여부를 확인합니다.'
    ],
    floor: [
      '열원 주변 작업자 위치와 바람이 닿을 거리를 확인합니다.',
      '바닥 고정 위치를 표시합니다.',
      '캐스터를 잠그거나 바닥에 고정합니다.',
      '본체를 거치하고 토출 각도를 맞춥니다.',
      '전원을 연결합니다.',
      '작업자 위치 풍속을 측정합니다.'
    ]
  };
  const MOUNT_LABEL = { wall: '벽 관통형', roof: '지붕형', ceiling: '천장 매달기형', duct: '덕트 연결형', hang: '행거형', ceilingSmall: '천장 매립형', rack: '팬월(랙)형', pole: '폴 설치형', floor: '바닥 설치형', exterior: '외벽 마감형', none: '부속(별도 설치 없음)' };

  // 원점에 놓인 그룹(자식이 절대 좌표)은 크기 애니메이션 없이 표시만
  function grow(o, e) { o.scale.setScalar(o.position.lengthSq() < 1e-6 ? 1 : Math.max(0.01, e)); }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

  const I = { STEPS, TEXT, MOUNT_LABEL };

  // step: 0~5, k: 단계 내 진행률(0~1). step === 6 이면 완료 상태
  I.apply = function (groups, step, k, time) {
    groups.forEach((g, idx) => {
      const stagger = Math.min(0.5, idx * 0.04);
      const kk = Math.max(0, Math.min(1, (k - stagger) / Math.max(0.3, 1 - stagger)));
      const e = easeOut(kk);
      g.marker.visible = step <= 1 || step === 0;
      if (g.marker.visible) { const s = 1 + 0.15 * Math.sin(time * 4 + idx); g.marker.scale.setScalar(s); g.marker.material.opacity = step === 0 ? 0.9 * e : 0.4; }
      const covered = (g.pl.mount === 'wall' || g.pl.mount === 'rack') && step >= 3; // 본체가 개구부를 덮음
      g.opening.visible = step >= 1 && !covered;
      grow(g.opening, step === 1 ? e : 1);
      g.bracket.visible = step >= 2;
      grow(g.bracket, step === 2 ? e : 1);
      g.body.visible = step >= 3;
      if (step === 3) {
        const off = (1 - e) * 4;
        g.body.position.copy(g.pl.pos);
        if (g.pl.mount === 'wall' || g.pl.mount === 'rack') g.body.position.addScaledVector(g.pl.dir, off);
        else if (g.pl.mount === 'duct' || g.pl.mount === 'hang' || g.pl.mount === 'floor') g.body.position.y -= off * 0.6;
        else g.body.position.y += off;
      } else g.body.position.copy(g.pl.pos);
      g.cable.visible = step >= 4;
      const tot = g.cable.userData.total;
      g.cable.geometry.setDrawRange(0, step === 4 ? Math.floor(tot * e / 3) * 3 : (step > 4 ? tot : 0));
    });
  };

  FZ.install = I;
})();
