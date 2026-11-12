/* 공기 흐름 파티클, 바닥 히트맵, 결과 차트 */
window.FZ = window.FZ || {};

(function () {
  const T = THREE;
  const X = {};

  const RAMP_T = [[16, [43, 108, 176]], [22, [34, 211, 238]], [26, [74, 222, 128]], [30, [250, 204, 21]], [34, [249, 115, 22]], [38, [220, 38, 38]]];
  const RAMP_C = [[0, [34, 211, 238]], [0.6, [74, 222, 128]], [1, [250, 204, 21]], [1.6, [249, 115, 22]], [2.4, [153, 27, 27]]];
  function ramp(R, v) {
    if (v <= R[0][0]) return R[0][1];
    for (let i = 1; i < R.length; i++) if (v <= R[i][0]) {
      const [a, ca] = R[i - 1], [b, cb] = R[i], k = (v - a) / (b - a);
      return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
    }
    return R[R.length - 1][1];
  }
  X.ramp = ramp; X.RAMP_T = RAMP_T; X.RAMP_C = RAMP_C;

  /* ---------- 속도장 ---------- */
  class Field {
    constructor(site, pls) {
      const { L, W, H } = site.dims;
      this.L = L; this.W = W; this.H = H;
      this.S = Math.max(L, W) * 0.09 + 1.5;
      this.pls = pls.filter(p => p.flow !== 'none');
      const sinks = this.pls.filter(p => p.flow === 'sink');
      this.sinkW = sinks.length ? 1 / Math.sqrt(sinks.length) : 0;
      const c = new T.Vector3(); sinks.forEach(p => c.add(p.pos)); if (sinks.length) c.divideScalar(sinks.length);
      const inl = new T.Vector3();
      (site.inlets || []).forEach(f => { const a = f[1], s = f[0] === '-' ? -1 : 1; inl[a] += s * (a === 'x' ? L / 2 : W / 2); });
      if (site.inlets && site.inlets.length) inl.divideScalar(site.inlets.length);
      this.drift = sinks.length ? c.clone().sub(inl).setY(0).normalize() : new T.Vector3();
      this.R = Math.max(L, W) * 0.3;
    }
    at(p, out, on, t) {
      const S = this.S;
      out.set(Math.sin(p.y * 0.7 + t * 0.6 + p.z * 0.1), Math.sin(p.x * 0.1 + t * 0.5) * 0.4, Math.cos(p.x * 0.08 + t * 0.4)).multiplyScalar(S * 0.05);
      if (!on) return out;
      out.addScaledVector(this.drift, S * 0.35);
      const tmp = X._v || (X._v = new T.Vector3());
      for (const pl of this.pls) {
        tmp.subVectors(pl.pos, p);
        if (pl.flow === 'sink') {
          const r = tmp.length() + 0.01;
          const kRoof = pl.mount === 'roof' ? 0.55 : 1;
          out.addScaledVector(tmp, kRoof * S * 1.6 * this.sinkW / r * (this.R * this.R) / (r * r + this.R * this.R));
        } else if (pl.flow === 'jet') {
          tmp.negate();
          const fd = pl.fdir || pl.dir;
          const al = tmp.dot(fd);
          if (al > -0.5) {
            const lat2 = tmp.lengthSq() - al * al;
            const w = pl.p.size * 0.8 + Math.max(0, al) * 0.18;
            out.addScaledVector(fd, S * 1.3 * Math.exp(-lat2 / (w * w)) / (1 + Math.max(0, al) / (this.L * 0.25)));
          }
        } else if (pl.flow === 'down') {
          const dx = p.x - pl.pos.x, dz = p.z - pl.pos.z, rh = Math.hypot(dx, dz) + 0.01;
          const R = pl.kind === 'hvls' ? pl.p.size * 0.75 : Math.max(1.4, pl.p.size * 3);
          if (p.y < pl.pos.y) {
            out.y -= S * 1.1 * Math.exp(-(rh * rh) / (R * R));
            const nearFloor = Math.max(0, 1 - p.y / 1.8);
            const rad = S * 0.9 * nearFloor * Math.exp(-((rh - R) * (rh - R)) / (R * R * 2.2));
            out.x += dx / rh * rad; out.z += dz / rh * rad;
            if (rh > R * 1.4 && p.y < this.H * 0.8) out.y += S * 0.12 * Math.exp(-((rh - 2 * R) ** 2) / (R * R * 2));
          }
        }
      }
      const m = out.length(), cap = S * 2.6;
      if (m > cap) out.multiplyScalar(cap / m);
      return out;
    }
  }
  X.Field = Field;

  /* ---------- 파티클 ---------- */
  X.Particles = class {
    constructor(scene, site, field, n = 1800) {
      this.site = site; this.field = field; this.n = n;
      const geo = new T.BufferGeometry();
      this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
      this.age = new Float32Array(n); this.life = new Float32Array(n);
      this.kind = new Uint8Array(n); this.src = new Int16Array(n);
      this.intakes = field.pls.filter(p => p.mode === 'intake' && p.out);
      this.exhausts = field.pls.filter(p => p.mode === 'exhaust' && p.out);
      for (let i = 0; i < n; i++) {
        if (this.intakes.length && i < n * 0.3) this.kind[i] = 1;
        else if (this.exhausts.length && i >= n * 0.3 && i < n * 0.5) this.kind[i] = 2;
      }
      geo.setAttribute('position', new T.BufferAttribute(this.pos, 3));
      geo.setAttribute('color', new T.BufferAttribute(this.col, 3));
      const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
      const sz = Math.max(0.28, Math.max(site.dims.L, site.dims.W) * 0.011);
      this.mat = new T.PointsMaterial({ size: sz * 1.35, map: tex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05, opacity: 0.9 });
      this.points = new T.Points(geo, this.mat);
      this.points.frustumCulled = false;
      scene.add(this.points);
      this.v = new T.Vector3(); this.p = new T.Vector3();
      for (let i = 0; i < n; i++) this.spawn(i, true);
    }
    spawn(i, init) {
      const { L, W, H } = this.site.dims;
      const kd = this.kind[i];
      if (kd) {
        const list = kd === 1 ? this.intakes : this.exhausts;
        const j = Math.floor(Math.random() * list.length), pl = list[j];
        this.src[i] = j;
        const s = pl.p.size, r = () => (Math.random() - 0.5) * s * 1.4;
        const d = kd === 1 ? 1.2 + Math.random() * 3 : 0.3 + Math.random() * 0.4;
        this.pos[i * 3] = pl.pos.x + pl.out.x * d + r() * (1 - Math.abs(pl.out.x));
        this.pos[i * 3 + 1] = pl.pos.y + pl.out.y * d + r() * (1 - Math.abs(pl.out.y));
        this.pos[i * 3 + 2] = pl.pos.z + pl.out.z * d + r() * (1 - Math.abs(pl.out.z));
        this.age[i] = init ? Math.random() * 2 : 0; this.life[i] = kd === 1 ? 3 + Math.random() * 3 : 1.6 + Math.random() * 1.6;
        return;
      }
      const inl = this.site.inlets || [];
      // 사람·가축이 있는 바닥 근처 기류가 잘 보이도록 낮은 높이에 더 많이 생성
      let x = (Math.random() - 0.5) * L * 0.98, y = 0.2 + Math.pow(Math.random(), 1.7) * (H - 0.4), z = (Math.random() - 0.5) * W * 0.98;
      if (!init && inl.length && Math.random() < 0.45) {
        const f = inl[Math.floor(Math.random() * inl.length)];
        if (f[1] === 'x') x = (f[0] === '-' ? -1 : 1) * L / 2 * 0.97; else z = (f[0] === '-' ? -1 : 1) * W / 2 * 0.97;
      }
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.age[i] = init ? Math.random() * 6 : 0; this.life[i] = 4 + Math.random() * 5;
    }
    update(dt, on, t, colorFn) {
      const { L, W, H } = this.site.dims;
      const f = this.field, pls = f.pls;
      const BG = [238, 241, 245];
      for (let i = 0; i < this.n; i++) {
        const k = i * 3, kd = this.kind[i];
        this.p.set(this.pos[k], this.pos[k + 1], this.pos[k + 2]);
        if (kd) {
          // 흡기: 바깥 신선 공기가 팬으로 모였다가 실내로 / 배기: 팬에서 바깥으로 뿜어져 나감
          if (!on) { this.col[k] = BG[0] / 255; this.col[k + 1] = BG[1] / 255; this.col[k + 2] = BG[2] / 255; continue; }
          const pl = (kd === 1 ? this.intakes : this.exhausts)[this.src[i]];
          if (!pl) { this.spawn(i, false); continue; }
          if (kd === 1) {
            this.v.subVectors(this.p, pl.pos);
            if (this.v.dot(pl.out) > 0.15) this.v.subVectors(pl.pos, this.p).normalize().multiplyScalar(f.S * 0.9);
            else f.at(this.p, this.v, true, t);
          } else {
            this.v.copy(pl.out).multiplyScalar(f.S * 1.1);
            this.v.y += f.S * 0.12; this.v.x += Math.sin(t * 3 + i) * f.S * 0.1; this.v.z += Math.cos(t * 3 + i) * f.S * 0.1;
          }
          this.p.addScaledVector(this.v, dt);
          this.age[i] += dt;
          if (this.age[i] > this.life[i]) { this.spawn(i, false); continue; }
          this.pos[k] = this.p.x; this.pos[k + 1] = this.p.y; this.pos[k + 2] = this.p.z;
          const fade = Math.max(0.55, Math.min(1, this.age[i] * 3, (this.life[i] - this.age[i]) * 2));
          const c = kd === 1 ? [2, 132, 199] : (this.age[i] / this.life[i] < 0.5 ? [234, 88, 12] : [140, 120, 110]);
          for (let q = 0; q < 3; q++) this.col[k + q] = (c[q] * fade + BG[q] * (1 - fade)) / 255;
          continue;
        }
        f.at(this.p, this.v, on, t);
        this.p.addScaledVector(this.v, dt);
        this.age[i] += dt;
        let dead = this.age[i] > this.life[i] || Math.abs(this.p.x) > L / 2 + 2 || Math.abs(this.p.z) > W / 2 + 2 || this.p.y < 0.05 || this.p.y > H + 4;
        if (!dead && on) for (const pl of pls) if (pl.flow === 'sink' && this.p.distanceToSquared(pl.pos) < (pl.p.size * 0.6) ** 2) { dead = true; break; }
        if (dead) { this.spawn(i, false); continue; }
        this.pos[k] = this.p.x; this.pos[k + 1] = this.p.y; this.pos[k + 2] = this.p.z;
        const c = colorFn(this.p.x, this.p.z, this.v.length() / f.S);
        const fade = Math.min(1, this.age[i] * 2, (this.life[i] - this.age[i]) * 1.5);
        for (let q = 0; q < 3; q++) this.col[k + q] = (c[q] * 0.85 * fade + BG[q] * (1 - fade)) / 255;
      }
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
    dispose() { this.points.geometry.dispose(); this.mat.dispose(); this.points.parent && this.points.parent.remove(this.points); }
  };

  /* ---------- 히트맵 ---------- */
  X.Heatmap = class {
    constructor(scene, site, field) {
      const { L, W } = site.dims;
      this.site = site; this.field = field;
      this.nx = 72; this.nz = Math.max(18, Math.round(72 * W / L));
      this.c = document.createElement('canvas'); this.c.width = this.nx; this.c.height = this.nz;
      this.ctx = this.c.getContext('2d'); this.img = this.ctx.createImageData(this.nx, this.nz);
      this.tex = new T.CanvasTexture(this.c); this.tex.magFilter = T.LinearFilter; this.tex.minFilter = T.LinearFilter;
      this.mesh = new T.Mesh(new T.PlaneGeometry(L, W), new T.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 0.6, depthWrite: false }));
      this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.y = 0.05;
      scene.add(this.mesh);
      this.mag = new Float32Array(this.nx * this.nz); this.vals = new Float32Array(this.nx * this.nz);
      this.mean = 1;
      this.hs = (site.heatSources || []).map(([x, z, r, a]) => ({ x: x * L, z: z * site.dims.W, r: r * Math.max(L, site.dims.W), a }));
    }
    sampleField(on, t) {
      const { L, W } = this.site.dims, p = new T.Vector3(), v = new T.Vector3();
      let sum = 0;
      for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
        p.set(((i + 0.5) / this.nx - 0.5) * L, 1.2, ((j + 0.5) / this.nz - 0.5) * W);
        const m = on ? Math.hypot(this.field.at(p, v, true, 0).x, v.z) : 0;
        this.mag[j * this.nx + i] = m; sum += m;
      }
      this.mean = sum / (this.nx * this.nz) || 1;
    }
    // 위치별 값 계산 (mode: temp | feel | pol)
    local(x, z, st, res, mode, magN) {
      const site = this.site;
      if (mode === 'pol') {
        const base = st.C / res.pol.limit;
        const stag = res.v1 > 0 && st.on ? Math.max(0.35, 1.5 - magN * 0.6) : 1;
        let hot = 0; for (const h of this.hs) hot += 0.5 * Math.exp(-((x - h.x) ** 2 + (z - h.z) ** 2) / (h.r * h.r));
        return base * stag * (1 + hot);
      }
      const excess = Math.max(0, st.T - site.cond.tOut);
      let T0 = st.T;
      for (const h of this.hs) T0 += excess * 0.7 * h.a * Math.exp(-((x - h.x) ** 2 + (z - h.z) ** 2) / (h.r * h.r));
      T0 -= excess * 0.25 * Math.min(1.5, magN) * (st.on ? 1 : 0);
      if (mode === 'feel' && T0 > 22) {
        const v = st.on ? magN * res.v1 : res.v0;
        T0 -= res.animal ? 7 * (1 - Math.exp(-v / 1.6)) : 4.5 * (1 - Math.exp(-v / 1.0));
      }
      return T0;
    }
    update(st, res, mode) {
      const { L, W } = this.site.dims;
      const d = this.img.data;
      for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
        const idx = j * this.nx + i;
        const x = ((i + 0.5) / this.nx - 0.5) * L, z = ((j + 0.5) / this.nz - 0.5) * W;
        const magN = this.mag[idx] / this.mean;
        const val = this.local(x, z, st, res, mode, magN);
        this.vals[idx] = val;
        const c = ramp(mode === 'pol' ? RAMP_C : RAMP_T, val);
        const o = ((this.nz - 1 - j) * this.nx + i) * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
      this.ctx.putImageData(this.img, 0, 0);
      this.tex.needsUpdate = true;
    }
    valueAt(x, z) {
      const { L, W } = this.site.dims;
      const i = Math.max(0, Math.min(this.nx - 1, Math.floor((x / L + 0.5) * this.nx)));
      const j = Math.max(0, Math.min(this.nz - 1, Math.floor((z / W + 0.5) * this.nz)));
      return this.vals[j * this.nx + i];
    }
    dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.tex.dispose(); this.mesh.parent && this.mesh.parent.remove(this.mesh); }
  };

  /* ---------- 차트 (Canvas 2D) ---------- */
  function niceTicks(lo, hi, n = 4) {
    const span = hi - lo || 1;
    const step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0;
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
    const out = []; for (let v = a; v <= b + step * 0.01; v += step) out.push(+v.toFixed(6));
    return out;
  }
  X.chart = function (cv, o) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const col = k => css.getPropertyValue(k).trim();
    x.clearRect(0, 0, w, h);
    const pad = { l: 44, r: 12, t: 10, b: 24 };
    const vals = o.after.concat([o.before]); if (o.limit != null) vals.push(o.limit);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const m = (hi - lo) * 0.12 || 1; lo -= m; hi += m;
    if (o.zero) lo = Math.min(0, lo);
    const ticks = niceTicks(lo, hi); lo = ticks[0]; hi = ticks[ticks.length - 1];
    const X0 = pad.l, X1 = w - pad.r, Y0 = h - pad.b, Y1 = pad.t;
    const sx = t => X0 + (t / 60) * (X1 - X0), sy = v => Y0 - (v - lo) / (hi - lo) * (Y0 - Y1);
    x.font = '11px "IBM Plex Mono", monospace'; x.fillStyle = col('--muted'); x.strokeStyle = col('--grid'); x.lineWidth = 1;
    x.textAlign = 'right'; x.textBaseline = 'middle';
    ticks.forEach(v => { const y = sy(v); x.beginPath(); x.moveTo(X0, y); x.lineTo(X1, y); x.stroke(); x.fillText(o.fmt(v), X0 - 6, y); });
    x.textAlign = 'center'; x.textBaseline = 'top';
    [0, 15, 30, 45, 60].forEach(t => x.fillText(t + '분', sx(t), Y0 + 6));
    if (o.limit != null && o.limit > lo && o.limit < hi) {
      x.strokeStyle = col('--warn'); x.setLineDash([2, 3]); x.beginPath(); x.moveTo(X0, sy(o.limit)); x.lineTo(X1, sy(o.limit)); x.stroke();
      x.setLineDash([]); x.fillStyle = col('--warn'); x.textAlign = 'right'; x.textBaseline = 'bottom'; x.fillText('기준 ' + o.fmt(o.limit), X1, sy(o.limit) - 2);
    }
    x.strokeStyle = col('--before'); x.setLineDash([5, 4]); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(X0, sy(o.before)); x.lineTo(X1, sy(o.before)); x.stroke(); x.setLineDash([]);
    // 면 + 선
    const n = o.after.length;
    const grad = x.createLinearGradient(0, Y1, 0, Y0); grad.addColorStop(0, col('--accent-a')); grad.addColorStop(1, 'rgba(0,0,0,0)');
    x.beginPath(); x.moveTo(sx(0), Y0);
    o.after.forEach((v, i) => x.lineTo(sx(i * 60 / (n - 1)), sy(v)));
    x.lineTo(sx(60), Y0); x.closePath(); x.fillStyle = grad; x.fill();
    x.beginPath(); o.after.forEach((v, i) => { const px = sx(i * 60 / (n - 1)), py = sy(v); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = col('--accent'); x.lineWidth = 2.2; x.stroke();
    // 현재 시점
    const tc = Math.max(0, Math.min(60, o.t));
    const vi = o.valueAt(tc);
    x.strokeStyle = col('--fg'); x.globalAlpha = 0.35; x.lineWidth = 1; x.beginPath(); x.moveTo(sx(tc), Y1); x.lineTo(sx(tc), Y0); x.stroke(); x.globalAlpha = 1;
    x.fillStyle = col('--accent'); x.beginPath(); x.arc(sx(tc), sy(vi), 4.5, 0, Math.PI * 2); x.fill();
    x.strokeStyle = col('--panel'); x.lineWidth = 2; x.stroke();
  };

  FZ.fx = X;
})();
