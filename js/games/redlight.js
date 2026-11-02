// C7 Ampel-Lauf: bei Grün rennen, bei Rot erstarren
'use strict';

HR.AR.define({
  code: 'C7', name: 'Ampel-Lauf', short: 'Bei Rot nicht bewegen!',
  desc: 'Alle stehen an der Startlinie. Solange die Ampel grün ist, rennst du durch Halten von LAUFEN. Springt sie über Gelb auf Rot, musst du sofort stehen bleiben. Wer sich bei Rot noch bewegt, muss ein gutes Stück zurück. Manchmal blinkt Gelb nur kurz und es bleibt grün.',
  goal: 'Als Erster über die Ziellinie kommen.',
  touch: 'rechts LAUFEN halten (oder Steuerkreuz ▶)', keys: 'Leertaste oder → halten zum Laufen',
  btns: [['act', 'LAUFEN']],
  duration: 75, X0: 170, X1: 1430, bgTop: '#6fb3e8', bgBot: '#2a6aa8',

  init(players, rnd) {
    return { L: 'r', lt: 2.2, fake: 0, k: 0, seed: rnd.randint(1, 1e9), fin: 0,
      p: players.map((pl, i) => ({ id: pl.id, c: pl.c, x: this.X0, v: 0, st: 0, ft: 0, fo: 0, caught: 0 })) };
  },

  laneY(S, i) { const n = S.p.length, h = Math.min(100, 640 / n); return 300 + (i + 0.5) * h - n * h / 2 + 240; },

  step(S, inp, dt, G) {
    const rnd = U.rng((S.seed + S.k * 977) >>> 0);
    S.lt -= dt;
    if (S.lt <= 0) {
      S.k++;
      if (S.L === 'g') { S.L = 'y'; S.fake = rnd.random() < 0.22 ? 1 : 0; S.lt = S.fake ? 0.45 : 0.7; }
      else if (S.L === 'y') { if (S.fake) { S.L = 'g'; S.lt = rnd.uniform(1, 2.5); } else { S.L = 'r'; S.lt = rnd.uniform(1.4, 2.8); G.sfx('beep'); } }
      else { S.L = 'g'; S.lt = rnd.uniform(1.2, 3.2); G.sfx('go'); }
    }
    const redFor = S.L === 'r' ? (S.lastRed == null ? 0 : S.time - S.lastRed) : -1;
    if (S.L === 'r' && S.lastRed == null) S.lastRed = S.time;
    if (S.L !== 'r') S.lastRed = null;
    for (const p of S.p) {
      if (p.gone || p.ft) continue;
      const i = inp[p.id];
      if (p.st > 0) { p.st -= dt; p.v = 0; continue; }
      if (i.a || i.r) p.v = Math.min(175, p.v + 700 * dt);
      else p.v = Math.max(0, p.v - 2600 * dt);
      p.x += p.v * dt;
      if (redFor > 0.25 && p.v > 15) { p.x = Math.max(this.X0, p.x - 220); p.v = 0; p.st = 1.0; p.caught++; G.sfx('crash'); }
      if (p.x >= this.X1) { p.x = this.X1; p.ft = S.time; p.fo = ++S.fin; G.sfx('lap', p.id); G.sfx('finish'); }
    }
  },

  over(S) { return S.p.filter(p => !p.gone).every(p => p.ft) || S.fin >= Math.max(1, S.p.filter(p => !p.gone).length - 1); },
  rank(S) { return S.p.filter(p => !p.gone).map(p => p.ft ? { id: p.id, s: 100000 - p.fo, txt: 'Ziel nach ' + U.fmtTime(p.ft) } : { id: p.id, s: Math.round(p.x - this.X0), txt: Math.round((p.x - this.X0) / (this.X1 - this.X0) * 100) + ' % der Strecke' }).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.ft ? p.fo + '.' : Math.round((p.x - 170) / 12.6) + ' %',
  spot(S, p) { return [p.x, this.laneY(S, S.p.indexOf(p))]; },

  pack(S) { return { t: +S.time.toFixed(3), L: S.L, p: S.p.map(p => ({ x: Math.round(p.x), v: Math.round(p.v), st: p.st > 0 ? 1 : 0, ft: p.ft, fo: p.fo, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) { S.time = d.t; S.L = d.L; d.p.forEach((q, i) => { const p = S.p[i]; Object.assign(p, { x: q.x, v: q.v, st: q.st, ft: q.ft, fo: q.fo, gone: q.g }); }); },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST, n = S.p.length, top = this.laneY(S, 0) - Math.min(100, 640 / n) / 2 - 20, bot = this.laneY(S, n - 1) + Math.min(100, 640 / n) / 2 + 20;
    // Laufbahn
    ST.floor(g, 90, top, 1420, bot - top, ST.ORANGE, null, 70);
    ST.frame(g, 70, top - 20, 1460, bot - top + 40, ST.ORANGE, 4);
    g.setLineDash([24, 16]);
    for (let i = 1; i < n; i++) { const y = (this.laneY(S, i - 1) + this.laneY(S, i)) / 2; ST.line(g, 100, y, 1500, y); ST.thin(g, ST.ICE, 2, 0.35); }
    g.setLineDash([]);
    ST.line(g, this.X0, top, this.X0, bot); ST.glow(g, ST.ICE, 3);
    for (let y = top, k = 0; y < bot; y += 20, k++) for (let c = 0; c < 2; c++) { g.fillStyle = (k + c) % 2 ? '#f2eeff' : '#0b0918'; g.fillRect(this.X1 + c * 20, y, 20, Math.min(20, bot - y)); }
    ST.line(g, this.X1 - 2, top, this.X1 - 2, bot); ST.glow(g, ST.LIME, 3);
    // Ampel oben in der Mitte
    const ax = 800, ay = top - 150;
    ST.line(g, ax, ay + 60, ax, top - 22); ST.thin(g, ST.DIM, 6, 0.8);
    ST.rrect(g, ax - 150, ay - 50, 300, 110, 30); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, [170, 162, 220], 3);
    const lamp = (k, x, col) => {
      const on = S.L === k;
      if (on) ST.pool(g, x, ay + 5, 130, col, 0.45);
      ST.oct(g, x, ay + 5, 38);
      if (on) ST.solid(g, col, 0.9); else { g.fillStyle = ST.rgba(col, 0.08); g.fill(); ST.thin(g, col, 2, 0.4); }
      if (on) { ST.oct(g, x, ay + 5, 24); ST.thin(g, '#ffffff', 2, 0.6); }
    };
    lamp('r', ax - 95, ST.RED); lamp('y', ax, ST.YELLOW); lamp('g', ax + 95, ST.LIME);
    // Wächter am Ziel: dreht sich bei Rot um
    const wx = 1520, wy = (top + bot) / 2, watching = S.L === 'r';
    if (watching) { g.beginPath(); g.moveTo(wx - 40, wy); g.lineTo(wx - 520, wy - 260); g.lineTo(wx - 520, wy + 260); g.closePath(); g.fillStyle = 'rgba(255,51,85,.07)'; g.fill(); }
    ST.char(g, wx, wy, 60, watching ? [255, 51, 85] : [170, 162, 220], { look: watching ? [-1, 0] : [1, -0.6], t: S.time, still: true, sym: 'auge' });
    if (watching) ST.text(g, '!', wx, wy - 100, 60, ST.RED);
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const y = this.laneY(S, i), run = p.v > 30 ? Math.sin(S.time * 22) : 0;
      G.fig(g, p, p.x, y - 6 - Math.abs(run) * 6, Math.min(26, 640 / n * 0.28), { look: [1, 0], stun: p.st, squash: run * 0.05 });
      if (p.ft) ST.text(g, p.fo + '.', p.x - 60, y - 6, 32, ST.YELLOW);
    });
    const big = S.L === 'g' ? ['LAUF!', ST.LIME] : S.L === 'y' ? ['ACHTUNG …', ST.YELLOW] : ['STOPP!', ST.RED];
    ST.text(g, big[0], 800, bot + 70, 56, big[1]);
  },
});
