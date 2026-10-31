// B9 Pong-Achteck: jeder verteidigt eine Seite eines Achtecks
'use strict';

HR.AR.define({
  code: 'B9', name: 'Pong-Achteck', short: 'Lass keinen Ball durch!',
  desc: 'Das Spielfeld ist ein Achteck. Jeder verteidigt eine Seite mit seinem Schläger, deine Seite ist immer unten. Freie Seiten sind Wände. Wer einen Ball durchlässt, verliert ein Leben. Mit der Zeit kommen weitere Bälle dazu und die Bälle werden schneller. Je weiter außen der Ball den Schläger trifft, desto schräger fliegt er zurück.',
  goal: 'Mit 3 Leben möglichst lange durchhalten. Wer als Letzter noch Leben hat, gewinnt.',
  touch: 'Steuerkreuz ◀ ▶ Schläger bewegen', keys: '← → (oder A D) Schläger bewegen',
  btns: [],
  duration: 150, RV: 470, BR: 11, HL: 0.14, LIVES: 3, lerpKeys: ['u'],

  geo() {
    if (this._geo) return this._geo;
    const sides = [];
    for (let k = 0; k < 8; k++) {
      const phi = Math.PI / 2 + k * Math.PI / 4;
      const n = [Math.cos(phi), Math.sin(phi)];
      const A = [this.RV * Math.cos(phi + Math.PI / 8), this.RV * Math.sin(phi + Math.PI / 8)];
      const B = [this.RV * Math.cos(phi - Math.PI / 8), this.RV * Math.sin(phi - Math.PI / 8)];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      sides.push({ phi, n, A, B, L, dir: [(B[0] - A[0]) / L, (B[1] - A[1]) / L] });
    }
    return (this._geo = { sides, ap: this.RV * Math.cos(Math.PI / 8) });
  },

  init(players, rnd) {
    const n = players.length;
    const p = players.map((pl, i) => ({ id: pl.id, c: pl.c, k: Math.round(i * 8 / n) % 8, u: 0.5, l: this.LIVES, al: 1, dt: 0 }));
    const S = { p, b: [], bid: 1, extra: 0, seed: rnd.randint(1, 1e9) };
    this.serve(S, rnd.random());
    return S;
  },

  serve(S, r) {
    const a = (r == null ? Math.random() : r) * Math.PI * 2;
    S.b.push({ i: S.bid++, x: 0, y: 0, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, w: 0.8 });
  },

  owner(S, k) { return S.p.find(p => p.k === k && p.al && !p.gone); },

  step(S, inp, dt, G) {
    const { sides, ap } = this.geo(), BR = this.BR, HL = this.HL;
    for (const p of S.p) {
      if (!p.al) continue;
      const i = inp[p.id];
      if (i.l) p.u -= 1.35 * dt;
      if (i.r) p.u += 1.35 * dt;
      p.u = U.clamp(p.u, HL, 1 - HL);
    }
    if ((S.time > 20 && S.extra === 0) || (S.time > 55 && S.extra === 1)) { S.extra++; this.serve(S); G.sfx('beep'); }
    const lost = [];
    for (const b of S.b) {
      if (b.w > 0) { b.w -= dt; continue; }
      for (let sub = 0; sub < 3; sub++) {
        b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
        for (let k = 0; k < 8; k++) {
          const s = sides[k], d = b.x * s.n[0] + b.y * s.n[1], vn = b.vx * s.n[0] + b.vy * s.n[1];
          if (d < ap - BR || vn <= 0) continue;
          const o = this.owner(S, k);
          if (!o) { // Wand
            b.vx -= 2 * vn * s.n[0]; b.vy -= 2 * vn * s.n[1];
            b.x -= (d - ap + BR) * s.n[0]; b.y -= (d - ap + BR) * s.n[1];
            continue;
          }
          const u = ((b.x - s.A[0]) * s.dir[0] + (b.y - s.A[1]) * s.dir[1]) / s.L;
          const m = BR / s.L;
          if (d < ap + 4 && u > o.u - HL - m && u < o.u + HL + m) {
            const off = U.clamp((u - o.u) / HL, -1, 1) * 0.95;
            const sp = Math.min(780, Math.hypot(b.vx, b.vy) * 1.05);
            const dx = -s.n[0] * Math.cos(off) + s.dir[0] * Math.sin(off), dy = -s.n[1] * Math.cos(off) + s.dir[1] * Math.sin(off);
            b.vx = dx * sp; b.vy = dy * sp;
            b.x -= (d - ap + BR) * s.n[0]; b.y -= (d - ap + BR) * s.n[1];
            G.sfx('blip');
          } else if (d > ap + 45) {
            lost.push([b, o]);
            break;
          }
        }
        if (lost.length && lost[lost.length - 1][0] === b) break;
      }
      if (Math.hypot(b.x, b.y) > this.RV + 80 && !lost.some(l => l[0] === b)) lost.push([b, null]);
    }
    for (const [b, o] of lost) {
      S.b = S.b.filter(x => x !== b);
      if (o) {
        o.l -= 1; G.sfx('crash');
        if (o.l <= 0) { o.al = 0; o.dt = S.time; }
      }
      if (S.b.length < 1 + S.extra) this.serve(S);
    }
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S, p => p.l); },
  isOut: (S, p) => !p.al,
  status: (S, p) => p.al ? '♥'.repeat(Math.max(0, p.l)) : '',
  kill(S, p) { p.al = 0; p.dt = S.time; },

  pack(S) { return { t: +S.time.toFixed(3), p: S.p.map(p => ({ u: +p.u.toFixed(4), l: p.l, al: p.al, dt: p.dt, g: p.gone ? 1 : 0 })), b: S.b.map(b => ({ i: b.i, x: Math.round(b.x), y: Math.round(b.y), w: b.w > 0 ? 1 : 0 })) }; },
  unpack(S, d) {
    S.time = d.t; S.b = d.b;
    d.p.forEach((q, i) => { const p = S.p[i]; p.u = q.u; p.l = q.l; p.al = q.al; p.dt = q.dt; p.gone = q.g; });
  },

  draw(g, S, G) {
    const ST = HR.ST, { sides, ap } = this.geo();
    const me = S.p.find(p => p.id === G.me) || S.p[0];
    const rot = Math.PI / 2 - sides[me.k].phi;
    G.world(g);
    g.translate(800, 500); g.rotate(rot);
    // Spielfeld: Achteck mit Rand und Karo
    g.beginPath(); sides.forEach((s, k) => (k ? g.lineTo : g.moveTo).call(g, s.B[0] * 1.06, s.B[1] * 1.06 + 16)); g.closePath(); ST.fill(g, '#5b4aa8', 6);
    g.beginPath(); sides.forEach((s, k) => (k ? g.lineTo : g.moveTo).call(g, s.B[0] * 1.06, s.B[1] * 1.06)); g.closePath(); ST.fill(g, '#7a66d0', 6);
    g.save(); g.beginPath(); sides.forEach((s, k) => (k ? g.lineTo : g.moveTo).call(g, s.B[0], s.B[1])); g.closePath(); g.clip();
    ST.floor(g, -600, -600, 1200, 1200, '#bfe4ff', '#acd8fa', 80); g.restore();
    g.beginPath(); sides.forEach((s, k) => (k ? g.lineTo : g.moveTo).call(g, s.B[0], s.B[1])); g.closePath(); g.lineWidth = 5; g.strokeStyle = ST.INK; g.stroke();
    g.strokeStyle = 'rgba(37,31,58,.15)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 90, 0, 7); g.stroke();
    g.lineCap = 'round';
    const seg = (s, a, b, off, w, col) => {
      g.beginPath();
      g.moveTo(s.A[0] + s.dir[0] * a * s.L - s.n[0] * off, s.A[1] + s.dir[1] * a * s.L - s.n[1] * off);
      g.lineTo(s.A[0] + s.dir[0] * b * s.L - s.n[0] * off, s.A[1] + s.dir[1] * b * s.L - s.n[1] * off);
      g.strokeStyle = ST.INK; g.lineWidth = w + 10; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
    };
    for (let k = 0; k < 8; k++) {
      const s = sides[k], o = S.p.find(p => p.k === k && !p.gone);
      if (!o || !o.al) { seg(s, 0, 1, 0, 14, '#9a94b0'); continue; }
      g.strokeStyle = G.rgb(o, 0.35); g.lineWidth = 6; g.beginPath(); g.moveTo(s.A[0], s.A[1]); g.lineTo(s.B[0], s.B[1]); g.stroke();
      seg(s, o.u - this.HL, o.u + this.HL, 10, 18, G.rgb(o));
      // Figur hinter dem Schläger
      const fx = s.A[0] + s.dir[0] * o.u * s.L + s.n[0] * 30, fy = s.A[1] + s.dir[1] * o.u * s.L + s.n[1] * 30;
      g.save(); g.translate(fx, fy); g.rotate(-rot); HR.ST.char(g, 0, 0, 18, G.color(o), { look: [-(s.n[0] * Math.cos(rot) - s.n[1] * Math.sin(rot)), -(s.n[0] * Math.sin(rot) + s.n[1] * Math.cos(rot))], t: S.time, noShadow: true }); g.restore();
    }
    for (const b of S.b) { g.globalAlpha = b.w ? 0.45 : 1; g.beginPath(); g.arc(b.x, b.y, this.BR + 2, 0, 7); ST.fill(g, '#fff', 4); g.globalAlpha = 1; }
    // Namen und Leben außen, aufrecht
    g.rotate(-rot);
    for (const p of S.p) {
      if (p.gone) continue;
      const s = sides[p.k], a = s.phi + rot, x = Math.cos(a) * (ap + 64), y = Math.sin(a) * (ap + 64);
      const label = (p.id === G.me ? 'DU' : G.name(p.id)) + (p.al ? '  ' + '♥'.repeat(Math.max(0, p.l)) : '  ✕');
      ST.text(g, label, x, y, p.id === G.me ? 22 : 17, p.al ? G.rgb(p) : 'rgba(255,255,255,.5)');
    }
  },
});
