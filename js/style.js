// Horizon Rush – gemeinsamer Grafikstil der Party-Spiele im Look des Rennspiels:
// Asphalt, Rasen mit Mähstreifen, rot-weiße Randsteine, Reifenstapel und Rennfahrer mit Helm
'use strict';

const ST = HR.ST = {
  INK: '#1c1c22',             // Umrisse (dezent, wie im Rennspiel)
  INK_RGB: [28, 28, 34],
  LW: 3,                      // Umrissbreite in Weltpixeln
  ASPHALT: '#6f6f75', ASPHALT2: '#66666c', GRASS: '#6ebe50', GRASS2: '#60ac46',
  SKY: ['#2878dc', '#afd7fa'], KERB: ['#f0f0f0', '#cd2d2d'],

  rgb: (c, a) => a == null ? U.rgb(c) : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`,
  dark: c => U.shade(c, 0.68),
  light: c => U.mix(c, [255, 255, 255], 0.38),

  // Fläche mit Umriss
  fill(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw || ST.LW; g.strokeStyle = ST.INK; g.lineJoin = 'round'; g.stroke(); },

  shadow(g, x, y, rx, ry, a) { g.fillStyle = `rgba(0,0,0,${a == null ? 0.25 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); },

  rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); },

  hex2rgb(h) { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; },
  // grobe Einordnung einer Farbe: 'green' | 'sky' | 'dark' | 'other'
  kind(h) {
    if (typeof h !== 'string' || h[0] !== '#' || h.length < 7) return 'other';
    const [r, gg, b] = ST.hex2rgb(h), l = 0.3 * r + 0.59 * gg + 0.11 * b;
    if (l < 45) return 'dark';
    if (gg > r + 15 && gg > b + 5) return 'green';
    if (b > r + 40 && b >= gg) return 'sky';
    return 'other';
  },

  // feines Rauschen (Asphaltkörnung, Grashalme) – fest verteilt, damit nichts flimmert
  grain(g, x, y, w, h, col, n, sz) {
    g.fillStyle = col; let s = 1234567;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) g.fillRect(x + r() * w, y + r() * h, sz, sz);
  },

  // Rasen mit Mähstreifen
  grass(g, x, y, w, h, band) {
    band = band || 60;
    for (let i = 0; i * band < h; i++) { g.fillStyle = i % 2 ? ST.GRASS2 : ST.GRASS; g.fillRect(x, y + i * band, w, Math.min(band, h - i * band)); }
    ST.grain(g, x, y, w, h, 'rgba(30,80,20,.22)', Math.min(1500, (w * h) / 900), 3);
  },

  // rot-weißer Randstein um ein Rechteck
  kerb(g, x, y, w, h, t, seg) {
    t = t || 12; seg = seg || 40;
    const side = (x0, y0, len, horiz) => {
      for (let i = 0; i * seg < len; i++) {
        g.fillStyle = ST.KERB[i % 2]; const l = Math.min(seg, len - i * seg);
        if (horiz) g.fillRect(x0 + i * seg, y0, l, t); else g.fillRect(x0, y0 + i * seg, t, l);
      }
    };
    side(x - t, y - t, w + 2 * t, true); side(x - t, y + h, w + 2 * t, true);
    side(x - t, y, h, false); side(x + w, y, h, false);
  },

  // Spielfeld-Untergrund: Rasen (grüne Spiele) oder Asphalt mit Markierungen, Randsteine außen
  floor(g, x, y, w, h, c1, c2, cell) {
    cell = cell || 100;
    if (ST.kind(c1) === 'green') ST.grass(g, x, y, w, h, cell);
    else {
      g.fillStyle = ST.ASPHALT; g.fillRect(x, y, w, h);
      ST.grain(g, x, y, w, h, 'rgba(255,255,255,.07)', Math.min(2500, (w * h) / 500), 2);
      ST.grain(g, x + 3, y + 5, w - 6, h - 6, 'rgba(0,0,0,.10)', Math.min(2500, (w * h) / 500), 2);
      g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 3; g.setLineDash([24, 18]); g.beginPath();
      for (let i = 1; i * cell < w; i++) { g.moveTo(x + i * cell, y); g.lineTo(x + i * cell, y + h); }
      for (let j = 1; j * cell < h; j++) { g.moveTo(x, y + j * cell); g.lineTo(x + w, y + j * cell); }
      g.stroke(); g.setLineDash([]);
    }
    ST.kerb(g, x, y, w, h, 12, 40);
  },

  // Reifenstapel
  tyre(g, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.3, r, 0, 7); g.fill();
    g.fillStyle = '#1c1c20'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = '#4a4a52'; g.lineWidth = Math.max(1, r * 0.14); g.beginPath(); g.arc(x, y, r * 0.72, 0, 7); g.stroke();
    g.fillStyle = '#34343a'; g.beginPath(); g.arc(x, y, r * 0.42, 0, 7); g.fill();
  },

  // Hintergrund außerhalb des Spielfelds: Himmel (helle blaue Spiele), Nacht (dunkle) oder Rasen mit Reifenwand
  backdrop(g, W, H, top, bot) {
    const k = top ? ST.kind(top) : 'other';
    if (k === 'dark') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot || '#050505');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); return;
    }
    if (k === 'sky') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, ST.SKY[0]); gr.addColorStop(1, ST.SKY[1]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H); return;
    }
    ST.grass(g, 0, 0, W, H, 70);
    const r = 15;
    for (let x = r; x < W; x += r * 2.1) { ST.tyre(g, x, r + 4, r); ST.tyre(g, x, H - r - 4, r); }
  },

  // Die Party-Figur: Rennfahrer mit Helm, von schräg oben.
  // o: {look:[x,y], t, stun, dead, hat:'crown'|'cowboy'|'beanie', squash, alpha}
  char(g, x, y, r, col, o) {
    o = o || {};
    const t = o.t || 0, sq = o.squash || 0;
    const bob = o.still ? 0 : Math.sin(t * 9 + x * 0.05) * r * 0.03;
    const lw = Math.max(1.5, r * 0.08);
    g.save();
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (!o.noShadow) ST.shadow(g, x, y + r * 0.92, r * 0.85, r * 0.24);
    g.translate(x, y + bob);
    g.scale(1 + sq, 1 - sq);
    // Schuhe
    g.fillStyle = '#1c1c22';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.36, r * 0.86, r * 0.24, r * 0.13, 0, 0, 7); g.fill(); }
    // Rennanzug (Schultern)
    const dk = ST.rgb(ST.dark(col));
    g.beginPath(); g.ellipse(0, r * 0.5, r * 0.82, r * 0.42, 0, 0, 7); ST.fill(g, dk, lw);
    g.fillStyle = '#f2f2f2'; g.fillRect(-r * 0.1, r * 0.12, r * 0.2, r * 0.78);
    // Helm mit Glanz
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.5, r * 0.08, 0, -r * 0.1, r * 0.85);
    gr.addColorStop(0, ST.rgb(ST.light(col))); gr.addColorStop(0.5, ST.rgb(col)); gr.addColorStop(1, dk);
    g.beginPath(); g.arc(0, -r * 0.12, r * 0.74, 0, 7); ST.fill(g, gr, lw);
    // Helmstreifen
    g.save(); g.beginPath(); g.arc(0, -r * 0.12, r * 0.74, 0, 7); g.clip();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(-r * 0.09, -r * 0.9, r * 0.18, r * 0.5);
    g.restore();
    // Visier, zeigt die Blickrichtung
    const lk = o.look || [0, 0.25], vx = U.clamp(lk[0], -1, 1) * r * 0.2, vy = U.clamp(lk[1], -1, 1) * r * 0.1;
    g.beginPath(); g.roundRect(-r * 0.5 + vx, -r * 0.2 + vy, r * 1.0, r * 0.34, r * 0.17);
    ST.fill(g, o.dead ? '#55555c' : '#2b3550', lw * 0.8);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-r * 0.36 + vx, -r * 0.14 + vy, r * 0.26, r * 0.07);
    if (o.dead) {
      g.strokeStyle = '#fff'; g.lineWidth = lw; g.beginPath();
      g.moveTo(-r * 0.2 + vx, -r * 0.18 + vy); g.lineTo(r * 0.05 + vx, r * 0.1 + vy); g.moveTo(r * 0.2 + vx, -r * 0.18 + vy); g.lineTo(-r * 0.02 + vx, r * 0.1 + vy); g.stroke();
    }
    if (o.stun && !o.dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + i * 2.1, sx = Math.cos(a) * r * 0.6, sy = -r * 1.0 + Math.sin(a) * r * 0.18;
        g.fillStyle = '#ffd23c'; g.beginPath();
        for (let k = 0; k < 10; k++) { const aa = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.07 : r * 0.16; g.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
        g.closePath(); g.fill();
      }
    }
    if (o.hat) { g.translate(0, r * 0.12); ST.hat(g, o.hat, r * 0.85, t); }
    g.restore();
  },

  // Sportwagen von oben (Nase in Richtung ang). L = Länge; o: {alpha, brake, dead}
  car(g, x, y, ang, col, L, o) {
    o = o || {};
    const w = L * 0.52, h = L, r = L * 0.14;
    g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2);
    if (o.alpha != null) g.globalAlpha = o.alpha;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.roundRect(-w / 2 + L * 0.06, -h / 2 + L * 0.08, w, h, r); g.fill();
    g.fillStyle = '#141418';
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(a * w / 2 - L * 0.045, b * h * 0.3 - L * 0.1, L * 0.09, L * 0.2);
    const c = o.dead ? [90, 90, 96] : col, gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, ST.rgb(ST.dark(c))); gr.addColorStop(0.5, ST.rgb(c)); gr.addColorStop(1, ST.rgb(ST.dark(c)));
    g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, r); ST.fill(g, gr, Math.max(1.5, L * 0.025));
    g.fillStyle = '#2b3550';
    g.beginPath(); g.moveTo(-w * 0.4, -h * 0.2); g.lineTo(w * 0.4, -h * 0.2); g.lineTo(w * 0.33, -h * 0.04); g.lineTo(-w * 0.33, -h * 0.04); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-w * 0.36, h * 0.26); g.lineTo(w * 0.36, h * 0.26); g.lineTo(w * 0.4, h * 0.37); g.lineTo(-w * 0.4, h * 0.37); g.closePath(); g.fill();
    g.fillStyle = ST.rgb(ST.light(c)); g.fillRect(-w * 0.08, -h * 0.48, w * 0.16, h * 0.96);
    g.fillStyle = '#fff6c8'; g.fillRect(-w * 0.42, -h * 0.5, w * 0.22, h * 0.04); g.fillRect(w * 0.2, -h * 0.5, w * 0.22, h * 0.04);
    g.fillStyle = o.brake ? '#ff4030' : '#b01818'; g.fillRect(-w * 0.42, h * 0.46, w * 0.22, h * 0.04); g.fillRect(w * 0.2, h * 0.46, w * 0.22, h * 0.04);
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

  // Schrift wie im Rennspiel: fett, kursiv, mit Schatten
  text(g, txt, x, y, size, color, align, base) {
    g.font = `italic 900 ${size}px ${HR.FONT}`; g.textAlign = align || 'center'; g.textBaseline = base || 'middle';
    const d = Math.max(2, size * 0.07);
    g.fillStyle = 'rgba(0,0,0,.65)'; g.fillText(txt, x + d, y + d);
    g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * 0.08); g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(txt, x, y);
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
