// B3 Autoscooter-Sumo: Autoscooter auf einer schrumpfenden Eisscholle
'use strict';

HR.AR.define({
  code: 'B3', name: 'Autoscooter-Sumo', short: 'Schubs die anderen ins Wasser!',
  desc: 'Alle fahren Autoscooter auf einer runden Eisscholle. Auf dem Eis rutscht man weit. Mit dem Stoß machst du einen kurzen, kräftigen Satz nach vorn. Die Scholle schmilzt mit der Zeit und wird immer kleiner.',
  goal: 'Die anderen ins Wasser schubsen und selbst auf dem Eis bleiben. Wer als Letzter übrig ist, gewinnt.',
  touch: 'Steuerkreuz ◀ ▶ lenken, ▲ Gas, ▼ rückwärts, rechts STOSS', keys: '← → lenken, ↑ Gas, ↓ rückwärts, Leertaste Stoß',
  btns: [['act', 'STOSS']],
  duration: 75, CR: 30,

  init(players) {
    const n = players.length;
    const p = players.map((pl, i) => {
      const ang = i / n * Math.PI * 2;
      return { id: pl.id, c: pl.c, x: 800 + Math.cos(ang) * 280, y: 500 + Math.sin(ang) * 280, a: ang + Math.PI, vx: 0, vy: 0, al: 1, dt: 0, cd: 0, dash: 0, f: 0 };
    });
    return { p, R: 470 };
  },

  step(S, inp, dt, G) {
    S.R = U.clamp(470 - Math.max(0, S.time - 6) * 5.2, 170, 470);
    const CR = this.CR;
    for (const p of S.p) {
      if (!p.al) { if (p.f < 1) p.f += dt; continue; }
      const i = inp[p.id];
      if (i.l) p.a -= 3.3 * dt;
      if (i.r) p.a += 3.3 * dt;
      const fx = Math.cos(p.a), fy = Math.sin(p.a);
      if (i.u) { p.vx += fx * 560 * dt; p.vy += fy * 560 * dt; }
      if (i.d) { p.vx -= fx * 330 * dt; p.vy -= fy * 330 * dt; }
      if (p.cd > 0) p.cd -= dt;
      if (p.dash > 0) p.dash -= dt;
      if (i.pa && p.cd <= 0) { p.vx += fx * 560; p.vy += fy * 560; p.cd = 2; p.dash = 0.35; G.sfx('go', p.id); }
      // Eis: wenig Reibung, Höchstgeschwindigkeit nur ohne Stoß
      const k = Math.pow(0.45, dt);
      p.vx *= k; p.vy *= k;
      const sp = Math.hypot(p.vx, p.vy), max = p.dash > 0 ? 900 : 380;
      if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    // Zusammenstöße
    for (let i = 0; i < S.p.length; i++) for (let j = i + 1; j < S.p.length; j++) {
      const a = S.p[i], b = S.p[j];
      if (!a.al || !b.al) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d <= 0 || d >= CR * 2) continue;
      const nx = dx / d, ny = dy / d, ov = CR * 2 - d;
      a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) {
        const ma = a.dash > 0 ? 2.2 : 1, mb = b.dash > 0 ? 2.2 : 1;
        const jimp = (1 + 1.25) * rel / (1 / ma + 1 / mb);
        a.vx -= jimp / ma * nx; a.vy -= jimp / ma * ny;
        b.vx += jimp / mb * nx; b.vy += jimp / mb * ny;
        if (rel > 120) G.sfx('bump');
      }
    }
    for (const p of S.p) {
      if (p.al && Math.hypot(p.x - 800, p.y - 500) > S.R + 8) { p.al = 0; p.dt = S.time; p.f = 0; G.sfx('crash'); }
    }
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S, p => -Math.round(Math.hypot(p.x - 800, p.y - 500))); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },

  pack(S) { return { t: +S.time.toFixed(3), R: +S.R.toFixed(1), p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(3), al: p.al, dt: p.dt, f: +p.f.toFixed(2), s: p.dash > 0 ? 1 : 0, c2: p.cd > 0 ? 1 : 0, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.R = d.R;
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.a = q.a; p.al = q.al; p.dt = q.dt; p.f = q.f; p.dash = q.s; p.cd = q.c2; p.gone = q.g; });
  },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST, R = S.R;
    // Rasen, darauf eine runde Asphaltplatte mit Randstein-Ring und Reifenstapeln
    ST.grass(g, -2000, -2000, 5600, 5000, 70);
    for (let k = 0; k < 44; k++) { const a = k / 44 * 6.283; ST.tyre(g, 800 + Math.cos(a) * 492, 500 + Math.sin(a) * 492, 16); }
    for (let k = 0; k < 48; k++) { g.fillStyle = ST.KERB[k % 2]; g.beginPath(); g.moveTo(800, 500); g.arc(800, 500, R + 14, k / 48 * 6.283, (k + 1) / 48 * 6.283); g.fill(); }
    const grd = g.createRadialGradient(740, 440, R * 0.1, 800, 500, R);
    grd.addColorStop(0, '#85858b'); grd.addColorStop(1, '#69696f');
    g.fillStyle = grd; g.beginPath(); g.arc(800, 500, R, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(800, 500, R, 0, 7); g.clip();
    ST.grain(g, 800 - R, 500 - R, R * 2, R * 2, 'rgba(255,255,255,.07)', 1800, 2);
    g.strokeStyle = 'rgba(20,20,24,.3)'; g.lineWidth = 7;
    for (const [a0, a1, rr] of [[-0.5, 1.2, 160], [2, 3.6, 230], [3.9, 5, 120]]) for (const d of [0, 18]) { g.beginPath(); g.arc(800, 500, rr + d, a0, a1); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.setLineDash([22, 16]); g.beginPath(); g.arc(800, 500, 130, 0, 7); g.stroke(); g.setLineDash([]);
    if (R < 465 && Math.floor(S.time * 2) % 2) { g.strokeStyle = 'rgba(255,77,94,.7)'; g.lineWidth = 8; g.beginPath(); g.arc(800, 500, R - 6, 0, 7); g.stroke(); }
    for (const p of S.p.filter(p => !p.gone && (p.al || p.f < 1)).sort((a, b) => a.y - b.y)) {
      const sc = p.al ? 1 : 1 - p.f * 0.7;
      if (p.al && p.dash > 0) { g.strokeStyle = G.rgb(p, 0.7); g.lineWidth = 8; g.beginPath(); g.arc(p.x, p.y, 46, 0, 7); g.stroke(); }
      ST.car(g, p.x, p.y + (p.al ? 0 : p.f * 40), p.a, G.color(p), 76 * sc, { dead: !p.al, alpha: p.al ? 1 : 1 - p.f });
      if (p.id === G.me && p.al) ST.you(g, p.x, p.y - 46, S.time, 'DU');
      if (p.al && p.id === G.me && p.cd <= 0) ST.text(g, 'STOSS bereit', p.x, p.y + 52, 18, '#ffd23c');
    }
  },
});
