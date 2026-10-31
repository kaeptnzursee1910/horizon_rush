// Horizon Rush – Hintergrund des Startbildschirms: zeigt nacheinander alle Minispiele,
// gespielt von Computer-Spielern, und wechselt alle paar Sekunden
'use strict';

HR.Showcase = {
  PERIOD: 5, FADE: 0.45,
  arena: null, code: null, t: 0, list: [], idx: 0,

  // neuer Durchlauf (wird bei jedem Start der Menü-Animation aufgerufen)
  reset() {
    this.list = U.shuffle(HR.GAME_ORDER.slice());
    this.idx = 0;
    this.load(this.list[0]);
  },

  active() { return !!(Game.race && Game.race.demo && !HR.Party.arena); },

  tick(dt) {
    if (!this.active()) return;
    this.t += dt;
    const a = this.arena;
    if (this.t >= this.PERIOD || (a && a.phase !== 'play')) {
      this.idx = (this.idx + 1) % this.list.length;
      this.load(this.list[this.idx]);
      return;
    }
    if (a) this.runArena(a, dt);
  },

  load(code) {
    this.code = code; this.t = 0; this.arena = null;
    const def = HR.GAMES[code];
    if (!def) return;
    if (def.kind === 'race') { Game.startDemoRace(def); return; }
    const n = 6, seed = Math.floor(Math.random() * 1e9), names = HR.makeAI(n, 1);
    const players = [];
    for (let i = 0; i < n; i++) players.push({ id: i, name: names[i].name, color: (i * 3 + 1) % HR.PARTY_COLORS.length });
    const a = def.create({ host: true, me: -1, players, seed, show: true });
    a.show = true; a.phase = 'play'; a.onEnd = () => {};
    this.arena = a;
    // kurz vorlaufen lassen, damit sofort etwas los ist
    for (let k = 0; k < 90 && a.phase === 'play'; k++) this.runArena(a, HR.STEP);
  },

  runArena(a, dt) {
    a.acc += dt;
    let n = 0;
    while (a.acc >= HR.STEP && n++ < 4) {
      for (const p of a.S.p) a.inputs[p.id] = this.botBits(a.def, a.S, p, 0);
      a.step(HR.STEP); a.acc -= HR.STEP;
    }
    if (n >= 4) a.acc = 0;
  },

  render(g, W, H, dpr) {
    if (this.arena) this.arena.render(g, W, H, dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // weiche Überblendung beim Wechsel
    const f = Math.max(this.t < this.FADE ? 1 - this.t / this.FADE : 0, this.t > this.PERIOD - this.FADE ? 1 - (this.PERIOD - this.t) / this.FADE : 0);
    if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
    const def = HR.GAMES[this.code];
    if (def && document.querySelector('.panel.main')) {
      const sc = U.clamp(Math.min(W / 1000, H / 640), 0.7, 1.3);
      g.globalAlpha = 0.85 * (1 - f);
      HR.Render.text(g, def.name.toUpperCase(), W - 14 * sc, H - 14 * sc - 16 * sc, 16 * sc, 'rgb(255,210,40)', 'right');
      g.globalAlpha = 1;
    }
  },

  // ---------- Computer-Spieler ----------
  // Tasten eines Computer-Spielers; sloppy = Anteil der Momente, in denen er nicht reagiert
  botBits(def, S, p, sloppy) {
    const bot = this.bots[def.code];
    if (!bot || (sloppy && Math.random() < sloppy)) return 0;
    const o = bot(S, p, def);
    return (o.l ? 1 : 0) | (o.r ? 2 : 0) | (o.u ? 4 : 0) | (o.d ? 8 : 0) | (o.a ? 16 : 0) | (o.b ? 32 : 0);
  },

  // Richtung zu einem Ziel als Tasten (8 Richtungen)
  toward(x, y, tx, ty, tol) {
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
    if (d < (tol || 4)) return {};
    return { l: dx / d < -0.38, r: dx / d > 0.38, u: dy / d < -0.38, d: dy / d > 0.38 };
  },

  bots: {
    B1(S, p, def) {
      const D = def.DIRS, free = d => {
        for (const k of [25, 55]) {
          const x = p.x + D[d][0] * k, y = p.y + D[d][1] * k;
          if (x < 10 || x > 1590 || y < 10 || y > 990 || def.hits(S, { x, y })) return false;
        }
        return true;
      };
      const L = (p.d + 3) % 4, R = (p.d + 1) % 4;
      if (!free(p.d) || Math.random() < 0.006) { if (free(L) && (Math.random() < 0.5 || !free(R))) return { l: 1 }; if (free(R)) return { r: 1 }; }
      return {};
    },
    B2(S, p) {
      const o = S.p.find(q => q !== p && q.rt <= 0 && !q.gone);
      const want = o ? Math.atan2(o.y - p.y, o.x - p.x) : p.a;
      const d = HR.AR.angDiff(want, p.a);
      p._w = (p._w || 0) + 1;
      return { l: d < -0.1, r: d > 0.1, u: (p._w >> 5) % 3 !== 0, a: Math.abs(d) < 0.25 && Math.random() < 0.08 };
    },
    B3(S, p) {
      let o = null, od = 1e9;
      for (const q of S.p) if (q !== p && q.al) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < od) { od = d; o = q; } }
      // am Rand zurück zur Mitte, sonst auf den nächsten Gegner zu
      const edge = Math.hypot(p.x - 800, p.y - 500) > S.R - 140;
      const want = edge || !o ? Math.atan2(500 - p.y, 800 - p.x) : Math.atan2(o.y - p.y, o.x - p.x);
      const d = HR.AR.angDiff(want, p.a);
      return { l: d < -0.1, r: d > 0.1, u: Math.abs(d) < 0.8, a: !edge && od < 120 && Math.random() < 0.03 };
    },
    B4(S, p) {
      const T = S.T, n = T.s.length, q = T.s[(p.idx + 12) % n];
      const d = HR.AR.angDiff(Math.atan2(q[1] - p.y, q[0] - p.x), p.a);
      return { l: d < -0.05, r: d > 0.05, u: 1 };
    },
    B6(S, p, def) {
      let best = null;
      const r0 = Math.floor(p.h / def.ROW) + 1;
      for (let r = r0; r < r0 + 3; r++) for (const c of def.row(S, r)) { const x = def.cx(c, S.time); if (best == null || Math.abs(x - p.x) < Math.abs(best - p.x)) best = x; }
      return best == null ? {} : { l: best < p.x - 20, r: best > p.x + 20 };
    },
    B7(S, p, def) {
      const j = Math.max(0, Math.floor((S.z - def.Z0) / def.GAP) + 1), r = def.ring(S, j);
      const K = def.K, sw = Math.PI * 2 / K;
      let best = null;
      for (let k = 0; k < K; k++) if (!r.b[k]) { const d = HR.AR.angDiff((k + 0.5) * sw, p.a); if (best == null || Math.abs(d) < Math.abs(best)) best = d; }
      return best == null ? {} : { l: best > 0.05, r: best < -0.05 };
    },
    B9(S, p, def) {
      const geo = def.geo(), s = geo.sides[p.k];
      let tu = 0.5, bd = 1e9;
      for (const b of S.b) { const d = geo.ap - (b.x * s.n[0] + b.y * s.n[1]); if (d < bd) { bd = d; tu = ((b.x - s.A[0]) * s.dir[0] + (b.y - s.A[1]) * s.dir[1]) / s.L; } }
      return { l: tu < p.u - 0.03, r: tu > p.u + 0.03 };
    },
    // erst hüpfen, wenn die nächste Spur frei ist (Straße) oder ein Stamm da ist (Fluss)
    // ---------- neue Minispiele ----------
    C1(S, p, def) {
      if (!p.al) return {};
      if (!def._nb) { def._nb = []; for (let i = 0; i < S.T.length; i++) { const [x, y] = def.center(i); def._nb[i] = []; for (let j = 0; j < S.T.length; j++) { const [u, v] = def.center(j); if (j !== i && Math.hypot(u - x, v - y) < def.R * 1.9) def._nb[i].push(j); } } }
      const good = i => S.T[i] >= 0 && S.T[i] < def.POINT * 0.4, pass = i => S.T[i] >= 0 && S.T[i] < def.POINT;
      const cur = def.tileAt(p.x, p.y);
      const at = p._t != null && Math.hypot(def.center(p._t)[0] - p.x, def.center(p._t)[1] - p.y) < 22;
      if (cur >= 0 && (p._t == null || !pass(p._t) || at)) {
        // Breitensuche über begehbare Platten zur nächsten guten festen Platte, dann nur den ersten Schritt gehen
        const first = new Map([[cur, -1]]), q = [cur]; let best = null, bs = -1e9;
        for (let h = 0; h < q.length && q.length < 160; h++) {
          const c = q[h];
          for (const j of def._nb[c]) {
            if (first.has(j) || !pass(j)) continue;
            first.set(j, first.get(c) === -1 ? j : first.get(c)); q.push(j);
            if (good(j) && j !== p._last) {
              const [x, y] = def.center(j), dep = q.length;
              const sc = def._nb[j].filter(good).length * 10 - Math.hypot(x - 800, y - 500) * 0.02 - Math.hypot(x - p.x, y - p.y) * 0.06 + Math.random() * 10;
              if (sc > bs) { bs = sc; best = j; }
            }
          }
        }
        p._last = cur; p._t = best == null ? null : first.get(best);
      }
      if (p._t == null) return {};
      const [tx, ty] = def.center(p._t);
      return HR.Showcase.toward(p.x, p.y, tx, ty, 8);
    },
    C2(S, p, def) {
      if (!p.al) return {};
      const pa = Math.atan2(p.y - 520, p.x - 800), d = Math.max(1, Math.hypot(p.x - 800, p.y - 520)), w = 26 / d, sp = Math.max(0.3, S.sp || 1);
      let tmin = 9, inside = false;
      for (const l of S.L) {
        let gap = ((pa - l.a) * (S.dir || 1)) % 6.283; if (gap < 0) gap += 6.283;
        if (gap < w || gap > 6.283 - w) inside = true;
        tmin = Math.min(tmin, (gap - w) / sp);
      }
      // Sprung so legen, dass die Figur hoch ist, während der Strahl durchläuft
      const o = inside || (tmin > 0.03 && tmin < 0.11) ? { a: 1 } : {};
      if (tmin < 0.7 || inside || p.z > 0) return o;
      p._w = (p._w || 0) + 1;
      const ang = (p.id * 1.7 + p._w * 0.004), tx = 800 + Math.cos(ang) * 240, ty = 520 + Math.sin(ang) * 240;
      return Object.assign(HR.Showcase.toward(p.x, p.y, tx, ty, 30), o);
    },
    C3(S, p, def) {
      if (!p.al) return {};
      const cur = def.cellOf(p.x, p.y), GX = def.GX;
      const danger = new Set(); for (const f of S.fall) danger.add(f.c);
      let best = cur, bs = -1e9;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const cx = cur % GX + dx, cy = Math.floor(cur / GX) + dy; if (cx < 0 || cy < 0 || cx >= GX || cy >= def.GY) continue;
        const c = cy * GX + cx; if (S.box[c]) continue;
        let sc = -Math.hypot(dx, dy) * 6 - (danger.has(c) ? 1000 : 0) - Math.hypot(cx - GX / 2, cy - def.GY / 2) * 2;
        for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (cy + ey) * GX + cx + ex; if (danger.has(n)) sc -= 30; if (S.box[n]) sc -= 8; }
        if (S.sh.some(s => s.c === c)) sc += 60;
        if (sc > bs) { bs = sc; best = c; }
      }
      const [tx, ty] = def.cellXY(best);
      return HR.Showcase.toward(p.x, p.y, tx, ty, 6);
    },
    C4(S, p, def) {
      if (S.cr < 0) return HR.Showcase.toward(p.x, p.y, S.cx, S.cy, 4);
      if (S.cr === p.id) {
        let fx = 800 - p.x, fy = 510 - p.y; fx *= 0.004; fy *= 0.004;
        for (const q of S.p) if (q !== p && !q.gone) { const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 300 / d; fy += dy / d * 300 / d; }
        return HR.Showcase.toward(p.x, p.y, p.x + fx * 100, p.y + fy * 100, 2);
      }
      const h = S.p.find(q => q.id === S.cr), d = Math.hypot(h.x - p.x, h.y - p.y);
      return Object.assign(HR.Showcase.toward(p.x, p.y, h.x, h.y, 4), d < 170 && S.imm <= 0 && Math.random() < 0.3 ? { a: 1 } : {});
    },
    C5(S, p) {
      if (p.fz > 0 || p.mk > 0) return {};
      if (!p.am) return Math.random() < 0.5 ? { a: 1 } : {};
      let t = null, td = 1e9;
      for (const q of S.p) if (q !== p && !q.gone && q.fz <= 0) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < td) { td = d; t = q; } }
      if (!t) return {};
      if (td > 480) return HR.Showcase.toward(p.x, p.y, t.x, t.y, 10);
      // in einer der 8 Richtungen zielen: passt die Linie, werfen, sonst seitlich ausrichten
      const ang = Math.atan2(t.y - p.y, t.x - p.x), q = Math.round(ang / (Math.PI / 4)), diff = ang - q * Math.PI / 4;
      const qx = Math.round(Math.cos(q * Math.PI / 4)), qy = Math.round(Math.sin(q * Math.PI / 4));
      const o = { l: qx < 0, r: qx > 0, u: qy < 0, d: qy > 0 };
      if (Math.abs(Math.sin(diff)) * td < 26) return Math.random() < 0.4 ? Object.assign(o, { a: 1 }) : o;
      const px = -Math.sin(q * Math.PI / 4) * Math.sign(diff), py = Math.cos(q * Math.PI / 4) * Math.sign(diff);
      return HR.Showcase.toward(0, 0, -px, -py, 0.1);
    },
    C6(S, p, def) {
      if (!p.al) return {};
      if (S.ph !== 'go' || p.ok) { const [x, y] = def.tileXY(5 + (p.id % 2) * 5); return HR.Showcase.toward(p.x, p.y, x + (p.id % 3) * 30 - 30, y, 30); }
      if (p._rd !== S.rd) { p._rd = S.rd; p._plan = S.seq.map(t => Math.random() < 0.035 * S.n ? (t + 1 + Math.floor(Math.random() * 15)) % 16 : t); p._st = 0; }
      const t = p._plan[p.pg]; if (t == null) return {};
      const [x, y] = def.tileXY(t);
      if (Math.abs(x - p.x) < 50 && Math.abs(y - p.y) < 50) { p._st = !p._st; return p._st ? { a: 1 } : {}; }
      return HR.Showcase.toward(p.x, p.y, x, y, 10);
    },
    C7(S, p) {
      if (p.ft) return {};
      if (S.L === 'g') { p._y = null; return { a: 1 }; }
      if (p._y == null) { p._y = S.time; p._rx = 0.08 + Math.random() * 0.3; p._brave = Math.random() < 0.12; }
      return S.time - p._y < p._rx || (p._brave && S.L === 'y') ? { a: 1 } : {};
    },
    C8(S, p) {
      if (p.st > 0) return {};
      let best = null, bs = 1e9;
      for (const d of S.drops) { const v = Math.hypot(d.x - p.x, d.y - p.y) - 120; if (v < bs) { bs = v; best = d; } }
      for (const m of S.m) { if (m.d) continue; const v = Math.hypot(m.x - p.x, m.y - p.y) - (m.sp ? 150 : 0) + (p.id % 3) * 20; if (v < bs) { bs = v; best = m; } }
      if (!best) return {};
      if (best.c !== undefined || best.sp !== undefined) { if (Math.hypot(best.x - p.x, best.y - p.y) < 34) return { a: 1 }; }
      return HR.Showcase.toward(p.x, p.y, best.x, best.y, 4);
    },
    C9(S, p) {
      if (p._rd !== S.rd) { p._rd = S.rd; p._r = 0.19 + Math.random() * 0.28; p._k = 0; }
      if (S.ph === 'sig' && !p.pr && !p.er && S.time - S.sigT > p._r) { p._k = !p._k; return p._k ? { a: 1 } : {}; }
      if ((S.ph === 'wait') && Math.random() < (S.fake ? 0.006 : 0.0006)) return { a: 1 };
      return {};
    },
    C10(S, p) {
      if (S.ph !== 'pump' || p.bk || p.pop) return {};
      if (p._rd !== S.rd) { p._rd = S.rd; p._tg = Math.max(3, Math.round(S.lim * (0.55 + Math.random() * 0.5))); p._k = 0; }
      if (p.s >= p._tg || (S.tm < 1.3 && p.s > 0)) return { b: 1 };
      p._k = (p._k + 1) % 8;
      return p._k === 0 ? { a: 1 } : {};
    },
    C11(S, p, def) {
      const c = def.cellOf(p.x, p.y), gc = def.cellOf(S.gh.x, S.gh.y);
      let next;
      if (Math.hypot(S.gh.x - p.x, S.gh.y - p.y) < 190 && S.gh.st <= 0) {
        let bd = -1; for (const m of def.nbrs(S, c)) { const d = Math.hypot(def.cx(m) - S.gh.x, def.cy(m) - S.gh.y); if (d > bd) { bd = d; next = m; } }
      } else {
        const dist = def.dist(S, c); let best = null, bd = 1e9;
        for (const gm of S.gems) { const v = dist.get(def.cellOf(gm.x, gm.y)); if (v != null && v + (gm.i % 3) * 0.3 < bd) { bd = v; best = gm; } }
        if (best) { const bc = def.cellOf(best.x, best.y); if (bc === c) return HR.Showcase.toward(p.x, p.y, best.x, best.y, 2); next = def.nextStep(S, c, bc); }
      }
      if (next == null || next === c) return {};
      const cx = def.cx(c), cy = def.cy(c), horiz = Math.abs(next - c) === 1;
      if (horiz && Math.abs(p.y - cy) > 6) return p.y < cy ? { d: 1 } : { u: 1 };
      if (!horiz && Math.abs(p.x - cx) > 6) return p.x < cx ? { r: 1 } : { l: 1 };
      return HR.Showcase.toward(p.x, p.y, def.cx(next), def.cy(next), 2);
    },
    C12(S, p, def) {
      if (p.st > 0) return {};
      let best = null, bs = 1e9, flee = 0;
      for (const it of S.it) {
        const dx = it.x - p.x, dy = (p.y - 30) - it.y;
        if (it.k === 'b') { if (Math.abs(dx) < 130 && dy > -60 && dy < 480) flee = dx > 0 ? -1 : 1; continue; }
        if (it.lt > 2.8) continue;
        const v = Math.abs(dx) + Math.abs(dy) * 0.5 - (it.k === 'g' ? 200 : 0) + (p.id % 3) * 15;
        if (v < bs) { bs = v; best = it; }
      }
      if (flee) return flee > 0 ? { r: 1 } : { l: 1 };
      if (!best) return {};
      const dx = best.x - p.x, o = Math.abs(dx) > 14 ? (dx > 0 ? { r: 1 } : { l: 1 }) : {};
      const above = best.y < p.y - 70;
      if (p.og && above && Math.abs(dx) < 150) o.a = 1;
      if (best.y > p.y + 20 && p.y < def.GY - 5 && Math.abs(dx) < 220) o.d = 1;
      return o;
    },
    B10(S, p, def) {
      if (p.dead > 0) return {};
      const safe = (r, x) => {
        const L = S.lanes[r];
        if (!L) return true;
        if (L.type === 'road') {
          for (const o of L.o) for (const dt of [0, 0.25, 0.5]) { const ox = def.ox(L, o, S.time + dt); if (x + 44 > ox && x - 44 < ox + L.len) return false; }
        } else if (L.type === 'river') {
          const ox = L.o.map(([o, len]) => [def.ox(L, o, S.time + 0.12), len]);
          if (!ox.some(([a, len]) => x > a + 26 && x < a + len - 26) || x < 90 || x > 1510) return false;
        }
        return true;
      };
      if (safe(p.r + 1, p.x)) return { u: 1 };
      if (!safe(p.r, p.x) && S.lanes[p.r].type === 'road' && safe(p.r - 1, p.x)) return { d: 1 };
      return {};
    },
  },
};
