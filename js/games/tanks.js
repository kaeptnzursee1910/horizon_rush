// B2 Panzer-Arena: Panzer in einem Labyrinth, Geschosse prallen an Wänden ab
'use strict';

HR.AR.define({
  code: 'B2', name: 'Panzer-Arena', short: 'Triff die anderen Panzer!',
  desc: 'Alle fahren mit einem kleinen Panzer durch ein Labyrinth. Die Geschosse prallen mehrmals von den Wänden ab, auch auf dich selbst. Wer getroffen wird, ist 3 Sekunden weg und taucht dann an einer freien Stelle wieder auf.',
  goal: 'In 90 Sekunden die meisten Treffer landen. Jeder Treffer gibt einen Punkt.',
  touch: 'links ◀ ▶ drehen, rechts GAS (vorwärts), ZURÜCK und FEUER', keys: '← → drehen, ↑ vorwärts, ↓ rückwärts, Leertaste feuern',
  padL: [['left', '◀'], ['right', '▶']], padR: [['act', 'FEUER'], ['gas', 'GAS'], ['brake', 'ZURÜCK']],
  duration: 90, TR: 24,

  init(players, rnd) {
    // Labyrinth: Raster 8 × 5, zufällige Wandstücke auf den Rasterlinien
    const walls = [[0, 0, 1600, 16], [0, 984, 1600, 16], [0, 0, 16, 1000], [1584, 0, 16, 1000]];
    const cw = 200, ch = 200;
    for (let gx = 1; gx < 8; gx++) for (let gy = 0; gy < 5; gy++) if (rnd.random() < 0.3) walls.push([gx * cw - 8, gy * ch + 30, 16, ch - 60]);
    for (let gy = 1; gy < 5; gy++) for (let gx = 0; gx < 8; gx++) if (rnd.random() < 0.3) walls.push([gx * cw + 30, gy * ch - 8, cw - 60, 16]);
    const spawns = [];
    for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 5; gy++) spawns.push([gx * cw + cw / 2, gy * ch + ch / 2]);
    const corners = [[100, 100], [1500, 900], [1500, 100], [100, 900], [700, 100], [900, 900], [100, 500], [1500, 500]];
    const p = players.map((pl, i) => ({ id: pl.id, c: pl.c, x: corners[i][0], y: corners[i][1], a: Math.atan2(500 - corners[i][1], 800 - corners[i][0]), rt: 0, inv: 1, s: 0, cd: 0, al: 1 }));
    return { p, walls, spawns, b: [], bid: 1, boom: [] };
  },

  inWall(S, x, y, r) {
    for (const w of S.walls) if (x + r > w[0] && x - r < w[0] + w[2] && y + r > w[1] && y - r < w[1] + w[3]) return w;
    return null;
  },

  step(S, inp, dt, G) {
    const TR = this.TR;
    for (const p of S.p) {
      if (p.gone) continue;
      if (p.cd > 0) p.cd -= dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.rt > 0) { p.rt -= dt; if (p.rt <= 0) this.respawn(S, p); continue; }
      const i = inp[p.id];
      if (i.l) p.a -= 2.7 * dt;
      if (i.r) p.a += 2.7 * dt;
      const v = i.u ? 175 : i.d ? -110 : 0;
      if (v) {
        const nx = p.x + Math.cos(p.a) * v * dt, ny = p.y + Math.sin(p.a) * v * dt;
        if (!this.inWall(S, nx, p.y, TR)) p.x = nx;
        if (!this.inWall(S, p.x, ny, TR)) p.y = ny;
      }
      if (i.pa && p.cd <= 0 && S.b.filter(b => b.o === p.id).length < 4) {
        const bx = p.x + Math.cos(p.a) * (TR + 8), by = p.y + Math.sin(p.a) * (TR + 8);
        if (!this.inWall(S, bx, by, 4)) {
          S.b.push({ i: S.bid++, x: bx, y: by, vx: Math.cos(p.a) * 430, vy: Math.sin(p.a) * 430, o: p.id, life: 2.8, age: 0, n: 0 });
          p.cd = 0.35; G.sfx('blip');
        }
      }
    }
    // Panzer schieben sich gegenseitig weg
    for (let i = 0; i < S.p.length; i++) for (let j = i + 1; j < S.p.length; j++) {
      const a = S.p[i], b = S.p[j];
      if (a.rt > 0 || b.rt > 0 || a.gone || b.gone) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < TR * 2) {
        const push = (TR * 2 - d) / 2, ux = dx / d, uy = dy / d;
        if (!this.inWall(S, a.x - ux * push, a.y - uy * push, TR)) { a.x -= ux * push; a.y -= uy * push; }
        if (!this.inWall(S, b.x + ux * push, b.y + uy * push, TR)) { b.x += ux * push; b.y += uy * push; }
      }
    }
    // Geschosse
    for (const b of S.b) {
      b.life -= dt; b.age += dt;
      for (let k = 0; k < 2; k++) {
        b.x += b.vx * dt / 2;
        if (this.inWall(S, b.x, b.y, 4)) { b.x -= b.vx * dt / 2; b.vx = -b.vx; b.n++; }
        b.y += b.vy * dt / 2;
        if (this.inWall(S, b.x, b.y, 4)) { b.y -= b.vy * dt / 2; b.vy = -b.vy; b.n++; }
      }
      for (const p of S.p) {
        if (p.rt > 0 || p.gone || p.inv > 0 || b.life <= 0) continue;
        if (p.id === b.o && b.age < 0.25) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < TR + 4) {
          b.life = 0;
          p.rt = 3; p.al = 0;
          const shooter = S.p.find(q => q.id === b.o);
          if (shooter && shooter !== p) shooter.s += 1;
          S.boom.push({ i: S.bid++, x: p.x, y: p.y, t: 0.6 });
          G.sfx('crash');
        }
      }
    }
    S.b = S.b.filter(b => b.life > 0 && b.n <= 5);
    for (const e of S.boom) e.t -= dt;
    S.boom = S.boom.filter(e => e.t > 0);
  },

  respawn(S, p) {
    let best = S.spawns[0], bd = -1;
    for (const sp of S.spawns) {
      if (this.inWall(S, sp[0], sp[1], this.TR + 4)) continue;
      let d = 1e9;
      for (const o of S.p) if (o !== p && o.rt <= 0 && !o.gone) d = Math.min(d, Math.hypot(o.x - sp[0], o.y - sp[1]));
      d += Math.random() * 120;
      if (d > bd) { bd = d; best = sp; }
    }
    p.x = best[0]; p.y = best[1]; p.inv = 1.5; p.al = 1; p.rt = 0;
  },

  over: () => false,
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.s, txt: p.s + (p.s === 1 ? ' Treffer' : ' Treffer') })).sort((a, b) => b.s - a.s); },
  status: (S, p) => String(p.s),

  pack(S) {
    return { t: +S.time.toFixed(3), p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(3), r: p.rt > 0 ? +p.rt.toFixed(1) : 0, v: p.inv > 0 ? 1 : 0, s: p.s, g: p.gone ? 1 : 0 })),
      b: S.b.map(b => ({ i: b.i, x: Math.round(b.x), y: Math.round(b.y) })), e: S.boom.map(e => ({ i: e.i, x: e.x, y: e.y, k: +e.t.toFixed(2) })) };
  },
  unpack(S, d) {
    S.time = d.t;
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.a = q.a; p.rt = q.r; p.inv = q.v; p.s = q.s; p.gone = q.g; });
    S.b = d.b; S.boom = d.e.map(e => ({ x: e.x, y: e.y, t: e.k }));
  },

  draw(g, S, G) {
    G.world(g);
    g.fillStyle = '#2d3a26'; g.fillRect(0, 0, 1600, 1000);
    g.fillStyle = 'rgba(255,255,255,.035)';
    for (let x = 0; x < 1600; x += 100) for (let y = (x / 100) % 2 * 100; y < 1000; y += 200) g.fillRect(x, y, 100, 100);
    for (const w of S.walls) {
      g.fillStyle = '#8a8f99'; g.fillRect(w[0], w[1], w[2], w[3]);
      g.fillStyle = '#b9bec8'; g.fillRect(w[0], w[1], w[2], Math.min(5, w[3]));
    }
    for (const b of S.b) { g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, 5, 0, 7); g.fill(); }
    for (const p of S.p) {
      if (p.gone || p.rt > 0) continue;
      if (p.inv > 0 && Math.floor(S.time * 10) % 2) g.globalAlpha = 0.45;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      g.fillStyle = '#222'; g.fillRect(-24, -22, 48, 10); g.fillRect(-24, 12, 48, 10);
      g.fillStyle = G.rgb(p); g.fillRect(-20, -14, 40, 28);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-20, 6, 40, 8);
      g.fillStyle = '#333'; g.fillRect(4, -4, 28, 8);
      g.fillStyle = G.rgb(p); g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke();
      g.restore();
      g.globalAlpha = 1;
      if (p.id === G.me) { G.meMark(g, p.x, p.y, 36, S.time); G.label(g, 'DU', p.x, p.y - 38, 22); }
    }
    for (const e of S.boom) {
      const k = 1 - e.t / 0.6;
      g.fillStyle = `rgba(255,${Math.round(200 - 150 * k)},40,${1 - k})`; g.beginPath(); g.arc(e.x, e.y, 20 + 50 * k, 0, 7); g.fill();
    }
    const me = S.p.find(p => p.id === G.me);
    if (me && me.rt > 0) G.label(g, 'Gleich wieder da … ' + Math.ceil(me.rt), 800, 520, 44, '#fff');
  },
});
