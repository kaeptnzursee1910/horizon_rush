// Horizon Rush – gemeinsamer Grafikstil der Party-Spiele:
// kräftige Farben, dunkle Umrisse, weiche Schatten und runde Party-Figuren mit Augen
'use strict';

const ST = HR.ST = {
  INK: '#251f3a',             // Umrisse
  INK_RGB: [37, 31, 58],
  LW: 5,                      // Umrissbreite in Weltpixeln

  rgb: (c, a) => a == null ? U.rgb(c) : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`,
  dark: c => U.shade(c, 0.68),
  light: c => U.mix(c, [255, 255, 255], 0.38),

  // Fläche mit Umriss
  fill(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw || ST.LW; g.strokeStyle = ST.INK; g.lineJoin = 'round'; g.stroke(); },

  shadow(g, x, y, rx, ry, a) { g.fillStyle = `rgba(20,10,40,${a == null ? 0.22 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); },

  rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); },

  // Spielfeld-Untergrund mit Karomuster
  floor(g, x, y, w, h, c1, c2, cell) {
    g.fillStyle = c1; g.fillRect(x, y, w, h);
    g.fillStyle = c2; cell = cell || 100;
    for (let i = 0; i * cell < w; i++) for (let j = 0; j * cell < h; j++) if ((i + j) % 2) g.fillRect(x + i * cell, y + j * cell, Math.min(cell, w - i * cell), Math.min(cell, h - j * cell));
  },

  // Hintergrund außerhalb des Spielfelds (ganze Leinwand)
  backdrop(g, W, H, top, bot) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, top || '#2b2350'); gr.addColorStop(1, bot || '#15112a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.04)';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 337) % W, (i * 191) % H, 30 + (i % 4) * 22, 0, 7); g.fill(); }
  },

  // Die Party-Figur. o: {look:[x,y], t, stun, dead, hat:'crown'|'cowboy'|'beanie', squash, alpha}
  char(g, x, y, r, col, o) {
    o = o || {};
    const t = o.t || 0, sq = o.squash || 0;
    const bob = o.still ? 0 : Math.sin(t * 9 + x * 0.05) * r * 0.04;
    g.save();
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (!o.noShadow) ST.shadow(g, x, y + r * 0.92, r * 0.85, r * 0.26);
    g.translate(x, y + bob);
    g.scale(1 + sq, 1 - sq);
    // Füße
    g.fillStyle = ST.rgb(ST.dark(col));
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.42, r * 0.82, r * 0.3, r * 0.17, 0, 0, 7); g.fill(); g.lineWidth = r * 0.09; g.strokeStyle = ST.INK; g.stroke(); }
    // Körper mit Licht von oben links
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.05);
    gr.addColorStop(0, ST.rgb(ST.light(col))); gr.addColorStop(0.55, ST.rgb(col)); gr.addColorStop(1, ST.rgb(ST.dark(col)));
    g.beginPath(); g.ellipse(0, 0, r, r * 0.94, 0, 0, 7);
    ST.fill(g, gr, Math.max(2, r * 0.13));
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.5, r * 0.22, r * 0.13, -0.6, 0, 7); g.fill();
    // Augen
    const lk = o.look || [0, 0.25], ex = lk[0] * r * 0.22, ey = lk[1] * r * 0.16;
    for (const s of [-1, 1]) {
      const cx = s * r * 0.3 + ex * 0.6, cy = -r * 0.12 + ey * 0.5;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy, r * 0.21, r * 0.27, 0, 0, 7); g.fill();
      g.lineWidth = Math.max(1.5, r * 0.07); g.strokeStyle = ST.INK; g.stroke();
      if (o.dead || o.stun) {
        g.strokeStyle = ST.INK; g.lineWidth = Math.max(1.5, r * 0.08); g.beginPath();
        if (o.dead) { g.moveTo(cx - r * 0.1, cy - r * 0.1); g.lineTo(cx + r * 0.1, cy + r * 0.1); g.moveTo(cx + r * 0.1, cy - r * 0.1); g.lineTo(cx - r * 0.1, cy + r * 0.1); }
        else g.arc(cx, cy, r * 0.09, t * 12, t * 12 + 4.5);
        g.stroke();
      } else {
        g.fillStyle = ST.INK; g.beginPath(); g.arc(cx + ex * 0.5, cy + ey * 0.7, r * 0.11, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + ex * 0.5 - r * 0.04, cy + ey * 0.7 - r * 0.05, r * 0.035, 0, 7); g.fill();
      }
    }
    // Wangen
    g.fillStyle = 'rgba(255,120,140,.45)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.55, r * 0.22, r * 0.12, r * 0.07, 0, 0, 7); g.fill(); }
    if (o.hat) ST.hat(g, o.hat, r, t);
    g.restore();
  },

  hat(g, kind, r, t) {
    if (kind === 'crown') {
      g.save(); g.translate(0, -r * 0.92); g.rotate(Math.sin(t * 4) * 0.08);
      g.beginPath(); g.moveTo(-r * 0.5, 0); g.lineTo(-r * 0.55, -r * 0.55); g.lineTo(-r * 0.25, -r * 0.25); g.lineTo(0, -r * 0.65); g.lineTo(r * 0.25, -r * 0.25); g.lineTo(r * 0.55, -r * 0.55); g.lineTo(r * 0.5, 0); g.closePath();
      ST.fill(g, '#ffd23c', Math.max(2, r * 0.09));
      g.fillStyle = '#e8435a'; g.beginPath(); g.arc(0, -r * 0.18, r * 0.09, 0, 7); g.fill();
      g.restore();
    } else if (kind === 'cowboy') {
      g.beginPath(); g.ellipse(0, -r * 0.78, r * 0.95, r * 0.2, 0, 0, 7); ST.fill(g, '#8a5a2b', Math.max(2, r * 0.08));
      g.beginPath(); g.roundRect(-r * 0.45, -r * 1.3, r * 0.9, r * 0.55, r * 0.15); ST.fill(g, '#9c6a34', Math.max(2, r * 0.08));
      g.fillStyle = '#5a3818'; g.fillRect(-r * 0.45, -r * 0.92, r * 0.9, r * 0.12);
    } else if (kind === 'beanie') {
      g.beginPath(); g.arc(0, -r * 0.55, r * 0.62, Math.PI, 0); g.closePath(); ST.fill(g, '#e8435a', Math.max(2, r * 0.08));
      g.beginPath(); g.arc(0, -r * 1.18, r * 0.17, 0, 7); ST.fill(g, '#fff', Math.max(2, r * 0.07));
    }
  },

  // Markierung "das bist du" (Pfeil über der Figur)
  you(g, x, y, t, label) {
    const yy = y + Math.sin(t * 6) * 5;
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x - 12, yy - 16); g.lineTo(x + 12, yy - 16); g.closePath();
    ST.fill(g, '#ffd23c', 3);
    if (label) ST.text(g, label, x, yy - 20, 22, '#fff', 'center', 'bottom');
  },

  // Schrift mit dunklem Rand
  text(g, txt, x, y, size, color, align, base) {
    g.font = `900 ${size}px ${HR.FONT}`; g.textAlign = align || 'center'; g.textBaseline = base || 'middle';
    g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.2); g.strokeStyle = ST.INK; g.strokeText(txt, x, y);
    g.fillStyle = color || '#fff'; g.fillText(txt, x, y);
  },

  // Münze / Edelstein
  coin(g, x, y, r, t) {
    const w = Math.abs(Math.cos((t || 0) * 3 + x * 0.01));
    g.beginPath(); g.ellipse(x, y, r * Math.max(0.25, w), r, 0, 0, 7); ST.fill(g, '#ffcf33', Math.max(2, r * 0.18));
    if (w > 0.5) { g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(x - r * 0.25 * w, y - r * 0.3, r * 0.2 * w, r * 0.3, 0, 0, 7); g.fill(); }
  },
  gem(g, x, y, r, col) {
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.85, y - r * 0.2); g.lineTo(x, y + r); g.lineTo(x - r * 0.85, y - r * 0.2); g.closePath();
    ST.fill(g, col || '#4ad6ff', Math.max(2, r * 0.16));
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(x, y - r * 0.8); g.lineTo(x + r * 0.35, y - r * 0.2); g.lineTo(x, y + r * 0.1); g.lineTo(x - r * 0.35, y - r * 0.2); g.closePath(); g.fill();
  },
  bomb(g, x, y, r, t) {
    g.beginPath(); g.arc(x, y, r, 0, 7); ST.fill(g, '#2f2a44', Math.max(2, r * 0.16));
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7); g.fill();
    g.strokeStyle = '#a07040'; g.lineWidth = r * 0.18; g.beginPath(); g.moveTo(x + r * 0.5, y - r * 0.75); g.quadraticCurveTo(x + r, y - r * 1.5, x + r * 1.25, y - r * 1.3); g.stroke();
    g.fillStyle = Math.floor((t || 0) * 12) % 2 ? '#ffe14d' : '#ff7a1a'; g.beginPath(); g.arc(x + r * 1.25, y - r * 1.3, r * 0.3, 0, 7); g.fill();
  },

  // kleine Partikel-Explosion (Zeit seit Beginn k, 0..1)
  burst(g, x, y, k, col, n, size) {
    n = n || 10; size = size || 60;
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + i, d = size * (0.3 + k * 0.9) * (0.7 + (i % 3) * 0.2);
      g.globalAlpha = Math.max(0, 1 - k);
      g.fillStyle = col || '#ffd23c';
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, size * 0.12 * (1 - k * 0.6), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  },

  // Bewegung: Eingabe als Richtungsvektor (8 Richtungen)
  dir(i) { let x = (i.r ? 1 : 0) - (i.l ? 1 : 0), y = (i.d ? 1 : 0) - (i.u ? 1 : 0); const n = Math.hypot(x, y) || 1; return [x / n, y / n]; },

  // Figuren gegeneinander schieben
  separate(list, r) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < r * 2) { const k = (r * 2 - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
  },
};
