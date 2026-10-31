// C1 Brüchiger Boden: Sechseck-Platten zerbröseln, nachdem jemand darauf stand
'use strict';

HR.AR.define({
  code: 'C1', name: 'Brüchiger Boden', short: 'Bleib in Bewegung!',
  desc: 'Alle stehen auf Sechseck-Platten über einem Abgrund. Jede Platte bekommt Risse, solange jemand darauf steht. Ist sie zu stark beschädigt, bröckelt sie von allein weiter und fällt weg. Mit der Zeit brechen auch zufällig Platten ein. Bleib in Bewegung und such dir festen Boden.',
  goal: 'Nicht in den Abgrund fallen. Wer zuletzt noch steht, gewinnt.',
  touch: 'Steuerkreuz laufen', keys: 'Pfeiltasten oder WASD laufen',
  btns: [],
  duration: 120, R: 54, COLS: 15, ROWS: 10, CRACK: 1.2, POINT: 0.45, bgTop: '#3a2f6b', bgBot: '#120d26',

  geo() {
    const R = this.R, w = Math.sqrt(3) * R, h = 1.5 * R;
    const x0 = 800 - (this.COLS - 0.5) * w / 2 + w / 2, y0 = 500 - (this.ROWS - 1) * h / 2;
    return { R, w, h, x0, y0 };
  },
  center(i) { const G = this.geo(), r = Math.floor(i / this.COLS), c = i % this.COLS; return [G.x0 + c * G.w + (r % 2) * G.w / 2, G.y0 + r * G.h]; },
  tileAt(x, y) {
    const G = this.geo(), r0 = Math.round((y - G.y0) / G.h);
    let best = -1, bd = 1e9;
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      if (r < 0 || r >= this.ROWS) continue;
      const c0 = Math.round((x - G.x0 - (r % 2) * G.w / 2) / G.w);
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        if (c < 0 || c >= this.COLS) continue;
        const i = r * this.COLS + c, [cx, cy] = this.center(i), d = Math.hypot(x - cx, y - cy);
        if (d < bd) { bd = d; best = i; }
      }
    }
    return bd < G.R + 2 ? best : -1;
  },

  init(players, rnd) {
    const n = this.COLS * this.ROWS, T = new Array(n).fill(0);
    // ein paar Löcher von Anfang an
    for (let k = 0; k < 8; k++) T[rnd.randint(0, n - 1)] = -1;
    const p = players.map((pl, i) => {
      const a = i / players.length * 6.283, x = 800 + Math.cos(a) * 360, y = 500 + Math.sin(a) * 230;
      const ti = this.tileAt(x, y); if (ti >= 0) T[ti] = 0;
      return { id: pl.id, c: pl.c, x, y, vx: 0, vy: 0, al: 1, dt: 0, fall: 0, lx: 0, ly: 1 };
    });
    return { T, p };
  },

  step(S, inp, dt, G) {
    // Platten zerfallen
    // ab POINT bröckelt eine Platte von allein weiter, darunter nur solange jemand draufsteht
    for (let i = 0; i < S.T.length; i++) if (S.T[i] >= this.POINT) { S.T[i] += dt; if (S.T[i] >= this.CRACK) S.T[i] = -1; }
    S.rc = (S.rc || 0) + dt * (0.3 + S.time * 0.03);
    while (S.rc >= 1) { S.rc--; const i = Math.floor(Math.random() * S.T.length); if (S.T[i] >= 0 && S.T[i] < this.POINT) S.T[i] = this.POINT; }
    for (const p of S.p) {
      if (p.gone) continue;
      if (!p.al) { if (p.fall < 1) p.fall += dt * 1.6; continue; }
      const [dx, dy] = HR.ST.dir(inp[p.id]);
      p.vx += (dx * 330 - p.vx) * Math.min(1, dt * 9); p.vy += (dy * 330 - p.vy) * Math.min(1, dt * 9);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (dx || dy) { p.lx = dx; p.ly = dy; }
    }
    HR.ST.separate(S.p.filter(p => p.al && !p.gone), 26);
    for (const p of S.p) {
      if (!p.al || p.gone) continue;
      const ti = this.tileAt(p.x, p.y);
      if (ti < 0 || S.T[ti] < 0) { p.al = 0; p.dt = S.time; p.fall = 0; G.sfx('crash'); continue; }
      if (S.T[ti] < this.POINT && S.time > 0.5) S.T[ti] = Math.min(this.POINT, S.T[ti] + dt * 0.6 + 0.0001);
    }
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },
  status: () => '',

  pack(S) {
    return { t: +S.time.toFixed(3), T: S.T.map(v => v < 0 ? 'x' : v === 0 ? '0' : String(Math.min(9, 1 + Math.floor(v / this.CRACK * 9)))).join(''),
      p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), al: p.al, dt: p.dt, f: +p.fall.toFixed(2), lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) };
  },
  unpack(S, d) {
    S.time = d.t;
    for (let i = 0; i < d.T.length; i++) { const ch = d.T[i]; S.T[i] = ch === 'x' ? -1 : ch === '0' ? 0 : (+ch - 0.5) / 9 * this.CRACK; }
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.al = q.al; p.dt = q.dt; p.fall = q.f; p.lx = q.lx; p.ly = q.ly; p.gone = q.g; });
  },

  draw(g, S, G) {
    G.world(g);
    const Gm = this.geo(), R = Gm.R;
    const hex = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); };
    // fallende Spieler unter den Platten
    for (const p of S.p) if (!p.al && !p.gone && p.fall < 1) G.fig(g, p, p.x, p.y + p.fall * 140, 26 * (1 - p.fall * 0.7), { dead: true, alpha: 1 - p.fall, noMark: true });
    for (let i = 0; i < S.T.length; i++) {
      const v = S.T[i]; if (v < 0) continue;
      const [cx, cy] = this.center(i), k = v > 0 ? v / this.CRACK : 0;
      const sh = k > 0.6 ? Math.sin(S.time * 60 + i) * 3 * k : 0;
      // Seitenwand (Dicke) und Deckfläche
      hex(cx + sh, cy + 14, R - 2); HR.ST.fill(g, k > 0 ? '#8a5a3c' : '#5d7a3a', 4);
      hex(cx + sh, cy, R - 2);
      const top = k > 0 ? U.mix([150, 200, 90], [210, 120, 70], k) : [150, 205, 95];
      HR.ST.fill(g, U.rgb(((i * 7) % 5 === 0 && !k) ? U.shade(top, 0.93) : top), 4);
      if (k > 0) {
        g.strokeStyle = 'rgba(40,20,20,.7)'; g.lineWidth = 3; g.beginPath();
        for (let c = 0; c < 2 + Math.floor(k * 4); c++) { const a = c * 2.1 + i; g.moveTo(cx + sh, cy); g.lineTo(cx + sh + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.6); }
        g.stroke();
      } else { g.fillStyle = 'rgba(255,255,255,.12)'; hex(cx, cy - 4, R * 0.62); g.fill(); }
    }
    for (const p of S.p.filter(p => p.al && !p.gone).sort((a, b) => a.y - b.y)) G.fig(g, p, p.x, p.y - 18, 26, { look: [p.lx, p.ly] });
  },
});
