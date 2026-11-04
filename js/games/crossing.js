// B10 Straßen-Überquerung: alle hüpfen gleichzeitig über eine Straße und einen Fluss
'use strict';

HR.AR.define({
  code: 'B10', name: 'Straßen-Überquerung', short: 'Dreimal sicher rüber!',
  desc: 'Alle starten unten und hüpfen Feld für Feld nach oben: erst über eine vielbefahrene Straße, dann über einen Fluss auf treibenden Baumstämmen. Wer überfahren wird oder ins Wasser fällt, muss zurück zum Start. Oben angekommen geht es wieder unten los.',
  goal: 'Als Erster dreimal sicher oben ankommen. Nach 2 Minuten gewinnt, wer am öftesten drüben war.',
  touch: 'Steuerkreuz: ein Feld hüpfen', keys: 'Pfeiltasten oder WASD: ein Feld hüpfen',
  btns: [],
  duration: 120, ROWS: 11, CW: 80, LW: 2000, GOAL: 3,

  init(players, rnd) {
    const RH = 1000 / this.ROWS, lanes = [];
    let dir = rnd.random() < 0.5 ? 1 : -1;
    const road = [[1.2, 105], [2.3, 80], [1.1, 160], [1.0, 230]];
    const cols = ['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#ecf0f1'];
    for (let r = 0; r < this.ROWS; r++) {
      const L = { type: 'grass', o: [] };
      if (r >= 1 && r <= 4) {
        const [len, sp] = road[r - 1];
        Object.assign(L, { type: 'road', len: len * this.CW, sp: sp * rnd.uniform(0.9, 1.2), dir, col: cols[rnd.randint(0, cols.length - 1)] });
        for (let x = rnd.uniform(0, 200); x < this.LW - L.len; x += L.len + rnd.uniform(2.8, 5.2) * this.CW) L.o.push(x);
        dir = -dir;
      } else if (r >= 6 && r <= 9) {
        Object.assign(L, { type: 'river', sp: rnd.uniform(60, 130), dir });
        for (let x = rnd.uniform(0, 150); x < this.LW - 2 * this.CW;) {
          const len = rnd.uniform(2.6, 4.2) * this.CW;
          L.o.push([x, len]); x += len + rnd.uniform(1.4, 2.6) * this.CW;
        }
        dir = -dir;
      } else if (r === this.ROWS - 1) L.type = 'goal';
      lanes.push(L);
    }
    const n = players.length;
    return { lanes, RH, p: players.map((pl, i) => ({ id: pl.id, c: pl.c, x: this.CW * (2 + Math.round(i * 16 / Math.max(1, n - 1 || 1)) % 17) + this.CW / 2, r: 0, cr: 0, dead: 0, cd: 0, best: 0 })) };
  },

  // linke Kante von Objekt o in Spur L zur Zeit t
  ox(L, o, t) { return ((o + L.dir * L.sp * t) % this.LW + this.LW) % this.LW - 200; },

  step(S, inp, dt, G) {
    const CW = this.CW;
    for (const p of S.p) {
      if (p.gone) continue;
      if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.r = 0; } continue; }
      p.cd = Math.max(-1, p.cd - dt);
      const i = inp[p.id], rep = p.cd <= -0.08;   // gedrückt halten: alle 0,18 s ein Sprung
      if (p.cd <= 0) {
        if (i.pu || (i.u && rep)) { p.r++; p.cd = 0.1; }
        else if (i.pd || (i.d && rep)) { p.r = Math.max(0, p.r - 1); p.cd = 0.1; }
        else if (i.pl || (i.l && rep)) { p.x -= CW; p.cd = 0.1; }
        else if (i.pr || (i.r && rep)) { p.x += CW; p.cd = 0.1; }
      }
      const L = S.lanes[p.r];
      if (L.type === 'river') {
        let on = false;
        for (const [o, len] of L.o) { const x = this.ox(L, o, S.time); if (p.x > x + 8 && p.x < x + len - 8) { on = true; break; } }
        if (on) p.x += L.dir * L.sp * dt;
        if (!on || p.x < 10 || p.x > 1590) { this.die(S, p, G, 'Platsch!'); continue; }
      } else p.x = U.clamp(p.x, CW / 2, 1600 - CW / 2);
      if (L.type === 'road') {
        for (const o of L.o) { const x = this.ox(L, o, S.time); if (p.x + 24 > x && p.x - 24 < x + L.len) { this.die(S, p, G); break; } }
      }
      if (p.dead <= 0) p.best = Math.max(p.best, p.r);
      if (p.r >= this.ROWS - 1) { p.cr++; p.r = 0; p.best = 0; G.sfx('lap', p.id); G.sfx('blip'); }
    }
  },

  die(S, p, G) { p.dead = 0.9; G.sfx('crash'); },

  over(S) { return S.p.some(p => p.cr >= this.GOAL); },
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.cr * 100 + (p.dead > 0 ? 0 : p.r), txt: p.cr + '× drüben' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.cr + '/3',

  pack(S) { return { t: +S.time.toFixed(3), p: S.p.map(p => ({ x: Math.round(p.x), r: p.r, cr: p.cr, d: p.dead > 0 ? 1 : 0, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) { S.time = d.t; d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.r = q.r; p.cr = q.cr; p.dead = q.d; p.gone = q.g; }); },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST;
    g.beginPath(); g.rect(0, 0, 1600, 1000); g.clip();
    const RH = S.RH, Y = r => 1000 - (r + 1) * RH;
    S.lanes.forEach((L, r) => {
      const y = Y(r);
      if (L.type === 'road') {
        g.fillStyle = '#5c5873'; g.fillRect(0, y, 1600, RH);
        g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 10; x < 1600; x += 90) { ST.rrect(g, x, y + RH / 2 - 3, 44, 6, 3); g.fill(); }
        g.fillStyle = ST.INK; g.fillRect(0, y, 1600, 4); g.fillRect(0, y + RH - 4, 1600, 4);
        for (const o of L.o) {
          const x = this.ox(L, o, S.time), w = L.len, h = RH * 0.62, cy = y + RH / 2;
          g.fillStyle = 'rgba(20,10,40,.25)'; ST.rrect(g, x + 4, cy - h / 2 + 8, w, h, 12); g.fill();
          for (const wx of [x + 14, x + w - 30]) for (const wy of [cy - h / 2 - 5, cy + h / 2 - 7]) { ST.rrect(g, wx, wy, 16, 12, 4); ST.fill(g, ST.INK, 2); }
          ST.rrect(g, x, cy - h / 2, w, h, 12); ST.fill(g, L.col, 4);
          const fx = L.dir > 0 ? x + w - 38 : x + 12; ST.rrect(g, fx, cy - h / 2 + 7, 26, h - 14, 6); ST.fill(g, '#9fd8ff', 3);
          g.fillStyle = 'rgba(255,255,255,.3)'; ST.rrect(g, x + 8, cy - h / 2 + 5, w - 16, 7, 3); g.fill();
          g.fillStyle = '#fff3a0'; const lx = L.dir > 0 ? x + w - 6 : x + 1; g.fillRect(lx, cy - h / 2 + 5, 5, 9); g.fillRect(lx, cy + h / 2 - 14, 5, 9);
        }
      } else if (L.type === 'river') {
        g.fillStyle = '#4fb6e8'; g.fillRect(0, y, 1600, RH);
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 4; g.lineCap = 'round';
        for (let x = (S.time * 30 * L.dir) % 120 - 120; x < 1700; x += 120) { g.beginPath(); g.moveTo(x, y + RH * 0.5); g.quadraticCurveTo(x + 30, y + RH * 0.35, x + 60, y + RH * 0.5); g.stroke(); }
        for (const [o, len] of L.o) {
          const x = this.ox(L, o, S.time), h = RH * 0.66, cy = y + RH / 2;
          ST.rrect(g, x, cy - h / 2, len, h, h / 2); ST.fill(g, '#b0743c', 4);
          g.strokeStyle = 'rgba(80,40,20,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + h * 0.5, cy - h * 0.12); g.lineTo(x + len - h * 0.6, cy - h * 0.12); g.moveTo(x + h * 0.7, cy + h * 0.16); g.lineTo(x + len - h * 0.8, cy + h * 0.16); g.stroke();
          g.beginPath(); g.ellipse(x + len - h * 0.28, cy, h * 0.2, h * 0.4, 0, 0, 7); ST.fill(g, '#e8c08a', 3);
        }
      } else if (L.type === 'goal') {
        g.fillStyle = '#8fd06a'; g.fillRect(0, y, 1600, RH);
        for (let x = 0; x < 1600; x += 40) for (let k = 0; k < 2; k++) { g.fillStyle = (x / 40 + k) % 2 ? '#fff' : ST.INK; g.fillRect(x, y + RH - 20 + k * 10, 40, 10); }
        ST.text(g, 'ZIEL', 800, y + RH * 0.42, 40, '#ffd23c');
      } else {
        g.fillStyle = r % 2 ? '#8fd06a' : '#84c35f'; g.fillRect(0, y, 1600, RH);
        g.fillStyle = 'rgba(40,90,30,.25)'; for (let x = 20 + (r * 37) % 60; x < 1600; x += 110) { g.beginPath(); g.moveTo(x, y + RH * 0.7); g.lineTo(x + 5, y + RH * 0.45); g.lineTo(x + 10, y + RH * 0.7); g.fill(); }
      }
    });
    S.p.forEach((p, idx) => {
      if (p.gone) return;
      const x = p.x + ((idx % 3) - 1) * 6, y = Y(p.r) + RH / 2 + ((idx % 2) ? 4 : -4) - 6;
      if (p.dead > 0) { G.fig(g, p, x, y + 8, 22, { dead: true, squash: 0.35, alpha: 0.75, noMark: true }); return; }
      G.fig(g, p, x, y, 22, { look: [0, -1] });
    });
  },
});
