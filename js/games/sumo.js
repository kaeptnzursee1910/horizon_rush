// B3 Autoscooter-Sumo: Autoscooter auf einer schrumpfenden Eisscholle
'use strict';

HR.AR.define({
  code: 'B3', name: 'Autoscooter-Sumo', short: 'Schubs die anderen ins Wasser!',
  desc: 'Alle fahren Autoscooter auf einer runden Eisscholle. Auf dem Eis rutscht man weit. Mit dem Stoß machst du einen kurzen, kräftigen Satz nach vorn. Die Scholle schmilzt mit der Zeit und wird immer kleiner. Es werden 5 Runden gefahren, nach jeder Runde sind alle wieder dabei.',
  goal: 'Die anderen ins Wasser schubsen und selbst auf dem Eis bleiben. Wer zuletzt übrig ist, gewinnt die Runde. Die meisten Rundensiege gewinnen.',
  touch: 'Steuerkreuz ◀ ▶ lenken, ▲ Gas, ▼ rückwärts, rechts STOSS', keys: '← → lenken, ↑ Gas, ↓ rückwärts, Leertaste Stoß',
  btns: [['act', 'STOSS']],
  duration: 0, CR: 30, ROUNDS: 5, RMAX: 45, PAUSE: 2.4,

  init(players) {
    const S = { p: players.map(pl => ({ id: pl.id, c: pl.c, w: 0, pt: 0 })), R: 470, rd: 0, ps: 0, rt: 0, lw: null, fin: 0 };
    this.newRound(S);
    return S;
  },

  // neue Runde: alle zurück auf ihren Startplatz, Scholle wieder groß
  newRound(S) {
    S.rd++; S.rt = 0; S.R = 470; S.ps = 0; S.ord = 0;
    const live = S.p.filter(p => !p.gone), n = live.length, sh = S.rd * 2;   // Startplätze wechseln jede Runde
    live.forEach((p, i) => {
      const ang = ((i + sh) % n) / n * Math.PI * 2;
      Object.assign(p, { x: 800 + Math.cos(ang) * 280, y: 500 + Math.sin(ang) * 280, a: ang + Math.PI, vx: 0, vy: 0, al: 1, dt: 0, cd: 0, dash: 0, f: 1 });
    });
  },

  // Rundenende: Punkte nach Reihenfolge des Ausscheidens, ein Sieg für den Letzten auf dem Eis
  endRound(S, G) {
    const live = S.p.filter(p => !p.gone), alive = live.filter(p => p.al);
    for (const p of alive) { p.pt += live.length; }
    if (alive.length === 1) { alive[0].w++; S.lw = alive[0].id; G.sfx('lap', alive[0].id); }
    else S.lw = -1;
    S.ps = this.PAUSE;
    if (S.rd >= this.ROUNDS) S.fin = 1;
  },
  step(S, inp, dt, G) {
    if (S.ps > 0) {
      for (const p of S.p) if (!p.al && p.f < 1) p.f += dt;
      S.ps -= dt;
      if (S.ps <= 0 && !S.fin) { this.newRound(S); G.sfx('go'); }
      return;
    }
    S.rt += dt;
    S.R = U.clamp(470 - Math.max(0, S.rt - 4) * 7.5, 170, 470);
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
      if (p.al && Math.hypot(p.x - 800, p.y - 500) > S.R + 8) { p.al = 0; p.dt = S.time; p.f = 0; p.pt += S.ord++; G.sfx('crash'); }
    }
    const left = S.p.filter(p => p.al && !p.gone).length, need = S.p.filter(p => !p.gone).length > 1 ? 1 : 0;
    if (left <= need || S.rt >= this.RMAX) this.endRound(S, G);
  },

  over(S) { return !!S.fin && S.ps <= 0.4; },
  rank(S) {
    return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.w * 1000 + p.pt, txt: p.w + (p.w === 1 ? ' Rundensieg' : ' Rundensiege') })).sort((a, b) => b.s - a.s);
  },
  isOut: (S, p) => !p.al && S.ps <= 0,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },
  status: (S, p) => '★'.repeat(p.w) + (p.w ? '' : '–'),

  hud(g, S, G, W, H, sc) {
    const T = HR.ST.text, Y = 'rgb(255,210,40)';
    T(g, 'RUNDE ' + Math.min(S.rd, this.ROUNDS) + ' / ' + this.ROUNDS, W - 12, 18 * sc + 30 * sc, 22 * sc, '#fff', 'right');
    if (S.ps > 0 && G.phase === 'play') {
      const who = S.lw >= 0 && S.lw != null ? G.name(S.lw) + ' gewinnt die Runde!' : 'Unentschieden!';
      T(g, who, W / 2, H * 0.3, 40 * sc, Y);
      if (!S.fin) T(g, 'Gleich geht es mit Runde ' + (S.rd + 1) + ' weiter', W / 2, H * 0.3 + 44 * sc, 20 * sc, '#fff');
    }
  },

  pack(S) { return { t: +S.time.toFixed(3), R: +S.R.toFixed(1), rd: S.rd, ps: +S.ps.toFixed(2), lw: S.lw, fin: S.fin, p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(3), al: p.al, dt: p.dt, f: +p.f.toFixed(2), s: p.dash > 0 ? 1 : 0, c2: p.cd > 0 ? 1 : 0, w: p.w, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.R = d.R; S.rd = d.rd; S.ps = d.ps; S.lw = d.lw; S.fin = d.fin;
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.a = q.a; p.al = q.al; p.dt = q.dt; p.f = q.f; p.dash = q.s; p.cd = q.c2; p.w = q.w; p.gone = q.g; });
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
