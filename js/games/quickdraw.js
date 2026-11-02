// C9 Schnellzieher: Wer nach dem Signal zuerst drückt, gewinnt die Runde. Zu früh = Runde verloren.
'use strict';

HR.AR.define({
  code: 'C9', name: 'Schnellzieher', short: 'Erst bei JETZT! drücken!',
  desc: 'Ein Western-Duell für alle. Nach einer zufälligen Wartezeit erscheint „JETZT!“. Wer zuerst ZIEHEN drückt, gewinnt die Runde. Wer zu früh drückt, setzt diese Runde aus. Vorsicht: Manchmal erscheinen falsche Signale wie „JETZT NICHT!“.',
  goal: 'Nach 7 Runden gewinnt, wer die meisten Runden geholt hat. Bei Gleichstand zählt die schnellere Reaktion.',
  touch: 'rechts ZIEHEN', keys: 'Leertaste ziehen',
  btns: [['act', 'ZIEHEN']],
  duration: 150, ROUNDS: 7, bgTop: '#f2a65a', bgBot: '#a8502a',
  FAKES: ['JETZT NICHT!', 'JEIN!', 'JETZ…', 'GLEICH!', 'NOCH NICHT!'],

  init(players, rnd) {
    return { ph: 'intro', tm: 1.5, rd: 0, sigT: 0, win: -1, fake: '', fk: 0,
      p: players.map(pl => ({ id: pl.id, c: pl.c, w: 0, rt: 0, sum: 0, cnt: 0, er: 0, pr: 0 })) };
  },

  next(S) {
    S.rd++; S.ph = 'wait'; S.tm = 1.8 + Math.random() * 3.2; S.win = -1; S.fake = ''; S.fk = Math.random() < 0.45 ? 0.6 + Math.random() * (S.tm - 1) : -1;
    for (const p of S.p) { p.er = 0; p.pr = 0; p.rt = 0; }
  },

  step(S, inp, dt, G) {
    S.tm -= dt;
    if (S.ph === 'intro' && S.tm <= 0) this.next(S);
    else if (S.ph === 'wait') {
      if (S.fk > 0 && S.tm < S.fk && !S.fake) { S.fake = this.FAKES[Math.floor(Math.random() * this.FAKES.length)]; G.sfx('blip'); }
      if (S.fake && S.tm < S.fk - 0.7) { S.fk = -1; }
      if (S.tm <= 0) { S.ph = 'sig'; S.sigT = S.time; S.tm = 1.4; S.fake = ''; G.sfx('go'); }
    } else if (S.ph === 'sig') {
      const left = S.p.filter(p => !p.gone && !p.er && !p.pr);
      if (S.tm <= 0 || !left.length) { S.ph = 'res'; S.tm = 1.8; }
    } else if (S.ph === 'res' && S.tm <= 0) { if (S.rd >= this.ROUNDS) S.ph = 'done'; else this.next(S); }
    for (const p of S.p) {
      if (p.gone || !inp[p.id].pa || p.er || p.pr) continue;
      if (S.ph === 'wait') { p.er = 1; G.sfx('crash', p.id); }
      else if (S.ph === 'sig') {
        p.pr = 1; p.rt = S.time - S.sigT; p.sum += p.rt; p.cnt++;
        if (S.win < 0) { S.win = p.id; p.w++; G.sfx('bump'); G.sfx('lap', p.id); }
      }
    }
  },

  over: S => S.ph === 'done',
  rank(S) {
    return S.p.filter(p => !p.gone).map(p => { const avg = p.cnt ? p.sum / p.cnt : 9; return { id: p.id, s: p.w * 10000 - Math.round(avg * 1000), txt: p.w + ' Runden · Ø ' + (p.cnt ? Math.round(avg * 1000) + ' ms' : '–') }; }).sort((a, b) => b.s - a.s);
  },
  status: (S, p) => p.w + ' ★',

  pack(S) { return { t: +S.time.toFixed(3), ph: S.ph, rd: S.rd, win: S.win, fake: S.fake, sg: +(S.time - S.sigT).toFixed(2), p: S.p.map(p => ({ w: p.w, rt: +p.rt.toFixed(3), er: p.er, pr: p.pr, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) { S.time = d.t; S.ph = d.ph; S.rd = d.rd; S.win = d.win; S.fake = d.fake; S.sigT = d.t - d.sg; d.p.forEach((q, i) => Object.assign(S.p[i], { w: q.w, rt: q.rt, er: q.er, pr: q.pr, gone: q.g })); },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST;
    // Westernstraße bei Nacht: Streifensonne, Häuser als Konturen, Rasterboden
    const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#07060f'); sky.addColorStop(0.7, '#1c0b30'); sky.addColorStop(1, '#3a0d40');
    g.fillStyle = sky; g.fillRect(0, 0, 1600, 600);
    g.fillStyle = 'rgba(242,238,255,.5)'; for (let k = 0; k < 60; k++) g.fillRect((k * 263) % 1600, (k * 97) % 420, 2, 2);
    ST.pool(g, 800, 520, 380, ST.MAGENTA, 0.25);
    g.save(); g.beginPath(); g.arc(800, 600, 170, Math.PI, 0); g.closePath(); g.clip();
    const sg = g.createLinearGradient(0, 430, 0, 600); sg.addColorStop(0, '#ffe23d'); sg.addColorStop(0.55, '#ff7a1a'); sg.addColorStop(1, '#ff2bd6');
    g.fillStyle = sg; g.fillRect(630, 430, 340, 170);
    g.fillStyle = '#2a0b3a'; for (let k = 0; k < 8; k++) g.fillRect(630, 592 - k * 18, 340, 2 + (7 - k) * 0.9);
    g.restore();
    const house = (x, w, h, col, sign) => {
      g.beginPath(); g.rect(x, 600 - h, w, h); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, col, 3);
      ST.line(g, x - 10, 600 - h, x + w + 10, 600 - h); ST.glow(g, col, 3);
      for (let k = 0; k < Math.floor(w / 70); k++) { const lit = (k + Math.floor(x)) % 3 !== 0; g.beginPath(); g.rect(x + 22 + k * 70, 600 - h + 40, 34, 46); if (lit) { g.fillStyle = ST.rgba(ST.YELLOW, 0.3); g.fill(); } ST.thin(g, lit ? ST.YELLOW : col, 2, lit ? 0.9 : 0.5); }
      if (sign) { ST.rrect(g, x + w / 2 - 80, 600 - h - 54, 160, 40, 8); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.MAGENTA, 2.5); ST.text(g, sign, x + w / 2, 600 - h - 33, 22, ST.MAGENTA); }
    };
    house(30, 300, 260, ST.ORANGE, 'SALOON'); house(1270, 300, 300, ST.VIOLET, 'SHERIFF'); house(350, 180, 190, ST.VIOLET); house(1080, 170, 210, ST.ORANGE);
    g.fillStyle = '#0a0817'; g.fillRect(0, 600, 1600, 400);
    g.beginPath(); for (let k = -18; k <= 18; k++) { g.moveTo(800 + k * 18, 600); g.lineTo(800 + k * 150, 1000); } for (let k = 1; k < 10; k++) { const y = 600 + Math.pow(k / 9, 2) * 400; g.moveTo(0, y); g.lineTo(1600, y); }
    ST.thin(g, ST.MAGENTA, 1.5, 0.35);
    ST.line(g, 0, 600, 1600, 600); ST.glow(g, ST.MAGENTA, 3);
    // Signal
    if (S.ph === 'sig' || (S.ph === 'res' && S.win >= 0)) {
      const k = Math.min(1, (S.time - S.sigT) * 6);
      ST.pool(g, 800, 245, 420 * k, ST.LIME, 0.35);
      ST.rrect(g, 800 - 280 * k, 170, 560 * k, 150, 30); g.fillStyle = 'rgba(182,255,46,.25)'; g.fill(); ST.glow(g, ST.LIME, 6);
      if (k > 0.6) ST.text(g, 'JETZT!', 800, 248, 110, '#ffffff');
    } else if (S.fake) {
      ST.rrect(g, 470, 170, 660, 150, 30); g.fillStyle = 'rgba(255,122,26,.2)'; g.fill(); ST.glow(g, ST.ORANGE, 5);
      ST.text(g, S.fake, 800, 248, 80, ST.ORANGE);
    } else if (S.ph === 'wait' || S.ph === 'intro') {
      ST.text(g, 'WARTEN …', 800, 248, 70, ST.DIM);
    }
    ST.text(g, S.rd ? 'RUNDE ' + Math.min(S.rd, this.ROUNDS) + ' VON ' + this.ROUNDS : '', 800, 110, 34, ST.TEXT);
    // Revolverhelden in einer Reihe
    const n = S.p.length, sp = Math.min(180, 1400 / n);
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const x = 800 + (i - (n - 1) / 2) * sp, y = 800, c = G.color(p);
      G.fig(g, p, x, y, 42, { look: [0, 0], hat: 'cowboy', stun: p.er, still: true });
      if (p.pr) {
        g.save(); g.translate(x + 44, y - 6); g.rotate(-0.6);
        ST.rrect(g, 0, -7, 48, 14, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 2);
        ST.rrect(g, -6, -4, 16, 30, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 2);
        g.restore();
        if (p.id === S.win) ST.burst(g, x + 74, y - 46, Math.min(1, (S.time - S.sigT - p.rt) * 2), ST.YELLOW, 10, 50);
        ST.text(g, Math.round(p.rt * 1000) + ' MS', x, y + 82, 24, p.id === S.win ? ST.YELLOW : ST.TEXT);
      }
      if (p.er) ST.text(g, 'ZU FRÜH!', x, y + 82, 24, ST.RED);
      if (p.id === S.win && S.ph === 'res') ST.text(g, '★', x, y - 126, 60, ST.YELLOW);
      for (let k = 0; k < p.w; k++) { const wx = x - (p.w - 1) * 10 + k * 20, wy = y + 116; g.beginPath(); g.moveTo(wx, wy - 8); g.lineTo(wx + 7, wy); g.lineTo(wx, wy + 8); g.lineTo(wx - 7, wy); g.closePath(); g.fillStyle = ST.YELLOW; g.fill(); }
    });
  },
});
