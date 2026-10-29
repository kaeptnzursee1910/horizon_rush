// B6 Wolken-Wettklettern: alle hüpfen gleichzeitig auf Wolken nach oben, das Bild scrollt mit
'use strict';

HR.AR.define({
  code: 'B6', name: 'Wolken-Wettklettern', short: 'Immer nach oben!',
  desc: 'Alle hüpfen gleichzeitig von Wolke zu Wolke nach oben. Gesprungen wird von selbst, du steuerst nur nach links und rechts. Wer links aus dem Bild hüpft, kommt rechts wieder herein. Das Bild scrollt immer schneller nach oben. Goldene Wolken sind Sprungfedern, mit dem Schubser stößt du Mitspieler in der Nähe weg.',
  goal: 'Nicht unten aus dem Bild fallen. Wer als Letzter übrig ist, gewinnt.',
  touch: 'links ◀ ▶ bewegen, rechts SCHUBS', keys: '← → bewegen, Leertaste schubsen',
  padL: [['left', '◀'], ['right', '▶']], padR: [['act', 'SCHUBS']],
  duration: 120, ROW: 95, wrap: { x: 1600 },

  init(players, rnd) {
    const n = players.length;
    return {
      seed: rnd.randint(1, 1e9), cb: 0, rows: new Map(),
      p: players.map((pl, i) => ({ id: pl.id, c: pl.c, x: 1600 * (i + 0.5) / n, h: 0, vx: 0, vh: 900, al: 1, dt: 0, cd: 0, pf: 0, f: 1 })),
    };
  },

  row(S, r) {
    let row = S.rows.get(r);
    if (row) return row;
    row = [];
    if (r === 0) row.push({ x: 800, w: 1700, k: 'g' });
    else {
      const rnd = U.rng((S.seed ^ Math.imul(r, 2654435761)) >>> 0);
      const cnt = 1 + (rnd.random() < 0.5 ? 1 : 0) + (r < 25 ? 1 : 0);
      for (let i = 0; i < cnt; i++) {
        const w = Math.max(130, 270 - r * 0.9);
        const t = rnd.random(), k = t < 0.07 ? 's' : t < 0.24 ? 'm' : 'n';
        const amp = k === 'm' ? rnd.uniform(120, 260) : 0;
        row.push({ x: rnd.uniform(100 + amp, 1500 - amp), w, k, amp, sp: rnd.uniform(0.6, 1.4), ph: rnd.uniform(0, 6.28) });
      }
    }
    S.rows.set(r, row);
    if (S.rows.size > 400) S.rows.delete(S.rows.keys().next().value);
    return row;
  },

  cx(c, t) { return c.k === 'm' ? c.x + Math.sin(t * c.sp + c.ph) * c.amp : c.x; },

  step(S, inp, dt, G) {
    const ROW = this.ROW;
    for (const p of S.p) {
      if (!p.al) continue;
      const i = inp[p.id];
      const want = (i.r ? 1 : 0) - (i.l ? 1 : 0);
      if (want) { p.vx += want * 2600 * dt; p.f = want; }
      else p.vx *= Math.pow(0.02, dt);
      p.vx = U.clamp(p.vx, -440, 440);
      p.x = ((p.x + p.vx * dt) % 1600 + 1600) % 1600;
      const ph = p.h;
      p.vh -= 1750 * dt;
      p.h += p.vh * dt;
      if (p.vh < 0) {
        for (let r = Math.floor(ph / ROW); r >= Math.max(0, Math.floor(p.h / ROW)); r--) {
          const top = r * ROW;
          if (ph < top || p.h > top) continue;
          for (const c of this.row(S, r)) {
            const dx = Math.abs(((p.x - this.cx(c, S.time)) % 1600 + 2400) % 1600 - 800);
            if (dx < c.w / 2 + 12 || c.k === 'g') {
              if (c.k === 'g' && S.time > 8) continue; // der Boden verschwindet nach einer Weile
              p.h = top; p.vh = c.k === 's' ? 1650 : 1000;
              if (c.k === 's') G.sfx('go', p.id);
              break;
            }
          }
          if (p.h === top) break;
        }
      }
      if (p.cd > 0) p.cd -= dt;
      if (p.pf > 0) p.pf -= dt;
      if (i.pa && p.cd <= 0) {
        p.cd = 1.2; p.pf = 0.3;
        let hit = false;
        for (const o of S.p) {
          if (o === p || !o.al) continue;
          let dx = ((o.x - p.x) % 1600 + 2400) % 1600 - 800;
          if (Math.hypot(dx, o.h - p.h) < 140) { o.vx = (dx >= 0 ? 1 : -1) * 700; o.vh = Math.min(o.vh, -250); hit = true; }
        }
        G.sfx(hit ? 'bump' : 'blip');
      }
    }
    // Kamera
    if (S.time > 4) S.cb += (35 + S.time * 2.3) * dt;
    let top = 0; for (const p of S.p) if (p.al && p.h > top) top = p.h;
    S.cb = Math.max(S.cb, top - 860);
    for (const p of S.p) if (p.al && p.h < S.cb - 60) { p.al = 0; p.dt = S.time; G.sfx('crash'); }
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S, p => Math.round(p.h / 10)); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, 1000 - (p.h - S.cb) - 24],
  status: (S, p) => Math.max(0, Math.floor(p.h / 50)) + ' m',
  kill(S, p) { p.al = 0; p.dt = S.time; },

  pack(S) { return { t: +S.time.toFixed(3), cb: Math.round(S.cb), p: S.p.map(p => ({ x: Math.round(p.x), h: Math.round(p.h), al: p.al, dt: p.dt, f: p.f, pf: p.pf > 0 ? 1 : 0, g: p.gone ? 1 : 0, v: p.vh > 0 ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.cb = d.cb;
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.h = q.h; p.al = q.al; p.dt = q.dt; p.f = q.f; p.pf = q.pf; p.gone = q.g; p.vh = q.v ? 1 : -1; });
  },

  draw(g, S, G) {
    G.world(g);
    g.beginPath(); g.rect(0, 0, 1600, 1000); g.clip();
    const hgt = Math.min(1, S.cb / 9000);
    const top = U.mix([110, 180, 245], [12, 14, 50], hgt), bot = U.mix([190, 225, 255], [40, 50, 110], hgt);
    const grd = g.createLinearGradient(0, 0, 0, 1000); grd.addColorStop(0, U.rgb(top)); grd.addColorStop(1, U.rgb(bot));
    g.fillStyle = grd; g.fillRect(0, 0, 1600, 1000);
    if (hgt > 0.3) {
      g.fillStyle = `rgba(255,255,255,${(hgt - 0.3) * 0.9})`;
      for (let k = 0; k < 60; k++) { const sx = (k * 263) % 1600, sy = ((k * 157 + S.cb * 0.1) % 1000); g.fillRect(sx, 1000 - sy, 2, 2); }
    }
    const Y = h => 1000 - (h - S.cb);
    const r0 = Math.max(0, Math.floor((S.cb - 60) / this.ROW)), r1 = Math.ceil((S.cb + 1060) / this.ROW);
    for (let r = r0; r <= r1; r++) {
      for (const c of this.row(S, r)) {
        const y = Y(r * this.ROW);
        if (c.k === 'g') {
          if (S.time > 8) continue;
          g.fillStyle = '#5cb85c'; g.fillRect(0, y, 1600, 1100 - y); g.fillStyle = '#4a9a4a'; g.fillRect(0, y, 1600, 10);
          continue;
        }
        const x = this.cx(c, S.time);
        for (const xx of [x - 1600, x, x + 1600]) {
          if (xx < -200 || xx > 1800) continue;
          g.fillStyle = c.k === 's' ? '#ffd84a' : c.k === 'm' ? '#dff0ff' : '#ffffff';
          g.beginPath();
          g.ellipse(xx, y + 4, c.w / 2, 16, 0, 0, 7);
          g.ellipse(xx - c.w * 0.2, y - 6, c.w * 0.22, 18, 0, 0, 7);
          g.ellipse(xx + c.w * 0.18, y - 8, c.w * 0.25, 20, 0, 0, 7);
          g.fill();
          if (c.k === 's') { g.strokeStyle = '#a07000'; g.lineWidth = 4; g.beginPath(); for (let z = 0; z < 4; z++) { g.moveTo(xx - 14, y - 4 - z * 6); g.lineTo(xx + 14, y - 7 - z * 6); } g.stroke(); }
        }
      }
    }
    for (const p of S.p) {
      if (p.gone || !p.al) continue;
      const y = Y(p.h) - 24;
      for (const xx of [p.x - 1600, p.x, p.x + 1600]) {
        if (xx < -60 || xx > 1660) continue;
        g.fillStyle = G.rgb(p); g.beginPath(); g.ellipse(xx, y, 24, p.vh > 0 ? 26 : 22, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(xx - p.f * 14, y + 4, 9, 14, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(xx + p.f * 8, y - 6, 8, 0, 7); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(xx + p.f * 10, y - 6, 4, 0, 7); g.fill();
        g.fillStyle = '#f90'; g.beginPath(); g.moveTo(xx + p.f * 20, y); g.lineTo(xx + p.f * 32, y + 4); g.lineTo(xx + p.f * 20, y + 8); g.fill();
        if (p.pf > 0) { g.strokeStyle = G.rgb(p, 0.7); g.lineWidth = 6; g.beginPath(); g.arc(xx, y, 70, 0, 7); g.stroke(); }
        if (p.id === G.me) { G.meMark(g, xx, y, 38, S.time); G.label(g, 'DU', xx, y - 40, 22); }
      }
    }
    // Gefahrenzone unten
    const gz = g.createLinearGradient(0, 940, 0, 1000); gz.addColorStop(0, 'rgba(255,60,60,0)'); gz.addColorStop(1, 'rgba(255,60,60,.45)');
    g.fillStyle = gz; g.fillRect(0, 940, 1600, 60);
  },
});
