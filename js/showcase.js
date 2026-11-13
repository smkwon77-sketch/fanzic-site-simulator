/* 제품 단독 3D 보기(제품 모드)와 사진 없는 제품의 3D 썸네일 */
window.FZ = window.FZ || {};

(function () {
  const T = THREE;
  const SC = {};
  const BG = 0xf1f4f8;

  /* ---------- 썸네일 (사진 대신) ---------- */
  let thumbR = null;
  const thumbCache = {};
  const THUMB_YAW = { inline: Math.PI - 0.6, squareInline: Math.PI - 0.6, ec: Math.PI - 0.6, cabinet: Math.PI - 0.6, cabinetMulti: Math.PI, centrifugal: -1.35, centrifugalSus: -0.05, sirocoDouble: -0.5, jet: -1.0, circ: -0.25, defroster: -0.3, belt: -0.5, propeller: -0.3, sirocoBox: -0.3, sirocoFrame: -0.05, plasticWall: Math.PI, propSmall: Math.PI - 0.3, vaneAxial: -0.3, portableDrum: 0.9, boxMesh: -0.3, hangerBox: -0.4, standFan: -0.2, controllerBox: -0.3, controllerPanel: -0.3, shutterBox: -0.4 };
  SC.thumb = function (pid) {
    const p = FZ.eff(pid), key = pid + '|' + p.model3d; // 모델에 따라 3D 종류가 바뀜
    if (thumbCache[key]) return thumbCache[key];
    if (!thumbR) {
      const c = document.createElement('canvas'); c.width = 320; c.height = 240;
      thumbR = new T.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true, alpha: true });
      thumbR.setClearColor(0xffffff, 0);
    }
    const scene = new T.Scene();
    FZ.engine.lights(scene, 6);
    const f = FZ.models.fan(p.model3d, p.size);
    const g = new T.Group(); g.add(f.group); scene.add(g);
    // 제품 특징이 보이는 쪽(흡입 벨마우스·흡입구 등)을 앞으로
    if (f.axis === 'z') g.rotation.y = THUMB_YAW[p.model3d] != null ? THUMB_YAW[p.model3d] : -0.6;
    g.updateMatrixWorld(true);
    const focus = f.group.getObjectByName('thumbFocus') || g; // 서리방지팬처럼 기둥이 긴 제품은 헤드만
    const box = new T.Box3().setFromObject(focus), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    g.position.sub(ctr);
    const r = Math.max(size.x, size.y, size.z);
    const cam = new T.PerspectiveCamera(32, 4 / 3, 0.01, 100);
    cam.position.set(r * 1.1, r * 0.75, r * 1.9); cam.lookAt(0, 0, 0);
    thumbR.render(scene, cam);
    return (thumbCache[key] = thumbR.domElement.toDataURL('image/png'));
  };
  SC.imageOf = function (pid) {
    const t = FZ.TAGS[pid];
    return t && t.image ? { src: 'assets/products/' + t.image, real: true } : { src: SC.thumb(pid), real: false };
  };

  /* ---------- 제품 단독 장면 ---------- */
  function label(text, color) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = color; x.font = '700 34px "IBM Plex Sans KR", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 128, 32);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.scale.set(1.6, 0.4, 1);
    return s;
  }

  // mode: exhaust | intake | circ
  SC.build = function (pid, mode) {
    const p = FZ.eff(pid), HV = /^hvls/.test(p.model3d);
    const scene = new T.Scene();
    scene.background = new T.Color(BG);
    FZ.engine.lights(scene, 8);
    const ground = new T.Mesh(new T.CircleGeometry(6, 48), new T.MeshStandardMaterial({ color: 0xe3e8ee, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const f = FZ.models.fan(p.model3d, p.size);
    const k = HV ? 3.2 / p.size : 1.6 / Math.max(0.4, p.size);
    const holder = new T.Group(); holder.add(f.group); holder.scale.setScalar(k);
    const vertical = f.axis === 'y';
    // 공기 흐름 방향: 가로형은 +x(실내 → 실외), 세로형은 위/아래
    let flow;
    if (HV) { holder.position.y = 2.6; flow = new T.Vector3(0, -1, 0); }
    else if (vertical) { holder.position.y = 1.2; flow = new T.Vector3(0, mode === 'intake' ? -1 : 1, 0); }
    else {
      holder.rotation.y = Math.PI / 2; holder.position.y = 1.2;
      flow = new T.Vector3(mode === 'intake' ? -1 : 1, 0, 0);
    }
    scene.add(holder);
    const wallLike = ['wall', 'rack', 'duct', 'exterior'].includes(p.mount) && mode !== 'circ';
    if (wallLike && !vertical) {
      const wall = new T.Mesh(new T.PlaneGeometry(3.6, 3), new T.MeshStandardMaterial({ color: 0xc5d5e8, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
      wall.rotation.y = Math.PI / 2; wall.position.set(0.05, 1.5, 0); scene.add(wall);
      const a = label('실내', '#334155'); a.position.set(-2.2, 2.6, 0); scene.add(a);
      const b = label('실외', '#334155'); b.position.set(2.2, 2.6, 0); scene.add(b);
    }
    // 흐름 입자
    const N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tt = new Float32Array(N), off = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { tt[i] = Math.random(); off[i * 2] = (Math.random() - 0.5); off[i * 2 + 1] = (Math.random() - 0.5); }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
    const center = holder.position.clone();
    const rad = HV ? 3 : Math.min(0.75, 0.42 * k * p.size);
    const C_IN = mode === 'intake' ? [2, 132, 199] : [234, 88, 12], C_OUT = mode === 'intake' ? [2, 132, 199] : [190, 120, 80], C_CIRC = [56, 160, 220];
    const BGc = [241, 244, 248];
    let spin = 0;
    function tick(dt, time, on) {
      spin += ((on ? 1 : 0) - spin) * Math.min(1, dt * 2);
      if (f.rotor) { const r = (HV ? 1.4 : 10) * spin * dt * (mode === 'intake' ? -1 : 1); if (f.axis === 'y') f.rotor.rotation.y += r; else f.rotor.rotation.z += r; }
      const sh = f.group.getObjectByName('shutter'); if (sh) sh.children.forEach(pv => { pv.rotation.x = -1.25 * spin; });
      for (let i = 0; i < N; i++) {
        tt[i] += dt * 0.35 * (0.6 + spin);
        if (tt[i] > 1) tt[i] -= 1;
        const s = tt[i] * 2 - 1; // -1 → 1 (팬 앞뒤)
        let x, y, z;
        if (HV) {
          // 아래로 내려온 뒤 바닥을 따라 퍼짐
          const a = off[i * 2] * Math.PI * 2, r0 = Math.abs(off[i * 2 + 1]) * rad;
          if (s < 0.2) { x = Math.cos(a) * r0; z = Math.sin(a) * r0; y = center.y - (s + 1) / 1.2 * (center.y - 0.25); }
          else { const rr = r0 + (s - 0.2) * 5; x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = 0.25; }
        } else {
          const spread = 1 + Math.max(0, s) * (mode === 'circ' ? 1.4 : 0.6);
          const lat1 = off[i * 2] * rad * 2 * spread, lat2 = off[i * 2 + 1] * rad * 2 * spread;
          const d = s * 2.6;
          if (flow.y !== 0) { x = center.x + lat1; z = center.z + lat2; y = center.y + flow.y * d; }
          else { x = center.x + flow.x * d; y = center.y + lat1; z = center.z + lat2; }
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        const c = mode === 'circ' ? C_CIRC : (s < 0 ? C_IN : C_OUT);
        const fade = Math.min(1, (1 - Math.abs(s)) * 3) * spin;
        for (let q = 0; q < 3; q++) col[i * 3 + q] = (c[q] * fade + BGc[q] * (1 - fade)) / 255;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    }
    return { scene, tick, target: new T.Vector3(0, HV ? 1.6 : 1.2, 0), radius: HV ? 14 : 9.5 };
  };

  FZ.showcase = SC;
})();
