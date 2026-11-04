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
    // Western-Straße
    const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#ffcf8a'); sky.addColorStop(1, '#f08a4a');
    g.fillStyle = sky; g.fillRect(0, 0, 1600, 640);
    g.beginPath(); g.arc(800, 470, 150, 0, 7); g.fillStyle = '#ffe9a8'; g.fill();
    const house = (x, w, h, col) => { HR.ST.rrect(g, x, 600 - h, w, h, 6); HR.ST.fill(g, col, 5); g.fillStyle = 'rgba(37,31,58,.45)'; for (let k = 0; k < Math.floor(w / 70); k++) g.fillRect(x + 22 + k * 70, 600 - h + 40, 34, 46); };
    house(30, 300, 260, '#a8643a'); house(1270, 300, 300, '#9a5a32'); house(350, 180, 190, '#b87444'); house(1080, 170, 210, '#b06a3c');
    g.beginPath(); g.rect(0, 600, 1600, 400); HR.ST.fill(g, '#e0b070', 6);
    g.fillStyle = 'rgba(160,110,60,.3)'; for (let k = 0; k < 30; k++) { g.beginPath(); g.ellipse((k * 317) % 1600, 640 + (k * 131) % 340, 30, 6, 0, 0, 7); g.fill(); }
    // Signal
    if (S.ph === 'sig' || (S.ph === 'res' && S.win >= 0)) {
      const k = Math.min(1, (S.time - S.sigT) * 6);
      HR.ST.rrect(g, 800 - 280 * k, 170, 560 * k, 150, 30); HR.ST.fill(g, '#5be37a', 7);
      if (k > 0.6) HR.ST.text(g, 'JETZT!', 800, 248, 110, '#fff');
    } else if (S.fake) {
      HR.ST.rrect(g, 470, 170, 660, 150, 30); HR.ST.fill(g, '#ff9a3c', 7);
      HR.ST.text(g, S.fake, 800, 248, 80, '#fff');
    } else if (S.ph === 'wait' || S.ph === 'intro') {
      HR.ST.text(g, 'Warten …', 800, 248, 70, 'rgba(255,255,255,.9)');
    }
    HR.ST.text(g, S.rd ? 'Runde ' + Math.min(S.rd, this.ROUNDS) + ' von ' + this.ROUNDS : '', 800, 110, 34, '#fff');
    // Revolverhelden in einer Reihe
    const n = S.p.length, sp = Math.min(180, 1400 / n);
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const x = 800 + (i - (n - 1) / 2) * sp, y = 820;
      G.fig(g, p, x, y, 46, { look: [0, -0.6], hat: 'cowboy', stun: p.er, still: true });
      if (p.pr) {
        g.save(); g.translate(x + 40, y - 6); g.rotate(-0.6);
        HR.ST.rrect(g, 0, -8, 46, 16, 5); HR.ST.fill(g, '#555', 3);
        HR.ST.rrect(g, -6, -4, 16, 30, 5); HR.ST.fill(g, '#7a4a2a', 3);
        g.restore();
        if (p.id === S.win) HR.ST.burst(g, x + 70, y - 46, Math.min(1, (S.time - S.sigT - p.rt) * 2), '#ffd23c', 10, 50);
        HR.ST.text(g, Math.round(p.rt * 1000) + ' ms', x, y + 82, 24, p.id === S.win ? '#ffd23c' : '#fff');
      }
      if (p.er) HR.ST.text(g, 'ZU FRÜH!', x, y + 82, 24, '#ff4d5e');
      if (p.id === S.win && S.ph === 'res') HR.ST.text(g, '★', x, y - 120, 60, '#ffd23c');
      for (let k = 0; k < p.w; k++) { g.beginPath(); g.arc(x - (p.w - 1) * 9 + k * 18, y + 112, 7, 0, 7); HR.ST.fill(g, '#ffd23c', 2); }
    });
  },
});
