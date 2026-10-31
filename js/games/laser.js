// C2 Laser-Sprung: kreisende Laserstrahlen auf einer runden Plattform überspringen
'use strict';

HR.AR.define({
  code: 'C2', name: 'Laser-Sprung', short: 'Spring über die Laser!',
  desc: 'Auf einer runden Plattform drehen sich Laserstrahlen um die Mitte wie Uhrzeiger. Spring im richtigen Moment darüber. Die Laser werden mit der Zeit schneller, es kommen neue dazu, und manchmal wechseln sie die Richtung.',
  goal: 'Nicht vom Laser getroffen werden. Wer zuletzt übrig ist, gewinnt.',
  touch: 'Steuerkreuz laufen, rechts SPRUNG', keys: 'Pfeiltasten laufen, Leertaste springen',
  btns: [['act', 'SPRUNG']],
  duration: 120, RA: 430, CORE: 70, JUMP: 0.62, wrap: { a: Math.PI * 2 }, lerpKeys: ['z'], bgTop: '#1d2a5c', bgBot: '#0b0f24',

  init(players, rnd) {
    const n = players.length;
    return {
      L: [{ a: (0.5 + rnd.randint(0, n - 1)) / n * 6.283 }], sp: 0.9, dir: 1, flip: rnd.uniform(14, 22), seed: rnd.randint(1, 1e9),
      p: players.map((pl, i) => { const a = i / n * 6.283; return { id: pl.id, c: pl.c, x: 800 + Math.cos(a) * 260, y: 520 + Math.sin(a) * 260, z: 0, jt: 0, al: 1, dt: 0, lx: 0, ly: 1 }; }),
    };
  },

  // Höhe des Sprungs (0..1) aus der Sprungzeit
  hgt(jt, J) { return jt > 0 ? Math.sin(Math.PI * (1 - jt / J)) : 0; },

  step(S, inp, dt, G) {
    // Laser drehen, schneller werden, neue dazu
    S.sp = Math.min(2.6, 0.9 + S.time * 0.022);
    if (S.time > S.flip) { S.dir = -S.dir; S.flip = S.time + 9 + (Math.sin(S.time * 7.3) + 1) * 5; G.sfx('beep'); }
    const want = S.time < 20 ? 1 : S.time < 45 ? 2 : 3;
    if (S.L.length < want) { S.L.push({ a: (S.L[0].a + Math.PI * 2 / want * S.L.length) % (Math.PI * 2) }); G.sfx('go'); }
    for (const l of S.L) l.a = ((l.a + S.dir * S.sp * dt) % 6.283 + 6.283) % 6.283;
    for (const p of S.p) {
      if (!p.al || p.gone) continue;
      const i = inp[p.id], [dx, dy] = HR.ST.dir(i);
      p.x += dx * 250 * dt; p.y += dy * 250 * dt;
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      // auf der Plattform bleiben, nicht in den Kern
      let rx = p.x - 800, ry = p.y - 520, d = Math.hypot(rx, ry) || 1;
      if (d > this.RA - 30) { p.x = 800 + rx / d * (this.RA - 30); p.y = 520 + ry / d * (this.RA - 30); }
      if (d < this.CORE + 30) { p.x = 800 + rx / d * (this.CORE + 30); p.y = 520 + ry / d * (this.CORE + 30); }
      if (p.jt > 0) p.jt -= dt;
      else if (i.pa || i.a && p.jt <= -0.1) { p.jt = this.JUMP; G.sfx('blip', p.id); }
      else p.jt = Math.max(-1, p.jt - dt);
      p.z = this.hgt(p.jt, this.JUMP);
    }
    HR.ST.separate(S.p.filter(p => p.al && !p.gone), 24);
    // Treffer: Laser streift die Figur und sie ist nicht hoch genug
    for (const p of S.p) {
      if (!p.al || p.gone || p.z > 0.3) continue;
      const pa = Math.atan2(p.y - 520, p.x - 800), d = Math.hypot(p.x - 800, p.y - 520);
      for (const l of S.L) if (Math.abs(HR.AR.angDiff(pa, l.a)) * d < 24) { p.al = 0; p.dt = S.time; G.sfx('crash'); break; }
    }
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },
  status: () => '',

  pack(S) { return { t: +S.time.toFixed(3), L: S.L.map(l => ({ a: +l.a.toFixed(3) })), p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), z: +p.z.toFixed(2), al: p.al, dt: p.dt, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.L = d.L;
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.z = q.z; p.al = q.al; p.dt = q.dt; p.lx = q.lx; p.ly = q.ly; p.gone = q.g; });
  },

  draw(g, S, G) {
    G.world(g);
    const cx = 800, cy = 520, RA = this.RA;
    // Plattform mit Rand und Ringen
    g.beginPath(); g.ellipse(cx, cy + 26, RA, RA * 0.96, 0, 0, 7); HR.ST.fill(g, '#5b4aa8', 6);
    g.beginPath(); g.arc(cx, cy, RA, 0, 7); HR.ST.fill(g, '#9fb6ff', 6);
    for (let k = 1; k <= 3; k++) { g.strokeStyle = 'rgba(37,31,58,.15)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, RA * k / 4, 0, 7); g.stroke(); }
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.fillStyle = k % 2 ? 'rgba(255,255,255,.18)' : 'rgba(37,31,58,.06)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, RA - 4, a, a + Math.PI / 6); g.fill(); }
    // Laser
    for (const l of S.L) {
      const ex = cx + Math.cos(l.a) * RA, ey = cy + Math.sin(l.a) * RA;
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,60,90,.35)'; g.lineWidth = 34; g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#ff3b5c'; g.lineWidth = 14; g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
      g.beginPath(); g.arc(ex, ey, 16, 0, 7); HR.ST.fill(g, '#ff3b5c', 4);
    }
    // Kern
    g.beginPath(); g.arc(cx, cy, this.CORE, 0, 7); HR.ST.fill(g, '#3a2f6b', 6);
    g.beginPath(); g.arc(cx, cy, this.CORE * 0.55, 0, 7); HR.ST.fill(g, `hsl(${(S.time * 90) % 360},90%,60%)`, 4);
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) {
      if (!p.al) { if (S.time - p.dt < 0.6) HR.ST.burst(g, p.x, p.y - 20, (S.time - p.dt) / 0.6, G.rgb(p), 12, 70); continue; }
      HR.ST.shadow(g, p.x, p.y + 24, 22 * (1 - p.z * 0.4), 7);
      G.fig(g, p, p.x, p.y - 4 - p.z * 70, 25, { look: [p.lx, p.ly], squash: p.z > 0 ? -0.08 : 0, noShadow: true });
    }
  },
});
