// C5 Schneeballschlacht: Schnee aufheben, werfen, Treffer zählen
'use strict';

HR.AR.define({
  code: 'C5', name: 'Schneeballschlacht', short: 'Triff die anderen!',
  desc: 'Eine verschneite Lichtung mit Bäumen und Schneemännern als Deckung. Mit WERFEN wirfst du einen Schneeball in Blickrichtung. Hast du keinen mehr, formst du mit WERFEN neue (kurz stehen bleiben). Wer getroffen wird, ist kurz eingefroren.',
  goal: 'Nach 90 Sekunden gewinnt, wer am meisten getroffen hat.',
  touch: 'Steuerkreuz laufen und zielen, rechts WERFEN', keys: 'Pfeiltasten laufen und zielen, Leertaste werfen',
  btns: [['act', 'WERFEN']],
  duration: 90, PR: 24, MAXA: 3, bgTop: '#9fc3e8', bgBot: '#5a7fa8',

  init(players, rnd) {
    const cover = [];
    for (let k = 0; k < 9; k++) {
      let x, y, ok;
      do { x = rnd.uniform(220, 1380); y = rnd.uniform(200, 820); ok = cover.every(c => Math.hypot(c[0] - x, c[1] - y) > 190) && Math.hypot(x - 800, y - 500) > 120; } while (!ok);
      cover.push([Math.round(x), Math.round(y), rnd.random() < 0.5 ? 1 : 0]);
    }
    const n = players.length;
    return {
      cover, b: [], bid: 1, fx: [],
      p: players.map((pl, i) => { const a = i / n * 6.283; return { id: pl.id, c: pl.c, x: 800 + Math.cos(a) * 560, y: 510 + Math.sin(a) * 330, am: this.MAXA, sc: 0, fz: 0, iv: 0, mk: 0, cd: 0, lx: -Math.cos(a), ly: -Math.sin(a) }; }),
    };
  },

  block(S, x, y, r) { for (const [cx, cy, k] of S.cover) if (Math.hypot(x - cx, y - cy) < (k ? 38 : 46) + r) return [cx, cy, k]; return null; },

  step(S, inp, dt, G) {
    for (const p of S.p) {
      if (p.gone) continue;
      if (p.cd > 0) p.cd -= dt;
      if (p.iv > 0) p.iv -= dt;
      if (p.fz > 0) { p.fz -= dt; continue; }
      const i = inp[p.id], [dx, dy] = HR.ST.dir(i);
      if (p.mk > 0) { p.mk -= dt; if (p.mk <= 0) { p.am = this.MAXA; G.sfx('select', p.id); } continue; }
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      const nx = p.x + dx * 290 * dt, ny = p.y + dy * 290 * dt;
      if (!this.block(S, nx, p.y, this.PR)) p.x = nx;
      if (!this.block(S, p.x, ny, this.PR)) p.y = ny;
      p.x = U.clamp(p.x, 90, 1510); p.y = U.clamp(p.y, 110, 900);
      if (i.pa && p.cd <= 0) {
        if (p.am > 0) { p.am--; p.cd = 0.35; S.b.push({ i: S.bid++, o: p.id, x: p.x + p.lx * 30, y: p.y - 10 + p.ly * 30, vx: p.lx * 950, vy: p.ly * 950, life: 0.75 }); G.sfx('blip', p.id); }
        else { p.mk = 0.7; }
      }
    }
    HR.ST.separate(S.p.filter(p => !p.gone), this.PR);
    for (const b of S.b) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (this.block(S, b.x, b.y + 10, 6) || b.x < 70 || b.x > 1530 || b.y < 90 || b.y > 930) { b.life = 0; S.fx.push([Math.round(b.x), Math.round(b.y), S.time]); continue; }
      for (const p of S.p) {
        if (p.gone || p.id === b.o || p.iv > 0 || p.fz > 0) continue;
        if (Math.hypot(p.x - b.x, p.y - 10 - b.y) < this.PR + 10) {
          b.life = 0; p.fz = 1.2; p.iv = 2.2; p.mk = 0;
          const o = S.p.find(q => q.id === b.o); if (o) o.sc++;
          S.fx.push([Math.round(b.x), Math.round(b.y), S.time]); G.sfx('bump'); G.sfx('lap', b.o);
          break;
        }
      }
    }
    S.b = S.b.filter(b => b.life > 0);
    S.fx = S.fx.filter(f => S.time - f[2] < 0.4);
  },

  over: () => false,
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.sc, txt: p.sc + ' Treffer' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.sc + ' · ' + '●'.repeat(p.am),
  spot: (S, p) => [p.x, p.y],

  pack(S) { return { t: +S.time.toFixed(3), b: S.b.map(b => ({ i: b.i, x: Math.round(b.x), y: Math.round(b.y) })), fx: S.fx.map(f => [f[0], f[1], +f[2].toFixed(2)]),
    p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), am: p.am, sc: p.sc, fz: p.fz > 0 ? 1 : 0, iv: p.iv > 0 ? 1 : 0, mk: p.mk > 0 ? 1 : 0, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.b = d.b; S.fx = d.fx;
    d.p.forEach((q, i) => { const p = S.p[i]; Object.assign(p, { x: q.x, y: q.y, am: q.am, sc: q.sc, fz: q.fz, iv: q.iv, mk: q.mk, lx: q.lx, ly: q.ly, gone: q.g }); });
  },

  draw(g, S, G) {
    G.world(g);
    const ST = HR.ST;
    ST.floor(g, 60, 80, 1480, 860, ST.ICE, null, 80);
    ST.frame(g, 60, 80, 1480, 860, ST.ICE, 5, 80);
    // Schnee-Glitzer
    for (let k = 0; k < 70; k++) { const tw = Math.sin(S.time * 3 + k * 1.7) > 0.6; g.fillStyle = tw ? 'rgba(255,255,255,.9)' : 'rgba(232,244,255,.3)'; const x = 90 + (k * 373) % 1420, y = 110 + (k * 211) % 800; g.fillRect(x, y, tw ? 3 : 2, tw ? 3 : 2); }
    const items = [];
    for (const [x, y, k] of S.cover) items.push([y, () => {
      ST.shadow(g, x, y + 30, 50, 14, 0.35);
      if (k) { // Tanne aus drei Dreieck-Konturen mit Schneespitze
        ST.pool(g, x, y - 20, 80, ST.GREEN, 0.12);
        ST.line(g, x, y + 8, x, y + 30); ST.thin(g, ST.DIM, 4, 0.9);
        for (let j = 2; j >= 0; j--) { const w = 60 - j * 14, yy = y + 10 - j * 32; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - 52); g.lineTo(x + w, yy); g.closePath(); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(43,255,136,.1)'; g.fill(); ST.glow(g, ST.GREEN, 2.5); }
        g.beginPath(); g.moveTo(x - 14, y - 70); g.lineTo(x, y - 86); g.lineTo(x + 14, y - 70); ST.glow(g, ST.ICE, 2.5);
      } else { // Schneemann als Kontur
        ST.pool(g, x, y - 20, 70, ST.ICE, 0.12);
        g.beginPath(); g.arc(x, y + 6, 40, 0, 7); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.ICE, 3);
        g.beginPath(); g.arc(x, y - 44, 28, 0, 7); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.ICE, 3);
        g.fillStyle = ST.ICE; g.fillRect(x - 12, y - 54, 6, 6); g.fillRect(x + 6, y - 54, 6, 6);
        g.beginPath(); g.moveTo(x, y - 42); g.lineTo(x + 22, y - 38); g.lineTo(x, y - 34); ST.glow(g, ST.ORANGE, 2);
        ST.line(g, x - 26, y - 18, x + 26, y - 18); ST.glow(g, ST.RED, 3);
        for (const by of [y - 4, y + 14]) { g.fillStyle = ST.ICE; g.fillRect(x - 2, by - 2, 4, 4); }
      }
    }]);
    for (const p of S.p) if (!p.gone) items.push([p.y, () => {
      G.fig(g, p, p.x, p.y - 12, this.PR, { look: [p.lx, p.ly], hat: 'beanie', stun: p.fz, alpha: p.iv && !p.fz && Math.floor(S.time * 12) % 2 ? 0.55 : 1 });
      if (p.fz) { ST.rrect(g, p.x - 36, p.y - 54, 72, 76, 14); g.fillStyle = 'rgba(24,231,255,.2)'; g.fill(); ST.glow(g, ST.CYAN, 2.5); ST.line(g, p.x - 24, p.y - 40, p.x - 10, p.y - 48); ST.thin(g, '#ffffff', 2, 0.8); }
      if (p.mk) { const r = 8 + (1 - Math.abs(Math.sin(S.time * 3))) * 6; ST.oct(g, p.x + p.lx * 30, p.y + 10, r); g.fillStyle = 'rgba(232,244,255,.5)'; g.fill(); ST.glow(g, ST.ICE, 2); }
    }]);
    items.sort((a, b) => a[0] - b[0]).forEach(it => it[1]());
    for (const b of S.b) { ST.shadow(g, b.x, b.y + 22, 9, 4, 0.5); ST.pool(g, b.x, b.y, 30, '#ffffff', 0.3); g.beginPath(); g.arc(b.x, b.y, 10, 0, 7); g.fillStyle = '#fff'; g.fill(); ST.glow(g, ST.ICE, 2); }
    for (const f of S.fx) ST.burst(g, f[0], f[1], (S.time - f[2]) / 0.4, ST.ICE, 10, 42);
  },
});
