// Horizon Rush – Neon-Stil: wird nur geladen, wenn in den Einstellungen „Neon“ gewählt ist.
// Automatisch aus dem Stand vor der Umstellung erzeugt; ersetzt nur Zeichen-Code, die Spiellogik bleibt gemeinsam.
'use strict';

// ---------- balloon.js ----------
Object.assign(HR.GAMES["C10"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    // Jahrmarkt bei Nacht: Zeltbahnen, Lichterkette, Bühne
    g.fillStyle = '#0a0717'; g.fillRect(0, 0, 1600, 1000);
    g.beginPath(); for (let k = 0; k <= 16; k++) { g.moveTo(k * 100, 0); g.lineTo(k * 100 + (k - 8) * 6, 860); } ST.thin(g, ST.MAGENTA, 2, 0.18);
    for (let k = 0; k < 16; k += 2) { g.fillStyle = 'rgba(255,43,214,.04)'; g.beginPath(); g.moveTo(k * 100, 0); g.lineTo(k * 100 + 100, 0); g.lineTo(k * 100 + 100 + (k - 7) * 6, 860); g.lineTo(k * 100 + (k - 8) * 6, 860); g.fill(); }
    g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(800, 140, 1600, 60); ST.thin(g, ST.DIM, 2, 0.8);
    const lc = [ST.YELLOW, ST.CYAN, ST.LIME, ST.MAGENTA];
    for (let k = 0; k < 20; k++) {
      const x = 40 + k * 80, y = 60 + Math.sin(k / 19 * Math.PI) * 40 * 0.98, c = lc[k % 4], on = Math.floor(S.time * 3 + k) % 4 !== 0;
      g.beginPath(); g.moveTo(x - 16, y); g.lineTo(x + 16, y); g.lineTo(x, y + 30); g.closePath(); g.fillStyle = ST.rgba(c, on ? 0.3 : 0.08); g.fill(); ST.glow(g, c, 2, on ? 1 : 0.4);
    }
    g.fillStyle = ST.BODY; g.fillRect(0, 860, 1600, 140);
    ST.floor(g, 0, 866, 1600, 134, ST.VIOLET, null, 50);
    ST.line(g, 0, 860, 1600, 860); ST.glow(g, ST.VIOLET, 4);
    const n = S.p.length, sp = Math.min(190, 1440 / n);
    const wiggle = S.time * 30;
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const x = 800 + (i - (n - 1) / 2) * sp, base = 790, col = G.color(p);
      const r = Math.min(sp * 0.48, 26 + p.s * 3.4);
      if (p.pop) {
        const k = S.time - p.pt; if (k < 0.6) ST.burst(g, x, base - 120 - r, k / 0.6, col, 16, r * 1.4);
        g.beginPath(); g.moveTo(x, base - 60); g.lineTo(x - 6, base - 80); g.lineTo(x + 4, base - 92); ST.glow(g, col, 2.5);
      } else if (p.s > 0 || S.ph === 'pump') {
        const by = base - 100 - r, wx = p.w ? Math.sin(wiggle + i) * 6 : 0;
        g.beginPath(); g.moveTo(x, base - 60); g.quadraticCurveTo(x + 10, base - 80, x + wx, by + r); ST.thin(g, ST.DIM, 2, 0.9);
        ST.pool(g, x + wx, by, r * 1.8, col, 0.22);
        g.beginPath(); g.ellipse(x + wx, by, r * 0.92, r, 0, 0, 7); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgb(col, 0.22 + Math.min(0.25, p.s * 0.01)); g.fill(); ST.glow(g, col, 3.5);
        g.beginPath(); g.ellipse(x + wx, by, r * 0.62, r * 0.68, 0, 0, 7); ST.thin(g, col, 1.5, 0.4);
        g.beginPath(); g.arc(x + wx, by, r * 0.78, 3.6, 4.4); ST.thin(g, '#ffffff', 3, 0.7);
        g.beginPath(); g.moveTo(x + wx - 8, by + r + 8); g.lineTo(x + wx + 8, by + r + 8); g.lineTo(x + wx, by + r - 2); g.closePath(); g.fillStyle = ST.rgb(col, 0.6); g.fill(); ST.glow(g, col, 2);
        if (p.bk) ST.text(g, '✓ ' + p.last, x, by, Math.max(22, r * 0.5), ST.TEXT);
      }
      // Pumpe und Token
      const pumping = S.time - p.pt < 0.15 && !p.pop;
      ST.rrect(g, x - 16, base - 70 + (pumping ? 16 : 0), 32, 14, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.DIM, 2);
      ST.line(g, x, base - 56 + (pumping ? 16 : 0), x, base - 56); ST.thin(g, ST.DIM, 3, 0.8);
      ST.rrect(g, x - 22, base - 56, 44, 60, 8); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(255,51,85,.15)'; g.fill(); ST.glow(g, ST.RED, 3);
      ST.line(g, x - 14, base - 30, x + 14, base - 30); ST.thin(g, ST.RED, 2, 0.6);
      G.fig(g, p, x - sp * 0.28, base + 6, 28, { look: [0.6, -0.5], squash: pumping ? 0.08 : 0, still: true });
      ST.text(g, String(p.tot), x, base + 100, 30, U.rgb(col));
    });
    if (S.ph === 'pump') ST.text(g, 'RUNDE ' + S.rd + ' VON ' + this.ROUNDS + '  ·  NOCH ' + Math.ceil(S.tm) + ' S', 800, 170, 38, ST.TEXT);
    else if (S.ph === 'res') ST.text(g, 'GEPLATZT BEI ' + (S.shown || S.lim) + '!', 800, 170, 44, ST.YELLOW);
  }
});

// ---------- clouds.js ----------
Object.assign(HR.GAMES["B6"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    g.beginPath(); g.rect(0, 0, 1600, 1000); g.clip();
    const hgt = Math.min(1, S.cb / 9000);
    const top = U.mix([20, 12, 48], [7, 6, 15], hgt), bot = U.mix([52, 16, 70], [24, 10, 50], hgt);
    const grd = g.createLinearGradient(0, 0, 0, 1000); grd.addColorStop(0, U.rgb(top)); grd.addColorStop(1, U.rgb(bot));
    g.fillStyle = grd; g.fillRect(0, 0, 1600, 1000);
    // Sterne ziehen langsam mit
    g.fillStyle = `rgba(242,238,255,${0.35 + hgt * 0.45})`;
    for (let k = 0; k < 90; k++) { const sx = (k * 263) % 1600, sy = ((k * 157 + S.cb * 0.12) % 1000); const s = k % 7 === 0 ? 3 : 2; g.fillRect(sx, 1000 - sy, s, s); }
    // Höhenlinien am Rand
    g.font = `700 16px ${HR.FONT}`; g.textAlign = 'left'; g.textBaseline = 'bottom';
    for (let m = Math.ceil(S.cb / 500) * 500; m < S.cb + 1000; m += 500) {
      const y = 1000 - (m - S.cb);
      ST.line(g, 0, y, 40, y); ST.thin(g, ST.CYAN, 2, 0.5); g.fillStyle = 'rgba(24,231,255,.6)'; g.fillText(Math.round(m / 10) + ' m', 46, y + 8);
    }
    const Y = h => 1000 - (h - S.cb);
    const r0 = Math.max(0, Math.floor((S.cb - 60) / this.ROW)), r1 = Math.ceil((S.cb + 1060) / this.ROW);
    for (let r = r0; r <= r1; r++) {
      for (const c of this.row(S, r)) {
        const y = Y(r * this.ROW);
        if (c.k === 'g') {
          if (S.time > 8) continue;
          g.fillStyle = ST.BODY; g.fillRect(-10, y, 1620, 1110 - y);
          ST.floor(g, -10, y + 6, 1620, 1104 - y, ST.LIME, null, 60);
          ST.line(g, -10, y, 1610, y); ST.glow(g, ST.LIME, 4);
          continue;
        }
        const x = this.cx(c, S.time), col = c.k === 's' ? ST.YELLOW : c.k === 'm' ? ST.CYAN : ST.ICE;
        for (const xx of [x - 1600, x, x + 1600]) {
          if (xx < -200 || xx > 1800) continue;
          // Wolke als gefaste Plattform mit Wolkenbogen oben
          const w = c.w;
          ST.pool(g, xx, y + 4, w * 0.6, col, 0.12);
          g.beginPath(); g.moveTo(xx - w / 2, y + 14); g.lineTo(xx - w / 2, y + 2); g.lineTo(xx - w * 0.36, y - 8);
          g.lineTo(xx - w * 0.22, y - 16); g.lineTo(xx - w * 0.04, y - 10); g.lineTo(xx + w * 0.12, y - 20); g.lineTo(xx + w * 0.32, y - 12); g.lineTo(xx + w / 2, y + 2); g.lineTo(xx + w / 2, y + 14); g.closePath();
          g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgba(col, 0.14); g.fill(); ST.glow(g, col, 3);
          ST.line(g, xx - w * 0.38, y + 6, xx + w * 0.38, y + 6); ST.thin(g, col, 1.5, 0.45);
          if (c.k === 's') { g.beginPath(); for (let z = 0; z < 2; z++) { g.moveTo(xx - 14, y - 22 - z * 12); g.lineTo(xx, y - 34 - z * 12); g.lineTo(xx + 14, y - 22 - z * 12); } ST.glow(g, ST.YELLOW, 2.5); }
          if (c.k === 'm') { for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(xx + sd * (w / 2 + 10), y - 2); g.lineTo(xx + sd * (w / 2 + 20), y + 4); g.lineTo(xx + sd * (w / 2 + 10), y + 10); ST.glow(g, ST.CYAN, 2, 0.7); } }
        }
      }
    }
    for (const p of S.p) {
      if (p.gone || !p.al) continue;
      const y = Y(p.h) - 24;
      for (const xx of [p.x - 1600, p.x, p.x + 1600]) {
        if (xx < -60 || xx > 1660) continue;
        if (p.pf > 0) { ST.oct(g, xx, y, 64, S.time * 6); ST.glow(g, G.color(p), 3, 0.7); }
        G.fig(g, p, xx, y, 24, { look: [p.f, p.vh > 0 ? -0.6 : 0.4], squash: p.vh > 0 ? -0.08 : 0.04, noShadow: true });
      }
    }
    // Gefahrenzone unten
    const gz = g.createLinearGradient(0, 920, 0, 1000); gz.addColorStop(0, 'rgba(255,51,85,0)'); gz.addColorStop(1, 'rgba(255,51,85,.4)');
    g.fillStyle = gz; g.fillRect(0, 920, 1600, 80);
    g.setLineDash([22, 16]); g.lineDashOffset = -S.time * 40; ST.line(g, 0, 990, 1600, 990); ST.glow(g, ST.RED, 3); g.setLineDash([]); g.lineDashOffset = 0;
  }
});

// ---------- coins.js ----------
Object.assign(HR.GAMES["C12"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    const sky = g.createLinearGradient(0, 0, 0, 1000); sky.addColorStop(0, '#07060f'); sky.addColorStop(0.75, '#160a2c'); sky.addColorStop(1, '#2a0b3a');
    g.fillStyle = sky; g.fillRect(0, 0, 1600, 1000);
    g.fillStyle = 'rgba(242,238,255,.55)'; for (let k = 0; k < 70; k++) g.fillRect((k * 263) % 1600, (k * 131) % 700, 2, 2);
    // Skyline mit Fenstern
    const r = U.rng(9); let x = -10;
    while (x < 1600) {
      const w = 60 + r.random() * 90, h = 120 + r.random() * 220;
      g.beginPath(); g.rect(x, this.GY - h, w, h); g.fillStyle = '#0d0a1d'; g.fill(); ST.thin(g, ST.VIOLET, 1.5, 0.5);
      for (let wy = this.GY - h + 14; wy < this.GY - 10; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (r.random() < 0.2) { g.fillStyle = r.random() < 0.5 ? 'rgba(255,43,214,.55)' : 'rgba(24,231,255,.5)'; g.fillRect(wx, wy, 6, 4); }
      x += w + 6 + r.random() * 20;
    }
    // Boden und Plattformen
    g.fillStyle = '#0a0817'; g.fillRect(-20, this.GY, 1640, 140);
    ST.floor(g, -20, this.GY + 6, 1640, 134, ST.LIME, null, 50);
    ST.line(g, -20, this.GY, 1620, this.GY); ST.glow(g, ST.LIME, 4);
    for (const [px, py, pw] of this.PLAT) {
      ST.pool(g, px + pw / 2, py + 10, pw * 0.6, ST.LIME, 0.12);
      ST.rrect(g, px, py, pw, 34, 10); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.LIME, 3);
      ST.line(g, px + 10, py + 17, px + pw - 10, py + 17); ST.thin(g, ST.LIME, 1.5, 0.4);
      g.fillStyle = ST.LIME; for (let q = px + 20; q < px + pw - 10; q += 40) g.fillRect(q, py + 26, 4, 4);
    }
    for (const it of S.it) {
      const fade = it.lt > 2.5 ? (Math.floor(S.time * 10) % 2 ? 0.3 : 1) : 1;
      const A = g.globalAlpha; g.globalAlpha = fade;
      if (it.k === 'c') ST.coin(g, it.x, it.y, 15, S.time + it.i);
      else if (it.k === 'g') ST.gem(g, it.x, it.y, 19, ST.MAGENTA);
      else ST.bomb(g, it.x, it.y, 20, S.time);
      g.globalAlpha = A;
    }
    for (const p of S.p) if (!p.gone) G.fig(g, p, p.x, p.y - 30, 28, { look: [p.f * 0.8, 0], stun: p.st, squash: p.og ? 0 : -0.08 });
    for (const f of S.fx) ST.burst(g, f[0], f[1], (S.time - f[2]) / 0.6, ST.ORANGE, 16, 110);
  }
});

// ---------- crates.js ----------
Object.assign(HR.GAMES["C3"], {
  "crate": function (g, x, y, s, a) {
    const ST = HR.ST;
    g.save(); g.globalAlpha = a == null ? 1 : a;
    ST.rrect(g, x - s / 2, y - s / 2, s, s, s * 0.1); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(255,122,26,.16)'; g.fill(); ST.glow(g, ST.ORANGE, Math.max(2, s * 0.05));
    ST.rrect(g, x - s * 0.34, y - s * 0.34, s * 0.68, s * 0.68, s * 0.05); ST.thin(g, ST.ORANGE, Math.max(1, s * 0.025), 0.6);
    g.beginPath(); g.moveTo(x - s * 0.34, y - s * 0.34); g.lineTo(x + s * 0.34, y + s * 0.34); g.moveTo(x + s * 0.34, y - s * 0.34); g.lineTo(x - s * 0.34, y + s * 0.34); ST.thin(g, ST.ORANGE, Math.max(1, s * 0.02), 0.35);
    g.restore();
  },
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST, G0 = this.geo(), C = this.CELL, W = this.GX * C, H = this.GY * C;
    ST.floor(g, G0.x0, G0.y0, W, H, ST.CYAN, null, C);
    ST.frame(g, G0.x0 - 10, G0.y0 - 10, W + 20, H + 20, ST.CYAN, 5, C);
    // Schilde
    for (const s of S.sh) {
      const [x, y] = this.cellXY(s.c), b = Math.sin(S.time * 5) * 5;
      ST.pool(g, x, y + b, 50, ST.CYAN, 0.25);
      g.beginPath(); g.moveTo(x, y - 26 + b); g.lineTo(x + 22, y - 18 + b); g.lineTo(x + 20, y + 6 + b); g.lineTo(x, y + 28 + b); g.lineTo(x - 20, y + 6 + b); g.lineTo(x - 22, y - 18 + b); g.closePath();
      g.fillStyle = 'rgba(24,231,255,.18)'; g.fill(); ST.glow(g, ST.CYAN, 3);
      ST.line(g, x, y - 18 + b, x, y + 18 + b); ST.thin(g, ST.CYAN, 2, 0.6);
    }
    // Warnfelder der fallenden Kisten
    for (const f of S.fall) {
      const [x, y] = this.cellXY(f.c), k = 1 - f.t / this.FALL;
      g.fillStyle = `rgba(255,51,85,${0.06 + k * 0.18})`; ST.rrect(g, x - C / 2 * k, y - C / 2 * k, C * k, C * k, 8); g.fill();
      g.setLineDash([10, 8]); g.lineDashOffset = -S.time * 30; ST.rrect(g, x - C / 2 + 5, y - C / 2 + 5, C - 10, C - 10, 8); ST.glow(g, ST.RED, 2.5, 0.4 + k * 0.6); g.setLineDash([]); g.lineDashOffset = 0;
    }
    // gelandete Kisten und Token, von oben nach unten
    const items = [];
    for (let i = 0; i < S.box.length; i++) if (S.box[i]) { const [x, y] = this.cellXY(i); items.push([y, () => this.crate(g, x, y, C - 6)]); }
    for (const p of S.p) if (!p.gone) items.push([p.y, () => {
      if (!p.al) { if (S.time - p.dt < 0.8) ST.burst(g, p.x, p.y, (S.time - p.dt) / 0.8, G.color(p), 14, 60); return; }
      G.fig(g, p, p.x, p.y - 10, 24, { look: [p.lx, p.ly] });
      if (p.sh) { ST.oct(g, p.x, p.y - 10, 38, S.time); ST.glow(g, ST.CYAN, 3, 0.6 + 0.3 * Math.sin(S.time * 8)); }
    }]);
    items.sort((a, b) => a[0] - b[0]).forEach(it => it[1]());
    for (const e of S.fx) { const [x, y] = this.cellXY(e.c); ST.burst(g, x, y + C * 0.3, (S.time - e.t) / 0.5, ST.ORANGE, 12, 70); }
    // fallende Kisten über allem
    for (const f of S.fall) { const [x, y] = this.cellXY(f.c), k = f.t / this.FALL; if (k < 0.75) this.crate(g, x, y - k * 700, (C - 6) * (1 + k * 0.4)); }
  }
});

// ---------- crossing.js ----------
Object.assign(HR.GAMES["B10"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    g.beginPath(); g.rect(0, 0, 1600, 1000); g.clip();
    const RH = S.RH, Y = r => 1000 - (r + 1) * RH;
    S.lanes.forEach((L, r) => {
      const y = Y(r);
      if (L.type === 'road') {
        g.fillStyle = '#0d0b1c'; g.fillRect(0, y, 1600, RH);
        g.beginPath(); for (let x = 10; x < 1600; x += 90) { g.moveTo(x, y + RH / 2); g.lineTo(x + 44, y + RH / 2); } ST.glow(g, ST.MAGENTA, 2.5, 0.7);
        ST.line(g, 0, y + 2, 1600, y + 2); ST.thin(g, ST.ICE, 2, 0.35); ST.line(g, 0, y + RH - 2, 1600, y + RH - 2); ST.thin(g, ST.ICE, 2, 0.35);
        for (const o of L.o) {
          const x = this.ox(L, o, S.time), w = L.len, h = RH * 0.62, cy = y + RH / 2, c = ST.neonRGB(L.col);
          ST.pool(g, x + w / 2, cy, w * 0.7, c, 0.15);
          for (const wx of [x + 14, x + w - 30]) for (const wy of [cy - h / 2 - 5, cy + h / 2 - 7]) { g.fillStyle = '#05040b'; g.fillRect(wx, wy, 16, 12); g.strokeStyle = 'rgba(155,150,200,.7)'; g.lineWidth = 1.5; g.strokeRect(wx, wy, 16, 12); }
          ST.rrect(g, x, cy - h / 2, w, h, 12); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgb(c, 0.2); g.fill(); ST.glow(g, c, 3);
          const fx = L.dir > 0 ? x + w - 38 : x + 12; ST.rrect(g, fx, cy - h / 2 + 7, 26, h - 14, 6); ST.thin(g, ST.CYAN, 2, 0.9);
          ST.line(g, x + 12, cy, x + w - 44, cy); ST.thin(g, c, 1.5, 0.4);
          const lx = L.dir > 0 ? x + w + 2 : x - 2, rx = L.dir > 0 ? x - 2 : x + w + 2;
          g.fillStyle = '#fff6b0'; for (const ly of [cy - h / 2 + 9, cy + h / 2 - 9]) { g.fillRect(lx - 3, ly - 4, 6, 8); g.fillStyle = 'rgba(255,51,85,.95)'; g.fillRect(rx - 3, ly - 4, 6, 8); g.fillStyle = '#fff6b0'; }
          if (ST.fx) { const sx = L.dir > 0 ? 1 : -1, gr = g.createLinearGradient(lx, 0, lx + sx * 110, 0); gr.addColorStop(0, 'rgba(255,246,176,.3)'); gr.addColorStop(1, 'rgba(255,246,176,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(lx, cy - h / 2 + 4); g.lineTo(lx + sx * 110, cy - h / 2 - 10); g.lineTo(lx + sx * 110, cy + h / 2 + 10); g.lineTo(lx, cy + h / 2 - 4); g.closePath(); g.fill(); }
        }
      } else if (L.type === 'river') {
        g.fillStyle = '#05070f'; g.fillRect(0, y, 1600, RH);
        g.setLineDash([24, 18]); g.lineDashOffset = -S.time * 30 * L.dir;
        for (const f of [0.3, 0.7]) { g.beginPath(); for (let x = -40; x < 1680; x += 40) g.lineTo(x, y + RH * f + Math.sin(x * 0.02 + S.time * 2 + r) * 3); ST.thin(g, ST.CYAN, 2, 0.3); }
        g.setLineDash([]); g.lineDashOffset = 0;
        for (const [o, len] of L.o) {
          const x = this.ox(L, o, S.time), h = RH * 0.66, cy = y + RH / 2;
          ST.rrect(g, x, cy - h / 2, len, h, h / 2); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(255,122,26,.16)'; g.fill(); ST.glow(g, ST.ORANGE, 3);
          g.beginPath(); g.moveTo(x + h * 0.5, cy - h * 0.12); g.lineTo(x + len - h * 0.6, cy - h * 0.12); g.moveTo(x + h * 0.7, cy + h * 0.16); g.lineTo(x + len - h * 0.8, cy + h * 0.16); ST.thin(g, ST.ORANGE, 2, 0.45);
          ST.oct(g, x + len - h * 0.3, cy, h * 0.3); ST.thin(g, ST.ORANGE, 2, 0.7);
        }
      } else if (L.type === 'goal') {
        g.fillStyle = '#0a0817'; g.fillRect(0, y, 1600, RH);
        for (let x = 0; x < 1600; x += 40) for (let k = 0; k < 2; k++) { g.fillStyle = (x / 40 + k) % 2 ? '#f2eeff' : '#0b0918'; g.fillRect(x, y + RH - 20 + k * 10, 40, 10); }
        ST.line(g, 0, y + RH - 21, 1600, y + RH - 21); ST.glow(g, ST.LIME, 3);
        ST.text(g, 'ZIEL', 800, y + RH * 0.42, 40, ST.LIME);
      } else {
        ST.floor(g, 0, y, 1600, RH, ST.LIME, null, 80);
        ST.line(g, 0, y, 1600, y); ST.thin(g, ST.LIME, 1.5, 0.35);
      }
    });
    S.p.forEach((p, idx) => {
      if (p.gone) return;
      const x = p.x + ((idx % 3) - 1) * 6, y = Y(p.r) + RH / 2 + ((idx % 2) ? 4 : -4) - 6;
      if (p.dead > 0) { G.fig(g, p, x, y + 8, 22, { dead: true, squash: 0.35, alpha: 0.75, noMark: true }); return; }
      G.fig(g, p, x, y, 22, { look: [0, -1] });
    });
  }
});

// ---------- crown.js ----------
Object.assign(HR.GAMES["C4"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    // Thronsaal: Raster, Zinnen, roter Leuchtteppich mit Rautenmuster, Säulen
    for (let k = 0; k < 14; k++) { ST.rrect(g, 110 + k * 100, 84, 60, 30, 6); g.fillStyle = ST.BODY; g.fill(); ST.thin(g, ST.VIOLET, 2, 0.6); }
    ST.floor(g, 120, 130, 1360, 760, ST.VIOLET, null, 85);
    ST.frame(g, 112, 122, 1376, 776, ST.VIOLET, 5, 85);
    ST.rrect(g, 740, 130, 120, 760, 8); g.fillStyle = 'rgba(255,51,85,.1)'; g.fill(); ST.glow(g, ST.RED, 2.5);
    g.beginPath(); for (let y = 160; y < 880; y += 50) { g.moveTo(800, y - 16); g.lineTo(818, y); g.lineTo(800, y + 16); g.lineTo(782, y); g.closePath(); } ST.thin(g, ST.RED, 2, 0.6);
    ST.rrect(g, 730, 96, 140, 40, 8); g.fillStyle = 'rgba(255,226,61,.12)'; g.fill(); ST.glow(g, ST.YELLOW, 2.5);
    for (const [x, y] of this.POSTS) {
      ST.pool(g, x, y, 90, ST.VIOLET, 0.15);
      ST.oct(g, x, y, 44); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.VIOLET, 3.5);
      ST.oct(g, x, y, 29); ST.thin(g, ST.VIOLET, 2, 0.6);
      ST.oct(g, x, y, 13); ST.thin(g, ST.VIOLET, 2, 0.6);
    }
    if (S.cr < 0) {
      const b = Math.sin(S.time * 4) * 6;
      ST.pool(g, S.cx, S.cy, 90, ST.YELLOW, 0.3);
      g.beginPath(); g.arc(S.cx, S.cy, 40 + Math.sin(S.time * 6) * 6, 0, 7); ST.glow(g, ST.YELLOW, 2, 0.5);
      g.save(); g.translate(S.cx, S.cy + 30 + b); HR.ST.hat(g, 'crown', 40, S.time); g.restore();
    }
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) {
      const c = G.color(p);
      if (p.ds) { ST.line(g, p.x - p.lx * 70, p.y - p.ly * 70, p.x, p.y); ST.glow(g, c, 6, 0.45); }
      const hold = p.id === S.cr;
      if (hold) { ST.pool(g, p.x, p.y, 80, ST.YELLOW, 0.3); g.beginPath(); g.arc(p.x, p.y - 12, 46, 0, 7); ST.glow(g, ST.YELLOW, 3, 0.6 + 0.3 * Math.sin(S.time * 8)); }
      G.fig(g, p, p.x, p.y - 12, this.PR, { look: [p.lx, p.ly], hat: hold ? 'crown' : null, stun: p.st, alpha: hold && S.imm > 0 && Math.floor(S.time * 12) % 2 ? 0.6 : 1 });
    }
  }
});

// ---------- dark.js ----------
Object.assign(HR.GAMES["C11"], {
  "draw": function (g, S, G, W, H) {
    const ST = HR.ST;
    g.save();
    G.world(g);
    const CS = this.CS, X0 = this.X0, Y0 = this.Y0, MW = this.CW * CS, MH = this.CH * CS;
    ST.floor(g, X0, Y0, MW, MH, ST.VIOLET, null, CS / 2);
    for (const w of S.walls) { ST.rrect(g, w[0], w[1], w[2], w[3], 3); g.fillStyle = '#100c24'; g.fill(); ST.glow(g, ST.VIOLET, 2.5); }
    g.fillStyle = '#e8d8ff';
    for (const w of S.walls) { g.fillRect(w[0] - 2, w[1] - 2, 5, 5); g.fillRect(w[0] + w[2] - 3, w[1] + w[3] - 3, 5, 5); }
    for (const gm of S.gems) ST.gem(g, gm.x, gm.y - 6 + Math.sin(S.time * 4 + gm.i) * 4, 14, [ST.GREEN, ST.CYAN, ST.MAGENTA][gm.i % 3]);
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) G.fig(g, p, p.x, p.y - 8, this.PR, { look: [p.lx, p.ly], alpha: p.iv > 0 && Math.floor(S.time * 10) % 2 ? 0.5 : 1 });
    const gh = S.gh, gb = Math.sin(S.time * 4) * 8;
    for (const f of S.fx) ST.burst(g, f[0], f[1], (S.time - f[2]) / 0.6, ST.GREEN, 12, 60);
    g.restore();
    // Dunkelheit: nur um das eigene Token (Zuschauer: um alle) ist es hell
    const me = S.p.find(p => p.id === G.me && !p.gone), v = G.view;
    const lights = G.show || !me ? S.p.filter(p => !p.gone) : [me];
    const dk = this._dk && this._dk.width === Math.ceil(W) && this._dk.height === Math.ceil(H) ? this._dk : (this._dk = U.canvas(Math.ceil(W), Math.ceil(H)));
    const d = dk.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = G.show || !me ? 'rgba(4,3,10,.8)' : 'rgba(4,3,10,.97)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const p of lights) {
      const x = v.ox + p.x * v.sc, y = v.oy + p.y * v.sc, r = 230 * v.sc;
      const gr = d.createRadialGradient(x, y, r * 0.35, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill();
    }
    g.drawImage(dk, 0, 0, W, H);
    g.save(); G.world(g);
    for (const p of lights) { g.beginPath(); g.arc(p.x, p.y, 225, 0, 7); ST.thin(g, G.color(p), 2, 0.3); }
    // der Geist leuchtet auch im Dunkeln
    const A = g.globalAlpha; g.globalAlpha = gh.st > 0 ? 0.45 : 1;
    ST.pool(g, gh.x, gh.y, 90, ST.RED, 0.2);
    g.beginPath(); g.moveTo(gh.x - 34, gh.y + 34 + gb); g.lineTo(gh.x - 34, gh.y - 8 + gb); g.lineTo(gh.x - 18, gh.y - 34 + gb); g.lineTo(gh.x + 18, gh.y - 34 + gb); g.lineTo(gh.x + 34, gh.y - 8 + gb); g.lineTo(gh.x + 34, gh.y + 34 + gb);
    g.lineTo(gh.x + 17, gh.y + 22 + gb); g.lineTo(gh.x, gh.y + 34 + gb); g.lineTo(gh.x - 17, gh.y + 22 + gb); g.closePath();
    g.fillStyle = 'rgba(255,51,85,.15)'; g.fill(); ST.glow(g, ST.RED, 3.5);
    g.beginPath(); g.rect(gh.x - 17, gh.y - 14 + gb, 10, 10); g.rect(gh.x + 7, gh.y - 14 + gb, 10, 10); g.fillStyle = '#ffffff'; g.fill(); ST.glow(g, '#ffffff', 1.5);
    g.globalAlpha = A;
    if (me && !G.show) ST.you(g, me.x, me.y - 40, S.time, '');
    g.restore();
  }
});

// ---------- floor.js ----------
Object.assign(HR.GAMES["C1"], {
  "bgTop": '#3a2f6b',
  "bgBot": '#120d26',
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST, Gm = this.geo(), R = Gm.R;
    const hex = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); };
    // Tiefe unter den Platten: dunkler Schacht mit Sternen
    g.fillStyle = 'rgba(155,92,255,.06)'; for (let k = 0; k < 70; k++) g.fillRect((k * 337) % 1600, (k * 211) % 1000, 3, 3);
    for (const p of S.p) if (!p.al && !p.gone && p.fall < 1) G.fig(g, p, p.x, p.y + p.fall * 140, 26 * (1 - p.fall * 0.7), { dead: true, alpha: 1 - p.fall, noMark: true, noShadow: true });
    for (let i = 0; i < S.T.length; i++) {
      const v = S.T[i]; if (v < 0) continue;
      const [cx, cy] = this.center(i), k = v > 0 ? v / this.CRACK : 0;
      const sh = k > 0.6 ? Math.sin(S.time * 60 + i) * 3 * k : 0;
      const col = ST.hex2rgb(k <= 0 ? ST.CYAN : k < 0.4 ? ST.YELLOW : k < 0.75 ? ST.ORANGE : ST.RED);
      // Seitenwand (Dicke) und Deckfläche
      hex(cx + sh, cy + 14, R - 3); g.fillStyle = ST.BODY; g.fill(); ST.thin(g, ST.VIOLET, 2, 0.6);
      hex(cx + sh, cy, R - 3); g.fillStyle = '#0d0b1e'; g.fill(); g.fillStyle = ST.rgb(col, k > 0 ? 0.12 + k * 0.15 : 0.07); g.fill();
      ST.glow(g, col, 2.5, k > 0 ? 1 : 0.75);
      hex(cx + sh, cy, R * 0.62); ST.thin(g, col, 1.5, 0.35);
      if (k > 0) {
        g.beginPath();
        for (let c = 0; c < 2 + Math.floor(k * 4); c++) { const a = c * 2.1 + i; g.moveTo(cx + sh, cy); g.lineTo(cx + sh + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.32 + 4); g.lineTo(cx + sh + Math.cos(a + 0.3) * R * 0.78, cy + Math.sin(a + 0.3) * R * 0.6); }
        ST.glow(g, col, 1.5);
      } else { g.fillStyle = ST.rgb(col, 0.5); g.fillRect(cx - 2, cy - 2, 4, 4); }
    }
    for (const p of S.p.filter(p => p.al && !p.gone).sort((a, b) => a.y - b.y)) G.fig(g, p, p.x, p.y - 18, 26, { look: [p.lx, p.ly] });
  }
});

// ---------- laser.js ----------
Object.assign(HR.GAMES["C2"], {
  "bgTop": '#1d2a5c',
  "bgBot": '#0b0f24',
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST, cx = 800, cy = 520, RA = this.RA;
    // Plattform mit Dicke, Raster, Ringen und Sektoren
    ST.pool(g, cx, cy, RA * 1.4, ST.VIOLET, 0.12);
    g.beginPath(); g.ellipse(cx, cy + 26, RA, RA * 0.96, 0, 0, 7); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.VIOLET, 2);
    g.save(); g.beginPath(); g.arc(cx, cy, RA, 0, 7); g.clip();
    ST.floor(g, cx - RA, cy - RA, RA * 2, RA * 2, ST.VIOLET, null, 70);
    for (let k = 0; k < 12; k += 2) { const a = k * Math.PI / 6; g.fillStyle = 'rgba(155,92,255,.06)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, RA, a, a + Math.PI / 6); g.fill(); }
    g.restore();
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, RA * k / 4, 0, 7); ST.thin(g, ST.VIOLET, 2, 0.35); }
    g.beginPath(); g.arc(cx, cy, RA, 0, 7); ST.glow(g, ST.CYAN, 5);
    g.beginPath(); for (let k = 0; k < 48; k++) { const a = k * Math.PI / 24, r2 = k % 4 ? RA + 8 : RA + 16; g.moveTo(cx + Math.cos(a) * (RA + 4), cy + Math.sin(a) * (RA + 4)); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); } ST.thin(g, ST.CYAN, 2, 0.5);
    // Laser
    for (const l of S.L) {
      const ex = cx + Math.cos(l.a) * RA, ey = cy + Math.sin(l.a) * RA;
      g.lineCap = 'round';
      ST.line(g, cx, cy, ex, ey);
      if (ST.fx) { g.strokeStyle = 'rgba(255,51,85,.22)'; g.lineWidth = 40; g.stroke(); }
      g.strokeStyle = ST.RED; g.lineWidth = 14; g.stroke();
      g.strokeStyle = '#ffd6de'; g.lineWidth = 5; g.stroke();
      g.lineCap = 'butt';
      ST.oct(g, ex, ey, 17, l.a); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.RED, 3);
    }
    // Kern
    const hc = ST.hsl((S.time * 90) % 360, 1, 0.6);
    ST.oct(g, cx, cy, this.CORE); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.VIOLET, 4);
    ST.oct(g, cx, cy, this.CORE * 0.55, S.time); g.fillStyle = ST.rgb(hc, 0.3); g.fill(); ST.glow(g, hc, 3);
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) {
      if (!p.al) { if (S.time - p.dt < 0.6) ST.burst(g, p.x, p.y - 20, (S.time - p.dt) / 0.6, G.color(p), 14, 70); continue; }
      ST.shadow(g, p.x, p.y + 24, 22 * (1 - p.z * 0.4), 7);
      if (p.z > 0) { g.beginPath(); g.ellipse(p.x, p.y + 24, 26, 8, 0, 0, 7); ST.thin(g, G.color(p), 1.5, 0.5); }
      G.fig(g, p, p.x, p.y - 4 - p.z * 70, 25, { look: [p.lx, p.ly], squash: p.z > 0 ? -0.08 : 0, noShadow: true });
    }
  }
});

// ---------- lightcycle.js ----------
Object.assign(HR.GAMES["B1"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    ST.floor(g, 0, 0, 1600, 1000, ST.CYAN, null, 100);
    ST.frame(g, 3, 3, 1594, 994, ST.CYAN, 6, 100);
    // Leuchtspuren, das jüngste Stück hell
    for (const p of S.p) {
      if (p.gone) continue;
      const pts = p.v.concat([[p.x, p.y]]), c = G.color(p);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      ST.glow(g, c, 7, p.al ? 0.9 : 0.3);
      if (p.al) {
        const [dx, dy] = this.DIRS[p.d], a = pts[pts.length - 2] || pts[0], L = Math.min(80, Math.hypot(p.x - a[0], p.y - a[1]));
        ST.line(g, p.x - dx * L, p.y - dy * L, p.x, p.y); ST.glow(g, ST.whiten(c, 0.45), 8);
      }
    }
    for (const p of S.p) {
      if (p.gone) continue;
      const [dx, dy] = this.DIRS[p.d];
      if (!p.al) ST.burst(g, p.x, p.y, Math.min(1, (S.time - p.dt) / 0.8), G.color(p), 16, 70);
      G.fig(g, p, p.x, p.y, 17, { look: [dx, dy], dead: !p.al, alpha: p.al ? 1 : 0.6, still: true, noShadow: true });
    }
  }
});

// ---------- memory.js ----------
Object.assign(HR.GAMES["C6"], {
  "bgTop": '#2e2a5a',
  "bgBot": '#110e24',
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST, gm = this.geo();
    ST.rrect(g, gm.x0 - 30, gm.y0 - 30 + 18, gm.W + 60, gm.W + 60, 30); g.fillStyle = ST.BODY; g.fill(); ST.thin(g, ST.VIOLET, 2, 0.6);
    ST.rrect(g, gm.x0 - 30, gm.y0 - 30, gm.W + 60, gm.W + 60, 30); g.fillStyle = '#0d0a20'; g.fill(); ST.glow(g, ST.VIOLET, 4);
    ST.rrect(g, gm.x0 - 18, gm.y0 - 18, gm.W + 36, gm.W + 36, 22); ST.thin(g, ST.VIOLET, 1.5, 0.35);
    const me = S.p.find(p => p.id === G.me);
    for (let i = 0; i < 16; i++) {
      const [x, y] = this.tileXY(i), c = HR.PARTY_COLORS[[7, 2, 3, 1, 4, 5, 0, 6][i % 8]], lit = S.cur === i;
      const T = gm.T, up = lit ? -10 : 0, dim = S.ph === 'show' && !lit;
      ST.rrect(g, x - T / 2, y - T / 2 + 10, T, T, 18); g.fillStyle = ST.BODY; g.fill(); ST.thin(g, c, 2, 0.4);
      ST.rrect(g, x - T / 2, y - T / 2 + up, T, T, 18);
      g.fillStyle = '#0c0a1c'; g.fill();
      if (lit) { ST.pool(g, x, y, T, c, 0.5); ST.rrect(g, x - T / 2, y - T / 2 + up, T, T, 18); g.fillStyle = ST.rgb(c, 0.55); g.fill(); ST.glow(g, ST.whiten(c, 0.3), 5); }
      else { g.fillStyle = ST.rgb(c, dim ? 0.05 : 0.12); g.fill(); ST.glow(g, c, 3, dim ? 0.45 : 0.85); }
      ST.rrect(g, x - T * 0.38, y - T * 0.38 + up, T * 0.76, T * 0.76, 12); ST.thin(g, c, 1.5, lit ? 0.8 : 0.3);
      // Symbol
      const s = T * 0.16;
      g.beginPath();
      if (i < 8) g.arc(x, y + up, s, 0, 7); else { g.moveTo(x, y + up - s * 1.2); g.lineTo(x + s * 1.1, y + up + s * 0.8); g.lineTo(x - s * 1.1, y + up + s * 0.8); g.closePath(); }
      if (lit) { g.fillStyle = '#ffffff'; g.fill(); } else ST.thin(g, c, 3, dim ? 0.35 : 0.7);
      if (me && !me.al && me.ft === i) ST.text(g, '✕', x, y, 90, ST.RED);
    }
    for (const p of S.p.filter(p => !p.gone).sort((a, b) => a.y - b.y)) {
      if (!p.al) { if (p.fl < 1) G.fig(g, p, p.x, p.y - 12 + p.fl * 60, 26 * (1 - p.fl * 0.6), { dead: true, alpha: 1 - p.fl, noMark: true, noShadow: true }); continue; }
      G.fig(g, p, p.x, p.y - 14, 26, { look: [p.lx, p.ly] });
      if (p.ok) ST.text(g, '✓', p.x + 28, p.y - 46, 30, ST.LIME);
    }
    // Ansage
    const top = 60;
    if (S.ph === 'show') ST.text(g, 'GUT AUFPASSEN!', 800, top, 44, ST.YELLOW);
    else if (S.ph === 'go') {
      const left = S.p.find(p => p.id === G.me);
      ST.text(g, left && left.al && !left.ok ? 'STAMPFEN! ' + (left.pg + 1) + '. FELD VON ' + S.n : 'LOS!', 800, top, 40, ST.TEXT);
      const f = U.clamp(S.tm / (S.lim || 1), 0, 1), col = S.tm < 2 ? ST.RED : ST.LIME;
      g.fillStyle = ST.rgba(col, 0.15); g.fillRect(500, top + 38, 600, 8);
      if (f > 0.01) { ST.line(g, 500, top + 42, 500 + 600 * f, top + 42); ST.glow(g, col, 6); }
    } else if (S.rd) ST.text(g, 'RUNDE ' + S.rd + ' GESCHAFFT', 800, top, 36, ST.TEXT);
    else ST.text(g, 'GLEICH GEHT ES LOS …', 800, top, 36, ST.TEXT);
  }
});

// ---------- minirace.js ----------
Object.assign(HR.GAMES["B4"], {
  "draw": function (g, S, G) {
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
  "decor": function (g, ti, d) {
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
  "hud": function (g, S, G, W, H, sc) {
    const R = HR.Render;
    if (S.msgT > 0 && S.msg) R.text(g, S.msg, W / 2, H * 0.3, 34 * sc, '#ffe23d', 'center', 'middle');
    if (S.ready > 0 && G.phase === 'play') R.text(g, 'FERTIG …', W / 2, H * 0.42, 50 * sc, '#fff', 'center', 'middle');
    const me = S.p.find(p => p.id === G.me);
    if (me && !me.on && G.phase === 'play' && S.pause <= 0) R.text(g, 'AUS DEM BILD – warte auf den nächsten Lauf', W / 2, H * 0.18, 20 * sc, '#ff3355', 'center', 'middle');
    R.text(g, this.TRACKS[S.ti].name + ' · Ziel: ' + this.WIN + ' Läufe', W - 12, 10 + 50 * sc, 14 * sc, '#fff', 'right');
  }
});

// ---------- pong.js ----------
Object.assign(HR.GAMES["B9"], {
  "draw": function (g, S, G) {
    const ST = HR.ST, { sides, ap } = this.geo();
    const me = S.p.find(p => p.id === G.me) || S.p[0];
    const rot = Math.PI / 2 - sides[me.k].phi;
    G.world(g);
    g.translate(800, 500); g.rotate(rot);
    const shape = (k, dy) => { g.beginPath(); sides.forEach((s, i) => (i ? g.lineTo : g.moveTo).call(g, s.B[0] * k, s.B[1] * k + (dy || 0))); g.closePath(); };
    ST.pool(g, 0, 0, ap * 1.6, ST.CYAN, 0.08);
    shape(1.06, 16); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.VIOLET, 2);
    g.save(); shape(1.06); g.clip(); ST.floor(g, -640, -640, 1280, 1280, ST.CYAN, null, 80); g.restore();
    shape(1.06); ST.glow(g, ST.VIOLET, 3);
    // Mittelkreis mit Skala
    g.beginPath(); g.arc(0, 0, 90, 0, 7); ST.thin(g, ST.CYAN, 2, 0.45);
    g.beginPath(); for (let k = 0; k < 32; k++) { const a = k * Math.PI / 16, r2 = k % 4 ? 98 : 110; g.moveTo(Math.cos(a) * 90, Math.sin(a) * 90); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); } ST.thin(g, ST.CYAN, 2, 0.45);
    const P = (s, u, off) => [s.A[0] + s.dir[0] * u * s.L - s.n[0] * off, s.A[1] + s.dir[1] * u * s.L - s.n[1] * off];
    for (let k = 0; k < 8; k++) {
      const s = sides[k], o = S.p.find(p => p.k === k && !p.gone), alive = o && o.al;
      const c = alive ? G.color(o) : [130, 124, 170];
      // Torzone schraffiert
      g.save();
      g.beginPath(); g.moveTo(...P(s, 0, 0)); g.lineTo(...P(s, 1, 0)); g.lineTo(...P(s, 1, 30)); g.lineTo(...P(s, 0, 30)); g.closePath(); g.clip();
      g.beginPath(); for (let d = -700; d < 700; d += 12) { g.moveTo(d, -700); g.lineTo(d + 700, 700); } ST.thin(g, c, 2, alive ? 0.28 : 0.16);
      g.restore();
      ST.line(g, ...P(s, 0, 0), ...P(s, 1, 0));
      if (!alive) { ST.glow(g, c, 8, 0.7); const [mx, my] = P(s, 0.5, 46); g.beginPath(); g.moveTo(mx - 10, my - 10); g.lineTo(mx + 10, my + 10); g.moveTo(mx + 10, my - 10); g.lineTo(mx - 10, my + 10); ST.thin(g, c, 3, 0.8); continue; }
      ST.glow(g, c, 2.5, 0.8);
      ST.line(g, ...P(s, o.u - this.HL, 12), ...P(s, o.u + this.HL, 12)); ST.glow(g, c, 9);
      // Token hinter dem Schläger
      const fx = s.A[0] + s.dir[0] * o.u * s.L + s.n[0] * 30, fy = s.A[1] + s.dir[1] * o.u * s.L + s.n[1] * 30;
      g.save(); g.translate(fx, fy); g.rotate(-rot); ST.char(g, 0, 0, 16, G.color(o), { look: [-(s.n[0] * Math.cos(rot) - s.n[1] * Math.sin(rot)), -(s.n[0] * Math.sin(rot) + s.n[1] * Math.cos(rot))], t: S.time, noShadow: true, still: true }); g.restore();
    }
    for (const b of S.b) {
      const A = g.globalAlpha; g.globalAlpha = b.w ? 0.45 : 1;
      ST.pool(g, b.x, b.y, 50, '#ffffff', 0.3);
      g.beginPath(); g.arc(b.x, b.y, this.BR + 2, 0, 7); g.fillStyle = '#fff'; g.fill(); ST.glow(g, ST.CYAN, 3);
      g.globalAlpha = A;
    }
    // Namen und Leben außen, aufrecht
    g.rotate(-rot);
    for (const p of S.p) {
      if (p.gone) continue;
      const s = sides[p.k], a = s.phi + rot, x = Math.cos(a) * (ap + 64), y = Math.sin(a) * (ap + 64);
      const label = (p.id === G.me ? 'DU' : G.name(p.id).toUpperCase()) + (p.al ? '  ' + '◆'.repeat(Math.max(0, p.l)) : '  ✕');
      ST.text(g, label, x, y, p.id === G.me ? 22 : 17, p.al ? G.rgb(p) : 'rgba(242,238,255,.45)');
    }
  }
});

// ---------- quickdraw.js ----------
Object.assign(HR.GAMES["C9"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    // Westernstraße bei Nacht: Streifensonne, Häuser als Konturen, Rasterboden
    const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#07060f'); sky.addColorStop(0.7, '#1c0b30'); sky.addColorStop(1, '#3a0d40');
    g.fillStyle = sky; g.fillRect(0, 0, 1600, 600);
    g.fillStyle = 'rgba(242,238,255,.5)'; for (let k = 0; k < 60; k++) g.fillRect((k * 263) % 1600, (k * 97) % 420, 2, 2);
    ST.pool(g, 800, 520, 380, ST.MAGENTA, 0.25);
    g.save(); g.beginPath(); g.arc(800, 600, 170, Math.PI, 0); g.closePath(); g.clip();
    const sg = g.createLinearGradient(0, 430, 0, 600); sg.addColorStop(0, '#ffe23d'); sg.addColorStop(0.55, '#ff7a1a'); sg.addColorStop(1, '#ff2bd6');
    g.fillStyle = sg; g.fillRect(630, 430, 340, 170);
    g.fillStyle = '#2a0b3a'; for (let k = 0; k < 8; k++) g.fillRect(630, 592 - k * 18, 340, 2 + (7 - k) * 0.9);
    g.restore();
    const house = (x, w, h, col, sign) => {
      g.beginPath(); g.rect(x, 600 - h, w, h); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, col, 3);
      ST.line(g, x - 10, 600 - h, x + w + 10, 600 - h); ST.glow(g, col, 3);
      for (let k = 0; k < Math.floor(w / 70); k++) { const lit = (k + Math.floor(x)) % 3 !== 0; g.beginPath(); g.rect(x + 22 + k * 70, 600 - h + 40, 34, 46); if (lit) { g.fillStyle = ST.rgba(ST.YELLOW, 0.3); g.fill(); } ST.thin(g, lit ? ST.YELLOW : col, 2, lit ? 0.9 : 0.5); }
      if (sign) { ST.rrect(g, x + w / 2 - 80, 600 - h - 54, 160, 40, 8); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.MAGENTA, 2.5); ST.text(g, sign, x + w / 2, 600 - h - 33, 22, ST.MAGENTA); }
    };
    house(30, 300, 260, ST.ORANGE, 'SALOON'); house(1270, 300, 300, ST.VIOLET, 'SHERIFF'); house(350, 180, 190, ST.VIOLET); house(1080, 170, 210, ST.ORANGE);
    g.fillStyle = '#0a0817'; g.fillRect(0, 600, 1600, 400);
    g.beginPath(); for (let k = -18; k <= 18; k++) { g.moveTo(800 + k * 18, 600); g.lineTo(800 + k * 150, 1000); } for (let k = 1; k < 10; k++) { const y = 600 + Math.pow(k / 9, 2) * 400; g.moveTo(0, y); g.lineTo(1600, y); }
    ST.thin(g, ST.MAGENTA, 1.5, 0.35);
    ST.line(g, 0, 600, 1600, 600); ST.glow(g, ST.MAGENTA, 3);
    // Signal
    if (S.ph === 'sig' || (S.ph === 'res' && S.win >= 0)) {
      const k = Math.min(1, (S.time - S.sigT) * 6);
      ST.pool(g, 800, 245, 420 * k, ST.LIME, 0.35);
      ST.rrect(g, 800 - 280 * k, 170, 560 * k, 150, 30); g.fillStyle = 'rgba(182,255,46,.25)'; g.fill(); ST.glow(g, ST.LIME, 6);
      if (k > 0.6) ST.text(g, 'JETZT!', 800, 248, 110, '#ffffff');
    } else if (S.fake) {
      ST.rrect(g, 470, 170, 660, 150, 30); g.fillStyle = 'rgba(255,122,26,.2)'; g.fill(); ST.glow(g, ST.ORANGE, 5);
      ST.text(g, S.fake, 800, 248, 80, ST.ORANGE);
    } else if (S.ph === 'wait' || S.ph === 'intro') {
      ST.text(g, 'WARTEN …', 800, 248, 70, ST.DIM);
    }
    ST.text(g, S.rd ? 'RUNDE ' + Math.min(S.rd, this.ROUNDS) + ' VON ' + this.ROUNDS : '', 800, 110, 34, ST.TEXT);
    // Revolverhelden in einer Reihe
    const n = S.p.length, sp = Math.min(180, 1400 / n);
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const x = 800 + (i - (n - 1) / 2) * sp, y = 800, c = G.color(p);
      G.fig(g, p, x, y, 42, { look: [0, 0], hat: 'cowboy', stun: p.er, still: true });
      if (p.pr) {
        g.save(); g.translate(x + 44, y - 6); g.rotate(-0.6);
        ST.rrect(g, 0, -7, 48, 14, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 2);
        ST.rrect(g, -6, -4, 16, 30, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 2);
        g.restore();
        if (p.id === S.win) ST.burst(g, x + 74, y - 46, Math.min(1, (S.time - S.sigT - p.rt) * 2), ST.YELLOW, 10, 50);
        ST.text(g, Math.round(p.rt * 1000) + ' MS', x, y + 82, 24, p.id === S.win ? ST.YELLOW : ST.TEXT);
      }
      if (p.er) ST.text(g, 'ZU FRÜH!', x, y + 82, 24, ST.RED);
      if (p.id === S.win && S.ph === 'res') ST.text(g, '★', x, y - 126, 60, ST.YELLOW);
      for (let k = 0; k < p.w; k++) { const wx = x - (p.w - 1) * 10 + k * 20, wy = y + 116; g.beginPath(); g.moveTo(wx, wy - 8); g.lineTo(wx + 7, wy); g.lineTo(wx, wy + 8); g.lineTo(wx - 7, wy); g.closePath(); g.fillStyle = ST.YELLOW; g.fill(); }
    });
  }
});

// ---------- redlight.js ----------
Object.assign(HR.GAMES["C7"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST, n = S.p.length, top = this.laneY(S, 0) - Math.min(100, 640 / n) / 2 - 20, bot = this.laneY(S, n - 1) + Math.min(100, 640 / n) / 2 + 20;
    // Laufbahn
    ST.floor(g, 90, top, 1420, bot - top, ST.ORANGE, null, 70);
    ST.frame(g, 70, top - 20, 1460, bot - top + 40, ST.ORANGE, 4);
    g.setLineDash([24, 16]);
    for (let i = 1; i < n; i++) { const y = (this.laneY(S, i - 1) + this.laneY(S, i)) / 2; ST.line(g, 100, y, 1500, y); ST.thin(g, ST.ICE, 2, 0.35); }
    g.setLineDash([]);
    ST.line(g, this.X0, top, this.X0, bot); ST.glow(g, ST.ICE, 3);
    for (let y = top, k = 0; y < bot; y += 20, k++) for (let c = 0; c < 2; c++) { g.fillStyle = (k + c) % 2 ? '#f2eeff' : '#0b0918'; g.fillRect(this.X1 + c * 20, y, 20, Math.min(20, bot - y)); }
    ST.line(g, this.X1 - 2, top, this.X1 - 2, bot); ST.glow(g, ST.LIME, 3);
    // Ampel oben in der Mitte
    const ax = 800, ay = top - 150;
    ST.line(g, ax, ay + 60, ax, top - 22); ST.thin(g, ST.DIM, 6, 0.8);
    ST.rrect(g, ax - 150, ay - 50, 300, 110, 30); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, [170, 162, 220], 3);
    const lamp = (k, x, col) => {
      const on = S.L === k;
      if (on) ST.pool(g, x, ay + 5, 130, col, 0.45);
      ST.oct(g, x, ay + 5, 38);
      if (on) ST.solid(g, col, 0.9); else { g.fillStyle = ST.rgba(col, 0.08); g.fill(); ST.thin(g, col, 2, 0.4); }
      if (on) { ST.oct(g, x, ay + 5, 24); ST.thin(g, '#ffffff', 2, 0.6); }
    };
    lamp('r', ax - 95, ST.RED); lamp('y', ax, ST.YELLOW); lamp('g', ax + 95, ST.LIME);
    // Wächter am Ziel: dreht sich bei Rot um
    const wx = 1520, wy = (top + bot) / 2, watching = S.L === 'r';
    if (watching) { g.beginPath(); g.moveTo(wx - 40, wy); g.lineTo(wx - 520, wy - 260); g.lineTo(wx - 520, wy + 260); g.closePath(); g.fillStyle = 'rgba(255,51,85,.07)'; g.fill(); }
    ST.char(g, wx, wy, 60, watching ? [255, 51, 85] : [170, 162, 220], { look: watching ? [-1, 0] : [1, -0.6], t: S.time, still: true, sym: 'auge' });
    if (watching) ST.text(g, '!', wx, wy - 100, 60, ST.RED);
    S.p.forEach((p, i) => {
      if (p.gone) return;
      const y = this.laneY(S, i), run = p.v > 30 ? Math.sin(S.time * 22) : 0;
      G.fig(g, p, p.x, y - 6 - Math.abs(run) * 6, Math.min(26, 640 / n * 0.28), { look: [1, 0], stun: p.st, squash: run * 0.05 });
      if (p.ft) ST.text(g, p.fo + '.', p.x - 60, y - 6, 32, ST.YELLOW);
    });
    const big = S.L === 'g' ? ['LAUF!', ST.LIME] : S.L === 'y' ? ['ACHTUNG …', ST.YELLOW] : ['STOPP!', ST.RED];
    ST.text(g, big[0], 800, bot + 70, 56, big[1]);
  }
});

// ---------- snow.js ----------
Object.assign(HR.GAMES["C5"], {
  "draw": function (g, S, G) {
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
  }
});

// ---------- sumo.js ----------
Object.assign(HR.GAMES["B3"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST, R = S.R;
    // Wasser: dunkel mit gestrichelten Wellenlinien
    g.fillStyle = '#05070f'; g.fillRect(-2000, -2000, 5600, 5000);
    for (let y = -60, k = 0; y < 1060; y += 34, k++) {
      g.setLineDash([16 + (k * 7) % 22, 12 + (k * 5) % 16]); g.lineDashOffset = S.time * 18 * (k % 2 ? 1 : -1) + k * 13;
      g.beginPath(); for (let x = -120; x <= 1720; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + k + S.time) * 4);
      ST.thin(g, ST.CYAN, 2, 0.14 + (k % 3) * 0.06);
    }
    g.setLineDash([]); g.lineDashOffset = 0;
    ST.pool(g, 800, 500, R * 1.5, ST.MAGENTA, 0.12);
    // Plattform mit sichtbarer Dicke
    g.beginPath(); g.ellipse(800, 522, R, R * 0.98, 0, 0, 7); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.VIOLET, 2);
    g.save(); g.beginPath(); g.arc(800, 500, R, 0, 7); g.clip();
    ST.floor(g, 800 - R, 500 - R, R * 2, R * 2, ST.MAGENTA, null, 80);
    g.restore();
    for (const k of [0.3, 0.62]) { g.beginPath(); g.arc(800, 500, R * k, 0, 7); ST.thin(g, ST.MAGENTA, 2, 0.35); }
    if (R < 465) { g.setLineDash([16, 14]); g.lineDashOffset = -S.time * 30; g.beginPath(); g.arc(800, 500, R - 16, 0, 7); ST.glow(g, ST.YELLOW, 3, Math.floor(S.time * 2) % 2 ? 0.9 : 0.4); g.setLineDash([]); g.lineDashOffset = 0; }
    g.beginPath(); g.arc(800, 500, R, 0, 7); ST.glow(g, ST.MAGENTA, 6);
    for (const p of S.p.filter(p => !p.gone && (p.al || p.f < 1)).sort((a, b) => a.y - b.y)) {
      const sc = p.al ? 1 : 1 - p.f * 0.7;
      if (p.al && p.dash > 0) { ST.oct(g, p.x, p.y, 48, S.time * 4); ST.glow(g, G.color(p), 3, 0.7); }
      if (!p.al && p.f < 0.6) ST.burst(g, p.x, p.y, p.f / 0.6, ST.CYAN, 10, 50);
      G.fig(g, p, p.x, p.y + (p.al ? 0 : p.f * 40), 30 * sc, { look: [Math.cos(p.a), Math.sin(p.a)], dead: !p.al, alpha: p.al ? 1 : 1 - p.f, squash: p.dash > 0 ? -0.08 : 0 });
      if (p.al && p.id === G.me && p.cd <= 0) ST.text(g, 'STOSS BEREIT', p.x, p.y + 56, 18, ST.YELLOW);
    }
  }
});

// ---------- tanks.js ----------
Object.assign(HR.GAMES["B2"], {
  "draw": function (g, S, G) {
    G.world(g);
    const ST = HR.ST;
    ST.floor(g, 0, 0, 1600, 1000, ST.CYAN, null, 100);
    // Mauern als Leuchtbalken mit Endkappen
    for (const w of S.walls) {
      if (w[0] <= 0 || w[1] <= 0 || w[0] + w[2] >= 1600 || w[1] + w[3] >= 1000) continue;
      ST.rrect(g, w[0], w[1], w[2], w[3], 6); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, ST.CYAN, 4);
      const hz = w[2] > w[3], cx = w[0] + w[2] / 2, cy = w[1] + w[3] / 2;
      const ends = hz ? [[w[0], cy], [w[0] + w[2], cy]] : [[cx, w[1]], [cx, w[1] + w[3]]];
      ST.line(g, ends[0][0] + (hz ? 12 : 0), ends[0][1] + (hz ? 0 : 12), ends[1][0] - (hz ? 12 : 0), ends[1][1] - (hz ? 0 : 12)); ST.thin(g, ST.CYAN, 2, 0.55);
      for (const [x, y] of ends) { g.beginPath(); g.rect(x - 7, y - 7, 14, 14); g.fillStyle = 'rgba(24,231,255,.35)'; g.fill(); ST.glow(g, ST.CYAN, 2); }
    }
    ST.frame(g, 8, 8, 1584, 984, ST.CYAN, 6, 100);
    for (const b of S.b) { ST.pool(g, b.x, b.y, 34, '#ffffff', 0.25); g.beginPath(); g.arc(b.x, b.y, 7, 0, 7); g.fillStyle = '#fff'; g.fill(); ST.glow(g, ST.YELLOW, 2.5); }
    for (const p of S.p) {
      if (p.gone || p.rt > 0) continue;
      const blink = p.inv > 0 && Math.floor(S.time * 10) % 2, c = G.color(p);
      g.save(); if (blink) g.globalAlpha = 0.4;
      ST.pool(g, p.x, p.y, 70, c, 0.2);
      g.translate(p.x, p.y); g.rotate(p.a);
      for (const sy of [-1, 1]) {
        ST.rrect(g, -27, sy * 18 - 7, 54, 14, 4); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 1.6);
        g.beginPath(); for (let k = -22; k <= 22; k += 7) { g.moveTo(k, sy * 18 - 5); g.lineTo(k, sy * 18 + 5); } ST.thin(g, c, 1.3, 0.6);
      }
      ST.rrect(g, -21, -13, 42, 26, 6); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgb(c, 0.2); g.fill(); ST.glow(g, c, 3);
      ST.line(g, 10, 0, 38, 0); ST.glow(g, c, 4.5);
      ST.oct(g, 0, 0, 11); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 2.2);
      g.restore();
      g.save(); if (blink) g.globalAlpha = 0.4; ST.symbol(g, ST.symFor(c), p.x, p.y, 7, c); g.restore();
      if (p.id === G.me) ST.you(g, p.x, p.y - 40, S.time, 'DU');
    }
    for (const e of S.boom) { const k = 1 - e.t / 0.6; ST.burst(g, e.x, e.y, k, '#ff7a1a', 16, 80); }
    const me = S.p.find(p => p.id === G.me);
    if (me && me.rt > 0) ST.text(g, 'GLEICH WIEDER DA … ' + Math.ceil(me.rt), 800, 520, 44, ST.TEXT);
  }
});

// ---------- treasure.js ----------
Object.assign(HR.GAMES["C8"], {
  "draw": function (g, S, G) {
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
  }
});

// ---------- tunnel.js ----------
Object.assign(HR.GAMES["B7"], {
  "draw": function (g, S, G, W, H) {
    const ST = HR.ST;
    const me = S.p.find(p => p.id === G.me) || S.p[0];
    let view = me;
    if (!me.al) view = G.watching() || S.p.find(p => p.al) || me;
    const rot = Math.PI / 2 - view.a;
    const cx = W / 2, cy = H * 0.46, Rp = Math.min(W, H) * 0.46, F = 40;
    const R = d => Rp * F / (F + d);
    const K = this.K, sw = Math.PI * 2 / K;
    // Röhre: dunkel, in der Tiefe schwarz, Längslinien und Tiefenringe
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#000000'); bg.addColorStop(0.3, '#0d0920'); bg.addColorStop(1, '#2a1250');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.beginPath();
    for (let k = 0; k < K; k++) { const a = k * sw + rot; g.moveTo(cx + Math.cos(a) * R(400), cy + Math.sin(a) * R(400)); g.lineTo(cx + Math.cos(a) * Math.max(W, H), cy + Math.sin(a) * Math.max(W, H)); }
    ST.thin(g, ST.VIOLET, 1.5, 0.35);
    const off = S.z % 13;
    for (let d = 13 - off; d < 420; d += 13) {
      g.beginPath(); g.arc(cx, cy, R(d), 0, 7);
      ST.thin(g, Math.round((S.z + d) / 13) % 4 === 0 ? ST.MAGENTA : ST.CYAN, 2, 0.6 * Math.exp(-d / 160));
    }
    // Hindernisringe von hinten nach vorn
    const j0 = Math.max(0, Math.floor((S.z - this.Z0) / this.GAP) + 1);
    for (let j = j0 + 16; j >= j0; j--) {
      const d = this.ringZ(j) - S.z;
      if (d <= -2 || d > 430) continue;
      const r = this.ring(S, j), ro = R(Math.max(0, d)), ri = ro * 0.62, fog = Math.exp(-d / 170);
      const col = ST.hsl(r.hue || 200, 1, 0.6);
      const A = g.globalAlpha; g.globalAlpha = 0.2 + 0.8 * fog;
      for (let k = 0; k < K; k++) {
        if (!r.b[k]) continue;
        const a0 = k * sw + rot, a1 = a0 + sw;
        g.beginPath(); g.arc(cx, cy, ro, a0, a1); g.arc(cx, cy, ri, a1, a0, true); g.closePath();
        g.fillStyle = ST.BODY; g.fill(); g.fillStyle = ST.rgb(col, 0.22); g.fill();
        ST.glow(g, col, Math.max(1.2, 4 * fog));
        g.beginPath(); g.arc(cx, cy, ro - (ro - ri) * 0.3, a0 + 0.05, a1 - 0.05); ST.thin(g, col, Math.max(1, 2 * fog), 0.6);
      }
      g.globalAlpha = A;
    }
    // Mitspieler am Rand, eigenes Token unten
    const rp = Rp * 0.82, s = Rp * 0.075;
    for (const p of S.p) {
      if (p.gone || !p.al || p === view) continue;
      const a = p.a + rot, x = cx + Math.cos(a) * rp, y = cy + Math.sin(a) * rp;
      ST.char(g, x, y, s * 0.9, G.color(p), { look: [-Math.cos(a), -Math.sin(a)], t: S.time, noShadow: true, alpha: 0.85 });
    }
    if (view.al) {
      const x = cx, y = cy + rp;
      ST.char(g, x, y, s * 1.3, G.color(view), { look: [0, -1], t: S.time });
      if (view === me && !G.show) ST.you(g, x, y - s * 2.2, S.time, 'DU');
      else ST.text(g, 'Du schaust ' + G.name(view.id) + ' zu', x, y - s * 2.4, Math.max(14, s * 0.8), ST.TEXT);
    }
    ST.text(g, Math.floor(S.z / 10) + ' M', W / 2, H - 24, 22, ST.CYAN);
  }
});

