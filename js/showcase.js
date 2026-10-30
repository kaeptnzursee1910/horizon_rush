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
    return (o.l ? 1 : 0) | (o.r ? 2 : 0) | (o.u ? 4 : 0) | (o.d ? 8 : 0) | (o.a ? 16 : 0);
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
