// Horizon Rush – Hintergrund des Startbildschirms: zeigt nacheinander alle Minispiele,
// gespielt von Computer-Spielern, und wechselt alle paar Sekunden
'use strict';

HR.Showcase = {
  PERIOD: 5, FADE: 0.45,
  arena: null, code: null, t: 0, list: [], idx: 0,
  lead: 0, mind: null,   // Reaktionszeit und Spielweise des Computer-Spielers, der gerade entscheidet (siehe arena.js)

  // neuer Durchlauf (wird bei jedem Start der Menü-Animation aufgerufen)
  reset() {
    this.only = null;
    this.list = U.shuffle(HR.GAME_ORDER.slice());
    this.idx = 0;
    this.load(this.list[0]);
  },

  // nur noch ein Spiel zeigen (Vorschau in der Spielerklärung); null = wieder alle im Wechsel
  focus(code) {
    if (code === this.only) return;
    if (!code) { if (this.only) this.reset(); return; }
    this.only = code; this.list = [code]; this.idx = 0; this.load(code);
  },

  period() { return this.only ? 14 : this.PERIOD; },

  active() { return !!(Game.race && Game.race.demo && !HR.Party.arena); },

  tick(dt) {
    if (!this.active()) return;
    this.t += dt;
    const a = this.arena;
    if (this.t >= this.period() || (a && a.phase !== 'play')) {
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
    const f = Math.max(this.t < this.FADE ? 1 - this.t / this.FADE : 0, this.t > this.period() - this.FADE ? 1 - (this.period() - this.t) / this.FADE : 0);
    if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
    const def = HR.GAMES[this.code];
    if (def && document.querySelector('.panel.main')) {
      const sc = U.clamp(Math.min(W / 1000, H / 640), 0.7, 1.3);
      g.globalAlpha = 0.85 * (1 - f);
      HR.Render.text(g, def.name.toUpperCase(), W - 14 * sc, H - 14 * sc - 16 * sc, 16 * sc, HR.THEME === 'neon' ? '#ffe23d' : 'rgb(255,210,40)', 'right');
      g.globalAlpha = 1;
    }
  },

  // Bild der Hauptleinwand in die Vorschau der Spielerklärung kopieren
  copyPreview(src) {
    const cv = document.getElementById('ppreview');
    if (!cv || !this.only) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    // Fahrspiele: Ausschnitt mit dem Seitenverhältnis der Vorschau aus der Mitte des Hauptbilds
    const sw = src.width, sh = src.height, k = Math.min(sw / w, sh / h), cw = w * k, ch = h * k;
    const g = cv.getContext('2d');
    // Arena-Spiele direkt passend hineinzeichnen, damit das ganze Spielfeld zu sehen ist
    if (this.arena) { this.arena.render(g, w / dpr, h / dpr, dpr); g.setTransform(1, 0, 0, 1, 0, 0); return; }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
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
  // Computer-Spieler mit Reaktionszeit halten etwas früher an, sonst kreisen sie um das Ziel herum
  toward(x, y, tx, ty, tol) {
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
    if (d < Math.max(tol || 4, this.mind && (tol || 4) >= 1 ? 16 : 0)) return {};   // (tol < 1: reine Richtung, keine Strecke)
    return { l: dx / d < -0.38, r: dx / d > 0.38, u: dy / d < -0.38, d: dy / d > 0.38 };
  },

  bots: {
    // Lichtrad: misst, wie viel Platz geradeaus, links und rechts ist (Flutfüllung auf einem groben Raster),
    // und biegt rechtzeitig in den größeren freien Raum ab – so wie ein Mensch, der nicht in die Sackgasse fährt
    B1(S, p, def) {
      if (!p.al) return {};
      const SC = HR.Showcase, M = SC.mind || { err: 0, bold: 0.5 }, D = def.DIRS, C = 20, GW = 80, GH = 50;
      if (p._cd > 0) { p._cd--; return p._cd > 7 ? p._lt : {}; }   // Taste halten, dann kurz loslassen (sonst zählt der nächste Druck nicht)
      if (!S._g || S._gt !== S.time) {
        // Raster: Spuren und die nächsten Meter der anderen Köpfe sind belegt
        const g = S._g = new Uint8Array(GW * GH); S._gt = S.time;
        const mark = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10) + 1; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n, cx = Math.floor(x / C), cy = Math.floor(y / C); if (cx >= 0 && cy >= 0 && cx < GW && cy < GH) g[cy * GW + cx] = 1; } };
        for (const o of S.p) { const v = o.v; for (let k = 0; k < v.length; k++) { const q = k + 1 < v.length ? v[k + 1] : [o.x, o.y]; mark(v[k][0], v[k][1], q[0], q[1]); } }
        S._heads = S.p.filter(o => o.al);
      }
      const g = S._g;
      const free = d => {
        let k = 6;
        const hc = Math.floor(p.y / C) * GW + Math.floor(p.x / C);
        for (; k < 600; k += 5) {
          const x = p.x + D[d][0] * k, y = p.y + D[d][1] * k, c = Math.floor(y / C) * GW + Math.floor(x / C);
          if (x < 6 || x > 1594 || y < 6 || y > 994 || (c !== hc && g[c] && k > 14) || def.hits(S, { x, y })) break;
          let hit = false;
          for (const o of S._heads) { if (o === p) continue; const t = k / S.sp, ox = o.x + D[o.d][0] * S.sp * t, oy = o.y + D[o.d][1] * S.sp * t; if (Math.abs(ox - x) < 30 && Math.abs(oy - y) < 30) { hit = true; break; } }
          if (hit) break;
        }
        return k;
      };
      const room = (d, f) => {
        // Flutfüllung ab dem ersten freien Feld in dieser Richtung
        const k = Math.min(f - 4, 30), sx = Math.floor((p.x + D[d][0] * k) / C), sy = Math.floor((p.y + D[d][1] * k) / C);
        if (f < 20 || sx < 0 || sy < 0 || sx >= GW || sy >= GH) return 0;
        const seen = new Uint8Array(GW * GH), q = [sy * GW + sx]; seen[q[0]] = 1;
        const hx = Math.floor(p.x / C), hy = Math.floor(p.y / C); seen[hy * GW + hx] = 1;
        for (let h = 0; h < q.length && q.length < 900; h++) {
          const c = q[h], cx = c % GW, cy = (c - cx) / GW;
          for (const [ex, ey] of D) { const nx = cx + ex, ny = cy + ey, n = ny * GW + nx; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && !seen[n] && !g[n]) { seen[n] = 1; q.push(n); } }
        }
        return q.length;
      };
      p._th = (p._th || 0) - 1;
      const need = S.sp * (SC.lead + 0.1) + 22 + M.err * 25;
      const L = (p.d + 3) % 4, R = (p.d + 1) % 4, fs = free(p.d);
      if (fs >= need && p._th > 0) return {};
      p._th = 6 + Math.floor(Math.random() * 6);   // nicht in jedem Bild neu nachdenken
      const fl = free(L), fr = free(R);
      const cdF = Math.round((SC.lead + 0.1) * 60) + 8, side = S.sp * cdF / 60 + 25;   // nach dem Abbiegen braucht er so viel Platz, bis er wieder lenken kann
      const val = (d, f) => f < side ? -1e6 + f * 10 + Math.min(room(d, f), 900) : Math.min(room(d, f), 900) * 8 + Math.min(f, 300) + Math.random() * 400 * M.err;
      const vs = fs < need ? -1e6 + fs : val(p.d, fs) + 600 * (0.4 + M.bold), vl = val(L, fl), vr = val(R, fr);
      if (vs >= vl && vs >= vr) return {};
      p._lt = vl >= vr ? { l: 1 } : { r: 1 };
      p._cd = cdF;   // gleiche Entscheidung halten, bis die Abbiegung da ist
      return p._lt;
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
    // Wolken: sucht die höchste Wolke, die er im jetzigen Sprung noch erreichen kann, und steuert dorthin, wo sie bei der Landung ist.
    // Ein gewähltes Ziel behält er, solange es erreichbar bleibt (sonst zappelt er hin und her).
    B6(S, p, def) {
      if (!p.al) return {};
      const SC = HR.Showcase, M = SC.mind || { err: 0, bold: 0.5 }, ROW = def.ROW, Gv = 1750;
      const vh = p.vh - Gv * SC.lead;
      const plan = (r, c) => {
        const top = r * ROW, disc = vh * vh + 2 * Gv * (p.h - top);
        if (disc < 0 || top < S.cb + 40) return null;
        const t = (vh + Math.sqrt(disc)) / Gv; if (t <= 0.04) return null;
        if (c.k === 'g') return S.time + t > 8 ? null : { t, dx: 0 };
        const dx = ((def.cx(c, S.time + t + SC.lead) - p.x) % 1600 + 2400) % 1600 - 800;
        return Math.abs(dx) > 440 * Math.max(0, t - 0.1) * (p._tc && p._tc.c === c ? 0.95 : 0.7) + c.w / 2 ? null : { t, dx };
      };
      if (!p._k || p._k-- <= 0) {
        p._k = 5 + Math.floor(Math.random() * 5);
        let best = null, bs = -1e9;
        const r0 = Math.max(0, Math.floor(p.h / ROW) - 4), r1 = Math.floor((p.h + Math.max(0, vh) * vh / (2 * Gv)) / ROW);
        for (let r = r0; r <= r1; r++) def.row(S, r).forEach((c, i) => {
          const q = plan(r, c); if (!q) return;
          const sc = r * 100 + (c.k === 's' ? 160 : 0) - Math.abs(q.dx) * 0.08 + (p._tc && p._tc.r === r && p._tc.i === i ? 400 : 0);
          if (sc > bs) { bs = sc; best = { r, i }; }
        });
        if (!best) p._tc = null;
        else if (!p._tc || p._tc.r !== best.r || p._tc.i !== best.i) p._tc = { r: best.r, i: best.i, c: def.row(S, best.r)[best.i], off: (Math.random() - 0.5) * 0.5 * M.err };
      }
      if (!p._tc) return {};
      const c = def.row(S, p._tc.r)[p._tc.i], q = c && plan(p._tc.r, c);
      if (!q) { p._k = 0; return {}; }
      const dx = q.dx + (c.w || 0) * p._tc.off;
      p._tx = p.x + dx;
      // loslassen, wenn er mit dem Schwung ohnehin ankommt (das Bremsen trägt ihn noch ein Stück)
      if (Math.abs(dx) < 16 || (Math.sign(dx) === Math.sign(p.vx) && Math.abs(p.vx) * 0.26 > Math.abs(dx))) return {};
      return dx > 0 ? { r: 1 } : { l: 1 };
    },
    // Tunnel: plant für den Ring, der nach seiner Reaktionszeit als Nächstes kommt, und schaut dabei schon auf den übernächsten
    B7(S, p, def) {
      if (!p.al) return {};
      const SC = HR.Showcase, M = SC.mind || { err: 0 }, K = def.K, sw = Math.PI * 2 / K, D = HR.AR.angDiff;
      const z = S.z + S.sp * SC.lead, j = Math.max(0, Math.floor((z - def.Z0) / def.GAP) + 1);
      const r = def.ring(S, j), r2 = def.ring(S, j + 1), tr = (def.ringZ(j) - z) / S.sp;
      const gaps = R => { const o = []; for (let k = 0; k < K; k++) if (!R.b[k]) o.push((k + 0.5) * sw); return o; };
      const g1 = gaps(r), g2 = gaps(r2);
      let best = null, bs = 1e9;
      for (const a of g1) {
        const d = D(a, p.a);
        // in der Lücke darf er nicht am Rand kleben: nur Sektoren, deren Nachbarn auch frei sind, zählen voll
        const k = Math.floor(a / sw);
        let clr = 0; while (clr < 3 && !r.b[(k + clr + 1) % K] && !r.b[(k - clr - 1 + K * 4) % K]) clr++;
        const edge = 3 - clr;
        const late = Math.abs(d) > 3.5 * Math.max(0, tr - 0.05) ? 6 : 0;
        const nxt = Math.min(...g2.map(b => Math.abs(D(b, a))));
        const sc = Math.abs(d) + edge * 0.45 + late + nxt * 0.3;
        if (sc < bs) { bs = sc; best = d; }
      }
      if (best == null) return {};
      // genaue Vorhersage: wo er steht, wenn die schon gedrückten Tasten angekommen sind
      if (SC.now && SC.pend) best += p.a - (SC.now.a + 3.5 * (SC.pend.l - SC.pend.r));
      p._e = p._e != null && Math.random() > 0.02 ? p._e : (Math.random() - 0.5) * sw * 0.6 * M.err;
      const d = best + p._e;
      return { l: d > 0.16, r: d < -0.16 };
    },
    B9(S, p, def) {
      const geo = def.geo(), s = geo.sides[p.k];
      let tu = 0.5, bd = 1e9;
      for (const b of S.b) { const d = geo.ap - (b.x * s.n[0] + b.y * s.n[1]); if (d < bd) { bd = d; tu = ((b.x - s.A[0]) * s.dir[0] + (b.y - s.A[1]) * s.dir[1]) / s.L; } }
      return { l: tu < p.u - 0.03, r: tu > p.u + 0.03 };
    },
    // erst hüpfen, wenn die nächste Spur frei ist (Straße) oder ein Stamm da ist (Fluss)
    // ---------- neue Minispiele ----------
    // Brüchiger Boden: sucht sich eine feste Platte in der Nähe, zu der der Weg geradeaus sicher ist, und läuft hin.
    // Wird die Platte unter ihm rissig, sucht er die nächste.
    C1(S, p, def) {
      if (!p.al) return {};
      const M = HR.Showcase.mind || { err: 0, bold: 0.5 }, n = S.T.length, P = def.POINT;
      const ok = i => i >= 0 && S.T[i] >= 0 && S.T[i] < P * 0.8;
      const cur = def.tileAt(p.x, p.y);
      // die Platte, auf der er steht, darf rissig sein – er will ja gerade herunter
      const lineOk = (x0, y0, x1, y1) => { const k = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 18); for (let j = 1; j <= k; j++) { const t = def.tileAt(x0 + (x1 - x0) * j / k, y0 + (y1 - y0) * j / k); if (t !== cur || S.T[t] < 0) { if (!ok(t)) return false; } } return true; };
      // angekommen: gleich weiter zur nächsten Platte (stehen bleiben lässt den Boden reißen)
      const there = p._g != null && Math.hypot(def.center(p._g)[0] - p.x, def.center(p._g)[1] - p.y) < 40 + 30 * M.bold;
      const bad = p._g == null || !ok(p._g) || there || (cur === p._g && S.T[cur] > P * (0.3 + 0.3 * M.bold));
      // ein Ziel wird beibehalten, bis es unsicher wird (sonst läuft er im Zickzack)
      const [gx, gy] = p._g != null ? def.center(p._g) : [0, 0];
      if (!bad && p._g != null && !lineOk(p.x, p.y, gx, gy) && cur !== p._g) p._g = null;
      if (bad || p._g == null) {
        let best = null, bs = -1e9;
        for (let i = 0; i < n; i++) {
          if (!ok(i) || i === cur || i === p._g) continue;
          const [x, y] = def.center(i), d = Math.hypot(x - p.x, y - p.y);
          if (d > 380) continue;
          if (!lineOk(p.x, p.y, x, y)) continue;
          let nb = 0; for (let j = 0; j < n; j++) { if (j === i) continue; const [u, v] = def.center(j); if (Math.hypot(u - x, v - y) < def.R * 1.9 && ok(j)) nb++; }
          let crowd = 0; for (const o of S.p) if (o !== p && o.al) crowd += Math.max(0, 160 - Math.hypot(o.x - x, o.y - y));
          const sc = nb * 12 - S.T[i] * 60 - d * 0.05 - Math.hypot(x - 800, y - 500) * 0.03 - crowd * 0.15 + (i === p._g ? 25 : 0) + Math.random() * 25 * (0.5 + M.err);
          if (sc > bs) { bs = sc; best = i; }
        }
        if (best != null) p._g = best;
      }
      if (p._g == null) return {};
      const [tx, ty] = def.center(p._g);
      return HR.Showcase.toward(p.x, p.y, tx, ty, 20);
    },
    // Laser-Sprung: springt so, dass er gerade in der Luft ist, wenn der Strahl durchläuft (seine Reaktionszeit eingerechnet)
    C2(S, p, def) {
      if (!p.al) return {};
      const SC = HR.Showcase, M = SC.mind || { err: 0 }, lead = SC.lead;
      const pa = Math.atan2(p.y - 520, p.x - 800), d = Math.max(1, Math.hypot(p.x - 800, p.y - 520)), w = 26 / d, sp = Math.max(0.3, S.sp || 1);
      let tmin = 9;
      for (const l of S.L) {
        let gap = ((pa - l.a) * (S.dir || 1)) % 6.283; if (gap < 0) gap += 6.283;
        if (gap > 6.283 - w) gap -= 6.283;                // Strahl steht gerade auf ihm
        tmin = Math.min(tmin, (gap - w) / sp);
      }
      // bester Absprung: die Luftzeit (0,06 s bis 0,56 s nach dem Absprung) liegt mittig um den Durchgang des Strahls
      const roll = () => (Math.random() - 0.5) * 0.22 * (0.4 + M.err);
      if (p._jr == null) p._jr = roll();
      const t = tmin - lead, air = p.z > 0, best = 0.31 - w / sp + p._jr;
      const o = !air && p.jt <= -0.1 && t <= best && t > -0.15 ? { a: 1 } : {};
      if (o.a) p._jr = roll();
      // nahe am Kern ist der Strahl zu breit zum Überspringen: dann zuerst nach außen
      if (d < 230) return Object.assign(HR.Showcase.toward(p.x, p.y, 800 + (p.x - 800) / d * 300, 520 + (p.y - 520) / d * 300, 10), o);
      if (tmin < 0.9 || air) return o;
      p._w = (p._w || 0) + 1;
      const ang = (p.id * 1.7 + p._w * 0.004), tx = 800 + Math.cos(ang) * 280, ty = 520 + Math.sin(ang) * 280;
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
    // Kronenjagd: Nur die zwei Nächsten jagen den Träger, die anderen sammeln Edelsteine oder lauern
    // mit Abstand auf einem eigenen Platz rund um den Träger. So wird der Träger nicht dauernd umzingelt.
    C4(S, p, def) {
      const SC = HR.Showcase, M = SC.mind || { err: 0, bold: 0.5 };
      if (S.cr < 0) return SC.toward(p.x, p.y, S.cx, S.cy, 4);
      if (S.cr === p.id) {
        let fx = 800 - p.x, fy = 510 - p.y; fx *= 0.004; fy *= 0.004;
        for (const q of S.p) if (q !== p && !q.gone) { const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 300 / d; fy += dy / d * 300 / d; }
        return SC.toward(p.x, p.y, p.x + fx * 100, p.y + fy * 100, 2);
      }
      const h = S.p.find(q => q.id === S.cr), d = Math.hypot(h.x - p.x, h.y - p.y);
      // Rolle: Wer zu den nächsten Jägern gehört (mit etwas Vorsprung für den, der schon jagt), jagt
      const live = S.p.filter(q => !q.gone && q !== h), nCh = live.length >= 6 ? 2 : 1;
      const key = q => Math.hypot(h.x - q.x, h.y - q.y) - (q._ch ? 90 : 0);
      const rank = live.filter(q => key(q) < key(p)).length;
      p._ch = rank < nCh && S.imm <= 0.2;
      if (p._ch) {
        const lead = 0.25 + 0.25 * M.bold, tx = h.x + (h.vx || 0) * lead * Math.min(1, d / 300), ty = h.y + (h.vy || 0) * lead * Math.min(1, d / 300);
        return Object.assign(SC.toward(p.x, p.y, tx, ty, 4), d < 160 + 40 * M.bold && S.imm <= 0 && Math.random() < 0.3 ? { a: 1 } : {});
      }
      // Edelstein nur holen, wenn kein anderer (außer dem Träger) näher dran ist
      let e = null, ed = 1e9;
      for (const g of S.gm || []) {
        const dg = Math.hypot(g.x - p.x, g.y - p.y);
        if (dg < ed && !live.some(q => q !== p && Math.hypot(g.x - q.x, g.y - q.y) < dg - 10)) { ed = dg; e = g; }
      }
      if (e && ed < 800) return SC.toward(p.x, p.y, e.x, e.y, 4);
      // lauern: eigener Winkel rund um den Träger, gut 300 Pixel entfernt
      const ang = (p.id * 2.399 + S.time * 0.15) % 6.283, R = 300 + (p.id % 3) * 40;
      const tx = U.clamp(h.x + Math.cos(ang) * R, 170, 1430), ty = U.clamp(h.y + Math.sin(ang) * R * 0.75, 180, 840);
      return SC.toward(p.x, p.y, tx, ty, 30);
    },
    // Schneeball: weicht anfliegenden Bällen aus, dreht sich zum Gegner (8 Richtungen), wirft erst, wenn die Linie passt,
    // und formt neue Bälle, wenn keine mehr da sind
    C5(S, p) {
      if (p.fz > 0 || p.mk > 0) return {};
      const SC = HR.Showcase, M = SC.mind || { err: 0, bold: 0.5 };
      // Ausweichen
      for (const b of S.b) {
        if (b.o === p.id || b.vx == null) continue;
        const rx = p.x - b.x, ry = p.y - 10 - b.y, sp = Math.hypot(b.vx, b.vy) || 1, along = (rx * b.vx + ry * b.vy) / sp;
        if (along < 0 || along > 420) continue;
        const side = (rx * -b.vy + ry * b.vx) / sp;
        if (Math.abs(side) < 40 && Math.random() < 0.85 - M.err) { const s = side >= 0 ? 1 : -1; return SC.toward(0, 0, -b.vy / sp * s, b.vx / sp * s, 0.1); }
      }
      if (!p.am) { p._f = 0; return Math.random() < 0.5 ? { a: 1 } : {}; }
      let t = null, td = 1e9;
      for (const q of S.p) if (q !== p && !q.gone && q.fz <= 0 && q.iv <= 0) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < td) { td = d; t = q; } }
      if (!t) for (const q of S.p) if (q !== p && !q.gone) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < td) { td = d; t = q; } }
      if (!t) return {};
      if (td > 560 - 120 * M.bold) return SC.toward(p.x, p.y, t.x, t.y, 10);
      const ang = Math.atan2(t.y - p.y, t.x - p.x), q = Math.round(ang / (Math.PI / 4)), diff = ang - q * Math.PI / 4;
      const qx = Math.round(Math.cos(q * Math.PI / 4)), qy = Math.round(Math.sin(q * Math.PI / 4));
      const off = Math.abs(Math.sin(diff)) * td;
      if (off < 32 + M.err * 14) {
        // erst umdrehen (Richtung kurz antippen), dann werfen
        const facing = Math.abs(p.lx - qx / Math.hypot(qx, qy)) < 0.2 && Math.abs(p.ly - qy / Math.hypot(qx, qy)) < 0.2;
        if (!facing) return { l: qx < 0, r: qx > 0, u: qy < 0, d: qy > 0 };
        p._f = (p._f || 0) + 1;
        return p._f % 10 < 5 && p.cd <= 0 ? { a: 1 } : {};
      }
      // seitlich auf eine Wurflinie gehen
      const px = -Math.sin(q * Math.PI / 4) * Math.sign(diff), py = Math.cos(q * Math.PI / 4) * Math.sign(diff);
      return SC.toward(0, 0, -px, -py, 0.1);
    },
    // Gedächtnis: merkt sich die Folge mit kleinen Fehlern (je länger die Folge, desto eher), läuft hin und stampft erst,
    // wenn er sicher auf dem Feld steht
    C6(S, p, def) {
      if (!p.al) return {};
      const SC = HR.Showcase, M = SC.mind || { err: 0 };
      if (S.ph !== 'go' || p.ok) { const [x, y] = def.tileXY(5 + (p.id % 2) * 5); return SC.toward(p.x, p.y, x + (p.id % 3) * 30 - 30, y, 30); }
      if (p._rd !== S.rd) {
        p._rd = S.rd; p._pf = -1;
        const pe = (0.006 + 0.014 * Math.max(0, S.n - 3)) * (0.5 + M.err * 2.5);
        p._plan = S.seq.map(t => Math.random() < pe ? (t + 1 + Math.floor(Math.random() * 15)) % 16 : t);
      }
      const t = p._plan[p.pg]; if (t == null) return {};
      const [x, y] = def.tileXY(t), now = SC.now || p;
      const on = def.tileAt(p.x, p.y) === t && def.tileAt(now.x, now.y) === t && Math.abs(x - p.x) < 60 && Math.abs(y - p.y) < 60;
      // genau ein Stampfer pro Feld: drücken, loslassen und warten, bis er gezählt wurde
      if (p._pf === p.pg && S.time - p._pt < SC.lead + 0.35) return p._ph-- > 0 ? { a: 1 } : {};
      if (on) { p._pf = p.pg; p._pt = S.time; p._ph = 6; return { a: 1 }; }
      return SC.toward(p.x, p.y, x, y, 10);
    },
    C7(S, p) {
      if (p.ft) return {};
      if (S.L === 'g') { p._y = null; return { a: 1 }; }
      if (p._y == null) { p._y = S.time; p._rx = 0.08 + Math.random() * 0.3; p._brave = Math.random() < 0.12; }
      return S.time - p._y < p._rx || (p._brave && S.L === 'y') ? { a: 1 } : {};
    },
    // Schatzgräber: nimmt sich einen Hügel (oder liegen gebliebene Münzen) vor, läuft hin, bleibt stehen und gräbt
    C8(S, p) {
      if (p.st > 0) { p._tg = null; return {}; }
      const SC = HR.Showcase, now = SC.now || p;
      let tg = p._tg && (p._tg.m ? S.m.find(m => m.i === p._tg.i && !m.d) : S.drops.find(d => d.i === p._tg.i));
      if (!tg) {
        let bs = 1e9; p._tg = null;
        for (const d of S.drops) { const v = Math.hypot(d.x - p.x, d.y - p.y) - 120; if (v < bs) { bs = v; tg = d; p._tg = { i: d.i, m: 0 }; } }
        for (const m of S.m) {
          if (m.d) continue;
          let crowd = 0; for (const o of S.p) if (o !== p && Math.hypot(o.x - m.x, o.y - m.y) < 60) crowd += 120;
          const v = Math.hypot(m.x - p.x, m.y - p.y) - (m.sp ? 150 : 0) + crowd + Math.random() * 80;
          if (v < bs) { bs = v; tg = m; p._tg = { i: m.i, m: 1 }; }
        }
      }
      if (!tg) return {};
      const dn = Math.hypot(tg.x - now.x, tg.y - now.y), dp = Math.hypot(tg.x - p.x, tg.y - p.y);
      if (p._tg.m && dn < 44 && dp < 44) return { a: 1 };     // stehen bleiben und graben
      return SC.toward(p.x, p.y, tg.x, tg.y, p._tg.m ? 20 : 10);
    },
    C9(S, p) {
      if (p._rd !== S.rd) { const M = HR.Showcase.mind; p._rd = S.rd; p._r = M ? Math.random() * 0.12 * (0.5 + M.err * 2) : 0.19 + Math.random() * 0.28; p._k = 0; }   // mit Reaktionszeit kommt hier nur noch etwas Zögern dazu
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
      // in Laufrichtung gehen und dabei zur Gangmitte rutschen (der Gang ist breit genug für etwas Ungenauigkeit)
      const cx = def.cx(c), cy = def.cy(c), horiz = Math.abs(next - c) === 1, nx = def.cx(next), ny = def.cy(next);
      if (horiz) { const o = nx > p.x ? { r: 1 } : { l: 1 }; if (Math.abs(p.y - cy) > 12) o[p.y < cy ? 'd' : 'u'] = 1; if (Math.abs(p.y - cy) > 22) { delete o.r; delete o.l; } return o; }
      const o = ny > p.y ? { d: 1 } : { u: 1 }; if (Math.abs(p.x - cx) > 12) o[p.x < cx ? 'r' : 'l'] = 1; if (Math.abs(p.x - cx) > 22) { delete o.u; delete o.d; } return o;
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
    // Hüpf-Parcours: folgt dem günstigsten Weg durch das Level (Spalte für Spalte), springt an der Kante ab,
    // steuert in der Luft auf die Landestelle zu und wartet vor Sägen, bis sie oben sind.
    // Zustand (wo er steht) nach der echten Lage, Absprung und Lenken nach der Lage, wenn der Tastendruck ankommt.
    D1(S, p, def) {
      if (p.dead > 0 || p.fin || !S.L || !S.L.adj) { p._to = null; return {}; }
      const SC = HR.Showcase, M = SC.mind || { err: 0, bold: 0.5 }, L = S.L, T = def.T, lead = SC.lead;
      const now = SC.now || p, surf = c => (def.NR - L.top[c]) * T;
      const ac = U.clamp(Math.floor(now.x / T), 0, L.NC - 1);
      // auf welcher Spalte steht er wirklich? (an der Kante zählt die Spalte, auf der die Füße noch Halt haben)
      if (p.og) {
        let c = ac;
        if (!def.stand(L, c) || Math.abs(now.y - surf(c)) > 6) for (const k of [ac - 1, ac + 1]) if (k >= 0 && k < L.NC && def.stand(L, k) && Math.abs(now.y - surf(k)) < 6) c = k;
        if (def.stand(L, c) && Math.abs(now.y - surf(c)) < 6) {
          // geplant wird von der Spalte aus, auf der er ist, wenn sein Tastendruck ankommt (gleich hoher Boden voraus)
          const pc = U.clamp(Math.floor(p.x / T), 0, L.NC - 1), st = pc > c ? 1 : -1;
          let k = c; while (k !== pc && def.stand(L, k + st) && L.top[k + st] === L.top[c] && L.kind[k + st] !== 's') k += st;
          p._on = k;
        }
      } else if (L.kind[ac] === 's' && p.vy < 0 && now.y > surf(ac) - 80) p._on = ac;   // gerade von der Feder abgefedert
      if (p._on == null) p._on = ac;
      const on = p._on;
      if ((p._from !== on && !p._back) || p._to == null) {
        p._from = on; let best = null, bs = 1e9;
        for (const b of L.adj[on] || []) {
          const d = L.dist[b]; if (d < 0) continue;
          const saw = Math.abs(b - on) > 1 && L.saws.some(sw => (sw.c - on) * (sw.c - b) <= 0);   // nicht über eine Säge springen
          const sc = d + def.cost(L, on, b) + (b < on ? 2 : 0) + (saw ? 12 : 0) + Math.random() * 2 * M.err;
          if (sc < bs) { bs = sc; best = b; }
        }
        p._to = best;
      }
      if (on === L.goal) return { r: 1 };   // an der Zielflagge: nur noch hinlaufen
      const to = p._to;
      if (to == null) return { r: 1 };
      const dir = to > on ? 1 : to < on ? -1 : 0, tx = (to + 0.5) * T, far = Math.abs(to - on), up = L.top[to] - L.top[on];
      const o = {};
      // Sprungtaste: nach dem Absprung halten (hoher Sprung) oder kurz tippen (kleiner Hüpfer); der Druck kommt erst nach der Reaktionszeit an
      const high = up >= 1 || far >= 3 || L.kind[on] === 's';
      const pressing = p._jt != null && S.time - p._jt < lead + 0.1;   // Druck ist noch unterwegs
      if (pressing || (!p.og && p.vy < 0 && high)) o.a = 1;
      if (!pressing) p._jt = null;
      if (p.og && !pressing) {
        // Säge auf dem Weg? Vor ihr warten, bis sie hoch genug ist und noch eine Weile oben bleibt
        for (const s of L.saws) {
          const ahead = (def.sawX(s) - p.x) * (dir || 1);
          if (ahead > 30 && ahead < 200) {
            const top = surf(s.c) - 150, tt = (ahead + 60) / def.RUN + 0.1;
            const low = [0, 0.5, 1].some(f => def.sawY(s, S.time + lead + tt * f) > top);
            if (low && ahead < 120) return o;
          }
        }
        const plain = dir && far === 1 && up <= 0 && L.kind[to] !== 's';
        if (dir) o[dir > 0 ? 'r' : 'l'] = 1;
        if (!dir) { if (Math.abs(tx - p.x) > 12) o[tx > p.x ? 'r' : 'l'] = 1; return o; }
        if (!plain) {
          const edgeX = dir > 0 ? (on + 1) * T : on * T, toEdge = (edgeX - p.x) * dir;   // p.x: Lage, wenn der Druck ankommt
          const wall = far === 1 && up > 0;
          const slow = far >= 3 && p.vx * dir < def.RUN * 0.8;
          // für weite Sprünge erst Anlauf nehmen: ein Stück zurück, dann mit vollem Tempo zur Kante
          let room = 1; while (room < 4 && def.stand(L, on - dir * room) && L.top[on - dir * room] === L.top[on] && L.kind[on - dir * room] !== 's') room++;
          const maxBack = room * T - 30;
          if (slow && toEdge < 50 && !p._back && maxBack > 110) p._back = 1;
          if (p._back) {
            if (toEdge >= Math.min(150, maxBack)) p._back = 0;
            else { delete o.r; delete o.l; o[dir > 0 ? 'l' : 'r'] = 1; return o; }
          }
          if (toEdge < 14 + 12 * M.bold || (wall && toEdge < 34)) { o.a = 1; p._jt = S.time; }
        }
        return o;
      }
      // in der Luft: Landestelle ohne Lenken vorausberechnen und nachsteuern
      // (mit der echten Lage und den Tasten, die schon gedrückt, aber noch nicht angekommen sind)
      const sy = surf(to), G2 = def.GRAV, disc = p.vy * p.vy + 2 * G2 * (sy - now.y);
      const tl = disc > 0 ? (-p.vy + Math.sqrt(disc)) / G2 : 0.3;
      const pd = SC.pend || { l: 0, r: 0 }, vx1 = U.clamp(p.vx + def.AIR * (pd.r - pd.l), -def.RUN, def.RUN);
      const land = now.x + (p.vx + vx1) / 2 * Math.min(lead, tl) + vx1 * Math.max(0, tl - lead);
      // irgendwo auf dem Stück Boden landen, zu dem die Zielspalte gehört (nicht genau auf ihrer Mitte)
      let a0 = to, a1 = to;
      while (a0 - 1 >= 0 && def.stand(L, a0 - 1) && L.top[a0 - 1] === L.top[to] && L.kind[a0 - 1] !== 's') a0--;
      while (a1 + 1 < L.NC && def.stand(L, a1 + 1) && L.top[a1 + 1] === L.top[to] && L.kind[a1 + 1] !== 's') a1++;
      const m = 22 + 14 * M.err, lo = L.kind[to] === 's' ? tx - 8 : a0 * T + m, hi = L.kind[to] === 's' ? tx + 8 : (a1 + 1) * T - m;
      // weiter voraus ist besser (dort geht es weiter), aber nicht über das Stück hinaus
      const aim = dir >= 0 ? Math.min(hi, Math.max(lo, tx)) : Math.max(lo, Math.min(hi, tx));
      if (land > hi) o.l = 1; else if (land < lo) o.r = 1; else if (Math.abs(land - aim) > 90 && (aim - land) * dir > 0) o[dir > 0 ? 'r' : 'l'] = 1;
      return o;
    },
    // Straße: hüpft Feld für Feld, jeweils erst, wenn die nächste Spur zum Zeitpunkt der Landung frei ist
    // (seine Reaktionszeit eingerechnet); nach jedem Sprung kurz loslassen und neu schauen
    B10(S, p, def) {
      if (p.dead > 0) { p._hr = null; return {}; }
      const SC = HR.Showcase, M = SC.mind || { err: 0, bold: 0.5 }, L0 = SC.lead;
      if (p._hr != null) {
        // auf den letzten Sprung warten
        if (p.r === p._hr && S.time - p._ht < L0 + 0.3) return p._hk-- > 0 ? p._hb : {};
        p._hr = null;
      }
      const marg = 44 + 30 * (1 - M.bold) + 20 * M.err;
      const safe = (r, x, tt) => {
        const L = S.lanes[r];
        if (!L) return true;
        if (L.type === 'road') {
          for (const o of L.o) for (const dt of [0, 0.2, 0.45, 0.7]) { const ox = def.ox(L, o, S.time + tt + dt); if (x + marg > ox && x - marg < ox + L.len) return false; }
        } else if (L.type === 'river') {
          for (const dt of [0, 0.3]) {
            const ox = L.o.map(([o, len]) => [def.ox(L, o, S.time + tt + dt), len]);
            const xx = x + L.dir * L.sp * dt;
            if (!ox.some(([a, len]) => xx > a + 30 && xx < a + len - 30) || xx < 90 || xx > 1510) return false;
          }
        }
        return true;
      };
      const go = b => { p._hr = p.r; p._ht = S.time; p._hk = 5; p._hb = b; return b; };
      const t = L0 + 0.05;
      // auf dem Fluss treibt er mit: vorhersagen, wo er bei der Landung ist
      const L = S.lanes[p.r], drift = L && L.type === 'river' ? L.dir * L.sp * t : 0;
      if (safe(p.r + 1, p.x + drift, t)) return go({ u: 1 });
      if (!safe(p.r, p.x + drift, t) && S.lanes[p.r].type === 'road' && safe(p.r - 1, p.x, t)) return go({ d: 1 });
      // auf dem Fluss nicht aus dem Bild treiben lassen
      if (L && L.type === 'river' && (p.x < 260 || p.x > 1340) && safe(p.r, p.x + (p.x < 800 ? 1 : -1) * def.CW, t)) return go(p.x < 800 ? { r: 1 } : { l: 1 });
      return {};
    },
  },
};
