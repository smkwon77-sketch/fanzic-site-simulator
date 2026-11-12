/* 효과 계산 모델 — 순수 함수. 모든 결과는 단순 모델 기반 참고 추정치.
   환기:   ACH = Q / V,   C(t) = Css + (C0 - Css)·e^(-ACH·t),   Css = Cout + G / Q
   온도:   Tss = Tout + H / (UA + Q/3000)   (ρ·cp ≈ 1.2 kJ/㎥K → Q[㎥/h]/3000 = kW/K)
   체감:   사람 CE = 4.5·(1 - e^(-v/1.0)),  가축 CE = 7·(1 - e^(-v/1.6))  [℃]
   가축:   THI = 0.8T + RH/100·(T - 14.4) + 46.4 */
window.FZ = window.FZ || {};

(function () {
  const P = () => FZ.PRODUCTS;

  function geom(site) {
    const { L, W, H } = site.dims;
    return { V: L * W * H, A: L * W, cross: W * H, L, W, H };
  }

  function unitFlow(p) { return p.airflow * (p.eff || 1); }

  function recommend(site, item) {
    const p = P()[item.id];
    const g = geom(site);
    const s = item.sizing || { type: 'fixed', n: 1 };
    const fq = unitFlow(p) || 1;
    const c = site.cond;
    const Qnat = c.q0 != null ? 0 : (c.ach0 || 0) * g.V; // 기존 자연환기량은 빼고 산정
    let n = 1;
    switch (s.type) {
      case 'ach': n = Math.ceil(Math.max(0, s.target * g.V - Qnat) / fq); break;
      case 'velocity': n = Math.ceil(Math.max(0, s.target * g.cross * 3600 - Qnat) / fq); break;
      case 'cover': n = Math.ceil(g.A / p.cover); break;
      case 'perArea': n = Math.ceil(g.A / s.value); break;
      case 'flowPerArea': n = Math.ceil(g.A * s.value / fq); break;
      case 'perPerson': n = Math.ceil((c.workers || 0) * s.value / fq); break;
      case 'perWorkers': n = Math.ceil((c.workers || 0) / s.value); break;
      case 'heat': n = Math.ceil(c.heat * 3000 / s.dT / fq); break;
      case 'fixed': n = s.n; break;
    }
    return Math.max(1, Math.min(40, n));
  }

  function xsat(T) { // 포화 절대습도 g/kg
    const es = 0.6108 * Math.exp(17.27 * T / (T + 237.3));
    return 622 * es / (101.325 - es);
  }
  function ceHuman(v) { return 4.5 * (1 - Math.exp(-v / 1.0)); }
  function ceAnimal(v) { return 7 * (1 - Math.exp(-v / 1.6)); }
  function thi(T, rh) { return 0.8 * T + rh / 100 * (T - 14.4) + 46.4; }

  function compute(site, qty, prm) {
    const g = geom(site);
    const c = site.cond;
    const items = site.products.map(it => ({ ...it, p: P()[it.id], n: qty[it.id] ?? recommend(site, it) }));

    // 환기량
    const Q0 = c.q0 != null ? c.q0 : (c.ach0 || 0) * g.V;
    let Qfan = 0;
    items.forEach(it => { if (it.p.role === 'exhaust') Qfan += it.n * unitFlow(it.p); });
    const Q = c.q0 != null ? Qfan : Q0 + Qfan;
    const ach0 = Q0 / g.V, ach = Q / g.V;

    // 풍속 (면적 평균)
    const vThrough = q => q / (3600 * g.cross);
    let mix = 0, hvlsN = 0, hvlsCover = 0;
    items.forEach(it => {
      const p = it.p;
      if (p.role === 'hvls' || p.role === 'circulate' || p.role === 'spot') {
        const frac = Math.min(1, it.n * p.cover / g.A);
        mix += p.speed * p.speed * frac;
        if (p.role === 'hvls') { hvlsN += it.n; hvlsCover = Math.min(g.A, it.n * p.cover); }
      }
    });
    const v0 = vThrough(Q0);
    const v1 = Math.sqrt(vThrough(Q) ** 2 + mix);
    const animal = site.mode === 'livestock';
    const ce = animal ? ceAnimal : ceHuman;

    // 온도
    const tempOn = !site.tempOff;
    const tss = q => c.tOut + c.heat / ((c.UA || 0) + q / 3000);
    const T0 = tempOn ? tss(Q0) : (c.tIn || 26);
    const T1 = tempOn ? tss(Q) : (c.tIn || 26);
    const tauT = Math.max(0.05, 4 * g.V / Math.max(Q, 1)); // h
    const Teff0 = T0 - (T0 > 22 ? ce(v0) : 0);

    // 오염물
    let pol = null;
    const pd = site.pollutant;
    if (pd) {
      if (pd.kind === 'moisture') {
        const tin = c.tIn || 30;
        const xs = q => pd.xOut + pd.evap / (1.2 * Math.max(q, 1));
        const x0 = xs(Q0), x1 = xs(Q);
        const rh = x => Math.min(100, 100 * x / xsat(tin));
        pol = { ...pd, c0: rh(x0), c1: rh(x1), at: h => rh(x1 + (x0 - x1) * Math.exp(-ach * h)) };
      } else {
        const G = (pd.c0 - pd.cOut) * Q0;
        const c1 = pd.cOut + G / Math.max(Q, 1);
        pol = { ...pd, c0: pd.c0, c1, at: h => c1 + (pd.c0 - c1) * Math.exp(-ach * h) };
      }
      // 기준 도달 시간
      pol.reachMin = null;
      if (pol.c0 > pol.limit && pol.c1 <= pol.limit) {
        for (let m = 0; m <= 600; m++) { if (pol.at(m / 60) <= pol.limit) { pol.reachMin = m; break; } }
      }
    }

    function at(tMin) {
      if (tMin <= 0) return { T: T0, Teff: Teff0, C: pol ? pol.c0 : null, v: v0 };
      const h = tMin / 60;
      const ramp = Math.min(1, tMin / 1.5);
      const T = T1 + (T0 - T1) * Math.exp(-h / tauT);
      const v = v0 + (v1 - v0) * ramp;
      return { T, Teff: T - (T > 22 ? ce(v) : 0), C: pol ? pol.at(h) : null, v };
    }
    const end = at(60), steady = { T: T1, Teff: T1 - (T1 > 22 ? ce(v1) : 0), C: pol ? pol.c1 : null, v: v1 };

    // 에너지
    const load = 0.8;
    const hrs = site.hours * site.days * load;
    let kW = 0, baseKW = 0, replaced = 0;
    const baseNotes = [];
    items.forEach(it => {
      const p = it.p;
      if (p.role === 'none') return;
      const k = it.n * p.power / 1000;
      kW += k;
      if (p.ec) {
        const b = k / (1 - prm.ecSave / 100);
        baseKW += b;
        baseNotes.push(`동일 풍량 AC팬 ${it.n}대 ${b.toFixed(1)}kW`);
      } else if (p.role === 'hvls') {
        replaced = Math.round(hvlsCover / 60);
        baseKW += replaced * 0.25;
        baseNotes.push(`공업용 선풍기 ${replaced}대 × 0.25kW`);
      } else {
        baseKW += k;
      }
    });
    const kWh = kW * hrs;
    const costWon = kWh * prm.elecPrice;
    const saveKWh = Math.max(0, (baseKW - kW) * hrs);
    const saveWon = saveKWh * prm.elecPrice;
    const co2t = saveKWh * prm.co2Factor / 1000;

    // 생산성·축산
    let prod = null;
    const workers = c.workers || 0;
    if (site.mode === 'worker' && tempOn) {
      const loss = t => Math.min(15, Math.max(0, t - 25) * prm.heatLoss);
      const l0 = loss(Teff0), l1 = loss(steady.Teff);
      const value = workers * prm.wage * (l0 - l1) / 100 * prm.hotDays / 250;
      prod = { kind: 'worker', label: '고온기 작업 효율 저하', before: l0, after: l1, unit: '%', value,
        valueLabel: `작업자 ${workers}명 · 고온기 ${prm.hotDays}일 환산` };
    } else if (site.mode === 'office' && pol) {
      const loss = cc => Math.min(5, Math.max(0, (cc - 1000) / 400) * 1);
      const l0 = loss(pol.c0), l1 = loss(pol.c1);
      const value = workers * prm.wage * (l0 - l1) / 100;
      prod = { kind: 'worker', label: 'CO₂로 인한 업무 효율 저하', before: l0, after: l1, unit: '%', value,
        valueLabel: `재실자 ${workers}명 · 연간 환산` };
    } else if (site.mode === 'livestock') {
      const lv = site.livestock;
      const th0 = thi(Teff0, c.rh), th1 = thi(steady.Teff, c.rh);
      const mort = x => 3 + 0.3 * Math.max(0, x - 72);
      const gl = x => 1.0 * Math.max(0, x - 72);
      const heads = c.animals * (mort(th0) - mort(th1)) / 100 * lv.flocks;
      const growth = c.animals * lv.flocks * (gl(th0) - gl(th1)) / 100 * lv.value;
      prod = { kind: 'livestock', thi0: th0, thi1: th1, mort0: mort(th0), mort1: mort(th1), g0: gl(th0), g1: gl(th1),
        heads, value: (heads * lv.value + growth) / 10000,
        valueLabel: `${lv.label} ${c.animals.toLocaleString()}수 · 여름 ${lv.flocks}회전` };
    } else if (site.mode === 'crop' && tempOn) {
      const loss = t => Math.min(40, Math.max(0, t - 28) * 3);
      const l0 = loss(Teff0), l1 = loss(steady.Teff);
      const value = g.A * 3 * (l0 - l1) / 100 * prm.hotDays / 365;
      prod = { kind: 'crop', label: '고온기 수량 감소', before: l0, after: l1, unit: '%', value,
        valueLabel: `재배면적 ${g.A.toLocaleString()}㎡ · ㎡당 연매출 3만원 가정` };
    } else if (site.mode === 'it') {
      const inlet = T => 18 + 0.3 * (T - 18);
      prod = { kind: 'it', label: '서버 흡기 온도', before: inlet(T0), after: inlet(T1), unit: '℃', limit: 27, value: 0 };
    }

    const totalBenefit = saveWon / 10000 + (prod && prod.value > 0 ? prod.value : 0); // 만원/년
    const payback = prm.installCost > 0 && totalBenefit > 0 ? prm.installCost / totalBenefit : null;

    return {
      site, items, g, Q0, Q, Qfan, ach0, ach, v0, v1, T0, T1, Teff0, tempOn, pol, at, end, steady,
      energy: { kW, baseKW, kWh, costWon, saveKWh, saveWon, co2t, baseNotes, replaced, hrs },
      prod, totalBenefit, payback, animal
    };
  }

  FZ.sim = { recommend, compute, geom, thi, xsat };
})();
