// C11 Im Dunkeln: dunkles Labyrinth, jeder sieht nur, was seine Laterne beleuchtet. Ein Geist jagt alle.
'use strict';

HR.AR.define({
  code: 'C11', name: 'Im Dunkeln', short: 'Sammle Edelsteine, meide den Geist!',
  desc: 'Ein dunkles Labyrinth. Du siehst nur, was deine Laterne beleuchtet. Überall liegen Edelsteine. Ein Geist wandert umher und jagt den nächsten Spieler. Wer erwischt wird, verliert die Hälfte seiner Steine, die dann verstreut herumliegen.',
  goal: 'Nach 90 Sekunden gewinnt, wer die meisten Edelsteine hat.',
  touch: 'Steuerkreuz laufen', keys: 'Pfeiltasten oder WASD laufen',
  btns: [],
  duration: 90, CW: 16, CH: 10, CS: 90, X0: 80, Y0: 60, PR: 18, GEMS: 14, bgTop: '#0c0a1a', bgBot: '#050410',

  init(players, rnd) {
    const CW = this.CW, CH = this.CH, n = CW * CH;
    // Labyrinth mit Rückverfolgung, danach ein paar Wände mehr entfernen (Schleifen)
    const R = new Array(n).fill(1), D = new Array(n).fill(1), seen = new Array(n).fill(0), st = [0]; seen[0] = 1;
    while (st.length) {
      const c = st[st.length - 1], x = c % CW, y = Math.floor(c / CW), nb = [];
      if (x > 0 && !seen[c - 1]) nb.push(c - 1); if (x < CW - 1 && !seen[c + 1]) nb.push(c + 1);
      if (y > 0 && !seen[c - CW]) nb.push(c - CW); if (y < CH - 1 && !seen[c + CW]) nb.push(c + CW);
      if (!nb.length) { st.pop(); continue; }
      const m = nb[Math.floor(rnd.random() * nb.length)];
      if (m === c + 1) R[c] = 0; else if (m === c - 1) R[m] = 0; else if (m === c + CW) D[c] = 0; else D[m] = 0;
      seen[m] = 1; st.push(m);
    }
    for (let c = 0; c < n; c++) { if (c % CW < CW - 1 && rnd.random() < 0.28) R[c] = 0; if (c < n - CW && rnd.random() < 0.28) D[c] = 0; }
    const S = { R, D, gems: [], gid: 1, gh: { x: this.cx(n >> 1), y: this.cy(n >> 1), st: 2, tc: -1, rt: 0 }, fx: [] };
    S.walls = this.wallRects(S);
    const corners = [0, CW - 1, n - CW, n - 1, CW >> 1, n - (CW >> 1), (CH >> 1) * CW, (CH >> 1) * CW + CW - 1];
    S.p = players.map((pl, i) => ({ id: pl.id, c: pl.c, x: this.cx(corners[i % 8]), y: this.cy(corners[i % 8]), sc: 0, iv: 0, lx: 0, ly: 1 }));
    for (let k = 0; k < this.GEMS; k++) this.addGem(S, rnd);
    return S;
  },

  cx(c) { return this.X0 + (c % this.CW + 0.5) * this.CS; },
  cy(c) { return this.Y0 + (Math.floor(c / this.CW) + 0.5) * this.CS; },
  cellOf(x, y) { const cx = Math.floor((x - this.X0) / this.CS), cy = Math.floor((y - this.Y0) / this.CS); return U.clamp(cy, 0, this.CH - 1) * this.CW + U.clamp(cx, 0, this.CW - 1); },
  nbrs(S, c) {
    const CW = this.CW, x = c % CW, out = [];
    if (x < CW - 1 && !S.R[c]) out.push(c + 1); if (x > 0 && !S.R[c - 1]) out.push(c - 1);
    if (c + CW < CW * this.CH && !S.D[c]) out.push(c + CW); if (c - CW >= 0 && !S.D[c - CW]) out.push(c - CW);
    return out;
  },
  // nächste Zelle auf dem kürzesten Weg zu einer Zielzelle
  nextStep(S, from, goal) {
    if (from === goal) return goal;
    const prev = new Map([[from, -1]]), q = [from];
    while (q.length) { const c = q.shift(); if (c === goal) break; for (const m of this.nbrs(S, c)) if (!prev.has(m)) { prev.set(m, c); q.push(m); } }
    if (!prev.has(goal)) return from;
    let c = goal; while (prev.get(c) !== from) c = prev.get(c);
    return c;
  },
  dist(S, from) { const d = new Map([[from, 0]]), q = [from]; while (q.length) { const c = q.shift(); for (const m of this.nbrs(S, c)) if (!d.has(m)) { d.set(m, d.get(c) + 1); q.push(m); } } return d; },

  wallRects(S) {
    const out = [], T = 12, CS = this.CS, X0 = this.X0, Y0 = this.Y0;
    for (let c = 0; c < S.R.length; c++) {
      const x = X0 + (c % this.CW) * CS, y = Y0 + Math.floor(c / this.CW) * CS;
      if (S.R[c]) out.push([x + CS - T / 2, y - T / 2, T, CS + T]);
      if (S.D[c]) out.push([x - T / 2, y + CS - T / 2, CS + T, T]);
    }
    out.push([X0 - T / 2, Y0 - T / 2, this.CW * CS + T, T], [X0 - T / 2, Y0 - T / 2, T, this.CH * CS + T]);
    return out;
  },
  hit(S, x, y, r) { for (const w of S.walls) if (x + r > w[0] && x - r < w[0] + w[2] && y + r > w[1] && y - r < w[1] + w[3]) return true; return false; },

  addGem(S, rnd, x, y) {
    if (x == null) { let c; do { c = Math.floor((rnd ? rnd.random() : Math.random()) * this.CW * this.CH); } while (S.gems.some(g => this.cellOf(g.x, g.y) === c)); x = this.cx(c); y = this.cy(c); }
    S.gems.push({ i: S.gid++, x: Math.round(x), y: Math.round(y) });
  },

  step(S, inp, dt, G) {
    for (const p of S.p) {
      if (p.gone) continue;
      if (p.iv > 0) p.iv -= dt;
      const [dx, dy] = HR.ST.dir(inp[p.id]);
      if (dx || dy) { p.lx = dx; p.ly = dy; }
      const sp = 235 * dt;
      if (!this.hit(S, p.x + dx * sp, p.y, this.PR)) p.x += dx * sp;
      if (!this.hit(S, p.x, p.y + dy * sp, this.PR)) p.y += dy * sp;
      for (const gm of S.gems) if (!gm.got && Math.hypot(gm.x - p.x, gm.y - p.y) < 34) { gm.got = 1; p.sc++; G.sfx('blip', p.id); }
    }
    const got = S.gems.filter(g => g.got).length;
    S.gems = S.gems.filter(g => !g.got);
    for (let k = 0; k < got; k++) if (S.gems.length < this.GEMS) this.addGem(S);
    // Geist
    const gh = S.gh;
    if (gh.st > 0) gh.st -= dt;
    else {
      const gc = this.cellOf(gh.x, gh.y);
      gh.rt -= dt;
      if (gh.rt <= 0 || gh.tc < 0) {
        const d = this.dist(S, gc); let best = null, bd = 1e9;
        for (const p of S.p) if (!p.gone && p.iv <= 0) { const v = d.get(this.cellOf(p.x, p.y)); if (v != null && v < bd) { bd = v; best = p; } }
        gh.tc = best ? this.nextStep(S, gc, this.cellOf(best.x, best.y)) : gc; gh.rt = 0.25;
      }
      const tx = this.cx(gh.tc), ty = this.cy(gh.tc), ex = tx - gh.x, ey = ty - gh.y, dd = Math.hypot(ex, ey), sp = (150 + S.time * 0.9) * dt;
      if (dd <= sp) { gh.x = tx; gh.y = ty; gh.rt = 0; } else { gh.x += ex / dd * sp; gh.y += ey / dd * sp; }
      for (const p of S.p) {
        if (p.gone || p.iv > 0 || Math.hypot(p.x - gh.x, p.y - gh.y) > 42) continue;
        const lose = Math.ceil(p.sc / 2); p.sc -= lose; p.iv = 2.5; gh.st = 1.6; G.sfx('crash');
        S.fx.push([Math.round(p.x), Math.round(p.y), S.time]);
        for (let k = 0; k < lose; k++) { const a = k / Math.max(1, lose) * 6.28; let x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 40; if (this.hit(S, x, y, 8)) { x = p.x; y = p.y; } this.addGem(S, null, x, y); }
        break;
      }
    }
    S.fx = S.fx.filter(f => S.time - f[2] < 0.6);
  },

  over: () => false,
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.sc, txt: p.sc + ' Edelsteine' })).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.sc + ' ◆',
  spot: (S, p) => [p.x, p.y],

  pack(S) { return { t: +S.time.toFixed(3), gh: { x: Math.round(S.gh.x), y: Math.round(S.gh.y), s: S.gh.st > 0 ? 1 : 0 }, gm: S.gems.map(g => [g.i, g.x, g.y]), fx: S.fx.map(f => [f[0], f[1], +f[2].toFixed(2)]),
    p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), sc: p.sc, iv: p.iv > 0 ? 1 : 0, lx: +p.lx.toFixed(2), ly: +p.ly.toFixed(2), g: p.gone ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.gh = { x: d.gh.x, y: d.gh.y, st: d.gh.s }; S.gems = d.gm.map(g => ({ i: g[0], x: g[1], y: g[2] })); S.fx = d.fx;
    d.p.forEach((q, i) => Object.assign(S.p[i], { x: q.x, y: q.y, sc: q.sc, iv: q.iv, lx: q.lx, ly: q.ly, gone: q.g }));
  },

  draw(g, S, G, W, H) {
    g.save();
    G.world(g);
    const CS = this.CS, X0 = this.X0, Y0 = this.Y0, MW = this.CW * CS, MH = this.CH * CS;
    HR.ST.floor(g, X0, Y0, MW, MH, '#5a4a7a', '#524470', CS);
    for (const w of S.walls) { g.fillStyle = '#2a2140'; g.fillRect(w[0], w[1] + 8, w[2], w[3]); HR.ST.rrect(g, w[0], w[1], w[2], w[3], 4); HR.ST.fill(g, '#9a86c8', 3); }
    for (const gm of S.gems) HR.ST.gem(g, gm.x, gm.y - 6 + Math.sin(S.time * 4 + gm.i) * 4, 14, ['#4ad6ff', '#ff6ad5', '#7cff8a'][gm.i % 3]);
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) G.fig(g, p, p.x, p.y - 8, this.PR, { look: [p.lx, p.ly], alpha: p.iv > 0 && Math.floor(S.time * 10) % 2 ? 0.5 : 1 });
    const gh = S.gh, gb = Math.sin(S.time * 4) * 8;
    for (const f of S.fx) HR.ST.burst(g, f[0], f[1], (S.time - f[2]) / 0.6, '#ff6ad5', 12, 60);
    g.restore();
    // Dunkelheit: nur um die eigene Figur (Zuschauer: um alle) ist es hell
    const me = S.p.find(p => p.id === G.me && !p.gone), v = G.view;
    const lights = G.show || !me ? S.p.filter(p => !p.gone) : [me];
    const dk = this._dk && this._dk.width === Math.ceil(W) && this._dk.height === Math.ceil(H) ? this._dk : (this._dk = U.canvas(Math.ceil(W), Math.ceil(H)));
    const d = dk.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = G.show || !me ? 'rgba(6,4,18,.72)' : 'rgba(6,4,18,.97)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const p of lights) {
      const x = v.ox + p.x * v.sc, y = v.oy + p.y * v.sc, r = 230 * v.sc;
      const gr = d.createRadialGradient(x, y, r * 0.35, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill();
    }
    g.drawImage(dk, 0, 0, W, H);
    // der Geist leuchtet auch im Dunkeln
    g.save(); G.world(g);
    g.globalAlpha = gh.st > 0 ? 0.45 : 0.92;
    g.beginPath(); g.arc(gh.x, gh.y - 10 + gb, 34, Math.PI, 0); g.lineTo(gh.x + 34, gh.y + 24 + gb);
    for (let k = 0; k < 4; k++) g.quadraticCurveTo(gh.x + 34 - k * 17 - 8.5, gh.y + 36 + gb, gh.x + 34 - (k + 1) * 17, gh.y + 24 + gb);
    g.closePath(); HR.ST.fill(g, '#e8f4ff', 4);
    g.fillStyle = HR.ST.INK; g.beginPath(); g.ellipse(gh.x - 12, gh.y - 12 + gb, 7, 10, 0, 0, 7); g.ellipse(gh.x + 12, gh.y - 12 + gb, 7, 10, 0, 0, 7); g.fill();
    g.globalAlpha = 1;
    if (me && !G.show) HR.ST.you(g, me.x, me.y - 40, S.time, '');
    g.restore();
  },
});
