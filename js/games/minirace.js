// B4 Mini-Rennen von oben: kleine Autos auf Esstisch, Werkbank oder im Sandkasten.
// Alle sehen dasselbe Bild, die Kamera folgt dem Führenden. Wer aus dem Bild fällt, verliert den Lauf.
'use strict';

HR.AR.define({
  code: 'B4', name: 'Mini-Rennen von oben', short: 'Bleib im Bild!',
  desc: 'Kleine Spielzeugautos rasen über einen Esstisch, eine Werkbank oder durch den Sandkasten. Alle sehen dasselbe Bild, und die Kamera folgt dem Führenden. Wer zu weit zurückfällt und aus dem Bild rutscht, verliert den Lauf. Ist nur noch einer übrig, gewinnt er den Lauf, und alle starten neben ihm neu.',
  goal: 'Die meisten Läufe gewinnen. Wer zuerst 5 Läufe gewinnt oder nach 2,5 Minuten vorn liegt, siegt.',
  touch: 'Steuerkreuz ◀ ▶ lenken, rechts GAS und BREMSE', keys: '← → lenken, ↑ Gas, ↓ Bremse/rückwärts',
  btns: [['gas', 'GAS'], ['brake', 'BREMSE']],
  W: 1400, H: 875, duration: 150, lerpKeys: ['cx', 'cy', 'zm'], ROAD: 78, WIN: 5,
  TRACKS: [
    { name: 'Esstisch', bg: '#8a5a32', bg2: '#7a4e2a', pts: [[400, 400], [1400, 300], [2000, 520], [2700, 350], [2950, 900], [2500, 1300], [2850, 1700], [1900, 1780], [1500, 1300], [1000, 1680], [400, 1520], [300, 900]] },
    { name: 'Werkbank', bg: '#9b8a6c', bg2: '#8c7b5e', pts: [[300, 300], [1200, 250], [1500, 700], [2200, 350], [2900, 500], [2950, 1200], [2300, 1450], [2650, 1800], [1500, 1820], [1100, 1300], [600, 1720], [250, 1200]] },
    { name: 'Sandkasten', bg: '#e2c98a', bg2: '#d6bb78', pts: [[500, 300], [2700, 300], [2950, 720], [1850, 900], [2900, 1220], [2800, 1720], [1500, 1720], [1200, 1250], [700, 1720], [300, 1320], [650, 920], [300, 600]] },
  ],

  build(tr) {
    const P = tr.pts, n = P.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const steps = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 14);
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    const len = [0];
    for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    const total = len[len.length - 1] + Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]);
    return { s: out, len, total };
  },

  dir(T, i) { const n = T.s.length, a = T.s[(i - 1 + n) % n], b = T.s[(i + 1) % n]; return Math.atan2(b[1] - a[1], b[0] - a[0]); },

  init(players, rnd) {
    const ti = rnd.randint(0, this.TRACKS.length - 1), tr = this.TRACKS[ti];
    const T = this.build(tr);
    const deco = [];
    for (let k = 0; k < 26; k++) deco.push([rnd.uniform(-200, 3300), rnd.uniform(-200, 2200), rnd.uniform(40, 150), rnd.randint(0, 3), rnd.uniform(0, 6.28)]);
    const S = { ti, T, deco, p: players.map(pl => ({ id: pl.id, c: pl.c, x: 0, y: 0, a: 0, v: 0, on: 1, w: 0, idx: 0, lap: 0, prog: 0 })), cx: 0, cy: 0, zm: 1, heat: 0, pause: 0, ready: 0, msg: '', msgT: 0 };
    this.grid(S, 0);
    S.cx = S.p[0].x; S.cy = S.p[0].y;
    return S;
  },

  // alle Autos hinter Stützpunkt i0 (in Runde lap0) aufstellen
  grid(S, i0, lap0) {
    const T = S.T, n = T.s.length;
    S.p.forEach((p, k) => {
      const back = 3 + Math.floor(k / 2) * 4, i = (i0 - back + n * 4) % n, a = this.dir(T, i), side = k % 2 ? 1 : -1;
      p.x = T.s[i][0] - Math.sin(a) * 34 * side; p.y = T.s[i][1] + Math.cos(a) * 34 * side;
      p.a = a; p.v = 0; p.on = p.gone ? 0 : 1; p.idx = i;
      p.lap = (lap0 || 0) - (i0 - back < 0 ? 1 : 0);
      p.prog = p.lap * T.total + T.len[i];
    });
  },

  track(S, p) {
    const T = S.T, n = T.s.length;
    let best = p.idx, bd = 1e12;
    for (let k = -25; k <= 45; k++) {
      const i = (p.idx + k + n) % n, d = (T.s[i][0] - p.x) ** 2 + (T.s[i][1] - p.y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (p.idx > n - 60 && best < 60) p.lap++;
    else if (p.idx < 60 && best > n - 60) p.lap--;
    p.idx = best;
    p.prog = p.lap * T.total + T.len[best];
    return Math.sqrt(bd);
  },

  step(S, inp, dt, G) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.pause > 0) {
      S.pause -= dt;
      if (S.pause <= 0) { const lead = this.leader(S); this.grid(S, lead ? lead.idx : 0, lead ? lead.lap : 0); S.ready = 1.2; S.heat = 0; S.zm = 1; G.sfx('beep'); }
      return;
    }
    const frozen = S.ready > 0;
    if (frozen) { S.ready -= dt; if (S.ready <= 0) G.sfx('go'); }
    for (const p of S.p) {
      if (!p.on || p.gone) continue;
      const i = frozen ? {} : inp[p.id];
      const off = this.track(S, p) > this.ROAD;
      const max = off ? 230 : 560;
      if (i.u) p.v += 560 * dt;
      else if (i.d) p.v -= 760 * dt;
      else p.v -= Math.sign(p.v) * Math.min(Math.abs(p.v), 220 * dt);
      if (p.v > max) p.v = Math.max(max, p.v - 1100 * dt);
      p.v = Math.max(p.v, -170);
      const steer = U.clamp(p.v / 170, -1, 1) * 3.0 * dt;
      if (i.l) p.a -= steer;
      if (i.r) p.a += steer;
      p.x += Math.cos(p.a) * p.v * dt; p.y += Math.sin(p.a) * p.v * dt;
    }
    for (let i = 0; i < S.p.length; i++) for (let j = i + 1; j < S.p.length; j++) {
      const a = S.p[i], b = S.p[j];
      if (!a.on || !b.on) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 34) { const ov = (34 - d) / 2; a.x -= dx / d * ov; a.y -= dy / d * ov; b.x += dx / d * ov; b.y += dy / d * ov; a.v *= 0.97; b.v *= 0.97; }
    }
    const lead = this.leader(S);
    if (lead) { const k = Math.min(1, dt * 3.5); S.cx += (lead.x - S.cx) * k; S.cy += (lead.y - S.cy) * k; }
    if (frozen || S.p.length < 2) return;
    // dauert ein Lauf zu lange, zoomt die Kamera langsam heran
    S.heat += dt;
    S.zm = 1 + U.clamp((S.heat - 25) / 25, 0, 1.2);
    // aus dem Bild gefallen?
    for (const p of S.p) {
      if (!p.on || p === lead) continue;
      if (S.heat > 60 || Math.abs(p.x - S.cx) > this.W / 2 / S.zm + 10 || Math.abs(p.y - S.cy) > this.H / 2 / S.zm + 10) { p.on = 0; G.sfx('crash'); }
    }
    const on = S.p.filter(p => p.on && !p.gone);
    if (on.length <= 1) {
      const w = on[0];
      if (w) { w.w++; S.msg = G.name(w.id) + ' gewinnt den Lauf!'; G.sfx('lap'); }
      else S.msg = 'Unentschieden';
      S.msgT = 2.2; S.pause = 2.2;
    }
  },

  leader(S) {
    let best = null;
    for (const p of S.p) if (p.on && !p.gone && (!best || p.prog > best.prog)) best = p;
    return best;
  },

  over(S) { return S.p.some(p => p.w >= this.WIN); },
  rank(S) { return S.p.filter(p => !p.gone).map(p => ({ id: p.id, s: p.w * 1e6 + Math.max(0, Math.floor(p.prog)), txt: p.w + (p.w === 1 ? ' Lauf gewonnen' : ' Läufe gewonnen') })).sort((a, b) => b.s - a.s); },
  status: (S, p) => p.w + (p.on ? '' : ' ✕'),
  kill(S, p) { p.on = 0; },

  pack(S) {
    return { t: +S.time.toFixed(3), cx: Math.round(S.cx), cy: Math.round(S.cy), zm: +S.zm.toFixed(3), ps: S.pause > 0 ? 1 : 0, rd: +Math.max(0, S.ready).toFixed(2), m: S.msgT > 0 ? S.msg : '',
      p: S.p.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(3), on: p.on, w: p.w, g: p.gone ? 1 : 0, v: Math.round(p.v) })) };
  },
  unpack(S, d) {
    S.time = d.t; S.cx = d.cx; S.cy = d.cy; S.zm = d.zm; S.pause = d.ps; S.ready = d.rd; S.msg = d.m; S.msgT = d.m ? 1 : 0;
    d.p.forEach((q, i) => { const p = S.p[i]; p.x = q.x; p.y = q.y; p.a = q.a; p.on = q.on; p.w = q.w; p.gone = q.g; p.v = q.v; });
  },

  draw(g, S, G) {
    const tr = this.TRACKS[S.ti], T = S.T, ST = HR.ST, acc = [ST.ORANGE, ST.CYAN, ST.YELLOW][S.ti] || ST.CYAN;
    G.world(g);
    g.beginPath(); g.rect(0, 0, this.W, this.H); g.clip();
    g.translate(this.W / 2, this.H / 2); g.scale(S.zm, S.zm); g.translate(-S.cx, -S.cy);
    // Untergrund: Raster in der Farbe der Strecke, fest in der Welt
    const cell = 180, x0 = Math.floor((S.cx - this.W) / (cell * 2)) * cell * 2, y0 = Math.floor((S.cy - this.H) / (cell * 2)) * cell * 2;
    ST.floor(g, x0, y0, this.W * 2 + cell * 4, this.H * 2 + cell * 4, acc, null, cell);
    for (const d of S.deco) this.decor(g, S.ti, d);
    // Strecke: dunkle Fahrbahn mit Leuchträndern
    g.lineJoin = 'round'; g.lineCap = 'round';
    const path = () => { g.beginPath(); g.moveTo(T.s[0][0], T.s[0][1]); for (let i = 1; i < T.s.length; i++) g.lineTo(T.s[i][0], T.s[i][1]); g.closePath(); };
    if (ST.fx) { path(); g.strokeStyle = 'rgba(255,43,214,.14)'; g.lineWidth = this.ROAD * 2 + 50; g.stroke(); }
    path(); g.strokeStyle = ST.MAGENTA; g.lineWidth = this.ROAD * 2 + 14; g.stroke();
    path(); g.strokeStyle = '#ffc4f3'; g.lineWidth = this.ROAD * 2 + 5; g.stroke();
    path(); g.strokeStyle = '#0d0b1c'; g.lineWidth = this.ROAD * 2; g.stroke();
    path(); g.strokeStyle = 'rgba(155,92,255,.22)'; g.lineWidth = this.ROAD * 1.2; g.stroke();
    g.setLineDash([30, 30]); path(); g.strokeStyle = 'rgba(24,231,255,.6)'; g.lineWidth = 4; g.stroke(); g.setLineDash([]);
    g.lineJoin = 'miter'; g.lineCap = 'butt';
    // Start/Ziel
    const a0 = this.dir(T, 0), s0 = T.s[0];
    g.save(); g.translate(s0[0], s0[1]); g.rotate(a0);
    for (let k = -6; k < 6; k++) for (let r = 0; r < 2; r++) { g.fillStyle = (k + r) % 2 ? '#f2eeff' : '#0b0918'; g.fillRect(r * 13 - 13, k * 13, 13, 13); }
    ST.line(g, -13, -78, -13, 78); ST.glow(g, ST.ICE, 2); ST.line(g, 13, -78, 13, 78); ST.glow(g, ST.ICE, 2);
    g.restore();
    // Autos von oben
    for (const p of S.p) {
      if (p.gone) continue;
      const c = G.color(p);
      g.globalAlpha = p.on ? 1 : 0.25;
      ST.pool(g, p.x, p.y, 46, c, 0.22);
      g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      for (const [wx, wy] of [[-15, -15], [7, -15], [-15, 9], [7, 9]]) { g.fillStyle = '#05040b'; g.fillRect(wx, wy, 10, 6); g.strokeStyle = 'rgba(155,150,200,.7)'; g.lineWidth = 1; g.strokeRect(wx, wy, 10, 6); }
      ST.rrect(g, -20, -11, 40, 22, 7); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgb(c, 0.22); g.fill(); ST.glow(g, c, 2.2);
      ST.rrect(g, 4, -7, 9, 14, 3); ST.thin(g, ST.CYAN, 1.5, 0.9);
      ST.line(g, -19, -7, -19, 7); ST.glow(g, ST.RED, 2);
      g.restore();
      ST.symbol(g, ST.symFor(c), p.x - Math.cos(p.a) * 5, p.y - Math.sin(p.a) * 5, 6, c);
      g.globalAlpha = 1;
      if (p.on && p.id === G.me) ST.you(g, p.x, p.y - 22, S.time, 'DU');
    }
  },

  decor(g, ti, d) {
    const [x, y, r, k, rot] = d, ST = HR.ST;
    g.save(); g.translate(x, y); g.rotate(rot);
    if (ti === 0) { // Teller, Gläser, Servietten
      if (k < 2) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = 'rgba(232,244,255,.05)'; g.fill(); ST.glow(g, ST.ICE, 2.5, 0.7); g.beginPath(); g.arc(0, 0, r * 0.7, 0, 7); ST.thin(g, ST.ICE, 2, 0.4); }
      else if (k === 2) { g.beginPath(); g.arc(0, 0, r * 0.4, 0, 7); ST.glow(g, ST.CYAN, 2, 0.7); g.beginPath(); g.arc(-r * 0.12, -r * 0.12, r * 0.18, 3.5, 5); ST.thin(g, '#ffffff', 2, 0.6); }
      else { ST.rrect(g, -r * 0.6, -r * 0.6, r * 1.2, r * 1.2, r * 0.15); ST.glow(g, ST.ORANGE, 2.5, 0.7); ST.line(g, -r * 0.6, -r * 0.6, r * 0.6, r * 0.6); ST.thin(g, ST.ORANGE, 2, 0.4); }
    } else if (ti === 1) { // Schrauben, Bretter, Werkzeug
      if (k < 2) { ST.oct(g, 0, 0, r * 0.25); ST.glow(g, [170, 162, 220], 2, 0.8); ST.line(g, -r * 0.15, 0, r * 0.15, 0); ST.thin(g, ST.ICE, 3, 0.7); }
      else if (k === 2) { ST.rrect(g, -r, -r * 0.2, r * 2, r * 0.4, 6); ST.glow(g, ST.YELLOW, 2.5, 0.6); for (let q = -0.6; q <= 0.6; q += 0.4) { ST.line(g, r * q, -r * 0.2, r * q, r * 0.2); ST.thin(g, ST.YELLOW, 1.5, 0.3); } }
      else { ST.rrect(g, -r * 0.7, -10, r * 0.6, 20, 4); ST.glow(g, ST.RED, 2.5, 0.8); ST.rrect(g, -r * 0.1, -6, r * 0.9, 12, 3); ST.glow(g, [170, 162, 220], 2, 0.8); }
    } else { // Förmchen, Steine, Schaufel
      if (k < 2) { const c = [ST.RED, ST.CYAN, ST.YELLOW, ST.LIME][(k + Math.round(r)) % 4]; ST.oct(g, 0, 0, r * 0.45); g.fillStyle = ST.rgba(c, 0.12); g.fill(); ST.glow(g, c, 2.5, 0.8); ST.oct(g, 0, 0, r * 0.25); ST.thin(g, c, 2, 0.5); }
      else if (k === 2) { g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.2, 0, 0, 7); ST.glow(g, [170, 162, 220], 2, 0.6); }
      else { ST.rrect(g, -r * 0.6, -8, r, 16, 4); ST.glow(g, ST.ORANGE, 2.5, 0.8); ST.rrect(g, r * 0.4, -20, r * 0.5, 40, 6); ST.glow(g, ST.CYAN, 2.5, 0.8); }
    }
    g.restore();
  },

  hud(g, S, G, W, H, sc) {
    const R = HR.Render;
    if (S.msgT > 0 && S.msg) R.text(g, S.msg, W / 2, H * 0.3, 34 * sc, '#ffe23d', 'center', 'middle');
    if (S.ready > 0 && G.phase === 'play') R.text(g, 'FERTIG …', W / 2, H * 0.42, 50 * sc, '#fff', 'center', 'middle');
    const me = S.p.find(p => p.id === G.me);
    if (me && !me.on && G.phase === 'play' && S.pause <= 0) R.text(g, 'AUS DEM BILD – warte auf den nächsten Lauf', W / 2, H * 0.18, 20 * sc, '#ff3355', 'center', 'middle');
    R.text(g, this.TRACKS[S.ti].name + ' · Ziel: ' + this.WIN + ' Läufe', W - 12, 10 + 50 * sc, 14 * sc, '#fff', 'right');
  },
});
