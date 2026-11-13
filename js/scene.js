/* 렌더러, 카메라 오빗(마우스·터치), 디오라마 도시 */
window.FZ = window.FZ || {};

(function () {
  const T = THREE;
  const E = { frameFns: [] };

  /* ---------- 오빗 컨트롤 ---------- */
  class Orbit {
    constructor(cam, el) {
      this.cam = cam; this.el = el;
      this.target = new T.Vector3(); this.radius = 80; this.theta = 0.7; this.phi = 0.95;
      this.goal = { target: new T.Vector3(), radius: 80, theta: 0.7, phi: 0.95 };
      this.minR = 5; this.maxR = 400; this.minPhi = 0.12; this.maxPhi = 1.45;
      this.ptrs = new Map(); this.tween = null; this.auto = 0;
      el.addEventListener('pointerdown', e => this.down(e));
      el.addEventListener('pointermove', e => this.move(e));
      el.addEventListener('pointerup', e => this.up(e));
      el.addEventListener('pointercancel', e => this.up(e));
      el.addEventListener('wheel', e => { e.preventDefault(); this.stop(); this.goal.radius = this.clampR(this.goal.radius * Math.exp(e.deltaY * 0.0012)); }, { passive: false });
      el.addEventListener('contextmenu', e => e.preventDefault());
    }
    clampR(r) { return Math.max(this.minR, Math.min(this.maxR, r)); }
    stop() { this.tween = null; this.auto = 0; }
    down(e) {
      this.el.setPointerCapture(e.pointerId);
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, shift: e.shiftKey });
      this.stop();
    }
    move(e) {
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (this.ptrs.size === 1) {
        if (p.btn === 2 || p.shift) this.pan(dx, dy);
        else { this.goal.theta -= dx * 0.006; this.goal.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.goal.phi - dy * 0.005)); }
      } else if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX; p.y = e.clientY;
        const after = Math.hypot(a.x - b.x, a.y - b.y);
        if (before > 0) this.goal.radius = this.clampR(this.goal.radius * before / after);
        this.pan(dx / 2, dy / 2);
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
    }
    up(e) {
      const p = this.ptrs.get(e.pointerId);
      this.ptrs.delete(e.pointerId);
      if (p && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6 && this.onTap) this.onTap(e);
    }
    pan(dx, dy) {
      const k = this.goal.radius * 0.0016;
      const fwd = new T.Vector3(-Math.sin(this.goal.theta), 0, -Math.cos(this.goal.theta));
      const right = new T.Vector3(Math.cos(this.goal.theta), 0, -Math.sin(this.goal.theta));
      this.goal.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k);
    }
    set(o, dur = 0) {
      const g = { target: (o.target || this.goal.target).clone(), radius: o.radius ?? this.goal.radius, theta: o.theta ?? this.goal.theta, phi: o.phi ?? this.goal.phi };
      if (!dur) { Object.assign(this.goal, g); this.target.copy(g.target); this.radius = g.radius; this.theta = g.theta; this.phi = g.phi; this.tween = null; return; }
      this.tween = { from: { target: this.target.clone(), radius: this.radius, theta: this.theta, phi: this.phi }, to: g, t: 0, dur };
    }
    update(dt) {
      if (this.tween) {
        const tw = this.tween; tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        this.target.lerpVectors(tw.from.target, tw.to.target, e);
        this.radius = tw.from.radius + (tw.to.radius - tw.from.radius) * e;
        this.theta = tw.from.theta + (tw.to.theta - tw.from.theta) * e;
        this.phi = tw.from.phi + (tw.to.phi - tw.from.phi) * e;
        if (k >= 1) { this.tween = null; Object.assign(this.goal, { target: this.target.clone(), radius: this.radius, theta: this.theta, phi: this.phi }); }
      } else {
        if (this.auto) this.goal.theta += this.auto * dt;
        const a = 1 - Math.pow(0.0005, dt);
        this.target.lerp(this.goal.target, a);
        this.radius += (this.goal.radius - this.radius) * a;
        this.theta += (this.goal.theta - this.theta) * a;
        this.phi += (this.goal.phi - this.phi) * a;
      }
      const sp = Math.sin(this.phi);
      this.cam.position.set(
        this.target.x + this.radius * sp * Math.sin(this.theta),
        this.target.y + this.radius * Math.cos(this.phi),
        this.target.z + this.radius * sp * Math.cos(this.theta));
      this.cam.lookAt(this.target);
    }
  }

  function lights(scene, span) {
    scene.add(new T.HemisphereLight(0xffffff, 0xb9c3cf, 0.9));
    const d = new T.DirectionalLight(0xffffff, 0.95);
    d.position.set(span * 0.6, span * 1.1, span * 0.45);
    d.castShadow = true;
    d.shadow.mapSize.set(2048, 2048);
    const c = d.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.near = 1; c.far = span * 4;
    d.shadow.bias = -0.0005;
    scene.add(d);
    const fill = new T.DirectionalLight(0x8fb8ff, 0.3); fill.position.set(-span, span * 0.5, -span * 0.6); scene.add(fill);
  }
  E.lights = lights;

  E.init = function (canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    E.renderer = r;
    E.camera = new T.PerspectiveCamera(42, 1, 0.2, 2000);
    E.orbit = new Orbit(E.camera, canvas);
    E.canvas = canvas;
    E.ray = new T.Raycaster();
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      r.setSize(w, h, false);
      E.camera.aspect = w / h; E.camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      E.orbit.update(dt);
      E.frameFns.forEach(f => f(dt, now / 1000));
      if (E.scene) r.render(E.scene, E.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  E.pick = function (e, objects) {
    const rect = E.canvas.getBoundingClientRect();
    const m = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    E.ray.setFromCamera(m, E.camera);
    return E.ray.intersectObjects(objects, true)[0] || null;
  };
  E.project = function (v) {
    const p = v.clone().project(E.camera);
    const w = E.canvas.clientWidth, h = E.canvas.clientHeight;
    return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, vis: p.z < 1 && p.z > -1 };
  };

  /* ---------- 디오라마 ---------- */
  function signTexture(text, sub) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#0b2a52'; x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#ffffff'; x.font = '700 64px "Space Grotesk", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 256, sub ? 52 : 64);
    if (sub) { x.font = '500 24px "IBM Plex Sans KR", sans-serif'; x.fillStyle = '#7cc4ff'; x.fillText(sub, 256, 100); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }

  E.buildMap = function (sites) {
    const s = new T.Scene();
    s.background = new T.Color(0x0a1422);
    s.fog = new T.Fog(0x0a1422, 160, 320);
    lights(s, 70);
    const TILE = 19, COLS = 5, ROWS = 3;
    const w = COLS * TILE + 8, d = ROWS * TILE + 8;
    const base = new T.Mesh(new T.BoxGeometry(w + 3, 3, d + 3), new T.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8 }));
    base.position.y = -1.6; base.receiveShadow = true; s.add(base);
    const rim = new T.Mesh(new T.BoxGeometry(w + 3.4, 0.5, d + 3.4), new T.MeshStandardMaterial({ color: 0x14457f, metalness: 0.4, roughness: 0.4 }));
    rim.position.y = -3.2; s.add(rim);
    const ground = new T.Mesh(new T.BoxGeometry(w, 0.3, d), new T.MeshStandardMaterial({ color: 0x55606c, roughness: 0.95 }));
    ground.position.y = -0.15; ground.receiveShadow = true; s.add(ground);
    // 타일(블록)과 도로 차선
    const lane = new T.MeshBasicMaterial({ color: 0xe8e2c8 });
    for (let c = 0; c <= COLS; c++) { const ln = new T.Mesh(new T.PlaneGeometry(0.25, d), lane); ln.rotation.x = -Math.PI / 2; ln.position.set((c - COLS / 2) * TILE, 0.02, 0); s.add(ln); }
    for (let r = 0; r <= ROWS; r++) { const ln = new T.Mesh(new T.PlaneGeometry(w, 0.25), lane); ln.rotation.x = -Math.PI / 2; ln.position.set(0, 0.02, (r - ROWS / 2) * TILE); s.add(ln); }
    const tiles = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = (c - COLS / 2 + 0.5) * TILE, z = (r - ROWS / 2 + 0.5) * TILE;
      const blk = new T.Mesh(new T.BoxGeometry(TILE - 3.2, 0.35, TILE - 3.2), new T.MeshStandardMaterial({ color: 0x6f8a5c, roughness: 1 }));
      blk.position.set(x, 0.1, z); blk.receiveShadow = true; s.add(blk);
      tiles.push({ x, z });
    }
    // 나무
    const trees = [];
    tiles.forEach(t => { for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; const side = Math.random() > 0.5; trees.push([t.x + (side ? (Math.random() > 0.5 ? 1 : -1) * 7.6 : (Math.random() - 0.5) * 14), t.z + (side ? (Math.random() - 0.5) * 14 : (Math.random() > 0.5 ? 1 : -1) * 7.6)]); } });
    const crown = new T.InstancedMesh(new T.ConeGeometry(0.8, 2.2, 8), new T.MeshStandardMaterial({ color: 0x3c7a45, roughness: 0.9 }), trees.length);
    const dm = new T.Object3D();
    trees.forEach((p, i) => { dm.position.set(p[0], 1.6, p[1]); dm.scale.setScalar(0.7 + Math.random() * 0.5); dm.updateMatrix(); crown.setMatrixAt(i, dm.matrix); });
    crown.castShadow = true; s.add(crown);

    // 현장 미니어처
    const order = ['house', 'commercial', 'hospital', 'restaurant', 'park', 'factory', 'logistics', 'hq', 'plant', 'barn', 'datacenter', 'pool', 'greenhouse', 'parking', 'park'];
    const minis = [];
    order.forEach((id, i) => {
      const t = tiles[i];
      if (id === 'hq') {
        const g = new T.Group();
        const tw = new T.Mesh(new T.BoxGeometry(6, 14, 6), new T.MeshStandardMaterial({ color: 0x0f2d55, metalness: 0.5, roughness: 0.25, emissive: 0x0b3b7a, emissiveIntensity: 0.35 }));
        tw.position.y = 7; tw.castShadow = true; g.add(tw);
        const lowM = new T.MeshStandardMaterial({ color: 0xdde5ee, roughness: 0.5 });
        const low = new T.Mesh(new T.BoxGeometry(12, 3, 8), lowM); low.position.set(0, 1.5, 3); low.castShadow = true; g.add(low);
        const sign = new T.Mesh(new T.PlaneGeometry(8, 2), new T.MeshBasicMaterial({ map: signTexture('FANZIC', '쇼룸 · 본사') }));
        sign.position.set(0, 4.2, 7.05); g.add(sign);
        g.position.set(t.x, 0.3, t.z);
        s.add(g);
        return;
      }
      if (id === 'park') {
        const pond = new T.Mesh(new T.CylinderGeometry(4.5, 4.5, 0.2, 32), new T.MeshStandardMaterial({ color: 0x3b8fc4, roughness: 0.15, metalness: 0.2 }));
        pond.position.set(t.x, 0.35, t.z); s.add(pond);
        return;
      }
      const site = sites.find(x => x.id === id);
      const g = FZ.models.building(site, true);
      const sc = 13 / Math.max(site.dims.L, site.dims.W);
      g.scale.setScalar(sc);
      g.position.set(t.x, 0.3, t.z);
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.siteId = id; } });
      s.add(g);
      // 대표 팬 미니 아이콘 (회전)
      const p = FZ.eff(site.products[0].id);
      const fan = FZ.models.fan(p.model3d === 'defroster' ? 'propeller' : p.model3d, 1);
      const holder = new T.Group(); holder.add(fan.group);
      const topY = (site.dims.H + FZ.models.roofRise(site) + (site.roof === 'under' ? 1 : 0)) * sc + 0.3;
      holder.position.set(t.x + 5.2, topY + 1.4, t.z + 5.2);
      holder.scale.setScalar(1.3);
      if (fan.axis === 'z') holder.rotation.y = Math.PI / 4;
      fan.group.traverse(o => { if (o.isMesh) o.userData.siteId = id; });
      s.add(holder);
      const glow = new T.Mesh(new T.RingGeometry(6.6, 7.2, 48), new T.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(t.x, 0.32, t.z); s.add(glow);
      minis.push({ id, group: g, fan, holder, glow, labelPos: new T.Vector3(t.x, topY + 2.6, t.z), x: t.x, z: t.z });
    });
    E.mapScene = s;
    E.minis = minis;
    return s;
  };

  FZ.engine = E;
})();
