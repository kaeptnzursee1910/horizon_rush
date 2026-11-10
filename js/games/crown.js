// C4 Kronenjagd: Wer die Krone trägt, sammelt Zeit. Mit einem Sprint-Stoß schnappt man sie sich.
// Der Träger kann nicht eingekeilt werden (er schiebt andere beiseite), nach einem Raub hat er Schutz und
// einen kurzen Tempo-Schub. Wer die Krone nicht hat, kann Edelsteine sammeln.
'use strict';

HR.AR.define({
  code: 'C4', name: 'Kronenjagd', short: 'Schnapp dir die Krone!',
  desc: 'Auf dem Schlosshof liegt eine Krone. Wer sie trägt, sammelt jede Sekunde einen Punkt und schiebt sich durch jedes Gedränge. Mit dem Sprint-Stoß rammst du dem Träger die Krone weg. Danach ist der neue Träger kurz geschützt und schneller. Wer keine Krone hat, sammelt Edelsteine: Jeder zählt 2 Punkte.',
  goal: 'Nach 60 Sekunden gewinnt, wer die meisten Punkte hat.',
  touch: 'Steuerkreuz laufen, rechts STOSS', keys: 'Pfeiltasten laufen, Leertaste Sprint-Stoß',
  btns: [['act', 'STOSS']],
  duration: 60, PR: 26, bgTop: '#5a3a6b', bgBot: '#22122e',
  POSTS: [[480, 330], [1120, 330], [480, 690], [1120, 690], [800, 220], [800, 800]],
  IMM: 1.8, BOOST: 1.4, GEMS: 3, GEM_PTS: 2,

  init(players, rnd) {
    const n = players.length;
    return {
      cr: -1, cx: 800, cy: 510, imm: 0, bo: 0, seed: rnd.randint(1, 1e9), k: 0, gm: [], gid: 1, gt: 1.5,
      p: players.map((pl, i) => { const a = i / n * 6.283; return { id: pl.id, c: pl.c, x: 800 + Math.cos(a) * 560, y: 510 + Math.sin(a) * 330, vx: 0, vy: 0, ds: 0, cd: 0, sc: 0, st: 0, lx: 0, ly: 1 }; }),
    };
  },

  step(S, inp, dt, G) {
    const holder = S.p.find(p => p.id === S.cr);
    if (S.imm > 0) S.imm -= dt;
    if (S.bo > 0) S.bo -= dt;
    // Edelsteine nachlegen (nicht in Säulen, nicht direkt beim Träger)
    S.gt -= dt;
    if (S.gt <= 0 && S.gm.length < this.GEMS) {
      S.gt = 2.2;
      const rnd = U.rng((S.seed + (++S.k) * 613) >>> 0);
      for (let t = 0; t < 12; t++) {
        const x = Math.round(rnd.uniform(180, 1420)), y = Math.round(rnd.uniform(190, 830));
        if (this.POSTS.some(([qx, qy]) => Math.hypot(x - qx, y - qy) < 90)) continue;
        if (holder && Math.hypot(x - holder.x, y - holder.y) < 220) continue;
        S.gm.push({ i: S.gid++, x, y }); break;
      }
    }
    for (const p of S.p) {
      if (p.gone) continue;
      const i = inp[p.id], [dx, dy] = HR.ST.dir(i);
      if (p.cd > 0) p.cd -= dt;
      if (p.st > 0) { p.st -= dt; p.vx *= 0.9; p.vy *= 0.9; }
      else if (p.ds > 0) p.ds -= dt;
      else {
        const sp = p === holder ? (S.bo > 0 ? 360 : 270) : 300;
        p.vx += (dx * sp - p.vx) * Math.min(1, dt * 10); p.vy += (dy * sp - p.vy) * Math.min(1, dt * 10);
        if (i.pa && p.cd <= 0) { const lx = dx || dy ? dx : p.lx, ly = dx || dy ? dy : p.ly; p.vx = lx * 820; p.vy = ly * 820; p.ds = 0.2; p.cd = 1.1; G.sfx('blip', p.id); }
      }
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      // Hof-Mauer und Säulen
      p.x = U.clamp(p.x, 120 + this.PR, 1480 - this.PR); p.y = U.clamp(p.y, 130 + this.PR, 890 - this.PR);
      for (const [qx, qy] of this.POSTS) { const ex = p.x - qx, ey = p.y - qy, d = Math.hypot(ex, ey); if (d < 44 + this.PR) { p.x = qx + ex / d * (44 + this.PR); p.y = qy + ey / d * (44 + this.PR); } }
      if (p === holder) p.sc += dt;
      else if (p.st <= 0) for (let k = S.gm.length - 1; k >= 0; k--) {
        const e = S.gm[k];
        if (Math.hypot(p.x - e.x, p.y - e.y) < this.PR + 18) { S.gm.splice(k, 1); p.sc += this.GEM_PTS; G.sfx('blip', p.id); }
      }
    }
    // Stoß gegen den Träger
    if (holder && S.imm <= 0) {
      for (const p of S.p) {
        if (p === holder || p.gone || p.ds <= 0) continue;
        if (Math.hypot(p.x - holder.x, p.y - holder.y) < this.PR * 2.3) {
          S.cr = p.id; S.imm = this.IMM; S.bo = this.BOOST; holder.st = 0.6; holder.vx = p.vx * 0.6; holder.vy = p.vy * 0.6; p.ds = 0;
          G.sfx('bump'); G.sfx('select', p.id); break;
        }
      }
    }
    // Krone liegt herum: wer sie berührt, hat sie
    if (S.cr < 0) {
      for (const p of S.p) if (!p.gone && p.st <= 0 && Math.hypot(p.x - S.cx, p.y - S.cy) < this.PR + 22) { S.cr = p.id; S.imm = 0.8; G.sfx('select'); break; }
    } else if (holder && holder.gone) { S.cr = -1; S.cx = holder.x; S.cy = holder.y; }
    // Gedränge: der Träger wird nicht eingekeilt, er schiebt die anderen beiseite
    const h0 = S.p.find(p => p.id === S.cr && !p.gone);
    HR.ST.separate(S.p.filter(p => !p.gone && p !== h0), this.PR);
    if (h0) for (const q of S.p) {
      if (q === h0 || q.gone) continue;
      const ex = q.x - h0.x, ey = q.y - h0.y, d = Math.hypot(ex, ey) || 1;
      if (d < this.PR * 2) { q.x = h0.x + ex / d * this.PR * 2; q.y = h0.y + ey / d * this.PR * 2; q.x = U.clamp(q.x, 120 + this.PR, 1480 - this.PR); q.y = U.clamp(q.y, 130 + this.PR, 890 - this.PR); }
    }
    if (S.cr >= 0) { const h = S.p.find(p => p.id === S.cr); S.cx = h.x; S.cy = h.y; }
  },

  over: () => false,
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: Math.round(p.sc * 10), txt: p.sc.toFixed(1) + ' Punkte' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => Math.floor(p.sc) + ' P',
  spot: (S, p) => [p.x, p.y],

  pack(S) { return { t: +S.time.toFixed(3), cr: S.cr, cx: Math.round(S.cx), cy: Math.round(S.cy), im: +S.imm.toFixed(2), bo: +S.bo.toFixed(2), gm: S.gm.map(e => [e.i, e.x, e.y]), p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), sc: +p.sc.toFixed(2), ds: p.ds > 0 ? 1 : 0, st: p.st > 0 ? 1 : 0, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.cr = d.cr; S.cx = d.cx; S.cy = d.cy; S.imm = d.im; S.bo = d.bo || 0; S.gm = (d.gm || []).map(([i, x, y]) => ({ i, x, y }));
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.sc = q.sc; p.ds = q.ds; p.st = q.st; p.lx = q.lx; p.ly = q.ly; p.gone = q.g; });
  },

  draw(g, S, G) {
    G.world(g);
    // Schlosshof: Mauer, Steinplatten, roter Teppich
    HR.ST.rrect(g, 90, 100, 1420, 820, 30); HR.ST.fill(g, '#8d7aa8', 6);
    HR.ST.floor(g, 120, 130, 1360, 760, '#d9cbe8', '#cdbedf', 85);
    g.strokeStyle = HR.ST.INK; g.lineWidth = 5; g.strokeRect(120, 130, 1360, 760);
    g.fillStyle = '#c8414f'; g.fillRect(740, 130, 120, 760); g.fillStyle = '#e0b84a'; g.fillRect(740, 130, 8, 760); g.fillRect(852, 130, 8, 760);
    for (let k = 0; k < 14; k++) { HR.ST.rrect(g, 110 + k * 100, 84, 60, 34, 6); HR.ST.fill(g, '#9d8ab8', 4); }
    for (const [x, y] of this.POSTS) {
      HR.ST.shadow(g, x, y + 30, 50, 16);
      g.beginPath(); g.arc(x, y, 44, 0, 7); HR.ST.fill(g, '#b9a6d4', 5);
      g.beginPath(); g.arc(x, y - 6, 30, 0, 7); HR.ST.fill(g, '#d6c8ea', 4);
    }
    for (const e of S.gm) { HR.ST.shadow(g, e.x, e.y + 14, 16, 6); HR.ST.gem(g, e.x, e.y - 4 + Math.sin(S.time * 4 + e.i) * 4, 17, ['#ff6ad5', '#4ad6ff', '#6be36b'][e.i % 3]); }
    if (S.cr < 0) {
      const b = Math.sin(S.time * 4) * 6;
      g.save(); g.translate(S.cx, S.cy - 10 + b); HR.ST.hat(g, 'crown', 46, S.time); g.restore();
      g.fillStyle = 'rgba(255,220,80,.25)'; g.beginPath(); g.arc(S.cx, S.cy, 40 + Math.sin(S.time * 6) * 6, 0, 7); g.fill();
    }
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) {
      if (p.ds) { g.strokeStyle = G.rgb(p, 0.5); g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x - p.lx * 60, p.y - p.ly * 60); g.lineTo(p.x, p.y); g.stroke(); }
      const hold = p.id === S.cr;
      if (hold) { g.fillStyle = `rgba(255,220,80,${0.25 + 0.15 * Math.sin(S.time * 8)})`; g.beginPath(); g.arc(p.x, p.y, 48, 0, 7); g.fill(); }
      G.fig(g, p, p.x, p.y - 12, this.PR, { look: [p.lx, p.ly], hat: hold ? 'crown' : null, stun: p.st > 0, alpha: hold && S.imm > 0 && Math.floor(S.time * 12) % 2 ? 0.6 : 1 });
    }
  },
});
