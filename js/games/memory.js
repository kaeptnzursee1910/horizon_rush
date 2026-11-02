// C6 Gedächtnis-Felder: gezeigte Felder-Folge merken und in der richtigen Reihenfolge stampfen
'use strict';

HR.AR.define({
  code: 'C6', name: 'Gedächtnis-Felder', short: 'Merk dir die Reihenfolge!',
  desc: 'Auf einem Raster aus 16 Feldern leuchten nacheinander einige Felder auf. Danach musst du genau diese Felder in derselben Reihenfolge abstampfen, bevor die Zeit abläuft. Wer auf ein falsches Feld stampft, fällt durch. Jede Runde kommt ein Feld dazu.',
  goal: 'Am längsten fehlerfrei bleiben. Wer zuletzt übrig ist, gewinnt.',
  touch: 'Steuerkreuz laufen, rechts STAMPFEN', keys: 'Pfeiltasten laufen, Leertaste stampfen',
  btns: [['act', 'STAMPFEN']],
  duration: 180, TS: 170, GAP: 16, SHOW: 0.75, bgTop: '#2e2a5a', bgBot: '#110e24',
  COLS: [[255, 99, 99], [255, 190, 60], [120, 210, 90], [80, 170, 255], [190, 110, 240], [255, 130, 200], [70, 210, 200], [250, 235, 90]],

  geo() { const T = this.TS, G = this.GAP, W = 4 * T + 3 * G; return { x0: 800 - W / 2, y0: 520 - W / 2, T, G, W }; },
  tileXY(i) { const g = this.geo(); return [g.x0 + (i % 4) * (g.T + g.G) + g.T / 2, g.y0 + Math.floor(i / 4) * (g.T + g.G) + g.T / 2]; },
  tileAt(x, y) { const g = this.geo(), cx = Math.floor((x - g.x0) / (g.T + g.G)), cy = Math.floor((y - g.y0) / (g.T + g.G)); if (cx < 0 || cy < 0 || cx > 3 || cy > 3) return -1; const [tx, ty] = this.tileXY(cy * 4 + cx); return Math.abs(x - tx) < g.T / 2 + 4 && Math.abs(y - ty) < g.T / 2 + 4 ? cy * 4 + cx : -1; },

  init(players, rnd) {
    const n = players.length;
    const S = { ph: 'wait', tm: 1.5, rd: 0, n: 2, seq: [], cur: -1, bad: -1, p: players.map((pl, i) => { const a = i / n * 6.283; return { id: pl.id, c: pl.c, x: 800 + Math.cos(a) * 520, y: 520 + Math.sin(a) * 340, al: 1, dt: 0, pg: 0, ok: 0, fl: 0, ft: -1, lx: 0, ly: 1 }; }) };
    return S;
  },

  newRound(S, G) {
    S.rd++; S.n = 1 + S.rd; S.seq = [];
    for (let k = 0; k < S.n; k++) { let t; do { t = Math.floor(Math.random() * 16); } while (k && t === S.seq[k - 1]); S.seq.push(t); }
    S.ph = 'show'; S.tm = 0.6; S.si = -1; S.cur = -1;
    for (const p of S.p) { p.pg = 0; p.ok = 0; p.ft = -1; }
    G.sfx('beep');
  },

  step(S, inp, dt, G) {
    S.tm -= dt;
    if (S.ph === 'wait' && S.tm <= 0) this.newRound(S, G);
    else if (S.ph === 'show') {
      if (S.tm <= 0) {
        S.si++;
        if (S.si < S.n) { S.cur = S.seq[S.si]; S.tm = this.SHOW; G.sfx('blip'); }
        else { S.cur = -1; S.ph = 'go'; S.tm = 2.5 + S.n * 1.3; S.lim = S.tm; G.sfx('go'); }
      } else if (S.tm < 0.18) S.cur = -1;
    } else if (S.ph === 'go') {
      const left = S.p.filter(p => p.al && !p.gone && !p.ok);
      if (S.tm <= 0 || !left.length) {
        for (const p of left) this.fail(S, p, G);
        S.ph = 'wait'; S.tm = 1.8;
      }
    }
    for (const p of S.p) {
      if (p.gone) continue;
      if (!p.al) { if (p.fl < 1) p.fl += dt * 1.4; continue; }
      const i = inp[p.id], [dx, dy] = HR.ST.dir(i);
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      const g = this.geo();
      p.x = U.clamp(p.x + dx * 330 * dt, 80, 1520); p.y = U.clamp(p.y + dy * 330 * dt, 90, 940);
      if (S.ph === 'go' && i.pa && !p.ok) {
        const t = this.tileAt(p.x, p.y);
        if (t < 0) continue;
        p.ft = t;
        if (t === S.seq[p.pg]) { p.pg++; G.sfx('select', p.id); if (p.pg >= S.n) { p.ok = 1; G.sfx('lap', p.id); } }
        else this.fail(S, p, G);
      }
    }
    HR.ST.separate(S.p.filter(p => p.al && !p.gone), 24);
  },

  fail(S, p, G) { p.al = 0; p.dt = S.time; p.fl = 0; G.sfx('crash'); },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S) || S.rd > 12; },
  rank(S) { return HR.AR.survival(S, p => p.pg); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },
  status: (S, p) => p.ok ? '✓' : S.ph === 'go' && p.al ? p.pg + '/' + S.n : '',

  pack(S) { return { t: +S.time.toFixed(3), ph: S.ph, tm: +S.tm.toFixed(2), lim: S.lim || 1, rd: S.rd, n: S.n, cur: S.cur,
    p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), al: p.al, dt: p.dt, pg: p.pg, ok: p.ok, fl: +p.fl.toFixed(2), ft: p.ft, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.ph = d.ph; S.tm = d.tm; S.lim = d.lim; S.rd = d.rd; S.n = d.n; S.cur = d.cur;
    d.p.forEach((q, i) => { const p = S.p[i]; Object.assign(p, { x: q.x, y: q.y, al: q.al, dt: q.dt, pg: q.pg, ok: q.ok, fl: q.fl, ft: q.ft, lx: q.lx, ly: q.ly, gone: q.g }); });
  },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST, gm = this.geo();
    ST.rrect(g, gm.x0 - 30, gm.y0 - 30 + 18, gm.W + 60, gm.W + 60, 30); g.fillStyle = ST.BODY; g.fill(); ST.thin(g, ST.VIOLET, 2, 0.6);
    ST.rrect(g, gm.x0 - 30, gm.y0 - 30, gm.W + 60, gm.W + 60, 30); g.fillStyle = '#0d0a20'; g.fill(); ST.glow(g, ST.VIOLET, 4);
    ST.rrect(g, gm.x0 - 18, gm.y0 - 18, gm.W + 36, gm.W + 36, 22); ST.thin(g, ST.VIOLET, 1.5, 0.35);
    const me = S.p.find(p => p.id === G.me);
    for (let i = 0; i < 16; i++) {
      const [x, y] = this.tileXY(i), c = HR.PARTY_COLORS[[7, 2, 3, 1, 4, 5, 0, 6][i % 8]], lit = S.cur === i;
      const T = gm.T, up = lit ? -10 : 0, dim = S.ph === 'show' && !lit;
      ST.rrect(g, x - T / 2, y - T / 2 + 10, T, T, 18); g.fillStyle = ST.BODY; g.fill(); ST.thin(g, c, 2, 0.4);
      ST.rrect(g, x - T / 2, y - T / 2 + up, T, T, 18);
      g.fillStyle = '#0c0a1c'; g.fill();
      if (lit) { ST.pool(g, x, y, T, c, 0.5); ST.rrect(g, x - T / 2, y - T / 2 + up, T, T, 18); g.fillStyle = ST.rgb(c, 0.55); g.fill(); ST.glow(g, ST.whiten(c, 0.3), 5); }
      else { g.fillStyle = ST.rgb(c, dim ? 0.05 : 0.12); g.fill(); ST.glow(g, c, 3, dim ? 0.45 : 0.85); }
      ST.rrect(g, x - T * 0.38, y - T * 0.38 + up, T * 0.76, T * 0.76, 12); ST.thin(g, c, 1.5, lit ? 0.8 : 0.3);
      // Symbol
      const s = T * 0.16;
      g.beginPath();
      if (i < 8) g.arc(x, y + up, s, 0, 7); else { g.moveTo(x, y + up - s * 1.2); g.lineTo(x + s * 1.1, y + up + s * 0.8); g.lineTo(x - s * 1.1, y + up + s * 0.8); g.closePath(); }
      if (lit) { g.fillStyle = '#ffffff'; g.fill(); } else ST.thin(g, c, 3, dim ? 0.35 : 0.7);
      if (me && !me.al && me.ft === i) ST.text(g, '✕', x, y, 90, ST.RED);
    }
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) {
      if (!p.al) { if (p.fl < 1) G.fig(g, p, p.x, p.y - 12 + p.fl * 60, 26 * (1 - p.fl * 0.6), { dead: true, alpha: 1 - p.fl, noMark: true, noShadow: true }); continue; }
      G.fig(g, p, p.x, p.y - 14, 26, { look: [p.lx, p.ly] });
      if (p.ok) ST.text(g, '✓', p.x + 28, p.y - 46, 30, ST.LIME);
    }
    // Ansage
    const top = 60;
    if (S.ph === 'show') ST.text(g, 'GUT AUFPASSEN!', 800, top, 44, ST.YELLOW);
    else if (S.ph === 'go') {
      const left = S.p.find(p => p.id === G.me);
      ST.text(g, left && left.al && !left.ok ? 'STAMPFEN! ' + (left.pg + 1) + '. FELD VON ' + S.n : 'LOS!', 800, top, 40, ST.TEXT);
      const f = U.clamp(S.tm / (S.lim || 1), 0, 1), col = S.tm < 2 ? ST.RED : ST.LIME;
      g.fillStyle = ST.rgba(col, 0.15); g.fillRect(500, top + 38, 600, 8);
      if (f > 0.01) { ST.line(g, 500, top + 42, 500 + 600 * f, top + 42); ST.glow(g, col, 6); }
    } else if (S.rd) ST.text(g, 'RUNDE ' + S.rd + ' GESCHAFFT', 800, top, 36, ST.TEXT);
    else ST.text(g, 'GLEICH GEHT ES LOS …', 800, top, 36, ST.TEXT);
  },
});
