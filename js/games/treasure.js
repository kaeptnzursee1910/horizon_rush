// C8 Schatzgräber: im Sand graben, Münzen und Truhen finden, Bomben meiden
'use strict';

HR.AR.define({
  code: 'C8', name: 'Schatzgräber', short: 'Grab nach Gold!',
  desc: 'Am Strand liegen viele Sandhügel. Stell dich auf einen Hügel und halte GRABEN gedrückt. Darunter liegen Münzen, manchmal eine Schatztruhe, manchmal aber auch eine Bombe. Die betäubt dich kurz, und ein paar deiner Münzen fliegen heraus. Hügel, unter denen Gold glitzert, sind etwas wertvoller.',
  goal: 'Nach 60 Sekunden gewinnt, wer die meisten Münzen hat.',
  touch: 'Steuerkreuz laufen, rechts GRABEN halten', keys: 'Pfeiltasten laufen, Leertaste halten zum Graben',
  btns: [['act', 'GRABEN']],
  duration: 60, PR: 24, DIG: 0.7, bgTop: '#4ab3d9', bgBot: '#1f6a9a',

  init(players, rnd) {
    const n = players.length, S = { m: [], mid: 1, drops: [], did: 1, fx: [], seed: rnd.randint(1, 1e9), k: 0 };
    for (let k = 0; k < 22; k++) this.addMound(S, rnd);
    S.p = players.map((pl, i) => { const a = i / n * 6.283; return { id: pl.id, c: pl.c, x: 800 + Math.cos(a) * 300, y: 520 + Math.sin(a) * 200, sc: 0, dg: 0, st: 0, lx: 0, ly: 1 }; });
    return S;
  },

  // Inhalt: 0 leer, 1-3 Münzen, 8 Truhe, -1 Bombe (nur der Gastgeber kennt ihn)
  addMound(S, rnd) {
    let x, y, ok, tries = 0;
    do { x = rnd.uniform(170, 1430); y = rnd.uniform(230, 860); ok = S.m.every(m => Math.hypot(m.x - x, m.y - y) > 110); } while (!ok && ++tries < 40);
    const r = rnd.random(), c = r < 0.12 ? 8 : r < 0.32 ? -1 : r < 0.42 ? 0 : 1 + Math.floor(rnd.random() * 3);
    S.m.push({ i: S.mid++, x: Math.round(x), y: Math.round(y), c, sp: c === 8 ? 1 : c >= 3 && rnd.random() < 0.5 ? 1 : 0, d: 0 });
  },

  step(S, inp, dt, G) {
    const rnd = U.rng((S.seed + (++S.k) * 131) >>> 0);
    for (const m of S.m) if (m.d > 0) { m.d += dt; }
    const before = S.m.length;
    S.m = S.m.filter(m => !(m.d > 4));
    for (let k = S.m.length; k < before; k++) this.addMound(S, rnd);
    for (const p of S.p) {
      if (p.gone) continue;
      const i = inp[p.id], [dx, dy] = HR.ST.dir(i);
      if (p.st > 0) { p.st -= dt; p.dg = 0; continue; }
      const m = S.m.find(m => !m.d && Math.hypot(m.x - p.x, m.y - p.y) < 50);
      if (i.a && m && !dx && !dy) {
        p.dg += dt;
        if (p.dg >= this.DIG) {
          p.dg = 0; m.d = 0.001;
          if (m.c < 0) {
            p.st = 1.4; G.sfx('crash'); S.fx.push([m.x, m.y, S.time, 1]);
            const lose = Math.min(p.sc, 3); p.sc -= lose;
            for (let k = 0; k < lose; k++) { const a = rnd.uniform(0, 6.28), r = rnd.uniform(70, 150); S.drops.push({ i: S.did++, x: U.clamp(m.x + Math.cos(a) * r, 120, 1480), y: U.clamp(m.y + Math.sin(a) * r, 180, 900), t: S.time }); }
          } else { p.sc += m.c; if (m.c) { G.sfx(m.c === 8 ? 'lap' : 'select', p.id); S.fx.push([m.x, m.y, S.time, 0, m.c]); } }
          m.r = m.c; // aufgedeckt
        }
      } else p.dg = 0;
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      p.x = U.clamp(p.x + dx * 300 * dt, 110, 1490); p.y = U.clamp(p.y + dy * 300 * dt, 190, 920);
      for (const d of S.drops) if (S.time - d.t > 0.5 && !d.got && Math.hypot(d.x - p.x, d.y - p.y) < 40) { d.got = 1; p.sc++; G.sfx('blip', p.id); }
    }
    S.drops = S.drops.filter(d => !d.got);
    S.fx = S.fx.filter(f => S.time - f[2] < 1);
    HR.ST.separate(S.p.filter(p => !p.gone), this.PR);
  },

  over: () => false,
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.sc, txt: p.sc + ' Münzen' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.sc + ' ●',
  spot: (S, p) => [p.x, p.y],

  pack(S) { return { t: +S.time.toFixed(3), m: S.m.map(m => ({ i: m.i, x: m.x, y: m.y, s: m.sp, d: m.d > 0 ? +m.d.toFixed(2) : 0, r: m.d > 0 ? m.r : null })), dr: S.drops.map(d => ({ i: d.i, x: Math.round(d.x), y: Math.round(d.y), t: +d.t.toFixed(2) })), fx: S.fx.map(f => [f[0], f[1], +f[2].toFixed(2), f[3], f[4] || 0]),
    p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), sc: p.sc, dg: +p.dg.toFixed(2), st: p.st > 0 ? 1 : 0, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.m = d.m.map(m => ({ i: m.i, x: m.x, y: m.y, sp: m.s, d: m.d, r: m.r })); S.drops = d.dr; S.fx = d.fx;
    d.p.forEach((q, i) => { const p = S.p[i]; Object.assign(p, { x: q.x, y: q.y, sc: q.sc, dg: q.dg, st: q.st, lx: q.lx, ly: q.ly, gone: q.g }); });
  },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST;
    // Meer, Strand
    g.fillStyle = '#05070f'; g.fillRect(-400, -200, 2400, 1400);
    g.setLineDash([26, 18]);
    for (let k = 0; k < 8; k++) { const y = 20 + k * 20 + Math.sin(S.time + k) * 4; g.lineDashOffset = -S.time * 25 * (k % 2 ? 1 : -1); g.beginPath(); for (let x = -400; x < 2000; x += 40) g.lineTo(x, y + Math.sin(x * 0.03 + S.time * 2 + k) * 5); ST.thin(g, ST.CYAN, 2, 0.2 + (k % 3) * 0.08); }
    g.setLineDash([]); g.lineDashOffset = 0;
    const shore = () => { g.beginPath(); g.moveTo(-400, 190); for (let x = -400; x <= 2000; x += 50) g.lineTo(x, 170 + Math.sin(x * 0.012 + S.time * 1.5) * 10); g.lineTo(2000, 1200); g.lineTo(-400, 1200); g.closePath(); };
    shore(); g.save(); g.clip(); ST.floor(g, -400, 150, 2400, 1050, ST.YELLOW, null, 80); g.restore();
    g.beginPath(); for (let x = -400; x <= 2000; x += 50) g.lineTo(x, 170 + Math.sin(x * 0.012 + S.time * 1.5) * 10); ST.glow(g, ST.CYAN, 3);
    g.beginPath(); for (let x = -400; x <= 2000; x += 50) g.lineTo(x, 186 + Math.sin(x * 0.012 + S.time * 1.5 - 0.6) * 10); ST.thin(g, ST.YELLOW, 1.5, 0.4);
    const items = [];
    for (const m of S.m) items.push([m.y, () => {
      if (m.d > 0) {
        g.beginPath(); g.ellipse(m.x, m.y + 6, 44, 18, 0, 0, 7); g.fillStyle = '#05040b'; g.fill(); ST.thin(g, ST.ORANGE, 2, 0.6);
        if (m.r === 8) { ST.pool(g, m.x, m.y, 70, ST.YELLOW, 0.35); ST.rrect(g, m.x - 22, m.y - 16, 44, 28, 6); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.ORANGE, 2.5); ST.line(g, m.x - 22, m.y - 5, m.x + 22, m.y - 5); ST.glow(g, ST.YELLOW, 2.5); }
        return;
      }
      ST.shadow(g, m.x, m.y + 14, 54, 10, 0.4);
      g.beginPath(); g.moveTo(m.x - 52, m.y + 10); g.lineTo(m.x - 40, m.y - 14); g.lineTo(m.x - 14, m.y - 28); g.lineTo(m.x + 14, m.y - 28); g.lineTo(m.x + 40, m.y - 14); g.lineTo(m.x + 52, m.y + 10); g.closePath();
      g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(255,226,61,.08)'; g.fill(); ST.glow(g, ST.YELLOW, 2.5, 0.85);
      g.beginPath(); g.moveTo(m.x - 30, m.y - 2); g.lineTo(m.x - 10, m.y - 14); g.lineTo(m.x + 10, m.y - 14); ST.thin(g, ST.YELLOW, 1.5, 0.45);
      if (m.sp && Math.sin(S.time * 5 + m.i) > 0.3) { const sx = m.x + Math.sin(m.i) * 24, sy = m.y - 12; g.beginPath(); g.moveTo(sx, sy - 10); g.lineTo(sx, sy + 10); g.moveTo(sx - 10, sy); g.lineTo(sx + 10, sy); ST.glow(g, '#ffffff', 2); }
    }]);
    for (const d of S.drops) items.push([d.y, () => { const k = U.clamp((S.time - d.t) / 0.5, 0, 1); ST.coin(g, d.x, d.y - 10 - Math.sin(k * Math.PI) * 60, 13, S.time); }]);
    for (const p of S.p) if (!p.gone) items.push([p.y, () => {
      const dig = p.dg > 0 ? Math.sin(S.time * 30) * 0.06 : 0;
      G.fig(g, p, p.x, p.y - 12, this.PR, { look: p.dg > 0 ? [0, 1] : [p.lx, p.ly], stun: p.st, squash: dig });
      if (p.dg > 0) { g.fillStyle = 'rgba(255,226,61,.15)'; g.fillRect(p.x - 30, p.y + 22, 60, 6); ST.line(g, p.x - 30, p.y + 25, p.x - 30 + 60 * p.dg / this.DIG, p.y + 25); ST.glow(g, ST.YELLOW, 4); }
    }]);
    items.sort((a, b) => a[0] - b[0]).forEach(it => it[1]());
    for (const f of S.fx) {
      const k = (S.time - f[2]);
      if (f[3]) ST.burst(g, f[0], f[1], k, ST.ORANGE, 14, 90);
      else { ST.coin(g, f[0], f[1] - 30 - k * 60, 16, S.time); ST.text(g, '+' + f[4], f[0] + 26, f[1] - 40 - k * 60, 28, ST.YELLOW); }
    }
  },
});
