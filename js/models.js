/* 3D 모델: 팬(프로시저럴), 건물 셸, 내부 소품, 제품 배치 */
window.FZ = window.FZ || {};

(function () {
  const T = THREE;
  const M = {};
  const mat = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...o });
  const MAT = {
    metal: mat(0xc9d1da, { metalness: 0.75, roughness: 0.3 }),
    steel: mat(0x8d99a6, { metalness: 0.6, roughness: 0.4 }),
    dark: mat(0x252d38, { roughness: 0.7 }),
    navy: mat(0x14457f, { metalness: 0.3, roughness: 0.45 }),
    red: mat(0xe31e24, { roughness: 0.5 }),
    blade: mat(0xdfe5eb, { metalness: 0.8, roughness: 0.25, side: T.DoubleSide }),
    bladeDark: mat(0x3a434f, { metalness: 0.4, roughness: 0.45, side: T.DoubleSide }),
    hvlsBlade: mat(0xe8ecf0, { metalness: 0.5, roughness: 0.3 }),
    yellow: mat(0xf2b632, { roughness: 0.5 }),
    concrete: mat(0x9aa2ab, { roughness: 0.9 }),
    floor: mat(0xcfd6de, { roughness: 0.95 }),
    rubber: mat(0x1a1e24, { roughness: 0.9 })
  };
  M.MAT = MAT;
  const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, seg = 24, open = false) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), m);

  /* ---------- 팬 부품 ---------- */
  // 날개 묶음: 축 = 로컬 z
  function rotorZ(n, r, w, m, pitch = 0.45, hubR = 0.12) {
    const g = new T.Group();
    for (let i = 0; i < n; i++) {
      const arm = new T.Group();
      const b = box(w, r * 0.82, 0.015, m);
      b.position.y = r * 0.5;
      b.rotation.y = pitch;
      arm.add(b);
      arm.rotation.z = (i / n) * Math.PI * 2;
      g.add(arm);
    }
    const hub = cyl(r * hubR * 1.6, r * hubR * 1.6, r * 0.18, MAT.steel, 20);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    return g;
  }
  function ringZ(r, tube, m) {
    const t = new T.Mesh(new T.TorusGeometry(r, tube, 8, 40), m);
    return t;
  }
  function squareFrame(s, hole, depth, m) {
    const g = new T.Group();
    const b = (s - hole) / 2;
    const top = box(s, b, depth, m); top.position.y = (s - b) / 2; g.add(top);
    const bot = top.clone(); bot.position.y = -(s - b) / 2; g.add(bot);
    const l = box(b, hole, depth, m); l.position.x = -(s - b) / 2; g.add(l);
    const rr = l.clone(); rr.position.x = (s - b) / 2; g.add(rr);
    return g;
  }

  /* ---------- 실물 사진 기반 팬 형상 도우미 ---------- */
  // 스튜디오 반사 환경(큐브맵): 앱 장면에 환경광이 없어도 금속 재질이 실물처럼 반짝이게
  const ENV = (function () {
    const S = 128, faces = [];
    for (let f = 0; f < 6; f++) {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const x = c.getContext('2d');
      if (f === 2) { // 위: 밝은 천장 + 소프트박스
        x.fillStyle = '#dfe4ea'; x.fillRect(0, 0, S, S);
        const gr = x.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S * 0.55); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, S, S);
      } else if (f === 3) { // 아래: 회색 바닥
        x.fillStyle = '#7d858e'; x.fillRect(0, 0, S, S);
      } else { // 옆: 위 밝고 아래 어두운 벽 + 세로 반사띠
        const gr = x.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#f7f9fb'); gr.addColorStop(0.5, '#c9d0d8'); gr.addColorStop(0.56, '#8f97a1'); gr.addColorStop(1, '#6f7680');
        x.fillStyle = gr; x.fillRect(0, 0, S, S);
        if (f === 0 || f === 5 || f === 4) { const sx = f === 4 ? S * 0.15 : S * 0.55; const g2 = x.createLinearGradient(sx, 0, sx + S * 0.3, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g2; x.fillRect(sx, S * 0.05, S * 0.3, S * 0.5); }
      }
      faces.push(c);
    }
    const t = new T.CubeTexture(faces); t.needsUpdate = true; return t;
  })();
  // 용융아연도금 스팽글 무늬 (EC 팬 모델과 같은 방식)
  function spangle(base, n, rep) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const px = rnd() * 256, py = rnd() * 256, r = 2 + rnd() * 7, v = 222 + Math.floor(rnd() * 30);
      x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath();
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rnd(); x.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r); }
      x.fill();
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); return t;
  }
  const PI = Math.PI, TAU = Math.PI * 2;
  const DS = T.DoubleSide;
  const fmat = (color, metal, rough, o = {}) => new T.MeshStandardMaterial({ color, metalness: metal, roughness: rough, envMap: ENV, envMapIntensity: o.env == null ? 1 : o.env, side: o.single ? T.FrontSide : DS, ...(o.map ? { map: o.map } : {}) });
  const GALV = spangle('#d4d7da', 900, 3);
  const FC = {
    galv: fmat(0xd6dade, 0.6, 0.34),        // 아연도 강판
    galvLight: fmat(0xe8ebee, 0.45, 0.4),
    wire: fmat(0xc2c8ce, 0.85, 0.3),
    alu: fmat(0xe4e8ec, 0.85, 0.26),                          // 알루미늄 날개
    graphite: fmat(0x3a4047, 0.55, 0.4),
    black: fmat(0x1c1f23, 0.3, 0.5, { env: 0.5 }),
    shade: fmat(0x22272e, 0.2, 0.85, { env: 0.2 }),           // 안쪽 그늘
    sage: fmat(0x87938a, 0.4, 0.45, { env: 0.65 }),           // 회녹색 도장
    sageLight: fmat(0xb4bfb4, 0.3, 0.45, { env: 0.6 }),
    frp: fmat(0x8c9e85, 0.1, 0.4, { env: 0.45 }),            // 연녹색 벨마우스
    panel: fmat(0xe9ecef, 0.45, 0.32),
    white: fmat(0xf1f2f3, 0.05, 0.4, { env: 0.45 }),
    cream: fmat(0xf0efe9, 0.05, 0.55, { env: 0.3 }),
    teal: fmat(0x14a1ab, 0.3, 0.38, { env: 0.6 }),
    orange: fmat(0xf2551f, 0.25, 0.38, { env: 0.6 }),
    blue: fmat(0x1d47b4, 0.35, 0.36, { env: 0.6 }),
    red: fmat(0xd7262b, 0.2, 0.42, { env: 0.5 }),
    inletRed: fmat(0xe8603a, 0.2, 0.45, { env: 0.5 }),
    yellow: fmat(0xecc23a, 0.2, 0.45, { env: 0.5 }),
    motorBlue: fmat(0x2f5fc0, 0.4, 0.38, { env: 0.6 }),
    brown: fmat(0x5c4943, 0.45, 0.45, { env: 0.7 }),
    sus: fmat(0xeef1f4, 0.95, 0.12),
    tan: fmat(0xc8b682, 0.35, 0.42, { env: 0.6 }),
    pipeBlade: fmat(0xe2e5e8, 0.05, 0.4, { env: 0.45 }),
    navy: fmat(0x34388a, 0.25, 0.42, { env: 0.7 }),             // EC 팬 남보라 장착판
    ecHub: fmat(0x3341d6, 0.55, 0.32)
  };
  const along = m => { m.rotation.x = PI / 2; return m; };                  // y축 형상 → z축
  const tubeZ = (rFront, rBack, len, m, seg = 40, open = true) => along(cyl(rFront, rBack, len, m, seg, open));
  function latheZ(pts, m, seg = 48) { // pts: [반지름, z]
    const mesh = new T.Mesh(new T.LatheGeometry(pts.map(([r, z]) => new T.Vector2(r, z)), seg), m);
    mesh.rotation.x = PI / 2; return mesh;
  }
  function torusZ(r, t, m, z = 0) { const o = new T.Mesh(new T.TorusGeometry(r, t, 6, 56), m); o.position.z = z; return o; }
  function discZ(r, m, z = 0, seg = 40) { const o = new T.Mesh(new T.CircleGeometry(r, seg), m); o.position.z = z; return o; }
  function tubeBetween(a, b, rad, m) {
    const d = new T.Vector3().subVectors(b, a), L = d.length();
    const o = cyl(rad, rad, L, m, 10);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  // 날개 모양(뿌리 r0 → 끝 r1, 반경 방향 = +y), sweep 은 끝단을 옆으로 휘게
  function bladeGeo(r0, r1, w0, w1, sweep = 0) {
    const sh = new T.Shape(), mid = (r0 + r1) / 2;
    sh.moveTo(-w0 / 2, r0);
    sh.quadraticCurveTo(-w1 / 2 + sweep * 0.4, mid, -w1 / 2 + sweep, r1 - w1 * 0.3);
    sh.quadraticCurveTo(sweep - w1 * 0.1, r1 + w1 * 0.15, w1 / 2 + sweep, r1 - w1 * 0.18);
    sh.quadraticCurveTo(w1 / 2 + sweep * 0.6, mid, w0 / 2, r0);
    sh.lineTo(-w0 / 2, r0);
    return new T.ShapeGeometry(sh, 8);
  }
  // 노(패들)형 날개: 좁은 목 → 넓은 직사각형 → 둥근 끝 (판형 고압팬 4엽)
  function paddleGeo(r0, r1, wn, w) {
    const sh = new T.Shape(), rn = r0 + (r1 - r0) * 0.28, c = w * 0.3;
    sh.moveTo(-wn / 2, r0); sh.lineTo(-wn / 2, rn - w * 0.15); sh.quadraticCurveTo(-w / 2, rn - w * 0.05, -w / 2, rn + w * 0.1);
    sh.lineTo(-w / 2, r1 - c); sh.quadraticCurveTo(-w / 2, r1, -w / 2 + c, r1); sh.lineTo(w / 2 - c, r1); sh.quadraticCurveTo(w / 2, r1, w / 2, r1 - c);
    sh.lineTo(w / 2, rn + w * 0.1); sh.quadraticCurveTo(w / 2, rn - w * 0.05, wn / 2, rn - w * 0.15); sh.lineTo(wn / 2, r0); sh.lineTo(-wn / 2, r0);
    return new T.ShapeGeometry(sh, 6);
  }
  // 회전 날개 묶음 (축 = 로컬 z)
  function blades(o) {
    const g = new T.Group();
    const geo = o.paddle ? paddleGeo(o.r0, o.r1, o.w0, o.w1) : bladeGeo(o.r0, o.r1, o.w0, o.w1, o.sweep || 0);
    for (let i = 0; i < o.n; i++) {
      const b = new T.Mesh(geo, o.m); b.rotation.y = o.pitch == null ? 0.45 : o.pitch;
      const arm = new T.Group(); arm.add(b); arm.rotation.z = i / o.n * TAU; g.add(arm);
    }
    if (o.hubR) {
      const hl = o.hubLen || o.hubR * 0.8;
      g.add(tubeZ(o.hubR, o.hubR, hl, o.hubMat || FC.galv, 28, false));
      if (o.cap) {
        const c = new T.Mesh(new T.SphereGeometry(o.hubR, 24, 10, 0, TAU, 0, PI / 2), o.capMat || o.hubMat || FC.galv);
        c.rotation.x = PI / 2; c.position.z = hl / 2; c.scale.y = o.cap; g.add(c);
      }
    }
    return g;
  }
  // 동심원 가드 망 (xy 평면)
  function guard(r, nRing, nSpoke, m, t, r0 = 0) {
    const g = new T.Group();
    for (let i = 1; i <= nRing; i++) g.add(new T.Mesh(new T.TorusGeometry(r0 + (r - r0) * i / nRing, t, 4, 56), m));
    for (let i = 0; i < nSpoke; i++) { const b = box(t * 2, r - r0, t * 2, m); b.position.y = (r + r0) / 2; const a = new T.Group(); a.add(b); a.rotation.z = i / nSpoke * TAU; g.add(a); }
    return g;
  }
  // 사각 격자 망 (xy 평면)
  function grid(w, h, nx, ny, m, t) {
    const g = new T.Group();
    for (let i = 0; i <= nx; i++) { const b = box(t, h, t, m); b.position.x = -w / 2 + w * i / nx; g.add(b); }
    for (let j = 0; j <= ny; j++) { const b = box(w, t, t, m); b.position.y = -h / 2 + h * j / ny; g.add(b); }
    return g;
  }
  // 구멍 뚫린 판 (xy 평면, 두께 = z), holes: [{x, y, r}] 또는 [{x, y, w, h}]
  function plate(w, h, holes, depth, m, corner = 0) {
    const sh = new T.Shape(), c = corner;
    sh.moveTo(-w / 2 + c, -h / 2); sh.lineTo(w / 2 - c, -h / 2); if (c) sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + c);
    sh.lineTo(w / 2, h / 2 - c); if (c) sh.quadraticCurveTo(w / 2, h / 2, w / 2 - c, h / 2);
    sh.lineTo(-w / 2 + c, h / 2); if (c) sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - c);
    sh.lineTo(-w / 2, -h / 2 + c); if (c) sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + c, -h / 2);
    (holes || []).forEach(q => {
      const p = new T.Path();
      if (q.r) p.absarc(q.x || 0, q.y || 0, q.r, 0, TAU, true);
      else { const x = q.x || 0, y = q.y || 0; p.moveTo(x - q.w / 2, y - q.h / 2); p.lineTo(x - q.w / 2, y + q.h / 2); p.lineTo(x + q.w / 2, y + q.h / 2); p.lineTo(x + q.w / 2, y - q.h / 2); p.lineTo(x - q.w / 2, y - q.h / 2); }
      sh.holes.push(p);
    });
    const geo = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 40 });
    geo.translate(0, 0, -depth / 2);
    return new T.Mesh(geo, m);
  }
  // 상자 모서리 프레임 12개
  function edgeFrame(w, h, d, t, m) {
    const g = new T.Group();
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => {
      const x = box(w + t, t, t, m); x.position.set(0, a * h / 2, b * d / 2); g.add(x);
      const y = box(t, h, t, m); y.position.set(a * w / 2, 0, b * d / 2); g.add(y);
      const z = box(t, t, d, m); z.position.set(a * w / 2, b * h / 2, 0); g.add(z);
    });
    return g;
  }
  // 회전축이 z가 아닌 날개: app 이 rotor.rotation.z 를 돌리면 대상의 지정 축을 따라 돌림 (다음 프레임 반영)
  function spinLink(target, ax) {
    const p = new T.Object3D();
    const sync = () => { target.rotation[ax] = p.rotation.z; };
    target.traverse(o => { if (o.isMesh) o.onBeforeRender = sync; });
    return p;
  }
  // 시로코 스크롤 하우징: 축 = 로컬 x, 토출구 = 위쪽에서 +z 방향, 흡입구(hole) 는 x 방향으로 관통
  function scrollX(R0, R1, outLen, holeR, w, m) {
    const sh = new T.Shape(), N = 56;
    sh.moveTo(0, R0);
    for (let i = 1; i <= N; i++) { const th = i / N * TAU, r = R0 + (R1 - R0) * i / N; sh.lineTo(r * Math.sin(th), r * Math.cos(th)); }
    sh.lineTo(outLen, R1); sh.lineTo(outLen, R0); sh.lineTo(0, R0);
    if (holeR) { const h = new T.Path(); h.absarc(0, 0, holeR, 0, TAU, true); sh.holes.push(h); }
    const geo = new T.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false, curveSegments: 40 });
    geo.translate(0, 0, -w / 2);
    geo.rotateY(-PI / 2);
    return new T.Mesh(geo, m);
  }
  // 드럼형(다익) 임펠러: 축 = 로컬 z
  function drum(r, len, n, m, ringM) {
    const g = new T.Group();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, b = box(r * 0.16, 0.006 + r * 0.02, len, m);
      b.position.set(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, 0); b.rotation.z = a + 0.9; g.add(b);
    }
    [-1, 1].forEach(k => g.add(torusZ(r, r * 0.04, ringM || m, k * len / 2)));
    g.add(discZ(r * 0.95, FC.shade, 0));
    return g;
  }
  // 후향(터보) 임펠러: 축 = 로컬 z, 앞쪽(+z) 이 흡입 쪽 슈라우드
  function backward(r, n, m, backM) {
    const g = new T.Group();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, b = box(r * 0.5, r * 0.02 + 0.004, r * 0.26, m);
      b.position.set(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, 0); b.rotation.z = a - 0.75; g.add(b);
    }
    g.add(torusZ(r * 0.93, r * 0.05, m, r * 0.16));
    const bp = discZ(r, backM || FC.shade, -r * 0.17); bp.rotation.y = PI; g.add(bp);
    g.add(discZ(r, backM || FC.shade, -r * 0.17));
    return g;
  }

  /* ---------- 판금 스크롤(벌류트) 하우징 도우미: 축 = 로컬 x, 토출 = +z (위쪽 접선) ---------- */
  // 단면(z = u, y = v) 외곽점: 혀(cutoff) → 나선 → 위쪽 끝 → 토출구 앞 위 → 토출구 앞 아래
  function voluteOutline(R0, R1, outLen, th0 = 0.38) {
    const N = 64, P = [];
    for (let i = 0; i <= N; i++) { const th = th0 + (TAU - th0) * i / N, r = R0 + (R1 - R0) * (th / TAU); P.push([r * Math.sin(th), r * Math.cos(th)]); }
    const yc = P[0][1];
    return { spiral: P, yc, mouth: [[outLen, R1], [outLen, yc]] };
  }
  // 단면 외곽선을 따라 x 방향으로 늘린 얇은 판(열린 띠)
  function ribbonX(pts, w, m) {
    const pos = [], idx = [];
    pts.forEach(([u, v], i) => { pos.push(-w / 2, v, u, w / 2, v, u); if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return new T.Mesh(g, m);
  }
  // 단면 모양 그대로의 측판 (x = 0 기준, 두께 t, +x 쪽으로)
  function sideShapeX(outline, holes, t, m) {
    const sh = new T.Shape(); sh.moveTo(outline.mouth[1][0], outline.mouth[1][1]);
    outline.spiral.forEach(([u, v]) => sh.lineTo(u, v)); sh.lineTo(outline.mouth[0][0], outline.mouth[0][1]); sh.lineTo(outline.mouth[1][0], outline.mouth[1][1]);
    (holes || []).forEach(h => { const p = new T.Path(); p.absarc(h.u || 0, h.v || 0, h.r, 0, TAU, true); sh.holes.push(p); });
    const geo = new T.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 48 });
    geo.rotateY(-PI / 2); // 모양 x(u) → z, 두께 → -x
    geo.translate(t, 0, 0);
    return new T.Mesh(geo, m);
  }
  // 사각 판(yz 평면, x 두께) + 구멍, 테두리 꺾임
  function rectPlateX(z0, z1, y0, y1, holes, t, m, lip) {
    const sh = new T.Shape(); sh.moveTo(z0, y0); sh.lineTo(z1, y0); sh.lineTo(z1, y1); sh.lineTo(z0, y1); sh.lineTo(z0, y0);
    (holes || []).forEach(h => { const p = new T.Path(); p.absarc(h.u, h.v, h.r, 0, TAU, true); sh.holes.push(p); });
    const geo = new T.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 48 });
    geo.rotateY(-PI / 2); geo.translate(t / 2, 0, 0);
    const g = new T.Group(); g.add(new T.Mesh(geo, m));
    if (lip) { // 네 변을 안쪽(-x 또는 +x)으로 꺾은 립
      const L = lip, zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
      [[zc, y0, z1 - z0, t], [zc, y1, z1 - z0, t]].forEach(([z, y, d]) => { const b = box(Math.abs(L), t, d, m); b.position.set(-L / 2, y, z); g.add(b); });
      [[z0], [z1]].forEach(([z]) => { const b = box(Math.abs(L), y1 - y0, t, m); b.position.set(-L / 2, yc, z); g.add(b); });
    }
    return g;
  }
  // 볼트 머리 여러 개 (x 방향을 향함)
  function boltsX(list, r, m, x) { const g = new T.Group(); list.forEach(([z, y]) => { const b = cyl(r, r, r * 0.8, m, 6); b.rotation.z = PI / 2; b.position.set(x, y, z); g.add(b); }); return g; }
  // 전향 다익(시로코) 드럼 임펠러: 축 = 로컬 z, 길이 len, 반지름 r
  function sirocoDrum(r, len, n, m, ringM, backM) {
    const g = new T.Group();
    const bg = new T.CylinderGeometry(r * 0.16, r * 0.16, len * 0.96, 5, 1, true, 0, 1.7); // 얇은 곡면 날개 1장
    for (let i = 0; i < n; i++) { const b = new T.Mesh(bg, m); b.rotation.x = PI / 2; b.position.set(r * 0.86, 0, 0); const a = new T.Group(); a.add(b); a.rotation.z = i / n * TAU; g.add(a); }
    [-1, 1].forEach(k => g.add(torusZ(r * 0.98, r * 0.035, ringM || m, k * len * 0.49)));
    const bp = discZ(r * 0.95, backM || FC.shade, 0); g.add(bp);
    const bp2 = discZ(r * 0.95, backM || FC.shade, 0); bp2.rotation.y = PI; g.add(bp2);
    const hub = tubeZ(r * 0.22, r * 0.22, len * 0.3, FC.galv, 20, false); g.add(hub);
    return g;
  }
  /* EC 플러그팬 (쇼룸 FE-B400FT 실물 기준, fanzic-ecfan/fe-model.js 형상을 r128 로 옮김)
     원본은 장착판 폭 1, 흡입 = +z. 여기서는 뒤집어서 흡입 = -z, 모터·토출 쪽 = +z */
  function ecPlugFan() {
    const g = new T.Group(), V = (x, y, z) => new T.Vector3(x, y, z);
    const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
    const lathe = (pts, seg = 96) => new T.LatheGeometry(pts.map(([r, z]) => new T.Vector2(r, z)), seg).rotateX(PI / 2);
    const disc = (r, h, seg = 64) => new T.CylinderGeometry(r, r, h, seg).rotateX(PI / 2);
    const steel = FC.sus, alu = FC.alu, black = FC.black, cast = fmat(0xd2d5d9, 0.8, 0.38);
    const galvEC = fmat(0xb4b9bd, 0.6, 0.55, { map: GALV });
    const R_OD = 0.355, R_IN = 0.1, Z_BACK = -0.457, NB = 7;
    const SHROUD = [[0.236, -0.112], [0.25, -0.128], [0.275, -0.152], [0.305, -0.18], [0.333, -0.206], [0.355, -0.228]];
    const shroudZ = r => { for (let i = 1; i < SHROUD.length; i++) { const [r0, z0] = SHROUD[i - 1], [r1, z1] = SHROUD[i]; if (r <= r1) return z0 + (z1 - z0) * Math.max(0, (r - r0) / (r1 - r0)); } return SHROUD[SHROUD.length - 1][1]; };
    // 장착판(네 변 꺾임) + 너트
    const H = 0.5, Tt = 0.006, LIP = 0.05;
    const ps = new T.Shape(); ps.moveTo(-H, -H); ps.lineTo(H, -H); ps.lineTo(H, H); ps.lineTo(-H, H); ps.lineTo(-H, -H);
    const hole = (x, y, r) => { const p = new T.Path(); p.absarc(x, y, r, 0, TAU, true); ps.holes.push(p); };
    hole(0, 0, 0.292); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => hole(a * 0.446, b * 0.446, 0.011));
    add(new T.ExtrudeGeometry(ps, { depth: Tt, bevelEnabled: false, curveSegments: 64 }), FC.navy, 0, 0, -Tt);
    add(new T.BoxGeometry(1, Tt, LIP), FC.navy, 0, H - Tt / 2, -LIP / 2); add(new T.BoxGeometry(1, Tt, LIP), FC.navy, 0, -H + Tt / 2, -LIP / 2);
    add(new T.BoxGeometry(Tt, 1, LIP), FC.navy, H - Tt / 2, 0, -LIP / 2); add(new T.BoxGeometry(Tt, 1, LIP), FC.navy, -H + Tt / 2, 0, -LIP / 2);
    const nut = new T.CylinderGeometry(0.018, 0.018, 0.013, 6).rotateX(PI / 2);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { add(disc(0.024, 0.003, 24), steel, a * 0.365, b * 0.365, 0.0015); add(nut, steel, a * 0.365, b * 0.365, 0.0095).rotation.z = 0.3; });
    // 인렛 링(아연도) + 둥근 머리 볼트 8개
    add(lathe([[0.229, -0.135], [0.229, -0.075], [0.232, -0.045], [0.242, -0.018], [0.26, 0.002], [0.288, 0.015], [0.325, 0.021], [0.36, 0.018], [0.42, 0.013]]), galvEC);
    add(new T.TorusGeometry(0.42, 0.003, 6, 96), galvEC, 0, 0, 0.011);
    for (let i = 0; i < 8; i++) { const a = PI / 2 + i * PI / 4; add(new T.SphereGeometry(0.0085, 12, 6, 0, TAU, 0, PI / 2).rotateX(PI / 2), steel, Math.cos(a) * 0.395, Math.sin(a) * 0.395, 0.015); }
    // 로터: 슈라우드 + 후향익 7장 + 스피닝 뒷판 + 허브 콘 + 파란 허브
    const rotor = new T.Group(); g.add(rotor);
    add(lathe([[0.236, -0.098], ...SHROUD]), alu, 0, 0, 0, rotor);
    add(disc(R_OD, 0.006, 96), fmat(0xe9ecef, 0.6, 0.35), 0, 0, Z_BACK - 0.003, rotor);
    add(lathe([[0.2, Z_BACK + 0.001], [0.16, Z_BACK + 0.022], [0.115, Z_BACK + 0.05], [0.09, Z_BACK + 0.068], [0.088, Z_BACK + 0.075]], 64), alu, 0, 0, 0, rotor);
    for (let i = 0; i < NB; i++) {
      const a0 = i / NB * TAU, SW = 0.62, NU = 18, pos = [], idx = [];
      const p0 = [R_IN * Math.cos(a0), R_IN * Math.sin(a0)], p1 = [R_OD * Math.cos(a0 + SW), R_OD * Math.sin(a0 + SW)];
      for (let k = 0; k <= NU; k++) {
        const u = k / NU, x = p0[0] + (p1[0] - p0[0]) * u, y = p0[1] + (p1[1] - p0[1]) * u, rr = Math.hypot(x, y);
        const tt = Math.max(0, (0.236 - rr) / (0.236 - R_IN));
        const zf = rr >= 0.236 ? shroudZ(rr) - 0.002 : -0.112 - 0.27 * Math.pow(tt, 1.7);
        pos.push(x, y, zf, x, y, Z_BACK);
        if (k) { const q = (k - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      }
      const bgeo = new T.BufferGeometry(); bgeo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); bgeo.setIndex(idx); bgeo.computeVertexNormals();
      rotor.add(new T.Mesh(bgeo, alu));
      [shroudZ(R_OD) - 0.02, Z_BACK + 0.018].forEach(z => { const w = cyl(0.0045, 0.0045, 0.03, alu, 8); w.position.set(p1[0] * 0.985, p1[1] * 0.985, z); rotor.add(w); });
    }
    const ZH = Z_BACK + 0.075;
    add(disc(0.08, 0.06, 48), FC.ecHub, 0, 0, ZH + 0.03, rotor);
    add(new T.TorusGeometry(0.077, 0.004, 6, 48), FC.ecHub, 0, 0, ZH + 0.012, rotor);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; add(disc(0.0075, 0.004, 12), black, Math.cos(a) * 0.056, Math.sin(a) * 0.056, ZH + 0.0605, rotor); }
    // 모터(고정부): 검은 마운트판 + 은색 다이캐스트 모터 + 방열 리브·핀
    const ms = new T.Shape(), mw = 0.2, mh = 0.185, ch = 0.045;
    ms.moveTo(-mw + ch, -mh); ms.lineTo(mw - ch, -mh); ms.lineTo(mw, -mh + ch); ms.lineTo(mw, mh - ch); ms.lineTo(mw - ch, mh); ms.lineTo(-mw + ch, mh); ms.lineTo(-mw, mh - ch); ms.lineTo(-mw, -mh + ch); ms.lineTo(-mw + ch, -mh);
    const ZM = Z_BACK - 0.022, ZC = ZM - 0.01;
    add(new T.ExtrudeGeometry(ms, { depth: 0.01, bevelEnabled: false }), black, 0, 0, ZM - 0.01);
    add(disc(0.148, 0.062, 64), cast, 0, 0, ZC - 0.031);
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; if (Math.sin(a) > 0.55) continue; const r = add(new T.BoxGeometry(0.02, 0.014, 0.05), cast, Math.cos(a) * 0.149, Math.sin(a) * 0.149, ZC - 0.04); r.rotation.z = a; }
    add(new T.TorusGeometry(0.118, 0.006, 6, 64), cast, 0, 0, ZC - 0.064);
    add(disc(0.112, 0.012, 64), cast, 0, 0, ZC - 0.068);
    for (let i = 0; i < 6; i++) add(new T.BoxGeometry(0.014, 0.1, 0.1), cast, -0.06 + i * 0.024, 0.088, ZC - 0.06);
    add(new T.BoxGeometry(0.13, 0.033, 0.012), black, 0, -0.138, ZC - 0.05);
    [-0.016, 0.016].forEach((dx, i) => {
      const c = new T.CatmullRomCurve3([V(dx, -0.152, ZC - 0.045), V(dx, -0.2, ZC - 0.06), V(0.08 + i * 0.03, -0.3, ZC - 0.1), V(0.3 + i * 0.03, -0.36, ZC - 0.12), V(0.42 + i * 0.03, -0.37, -0.25)]);
      add(new T.TubeGeometry(c, 32, 0.007, 8, false), black);
    });
    // 지지 파이프(검정 유광): 판 네 귀 너트에서 뒤로 → 안쪽으로 꺾여 모터 마운트판 옆
    const tube = fmat(0x0e0f12, 0.3, 0.25, { env: 1.2 });
    [-1, 1].forEach(a => {
      const zR = ZM - 0.03;
      const c = new T.CatmullRomCurve3([V(a * 0.365, 0.365, -0.006), V(a * 0.365, 0.365, -0.2), V(a * 0.36, 0.36, zR + 0.06), V(a * 0.33, 0.31, zR), V(a * 0.24, 0.17, zR), V(a * 0.226, 0.06, zR), V(a * 0.226, -0.06, zR), V(a * 0.24, -0.17, zR), V(a * 0.33, -0.31, zR), V(a * 0.36, -0.36, zR + 0.06), V(a * 0.365, -0.365, -0.2), V(a * 0.365, -0.365, -0.006)], false, 'catmullrom', 0.2);
      add(new T.TubeGeometry(c, 120, 0.0125, 10, false), tube);
      add(new T.BoxGeometry(0.03, 0.2, 0.014), black, a * 0.212, 0, zR + 0.004);
    });
    return { g, rotor };
  }

  /* 철망·타공판 투명 무늬 텍스처 (alphaTest 로 구멍 표현) */
  const TEXC = {};
  function meshTex(kind) {
    if (TEXC[kind]) return TEXC[kind];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    if (kind === 'diamond') { // 확장 철망(마름모)
      x.strokeStyle = '#ffffff'; x.lineWidth = 9;
      for (let i = -128; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 128); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 128); x.stroke(); }
    } else { // 사각 타공
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.clearRect(i * 32 + 7, j * 32 + 7, 18, 18);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    return (TEXC[kind] = t);
  }
  function meshPanel(w, h, kind, color, rep, circle) {
    const t = meshTex(kind).clone(); t.needsUpdate = true; t.repeat.set(w * rep, h * rep);
    const m = new T.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.35, envMap: ENV, alphaMap: t, alphaTest: 0.5, side: DS });
    return new T.Mesh(circle ? new T.CircleGeometry(circle, 48) : new T.PlaneGeometry(w, h), m);
  }
  // 제어기 앞판 등 그림 텍스처
  function panelTex(draw, w = 256, h = 384) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return new T.CanvasTexture(c);
  }

  /* 판형 고압팬(정사각 판 + 원형 벤투리 + 날개 + 뒤쪽 가드 망). 토출 = +z */
  function propFan(s, o) {
    const g = new T.Group(), R = s * 0.43;
    g.add(plate(s, s, [{ r: R + s * 0.02 }], s * 0.016, o.plate, s * 0.03));
    g.add(latheZ([[R + s * 0.045, s * 0.008], [R + s * 0.02, -s * 0.004], [R + s * 0.006, -s * 0.03], [R + s * 0.006, -s * 0.11]], o.plate));
    g.add(torusZ(R + s * 0.03, s * 0.009, o.plate, s * 0.01));
    // 모서리 보강 엠보싱 + 볼트
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      const e = new T.Mesh(new T.CylinderGeometry(s * 0.075, s * 0.075, s * 0.012, 3), o.plate);
      e.rotation.x = PI / 2; e.rotation.y = Math.atan2(b, a) + PI; e.position.set(a * s * 0.43, b * s * 0.43, s * 0.012); g.add(e);
      const bo = cyl(s * 0.01, s * 0.01, s * 0.02, FC.black, 8); bo.rotation.x = PI / 2; bo.position.set(a * s * 0.465, b * s * 0.465, s * 0.01); g.add(bo);
    });
    const rot = blades({ n: o.n, r0: s * 0.07, r1: R * 0.97, w0: o.paddle ? s * 0.05 : s * 0.07, w1: o.w1 || R * 0.62, sweep: o.sweep || 0, pitch: o.pitch || 0.38, paddle: o.paddle, m: o.blade, hubR: s * 0.055, hubLen: s * 0.05, hubMat: FC.galv, cap: 0.6 });
    rot.position.z = -s * 0.045; g.add(rot);
    // 모터 + X자 지지대 + 뒤쪽 가드
    const mot = tubeZ(s * 0.085, s * 0.085, s * 0.13, o.motor || FC.galv, 24, false); mot.position.z = -s * 0.14; g.add(mot);
    [PI / 4, -PI / 4].forEach(a => { const bar = box(s * 0.008, s * 1.12, s * 0.008, FC.wire); bar.rotation.z = a; bar.position.z = s * 0.02; g.add(bar); }); // 앞쪽 X 와이어
    const gd = guard(R * 0.98, 6, 8, FC.wire, s * 0.0035); gd.position.z = -s * 0.2; g.add(gd);
    return { g, rot };
  }
  // 이동식 축류 송풍기 드럼(원통 + 앞뒤 가드 + 빨간 배지). 토출 = +z
  function axialDrum(s, m, len) {
    const g = new T.Group(), r = s * 0.5;
    g.add(tubeZ(r, r, len, m, 48));
    [-1, 1].forEach(k => g.add(torusZ(r, s * 0.018, m, k * len / 2)));
    const gF = guard(r * 0.98, 9, 16, FC.wire, s * 0.0035, r * 0.12); gF.position.z = len / 2 + s * 0.01; g.add(gF);
    const gB = guard(r * 0.98, 6, 12, FC.wire, s * 0.0035, r * 0.12); gB.position.z = -len / 2 - s * 0.01; g.add(gB);
    const badge = tubeZ(r * 0.12, r * 0.12, s * 0.02, FC.red, 24, false); badge.position.z = len / 2 + s * 0.015; g.add(badge);
    const bw = discZ(r * 0.06, FC.white, len / 2 + s * 0.026); g.add(bw);
    const mot = tubeZ(s * 0.15, s * 0.15, len * 0.4, FC.graphite, 24, false); mot.position.z = -len * 0.12; g.add(mot);
    const rot = blades({ n: 6, r0: s * 0.08, r1: r * 0.94, w0: s * 0.08, w1: r * 0.5, sweep: r * 0.12, pitch: 0.5, m: FC.alu, hubR: s * 0.07, hubLen: s * 0.08, hubMat: FC.alu });
    rot.position.z = len * 0.18; g.add(rot);
    return { g, rot };
  }

  /* 각 팬: { group, rotor, axis } — 공기 흐름 방향 = 로컬 +z (roof/hvls/diffuser/ceilvent/purigen 은 y)
     사진 대응: propeller(propeller.jpg) propellerDark(propeller_guard) propStand(propeller_stand) belt(belt_box)
     roof(굴뚝형 루프팬 TFP-G60 FT 브로슈어) hvls(hvls_ac) inline(duct_mixed) squareInline(duct_square)
     centrifugal(blower_fixed) centrifugalSus(sirocco_sus) sirocoDouble(sirocco_double) cabinet(sirocco)
     cabinetMulti(multi_sirocco) circ(TFF-F30 브로슈어) jet(jet) ec(EC 팬) diffuser(diffuser) purigen(purigen)
     axialStand(portable_orange) axialStandBlue(portable_blue) defroster(TFU-G110 브로슈어) ceilvent(plastic_ceiling)
     pipefan(plastic_vent) filterbox(fandora 그릴형) filterboxDuct(fandora 박스형) hoodcap(hoodcap) */
  M.fan = function (kind, s) {
    const g = new T.Group();
    let rotor = null, axis = 'z';
    if (kind === 'propeller' || kind === 'propellerDark' || kind === 'propStand') {
      const dark = kind === 'propellerDark';
      const o = dark ? { plate: FC.graphite, blade: FC.alu, n: 5, w1: s * 0.11, sweep: s * 0.025, pitch: 0.45, motor: FC.alu }
        : kind === 'propStand' ? { plate: FC.galv, blade: FC.alu, n: 3, w1: s * 0.3, sweep: s * 0.12, pitch: 0.42 }
          : { plate: FC.galv, blade: FC.alu, n: 4, w1: s * 0.17, pitch: 0.3, paddle: true };
      const pf = propFan(s, o); g.add(pf.g); rotor = pf.rot;
      if (kind === 'propStand') {
        // 바퀴 달린 받침 프레임
        const fy = -s * 0.5 - s * 0.22, px = s * 0.53;
        [-1, 1].forEach(k => {
          g.add(tubeBetween(new T.Vector3(k * px, fy, -s * 0.05), new T.Vector3(k * px, s * 0.52, -s * 0.05), s * 0.018, FC.galv));
          g.add(tubeBetween(new T.Vector3(k * px, fy, -s * 0.42), new T.Vector3(k * px, -s * 0.1, -s * 0.05), s * 0.014, FC.galv));
          g.add(tubeBetween(new T.Vector3(k * px, fy, -s * 0.45), new T.Vector3(k * px, fy, s * 0.12), s * 0.018, FC.galv));
          [-s * 0.45, s * 0.12].forEach(z => { const w = cyl(s * 0.03, s * 0.03, s * 0.025, MAT.rubber, 14); w.rotation.z = PI / 2; w.position.set(k * px, fy - s * 0.04, z); g.add(w); });
        });
        [-s * 0.45, s * 0.12].forEach(z => g.add(tubeBetween(new T.Vector3(-px, fy, z), new T.Vector3(px, fy, z), s * 0.015, FC.galv)));
      }
    } else if (kind === 'belt') {
      // 박스형 고압팬: 아연도 상자 + 앞면 셔터 루버 + 격자 망 + 벤투리 날개
      const d = s * 0.42, t = s * 0.018;
      [[0, s / 2, s, t], [0, -s / 2, s, t]].forEach(([x, y, w, h]) => { const p = box(w, h, d, FC.galv); p.position.set(x, y, -d / 2); g.add(p); });
      [-1, 1].forEach(k => { const p = box(t, s, d, FC.galv); p.position.set(k * s / 2, 0, -d / 2); g.add(p); });
      g.add(squareFrame(s + t, s * 0.95, s * 0.02, FC.galv));
      const sl = new T.Group(); sl.name = 'shutter';
      const nS = 10;
      for (let i = 0; i < nS; i++) {
        const piv = new T.Group(); piv.position.set(0, s * 0.47 - i * s * 0.94 / nS, s * 0.015);
        const slat = box(s * 0.93, s * 0.94 / nS * 1.08, s * 0.006, FC.alu); slat.position.y = -s * 0.94 / nS / 2; slat.rotation.x = -0.45;
        const lip = box(s * 0.93, s * 0.008, s * 0.02, FC.alu); lip.position.set(0, -s * 0.94 / nS, s * 0.008);
        piv.add(slat); piv.add(lip); sl.add(piv);
      }
      g.add(sl);
      const gr = grid(s * 0.92, s * 0.92, 14, 14, FC.wire, s * 0.004); gr.position.z = -s * 0.03; g.add(gr);
      const part = plate(s, s, [{ r: s * 0.45 }], s * 0.012, FC.galv); part.position.z = -d * 0.5; g.add(part);
      const ven = latheZ([[s * 0.45, -d * 0.5], [s * 0.44, -d * 0.62], [s * 0.44, -d * 0.75]], FC.galv); g.add(ven);
      rotor = blades({ n: 3, r0: s * 0.06, r1: s * 0.43, w0: s * 0.08, w1: s * 0.3, sweep: s * 0.1, pitch: 0.42, m: FC.alu, hubR: s * 0.06, hubLen: s * 0.06, cap: 0.5 });
      rotor.position.z = -d * 0.58; g.add(rotor);
      const mot = tubeZ(s * 0.075, s * 0.075, s * 0.14, FC.graphite, 24, false); mot.position.z = -d * 0.82; g.add(mot);
      [PI / 4, -PI / 4].forEach(a => { const bar = box(s * 0.02, s * 1.3, s * 0.01, FC.galv); bar.rotation.z = a; bar.position.z = -d * 0.9; g.add(bar); });
      const back = guard(s * 0.44, 7, 8, FC.wire, s * 0.003); back.position.z = -d * 0.97; g.add(back);
    } else if (kind === 'roof') {
      // 굴뚝형 루프팬: 아연도 굴뚝 스택 위에 수평 판형 팬(진회색 판, 위쪽 가드)
      axis = 'y';
      const H0 = s * 0.55;
      const stack = box(s * 0.82, H0, s * 0.82, FC.galv); stack.position.y = H0 / 2; g.add(stack);
      const fl = box(s * 0.9, s * 0.03, s * 0.9, FC.galv); fl.position.y = H0; g.add(fl);
      const pf = propFan(s, { plate: FC.graphite, blade: FC.sus, n: 5, w1: s * 0.16, sweep: s * 0.05, pitch: 0.5, motor: FC.graphite });
      pf.g.remove(pf.rot);
      const head = new T.Group(); head.add(pf.g); head.rotation.x = -PI / 2; head.position.y = H0 + s * 0.22; g.add(head);
      // 판 아래 받침 기둥
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const p = box(s * 0.03, s * 0.22, s * 0.03, FC.galv); p.position.set(a * s * 0.43, H0 + s * 0.11, b * s * 0.43); g.add(p); });
      const rw = new T.Group(); pf.rot.rotation.x = -PI / 2; pf.rot.position.set(0, 0, 0); rw.add(pf.rot); rw.position.y = H0 + s * 0.22 - s * 0.045; g.add(rw);
      rotor = rw; rw.userData.inner = true;
    } else if (kind === 'hvls') {
      // AC 기어드 HVLS: 천장판·요크 → 사각 다운로드 → 원통 모터 → 허브 판 + 6날개
      axis = 'y';
      const R = s / 2;
      const top = box(0.42, 0.04, 0.42, FC.galvLight); top.position.y = 1.78; g.add(top);
      [-1, 1].forEach(k => { const y = box(0.03, 0.22, 0.16, FC.galvLight); y.position.set(k * 0.07, 1.65, 0); g.add(y); });
      const rod = box(0.11, 1.0, 0.11, FC.galvLight); rod.position.y = 1.06; g.add(rod);
      const clamp = box(0.17, 0.12, 0.17, FC.galvLight); clamp.position.y = 0.6; g.add(clamp);
      const motor = cyl(0.21, 0.21, 0.6, FC.galv, 32); motor.position.y = 0.24; g.add(motor);
      for (let i = 0; i < 4; i++) { const sl = box(0.012, 0.16, 0.05, FC.black); sl.position.set(Math.sin(i * 0.25 - 0.4) * 0.212, 0.32 + (i % 2) * 0.05, Math.cos(i * 0.25 - 0.4) * 0.212); sl.rotation.set(0, i * 0.25 - 0.4, 0.5); g.add(sl); }
      const lab = box(0.006, 0.28, 0.07, FC.red); lab.position.set(0.212, 0.22, -0.06); g.add(lab);
      const gear = cyl(0.17, 0.2, 0.12, FC.galvLight, 32); gear.position.y = -0.12; g.add(gear);
      rotor = new T.Group();
      const hub = cyl(0.36, 0.36, 0.045, FC.white, 40); rotor.add(hub);
      const hubC = cyl(0.12, 0.12, 0.06, FC.galv, 24); hubC.position.y = -0.04; rotor.add(hubC);
      for (let i = 0; i < 6; i++) {
        const arm = new T.Group();
        const L = R - 0.3;
        const b = box(L, 0.035, 0.2, MAT.hvlsBlade); b.position.x = 0.3 + L / 2; b.rotation.x = 0.1; arm.add(b);
        const rib = box(L, 0.05, 0.03, MAT.hvlsBlade); rib.position.set(0.3 + L / 2, 0.015, -0.06); arm.add(rib);
        const cap = box(0.02, 0.06, 0.21, FC.galv); cap.position.set(R, 0, 0); arm.add(cap);
        arm.rotation.y = (i / 6) * TAU;
        rotor.add(arm);
      }
      rotor.position.y = -0.21;
      g.add(rotor);
    } else if (kind === 'inline') {
      // 사류(혼류) 원형 덕트팬: 좁은 흡입관(-z) → 원뿔 확관 → 몸통(+z), 회녹색
      const r = s * 0.5, ri = s * 0.38, L = s * 0.95, SG = fmat(0xc9d0c6, 0.3, 0.4, { env: 0.75 });
      const z0 = -L / 2, z1 = z0 + L * 0.34, z2 = z1 + L * 0.2, z3 = L / 2;
      const inl = tubeZ(ri, ri, z1 - z0, SG); inl.position.z = (z0 + z1) / 2; g.add(inl);
      g.add(latheZ([[ri, z1], [r, z2]], SG));
      const body = tubeZ(r, r, z3 - z2, SG); body.position.z = (z2 + z3) / 2; g.add(body);
      g.add(torusZ(ri + s * 0.015, s * 0.018, SG, z0));
      g.add(torusZ(r + s * 0.015, s * 0.018, SG, z3));
      g.add(torusZ(r, s * 0.014, SG, z2));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + 0.2, bo = cyl(s * 0.012, s * 0.012, s * 0.02, MAT.yellow, 8);
        bo.position.set(Math.cos(a) * (r * 0.9 + ri * 0.1), Math.sin(a) * (r * 0.9 + ri * 0.1), z2 - s * 0.02); bo.rotation.x = PI / 2; g.add(bo);
      }
      rotor = blades({ n: 7, r0: s * 0.09, r1: ri * 0.96, w0: s * 0.09, w1: ri * 0.55, sweep: ri * 0.25, pitch: 0.6, m: FC.graphite, hubR: s * 0.1, hubLen: s * 0.12, hubMat: FC.white, cap: 0.5, capMat: FC.white });
      rotor.position.z = z0 + L * 0.12; g.add(rotor);
      const mot = tubeZ(s * 0.17, s * 0.17, L * 0.4, FC.graphite, 28, false); mot.position.z = L * 0.15; g.add(mot);
      for (let i = 0; i < 8; i++) { const v = box(s * 0.006, r - s * 0.17, L * 0.25, SG); const a = new T.Group(); v.position.y = (r + s * 0.17) / 2; v.rotation.y = 0.25; a.add(v); a.rotation.z = i / 8 * TAU; a.position.z = L * 0.28; g.add(a); }
      const jb = box(s * 0.12, s * 0.08, s * 0.14, SG); jb.position.set(r * 0.72, r * 0.72, z2 + s * 0.1); jb.rotation.z = -PI / 4; g.add(jb);
      const br = box(s * 0.16, s * 0.025, s * 0.06, FC.wire); br.position.set(r + s * 0.06, 0, z2 + s * 0.06); g.add(br);
      // 검정 8각 방진 받침
      [-1, 1].forEach(k => { const p = box(s * 0.04, s * 0.32, L * 0.32, FC.black); p.position.set(k * r * 0.62, -r * 0.62, z2 - L * 0.05); p.rotation.z = k * 0.55; g.add(p); });
      const sb = box(r * 0.7, s * 0.04, L * 0.32, FC.black); sb.position.set(0, -r - s * 0.08, z2 - L * 0.05); g.add(sb);
    } else if (kind === 'squareInline') {
      // 사각 인라인(박스) 덕트팬: 흰 상자, 흡입면(-z)에 연녹색 벨마우스 + 후향 임펠러
      const D = s * 0.92, t = s * 0.015;
      [-1, 1].forEach(k => { const p = box(s, t, D, FC.panel); p.position.y = k * s / 2; g.add(p); const q = box(t, s, D, FC.panel); q.position.x = k * s / 2; g.add(q); });
      g.add(edgeFrame(s, s, D, s * 0.025, FC.galvLight));
      const fp = plate(s, s, [{ r: s * 0.45 }], s * 0.01, FC.panel); fp.position.z = -D / 2 + s * 0.06; g.add(fp);
      g.add(latheZ([[s * 0.45, -D / 2 + s * 0.06], [s * 0.42, -D / 2 + s * 0.08], [s * 0.34, -D / 2 + s * 0.17], [s * 0.3, -D / 2 + s * 0.28], [s * 0.3, -D / 2 + s * 0.32]], FC.frp));
      rotor = new T.Group();
      const imp = backward(s * 0.37, 12, FC.tan, FC.shade); rotor.add(imp);
      const hub = tubeZ(s * 0.11, s * 0.11, s * 0.1, FC.black, 28, false); hub.position.z = s * 0.02; rotor.add(hub);
      const hubF = discZ(s * 0.11, FC.black, s * 0.07); rotor.add(hubF);
      const lab = discZ(s * 0.05, FC.red, s * 0.072); rotor.add(lab);
      const lab2 = discZ(s * 0.025, FC.white, s * 0.074); rotor.add(lab2);
      rotor.rotation.y = PI; // 흡입 쪽(-z)을 향하도록
      const rw = new T.Group(); rw.add(rotor); rw.position.z = -D / 2 + s * 0.42; g.add(rw);
      const bp = plate(s, s, [{ r: s * 0.4 }], s * 0.01, FC.panel); bp.position.z = D / 2 - s * 0.01; g.add(bp);
      const mot = tubeZ(s * 0.14, s * 0.14, s * 0.22, FC.graphite, 24, false); mot.position.z = D / 2 - s * 0.22; g.add(mot);
      [0, PI / 2].forEach(a => { const bar = box(s * 0.94, s * 0.03, s * 0.03, FC.galv); bar.rotation.z = a; bar.position.z = D / 2 - s * 0.12; g.add(bar); });
      // rotor 는 rw 안에서 z축 회전 (rotation.y=PI 로 뒤집혀 있어도 z축 회전은 그대로)
    } else if (kind === 'centrifugal' || kind === 'centrifugalSus' || kind === 'sirocoDouble' || kind === 'sirocoFrame') {
      // 시로코(원심) 송풍기: 판금 스크롤, 축 = x, 흡입 = +x 옆면, 토출 = 위쪽에서 +z
      const torX = (r, tt, m, x) => { const o = new T.Mesh(new T.TorusGeometry(r, tt, 8, 64), m); o.rotation.y = PI / 2; o.position.x = x; return o; };
      const discX = (r, m, x, dir) => { const o = new T.Mesh(new T.CircleGeometry(r, 48), m); o.rotation.y = dir > 0 ? PI / 2 : -PI / 2; o.position.x = x; return o; };
      const holderX = () => { const h = new T.Group(); h.rotation.y = -PI / 2; g.add(h); return h; }; // 안쪽 z 축 → 바깥 -x... (z 를 x 축에 맞춤)
      if (kind === 'sirocoDouble') {
        // 양흡입 다익(DIDW): 스크롤 모양 측판 2장 + 감싼 외피, 앞 위 사각 토출구(플랜지), 양쪽 흡입 링, 한쪽 흡입구에 모터(3암)
        const m = fmat(0xc3cabe, 0.3, 0.42, { env: 0.7 }), R0 = s * 0.27, R1 = s * 0.45, w = s * 0.62, t = s * 0.012, hr = s * 0.25;
        const ol = voluteOutline(R0, R1, s * 0.42, 1.2);
        [1, -1].forEach(k => { const p = sideShapeX(ol, [{ r: hr }], t, m); p.position.x = k > 0 ? w / 2 : -w / 2 - t; g.add(p); g.add(torX(hr + s * 0.012, s * 0.02, m, k * (w / 2 + t))); });
        g.add(ribbonX([...ol.spiral, ol.mouth[0]], w, m));
        g.add(ribbonX([ol.spiral[0], ol.mouth[1]], w, m));
        // 토출 플랜지 (밖으로 꺾인 테)
        const oy = (R1 + ol.yc) / 2, oh = R1 - ol.yc, oz = s * 0.42;
        [[0, oh / 2 + s * 0.025, w + s * 0.1, s * 0.05], [0, -oh / 2 - s * 0.025, w + s * 0.1, s * 0.05]].forEach(([x, y, ww, hh]) => { const b = box(ww, hh, t, m); b.position.set(x, oy + y, oz); g.add(b); });
        [-1, 1].forEach(k => { const b = box(s * 0.05, oh + s * 0.1, t, m); b.position.set(k * (w / 2 + s * 0.025), oy, oz); g.add(b); });
        // 깊은 사각 토출 덕트 + 밖으로 꺾인 플랜지(긴 구멍)
        const dd = s * 0.12;
        [-1, 1].forEach(k => { const hw = box(w, t, dd, m); hw.position.set(0, oy + k * oh / 2, oz + dd / 2); g.add(hw); const vw = box(t, oh, dd, m); vw.position.set(k * w / 2, oy, oz + dd / 2); g.add(vw); });
        [[0, oh / 2 + s * 0.035, w + s * 0.14, s * 0.07], [0, -oh / 2 - s * 0.035, w + s * 0.14, s * 0.07]].forEach(([x, y, ww, hh]) => { const b = box(ww, hh, t, m); b.position.set(x, oy + y, oz + dd); g.add(b); });
        [-1, 1].forEach(k => { const b = box(s * 0.07, oh + s * 0.14, t, m); b.position.set(k * (w / 2 + s * 0.035), oy, oz + dd); g.add(b); });
        for (let i = 0; i < 4; i++) [-1, 1].forEach(k => { const sl = box(s * 0.035, s * 0.016, t * 1.5, FC.shade); sl.position.set(-w * 0.36 + i * w * 0.24, oy + k * (oh / 2 + s * 0.035), oz + dd + t * 0.3); g.add(sl); });
        [-1, 1].forEach(k => [-0.3, 0.3].forEach(j => { const sl = box(s * 0.016, s * 0.035, t * 1.5, FC.shade); sl.position.set(k * (w / 2 + s * 0.035), oy + j * oh, oz + dd + t * 0.3); g.add(sl); }));
        // 드럼 임펠러
        const h = holderX(); const imp = sirocoDrum(s * 0.235, w * 0.93, 44, FC.galvLight, FC.galv, FC.shade); h.add(imp); rotor = spinLink(imp, 'z');
        // 모터: 흡입구 가운데, 3암 브래킷 + 검정 단자함
        const mot = cyl(s * 0.11, s * 0.11, s * 0.24, FC.galvLight, 32); mot.rotation.z = PI / 2; mot.position.x = w / 2 - s * 0.04; g.add(mot);
        const cap = cyl(s * 0.115, s * 0.115, s * 0.03, FC.black, 32); cap.rotation.z = PI / 2; cap.position.x = w / 2 + s * 0.08; g.add(cap);
        const shaft = cyl(s * 0.03, s * 0.03, s * 0.04, FC.sus, 16); shaft.rotation.z = PI / 2; shaft.position.x = w / 2 + s * 0.1; g.add(shaft);
        // 별 모양 모터 브래킷(은색) + 3암
        const star = new T.Shape(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr = i % 2 ? s * 0.12 : s * 0.155; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        const sg = new T.ExtrudeGeometry(star, { depth: s * 0.01, bevelEnabled: false }); sg.rotateY(PI / 2);
        const stM = new T.Mesh(sg, FC.galvLight); stM.position.x = w / 2 + s * 0.06; g.add(stM);
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; const arm = box(s * 0.025, hr - s * 0.12, s * 0.03, FC.galvLight); const ag = new T.Group(); arm.position.y = (hr + s * 0.12) / 2; ag.add(arm); ag.rotation.x = a; ag.position.x = w / 2 + t + s * 0.01; g.add(ag); }
        const tb = box(s * 0.05, s * 0.11, s * 0.09, FC.black); tb.position.set(w / 2 + t + s * 0.03, s * 0.28, -s * 0.24); g.add(tb);
        // 사다리꼴 벤딩 다리 2개
        [-1, 1].forEach(k => {
          const sh = new T.Shape(); sh.moveTo(-s * 0.46, -s * 0.52); sh.lineTo(s * 0.34, -s * 0.52); sh.lineTo(s * 0.2, -s * 0.3); sh.lineTo(-s * 0.32, -s * 0.3); sh.lineTo(-s * 0.46, -s * 0.52);
          const geo = new T.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); geo.rotateY(-PI / 2);
          const f = new T.Mesh(geo, m); f.position.x = k * w * 0.3; f.rotation.z = k * 0.28; g.add(f);
          const sole = box(s * 0.09, t, s * 0.8, m); sole.position.set(k * (w * 0.3 + s * 0.08), -s * 0.52, -s * 0.06); g.add(sole);
        });
      } else if (kind === 'centrifugal') {
        // 벨트 구동 터보 송풍기(고정압): 연회색 스크롤, 주황 흡입 콘·임펠러, 채널 베이스·방진 스프링, 파란 모터·노란 벨트 커버
        const m = fmat(0xdfe5eb, 0.25, 0.42, { env: 0.6 }), R0 = s * 0.29, R1 = s * 0.48, w = s * 0.4, t = s * 0.012, hr = s * 0.235;
        const ol = voluteOutline(R0, R1, s * 0.47, 0.42);
        const pin = sideShapeX(ol, [{ r: hr }], t, m); pin.position.x = w / 2; g.add(pin);
        const pout = sideShapeX(ol, [], t, m); pout.position.x = -w / 2 - t; g.add(pout);
        g.add(ribbonX([...ol.spiral, ol.mouth[0]], w, m));
        g.add(ribbonX([ol.spiral[0], ol.mouth[1]], w, m));
        const oy = (R1 + ol.yc) / 2, oh = R1 - ol.yc, oz = s * 0.47;
        [[oh / 2 + s * 0.02, w + s * 0.08], [-oh / 2 - s * 0.02, w + s * 0.08]].forEach(([y, ww]) => { const b = box(ww, s * 0.04, s * 0.015, m); b.position.set(0, oy + y, oz); g.add(b); });
        [-1, 1].forEach(k => { const b = box(s * 0.04, oh + s * 0.08, s * 0.015, m); b.position.set(k * (w / 2 + s * 0.02), oy, oz); g.add(b); });
        // 주황 흡입 콘(밖으로 벌어짐) + 안쪽 후향 임펠러
        const cone = latheZ([[hr * 0.98, -s * 0.01], [hr * 1.0, s * 0.02], [hr * 1.1, s * 0.06], [hr * 1.3, s * 0.08], [hr * 1.36, s * 0.082]], FC.inletRed);
        const cg = new T.Group(); cg.add(cone); cg.rotation.y = PI / 2; cg.position.x = w / 2 + t; g.add(cg);
        const h = holderX(); const imp = new T.Group(); h.add(imp);
        const bi = backward(hr * 1.35, 12, FC.inletRed, FC.shade); bi.rotation.y = PI; bi.position.z = -w * 0.15; imp.add(bi); // 안쪽 z = -x... 슈라우드가 흡입(+x) 쪽
        const hc = new T.Mesh(new T.ConeGeometry(hr * 0.35, s * 0.1, 24), FC.inletRed); hc.rotation.x = -PI / 2; hc.position.z = -w * 0.2; imp.add(hc);
        rotor = spinLink(imp, 'z');
        // 받침 + 베이스
        const yb = -s * 0.4, by = -s * 0.62;
        [-1, 1].forEach(k => { const leg = box(s * 0.05, yb - by, s * 0.05, m); leg.position.set(k * (w / 2 - s * 0.03), (yb + by) / 2, -s * 0.05); g.add(leg); const leg2 = leg.clone(); leg2.position.z = -s * 0.35; g.add(leg2); });
        const plat = box(w + s * 0.06, s * 0.03, s * 0.55, m); plat.position.set(0, yb, -s * 0.2); g.add(plat);
        [-1, 1].forEach(k => { const rail = box(s * 0.07, s * 0.07, s * 1.15, m); rail.position.set(k * s * 0.38 - s * 0.12, by, -s * 0.3); g.add(rail); });
        [0.2, -0.5, -0.82].forEach(z => { const c = box(s * 0.84, s * 0.05, s * 0.06, m); c.position.set(-s * 0.12, by, z * s); g.add(c); });
        [[-1, 0.15], [-1, -0.8], [1, 0.15], [1, -0.8]].forEach(([x, z]) => { const sp = cyl(s * 0.03, s * 0.03, s * 0.07, FC.motorBlue, 10); sp.position.set(x * s * 0.38 - s * 0.12, by - s * 0.07, z * s); g.add(sp); const ft = box(s * 0.09, s * 0.015, s * 0.09, m); ft.position.set(x * s * 0.38 - s * 0.12, by - s * 0.11, z * s); g.add(ft); });
        // 축·베어링(반대쪽 -x) + 모터 + 벨트 커버
        const shaft = cyl(s * 0.02, s * 0.02, s * 0.3, FC.sus, 12); shaft.rotation.z = PI / 2; shaft.position.set(-w / 2 - s * 0.14, 0, 0); g.add(shaft);
        const bear = box(s * 0.08, s * 0.1, s * 0.12, MAT.dark); bear.position.set(-w / 2 - s * 0.08, -s * 0.03, 0); g.add(bear);
        const bstand = box(s * 0.08, -yb - s * 0.08, s * 0.1, m); bstand.position.set(-w / 2 - s * 0.08, (yb - s * 0.08) / 2, 0); g.add(bstand);
        const mp = new T.Vector3(-w / 2 - s * 0.16, by + s * 0.15, -s * 0.62);
        const motor = cyl(s * 0.1, s * 0.1, s * 0.26, FC.motorBlue, 24); motor.rotation.z = PI / 2; motor.position.copy(mp); g.add(motor);
        for (let i = 0; i < 10; i++) { const a = i / 10 * PI + 0.0; const f = box(s * 0.24, s * 0.012, s * 0.012, FC.motorBlue); f.position.set(mp.x, mp.y + Math.cos(a) * s * 0.105, mp.z + Math.sin(a) * s * 0.105); g.add(f); }
        const mfoot = box(s * 0.26, s * 0.05, s * 0.22, m); mfoot.position.set(mp.x, by + s * 0.05, mp.z); g.add(mfoot);
        const dy = mp.y, dz = mp.z, Lb = Math.hypot(dy, dz);
        const bg = box(s * 0.06, Lb + s * 0.2, s * 0.16, FC.yellow); bg.position.set(-w / 2 - s * 0.26, dy / 2, dz / 2); bg.rotation.x = Math.atan2(dz, dy); g.add(bg);
      } else {
        // TFB 단흡입 시로코(SUS): 사각 측판 2장(테두리 꺾임·볼트) 사이 스크롤 외피, 앞 위 원형 토출 칼라, 옆판 흡입 링, 아래 받침 앵글
        const m = kind === 'sirocoFrame' ? fmat(0x97a399, 0.35, 0.45, { env: 0.7 }) : fmat(0xbcc5be, 0.3, 0.45, { env: 0.7 }), R0 = s * 0.27, R1 = s * 0.43, w = s * 0.52, t = s * 0.012, hr = s * 0.21;
        const zf = s * 0.41, y0 = -s * 0.6, y1 = R1 + s * 0.04, zb = -R1 - s * 0.05;
        const ol = voluteOutline(R0, R1, zf, 1.0);
        const pin = rectPlateX(zb, zf, y0, y1, [{ u: 0, v: 0, r: hr }], t, m, s * 0.035); pin.position.x = w / 2; g.add(pin);
        const pout = rectPlateX(zb, zf, y0, y1, [], t, m, -s * 0.035); pout.position.x = -w / 2; g.add(pout);
        const bolts = []; [y0 + s * 0.04, y1 - s * 0.04].forEach(y => [zb + s * 0.04, zf - s * 0.04, (zb + zf) / 2].forEach(z => bolts.push([z, y])));
        [zb + s * 0.04, zf - s * 0.04].forEach(z => bolts.push([z, (y0 + y1) / 2]));
        g.add(boltsX(bolts, s * 0.011, FC.shade, w / 2 + t * 0.6));
        g.add(ribbonX([...ol.spiral, ol.mouth[0]], w, m));
        g.add(ribbonX([ol.spiral[0], ol.mouth[1]], w, m));
        // 앞판(토출 부분) + 원형 칼라
        const cr = w * 0.44, oh = Math.max(y1 - ol.yc + s * 0.02, cr * 2 + s * 0.06), oy = y1 - oh / 2;
        const fp = plate(w + t * 2, oh, [{ r: cr }], t, m); fp.position.set(0, oy, zf); g.add(fp);
        const col = tubeZ(cr, cr, s * 0.1, m, 48); col.position.set(0, oy, zf + s * 0.05); g.add(col);
        const lipT = torusZ(cr, s * 0.012, m, zf + s * 0.1); lipT.position.y = oy; g.add(lipT);
        const inner = discZ(cr * 0.99, FC.shade, zf - s * 0.12); inner.position.y = oy; g.add(inner);
        // 앞 기둥(앵글) — 토출구 아래는 열린 프레임
        [-1, 1].forEach(k => { const p = box(s * 0.05, ol.yc - y0, t, m); p.position.set(k * (w / 2 - s * 0.02), (ol.yc + y0) / 2, zf); g.add(p); const q = box(t, ol.yc - y0, s * 0.04, m); q.position.set(k * (w / 2 - s * 0.045), (ol.yc + y0) / 2, zf - s * 0.02); g.add(q); });
        // 흡입 링 + 안쪽 드럼
        g.add(torX(hr, s * 0.014, m, w / 2 + s * 0.04));
        const ic = cyl(hr, hr, s * 0.04, m, 48, true); ic.rotation.z = PI / 2; ic.position.x = w / 2 + s * 0.02; g.add(ic);
        const h = holderX(); const imp = sirocoDrum(hr * 0.95, w * 0.85, 40, FC.galvLight, FC.galv, FC.shade); h.add(imp); rotor = spinLink(imp, 'z');
        g.add(discX(R0 * 0.9, FC.shade, -w / 2 + t, 1));
        // 받침 앵글 + 반대쪽 모터 돌출
        [-1, 1].forEach(k => { const a = box(s * 0.08, t * 2, zf - zb + s * 0.06, m); a.position.set(k * (w / 2 + s * 0.04), y0, (zf + zb) / 2); g.add(a); });
        const mot = cyl(s * 0.1, s * 0.1, s * 0.16, FC.galvLight, 28); mot.rotation.z = PI / 2; mot.position.set(-w / 2 - s * 0.08, 0, 0); g.add(mot);
      }
    } else if (kind === 'cabinet' || kind === 'cabinetMulti') {
      // 캐비닛 시로코: 상자, 흡입면(-z) 원형 칼라 안으로 드럼 임펠러, 토출면(+z)
      const multi = kind === 'cabinetMulti';
      const W = s, H = multi ? s * 0.92 : s * 0.82, D = multi ? s * 0.95 : s * 0.85, t = s * 0.012, hm = multi ? FC.sage : fmat(0x9ea4a2, 0.3, 0.5, { env: 0.55 });
      [-1, 1].forEach(k => { const p = box(W, t, D, hm); p.position.y = k * H / 2; g.add(p); const q = box(t, H, D, hm); q.position.x = k * W / 2; g.add(q); });
      g.add(edgeFrame(W, H, D, s * 0.02, hm));
      const cr = s * 0.29;
      const front = plate(W, H, [{ r: cr }], t, hm); front.position.z = -D / 2; g.add(front);
      const col = tubeZ(cr, cr, s * 0.08, multi ? FC.galv : FC.white); col.position.z = -D / 2 - s * 0.04; g.add(col);
      g.add(torusZ(cr, s * 0.014, multi ? FC.galv : FC.white, -D / 2 - s * 0.08));
      if (!multi) { // 리벳 줄·긴 슬롯
        const rv = []; for (let i = 0; i < 9; i++) rv.push([-D / 2 + s * 0.04 + i * (D - s * 0.08) / 8, H / 2 - s * 0.025]);
        g.add(boltsX(rv, s * 0.008, FC.galvLight, -W / 2 - t)); g.add(boltsX(rv, s * 0.008, FC.galvLight, W / 2 + t));
        for (let i = 0; i < 7; i++) { const b = cyl(s * 0.008, s * 0.008, s * 0.01, FC.galvLight, 6); b.rotation.x = PI / 2; b.position.set(-W / 2 + s * 0.05 + i * (W - s * 0.1) / 6, H / 2 - s * 0.025, -D / 2 - t); g.add(b); }
        [-1, 1].forEach(k => [-1, 1].forEach(j => { const sl = box(s * 0.04, s * 0.018, s * 0.004, FC.shade); sl.position.set(k * (W / 2 - s * 0.06), j * (H / 2 - s * 0.1), -D / 2 - t); g.add(sl); }));
      }
      const back = plate(W, H, [{ w: s * 0.5, h: s * 0.36, y: s * 0.12 }], t, hm); back.position.z = D / 2; g.add(back);
      if (multi) {
        // 옆면(-x) 다중 토출 포트 3개
        const side = new T.Group(); side.rotation.y = -PI / 2; side.position.x = -W / 2 - t; g.add(side);
        [{ x: -s * 0.2, y: s * 0.2, r: s * 0.13 }, { x: s * 0.18, y: -s * 0.14, r: s * 0.15 }, { x: -s * 0.2, y: -s * 0.2, r: s * 0.13 }].forEach(q => {
          const c = tubeZ(q.r, q.r, s * 0.03, FC.sage); c.position.set(q.x, q.y, s * 0.015); side.add(c);
          const tr = torusZ(q.r, s * 0.012, FC.sage); tr.position.set(q.x, q.y, s * 0.03); side.add(tr);
          const dk = discZ(q.r * 0.98, FC.shade, s * 0.003); dk.position.x = q.x; dk.position.y = q.y; side.add(dk);
        });
      }
      // 내부 그늘 판 + 드럼(축 = x)
      const inner = box(W * 0.96, H * 0.96, s * 0.01, FC.shade); inner.position.z = s * 0.1; g.add(inner);
      const holder = new T.Group(); holder.rotation.y = -PI / 2; holder.position.z = -D / 2 + s * 0.3; g.add(holder);
      const imp = drum(s * 0.24, s * 0.62, 40, FC.galvLight, FC.galv); holder.add(imp);
      if (!multi) imp.add(torusZ(s * 0.24, s * 0.012, FC.galv, 0)); // 2연 드럼 가운데 칸막이
      rotor = spinLink(imp, 'z');
      // 옆면 점검 해치 + 윗면 원판
      if (!multi) {
        const hatch = cyl(s * 0.2, s * 0.2, s * 0.012, hm, 32); hatch.rotation.z = PI / 2; hatch.position.set(-W / 2 - s * 0.008, 0, 0); g.add(hatch);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, b = cyl(s * 0.008, s * 0.008, s * 0.02, FC.black, 6); b.rotation.z = PI / 2; b.position.set(-W / 2 - s * 0.014, Math.sin(a) * s * 0.17, Math.cos(a) * s * 0.17); g.add(b); }
      }
      if (!multi) { const tp = cyl(s * 0.3, s * 0.3, s * 0.012, FC.galv, 40); tp.position.y = H / 2 + s * 0.008; g.add(tp); }
      for (let i = 0; i < 6; i++) { const b = cyl(s * 0.007, s * 0.007, s * 0.01, FC.black, 6); b.rotation.x = PI / 2; const a = i / 6 * TAU; b.position.set(Math.cos(a) * (cr + s * 0.05), Math.sin(a) * (cr + s * 0.05), -D / 2 - s * 0.008); g.add(b); }
    } else if (kind === 'circ') {
      // 서큘레이션팬 TFF-F30: 흰 ABS 원통 + 촘촘한 날개 + 빨간 팬직 배지 + 위쪽 행거
      const r = s * 0.5, len = s * 0.62;
      g.add(tubeZ(r, r, len, FC.white, 48));
      g.add(torusZ(r, s * 0.02, FC.white, len / 2)); g.add(torusZ(r, s * 0.015, FC.white, -len / 2));
      rotor = blades({ n: 14, r0: s * 0.12, r1: r * 0.96, w0: s * 0.1, w1: s * 0.3, sweep: s * 0.2, pitch: 0.22, m: FC.pipeBlade, hubR: s * 0.14, hubLen: s * 0.08, hubMat: FC.white });
      const badge = discZ(s * 0.12, FC.red, s * 0.045); rotor.add(badge);
      const bw = discZ(s * 0.06, FC.white, s * 0.047); rotor.add(bw);
      rotor.position.z = len / 2 - s * 0.025; g.add(rotor);
      g.add(tubeZ(r * 0.985, r * 0.985, len * 0.98, FC.galvLight, 48));
      const gB = guard(r * 0.97, 5, 10, FC.white, s * 0.006); gB.position.z = -len / 2; g.add(gB);
      const mot = tubeZ(s * 0.14, s * 0.14, s * 0.22, FC.white, 24, false); mot.position.z = -len * 0.15; g.add(mot);
      const blk = box(s * 0.42, s * 0.12, s * 0.2, FC.white); blk.position.set(0, r + s * 0.05, -s * 0.02); g.add(blk);
      [-1, 1].forEach(k => { const b = cyl(s * 0.025, s * 0.025, s * 0.04, FC.galv, 10); b.position.set(k * s * 0.15, r + s * 0.13, -s * 0.02); g.add(b); });
      const rod = cyl(s * 0.035, s * 0.035, s * 0.4, FC.galv, 12); rod.position.set(0, r + s * 0.32, -s * 0.02); g.add(rod);
      const bot = cyl(s * 0.03, s * 0.03, s * 0.08, FC.galv, 10); bot.position.set(0, -r - s * 0.04, -s * 0.02); g.add(bot);
      const arr = new T.Mesh(new T.ConeGeometry(s * 0.03, s * 0.06, 3), FC.orange); arr.rotation.z = -PI / 2; arr.position.set(r + s * 0.005, 0, -s * 0.1); arr.rotation.x = PI / 2; g.add(arr);
    } else if (kind === 'jet') {
      // 유인 제트팬 TFZ-E33: 아이보리 원통 2단 + 뒤쪽 흡입 벨 + 앞쪽 원뿔 노즐 + 위쪽 사각 행거
      const r = s * 0.4, L = s * 3.1;
      const zA = -L / 2 + s * 0.2, zB = L * 0.08, zC = L * 0.28, zD = L / 2;
      g.add(latheZ([[s * 0.5, -L / 2], [s * 0.47, -L / 2 + s * 0.04], [r + s * 0.02, -L / 2 + s * 0.12], [r + s * 0.02, zA]], FC.cream));
      const b1 = tubeZ(r, r, zB - zA, FC.cream, 48); b1.position.z = (zA + zB) / 2; g.add(b1);
      const b2 = tubeZ(r * 0.98, r * 0.98, zC - zB, FC.cream, 48); b2.position.z = (zB + zC) / 2; g.add(b2);
      g.add(latheZ([[s * 0.3, zC], [s * 0.45, zD]], FC.cream));
      g.add(torusZ(s * 0.45, s * 0.012, FC.cream, zD));
      [zA, zB, zC].forEach(z => g.add(torusZ(r + s * 0.005, s * 0.022, FC.cream, z)));
      rotor = blades({ n: 9, r0: s * 0.09, r1: r * 0.95, w0: s * 0.07, w1: s * 0.16, sweep: s * 0.08, pitch: 0.6, m: FC.cream, hubR: s * 0.1, hubLen: s * 0.12, hubMat: FC.cream, cap: 0.7 });
      rotor.position.z = -L / 2 + s * 0.3; g.add(rotor);
      const hz = (zA + zB) / 2 + s * 0.35;
      const hm = fmat(0xcfc8b2, 0.05, 0.55, { env: 0.2 });
      [-1, 1].forEach(k => { const p = box(s * 0.1, s * 1.0, s * 0.07, hm); p.position.set(0, r + s * 0.5, hz + k * s * 0.28); g.add(p); });
      const topB = box(s * 0.12, s * 0.08, s * 0.64, hm); topB.position.set(0, r + s * 1.0, hz); g.add(topB);
      const midB = box(s * 0.16, s * 0.12, s * 0.5, FC.cream); midB.position.set(0, r + s * 0.18, hz); g.add(midB);
      const clamp = box(s * 0.5, s * 0.05, s * 0.22, FC.cream); clamp.position.set(0, r + s * 0.03, hz); g.add(clamp);
      const cable = tubeBetween(new T.Vector3(-s * 0.05, r + s * 0.3, hz - s * 0.05), new T.Vector3(-s * 0.15, r + s * 0.02, hz - s * 0.25), s * 0.012, FC.black); g.add(cable);
    } else if (kind === 'ec') {
      // EC 플러그팬 모듈: 남보라 장착판 + 아연도 인렛 링 + 알루미늄 후향 임펠러 + 검정 파이프 지지대 + 다이캐스트 모터
      const ec = ecPlugFan();
      ec.g.scale.setScalar(s); ec.g.rotation.y = PI; ec.g.position.z = -s * 0.3; // 흡입 = -z, 모터 쪽 = +z
      g.add(ec.g); rotor = ec.rotor;
    } else if (kind === 'diffuser' || kind === 'purigen') {
      // 천장 원형 디퓨져(흰색): 바깥 링 + 오목한 홈 + 가운데 원판 / 퓨리젠: 두꺼운 흰 원판 + 널링 테두리
      axis = 'y';
      if (kind === 'diffuser') {
        const r = s * 0.6;
        const ring = new T.Mesh(new T.LatheGeometry([[r * 0.66, -s * 0.03], [r * 0.7, -s * 0.05], [r * 0.8, -s * 0.06], [r * 0.92, -s * 0.05], [r, -s * 0.02], [r, 0]].map(([a, b]) => new T.Vector2(a, b)), 64), FC.white);
        g.add(ring);
        const groove = cyl(r * 0.66, r * 0.66, s * 0.03, FC.panel, 64, true); groove.position.y = -s * 0.045; g.add(groove);
        const c = cyl(r * 0.62, r * 0.62, s * 0.03, FC.white, 64); c.position.y = -s * 0.07; g.add(c);
        const neck = cyl(r * 0.55, r * 0.55, s * 0.18, FC.galvLight, 40, true); neck.position.y = s * 0.09; g.add(neck);
      } else {
        const r = s * 0.6;
        const disc = cyl(r, r, s * 0.14, FC.white, 64); disc.position.y = -s * 0.07; g.add(disc);
        for (let i = 0; i < 90; i++) { const a = i / 90 * TAU, k = box(s * 0.012, s * 0.1, s * 0.012, FC.galvLight); k.position.set(Math.cos(a) * r, -s * 0.05, Math.sin(a) * r); k.rotation.set(0, -a, 0.5); g.add(k); }
        const face = cyl(r * 0.72, r * 0.72, s * 0.012, FC.white, 64); face.position.y = -s * 0.145; g.add(face);
        const neck = cyl(r * 0.5, r * 0.5, s * 0.12, FC.galvLight, 40, true); neck.position.y = s * 0.06; g.add(neck);
      }
      rotor = new T.Group();
    } else if (kind === 'axialStand' || kind === 'axialStandBlue' || kind === 'axialStandGrey' || kind === 'portableFrame') {
      const blue = kind === 'axialStandBlue' || kind === 'axialStandGrey', m = kind === 'axialStandGrey' ? fmat(0xb9c0c4, 0.5, 0.4) : kind === 'portableFrame' ? fmat(0xf2c200, 0.3, 0.32, { env: 0.8 }) : blue ? FC.blue : FC.orange, r = s * 0.5;
      const len = blue ? s * 0.62 : s * 0.5;
      const ad = axialDrum(s, m, len); g.add(ad.g); rotor = ad.rot;
      const fy = -r - s * (blue ? 0.36 : 0.18), px = r + s * 0.07;
      // 측면 피벗 + 관형 프레임
      [-1, 1].forEach(k => {
        const knob = cyl(s * 0.04, s * 0.04, s * 0.06, blue ? FC.galv : m, 16); knob.rotation.z = PI / 2; knob.position.set(k * px, 0, 0); g.add(knob);
        if (blue) {
          g.add(tubeBetween(new T.Vector3(k * px, 0, 0), new T.Vector3(k * (px + s * 0.12), fy, s * 0.42), s * 0.025, m));
          g.add(tubeBetween(new T.Vector3(k * px, 0, 0), new T.Vector3(k * (px + s * 0.12), fy, -s * 0.42), s * 0.025, m));
        } else {
          // 옆면 D자 파이프: 앞 아래 → 위로 → 뒤로 넘어가 아래로, 피벗은 짧은 팔로 연결
          const V3 = (y, z) => new T.Vector3(k * px, y, z);
          const loop = new T.CatmullRomCurve3([V3(fy, s * 0.3), V3(-r * 0.4, s * 0.32), V3(r * 0.35, s * 0.22), V3(r * 0.62, -s * 0.05), V3(r * 0.35, -s * 0.33), V3(-r * 0.4, -s * 0.36), V3(fy, -s * 0.3)]);
          g.add(new T.Mesh(new T.TubeGeometry(loop, 48, s * 0.024, 10, false), m));
          g.add(tubeBetween(V3(0, 0), V3(r * 0.62, -s * 0.05), s * 0.02, m));
        }
      });
      const bx = px + (blue ? s * 0.12 : 0), bz = blue ? s * 0.42 : s * 0.3;
      [-1, 1].forEach(k => {
        g.add(tubeBetween(new T.Vector3(-bx, fy, k * bz), new T.Vector3(bx, fy, k * bz), s * 0.025, m));
        g.add(tubeBetween(new T.Vector3(k * bx, fy, -bz), new T.Vector3(k * bx, fy, bz), s * 0.025, m));
      });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
        const cr = blue ? s * 0.06 : s * 0.035;
        const fork = box(s * 0.03, cr, s * 0.03, FC.galv); fork.position.set(a * bx, fy - cr * 0.6, b * bz); g.add(fork);
        const wh = cyl(cr, cr, cr * 0.6, blue ? FC.red : MAT.rubber, 16); wh.rotation.z = PI / 2; wh.position.set(a * bx, fy - cr * 1.2, b * bz); g.add(wh);
      });
      if (kind === 'axialStandBlue') {
        // 빨간 인양고리 + 제어함 + 크랭크 손잡이
        const eye = new T.Mesh(new T.TorusGeometry(s * 0.06, s * 0.016, 8, 20), FC.red); eye.position.set(0, r + s * 0.1, s * 0.12); g.add(eye);
        const eb = box(s * 0.06, s * 0.05, s * 0.06, FC.red); eb.position.set(0, r + s * 0.03, s * 0.12); g.add(eb);
        const cbx = box(s * 0.26, s * 0.22, s * 0.3, FC.blue); cbx.position.set(s * 0.12, r + s * 0.06, -s * 0.15); g.add(cbx);
        const sw = box(s * 0.08, s * 0.06, s * 0.01, FC.white); sw.position.set(s * 0.12, r + s * 0.1, s * 0.005); g.add(sw);
        const cr = tubeBetween(new T.Vector3(px + s * 0.03, -s * 0.05, 0), new T.Vector3(px + s * 0.12, -s * 0.05, 0), s * 0.015, FC.galv); g.add(cr);
        const hd = box(s * 0.03, s * 0.12, s * 0.03, FC.galv); hd.position.set(px + s * 0.12, -s * 0.1, 0); g.add(hd);
      }
    } else if (kind === 'defroster') {
      // 서리방지팬 TFU-G110: 높은 기둥 + 틸팅 헤드(갈색 3날개 + 나팔형 후드 + 옆판)
      const r = s * 0.5;
      const head = new T.Group(); head.name = 'thumbFocus';
      const rr = blades({ n: 3, r0: s * 0.05, r1: r, w0: s * 0.12, w1: s * 0.42, sweep: s * 0.1, pitch: 0.18, m: FC.brown, hubR: s * 0.07, hubLen: s * 0.06, hubMat: FC.brown });
      for (let i = 0; i < 6; i++) { const b = cyl(s * 0.008, s * 0.008, s * 0.01, FC.white, 6); b.rotation.x = PI / 2; const a = i / 6 * TAU; b.position.set(Math.cos(a) * s * 0.045, Math.sin(a) * s * 0.045, s * 0.032); rr.add(b); }
      rr.position.z = s * 0.06; head.add(rr);
      head.add(latheZ([[s * 0.07, s * 0.0], [s * 0.1, -s * 0.12], [s * 0.18, -s * 0.3], [s * 0.3, -s * 0.42], [s * 0.31, -s * 0.44]], FC.brown));
      const mot = tubeZ(s * 0.08, s * 0.08, s * 0.25, FC.black, 20, false); mot.position.z = -s * 0.12; head.add(mot);
      const fin = new T.Shape(); fin.moveTo(0, 0); fin.lineTo(0, -s * 0.38); fin.quadraticCurveTo(-s * 0.05, -s * 0.5, -s * 0.2, -s * 0.48); fin.lineTo(-s * 0.32, -s * 0.15); fin.lineTo(-s * 0.2, 0); fin.lineTo(0, 0);
      const finM = new T.Mesh(new T.ExtrudeGeometry(fin, { depth: s * 0.012, bevelEnabled: false }), FC.brown);
      finM.rotation.y = -PI / 2; finM.position.set(-s * 0.06, -s * 0.02, s * 0.0); head.add(finM);
      const bk = box(s * 0.16, s * 0.2, s * 0.22, FC.black); bk.position.set(s * 0.06, -s * 0.22, -s * 0.14); head.add(bk);
      head.rotation.x = 0.35;
      head.position.y = 7;
      g.add(head);
      rotor = rr;
      const pole = cyl(0.12, 0.16, 7, FC.galv); pole.position.y = 3.5; g.add(pole);
      const ft = box(1, 0.3, 1, MAT.concrete); ft.position.y = 0.15; g.add(ft);
      const cb = box(0.3, 0.4, 0.15, FC.graphite); cb.position.set(0, 1.4, 0.2); g.add(cb);
    } else if (kind === 'ceilvent') {
      // 천장형 플라스틱 환풍기: 흰 사각 그릴(가운데로 살짝 볼록, 점 타공 4군데) + 검은 원형 덕트 접속구
      axis = 'y';
      const pan = new T.Mesh(new T.CylinderGeometry(s * 0.707, s * 0.69, s * 0.035, 4, 1), FC.white);
      pan.rotation.y = PI / 4; pan.position.y = -s * 0.025; g.add(pan);
      const bulge = new T.Mesh(new T.CylinderGeometry(s * 0.69, s * 0.52, s * 0.016, 4, 1), FC.white);
      bulge.rotation.y = PI / 4; bulge.position.y = -s * 0.05; g.add(bulge);
      const dotM = FC.graphite, dotG = new T.CircleGeometry(s * 0.008, 6);
      [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([a, b]) => {
        for (let i = 0; i < 7; i++) for (let j = 0; j <= i; j++) { // 바깥이 넓고 가운데로 뾰족한 화살표
          const d = new T.Mesh(dotG, dotM); d.rotation.x = PI / 2;
          const u = (j - i / 2) * s * 0.024, v = s * 0.12 + i * s * 0.024;
          d.position.set(a * v + b * u, -s * 0.0585, b * v + a * u); g.add(d);
        }
      });
      const housing = box(s * 0.7, s * 0.25, s * 0.7, FC.galvLight); housing.position.y = s * 0.13; g.add(housing);
      const col = cyl(s * 0.2, s * 0.2, s * 0.25, FC.black, 32, true); col.position.y = s * 0.37; g.add(col);
      rotor = new T.Group();
      for (let i = 0; i < 6; i++) { const b = box(s * 0.25, 0.01, s * 0.07, MAT.bladeDark); b.position.x = s * 0.13; const arm = new T.Group(); arm.add(b); arm.rotation.y = i / 6 * TAU; rotor.add(arm); }
      rotor.position.y = s * 0.1; g.add(rotor);
    } else if (kind === 'pipefan') {
      // 플라스틱 인라인 파이프팬: 흰 원통 + 넓은 4날개 + 둥근 허브, 뒤쪽 리브 띠
      const r = s * 0.5, L = s * 0.56;
      g.add(tubeZ(r, r, L, FC.white, 48));
      g.add(torusZ(r, s * 0.012, FC.white, L / 2));
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rb = box(s * 0.012, s * 0.012, L * 0.4, FC.white); rb.position.set(Math.cos(a) * (r + s * 0.004), Math.sin(a) * (r + s * 0.004), -L * 0.28); g.add(rb); }
      [-L / 2, -L * 0.08].forEach(z => g.add(torusZ(r + s * 0.01, s * 0.012, FC.white, z)));
      rotor = blades({ n: 4, r0: s * 0.12, r1: r * 0.96, w0: s * 0.24, w1: r * 1.1, sweep: r * 0.35, pitch: 0.22, m: FC.pipeBlade, hubR: s * 0.17, hubLen: s * 0.12, hubMat: FC.white, cap: 0.35 });
      rotor.position.z = L / 2 - s * 0.08;
      g.add(tubeZ(r * 0.985, r * 0.985, L * 0.98, FC.galvLight, 48)); g.add(rotor);
      for (let i = 0; i < 3; i++) { const sp = box(s * 0.02, r - s * 0.1, s * 0.03, FC.white); const a = new T.Group(); sp.position.y = (r + s * 0.1) / 2; a.add(sp); a.rotation.z = i / 3 * TAU + PI / 6; a.position.z = -L * 0.2; g.add(a); }
      const mot = tubeZ(s * 0.13, s * 0.13, L * 0.3, FC.white, 24, false); mot.position.z = -L * 0.08; g.add(mot);
    } else if (kind === 'filterbox' || kind === 'filterboxDuct') {
      // 팬도라: 청록 필터 박스 + 뒤쪽 검은 플랜지. 그릴형 = 흰 테 + 검은 격자 그릴 / 박스형 = 원형 덕트 칼라
      const W = s, H = s * 0.88, D = s * 0.8, grille = kind === 'filterbox';
      const bx = box(W, H, D, FC.teal); g.add(bx);
      const fl = plate(W * 1.08, H * 1.1, [{ w: W * 0.9, h: H * 0.9 }], s * 0.02, FC.black); fl.position.z = -D / 2 + s * 0.02; g.add(fl);
      if (grille) {
        const fr = plate(W * 1.16, H * 1.2, [{ w: W * 0.94, h: H * 0.96 }], s * 0.03, FC.white); fr.position.z = D / 2 + s * 0.015; g.add(fr);
        const back = box(W * 0.94, H * 0.96, s * 0.005, FC.shade); back.position.z = D / 2 + s * 0.002; g.add(back);
        const gr = grid(W * 0.94, H * 0.96, 16, 16, FC.black, s * 0.008); gr.position.z = D / 2 + s * 0.02; gr.children.forEach(c => { c.scale.z = 4; }); g.add(gr);
        [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([a, b]) => { const d = cyl(s * 0.018, s * 0.018, s * 0.01, FC.black, 12); d.rotation.x = PI / 2; d.position.set(a * W * 0.53, b * H * 0.55, D / 2 + s * 0.032); g.add(d); });
      } else {
        const fp = box(W * 1.02, H * 1.02, s * 0.02, FC.teal); fp.position.z = D / 2; g.add(fp);
        const col = tubeZ(s * 0.33, s * 0.33, s * 0.12, FC.teal, 48); col.position.z = D / 2 + s * 0.06; g.add(col);
        g.add(discZ(s * 0.33, FC.shade, D / 2 + s * 0.012));
        const fm = meshPanel(s * 0.64, s * 0.64, 'diamond', 0x2a3036, 14, s * 0.32); fm.position.z = D / 2 + s * 0.016; g.add(fm);
        [-1, 1].forEach(k => { const x = box(s * 0.64, s * 0.006, s * 0.006, FC.teal); x.rotation.z = k * 0.6; x.position.z = D / 2 + s * 0.02; g.add(x); });
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const d = cyl(s * 0.01, s * 0.01, s * 0.01, FC.galv, 8); d.rotation.x = PI / 2; d.position.set(a * W * 0.47, b * H * 0.47, D / 2 + s * 0.012); g.add(d); });
      }
      rotor = null;
    } else if (kind === 'hoodcap') {
      // 스테인리스 후드캡: 벽 플랜지 + 반구 후드(아래쪽 개방) + 안쪽 루버 + 벽 속 파이프
      const R = s * 0.47;
      const fl = new T.Mesh(new T.RingGeometry(s * 0.3, s * 0.54, 48), FC.sus); fl.position.z = 0; g.add(fl);
      g.add(torusZ(s * 0.54, s * 0.018, FC.sus, 0));
      const pipe = tubeZ(s * 0.3, s * 0.3, s * 0.35, FC.sus, 32); pipe.position.z = -s * 0.175; g.add(pipe);
      const dome = new T.Mesh(new T.SphereGeometry(R, 40, 20, 0, PI, 0, PI * 0.68), FC.sus); g.add(dome);
      g.add(torusZ(R, s * 0.02, FC.sus, s * 0.01));
      const louv = new T.Group();
      for (let i = 0; i < 9; i++) { const y = -s * 0.24 + i * s * 0.055, w = 2 * Math.sqrt(Math.max(0, (s * 0.29) ** 2 - y * y)); const sl = box(w, s * 0.012, s * 0.04, FC.galv); sl.position.y = y; sl.rotation.x = 0.6; louv.add(sl); }
      louv.position.z = s * 0.03; g.add(louv);
      g.add(discZ(s * 0.3, FC.shade, s * 0.005));
      rotor = null;
    } else if (kind === 'sirocoBox') {
      // 소형·미니 시로코팬(TFB, 쇼룸): 연회녹 닫힌 상자, 앞면 위쪽 큰 원형 토출 칼라, 옆면(+x) 흡입 칼라, 반대쪽 모터 돌출
      const m = fmat(0xb3bcb1, 0.35, 0.42, { env: 0.75 }), W = s * 0.62, H = s * 0.95, D = s * 0.85, t = s * 0.012;
      [-1, 1].forEach(k => { const p = box(W, t, D, m); p.position.y = k * H / 2; g.add(p); });
      g.add(edgeFrame(W, H, D, s * 0.018, m));
      const cr = W * 0.43, cy = H / 2 - cr - s * 0.06;
      const front = plate(W, H, [{ r: cr, y: cy }], t, m); front.position.z = D / 2; g.add(front);
      const backP = box(W, H, t, m); backP.position.z = -D / 2; g.add(backP);
      const col = tubeZ(cr, cr, s * 0.1, m, 48); col.position.set(0, cy, D / 2 + s * 0.05); g.add(col);
      const lip = torusZ(cr + s * 0.006, s * 0.014, m, D / 2 + s * 0.1); lip.position.y = cy; g.add(lip);
      const fl = new T.Mesh(new T.RingGeometry(cr, cr + s * 0.035, 48), m); fl.position.set(0, cy, D / 2 + s * 0.008); g.add(fl);
      const inner = discZ(cr * 0.98, FC.shade, D / 2 - s * 0.25); inner.position.y = cy; g.add(inner);
      // 옆면(+x) 흡입판 + 칼라 + 안쪽 드럼
      const ir = s * 0.2, iz = -s * 0.04, iy = -s * 0.06;
      const sp = rectPlateX(-D / 2, D / 2, -H / 2, H / 2, [{ u: iz, v: iy, r: ir }], t, m, 0); sp.position.x = W / 2; g.add(sp);
      const ic = cyl(ir, ir, s * 0.07, m, 40, true); ic.rotation.z = PI / 2; ic.position.set(W / 2 + s * 0.035, iy, iz); g.add(ic);
      const it = new T.Mesh(new T.TorusGeometry(ir, s * 0.012, 6, 48), m); it.rotation.y = PI / 2; it.position.set(W / 2 + s * 0.07, iy, iz); g.add(it);
      const holder = new T.Group(); holder.rotation.y = -PI / 2; holder.position.set(0, iy, iz); g.add(holder);
      const imp = sirocoDrum(ir * 0.92, W * 0.75, 36, FC.galvLight, FC.galv, FC.shade); holder.add(imp); rotor = spinLink(imp, 'z');
      const sp2 = box(t, H, D, m); sp2.position.x = -W / 2; g.add(sp2);
      const mot = cyl(s * 0.14, s * 0.14, s * 0.07, m, 32); mot.rotation.z = PI / 2; mot.position.set(-W / 2 - s * 0.035, iy, iz); g.add(mot);
      // 리벳·긴 구멍
      const rv = []; for (let i = 0; i < 6; i++) rv.push([-D / 2 + s * 0.05 + i * (D - s * 0.1) / 5, H / 2 - s * 0.03], [-D / 2 + s * 0.05 + i * (D - s * 0.1) / 5, -H / 2 + s * 0.03]);
      g.add(boltsX(rv, s * 0.009, FC.galvLight, W / 2 + t));
      [-1, 1].forEach(k => { const sl = box(s * 0.004, s * 0.025, s * 0.06, FC.shade); sl.position.set(W / 2 + t, k * (H / 2 - s * 0.12), -D / 2 + s * 0.08); g.add(sl); });
    } else if (kind === 'propSmall' || kind === 'propBarn') {
      const barn = kind === 'propBarn';
      if (!barn) {
        // 소형 고압팬(쇼룸): 엠보싱 아연도 판 + 3엽 + 뒤쪽 U자 모터 브래킷 + 동심원 가드(X 와이어)
        const R = s * 0.4, pm = fmat(0xd1d6db, 0.7, 0.36);
        g.add(plate(s, s, [{ r: R + s * 0.01 }], s * 0.014, pm, s * 0.02));
        g.add(latheZ([[R + s * 0.06, s * 0.012], [R + s * 0.03, s * 0.022], [R + s * 0.012, s * 0.01], [R + s * 0.01, -s * 0.07]], pm));
        // 가장자리 엠보싱 홈(사각 링) + 모서리 볼트
        [[0, s * 0.42, s * 0.62, s * 0.03], [0, -s * 0.42, s * 0.62, s * 0.03]].forEach(([x, y, w, h]) => { const b = box(w, h, s * 0.012, pm); b.position.set(x, y, s * 0.012); g.add(b); });
        [-1, 1].forEach(k => { const b = box(s * 0.03, s * 0.62, s * 0.012, pm); b.position.set(k * s * 0.42, 0, s * 0.012); g.add(b); });
        [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1]].forEach(([a, b]) => { const bo = cyl(s * 0.012, s * 0.012, s * 0.016, FC.galvLight, 8); bo.rotation.x = PI / 2; bo.position.set(a * s * 0.4, b * s * 0.4, s * 0.014); g.add(bo); });
        rotor = blades({ n: 3, r0: s * 0.06, r1: R * 0.95, w0: s * 0.08, w1: s * 0.3, sweep: s * 0.08, pitch: 0.42, m: FC.alu, hubR: s * 0.05, hubLen: s * 0.05, cap: 0.5 });
        rotor.position.z = -s * 0.03; g.add(rotor);
        // U자 브래킷 (위·아래에서 뒤로)
        const bm = fmat(0xc9ced3, 0.6, 0.4), bz = -s * 0.3;
        [-1, 1].forEach(k => { const a = box(s * 0.035, s * 0.012, -bz, bm); a.position.set(0, k * s * 0.44, bz / 2); g.add(a); });
        const v = box(s * 0.035, s * 0.88, s * 0.012, bm); v.position.z = bz - s * 0.01; g.add(v);
        const mot = tubeZ(s * 0.08, s * 0.08, s * 0.12, fmat(0x9aa2aa, 0.6, 0.4), 24, false); mot.position.z = bz + s * 0.07; g.add(mot);
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, f = box(s * 0.012, s * 0.03, s * 0.1, fmat(0x9aa2aa, 0.6, 0.4)); f.position.set(Math.cos(a) * s * 0.09, Math.sin(a) * s * 0.09, bz + s * 0.07); f.rotation.z = a; g.add(f); }
        const gd = guard(R * 0.98, 5, 4, FC.wire, s * 0.004, s * 0.06); gd.position.z = -s * 0.16; g.add(gd);
        [PI / 4, -PI / 4].forEach(a => { const w = box(s * 0.006, s * 0.9, s * 0.006, FC.wire); w.rotation.z = a; w.position.z = -s * 0.16; g.add(w); });
      } else {
        // 대형 고압팬_축사용팬(쇼룸): 진회색 해머톤 둥근 사각 판, 모서리 X 리브, 스테인리스 4엽(리브), 뒤쪽 가드
        const ham = fmat(0x55595f, 0.55, 0.62, { env: 0.8 });
        const pf = propFan(s, { plate: ham, blade: FC.sus, n: 4, w1: s * 0.3, sweep: s * 0.06, pitch: 0.42, motor: FC.graphite });
        g.add(pf.g); rotor = pf.rot;
        [PI / 4, 3 * PI / 4, -PI / 4, -3 * PI / 4].forEach(a => { const r = box(s * 0.16, s * 0.02, s * 0.02, ham); r.position.set(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46, s * 0.016); r.rotation.z = a; g.add(r); });
        for (let i = 0; i < 4; i++) { const rib = box(s * 0.02, s * 0.22, s * 0.006, FC.galv); const a = new T.Group(); rib.position.set(-s * 0.04, s * 0.27, s * 0.004); rib.rotation.y = 0.42; a.add(rib); a.rotation.z = i / 4 * TAU; rotor.add(a); }
      }
    } else if (kind === 'shutterBox') {
      // 셔터 / 풍압식 개폐장치: 올리브 도장 사각 틀 + 알루미늄 중력식 루버 (가동 시 열림)
      const m = fmat(0x76836a, 0.3, 0.5, { env: 0.6 }), d = s * 0.16;
      g.add(plate(s * 1.12, s * 1.12, [{ w: s * 0.92, h: s * 0.92 }], s * 0.014, m));
      [[0, s * 0.46, s * 0.92, s * 0.012, d], [0, -s * 0.46, s * 0.92, s * 0.012, d]].forEach(([x, y, w, h, dd]) => { const b = box(w, h, dd, m); b.position.set(x, y, -dd / 2); g.add(b); });
      [-1, 1].forEach(k => { const b = box(s * 0.012, s * 0.92, d, m); b.position.set(k * s * 0.46, 0, -d / 2); g.add(b); });
      const sl = new T.Group(); sl.name = 'shutter'; const nS = 6;
      for (let i = 0; i < nS; i++) {
        const piv = new T.Group(); piv.position.set(0, s * 0.45 - i * s * 0.9 / nS, s * 0.012);
        const slat = box(s * 0.9, s * 0.9 / nS * 1.1, s * 0.006, FC.alu); slat.position.y = -s * 0.9 / nS / 2; slat.rotation.x = -0.55; piv.add(slat); sl.add(piv);
      }
      g.add(sl);
      const lab = box(s * 0.12, s * 0.04, s * 0.004, FC.red); lab.position.set(s * 0.32, s * 0.52, s * 0.009); g.add(lab);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const h = cyl(s * 0.012, s * 0.012, s * 0.016, FC.shade, 8); h.rotation.x = PI / 2; h.position.set(a * s * 0.52, b * s * 0.52, s * 0.008); g.add(h); });
    } else if (kind === 'controllerBox' || kind === 'controllerPanel') {
      // 제어기(회색 함, 디지털 표시창·슬라이더·버튼) / 위상 제어기(흰 함, 표시창)
      const panel = kind === 'controllerPanel', W = s * 0.62, H = s * 0.9, D = s * 0.2;
      const tex = panelTex((x, w, h) => {
        x.fillStyle = panel ? '#f2f3f4' : '#c9ced3'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#e9ecef'; x.fillRect(14, 14, w - 28, h - 28);
        x.fillStyle = '#20252b'; x.font = 'bold 15px sans-serif'; x.fillText(panel ? '위상 제어기 FFC-8K' : '디지털 환풍 제어기', 26, 40);
        [[24, 56], [134, 56]].forEach(([px, py]) => { x.fillStyle = '#111'; x.fillRect(px, py, 96, 44); x.fillStyle = '#ff3b30'; x.font = 'bold 30px monospace'; x.fillText(panel ? '50' : '28', px + 22, py + 34); });
        if (!panel) for (let i = 0; i < 10; i++) { x.fillStyle = '#5b6168'; x.fillRect(40 + i * 18, 150, 6, 50 - i * 2); x.fillStyle = '#20252b'; x.fillRect(36 + i * 18, 186 - i * 3, 14, 6); }
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { x.fillStyle = r === 0 && c === 3 ? '#d7262b' : '#dfe3e7'; x.beginPath(); x.arc(70 + c * 40, (panel ? 150 : 236) + r * 34, 11, 0, TAU); x.fill(); x.strokeStyle = '#8a9096'; x.stroke(); }
        x.fillStyle = '#ffffff'; x.fillRect(40, h - 70, w - 80, 40); x.fillStyle = '#1d4fb8'; x.font = 'bold 26px sans-serif'; x.fillText('Fanzic', w / 2 - 44, h - 42);
      });
      const side = fmat(panel ? 0xf0f1f2 : 0xc3c8cd, panel ? 0.1 : 0.6, 0.4);
      const front = new T.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1 });
      const bx = new T.Mesh(new T.BoxGeometry(W, H, D), [side, side, side, side, front, side]); g.add(bx);
      [-1, 1].forEach(k => { const r = box(s * 0.02, H * 1.02, D * 1.04, side); r.position.x = k * (W / 2 + s * 0.005); g.add(r); });
      const cab = cyl(s * 0.02, s * 0.02, s * 0.06, FC.black, 10); cab.position.set(W * 0.3, -H / 2 - s * 0.03, 0); g.add(cab);
    } else if (kind === 'boxMesh' || kind === 'sleeveGuard') {
      // 주차장팬(쇼룸 철망 박스): 아연도 상자 + 앞면 확장 철망 문 2짝·가운데 기둥 + 안쪽 큰 날개 / 슬리브·가드박스: 깊은 슬리브 틀 + 철망 가드
      const guardOnly = kind === 'sleeveGuard', W = s, H = s * 1.02, D = guardOnly ? s * 0.32 : s * 0.5, t = s * 0.015, gm = FC.galv;
      [-1, 1].forEach(k => { const p = box(W, t, D, gm); p.position.set(0, k * H / 2, -D / 2); g.add(p); const q = box(t, H, D, gm); q.position.set(k * W / 2, 0, -D / 2); g.add(q); });
      g.add(squareFrame(W + t, W * 0.94, s * 0.03, gm));
      const mp = meshPanel(W * 0.92, H * 0.92, guardOnly ? 'perf' : 'diamond', 0xc9cfd5, 9); mp.position.z = s * 0.012; g.add(mp);
      if (!guardOnly) {
        const post = box(s * 0.05, H * 0.94, s * 0.02, gm); post.position.z = s * 0.02; g.add(post);
        [-1, 1].forEach(k => { const f = box(s * 0.02, H * 0.92, s * 0.02, gm); f.position.set(k * W * 0.46, 0, s * 0.02); g.add(f); });
        const warn = box(s * 0.035, s * 0.22, s * 0.004, FC.yellow); warn.position.set(0, s * 0.1, s * 0.031); g.add(warn);
        const part = plate(W, H, [{ r: s * 0.46 }], t, gm); part.position.z = -D * 0.55; g.add(part);
        g.add(latheZ([[s * 0.46, -D * 0.55], [s * 0.455, -D * 0.7], [s * 0.455, -D * 0.85]], gm));
        rotor = blades({ n: 4, r0: s * 0.07, r1: s * 0.44, w0: s * 0.08, w1: s * 0.26, sweep: s * 0.1, pitch: 0.45, m: FC.sus, hubR: s * 0.07, hubLen: s * 0.06, cap: 0.5 });
        rotor.position.z = -D * 0.62; g.add(rotor);
        const mot = tubeZ(s * 0.08, s * 0.08, s * 0.16, FC.graphite, 24, false); mot.position.z = -D * 0.9; g.add(mot);
        const jb = box(s * 0.04, s * 0.14, s * 0.12, gm); jb.position.set(W / 2 + s * 0.02, s * 0.3, -D * 0.3); g.add(jb);
        const back = guard(s * 0.45, 6, 8, FC.wire, s * 0.003); back.position.z = -D; g.add(back);
      } else {
        const rail = box(W * 1.06, s * 0.05, s * 0.2, gm); rail.position.set(0, -H / 2 - s * 0.03, -D - s * 0.1); g.add(rail);
        [-1, 1].forEach(k => { const p = box(s * 0.05, H, s * 0.2, gm); p.position.set(k * (W / 2 + s * 0.03), 0, -D - s * 0.1); g.add(p); });
        const top = box(W * 1.06, s * 0.05, s * 0.2, gm); top.position.set(0, H / 2 + s * 0.03, -D - s * 0.1); g.add(top);
      }
    } else if (kind === 'vaneAxial') {
      // 덕트팬(쇼룸 베인 축류): 연회녹 원통 + 양끝 볼트 플랜지, 앞쪽 검정 나선 가드 + 빨간 팬직 배지, 5엽, 위 L브래킷 2개, 아래 검정 받침
      const m = fmat(0xc4ccc4, 0.25, 0.4, { env: 0.75 }), r = s * 0.5, L = s * 0.72;
      g.add(tubeZ(r, r, L, m, 56));
      [-1, 1].forEach(k => {
        const fl = new T.Mesh(new T.RingGeometry(r, r + s * 0.07, 56), m); fl.position.z = k * L / 2; g.add(fl);
        g.add(torusZ(r + s * 0.07, s * 0.008, m, k * L / 2));
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, h = discZ(s * 0.012, FC.shade, k * L / 2 + k * 0.001); h.position.x = Math.cos(a) * (r + s * 0.04); h.position.y = Math.sin(a) * (r + s * 0.04); if (k < 0) h.rotation.y = PI; g.add(h); }
      });
      const gd = guard(r * 0.98, 13, 8, FC.black, s * 0.0045, r * 0.16); gd.position.z = L / 2 + s * 0.03; g.add(gd);
      const badge = discZ(r * 0.15, FC.red, L / 2 + s * 0.036); g.add(badge);
      const bring = new T.Mesh(new T.RingGeometry(r * 0.15, r * 0.19, 32), FC.black); bring.position.z = L / 2 + s * 0.035; g.add(bring);
      rotor = blades({ n: 5, r0: s * 0.12, r1: r * 0.94, w0: s * 0.14, w1: s * 0.26, sweep: s * 0.06, pitch: 0.5, m: FC.graphite, hubR: s * 0.13, hubLen: s * 0.1, hubMat: FC.graphite });
      rotor.position.z = L * 0.15; g.add(rotor);
      const mot = tubeZ(s * 0.16, s * 0.16, L * 0.45, FC.graphite, 28, false); mot.position.z = -L * 0.1; g.add(mot);
      [-1, 1].forEach(k => { const lb = box(s * 0.09, s * 0.012, s * 0.08, FC.graphite); lb.position.set(0, r + s * 0.08, k * L * 0.2); g.add(lb); const lv = box(s * 0.09, s * 0.08, s * 0.012, FC.graphite); lv.position.set(0, r + s * 0.04, k * L * 0.2 - s * 0.04); g.add(lv); });
      const base = box(s * 0.5, s * 0.12, L * 0.6, FC.black); base.position.y = -r - s * 0.05; g.add(base);
    } else if (kind === 'portableDrum') {
      // 포터블팬 TFT-20(쇼룸): 노란 원통 + 위쪽 검정 손잡이 + 앞뒤 나선 가드 + 아래 노란 U자 다리 2개
      const ym = fmat(0xf2c200, 0.3, 0.32, { env: 0.8 }), r = s * 0.5, L = s * 1.25;
      g.add(tubeZ(r, r, L, ym, 48));
      [-1, 1].forEach(k => g.add(torusZ(r, s * 0.025, ym, k * L / 2)));
      [-1, 1].forEach(k => { const gd = guard(r * 0.93, 8, 6, FC.sus, s * 0.006, r * 0.14); gd.position.z = k * (L / 2 - s * 0.04); g.add(gd); });
      const badge = box(r * 0.55, r * 0.16, s * 0.01, FC.galvLight); badge.position.z = L / 2 - s * 0.03; g.add(badge);
      rotor = blades({ n: 5, r0: s * 0.12, r1: r * 0.9, w0: s * 0.12, w1: s * 0.32, sweep: s * 0.1, pitch: 0.5, m: FC.alu, hubR: s * 0.12, hubLen: s * 0.1, cap: 0.4 });
      rotor.position.z = L * 0.12; g.add(rotor);
      const mot = tubeZ(s * 0.18, s * 0.18, L * 0.35, FC.graphite, 24, false); mot.position.z = -L * 0.12; g.add(mot);
      // 손잡이: 두 받침 + 휘어진 손잡이 봉
      [-1, 1].forEach(k => { const b = box(s * 0.12, s * 0.09, s * 0.16, FC.black); b.position.set(0, r + s * 0.03, k * L * 0.3); g.add(b); });
      const hc = new T.CatmullRomCurve3([new T.Vector3(0, r + s * 0.07, -L * 0.3), new T.Vector3(0, r + s * 0.17, -L * 0.22), new T.Vector3(0, r + s * 0.18, L * 0.22), new T.Vector3(0, r + s * 0.07, L * 0.3)]);
      g.add(new T.Mesh(new T.TubeGeometry(hc, 24, s * 0.035, 10, false), FC.black));
      const sw = box(s * 0.04, s * 0.05, s * 0.03, FC.sus); sw.position.set(0, r + s * 0.08, L * 0.12); g.add(sw);
      // 옆 라벨
      const lab = box(s * 0.006, s * 0.42, s * 0.5, FC.white); lab.position.set(r + s * 0.002, 0, -s * 0.05); lab.rotation.z = 0; g.add(lab);
      const lr = box(s * 0.007, s * 0.1, s * 0.5, FC.red); lr.position.set(r + s * 0.004, s * 0.16, -s * 0.05); g.add(lr);
      // U자 다리
      [-1, 1].forEach(k => {
        const c = new T.CatmullRomCurve3([new T.Vector3(-r * 0.75, -r * 0.6, k * L * 0.27), new T.Vector3(-r * 0.62, -r - s * 0.18, k * L * 0.3), new T.Vector3(0, -r - s * 0.22, k * L * 0.31), new T.Vector3(r * 0.62, -r - s * 0.18, k * L * 0.3), new T.Vector3(r * 0.75, -r * 0.6, k * L * 0.27)]);
        g.add(new T.Mesh(new T.TubeGeometry(c, 24, s * 0.035, 8, false), ym));
      });
    } else if (kind === 'ceilventRing' || kind === 'ceilventPlain') {
      // 실링팬 2(동심원 루버 그릴) / 플라스틱팬(매끈한 흰 판): 천장 사각 패널 + 검정 원형 덕트 접속구
      axis = 'y';
      const ring = kind === 'ceilventRing';
      const pan = new T.Mesh(new T.CylinderGeometry(s * 0.707, s * 0.69, s * 0.04, 4, 1), FC.white); pan.rotation.y = PI / 4; pan.position.y = -s * 0.02; g.add(pan);
      if (ring) {
        for (let i = 0; i < 4; i++) { const rr = s * (0.12 + i * 0.075); const t = new T.Mesh(new T.TorusGeometry(rr, s * 0.012, 6, 48), FC.white); t.rotation.x = PI / 2; t.position.y = -s * 0.05 - (3 - i) * s * 0.006; g.add(t); }
        const gap = cyl(s * 0.4, s * 0.4, s * 0.004, fmat(0xc9cdd1, 0.05, 0.6, { env: 0.3 }), 48); gap.position.y = -s * 0.041; g.add(gap);
        const cap = cyl(s * 0.09, s * 0.09, s * 0.02, FC.white, 32); cap.position.y = -s * 0.07; g.add(cap);
      } else {
        const bulge = new T.Mesh(new T.CylinderGeometry(s * 0.69, s * 0.6, s * 0.02, 4, 1), FC.white); bulge.rotation.y = PI / 4; bulge.position.y = -s * 0.05; g.add(bulge);
        const led = cyl(s * 0.008, s * 0.008, s * 0.004, new T.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1 }), 12); led.position.set(-s * 0.3, -s * 0.062, s * 0.3); g.add(led);
      }
      const housing = box(s * 0.68, s * 0.22, s * 0.68, FC.galvLight); housing.position.y = s * 0.11; g.add(housing);
      const col = cyl(s * 0.17, s * 0.17, s * 0.22, FC.black, 32, true); col.rotation.z = PI / 2; col.position.set(s * 0.44, s * 0.12, 0); g.add(col);
      rotor = new T.Group(); for (let i = 0; i < 6; i++) { const b = box(s * 0.22, 0.01, s * 0.06, MAT.bladeDark); b.position.x = s * 0.12; const a = new T.Group(); a.add(b); a.rotation.y = i / 6 * TAU; rotor.add(a); }
      rotor.position.y = s * 0.1; g.add(rotor);
    } else if (kind === 'plasticWall') {
      // 플라스틱 환풍기: 흰 사각 틀 + 둥근 개구부의 휘어진 고정 그릴(실내 쪽 -z) + 뒤쪽 날개
      const m = FC.white, r = s * 0.36;
      const fr = plate(s, s, [{ r }], s * 0.05, m, s * 0.04); fr.position.z = -s * 0.03; g.add(fr);
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, v = box(s * 0.012, r * 0.82, s * 0.04, m); const ag = new T.Group(); v.position.y = r * 0.5; v.rotation.z = 0.5; ag.add(v); ag.rotation.z = a; ag.position.z = -s * 0.05; g.add(ag); }
      g.add(torusZ(r * 0.95, s * 0.012, m, -s * 0.05)); g.add(torusZ(r * 0.18, s * 0.02, m, -s * 0.05));
      const hub = discZ(r * 0.18, m, -s * 0.058); hub.rotation.y = PI; g.add(hub);
      const logo = box(s * 0.12, s * 0.03, s * 0.004, FC.shade); logo.position.set(s * 0.28, -s * 0.42, -s * 0.057); g.add(logo);
      g.add(tubeZ(r * 1.02, r * 1.02, s * 0.2, FC.white, 40)); g.children[g.children.length - 1].position.z = s * 0.08;
      rotor = blades({ n: 5, r0: s * 0.06, r1: r * 0.95, w0: s * 0.08, w1: s * 0.16, sweep: s * 0.05, pitch: 0.5, m: FC.pipeBlade, hubR: s * 0.07, hubLen: s * 0.06, hubMat: FC.white });
      rotor.position.z = s * 0.03; g.add(rotor);
    } else if (kind === 'aspirator') {
      // 흡출기 TFC-F17(쇼룸): 아연도 배관 + 플랜지 링 + 띠 프레임 안 원심 임펠러 + 위쪽 루버 돌기가 있는 둥근 후드
      axis = 'y';
      const m = fmat(0xcfd4d9, 0.75, 0.36), r = s * 0.42;
      const pipe = cyl(s * 0.25, s * 0.25, s * 0.34, m, 40); pipe.position.y = s * 0.17; g.add(pipe);
      const fl = cyl(r * 1.08, r * 1.08, s * 0.02, m, 48); fl.position.y = s * 0.34; g.add(fl);
      const top = cyl(r * 1.02, r * 1.02, s * 0.04, m, 48); top.position.y = s * 0.66; g.add(top);
      const cone = cyl(r * 0.5, s * 0.25, s * 0.14, FC.galv, 32); cone.position.y = s * 0.42; g.add(cone);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, st = box(s * 0.07, s * 0.3, s * 0.012, m); st.position.set(Math.cos(a) * r * 1.05, s * 0.5, Math.sin(a) * r * 1.05); st.rotation.y = -a + PI / 2; g.add(st); }
      rotor = new T.Group();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, b = box(s * 0.2, s * 0.2, s * 0.01, FC.sus); b.position.set(Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55); b.rotation.y = -a + 0.6; rotor.add(b); }
      const disc = cyl(r * 0.8, r * 0.8, s * 0.01, FC.sus, 40); disc.position.y = s * 0.1; rotor.add(disc);
      rotor.position.y = s * 0.5; g.add(rotor);
      const hood = cyl(r * 0.8, r * 0.84, s * 0.34, m, 48); hood.position.y = s * 0.85; g.add(hood);
      const dome = new T.Mesh(new T.SphereGeometry(r * 0.8, 32, 8, 0, TAU, 0, PI * 0.5), m); dome.scale.y = 0.18; dome.position.y = s * 1.02; g.add(dome);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const a = i / 4 * TAU + 0.4, lv = box(s * 0.24, s * 0.04, s * 0.05, m); lv.position.set(Math.cos(a) * r * 0.83, s * 0.76 + j * s * 0.075, Math.sin(a) * r * 0.83); lv.rotation.y = -a + PI / 2; g.add(lv); }
    } else if (kind === 'roofEC') {
      // 루프팬 EC(TFR): 사각 받침 플랜지 + 경사진 몸체 + 윗면 격자 그릴 + 옆 제어함 (토출 = 위)
      axis = 'y';
      const m = fmat(0xe7eaed, 0.45, 0.38), W = s * 1.2;
      const base = box(W * 0.98, s * 0.03, W * 0.98, m); base.position.y = s * 0.015; g.add(base);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const br = box(s * 0.06, s * 0.08, s * 0.06, FC.galv); br.position.set(a * W * 0.36, s * 0.06, b * W * 0.36); g.add(br); });
      const body = new T.Mesh(new T.CylinderGeometry(W * 0.68, W * 0.44, s * 0.4, 4, 1), m); body.rotation.y = PI / 4; body.position.y = s * 0.275; g.add(body);
      const rim = box(W * 0.92, s * 0.05, W * 0.92, m); rim.position.y = s * 0.5; g.add(rim);
      const gr = grid(W * 0.8, W * 0.8, 16, 16, FC.galv, s * 0.012); gr.rotation.x = -PI / 2; gr.position.y = s * 0.53; g.add(gr);
      const sh = box(W * 0.8, s * 0.004, W * 0.8, FC.shade); sh.position.y = s * 0.42; g.add(sh);
      rotor = new T.Group(); for (let i = 0; i < 7; i++) { const b = box(s * 0.3, s * 0.06, s * 0.01, FC.alu); b.position.x = s * 0.18; const a = new T.Group(); a.add(b); a.rotation.y = i / 7 * TAU; rotor.add(a); }
      rotor.position.y = s * 0.46; g.add(rotor);
      const cb = box(s * 0.26, s * 0.14, s * 0.05, m); cb.position.set(-W * 0.18, s * 0.3, W * 0.3); cb.rotation.x = -0.55; g.add(cb);
      const disp = box(s * 0.12, s * 0.05, s * 0.01, FC.black); disp.position.set(-W * 0.2, s * 0.31, W * 0.32); disp.rotation.x = -0.55; g.add(disp);
      const lab = box(s * 0.18, s * 0.04, s * 0.01, FC.blue); lab.position.set(W * 0.22, s * 0.25, W * 0.29); lab.rotation.x = -0.55; g.add(lab);
    } else if (kind === 'hangerBox') {
      // 행거팬(TFN): 아연도 사각 케이스, 앞면(+z) 두 토출구 안 양흡 드럼, 위 행거 탭 4개, 옆 모터·벨트 커버
      const W = s, H = s * 0.42, D = s * 0.75, t = s * 0.012, m = FC.galv;
      [-1, 1].forEach(k => { const p = box(W, t, D, m); p.position.y = k * H / 2; g.add(p); const q = box(t, H, D, m); q.position.x = k * W / 2; g.add(q); });
      g.add(edgeFrame(W, H, D, s * 0.02, m));
      const ow = W * 0.36, oh = H * 0.62, holes = [{ x: -W * 0.22, y: s * 0.02, w: ow, h: oh }, { x: W * 0.22, y: s * 0.02, w: ow, h: oh }];
      const fp = plate(W, H, holes, t, m); fp.position.z = D / 2; g.add(fp);
      const bp = box(W, H, t, m); bp.position.z = -D / 2; g.add(bp);
      const inner = box(W * 0.96, H * 0.9, t, FC.shade); inner.position.z = -D / 2 + s * 0.02; g.add(inner);
      const holderA = new T.Group(); holderA.rotation.y = -PI / 2; holderA.position.set(0, -s * 0.01, s * 0.05); g.add(holderA);
      const imp = new T.Group(); holderA.add(imp);
      [-1, 1].forEach(k => { const d = sirocoDrum(H * 0.3, ow * 0.9, 32, FC.galvLight, FC.galv, FC.shade); d.position.z = -k * W * 0.22; imp.add(d); });
      rotor = spinLink(imp, 'z');
      holes.forEach(q => { [-1, 1].forEach(k => { const b = box(q.w + s * 0.03, s * 0.02, s * 0.04, m); b.position.set(q.x, q.y + k * q.h / 2, D / 2 + s * 0.02); g.add(b); const c = box(s * 0.02, q.h, s * 0.04, m); c.position.set(q.x + k * q.w / 2, q.y, D / 2 + s * 0.02); g.add(c); }); });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const tab = box(s * 0.08, s * 0.06, s * 0.012, m); tab.position.set(a * (W / 2 - s * 0.06), H / 2 + s * 0.03, b * (D / 2 - s * 0.06)); g.add(tab); const rod = cyl(s * 0.008, s * 0.008, s * 0.12, FC.wire, 6); rod.position.set(a * (W / 2 - s * 0.06), H / 2 + s * 0.09, b * (D / 2 - s * 0.06)); g.add(rod); });
      const jb = box(s * 0.03, s * 0.1, s * 0.12, FC.galvLight); jb.position.set(W / 2 + s * 0.02, 0, -D * 0.2); g.add(jb);
      [-1, 1].forEach(k => { const fb = box(s * 0.06, s * 0.03, s * 0.12, m); fb.position.set(k * (W / 2 + s * 0.03), -H / 2 + s * 0.02, D / 2 - s * 0.08); g.add(fb); });
    } else if (kind === 'standFan') {
      // 산업용 선풍기 TFE-F45: 주황 날개 + 흰 철망 가드(앞뒤) + 주황 배지 + 흰 모터 + 기둥·삼각 받침
      const r = s * 0.5, wm = FC.white;
      const gF = guard(r, 9, 18, wm, s * 0.004, r * 0.12); gF.position.z = s * 0.1; g.add(gF);
      const gB = guard(r, 7, 18, wm, s * 0.004, r * 0.2); gB.position.z = -s * 0.08; g.add(gB);
      g.add(torusZ(r, s * 0.012, wm, s * 0.01));
      const badge = discZ(r * 0.14, FC.orange, s * 0.104); g.add(badge);
      rotor = blades({ n: 4, r0: s * 0.06, r1: r * 0.92, w0: s * 0.1, w1: s * 0.36, sweep: s * 0.08, pitch: 0.38, m: FC.orange, hubR: s * 0.07, hubLen: s * 0.05, hubMat: FC.orange });
      rotor.position.z = s * 0.02; g.add(rotor);
      const mot = tubeZ(s * 0.13, s * 0.15, s * 0.26, wm, 28, false); mot.position.z = -s * 0.22; g.add(mot);
      const pole = cyl(s * 0.03, s * 0.03, s * 1.6, wm, 12); pole.position.set(0, -s * 0.85, -s * 0.2); g.add(pole);
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + PI / 2; g.add(tubeBetween(new T.Vector3(0, -s * 1.3, -s * 0.2), new T.Vector3(Math.cos(a) * s * 0.55, -s * 1.65, -s * 0.2 + Math.sin(a) * s * 0.55), s * 0.025, wm)); }
    } else if (kind === 'hvlsBldc') {
      // BLDC 대형실링팬: 흰 다운로드 + 와이어 고정 + 납작한 원반 모터(방열 리브) + 6날개
      axis = 'y';
      const R = s / 2;
      const top = box(0.36, 0.04, 0.36, FC.galvLight); top.position.y = 1.78; g.add(top);
      const rod = box(0.12, 1.4, 0.12, FC.white); rod.position.y = 1.06; g.add(rod);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; g.add(tubeBetween(new T.Vector3(0, 0.55, 0), new T.Vector3(Math.cos(a) * 0.9, 1.75, Math.sin(a) * 0.9), 0.008, FC.wire)); }
      const yoke = box(0.2, 0.2, 0.2, FC.galv); yoke.position.y = 0.4; g.add(yoke);
      rotor = new T.Group();
      const disc = cyl(0.56, 0.56, 0.28, FC.galv, 56); rotor.add(disc);
      for (let i = 0; i < 9; i++) { const rib = new T.Mesh(new T.TorusGeometry(0.565, 0.01, 4, 56), FC.galvLight); rib.rotation.x = PI / 2; rib.position.y = -0.11 + i * 0.026; rotor.add(rib); }
      const bot = cyl(0.48, 0.54, 0.05, FC.white, 56); bot.position.y = -0.16; rotor.add(bot);
      const red = cyl(0.08, 0.08, 0.01, FC.red, 16); red.position.y = -0.19; rotor.add(red);
      for (let i = 0; i < 6; i++) {
        const arm = new T.Group(), L = R - 0.35;
        const b = box(L, 0.035, 0.22, MAT.hvlsBlade); b.position.x = 0.35 + L / 2; b.rotation.x = 0.1; arm.add(b);
        const clamp = box(0.3, 0.06, 0.12, FC.galvLight); clamp.position.x = 0.42; arm.add(clamp);
        arm.rotation.y = (i / 6) * TAU; rotor.add(arm);
      }
      rotor.position.y = 0.15; g.add(rotor);
    } else if (kind === 'diffuserSq') {
      // 사각 디퓨져: 흰 사각 판 + 동심 사각 루버 (천장, 면이 아래)
      axis = 'y';
      for (let i = 0; i < 4; i++) { const w = s * (1 - i * 0.2); const fr = squareFrame(w, w - s * 0.06, s * 0.025, FC.white); fr.rotation.x = PI / 2; fr.position.y = -s * 0.02 - i * s * 0.012; g.add(fr); }
      const c = box(s * 0.32, s * 0.02, s * 0.32, FC.white); c.position.y = -s * 0.07; g.add(c);
      const back = box(s * 0.96, s * 0.004, s * 0.96, fmat(0xc9cdd1, 0.05, 0.6, { env: 0.3 })); back.position.y = -s * 0.004; g.add(back);
      const neck = cyl(s * 0.25, s * 0.25, s * 0.15, FC.galvLight, 32, true); neck.position.y = s * 0.08; g.add(neck);
      rotor = new T.Group();
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    return { group: g, rotor, axis };
  };

  /* ---------- 건물 ---------- */
  const roofRise = (site) => site.roof === 'gable' ? Math.min(6, site.dims.W * 0.16) : site.roof === 'arch' ? site.dims.W * 0.3 : 0;
  M.roofRise = roofRise;

  function glassMat(color, op) {
    return new T.MeshStandardMaterial({ color, transparent: true, opacity: op, roughness: 0.3, metalness: 0.1, depthWrite: false, side: T.DoubleSide });
  }
  function edges(mesh, color = 0x5b7fa6, op = 0.55) {
    const e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), new T.LineBasicMaterial({ color, transparent: true, opacity: op }));
    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale);
    return e;
  }

  // mini=true: 디오라마용 불투명 미니어처
  M.building = function (site, mini) {
    const { L, W, H } = site.dims;
    const g = new T.Group();
    const rise = roofRise(site);
    const wallM = mini ? mat(site.tint, { roughness: 0.6 }) : glassMat(0xc5d5e8, 0.13);
    const roofM = mini ? mat(site.roof === 'arch' ? 0xd9f2ec : 0x34506e, { roughness: 0.5, transparent: site.roof === 'arch', opacity: site.roof === 'arch' ? 0.75 : 1 }) : glassMat(0xc5d5e8, 0.07);
    const parts = { walls: [], roof: [] };
    const add = (m, list) => { g.add(m); if (!mini) g.add(edges(m)); if (list) list.push(m); return m; };

    if (site.roof === 'under') {
      // 지하: 바닥 슬래브 + 기둥 + 상부 지면(단면)
      const slab = box(L, 0.3, W, mini ? MAT.concrete : glassMat(0x9aa5b1, 0.08)); slab.position.y = H + 0.15; add(slab, parts.roof);
      const soilM = mat(0x6b5a47, { roughness: 1 });
      const grassM = mat(0x5f8f4e, { roughness: 1 });
      if (mini) {
        const top = box(L, 0.4, W, grassM); top.position.y = H + 0.5; g.add(top);
        const ramp = box(L * 0.18, 0.3, W * 0.22, MAT.concrete); ramp.position.set(-L * 0.38, H + 0.75, W * 0.32); g.add(ramp);
        const wallsMini = box(L, H, W, mat(0x7f8b97)); wallsMini.position.y = H / 2; g.add(wallsMini);
      } else {
        const s1 = box(L + 4, 1.2, 2, soilM); s1.position.set(0, H + 0.9, -W / 2 - 1); g.add(s1);
        const gr = box(L + 4, 0.15, 2, grassM); gr.position.set(0, H + 1.55, -W / 2 - 1); g.add(gr);
      }
    } else if (site.roof === 'arch') {
      const shape = new T.CylinderGeometry(W / 2, W / 2, L, 32, 1, true, 0, Math.PI);
      const arch = new T.Mesh(shape, roofM); arch.rotation.z = Math.PI / 2; arch.rotation.y = 0; arch.scale.set(1, 1, rise / (W / 2));
      arch.rotation.set(0, 0, Math.PI / 2);
      arch.scale.set(rise / (W / 2), 1, 1);
      arch.position.y = H;
      add(arch, parts.roof);
    } else if (site.roof === 'gable') {
      const slope = Math.hypot(W / 2, rise);
      const ang = Math.atan2(rise, W / 2);
      [-1, 1].forEach(sd => {
        const r = box(L + 0.6, 0.15, slope + 0.4, roofM);
        r.position.set(0, H + rise / 2, sd * W / 4);
        r.rotation.x = sd * ang;
        add(r, parts.roof);
      });
      // 박공 삼각벽
      const tri = new T.Shape(); tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, rise); tri.lineTo(-W / 2, 0);
      [-1, 1].forEach(sd => {
        const m = new T.Mesh(new T.ShapeGeometry(tri), wallM);
        m.rotation.y = Math.PI / 2; m.position.set(sd * L / 2, H, 0);
        add(m, parts.walls);
      });
    } else {
      const r = box(L + 0.4, 0.3, W + 0.4, roofM); r.position.y = H + 0.15; add(r, parts.roof);
    }
    if (site.roof !== 'under' || !mini) {
      const t = 0.2;
      const wl = [
        [L, H, t, 0, H / 2, W / 2], [L, H, t, 0, H / 2, -W / 2],
        [t, H, W, L / 2, H / 2, 0], [t, H, W, -L / 2, H / 2, 0]
      ];
      wl.forEach(([w, h, d, x, y, z]) => { const m = box(w, h, d, wallM); m.position.set(x, y, z); add(m, parts.walls); });
    }
    const fl = box(L + (mini ? 0 : 0.4), 0.2, W + (mini ? 0 : 0.4), mini ? MAT.concrete : MAT.floor);
    fl.position.y = -0.1; fl.receiveShadow = true; g.add(fl);
    if (mini && site.roof !== 'under') {
      // 창문 띠
      const winM = new T.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x3d7bd9, emissiveIntensity: 0.5 });
      const band = box(L * 0.92, Math.min(1.2, H * 0.12), 0.05, winM); band.position.set(0, H * 0.62, W / 2 + 0.12); g.add(band);
      const band2 = band.clone(); band2.position.z = -W / 2 - 0.12; g.add(band2);
    }
    g.userData.parts = parts;
    return g;
  };

  /* ---------- 내부 소품 ---------- */
  function inst(geo, m, list, color) {
    const im = new T.InstancedMesh(geo, m, list.length);
    const d = new T.Object3D();
    const c = new T.Color();
    list.forEach((p, i) => {
      d.position.set(p[0], p[1], p[2]); d.rotation.set(0, p[3] || 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
      if (color) { c.setHex(typeof color === 'function' ? color(i) : color); im.setColorAt(i, c); }
    });
    im.instanceMatrix.needsUpdate = true;
    return im;
  }
  function person(color) {
    const g = new T.Group();
    const body = cyl(0.2, 0.22, 1.1, mat(color), 12); body.position.y = 0.75; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.16, 12, 10), mat(0xf1c9a5)); head.position.y = 1.48; g.add(head);
    const hat = new T.Mesh(new T.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.yellow); hat.position.y = 1.52; g.add(hat);
    return g;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const glowM = c => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 });

  M.interior = function (site) {
    const { L, W, H } = site.dims;
    const g = new T.Group();
    const k = site.kind;
    const hs = (site.heatSources || []).map(([x, z, r, a]) => ({ x: x * L, z: z * W, r: r * Math.max(L, W), a }));
    if (k === 'factory') {
      hs.forEach(h => {
        const m = box(6, 3, 4, MAT.dark); m.position.set(h.x, 1.5, h.z); g.add(m);
        const glow = box(5.6, 0.2, 3.6, glowM(0xff7a1a)); glow.position.set(h.x, 3.05, h.z); g.add(glow);
      });
      for (let i = 0; i < 6; i++) { const m = box(3, 2, 2, MAT.navy); m.position.set(-L * 0.4 + i * L * 0.16, 1, W * 0.3); g.add(m); }
      const conv = box(L * 0.7, 0.9, 1.2, MAT.steel); conv.position.set(0, 0.45, 0); g.add(conv);
      for (let i = 0; i < 10; i++) { const p = person(0x2c6bb3); p.position.set(rnd(-L * 0.4, L * 0.4), 0, rnd(-W * 0.35, W * 0.35)); g.add(p); }
    } else if (k === 'logistics') {
      const racks = [], pal = [];
      for (let r = 0; r < 6; r++) for (let i = 0; i < 14; i++) {
        const x = -L * 0.42 + i * L * 0.065, z = -W * 0.38 + r * W * 0.13;
        racks.push([x, 4, z]);
        for (let lv = 0; lv < 4; lv++) pal.push([x, 0.7 + lv * 2, z]);
      }
      g.add(inst(new T.BoxGeometry(5.6, 8, 2.4), new T.MeshStandardMaterial({ color: 0x2f6db5, wireframe: true }), racks));
      g.add(inst(new T.BoxGeometry(5, 1.3, 2), mat(0xffffff), pal, i => [0xc8a26b, 0xd9d2c3, 0x9c7a4f][i % 3]));
      for (let i = 0; i < 6; i++) { const f = box(1.2, 2, 2.4, MAT.yellow); f.position.set(rnd(-L * 0.4, L * 0.4), 1, W * 0.42); g.add(f); }
      for (let i = 0; i < 8; i++) { const p = person(0xe67e22); p.position.set(rnd(-L * 0.4, L * 0.4), 0, rnd(-W * 0.45, W * 0.45)); g.add(p); }
    } else if (k === 'barn') {
      const birds = [];
      for (let i = 0; i < 1700; i++) birds.push([rnd(-L * 0.48, L * 0.48), 0.14, rnd(-W * 0.46, W * 0.46), rnd(0, 6)]);
      const bm = new T.InstancedMesh(new T.SphereGeometry(0.13, 8, 6), mat(0xe9e1d0), birds.length);
      const d = new T.Object3D();
      birds.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.scale.set(1, 0.8, 1.3); d.rotation.y = p[3]; d.updateMatrix(); bm.setMatrixAt(i, d.matrix); });
      g.add(bm);
      [-0.25, 0.25].forEach(z => { const f = cyl(0.06, 0.06, L * 0.95, MAT.red, 8); f.rotation.z = Math.PI / 2; f.position.set(0, 0.45, z * W); g.add(f); });
      const pads = box(0.15, H * 0.7, W * 0.9, mat(0x5b8db8, { transparent: true, opacity: 0.6 })); pads.position.set(-L / 2 + 0.2, H * 0.4, 0); g.add(pads);
    } else if (k === 'greenhouse') {
      const pl = [];
      for (let r = 0; r < 8; r++) for (let i = 0; i < 22; i++) pl.push([-L * 0.44 + i * L * 0.042, 0.7, -W * 0.4 + r * W * 0.115]);
      g.add(inst(new T.BoxGeometry(1.6, 1.4, 0.7), mat(0xffffff, { roughness: 0.8 }), pl, i => [0x3f9b52, 0x4eae5f, 0x358c46][i % 3]));
      const fr = []; for (let i = 0; i < 40; i++) fr.push([rnd(-L * 0.44, L * 0.44), rnd(0.4, 1.3), -W * 0.4 + Math.floor(rnd(0, 8)) * W * 0.115 + 0.38]);
      g.add(inst(new T.SphereGeometry(0.12, 8, 6), mat(0xe2412b), fr));
      const pads = box(0.15, H * 0.6, W * 0.9, mat(0x5b8db8, { transparent: true, opacity: 0.6 })); pads.position.set(-L / 2 + 0.2, H * 0.35, 0); g.add(pads);
    } else if (k === 'parking') {
      const cols = [];
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) cols.push([-L / 2 + i * L / 8, H / 2, -W / 2 + j * W / 4]);
      g.add(inst(new T.BoxGeometry(0.7, H, 0.7), MAT.concrete, cols));
      const cars = [];
      for (let r = 0; r < 4; r++) for (let i = 0; i < 28; i++) if (Math.random() > 0.3) cars.push([-L * 0.46 + i * L * 0.034, 0.7, -W * 0.36 + r * W * 0.24 + (r % 2 ? -2.2 : 2.2)]);
      g.add(inst(new T.BoxGeometry(1.9, 1.4, 4.4), mat(0xffffff, { metalness: 0.5, roughness: 0.35 }), cars, i => [0xdfe3e8, 0x1f2a36, 0x9b1c22, 0x2d5c99, 0x8a939d][i % 5]));
      const lines = box(L * 0.95, 0.02, 0.15, mat(0xf2d64b)); lines.position.y = 0.02; g.add(lines);
    } else if (k === 'kitchen') {
      const st = box(L * 0.6, 0.9, 1.4, MAT.metal); st.position.set(0, 0.45, -W * 0.3); g.add(st);
      for (let i = 0; i < 4; i++) { const f = cyl(0.35, 0.35, 0.1, glowM(0xff5a1f), 16); f.position.set(-L * 0.24 + i * L * 0.16, 0.95, -W * 0.3); g.add(f); }
      const hood = box(L * 0.66, 0.8, 1.9, MAT.metal); hood.position.set(0, H - 0.7, -W * 0.3); g.add(hood);
      const filt = box(L * 0.6, 0.06, 1.7, mat(0x6b7684)); filt.position.set(0, H - 1.12, -W * 0.3); g.add(filt);
      const tb = box(L * 0.5, 0.9, 1.2, MAT.metal); tb.position.set(0, 0.45, W * 0.15); g.add(tb);
      for (let i = 0; i < 6; i++) { const p = person(0xf4f4f4); p.position.set(rnd(-L * 0.35, L * 0.35), 0, rnd(-W * 0.15, W * 0.35)); g.add(p); }
    } else if (k === 'datacenter') {
      const rk = [], led = [];
      for (let r = 0; r < 4; r++) for (let i = 0; i < 18; i++) {
        const x = -L * 0.32 + i * 1.0, z = -W * 0.33 + r * W * 0.22;
        rk.push([x, 1.1, z]);
        led.push([x, rnd(0.4, 1.9), z + (r % 2 ? -0.51 : 0.51)]);
      }
      g.add(inst(new T.BoxGeometry(0.9, 2.2, 1.0), mat(0x161b22, { metalness: 0.4 }), rk));
      g.add(inst(new T.BoxGeometry(0.5, 0.04, 0.02), glowM(0x22d3ee), led));
      [-0.22, 0.22].forEach(z => { const c = box(L * 0.62, 0.05, W * 0.12, mat(0xff8a5c, { transparent: true, opacity: 0.25 })); c.position.set(-L * 0.32 + 8.5, 2.3, z * W); g.add(c); });
    } else if (k === 'house') {
      const fl = box(L * 0.98, 0.04, W * 0.98, mat(0xc9a47a)); fl.position.y = 0.02; g.add(fl);
      const wallM = mat(0xf2ede4, { transparent: true, opacity: 0.55 });
      const part1 = box(0.1, H * 0.95, W * 0.45, wallM); part1.position.set(L * 0.2, H * 0.47, -W * 0.27); g.add(part1);
      const part2 = box(L * 0.3, H * 0.95, 0.1, wallM); part2.position.set(L * 0.35, H * 0.47, -W * 0.05); g.add(part2);
      const sofa = box(2.4, 0.8, 0.9, mat(0x3d5a80)); sofa.position.set(-L * 0.25, 0.4, W * 0.32); g.add(sofa);
      const tbl = box(1.2, 0.45, 0.7, mat(0x8a6a4a)); tbl.position.set(-L * 0.25, 0.23, W * 0.12); g.add(tbl);
      const tv = box(1.8, 1.0, 0.08, MAT.dark); tv.position.set(-L * 0.25, 1.2, -W * 0.45); g.add(tv);
      const cnt = box(3.2, 0.9, 0.7, mat(0xefefef)); cnt.position.set(-L * 0.05, 0.45, -W * 0.4); g.add(cnt);
      const stove = cyl(0.2, 0.2, 0.05, glowM(0xff5a1f), 12); stove.position.set(-L * 0.05, 0.93, -W * 0.4); g.add(stove);
      const tub = box(1.6, 0.55, 0.8, mat(0xffffff)); tub.position.set(L * 0.37, 0.28, -W * 0.38); g.add(tub);
      const bed = box(1.6, 0.5, 2.1, mat(0xdfe6ee)); bed.position.set(L * 0.36, 0.25, W * 0.25); g.add(bed);
      for (let i = 0; i < 3; i++) { const pp = person(0x6b8e5a); pp.scale.setScalar(0.85); pp.children[2].visible = false; pp.position.set(-L * 0.3 + i * 1.4, 0, W * 0.05 + (i % 2) * 0.8); g.add(pp); }
    } else if (k === 'hospital') {
      const beds = [], pil = [], curt = [];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) { const x = -L * 0.4 + i * L * 0.105, z = (r ? 1 : -1) * W * 0.3; beds.push([x, 0.35, z]); pil.push([x, 0.62, z + (r ? 0.75 : -0.75)]); }
      for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) curt.push([-L * 0.45 + i * L * 0.105, 1.1, (r ? 1 : -1) * W * 0.3]);
      g.add(inst(new T.BoxGeometry(1.0, 0.5, 2.0), mat(0xf4f7fa), beds));
      g.add(inst(new T.BoxGeometry(0.8, 0.12, 0.35), mat(0x9fc5e8), pil));
      g.add(inst(new T.BoxGeometry(0.04, 2.2, 2.2), mat(0xa8d5c9, { transparent: true, opacity: 0.45 }), curt));
      const desk = box(3, 1.0, 0.8, mat(0xe0e6ec)); desk.position.set(L * 0.38, 0.5, 0); g.add(desk);
      for (let i = 0; i < 8; i++) { const pp = person(i < 3 ? 0x7fb8e6 : 0xd7dde3); pp.scale.setScalar(0.85); pp.children[2].visible = false; pp.position.set(rnd(-L * 0.4, L * 0.4), 0, rnd(-W * 0.12, W * 0.12)); g.add(pp); }
    } else if (k === 'office') {
      const desks = [], mon = [];
      for (let r = 0; r < 5; r++) for (let i = 0; i < 10; i++) { desks.push([-L * 0.4 + i * L * 0.09, 0.38, -W * 0.36 + r * W * 0.18]); mon.push([-L * 0.4 + i * L * 0.09, 0.98, -W * 0.36 + r * W * 0.18 - 0.25]); }
      g.add(inst(new T.BoxGeometry(1.6, 0.75, 0.8), mat(0xd9c7a8), desks));
      g.add(inst(new T.BoxGeometry(0.6, 0.4, 0.04), mat(0x20262e), mon));
      for (let i = 0; i < 30; i++) { const p = person(0x3d5a80); p.scale.setScalar(0.8); p.children[2].visible = false; p.position.set(rnd(-L * 0.42, L * 0.42), 0, rnd(-W * 0.4, W * 0.4)); g.add(p); }
    } else if (k === 'heavy') {
      hs.forEach((h, i) => {
        if (i === 0) {
          const f = cyl(4, 4.5, 10, MAT.dark, 24); f.position.set(h.x, 5, h.z); g.add(f);
          const t = cyl(3.6, 3.6, 0.3, glowM(0xff6a00), 24); t.position.set(h.x, 10.1, h.z); g.add(t);
          const pour = cyl(0.5, 0.5, 4, glowM(0xffa31a), 12); pour.position.set(h.x + 4.5, 3, h.z); pour.rotation.z = 0.5; g.add(pour);
        } else {
          for (let j = 0; j < 4; j++) { const c = new T.Mesh(new T.TorusGeometry(1.4, 0.55, 12, 24), glowM(0xff5500)); c.rotation.y = Math.PI / 2; c.position.set(h.x + j * 3.2, 1.9, h.z); g.add(c); }
        }
      });
      const crane = box(2, 1.6, W * 0.95, MAT.yellow); crane.position.set(L * 0.05, H - 3, 0); g.add(crane);
      [-1, 1].forEach(s => { const rail = box(L * 0.95, 0.6, 0.6, MAT.steel); rail.position.set(0, H - 3.5, s * W * 0.47); g.add(rail); });
      for (let i = 0; i < 14; i++) { const p = person(0x5a6b2f); const a = rnd(0, Math.PI * 2), h = hs[i % hs.length]; p.position.set(h.x + Math.cos(a) * rnd(6, 10), 0, h.z + Math.sin(a) * rnd(6, 9)); g.add(p); }
    } else if (k === 'pool') {
      const water = box(L * 0.72, 0.3, W * 0.6, new T.MeshStandardMaterial({ color: 0x2aa7d9, emissive: 0x0e5d85, emissiveIntensity: 0.4, transparent: true, opacity: 0.85, roughness: 0.1 }));
      water.position.y = 0.05; g.add(water);
      for (let i = 1; i < 6; i++) { const ln = box(L * 0.7, 0.03, 0.08, MAT.red); ln.position.set(0, 0.22, -W * 0.3 + i * W * 0.1); g.add(ln); }
      const deck = [];
      for (let i = 0; i < 8; i++) deck.push([-L * 0.3 + i * L * 0.085, 0.35, W * 0.38]);
      g.add(inst(new T.BoxGeometry(1.6, 0.25, 0.6), mat(0xf4f4f4), deck));
    }
    return g;
  };

  /* ---------- 제품 배치 ----------
     반환: [{ id, kind, pos, dir, flow:'sink'|'jet'|'down'|'none', group(설치 파트 포함) }] */
  M.placements = function (site, items) {
    const { L, W, H } = site.dims;
    const rise = roofRise(site);
    const out = [];
    const v = (x, y, z) => new T.Vector3(x, y, z);
    const used = {}; // 같은 배치 방식을 쓰는 제품끼리 이어서 배치
    items.forEach(it => {
      const p = FZ.eff(it.id);
      const n = it.n, s = p.size, lane = it.lane || 0;
      if (!n) return;
      const push = (pos, dir, flow, mount) => out.push({ id: it.id, p, kind: p.model3d, pos, dir: dir.normalize(), flow, mount, mode: it.mode });
      if (it.place === 'wallEnd') {
        // 첫 제품은 배기 끝 박공벽, 다음 제품은 같은 끝 쪽 측벽에 이어서
        const sp = s * 1.12;
        const cols = Math.max(1, Math.floor((W - 0.6) / sp));
        const rows = Math.max(1, Math.floor((H - 0.3) / sp));
        let k = 0;
        if (lane === 0) {
          for (let r = 0; r < rows && k < n; r++) {
            const inRow = Math.min(cols, n - k);
            for (let c = 0; c < inRow; c++, k++) push(v(L / 2, 0.25 + s / 2 + r * sp, (c - (inRow - 1) / 2) * sp), v(1, 0, 0), 'sink', 'wall');
          }
        }
        let j = used.sideEnd || 0;
        while (k < n) { const sd = j % 2 ? -1 : 1; push(v(L / 2 - 2 - Math.floor(j / 2) * Math.max(sp, 1.6), Math.min(H - s / 2 - 0.2, H / 2), sd * W / 2), v(0, 0, sd), 'sink', 'wall'); k++; j++; }
        used.sideEnd = j;
      } else if (it.place === 'wallSide') {
        const per = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) {
          const sd = i % 2 ? -1 : 1, idx = Math.floor(i / 2);
          const cnt = sd > 0 ? per : n - per;
          const x = -L / 2 + (idx + 0.5 + lane * 0.4) * L / Math.max(1, cnt);
          const y = Math.max(s / 2 + 0.3, Math.min(H - s / 2 - 0.2, H * (0.55 - 0.2 * lane)));
          push(v(Math.min(L / 2 - s, x), y, sd * W / 2), v(0, 0, sd), 'sink', 'wall');
        }
      } else if (it.place === 'roofLine') {
        for (let i = 0; i < n; i++) {
          const x = -L / 2 + (i + 0.5) * L / n;
          const rows = site.roof === 'flat' && n > 6 ? 2 : 1;
          const z = rows === 2 ? (i % 2 ? -W * 0.22 : W * 0.22) : 0;
          const xx = rows === 2 ? -L / 2 + (Math.floor(i / 2) + 0.5) * L / Math.ceil(n / 2) : x;
          const y = site.roof === 'gable' ? H + rise - 0.2 : H + 0.3;
          push(v(xx, y, z), v(0, 1, 0), 'sink', 'roof');
        }
      } else if (it.place === 'ceilingGrid' || it.place === 'hangGrid' || it.place === 'ceilingSmall') {
        const cols = Math.max(1, Math.round(Math.sqrt(n * L / W)));
        const rows = Math.ceil(n / cols);
        let k = 0;
        for (let r = 0; r < rows; r++) {
          const inRow = Math.min(cols, n - k);
          for (let c = 0; c < inRow; c++, k++) {
            const off = it.place === 'ceilingGrid' ? 0 : lane * 0.33;
            const x = -L / 2 + (c + 0.5 + off) * L / inRow, z = -W / 2 + (r + 0.5 + off) * W / rows;
            if (it.place === 'ceilingGrid') push(v(x, H - 2.2, z), v(0, -1, 0), 'down', 'ceiling');
            else if (it.place === 'ceilingSmall') push(v(x, H - 0.05, z), v(0, -1, 0), 'down', 'ceilingSmall');
            else push(v(x, (site.kind === 'greenhouse' ? H * 0.62 : H - 0.7) - lane * 0.7, z), v(1, 0, 0), 'jet', 'hang');
          }
        }
      } else if (it.place === 'ductLine') {
        const z0 = site.kind === 'kitchen' ? -W * 0.3 : -W * 0.15;
        const z = Math.max(-W / 2 + 0.8, Math.min(W / 2 - 0.8, z0 + (lane % 2 ? 1 : -1) * Math.ceil(lane / 2) * Math.max(1.4, W * 0.12)));
        for (let i = 0; i < n; i++) {
          const x = -L / 2 + (i + 0.5) * L / n;
          push(v(x, H - Math.max(0.6, s * 0.8), z), v(1, 0, 0), 'sink', 'duct');
        }
      } else if (it.place === 'rack') {
        const sp = s * 1.05;
        const cols = Math.max(1, Math.floor((W * 0.8) / sp));
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = Math.floor(i / cols);
          const inRow = Math.min(cols, n - r * cols);
          push(v(-L / 2 + 1.2, 0.5 + s / 2 + r * sp, (c - (inRow - 1) / 2) * sp), v(1, 0, 0), 'jet', 'rack');
        }
      } else if (it.place === 'outdoorPoles') {
        for (let i = 0; i < n; i++) push(v(-L / 3 + i * (2 * L / 3) / Math.max(1, n - 1), 0, W / 2 + 7), v(0, -0.3, -1), 'none', 'pole');
      } else if (it.place === 'floorWall') {
        // 바닥 설치형 송풍기: 뒤쪽 벽을 따라
        const z = -W / 2 + Math.max(1.2, s) + lane * Math.max(1.8, s * 1.6);
        for (let i = 0; i < n; i++) push(v(-L / 2 + (i + 0.5) * L / n, s * 0.55 + 0.05, Math.min(W / 2 - 1, z)), v(0, 0, -1), 'sink', 'floor');
      } else if (it.place === 'exterior') {
        for (let i = 0; i < n; i++) push(v(L / 2 + 0.2, H * 0.7, (i - (n - 1) / 2) * Math.min(1.6, (W - 1) / Math.max(1, n))), v(1, 0, 0), 'none', 'exterior');
      } else if (it.place === 'floorSpots') {
        let hs = (site.heatSources || []).map(([x, z]) => ({ x: x * L, z: z * W }));
        if (!hs.length) hs = [{ x: 0, z: 0 }];
        for (let i = 0; i < n; i++) {
          const h = hs[i % hs.length];
          const a = (i / n) * Math.PI * 2 + 0.3 + lane * 0.5;
          const R = Math.min(11, Math.min(L, W) * 0.35) + lane * 2;
          const pos = v(h.x + Math.cos(a) * R, 1.05, h.z + Math.sin(a) * R * 0.75);
          pos.z = Math.max(-W / 2 + 2, Math.min(W / 2 - 2, pos.z));
          const dir = v(h.x - pos.x, 0, h.z - pos.z);
          push(pos, dir, 'jet', 'floor');
        }
      }
    });
    // 흡기/배기: out = 바깥쪽 방향, fdir = 실제 공기 흐름 방향
    out.forEach(pl => {
      const m = pl.mount;
      if (m === 'wall' || m === 'rack' || m === 'floor' && pl.flow === 'sink' || m === 'exterior') pl.out = pl.dir.clone();
      else if (m === 'ceilingSmall' || m === 'roof') pl.out = v(0, 1, 0);
      else if (m === 'duct') pl.out = v(1, 0, 0);
      pl.fdir = pl.dir.clone();
      if (!pl.out || (pl.mode !== 'intake' && pl.mode !== 'exhaust')) { pl.mode = pl.flow === 'none' ? null : (pl.mode === 'circ' ? 'circ' : pl.mode); return; }
      if (pl.mode === 'intake') {
        if (m === 'ceilingSmall' || m === 'duct') { pl.flow = 'down'; pl.fdir = v(0, -1, 0); }
        else { pl.flow = 'jet'; pl.fdir = pl.out.clone().negate(); }
      } else pl.flow = m === 'exterior' ? 'none' : 'sink';
    });
    return out;
  };

  /* 배치 1개에 대한 설치 그룹: marker, opening, bracket, body, cable */
  M.installGroup = function (pl, site, panelPos) {
    const { H } = site.dims;
    const g = new T.Group();
    const f = M.fan(pl.kind, pl.p.size);
    const body = new T.Group(); body.add(f.group);
    // 방향 맞추기
    if (f.axis === 'z') {
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), pl.dir.clone().normalize());
      if (pl.kind !== 'defroster') body.quaternion.copy(q);
    }
    if (pl.kind === 'defroster') { body.rotation.y = Math.atan2(pl.dir.x, pl.dir.z); }
    if (pl.kind === 'hvls') { /* 아래로 매달림 */ }
    body.position.copy(pl.pos);
    g.add(body);
    const s = pl.p.size;
    // 위치 마커 (링)
    const mk = new T.Mesh(new T.RingGeometry(s * 0.6, s * 0.75, 40), new T.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }));
    mk.position.copy(pl.pos);
    if (pl.mount === 'wall' || pl.mount === 'rack') mk.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), pl.dir);
    else if (pl.mount === 'floor' || pl.mount === 'pole') { mk.rotation.x = -Math.PI / 2; mk.position.y = 0.05; }
    else mk.rotation.x = -Math.PI / 2;
    g.add(mk);
    // 개구부/앵커
    let opening;
    if (pl.mount === 'wall' || pl.mount === 'rack') {
      opening = box(s * 1.02, s * 1.02, 0.25, new T.MeshBasicMaterial({ color: 0x0b1220 }));
      opening.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), pl.dir); opening.position.copy(pl.pos);
    } else if (pl.mount === 'roof') {
      opening = box(s * 1.05, 0.1, s * 1.05, MAT.dark); opening.position.copy(pl.pos);
    } else if (pl.mount === 'ceiling') {
      opening = box(1.6, 0.25, 0.25, MAT.yellow); opening.position.set(pl.pos.x, H - 0.2, pl.pos.z);
    } else if (pl.mount === 'duct') {
      opening = new T.Group();
      for (let i = -1; i <= 1; i += 2) { const rod = box(0.04, 0.6, 0.04, MAT.steel); rod.position.set(pl.pos.x + i * s * 0.6, H - 0.3, pl.pos.z); opening.add(rod); }
    } else if (pl.mount === 'pole' || pl.mount === 'floor') {
      opening = box(1.2, 0.05, 1.2, MAT.concrete); opening.position.set(pl.pos.x, 0.03, pl.pos.z);
    } else {
      opening = cyl(s * 0.9, s * 0.9, 0.05, MAT.dark, 20); opening.position.copy(pl.pos); opening.position.y += 0.03;
    }
    g.add(opening);
    // 브라켓
    const brM = new T.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.5 });
    let bracket;
    if (pl.mount === 'ceiling') {
      bracket = new T.Group();
      const tube = box(0.12, 2.0, 0.12, brM); tube.position.set(pl.pos.x, H - 1.2, pl.pos.z); bracket.add(tube);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const w = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 2.6, 4), brM); w.position.set(pl.pos.x + Math.cos(a) * 0.9, H - 1.0, pl.pos.z + Math.sin(a) * 0.9); w.lookAt(pl.pos.x, H - 2.2, pl.pos.z); w.rotateX(Math.PI / 2); bracket.add(w); }
    } else {
      bracket = squareFrame(s * 1.1, s * 0.98, 0.08, brM);
      if (pl.mount === 'roof' || pl.mount === 'ceilingSmall') { bracket.rotation.x = -Math.PI / 2; bracket.position.copy(pl.pos); bracket.position.y += 0.05; }
      else if (pl.mount === 'floor' || pl.mount === 'pole') { bracket.rotation.x = -Math.PI / 2; bracket.position.set(pl.pos.x, 0.08, pl.pos.z); }
      else if (pl.mount === 'duct' || pl.mount === 'hang') { bracket = new T.Group(); const bar = box(s * 1.3, 0.06, 0.08, brM); bar.position.set(pl.pos.x, pl.pos.y + s * 0.6, pl.pos.z); bracket.add(bar); }
      else { bracket.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), pl.dir); bracket.position.copy(pl.pos).addScaledVector(pl.dir, -0.05); }
    }
    g.add(bracket);
    // 배선
    const top = pl.mount === 'pole' || pl.mount === 'floor' ? new T.Vector3(pl.pos.x, 0.1, pl.pos.z) : new T.Vector3(pl.pos.x, Math.min(H - 0.15, pl.pos.y + s * 0.6), pl.pos.z);
    const pts = [top.clone(), new T.Vector3(top.x, pl.mount === 'pole' || pl.mount === 'floor' ? 0.1 : H - 0.15, top.z), new T.Vector3(panelPos.x, pl.mount === 'pole' || pl.mount === 'floor' ? 0.1 : H - 0.15, top.z), new T.Vector3(panelPos.x, pl.mount === 'pole' || pl.mount === 'floor' ? 0.1 : H - 0.15, panelPos.z), panelPos.clone()];
    const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
    const cable = new T.Mesh(new T.TubeGeometry(curve, 60, 0.05, 6, false), new T.MeshBasicMaterial({ color: 0x22d3ee }));
    cable.geometry.setDrawRange(0, 0);
    cable.userData.total = cable.geometry.index ? cable.geometry.index.count : 0;
    g.add(cable);
    // 흡기(파랑, 안쪽)·배기(주황, 바깥쪽) 화살표
    let arrow = null;
    if (pl.out && (pl.mode === 'intake' || pl.mode === 'exhaust')) {
      const ex = pl.mode === 'exhaust';
      const d = ex ? pl.out.clone() : pl.out.clone().negate();
      const am = new T.MeshBasicMaterial({ color: ex ? 0xea580c : 0x0284c7 });
      const L0 = Math.max(0.6, s * 1.1, Math.max(site.dims.L, site.dims.W) * 0.035);
      arrow = new T.Group();
      const shaft = new T.Mesh(new T.CylinderGeometry(L0 * 0.08, L0 * 0.08, L0 * 0.6, 10), am); shaft.position.y = L0 * 0.3; arrow.add(shaft);
      const head = new T.Mesh(new T.ConeGeometry(L0 * 0.22, L0 * 0.4, 14), am); head.position.y = L0 * 0.8; arrow.add(head);
      arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d);
      arrow.position.copy(pl.pos).addScaledVector(pl.out, ex ? s * 0.5 + 0.25 : -(s * 0.5 + 0.25 + L0));
      if (!ex) arrow.position.addScaledVector(d, 0);
      g.add(arrow);
    }
    return { group: g, marker: mk, opening, bracket, body, cable, fan: f, pl, arrow };
  };

  FZ.models = M;
})();
