// B7 Tunnel-Überleben: alle fliegen durch denselben Pseudo-3D-Tunnel, Hindernisringe mit Lücken
'use strict';

HR.AR.define({
  code: 'B7', name: 'Tunnel-Überleben', short: 'Flieg durch die Lücken!',
  desc: 'Alle fliegen gleichzeitig durch denselben Tunnel, der immer schneller wird. Dir kommen Ringe mit Lücken entgegen. Du kreist an der Tunnelwand nach links oder rechts, um rechtzeitig in einer Lücke zu sein. Die anderen siehst du als farbige Lichter an der Wand.',
  goal: 'Keinen Ring berühren. Wer als Letzter übrig ist, gewinnt.',
  touch: '◀ links herum, ▶ rechts herum', keys: '← / A links herum, → / D rechts herum',
  padL: [['left', '◀']], padR: [['right', '▶']],
  duration: 150, K: 16, GAP: 26, Z0: 70, bg: '#02030a',

  init(players, rnd) {
    const n = players.length;
    return {
      seed: rnd.randint(1, 1e9), z: 0, sp: 24, rings: [],
      p: players.map((pl, i) => ({ id: pl.id, c: pl.c, a: Math.PI / 2 + (i - (n - 1) / 2) * 0.35, al: 1, dt: 0 })),
    };
  },

  // Ring j: Liste der gesperrten Sektoren; jede Lücke ist vom vorigen Ring aus erreichbar
  ring(S, j) {
    const K = this.K;
    while (S.rings.length <= j) {
      const i = S.rings.length;
      const rnd = U.rng((S.seed ^ Math.imul(i + 1, 40503)) >>> 0);
      if (i < 2) { S.rings.push({ b: new Array(K).fill(0), g: Math.floor(K / 4) }); continue; }
      const d = Math.min(1, i / 45), prev = S.rings[i - 1].g;
      const w = Math.max(3, Math.round(7 - 4 * d));
      const shift = i > 45 ? 3 : 4;
      const g0 = ((prev + rnd.randint(-shift, shift)) % K + K) % K;
      const b = new Array(K).fill(1);
      for (let k = 0; k < w; k++) b[(g0 + k - Math.floor(w / 2) + K) % K] = 0;
      if (rnd.random() < 0.35) { const g2 = (g0 + K / 2 + rnd.randint(-2, 2) + K) % K; for (let k = 0; k < Math.max(2, w - 1); k++) b[(g2 + k + K) % K] = 0; }
      S.rings.push({ b, g: g0, hue: (i * 37) % 360 });
    }
    return S.rings[j];
  },

  ringZ(j) { return this.Z0 + j * this.GAP; },
  sector(a) { const t = Math.PI * 2; return Math.floor((((a % t) + t) % t) / t * this.K) % this.K; },

  step(S, inp, dt, G) {
    S.sp = Math.min(68, 24 + S.time * 0.42);
    const z0 = S.z;
    S.z += S.sp * dt;
    for (const p of S.p) {
      if (!p.al) continue;
      const i = inp[p.id];
      if (i.l) p.a += 3.5 * dt;
      if (i.r) p.a -= 3.5 * dt;
    }
    const j = Math.floor((S.z - this.Z0) / this.GAP);
    if (j >= 0 && this.ringZ(j) > z0 && this.ringZ(j) <= S.z) {
      const r = this.ring(S, j);
      for (const p of S.p) if (p.al && r.b[this.sector(p.a)]) { p.al = 0; p.dt = S.time; G.sfx('crash'); }
      if (S.p.some(p => p.al)) G.sfx('blip');
    }
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S); },
  isOut: (S, p) => !p.al,
  status: () => '',
  kill(S, p) { p.al = 0; p.dt = S.time; },

  pack(S) { return { t: +S.time.toFixed(3), z: +S.z.toFixed(2), p: S.p.map(p => ({ a: +p.a.toFixed(3), al: p.al, dt: p.dt, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) { S.time = d.t; S.z = d.z; d.p.forEach((q, i) => { const p = S.p[i]; p.a = q.a; p.al = q.al; p.dt = q.dt; p.gone = q.g; }); },

  draw(g, S, G, W, H) {
    const me = S.p.find(p => p.id === G.me) || S.p[0];
    let view = me;
    if (!me.al) view = S.p.find(p => p.al) || me;
    const rot = Math.PI / 2 - view.a;
    const cx = W / 2, cy = H * 0.46, Rp = Math.min(W, H) * 0.46, F = 40;
    const R = d => Rp * F / (F + d);
    const K = this.K, sw = Math.PI * 2 / K;
    g.fillStyle = this.bg; g.fillRect(0, 0, W, H);
    // Tunnelwände: Ringe und Linien
    g.strokeStyle = 'rgba(90,120,255,.25)'; g.lineWidth = 1;
    const off = S.z % 13;
    for (let d = 13 - off; d < 420; d += 13) { g.globalAlpha = Math.exp(-d / 160); g.beginPath(); g.arc(cx, cy, R(d), 0, 7); g.stroke(); }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(90,120,255,.18)';
    for (let k = 0; k < K; k++) { const a = k * sw + rot; g.beginPath(); g.moveTo(cx + Math.cos(a) * R(420), cy + Math.sin(a) * R(420)); g.lineTo(cx + Math.cos(a) * Rp * 1.6, cy + Math.sin(a) * Rp * 1.6); g.stroke(); }
    // Hindernisringe von hinten nach vorn
    const j0 = Math.max(0, Math.floor((S.z - this.Z0) / this.GAP) + 1);
    for (let j = j0 + 16; j >= j0; j--) {
      const d = this.ringZ(j) - S.z;
      if (d <= -2 || d > 430) continue;
      const r = this.ring(S, j), ro = R(Math.max(0, d)), ri = ro * 0.62, fog = Math.exp(-d / 170);
      const hue = r.hue || 200;
      g.fillStyle = `hsla(${hue},85%,${50 + 10 * fog}%,${0.25 + 0.7 * fog})`;
      g.strokeStyle = `hsla(${hue},100%,80%,${fog})`; g.lineWidth = 1.5;
      for (let k = 0; k < K; k++) {
        if (!r.b[k]) continue;
        const a0 = k * sw + rot, a1 = a0 + sw;
        g.beginPath(); g.arc(cx, cy, ro, a0, a1); g.arc(cx, cy, ri, a1, a0, true); g.closePath(); g.fill(); g.stroke();
      }
    }
    // Mitspieler als Lichter, eigener Gleiter unten
    const rp = Rp * 0.82;
    for (const p of S.p) {
      if (p.gone || !p.al || p === view) continue;
      const a = p.a + rot, x = cx + Math.cos(a) * rp, y = cy + Math.sin(a) * rp;
      g.fillStyle = G.rgb(p, 0.3); g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill();
      g.fillStyle = G.rgb(p); g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
    }
    if (view.al) {
      const x = cx, y = cy + rp, s = Rp * 0.07;
      g.fillStyle = G.rgb(view, 0.35); g.beginPath(); g.arc(x, y, s * 2.2, 0, 7); g.fill();
      g.fillStyle = G.rgb(view); g.beginPath(); g.moveTo(x, y - s * 1.3); g.lineTo(x + s * 1.6, y + s * 0.8); g.lineTo(x - s * 1.6, y + s * 0.8); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - s * 0.1, s * 0.4, 0, 7); g.fill();
      if (view === me) G.label(g, 'DU', x, y - s * 2, Math.max(14, s), '#fff');
      else G.label(g, 'Du schaust ' + G.name(view.id) + ' zu', x, y - s * 2, Math.max(14, s * 0.8), '#fff');
    }
    G.label(g, Math.floor(S.z / 10) + ' m', W - 14 - 40, H - 14, 18, 'rgba(255,255,255,.6)');
  },
});
