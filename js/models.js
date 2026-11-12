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
    floor: mat(0x39424e, { roughness: 0.95 }),
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

  /* 각 팬: { group, rotor, axis } — 공기 흐름 방향 = 로컬 +z (roof/hvls/diffuser 는 y) */
  M.fan = function (kind, s) {
    const g = new T.Group();
    let rotor, axis = 'z';
    if (kind === 'propeller') {
      const r = s * 0.42;
      g.add(squareFrame(s, r * 2.1, 0.06, MAT.metal));
      const ring = ringZ(r * 1.04, 0.035, MAT.metal); g.add(ring);
      rotor = rotorZ(4, r, r * 0.55, MAT.blade);
      g.add(rotor);
      const mot = cyl(r * 0.22, r * 0.22, r * 0.4, MAT.dark); mot.rotation.x = Math.PI / 2; mot.position.z = -r * 0.3; g.add(mot);
      const guard = ringZ(r * 0.95, 0.012, MAT.steel); guard.position.z = s * 0.08; g.add(guard);
    } else if (kind === 'belt') {
      const r = s * 0.44, d = s * 0.45;
      const sh = new T.Group();
      const pT = box(s, 0.04, d, MAT.metal); pT.position.y = s / 2; sh.add(pT);
      const pB = pT.clone(); pB.position.y = -s / 2; sh.add(pB);
      const pL = box(0.04, s, d, MAT.metal); pL.position.x = -s / 2; sh.add(pL);
      const pR = pL.clone(); pR.position.x = s / 2; sh.add(pR);
      sh.position.z = -d / 2;
      g.add(sh);
      const cone = cyl(r * 1.05, r * 1.2, d * 0.6, MAT.metal, 32, true); cone.rotation.x = Math.PI / 2; cone.position.z = -d * 0.45; cone.material = MAT.metal; g.add(cone);
      rotor = rotorZ(6, r, r * 0.42, MAT.blade, 0.5);
      rotor.position.z = -d * 0.45;
      g.add(rotor);
      const mot = cyl(s * 0.11, s * 0.11, s * 0.25, MAT.navy); mot.rotation.z = Math.PI / 2; mot.position.set(0, s / 2 + 0.12, -d * 0.5); g.add(mot);
      // 셔터 날개 (가동 시 열림)
      const sl = new T.Group(); sl.name = 'shutter';
      const nS = 6;
      for (let i = 0; i < nS; i++) {
        const slat = box(s * 0.96, s / nS * 0.98, 0.012, MAT.steel);
        const piv = new T.Group(); piv.position.set(0, -s / 2 + (i + 1) * s / nS, 0.02);
        slat.position.y = -s / nS / 2;
        piv.add(slat); sl.add(piv);
      }
      g.add(sl);
    } else if (kind === 'roof') {
      axis = 'y';
      const r = s * 0.42;
      const base = box(s, 0.25, s, MAT.metal); base.position.y = 0.12; g.add(base);
      const tube = cyl(r, r, s * 0.8, MAT.metal, 28, true); tube.position.y = 0.25 + s * 0.4; g.add(tube);
      tube.material = MAT.metal;
      rotor = rotorZ(5, r * 0.95, r * 0.5, MAT.blade);
      rotor.rotation.x = -Math.PI / 2; rotor.position.y = 0.25 + s * 0.45;
      const rw = new T.Group(); rw.add(rotor); g.add(rw);
      rotor = rw; rw.userData.inner = true;
      const cap = new T.Mesh(new T.ConeGeometry(r * 1.4, s * 0.35, 28), MAT.navy); cap.position.y = 0.25 + s * 0.8 + s * 0.38; g.add(cap);
      for (let i = 0; i < 4; i++) { const leg = box(0.03, s * 0.3, 0.03, MAT.steel); const a = i * Math.PI / 2 + Math.PI / 4; leg.position.set(Math.cos(a) * r, 0.25 + s * 0.95, Math.sin(a) * r); g.add(leg); }
    } else if (kind === 'hvls') {
      axis = 'y';
      const R = s / 2;
      const tube = cyl(0.06, 0.06, 1.4, MAT.steel); tube.position.y = 0.95; g.add(tube);
      const plate = box(0.5, 0.06, 0.5, MAT.steel); plate.position.y = 1.65; g.add(plate);
      const motor = cyl(0.32, 0.36, 0.42, MAT.navy, 28); motor.position.y = 0.1; g.add(motor);
      const cap = cyl(0.16, 0.32, 0.16, MAT.red, 28); cap.position.y = 0.37; g.add(cap);
      rotor = new T.Group();
      for (let i = 0; i < 6; i++) {
        const arm = new T.Group();
        const b = box(R - 0.35, 0.05, 0.22, MAT.hvlsBlade); b.position.x = 0.35 + (R - 0.35) / 2; b.rotation.x = 0.12;
        const wl = box(0.04, 0.16, 0.24, MAT.hvlsBlade); wl.position.set(R, -0.06, 0);
        arm.add(b); arm.add(wl);
        arm.rotation.y = (i / 6) * Math.PI * 2;
        rotor.add(arm);
      }
      rotor.position.y = -0.12;
      g.add(rotor);
    } else if (kind === 'inline') {
      const r = s * 0.5, len = s * 1.3;
      const tube = cyl(r, r, len, MAT.metal, 32, true); tube.rotation.x = Math.PI / 2; g.add(tube);
      tube.material = new T.MeshStandardMaterial({ color: 0xbfc8d2, metalness: 0.7, roughness: 0.35, side: T.DoubleSide });
      const f1 = ringZ(r + 0.03, 0.04, MAT.steel); f1.position.z = len / 2; g.add(f1);
      const f2 = f1.clone(); f2.position.z = -len / 2; g.add(f2);
      rotor = rotorZ(8, r * 0.95, r * 0.35, MAT.blade, 0.6);
      g.add(rotor);
      const mot = cyl(r * 0.3, r * 0.3, len * 0.45, MAT.dark); mot.rotation.x = Math.PI / 2; mot.position.z = -len * 0.22; g.add(mot);
      const box1 = box(0.12, 0.1, 0.16, MAT.dark); box1.position.set(0, r + 0.05, 0); g.add(box1);
    } else if (kind === 'centrifugal' || kind === 'centrifugalSus') {
      const r = s * 0.5, w = s * 0.45;
      const sm = kind === 'centrifugalSus' ? MAT.metal : MAT.navy;
      const scroll = cyl(r, r, w, sm, 32); scroll.rotation.x = Math.PI / 2; g.add(scroll);
      const outlet = box(r * 0.9, r * 1.1, w, sm); outlet.position.set(r * 0.55, r * 0.55, 0); g.add(outlet);
      const bell = ringZ(r * 0.45, 0.04, MAT.metal); bell.position.z = w / 2 + 0.01; g.add(bell);
      rotor = new T.Group();
      for (let i = 0; i < 10; i++) { const fin = box(0.02, r * 0.3, w * 0.6, MAT.blade); const a = i / 10 * Math.PI * 2; fin.position.set(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, 0); fin.rotation.z = a + 0.5; rotor.add(fin); }
      rotor.position.z = w / 2 - w * 0.3;
      g.add(rotor);
      const mot = cyl(r * 0.35, r * 0.35, w * 0.9, MAT.dark); mot.rotation.x = Math.PI / 2; mot.position.z = -w * 0.9; g.add(mot);
      const base = box(s * 1.1, 0.06, w * 2.2, MAT.steel); base.position.set(0, -r - 0.05, -w * 0.4); g.add(base);
    } else if (kind === 'circ') {
      const r = s * 0.5;
      g.add(ringZ(r, 0.02, MAT.dark));
      const g2 = ringZ(r * 0.6, 0.008, MAT.dark); g2.position.z = 0.05; g.add(g2);
      rotor = rotorZ(5, r * 0.92, r * 0.5, MAT.bladeDark, 0.5);
      g.add(rotor);
      const mot = cyl(r * 0.25, r * 0.25, r * 0.6, MAT.dark); mot.rotation.x = Math.PI / 2; mot.position.z = -r * 0.4; g.add(mot);
      const hang = box(0.03, r * 1.6, 0.03, MAT.steel); hang.position.set(0, r * 1.3, -r * 0.3); g.add(hang);
    } else if (kind === 'jet') {
      const r = s * 0.5, len = s * 3.2;
      const body = cyl(r, r, len, MAT.metal, 28); body.rotation.x = Math.PI / 2; g.add(body);
      const noz = new T.Mesh(new T.ConeGeometry(r * 0.8, s * 0.6, 28, 1, true), MAT.steel); noz.rotation.x = Math.PI / 2; noz.position.z = len / 2 + s * 0.2; g.add(noz);
      rotor = rotorZ(7, r * 0.9, r * 0.35, MAT.blade);
      rotor.position.z = -len / 2 - 0.01;
      g.add(rotor);
      [-0.3, 0.3].forEach(k => { const rod = box(0.03, 0.6, 0.03, MAT.steel); rod.position.set(0, r + 0.3, len * k); g.add(rod); });
    } else if (kind === 'ec') {
      const r = s * 0.42;
      g.add(squareFrame(s, r * 2.15, 0.04, MAT.dark));
      const bell = ringZ(r * 1.05, 0.05, MAT.dark); g.add(bell);
      rotor = rotorZ(5, r, r * 0.6, MAT.bladeDark, 0.55, 0.28);
      g.add(rotor);
      const hub = cyl(r * 0.36, r * 0.36, 0.14, MAT.metal, 28); hub.rotation.x = Math.PI / 2; hub.position.z = -0.04; g.add(hub);
      const led = box(0.06, 0.06, 0.02, new T.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.5 }));
      led.position.set(s * 0.4, -s * 0.4, 0.03); g.add(led);
    } else if (kind === 'diffuser') {
      axis = 'y';
      const r = s * 1.1;
      const disc = cyl(r, r, 0.03, MAT.metal, 32); g.add(disc);
      const c1 = cyl(r * 0.7, r * 0.7, 0.05, MAT.blade, 32); c1.position.y = -0.03; g.add(c1);
      const c2 = cyl(r * 0.4, r * 0.4, 0.07, MAT.metal, 32); c2.position.y = -0.05; g.add(c2);
      rotor = new T.Group();
    } else if (kind === 'axialStand') {
      const r = s * 0.5, len = s * 0.9;
      const tube = cyl(r, r, len, MAT.navy, 32, true); tube.rotation.x = Math.PI / 2;
      tube.material = new T.MeshStandardMaterial({ color: 0x14457f, metalness: 0.35, roughness: 0.45, side: T.DoubleSide }); g.add(tube);
      const gF = ringZ(r, 0.02, MAT.steel); gF.position.z = len / 2; g.add(gF);
      rotor = rotorZ(9, r * 0.95, r * 0.3, MAT.blade, 0.6);
      g.add(rotor);
      const mot = cyl(r * 0.3, r * 0.3, len * 0.5, MAT.dark); mot.rotation.x = Math.PI / 2; mot.position.z = -len * 0.25; g.add(mot);
      const stand = new T.Group();
      const leg1 = box(0.06, r + 0.35, 0.06, MAT.steel); leg1.position.set(-r * 0.8, -(r + 0.35) / 2, 0); stand.add(leg1);
      const leg2 = leg1.clone(); leg2.position.x = r * 0.8; stand.add(leg2);
      const foot = box(r * 2, 0.08, len * 1.4, MAT.steel); foot.position.y = -r - 0.35; stand.add(foot);
      for (let i = 0; i < 4; i++) { const w = cyl(0.08, 0.08, 0.06, MAT.rubber, 12); w.rotation.z = Math.PI / 2; w.position.set((i % 2 ? 1 : -1) * r * 0.9, -r - 0.45, (i < 2 ? 1 : -1) * len * 0.6); stand.add(w); }
      g.add(stand);
    } else if (kind === 'defroster') {
      const r = s * 0.5;
      const head = new T.Group();
      head.add(ringZ(r, 0.05, MAT.metal));
      const rr = rotorZ(3, r * 0.95, r * 0.45, MAT.blade, 0.5);
      head.add(rr);
      const mot = cyl(r * 0.25, r * 0.25, r * 0.6, MAT.navy); mot.rotation.x = Math.PI / 2; mot.position.z = -r * 0.4; head.add(mot);
      head.rotation.x = 0.35;
      head.position.y = 7;
      g.add(head);
      rotor = rr;
      const pole = cyl(0.12, 0.16, 7, MAT.steel); pole.position.y = 3.5; g.add(pole);
      const ft = box(1, 0.3, 1, MAT.concrete); ft.position.y = 0.15; g.add(ft);
    } else if (kind === 'ceilvent') {
      // 천장형 환풍기: 사각 그릴 패널
      axis = 'y';
      const plate = box(s, 0.04, s, mat(0xf3f5f7));
      g.add(plate);
      for (let i = 0; i < 5; i++) { const sl = box(s * 0.8, 0.02, 0.02, MAT.steel); sl.position.set(0, -0.03, -s * 0.32 + i * s * 0.16); g.add(sl); }
      const housing = box(s * 0.8, s * 0.6, s * 0.8, MAT.steel); housing.position.y = s * 0.32; g.add(housing);
      rotor = new T.Group();
      for (let i = 0; i < 6; i++) { const b = box(s * 0.3, 0.01, s * 0.08, MAT.bladeDark); b.position.x = s * 0.15; const arm = new T.Group(); arm.add(b); arm.rotation.y = i / 6 * Math.PI * 2; rotor.add(arm); }
      rotor.position.y = s * 0.12; g.add(rotor);
    } else if (kind === 'filterbox') {
      // 팬도라: 3중 필터 박스 (앞면 그릴)
      const bx = box(s, s * 0.7, s * 0.9, mat(0xe9edf2)); g.add(bx);
      const face = box(s * 0.86, s * 0.56, 0.02, MAT.dark); face.position.z = s * 0.46; g.add(face);
      for (let i = 0; i < 6; i++) { const sl = box(s * 0.84, 0.015, 0.03, MAT.steel); sl.position.set(0, -s * 0.24 + i * s * 0.095, s * 0.47); g.add(sl); }
      const lab = box(s * 0.3, s * 0.08, 0.01, MAT.red); lab.position.set(0, s * 0.3, s * 0.46); g.add(lab);
      rotor = null;
    } else if (kind === 'hoodcap') {
      // 후드캡: 외벽 배기구 마감
      const hood = new T.Mesh(new T.CylinderGeometry(s * 0.5, s * 0.5, s * 0.6, 20, 1, false, 0, Math.PI), MAT.metal);
      hood.rotation.x = Math.PI / 2; hood.position.z = s * 0.3; g.add(hood);
      const pipe = cyl(s * 0.3, s * 0.3, s * 0.4, MAT.metal, 16); pipe.rotation.x = Math.PI / 2; g.add(pipe);
      rotor = null;
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
  function edges(mesh, color = 0x9ec5ff, op = 0.5) {
    const e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), new T.LineBasicMaterial({ color, transparent: true, opacity: op }));
    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale);
    return e;
  }

  // mini=true: 디오라마용 불투명 미니어처
  M.building = function (site, mini) {
    const { L, W, H } = site.dims;
    const g = new T.Group();
    const rise = roofRise(site);
    const wallM = mini ? mat(site.tint, { roughness: 0.6 }) : glassMat(0xbcd4f0, 0.1);
    const roofM = mini ? mat(site.roof === 'arch' ? 0xd9f2ec : 0x34506e, { roughness: 0.5, transparent: site.roof === 'arch', opacity: site.roof === 'arch' ? 0.75 : 1 }) : glassMat(0xbcd4f0, 0.06);
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
      const p = FZ.PRODUCTS[it.id];
      const n = it.n, s = p.size, lane = it.lane || 0;
      if (!n) return;
      const push = (pos, dir, flow, mount) => out.push({ id: it.id, p, kind: p.model3d, pos, dir: dir.normalize(), flow, mount });
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
    return { group: g, marker: mk, opening, bracket, body, cable, fan: f, pl };
  };

  FZ.models = M;
})();
