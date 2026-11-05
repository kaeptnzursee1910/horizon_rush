// D1 Hüpf-Parcours: Jump and Run von der Seite, wer zuerst an der Zielflagge ist, gewinnt.
// Jede Runde ein neues Level aus dem gemeinsamen Startwert. Jedes Level wird beim Erzeugen geprüft
// (Wegsuche über alle Stellen, auf denen man stehen kann); ist es nicht lösbar, wird ein neues gebaut.
// Die Prüfung rechnet nur mit ganzen Zahlen, daher kommt auf allen Geräten dasselbe Level heraus.
'use strict';

HR.AR.define({
  code: 'D1', name: 'Hüpf-Parcours', short: 'Schnell zur Zielflagge!',
  desc: 'Ein Jump and Run von der Seite: Alle starten gleichzeitig und rennen, springen und federn über Abgründe, Stacheln, schwebende Plattformen und an Kreissägen vorbei. Wer stürzt oder sich verletzt, macht an der letzten Zwischenflagge weiter. Jedes Mal ist es ein neues Level.',
  goal: 'Als Erster die karierte Zielflagge erreichen.',
  touch: 'Steuerkreuz ◀ ▶ laufen, rechts SPRUNG (länger halten = höher)', keys: '← → laufen, Leertaste, ↑ oder W springen (länger halten = höher)',
  btns: [['act', 'SPRUNG']],
  W: 1600, H: 960, duration: 150, bgTop: '#2878dc', bgBot: '#afd7fa',
  T: 64, NR: 15, PW: 34, PH: 50,
  RUN: 410, ACC: 3200, AIR: 2300, GRAV: 2600, JUMP: 1060, CUT: 380, SPRING: 1520, FALL: 1500, COYOTE: 0.09, BUF: 0.13,
  AFTER: 25, botLapse: 'hold', botReact: 0.55,   // so lange dürfen die anderen noch, wenn der Erste im Ziel ist

  // ---------- Level ----------
  // Feldarten: 0 frei, 1 fester Block, 2 Stacheln, 3 Sprungfeder (fest, wirft beim Landen hoch)
  level(seed) {
    const rnd = U.rng(seed >>> 0);
    for (let tries = 0; tries < 30; tries++) {
      const L = this.build(rnd);
      if (this.check(L)) return L;
    }
    return this.build(rnd, true);   // Notfall: einfaches Level, das immer geht
  },

  build(rnd, easy) {
    const T = this.T, NR = this.NR, LEN = easy ? 80 : rnd.randint(108, 138), MAX = LEN + 40;
    const H = new Array(MAX).fill(0);       // Bodenhöhe in Feldern (0 = Abgrund)
    const top = new Array(MAX).fill(0);     // Oberkante, auf der man steht (Boden, Plattform oder Feder)
    const kind = new Array(MAX).fill('g');  // g Boden, p Plattform, s Feder, x Stacheln, - nichts
    let NC = MAX;
    const saws = [], cps = [];
    let c = 0, h = 3;
    const ground = (n, hh) => { for (let k = 0; k < n && c < NC; k++, c++) { H[c] = hh; top[c] = hh; kind[c] = 'g'; } };
    ground(9, h);
    const end = LEN;
    let lastCp = 0;
    while (c < end) {
      const d = c / LEN;   // Schwierigkeit steigt nach hinten
      // Zwischenflaggen bei etwa einem und zwei Dritteln, immer auf einem flachen Stück
      if (cps.length < 2 && c > LEN * (cps.length + 1) / 3 && c - lastCp > 20) { ground(2, h); cps.push(c - 1); lastCp = c; ground(2, h); continue; }
      const t = easy ? rnd.choices(['flat', 'gap', 'up', 'down'], [3, 2, 2, 2]) :
        rnd.choices(['flat', 'gap', 'up', 'down', 'spikes', 'plats', 'spring', 'saw', 'stairs'], [2, 3, 2, 2, 3, 2.5, 1.5, 2, 1.5]);
      if (t === 'flat') ground(rnd.randint(2, 4), h);
      else if (t === 'up') { const k = rnd.randint(1, d > 0.4 ? 3 : 2); if (h + k <= 9) h += k; ground(rnd.randint(2, 4), h); }
      else if (t === 'down') { const k = rnd.randint(1, 3); h = Math.max(2, h - k); ground(rnd.randint(2, 4), h); }
      else if (t === 'gap') {
        const w = easy ? 2 : rnd.randint(2, d > 0.45 ? 4 : 3);
        for (let k = 0; k < w && c < NC; k++, c++) kind[c] = '-';
        const nh = Math.max(2, Math.min(9, h + rnd.randint(-2, w <= 3 ? 1 : 0)));
        h = nh; ground(rnd.randint(2, 4), h);
      } else if (t === 'spikes') {
        const w = rnd.randint(1, d > 0.5 ? 3 : 2);
        for (let k = 0; k < w && c < NC; k++, c++) { H[c] = h; top[c] = h; kind[c] = 'x'; }
        ground(rnd.randint(2, 3), h);
      } else if (t === 'plats') {
        // schwebende Plattformen über einem Abgrund
        const n = rnd.randint(2, d > 0.5 ? 4 : 3);
        let ph = h;
        for (let k = 0; k < n; k++) {
          const gap = rnd.randint(1, 2);
          for (let j = 0; j < gap && c < NC; j++, c++) kind[c] = '-';
          ph = Math.max(3, Math.min(9, ph + rnd.randint(-1, 2)));
          const w = rnd.randint(2, 3);
          for (let j = 0; j < w && c < NC; j++, c++) { top[c] = ph; kind[c] = 'p'; }
        }
        for (let j = 0, gap = rnd.randint(1, 2); j < gap && c < NC; j++, c++) kind[c] = '-';
        h = Math.max(2, Math.min(9, ph + rnd.randint(-1, 1))); ground(rnd.randint(2, 3), h);
      } else if (t === 'spring') {
        // Feder vor einer hohen Wand: ohne Feder kommt man nicht hinauf
        if (h > 5) { h -= 2; ground(2, h); }
        ground(rnd.randint(1, 2), h);
        if (c < NC) { H[c] = h; top[c] = h + 1; kind[c] = 's'; c++; }
        ground(1, h);
        h = Math.min(11, h + rnd.randint(4, 5)); ground(rnd.randint(3, 4), h);
        if (h > 9) { h -= 2; ground(2, h); }
      } else if (t === 'saw') {
        // Kreissäge fährt über einem flachen Stück auf und ab: unten durchlaufen, wenn sie oben ist
        const n = 5; const at = c + 2;
        ground(n, h);
        saws.push({ c: at, lo: h, hi: h + 4, per: rnd.randint(18, 28) / 10, ph: rnd.randint(0, 9) / 10 });
      } else if (t === 'stairs') {
        // einzelne Stufen mit Lücken dazwischen
        const n = rnd.randint(2, 3);
        for (let k = 0; k < n; k++) {
          for (let j = 0, gap = rnd.randint(1, 2); j < gap && c < NC; j++, c++) kind[c] = '-';
          if (h + 1 <= 9) h++;
          ground(rnd.randint(1, 2), h);
        }
      }
    }
    // Ziel: flaches Stück mit Flagge am Ende
    ground(9, h);
    NC = c; H.length = top.length = kind.length = NC;
    const goal = NC - 5, grid = new Uint8Array(NC * NR);
    // Raster füllen
    for (let x = 0; x < NC; x++) {
      if (kind[x] === 'g' || kind[x] === 'x' || kind[x] === 's') for (let r = NR - H[x]; r < NR; r++) grid[r * NC + x] = 1;
      if (kind[x] === 'x') grid[(NR - H[x] - 1) * NC + x] = 2;
      if (kind[x] === 's') grid[(NR - H[x] - 1) * NC + x] = 3;
      if (kind[x] === 'p') grid[(NR - top[x]) * NC + x] = 1;
    }
    return { NC, grid, top, kind, saws, cps, goal, W: NC * T };
  },

  // Kann man von Spalte a (Oberkante ha) nach Spalte b springen? Werte vorsichtig gewählt
  // (die echte Sprungweite ist etwas größer), damit jede Prüfung auch im Spiel klappt.
  reach(L, a, b) {
    const dx = Math.abs(b - a), dy = L.top[b] - L.top[a];
    if (dx < 1) return false;
    let max;
    if (L.kind[a] === 's') max = dy > 5 ? -1 : 4;
    else max = dy >= 4 ? -1 : dy === 3 ? 2 : dy === 2 ? 3 : dy === 1 ? 4 : dy >= -2 ? 5 : 6;
    if (dx > max) return false;
    // nichts Höheres dazwischen, das den Sprung blockiert
    const hi = Math.max(L.top[a], L.top[b]) + (L.kind[a] === 's' ? 5 : 0);
    for (let k = Math.min(a, b) + 1; k < Math.max(a, b); k++) if (L.kind[k] !== '-' && L.top[k] > hi) return false;
    // unter einer Plattform hindurch hoch springen geht nicht (Kopf stößt an)
    return true;
  },
  stand(L, c) { const k = L.kind[c]; return k === 'g' || k === 'p' || k === 's'; },
  edges(L, a) {
    const o = [];
    for (let b = Math.max(0, a - 7); b <= Math.min(L.NC - 1, a + 7); b++) if (b !== a && this.stand(L, b) && this.reach(L, a, b)) o.push(b);
    return o;
  },

  // Wegsuche vom Start bis zur Flagge; nebenbei der Abstand jeder Spalte zum Ziel (für die Computer-Spieler)
  check(L) {
    const NC = L.NC, adj = [];
    for (let a = 0; a < NC; a++) adj.push(this.stand(L, a) ? this.edges(L, a) : []);
    // rückwärts vom Ziel: Kosten = Weg in Spalten, jeder nötige Sprung kostet etwas extra (so laufen Computer-Spieler
    // auf ebenem Boden, statt ständig zu springen). Ganzzahlig, damit es überall gleich herauskommt.
    const dist = new Array(NC).fill(-1), rev = []; for (let a = 0; a < NC; a++) rev.push([]);
    for (let a = 0; a < NC; a++) for (const b of adj[a]) rev[b].push(a);
    const cost = (a, b) => this.cost(L, a, b);
    dist[L.goal] = 0; const done = new Uint8Array(NC);
    for (;;) {
      let u = -1; for (let a = 0; a < NC; a++) if (!done[a] && dist[a] >= 0 && (u < 0 || dist[a] < dist[u])) u = a;
      if (u < 0) break;
      done[u] = 1;
      for (const a of rev[u]) { const d = dist[u] + cost(a, u); if (dist[a] < 0 || d < dist[a]) dist[a] = d; }
    }
    L.adj = adj; L.dist = dist;
    if (dist[2] < 0) return false;
    for (const c of L.cps) if (dist[c] < 0) return false;
    // keine Sackgasse: von jeder erreichbaren Stelle aus muss das Ziel erreichbar bleiben
    const seen = new Uint8Array(NC), f = [2]; seen[2] = 1;
    for (let h = 0; h < f.length; h++) for (const b of adj[f[h]]) if (!seen[b]) { seen[b] = 1; f.push(b); }
    for (const a of f) if (dist[a] < 0) return false;
    return true;
  },

  cost(L, a, b) { const dx = Math.abs(b - a); return dx * 2 + (dx === 1 && L.top[b] <= L.top[a] && L.kind[b] !== 's' ? 0 : 3); },

  sawY(s, t) {
    // Dreieckswelle (ohne Winkelfunktionen, damit alle Geräte genau gleich rechnen)
    const u = ((t / s.per + s.ph) % 1 + 1) % 1, k = u < 0.5 ? u * 2 : 2 - u * 2;
    const T = this.T, yLo = (this.NR - s.lo) * T - 30, yHi = (this.NR - s.hi) * T - 30;
    return yLo + (yHi - yLo) * k;
  },
  sawX(s) { return (s.c + 0.5) * this.T; },

  cell(L, x, y) {
    const c = Math.floor(x / this.T), r = Math.floor(y / this.T);
    if (c < 0 || c >= L.NC) return 1;
    if (r < 0 || r >= this.NR) return 0;
    return L.grid[r * L.NC + c];
  },
  solid(L, x, y) { const v = this.cell(L, x, y); return v === 1 || v === 3; },

  spawn(S, p, cp) {
    const L = S.L, col = cp < 0 ? 2 : L.cps[cp], idx = S.p.indexOf(p);
    p.x = (col + 0.5) * this.T + ((idx % 4) - 1.5) * 9; p.y = (this.NR - L.top[col]) * this.T - 0.01;
    p.vx = 0; p.vy = 0; p.og = 1; p.co = 0; p.bf = 0; p.dead = 0; p.f = 1;
  },

  init(players, rnd) {
    const seed = rnd.randint(1, 1e9);
    const S = { seed, L: this.level(seed), first: -1, fx: [],
      p: players.map(pl => ({ id: pl.id, c: pl.c, x: 0, y: 0, vx: 0, vy: 0, og: 1, co: 0, bf: 0, f: 1, cp: -1, dead: 0, fin: 0, best: 0, jh: 0 })) };
    for (const p of S.p) this.spawn(S, p, -1);
    return S;
  },

  die(S, p, G) {
    if (p.dead > 0 || p.fin) return;
    p.dead = 0.85; S.fx.push([Math.round(p.x), Math.round(p.y - 25), +S.time.toFixed(2)]); G.sfx('crash', p.id);
  },

  step(S, inp, dt, G) {
    const L = S.L, T = this.T, hw = this.PW / 2, ph = this.PH;
    for (const p of S.p) {
      if (p.gone || p.fin) continue;
      if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) this.spawn(S, p, p.cp); continue; }
      const i = inp[p.id];
      const want = (i.r ? 1 : 0) - (i.l ? 1 : 0);
      if (want) p.f = want;
      const acc = p.og ? this.ACC : this.AIR;
      if (want) p.vx += want * acc * dt; else if (p.og) p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), this.ACC * 1.4 * dt);
      else p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), 500 * dt);
      p.vx = U.clamp(p.vx, -this.RUN, this.RUN);
      // Springen mit kurzer Nachsicht: kurz nach dem Verlassen der Kante und kurz vor dem Landen zählt der Druck noch
      const jp = i.pa || i.pu, jh = i.a || i.u;
      if (jp) p.bf = this.BUF; else p.bf = Math.max(0, p.bf - dt);
      p.co = p.og ? this.COYOTE : Math.max(0, p.co - dt);
      if (p.bf > 0 && p.co > 0) { p.vy = -this.JUMP; p.og = 0; p.co = 0; p.bf = 0; p.jh = 1; G.sfx('blip', p.id); }
      if (!jh && p.jh && p.vy < -this.CUT) p.vy = -this.CUT;   // früh loslassen = kleiner Sprung
      if (p.vy >= 0) p.jh = 0;
      p.vy = Math.min(this.FALL, p.vy + this.GRAV * dt);
      // waagrecht bewegen und an Wänden anhalten
      let nx = p.x + p.vx * dt;
      const sx = p.vx > 0 ? nx + hw : nx - hw;
      if (this.solid(L, sx, p.y - 4) || this.solid(L, sx, p.y - ph + 4) || this.solid(L, sx, p.y - ph / 2)) {
        nx = p.vx > 0 ? Math.floor(sx / T) * T - hw - 0.01 : Math.floor(sx / T + 1) * T + hw + 0.01; p.vx = 0;
      }
      p.x = U.clamp(nx, hw + 2, L.W - hw - 2);
      // senkrecht
      let ny = p.y + p.vy * dt;
      p.og = 0;
      if (p.vy >= 0) {
        if (this.solid(L, p.x - hw + 3, ny) || this.solid(L, p.x + hw - 3, ny)) {
          const r = Math.floor(ny / T);
          // Sprungfeder unter den Füßen?
          const spring = this.cell(L, p.x - hw + 3, ny) === 3 || this.cell(L, p.x + hw - 3, ny) === 3;
          ny = r * T - 0.01;
          if (spring) { p.vy = -this.SPRING; p.jh = 0; G.sfx('go', p.id); }
          else { p.vy = 0; p.og = 1; }
        }
      } else if (this.solid(L, p.x - hw + 3, ny - ph) || this.solid(L, p.x + hw - 3, ny - ph)) {
        ny = Math.floor((ny - ph) / T + 1) * T + ph + 0.01; p.vy = 0;   // Kopf gestoßen
      }
      p.y = ny;
      // Gefahren: Stacheln, Sägen, Abgrund
      // Stacheln: zählt die Mitte der Füße im unteren Teil des Feldes (wer am Rand davor steht, ist sicher)
      // (beim Absprung über die Stacheln hinweg zählt es nicht, nur wer hineintritt oder hineinfällt)
      const sp = (x, y) => this.cell(L, x, y) === 2 && y % T > T * 0.6;
      if (p.vy >= 0 && (sp(p.x, p.y - 2) || sp(p.x, p.y - 12))) { this.die(S, p, G); continue; }
      for (const s of L.saws) {
        const sx2 = this.sawX(s), sy = this.sawY(s, S.time);
        const ex = Math.max(0, Math.abs(sx2 - p.x) - (hw - 4)), ey = Math.max(0, Math.abs(sy - (p.y - ph / 2)) - (ph / 2 - 4));
        if (ex * ex + ey * ey < 30 * 30) { this.die(S, p, G); break; }
      }
      if (p.dead > 0) continue;
      if (p.y > this.NR * T + 60) { this.die(S, p, G); continue; }
      // Zwischenflaggen und Ziel
      const col = Math.floor(p.x / T);
      for (let k = L.cps.length - 1; k > p.cp; k--) if (col >= L.cps[k]) { p.cp = k; G.sfx('select', p.id); break; }
      p.best = Math.max(p.best, p.x);
      if (p.x >= (L.goal + 0.5) * T) {
        p.fin = 1; p.ft = S.time; p.vx = 0; G.sfx('lap', p.id);
        if (S.first < 0) { S.first = S.time; G.sfx('finish'); }
      }
    }
    S.fx = S.fx.filter(f => S.time - f[2] < 0.8);
  },

  over(S) {
    const live = S.p.filter(p => !p.gone);
    return live.every(p => p.fin) || (S.first >= 0 && S.time - S.first >= this.AFTER);
  },
  rank(S) {
    const W = (S.L.goal + 0.5) * this.T;
    return S.p.filter(p => !p.gone).map(p => p.fin
      ? { id: p.id, s: 1e6 - p.ft * 100, txt: 'Ziel nach ' + U.fmtTime(p.ft) }
      : { id: p.id, s: Math.round(p.best / W * 1000), txt: Math.min(99, Math.floor(p.best / W * 100)) + ' % geschafft' }).sort((a, b) => b.s - a.s);
  },
  status(S, p) { return p.fin ? '✓ ' + U.fmtTime(p.ft).replace(/^0:/, '') : Math.min(99, Math.floor(p.best / ((S.L.goal + 0.5) * this.T) * 100)) + ' %'; },
  spot: (S, p) => [p.x, p.y - 30],
  kill(S, p) { p.gone = 1; },

  pack(S) {
    return { t: +S.time.toFixed(3), fs: +S.first.toFixed(2), fx: S.fx,
      p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), og: p.og, f: p.f, cp: p.cp, d: p.dead > 0 ? 1 : 0, fin: p.fin, ft: p.ft || 0, b: Math.round(p.best), g: p.gone ? 1 : 0 })) };
  },
  unpack(S, d) {
    S.time = d.t; S.first = d.fs; S.fx = d.fx;
    d.p.forEach((q, i) => { const p = S.p[i]; Object.assign(p, { x: q.x, y: q.y, vx: q.vx, vy: q.vy, og: q.og, f: q.f, cp: q.cp, dead: q.d, fin: q.fin, ft: q.ft, best: q.b, gone: q.g }); });
  },

  // ---------- Zeichnen ----------
  // Kamera: folgt dem eigenen Spieler; im Ziel, beim Zuschauen und im Hintergrund dem besten noch Laufenden
  camTarget(S, G) {
    const me = S.p.find(p => p.id === G.me && !p.gone);
    if (me && !me.fin && !G.show) return me;
    const run = S.p.filter(p => !p.gone && !p.fin);
    return (run.length ? run : S.p).reduce((a, b) => (b.x > a.x ? b : a));
  },

  draw(g, S, G) {
    const L = S.L, T = this.T, NR = this.NR, neon = HR.THEME === 'neon', ST = HR.ST;
    const tg = this.camTarget(S, G);
    const want = U.clamp(tg.x - 640, 0, Math.max(0, L.W - 1600));
    G._cam = G._cam == null || Math.abs(G._cam - want) > 900 ? want : G._cam + (want - G._cam) * 0.15;
    const cam = G._cam;
    G.world(g);
    g.beginPath(); g.rect(0, 0, 1600, 960); g.clip();
    // Himmel und Hintergrund
    if (neon) {
      const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#07060f'); gr.addColorStop(1, '#1d0d36');
      g.fillStyle = gr; g.fillRect(0, 0, 1600, 960);
      g.strokeStyle = 'rgba(155,92,255,.18)'; g.lineWidth = 2;
      for (let k = 0; k < 14; k++) { const x = ((k * 230 - cam * 0.3) % 3220 + 3220) % 3220 - 200; g.beginPath(); g.moveTo(x, 960); g.lineTo(x + 160, 600 - (k % 3) * 70); g.lineTo(x + 320, 960); g.stroke(); }
    } else {
      const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#5aa8ec'); gr.addColorStop(1, '#cfeafc');
      g.fillStyle = gr; g.fillRect(0, 0, 1600, 960);
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let k = 0; k < 7; k++) { const x = ((k * 410 - cam * 0.15) % 2870 + 2870) % 2870 - 200, y = 90 + (k * 53) % 160; g.beginPath(); g.ellipse(x, y, 90, 26, 0, 0, 7); g.ellipse(x + 50, y - 14, 60, 24, 0, 0, 7); g.fill(); }
      g.fillStyle = '#9cc98a';
      for (let k = 0; k < 9; k++) { const x = ((k * 330 - cam * 0.35) % 2970 + 2970) % 2970 - 300; g.beginPath(); g.ellipse(x, 900, 260, 230 - (k % 3) * 50, 0, Math.PI, 0); g.fill(); }
    }
    g.save(); g.translate(-cam, 0);
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(L.NC - 1, Math.ceil((cam + 1600) / T) + 1);
    // Blöcke
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < NR; r++) {
        const v = L.grid[r * L.NC + c], x = c * T, y = r * T;
        if (v === 1) {
          const topEdge = r === 0 || L.grid[(r - 1) * L.NC + c] !== 1;
          const plat = L.kind[c] === 'p';
          if (neon) {
            g.fillStyle = plat ? '#241a44' : '#151027'; g.fillRect(x, y, T, T);
            g.strokeStyle = 'rgba(155,92,255,.35)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, T - 2, T - 2);
            if (topEdge) { g.fillStyle = plat ? '#ff2bd6' : '#18e7ff'; g.fillRect(x, y, T, 5); }
          } else if (plat) {
            g.fillStyle = '#6f6f75'; g.fillRect(x, y, T, T);
            for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f0f0f0' : '#cd2d2d'; g.fillRect(x + k * T / 4, y, T / 4, 10); }
            g.strokeStyle = ST.INK; g.lineWidth = 2; g.strokeRect(x, y, T, T);
          } else {
            g.fillStyle = (c + r) % 2 ? '#b07a48' : '#a8703f'; g.fillRect(x, y, T, T);
            if (topEdge) { g.fillStyle = '#6ebe50'; g.fillRect(x, y, T, 16); g.fillStyle = '#5aa83e'; g.fillRect(x, y + 14, T, 4); }
            g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 10 + (c * 7) % 30, y + 26 + (r * 5) % 20, 8, 6);
          }
        } else if (v === 2) {
          for (let k = 0; k < 3; k++) {
            g.beginPath(); g.moveTo(x + k * T / 3 + 2, y + T); g.lineTo(x + k * T / 3 + T / 6, y + T * 0.38); g.lineTo(x + (k + 1) * T / 3 - 2, y + T); g.closePath();
            if (neon) { g.fillStyle = '#ff3355'; g.fill(); } else ST.fill(g, '#d8dce4', 2);
          }
        } else if (v === 3) {
          // Sprungfeder: Feder unten, rote Platte oben
          g.strokeStyle = neon ? '#ffe23d' : '#3a3a40'; g.lineWidth = 5; g.beginPath();
          for (let k = 0; k <= 6; k++) g.lineTo(x + T / 2 + (k % 2 ? 16 : -16), y + T - 4 - k * 6);
          g.stroke();
          ST.rrect(g, x + 4, y + 14, T - 8, 14, 5);
          if (neon) { g.fillStyle = '#ffe23d'; g.fill(); } else ST.fill(g, '#e23c37', 3);
          if (!neon) { g.fillStyle = '#fff'; g.fillRect(x + 12, y + 18, T - 24, 4); }
        }
      }
      // Wasser im Abgrund
      if (L.kind[c] === '-' || L.kind[c] === 'p') { g.fillStyle = neon ? 'rgba(24,231,255,.25)' : '#3f8fd0'; g.fillRect(c * T, NR * T - 26, T, 26); }
    }
    // Zwischenflaggen und Ziel
    const meP = S.p.find(p => p.id === G.me);
    L.cps.forEach((c, k) => {
      const x = (c + 0.5) * T, y = (NR - L.top[c]) * T, on = meP ? meP.cp >= k : false;
      g.fillStyle = neon ? '#e8f4ff' : '#555'; g.fillRect(x - 3, y - 110, 6, 110);
      g.beginPath(); g.moveTo(x + 3, y - 110); g.lineTo(x + 52, y - 94); g.lineTo(x + 3, y - 78); g.closePath();
      if (neon) { g.fillStyle = on ? '#b6ff2e' : '#9b5cff'; g.fill(); } else ST.fill(g, on ? '#3cc35f' : '#f0c43c', 3);
    });
    {
      const x = (L.goal + 0.5) * T, y = (NR - L.top[L.goal]) * T;
      g.fillStyle = neon ? '#e8f4ff' : '#444'; g.fillRect(x - 4, y - 190, 8, 190);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? (neon ? '#18e7ff' : '#111') : '#fff'; g.fillRect(x + 4 + i * 14, y - 188 + j * 14, 14, 14); }
      g.strokeStyle = ST.INK; g.lineWidth = 2; g.strokeRect(x + 4, y - 188, 84, 56);
    }
    // Sägen
    for (const s of L.saws) {
      const x = this.sawX(s); if (x < cam - 100 || x > cam + 1700) continue;
      const y = this.sawY(s, S.time);
      g.strokeStyle = neon ? 'rgba(255,226,61,.4)' : 'rgba(40,40,48,.45)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, (NR - s.lo) * T - 30); g.lineTo(x, (NR - s.hi) * T - 30); g.stroke();
      g.save(); g.translate(x, y); g.rotate(S.time * 9);
      g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283, r = k % 2 ? 34 : 26; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
      if (neon) { g.fillStyle = '#ffe23d'; g.fill(); } else ST.fill(g, '#c8ccd4', 3);
      g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fillStyle = neon ? '#07060f' : '#555'; g.fill();
      g.restore();
    }
    // Figuren (eigene zuletzt, damit sie vorn ist)
    const list = S.p.filter(p => !p.gone).sort((a, b) => (a.id === G.me) - (b.id === G.me));
    for (const p of list) {
      if (p.dead > 0) continue;
      const air = !p.og;
      G.fig(g, p, p.x, p.y - 26, 24, { look: [p.f || 1, air ? (p.vy < 0 ? -0.5 : 0.5) : 0], squash: air ? (p.vy < 0 ? -0.1 : 0.06) : 0, noShadow: true, alpha: p.fin ? 0.55 : 1 });
    }
    for (const f of S.fx) HR.ST.burst(g, f[0], f[1], (S.time - f[2]) / 0.8, neon ? '#ff2bd6' : '#ffd23c', 12, 70);
    g.restore();
  },

  hud(g, S, G, W, H, sc) {
    const L = S.L, Wd = (L.goal + 0.5) * this.T, T = HR.ST.text;
    // Fortschrittsbalken oben in der Mitte
    const bw = Math.min(W * 0.42, 520 * sc), bx = W / 2 - bw / 2, by = 22 * sc;
    g.fillStyle = 'rgba(15,20,45,.8)'; g.beginPath(); g.roundRect(bx - 8, by - 10, bw + 16, 20, 10); g.fill();
    for (const k of L.cps) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(bx + (k + 0.5) * this.T / Wd * bw - 1, by - 7, 2, 14); }
    g.fillStyle = '#fff'; g.fillRect(bx + bw - 2, by - 9, 4, 18);
    for (const p of S.p) {
      if (p.gone) continue;
      const x = bx + U.clamp(p.x / Wd, 0, 1) * bw;
      g.fillStyle = G.rgb(p); g.beginPath(); g.arc(x, by, p.id === G.me ? 8 : 6, 0, 7); g.fill();
      if (p.id === G.me) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    }
    const me = S.p.find(p => p.id === G.me);
    if (me && me.fin && G.phase === 'play') {
      const place = S.p.filter(p => p.fin && p.ft <= me.ft).length;
      T(g, 'IM ZIEL!  Platz ' + place, W / 2, H * 0.2, 40 * sc, 'rgb(255,210,40)');
    } else if (S.first >= 0 && G.phase === 'play') {
      T(g, 'Noch ' + Math.max(0, Math.ceil(this.AFTER - (S.time - S.first))) + ' s!', W / 2, by + 34 * sc, 24 * sc, 'rgb(255,120,100)');
    }
    if (me && me.dead > 0 && G.phase === 'play') T(g, 'Autsch! Gleich geht es weiter …', W / 2, H * 0.3, 26 * sc, '#fff');
  },
});
