// C12 Münzsturm: Seitenansicht, herabregnende Münzen und Edelsteine fangen, Bomben meiden
'use strict';

HR.AR.define({
  code: 'C12', name: 'Münzsturm', short: 'Fang so viel du kannst!',
  desc: 'Von oben regnen Münzen und Edelsteine auf eine Landschaft mit schwebenden Plattformen. Lauf und spring, um möglichst viel zu fangen. Münzen zählen 1, Edelsteine 5. Vorsicht vor Bomben: Wer nah an einer Explosion steht, verliert ein paar Münzen, die andere aufsammeln können.',
  goal: 'Nach 60 Sekunden gewinnt, wer am meisten gesammelt hat.',
  touch: 'Steuerkreuz ◀ ▶ laufen, rechts SPRUNG', keys: '← → laufen, Leertaste oder ↑ springen',
  btns: [['act', 'SPRUNG']],
  duration: 60, GY: 900, GRAV: 2100, bgTop: '#7cc8ff', bgBot: '#d8f0ff',
  PLAT: [[160, 700, 300], [1140, 700, 300], [640, 590, 320], [330, 450, 230], [1040, 450, 230], [690, 310, 220]],

  init(players, rnd) {
    const n = players.length;
    return { it: [], iid: 1, nx: 0.3, seed: rnd.randint(1, 1e9), k: 0, fx: [],
      p: players.map((pl, i) => ({ id: pl.id, c: pl.c, x: 200 + i * 1200 / Math.max(1, n - 1), y: this.GY, vx: 0, vy: 0, og: 1, sc: 0, st: 0, f: 1, jt: 0 })) };
  },

  // Boden unter einem Punkt, der von oben kommt (Plattformen nur von oben begehbar)
  land(x, y0, y1) {
    let best = null;
    for (const [px, py, pw] of this.PLAT) if (x > px && x < px + pw && y0 <= py && y1 >= py && (best == null || py < best)) best = py;
    if (y1 >= this.GY && (best == null || this.GY < best)) best = this.GY;
    return best;
  },

  step(S, inp, dt, G) {
    const rnd = U.rng((S.seed + (++S.k) * 613) >>> 0);
    S.nx -= dt;
    if (S.nx <= 0) {
      S.nx = Math.max(0.16, 0.5 - S.time * 0.004);
      const r = rnd.random(), k = r < 0.16 ? 'b' : r < 0.26 ? 'g' : 'c';
      S.it.push({ i: S.iid++, x: Math.round(rnd.uniform(80, 1520)), y: -40, vy: rnd.uniform(160, 300), vx: 0, k, lt: 0 });
    }
    for (const p of S.p) {
      if (p.gone) continue;
      const i = inp[p.id];
      if (p.st > 0) p.st -= dt;
      const dir = p.st > 0 ? 0 : (i.r ? 1 : 0) - (i.l ? 1 : 0);
      p.vx += (dir * 360 - p.vx) * Math.min(1, dt * (p.og ? 14 : 5));
      if (dir) p.f = dir;
      if (p.og && p.st <= 0 && (i.pa || i.pu || (i.a && p.jt <= 0))) { p.vy = -1060; p.og = 0; p.jt = 0.25; G.sfx('blip', p.id); }
      if (p.jt > 0) p.jt -= dt;
      p.vy += this.GRAV * dt;
      const y0 = p.y; p.y += p.vy * dt; p.x = U.clamp(p.x + p.vx * dt, 40, 1560);
      // nach unten drücken = durch Plattform fallen
      const l = p.vy >= 0 && !(i.d && p.y < this.GY - 5) ? this.land(p.x, y0, p.y) : (p.y >= this.GY ? this.GY : null);
      if (l != null) { p.y = l; p.vy = 0; p.og = 1; } else p.og = 0;
    }
    for (const it of S.it) {
      if (it.lt > 0) { it.lt += dt; continue; }
      const y0 = it.y; it.vy = Math.min(it.vy + 600 * dt, 700); it.y += it.vy * dt; it.x = U.clamp(it.x + it.vx * dt, 30, 1570);
      const l = this.land(it.x, y0, it.y);
      if (l != null) { it.y = l - 16; it.vx = 0; it.lt = 0.001; if (it.k === 'b') this.boom(S, it, G, rnd); }
    }
    for (const p of S.p) {
      if (p.gone) continue;
      for (const it of S.it) {
        if (it.dead || Math.abs(it.x - p.x) > 40 || Math.abs(it.y - (p.y - 30)) > 46) continue;
        if (it.k === 'b') { this.boom(S, it, G, rnd); continue; }
        if (it.fresh && S.time - it.fresh < 0.5) continue; // gerade erst herausgeflogen
        it.dead = 1; p.sc += it.k === 'g' ? 5 : 1; G.sfx(it.k === 'g' ? 'lap' : 'blip', p.id);
      }
    }
    S.it = S.it.filter(it => !it.dead && !(it.lt > 3.5) && it.y < 1100);
    S.fx = S.fx.filter(f => S.time - f[2] < 0.6);
  },

  boom(S, it, G, rnd) {
    if (it.dead) return;
    it.dead = 1; G.sfx('crash'); S.fx.push([Math.round(it.x), Math.round(it.y), S.time]);
    for (const p of S.p) {
      if (p.gone || Math.hypot(p.x - it.x, p.y - 30 - it.y) > 120) continue;
      p.st = 0.9; p.vy = -500; p.og = 0; p.vx = (p.x >= it.x ? 1 : -1) * 400;
      const lose = Math.min(p.sc, 3); p.sc -= lose;
      for (let k = 0; k < lose; k++) S.it.push({ i: S.iid++, x: p.x, y: p.y - 60, vy: -rnd.uniform(400, 650), vx: rnd.uniform(-260, 260), k: 'c', lt: 0, fresh: S.time });
    }
  },

  over: () => false,
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.sc, txt: p.sc + ' gesammelt' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.sc + ' ●',
  spot: (S, p) => [p.x, p.y - 30],

  pack(S) { return { t: +S.time.toFixed(3), it: S.it.map(it => ({ i: it.i, x: Math.round(it.x), y: Math.round(it.y), k: it.k, l: it.lt > 0 ? +it.lt.toFixed(2) : 0 })), fx: S.fx.map(f => [f[0], f[1], +f[2].toFixed(2)]),
    p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), sc: p.sc, st: p.st > 0 ? 1 : 0, f: p.f, og: p.og, g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.it = d.it.map(q => ({ i: q.i, x: q.x, y: q.y, k: q.k, lt: q.l })); S.fx = d.fx;
    d.p.forEach((q, i) => Object.assign(S.p[i], { x: q.x, y: q.y, sc: q.sc, st: q.st, f: q.f, og: q.og, gone: q.g }));
  },

  draw(g, S, G) {
    G.world(g);
    const sky = g.createLinearGradient(0, 0, 0, 1000); sky.addColorStop(0, '#6ec0ff'); sky.addColorStop(1, '#d6efff');
    g.fillStyle = sky; g.fillRect(0, 0, 1600, 1000);
    for (let k = 0; k < 6; k++) { const x = ((k * 330 + S.time * 12) % 1900) - 150, y = 90 + (k % 3) * 70; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x, y, 90, 26, 0, 0, 7); g.ellipse(x + 40, y - 18, 50, 26, 0, 0, 7); g.fill(); }
    g.fillStyle = '#9ad08a'; g.beginPath(); g.moveTo(0, 820); for (let x = 0; x <= 1600; x += 80) g.lineTo(x, 780 + Math.sin(x * 0.006) * 50); g.lineTo(1600, 1000); g.lineTo(0, 1000); g.fill();
    // Boden
    g.beginPath(); g.rect(-20, this.GY, 1640, 140); HR.ST.fill(g, '#a8683a', 6);
    g.beginPath(); g.rect(-20, this.GY, 1640, 26); HR.ST.fill(g, '#6cc04a', 5);
    for (const [x, y, w] of this.PLAT) {
      HR.ST.rrect(g, x, y, w, 40, 14); HR.ST.fill(g, '#a8683a', 5);
      HR.ST.rrect(g, x - 6, y - 6, w + 12, 22, 11); HR.ST.fill(g, '#6cc04a', 5);
    }
    for (const it of S.it) {
      const fade = it.lt > 2.5 ? (Math.floor(S.time * 10) % 2 ? 0.3 : 1) : 1;
      g.globalAlpha = fade;
      if (it.k === 'c') HR.ST.coin(g, it.x, it.y, 15, S.time + it.i);
      else if (it.k === 'g') HR.ST.gem(g, it.x, it.y, 19, '#ff6ad5');
      else HR.ST.bomb(g, it.x, it.y, 20, S.time);
      g.globalAlpha = 1;
    }
    for (const p of S.p) if (!p.gone) G.fig(g, p, p.x, p.y - 30, 28, { look: [p.f * 0.8, 0], stun: p.st, squash: p.og ? 0 : -0.08 });
    for (const f of S.fx) HR.ST.burst(g, f[0], f[1], (S.time - f[2]) / 0.6, '#ff7a1a', 14, 110);
  },
});
