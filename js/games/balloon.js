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
    const ST = HR.ST;
    // Jahrmarkt bei Nacht: Zeltbahnen, Lichterkette, Bühne
    g.fillStyle = '#0a0717'; g.fillRect(0, 0, 1600, 1000);
    g.beginPath(); for (let k = 0; k <= 16; k++) { g.moveTo(k * 100, 0); g.lineTo(k * 100 + (k - 8) * 6, 860); } ST.thin(g, ST.MAGENTA, 2, 0.18);
    for (let k = 0; k < 16; k += 2) { g.fillStyle = 'rgba(255,43,214,.04)'; g.beginPath(); g.moveTo(k * 100, 0); g.lineTo(k * 100 + 100, 0); g.lineTo(k * 100 + 100 + (k - 7) * 6, 860); g.lineTo(k * 100 + (k - 8) * 6, 860); g.fill(); }
    g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(800, 140, 1600, 60); ST.thin(g, ST.DIM, 2, 0.8);
    const lc = [ST.YELLOW, ST.CYAN, ST.LIME, ST.MAGENTA];
    for (let k = 0; k < 20; k++) {
      const x = 40 + k * 80, y = 60 + Math.sin(k / 19 * Math.PI) * 40 * 0.98, c = lc[k % 4], on = Math.floor(S.time * 3 + k) % 4 !== 0;
      g.beginPath(); g.moveTo(x - 16, y); g.lineTo(x + 16, y); g.lineTo(x, y + 30); g.closePath(); g.fillStyle = ST.rgba(c, on ? 0.3 : 0.08); g.fill(); ST.glow(g, c, 2, on ? 1 : 0.4);
    }
    g.fillStyle = ST.BODY; g.fillRect(0, 860, 1600, 140);
    ST.floor(g, 0, 866, 1600, 134, ST.VIOLET, null, 50);
    ST.line(g, 0, 860, 1600, 860); ST.glow(g, ST.VIOLET, 4);
    const n = S.p.length, sp = Math.min(190, 1440 / n);
    const wiggle = S.time * 30;
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const x = 800 + (i - (n - 1) / 2) * sp, base = 790, col = G.color(p);
      const r = Math.min(sp * 0.48, 26 + p.s * 3.4);
      if (p.pop) {
        const k = S.time - p.pt; if (k < 0.6) ST.burst(g, x, base - 120 - r, k / 0.6, col, 16, r * 1.4);
        g.beginPath(); g.moveTo(x, base - 60); g.lineTo(x - 6, base - 80); g.lineTo(x + 4, base - 92); ST.glow(g, col, 2.5);
      } else if (p.s > 0 || S.ph === 'pump') {
        const by = base - 100 - r, wx = p.w ? Math.sin(wiggle + i) * 6 : 0;
        g.beginPath(); g.moveTo(x, base - 60); g.quadraticCurveTo(x + 10, base - 80, x + wx, by + r); ST.thin(g, ST.DIM, 2, 0.9);
        ST.pool(g, x + wx, by, r * 1.8, col, 0.22);
        g.beginPath(); g.ellipse(x + wx, by, r * 0.92, r, 0, 0, 7); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgb(col, 0.22 + Math.min(0.25, p.s * 0.01)); g.fill(); ST.glow(g, col, 3.5);
        g.beginPath(); g.ellipse(x + wx, by, r * 0.62, r * 0.68, 0, 0, 7); ST.thin(g, col, 1.5, 0.4);
        g.beginPath(); g.arc(x + wx, by, r * 0.78, 3.6, 4.4); ST.thin(g, '#ffffff', 3, 0.7);
        g.beginPath(); g.moveTo(x + wx - 8, by + r + 8); g.lineTo(x + wx + 8, by + r + 8); g.lineTo(x + wx, by + r - 2); g.closePath(); g.fillStyle = ST.rgb(col, 0.6); g.fill(); ST.glow(g, col, 2);
        if (p.bk) ST.text(g, '✓ ' + p.last, x, by, Math.max(22, r * 0.5), ST.TEXT);
      }
      // Pumpe und Token
      const pumping = S.time - p.pt < 0.15 && !p.pop;
      ST.rrect(g, x - 16, base - 70 + (pumping ? 16 : 0), 32, 14, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.DIM, 2);
      ST.line(g, x, base - 56 + (pumping ? 16 : 0), x, base - 56); ST.thin(g, ST.DIM, 3, 0.8);
      ST.rrect(g, x - 22, base - 56, 44, 60, 8); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(255,51,85,.15)'; g.fill(); ST.glow(g, ST.RED, 3);
      ST.line(g, x - 14, base - 30, x + 14, base - 30); ST.thin(g, ST.RED, 2, 0.6);
      G.fig(g, p, x - sp * 0.28, base + 6, 28, { look: [0.6, -0.5], squash: pumping ? 0.08 : 0, still: true });
      ST.text(g, String(p.tot), x, base + 100, 30, U.rgb(col));
    });
    if (S.ph === 'pump') ST.text(g, 'RUNDE ' + S.rd + ' VON ' + this.ROUNDS + '  ·  NOCH ' + Math.ceil(S.tm) + ' S', 800, 170, 38, ST.TEXT);
    else if (S.ph === 'res') ST.text(g, 'GEPLATZT BEI ' + (S.shown || S.lim) + '!', 800, 170, 44, ST.YELLOW);
  },
});
