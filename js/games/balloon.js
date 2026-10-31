// C10 Ballonpumpen: so groß wie möglich pumpen und rechtzeitig sichern, bevor der Ballon platzt
'use strict';

HR.AR.define({
  code: 'C10', name: 'Ballonpumpen', short: 'Pumpen – aber nicht zu viel!',
  desc: 'Jeder hat einen Ballon. Mit jedem Druck auf PUMPEN wird er größer. Alle Ballons einer Runde platzen bei derselben geheimen Größe. Wackelt dein Ballon, wird es knapp. Drück rechtzeitig SICHERN, dann zählt seine Größe. Wer nicht sichert, bevor die Zeit abläuft, oder wessen Ballon platzt, bekommt in dieser Runde nichts.',
  goal: 'Nach 3 Runden gewinnt, wer insgesamt am meisten Luft gesichert hat.',
  touch: 'rechts PUMPEN (unten) und SICHERN (links daneben)', keys: 'Leertaste pumpen, Shift oder Q sichern',
  btns: [['act', 'PUMPEN'], ['act2', 'SICHERN']],
  duration: 120, ROUNDS: 3, TIME: 9, bgTop: '#ff9ac8', bgBot: '#8a3a8a',

  init(players) {
    return { ph: 'intro', tm: 1.2, rd: 0, lim: 20, p: players.map(pl => ({ id: pl.id, c: pl.c, s: 0, bk: 0, pop: 0, tot: 0, last: 0, pt: -9 })) };
  },

  next(S) {
    S.rd++; S.ph = 'pump'; S.tm = this.TIME; S.lim = 12 + Math.floor(Math.random() * 22);
    for (const p of S.p) { p.s = 0; p.bk = 0; p.pop = 0; p.last = 0; }
  },

  step(S, inp, dt, G) {
    S.tm -= dt;
    if (S.ph === 'intro' && S.tm <= 0) this.next(S);
    else if (S.ph === 'pump') {
      for (const p of S.p) {
        if (p.gone || p.bk || p.pop) continue;
        const i = inp[p.id];
        if (i.pb && p.s > 0) { p.bk = 1; p.last = p.s; p.tot += p.s; G.sfx('lap', p.id); continue; }
        if (i.pa) { p.s++; p.pt = S.time; G.sfx('blip', p.id); if (p.s > S.lim) { p.pop = 1; p.pt = S.time; G.sfx('crash'); } }
      }
      for (const p of S.p) p.w = !p.bk && !p.pop && p.s > S.lim * 0.72 ? 1 : 0;
      const open = S.p.filter(p => !p.gone && !p.bk && !p.pop);
      if (S.tm <= 0 || !open.length) {
        for (const p of open) { p.pop = 1; p.pt = S.time; }
        if (open.length) G.sfx('crash');
        S.ph = 'res'; S.tm = 2.2;
      }
    } else if (S.ph === 'res' && S.tm <= 0) { if (S.rd >= this.ROUNDS) S.ph = 'done'; else this.next(S); }
  },

  over: S => S.ph === 'done',
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.tot, txt: p.tot + ' Luft gesichert' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => String(p.tot),

  pack(S) { return { t: +S.time.toFixed(3), ph: S.ph, tm: +S.tm.toFixed(2), rd: S.rd, lim: S.ph === 'res' ? S.lim : 0,
    p: S.p.map(p => ({ s: p.s, bk: p.bk, pop: p.pop, tot: p.tot, w: p.w || 0, pt: +p.pt.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) { S.time = d.t; S.ph = d.ph; S.tm = d.tm; S.rd = d.rd; S.shown = d.lim; d.p.forEach((q, i) => Object.assign(S.p[i], { s: q.s, bk: q.bk, pop: q.pop, tot: q.tot, w: q.w, pt: q.pt, gone: q.g })); },

  draw(g, S, G) {
    G.world(g);
    // Jahrmarkt: Zelt-Streifen und Wimpel
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#ffe3f0' : '#ff8ab8'; g.fillRect(k * 100, 0, 100, 1000); }
    g.fillStyle = 'rgba(80,30,90,.25)'; g.fillRect(0, 0, 1600, 1000);
    g.strokeStyle = HR.ST.INK; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(800, 140, 1600, 60); g.stroke();
    for (let k = 0; k < 20; k++) { const x = 40 + k * 80, y = 60 + Math.sin(k / 19 * Math.PI) * 40; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.lineTo(x, y + 34); g.closePath(); HR.ST.fill(g, ['#ffd23c', '#4ad6ff', '#5be37a', '#ff4d5e'][k % 4], 3); }
    g.beginPath(); g.rect(0, 860, 1600, 140); HR.ST.fill(g, '#6a4a8a', 6);
    const n = S.p.length, sp = Math.min(190, 1440 / n);
    const wiggle = S.time * 30;
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const x = 800 + (i - (n - 1) / 2) * sp, base = 790, col = G.color(p);
      // Ballon
      const r = Math.min(sp * 0.48, 26 + p.s * 3.4);
      if (p.pop) { const k = S.time - p.pt; if (k < 0.6) HR.ST.burst(g, x, base - 120 - r, k / 0.6, U.rgb(col), 14, r * 1.4); g.strokeStyle = U.rgb(col); g.lineWidth = 5; g.beginPath(); g.moveTo(x, base - 60); g.lineTo(x - 6, base - 80); g.lineTo(x + 4, base - 92); g.stroke(); }
      else if (p.s > 0 || S.ph === 'pump') {
        const by = base - 100 - r, wx = p.w ? Math.sin(wiggle + i) * 6 : 0;
        g.strokeStyle = HR.ST.INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x, base - 60); g.quadraticCurveTo(x + 10, base - 80, x + wx, by + r); g.stroke();
        g.beginPath(); g.ellipse(x + wx, by, r * 0.92, r, 0, 0, 7);
        const gr = g.createRadialGradient(x + wx - r * 0.35, by - r * 0.4, r * 0.1, x + wx, by, r);
        gr.addColorStop(0, U.rgb(HR.ST.light(col))); gr.addColorStop(1, U.rgb(col));
        HR.ST.fill(g, gr, 5);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x + wx - r * 0.4, by - r * 0.45, r * 0.16, r * 0.26, -0.5, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x + wx - 8, by + r + 8); g.lineTo(x + wx + 8, by + r + 8); g.lineTo(x + wx, by + r - 2); g.closePath(); HR.ST.fill(g, U.rgb(col), 3);
        if (p.bk) HR.ST.text(g, '✓ ' + p.last, x, by, Math.max(22, r * 0.5), '#fff');
      }
      // Pumpe und Figur
      const pumping = S.time - p.pt < 0.15 && !p.pop;
      HR.ST.rrect(g, x - 16, base - 70 + (pumping ? 16 : 0), 32, 16, 4); HR.ST.fill(g, '#ccc', 3);
      HR.ST.rrect(g, x - 22, base - 56, 44, 60, 8); HR.ST.fill(g, '#e8435a', 4);
      G.fig(g, p, x - sp * 0.28, base + 6, 30, { look: [0.6, -0.5], stun: p.pop && S.ph !== 'pump' ? 0 : 0, squash: pumping ? 0.08 : 0, still: true });
      HR.ST.text(g, String(p.tot), x, base + 100, 30, '#fff');
    });
    if (S.ph === 'pump') {
      HR.ST.text(g, 'Runde ' + S.rd + ' von ' + this.ROUNDS + '  ·  noch ' + Math.ceil(S.tm) + ' s', 800, 150, 38, '#fff');
    } else if (S.ph === 'res') HR.ST.text(g, 'Geplatzt bei ' + (S.shown || S.lim) + '!', 800, 150, 44, '#ffd23c');
  },
});
