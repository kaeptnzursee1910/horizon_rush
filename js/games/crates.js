// C3 Kistenregen: fallenden Kisten ausweichen, gelandete Kisten bleiben liegen
'use strict';

HR.AR.define({
  code: 'C3', name: 'Kistenregen', short: 'Achte auf die Schatten!',
  desc: 'Von oben fallen Kisten auf den Hof. Ein wachsender Schatten zeigt, wo sie landen. Gelandete Kisten bleiben liegen, dadurch wird es immer enger. Ab und zu fällt ein Schutzschild herunter, das einen Treffer abhält.',
  goal: 'Nicht getroffen werden. Wer zuletzt übrig ist, gewinnt.',
  touch: 'Steuerkreuz laufen', keys: 'Pfeiltasten oder WASD laufen',
  btns: [],
  duration: 120, CELL: 80, GX: 18, GY: 11, FALL: 1.6, bgTop: '#4a7a3a', bgBot: '#1f3a1a',

  geo() { return { x0: 800 - this.GX * this.CELL / 2, y0: 500 - this.GY * this.CELL / 2 }; },

  init(players, rnd) {
    const n = players.length;
    return {
      seed: rnd.randint(1, 1e9), k: 0, next: 1.2, fall: [], box: new Array(this.GX * this.GY).fill(0), sh: [], fx: [],
      p: players.map((pl, i) => { const a = i / n * 6.283; return { id: pl.id, c: pl.c, x: 800 + Math.cos(a) * 420, y: 500 + Math.sin(a) * 260, al: 1, dt: 0, sh: 0, lx: 0, ly: 1 }; }),
    };
  },

  cellOf(x, y) { const G = this.geo(); const cx = Math.floor((x - G.x0) / this.CELL), cy = Math.floor((y - G.y0) / this.CELL); return cx < 0 || cy < 0 || cx >= this.GX || cy >= this.GY ? -1 : cy * this.GX + cx; },
  cellXY(i) { const G = this.geo(); return [G.x0 + (i % this.GX + 0.5) * this.CELL, G.y0 + (Math.floor(i / this.GX) + 0.5) * this.CELL]; },

  step(S, inp, dt, G) {
    const rnd = U.rng((S.seed + S.k * 7919) >>> 0);
    // neue Kisten: oft genau auf jemanden gezielt
    S.next -= dt;
    if (S.next <= 0) {
      const alive = S.p.filter(p => p.al && !p.gone), cnt = 1 + Math.floor(S.time / 18);
      for (let c = 0; c < cnt; c++) {
        let ci;
        if (alive.length && rnd.random() < 0.55) { const t = alive[Math.floor(rnd.random() * alive.length)]; ci = this.cellOf(t.x + rnd.uniform(-60, 60), t.y + rnd.uniform(-60, 60)); }
        else ci = Math.floor(rnd.random() * S.box.length);
        if (ci >= 0 && !S.box[ci] && !S.fall.some(f => f.c === ci)) S.fall.push({ c: ci, t: this.FALL });
        S.k++;
      }
      if (rnd.random() < 0.12 && S.sh.length < 2) { const ci = Math.floor(rnd.random() * S.box.length); if (!S.box[ci]) S.sh.push({ c: ci }); }
      S.next = Math.max(0.35, 1.25 - S.time * 0.012);
    }
    for (const f of S.fall) {
      f.t -= dt;
      if (f.t <= 0) {
        S.box[f.c] = 1; G.sfx('bump');
        S.fx.push({ c: f.c, t: S.time });
        const [x, y] = this.cellXY(f.c);
        for (const p of S.p) {
          if (!p.al || p.gone || Math.abs(p.x - x) > this.CELL / 2 + 14 || Math.abs(p.y - y) > this.CELL / 2 + 14) continue;
          if (p.sh) { p.sh = 0; G.sfx('lap', p.id); const d = Math.hypot(p.x - x, p.y - y) || 1; p.x += (p.x - x) / d * 60; p.y += (p.y - y) / d * 60; }
          else { p.al = 0; p.dt = S.time; G.sfx('crash'); }
        }
        S.sh = S.sh.filter(s => s.c !== f.c);
      }
    }
    S.fall = S.fall.filter(f => f.t > 0);
    S.fx = S.fx.filter(e => S.time - e.t < 0.5);
    const G0 = this.geo(), W = this.GX * this.CELL, H = this.GY * this.CELL;
    for (const p of S.p) {
      if (!p.al || p.gone) continue;
      const [dx, dy] = HR.ST.dir(inp[p.id]);
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      this.move(S, p, dx * 300 * dt, 0); this.move(S, p, 0, dy * 300 * dt);
      p.x = U.clamp(p.x, G0.x0 + 20, G0.x0 + W - 20); p.y = U.clamp(p.y, G0.y0 + 20, G0.y0 + H - 20);
      const ci = this.cellOf(p.x, p.y), s = S.sh.find(q => q.c === ci);
      if (s && !p.sh) { p.sh = 1; S.sh = S.sh.filter(q => q !== s); G.sfx('select', p.id); }
    }
    HR.ST.separate(S.p.filter(p => p.al && !p.gone), 22);
  },

  // gegen gelandete Kisten laufen
  move(S, p, dx, dy) {
    const nx = p.x + dx, ny = p.y + dy, r = 18;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) { const c = this.cellOf(nx + ox, ny + oy); if (c >= 0 && S.box[c]) return; }
    p.x = nx; p.y = ny;
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },
  status: (S, p) => p.sh ? 'Schild' : '',

  pack(S) {
    return { t: +S.time.toFixed(3), B: S.box.join(''), F: S.fall.map(f => [f.c, +f.t.toFixed(2)]), H: S.sh.map(s => s.c), X: S.fx.map(e => [e.c, +e.t.toFixed(2)]),
      p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), al: p.al, dt: p.dt, s: p.sh, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) };
  },
  unpack(S, d) {
    S.time = d.t; S.box = d.B.split('').map(Number); S.fall = d.F.map(f => ({ c: f[0], t: f[1] })); S.sh = d.H.map(c => ({ c })); S.fx = d.X.map(e => ({ c: e[0], t: e[1] }));
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.al = q.al; p.dt = q.dt; p.sh = q.s; p.lx = q.lx; p.ly = q.ly; p.gone = q.g; });
  },

  crate(g, x, y, s, a) {
    g.save(); g.globalAlpha = a == null ? 1 : a;
    HR.ST.rrect(g, x - s / 2, y - s / 2, s, s, s * 0.08); HR.ST.fill(g, '#c98a45', 5);
    g.strokeStyle = '#8a5526'; g.lineWidth = s * 0.08;
    g.strokeRect(x - s * 0.36, y - s * 0.36, s * 0.72, s * 0.72);
    g.beginPath(); g.moveTo(x - s * 0.36, y - s * 0.36); g.lineTo(x + s * 0.36, y + s * 0.36); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - s / 2 + 5, y - s / 2 + 5, s - 10, s * 0.12);
    g.restore();
  },

  draw(g, S, G) {
    G.world(g);
    const G0 = this.geo(), C = this.CELL, W = this.GX * C, H = this.GY * C;
    HR.ST.rrect(g, G0.x0 - 14, G0.y0 - 14, W + 28, H + 28, 20); HR.ST.fill(g, '#7a5a3a', 6);
    HR.ST.floor(g, G0.x0, G0.y0, W, H, '#8fd06a', '#7fc25c', C);
    g.strokeStyle = HR.ST.INK; g.lineWidth = 5; g.strokeRect(G0.x0, G0.y0, W, H);
    // Schilde
    for (const s of S.sh) {
      const [x, y] = this.cellXY(s.c), b = Math.sin(S.time * 5) * 5;
      g.beginPath(); g.moveTo(x, y - 26 + b); g.quadraticCurveTo(x + 26, y - 22 + b, x + 22, y + b); g.quadraticCurveTo(x + 14, y + 20 + b, x, y + 28 + b); g.quadraticCurveTo(x - 14, y + 20 + b, x - 22, y + b); g.quadraticCurveTo(x - 26, y - 22 + b, x, y - 26 + b);
      HR.ST.fill(g, '#4ad6ff', 4);
    }
    // Schatten der fallenden Kisten
    for (const f of S.fall) {
      const [x, y] = this.cellXY(f.c), k = 1 - f.t / this.FALL;
      g.fillStyle = `rgba(30,10,40,${0.15 + k * 0.4})`; HR.ST.rrect(g, x - C / 2 * k, y - C / 2 * k, C * k, C * k, 8); g.fill();
      g.strokeStyle = `rgba(255,60,60,${k})`; g.lineWidth = 3; HR.ST.rrect(g, x - C / 2 + 4, y - C / 2 + 4, C - 8, C - 8, 8); g.stroke();
    }
    // gelandete Kisten und Figuren, von oben nach unten
    const items = [];
    for (let i = 0; i < S.box.length; i++) if (S.box[i]) { const [x, y] = this.cellXY(i); items.push([y, () => this.crate(g, x, y, C - 4)]); }
    for (const p of S.p) if (!p.gone) items.push([p.y, () => {
      if (!p.al) { if (S.time - p.dt < 0.8) HR.ST.burst(g, p.x, p.y, (S.time - p.dt) / 0.8, G.rgb(p), 12, 60); return; }
      G.fig(g, p, p.x, p.y - 14, 24, { look: [p.lx, p.ly] });
      if (p.sh) { g.strokeStyle = `rgba(74,214,255,${0.6 + 0.3 * Math.sin(S.time * 8)})`; g.lineWidth = 5; g.beginPath(); g.arc(p.x, p.y - 14, 36, 0, 7); g.stroke(); }
    }]);
    items.sort((a, b) => a[0] - b[0]).forEach(it => it[1]());
    for (const e of S.fx) { const [x, y] = this.cellXY(e.c); HR.ST.burst(g, x, y + C * 0.3, (S.time - e.t) / 0.5, '#e8d2a0', 10, 70); }
    // fallende Kisten über allem
    for (const f of S.fall) { const [x, y] = this.cellXY(f.c), k = f.t / this.FALL; if (k < 0.75) this.crate(g, x, y - k * 700, (C - 4) * (1 + k * 0.4)); }
  },
});
