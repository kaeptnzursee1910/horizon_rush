// Horizon Rush – gemeinsamer Neon-Grafikstil aller Spiele und Menüs:
// dunkler Grund, leuchtende Konturen mit klaren (gefasten) Kanten, Spieler als Achteck-Token mit Symbol.
// Drei Detailstufen: Grundform (Leuchtkontur), Innenzeichnung (feine Linien), Lichtwirkung
// (Lichtflecken, Scanlines, Randabdunklung – mit HR.ST.fx = false abschaltbar).
'use strict';

const ST = HR.ST = {
  NIGHT: '#07060f', PANEL: '#110e24', BODY: '#0c0a1c', GRID: '#231e4d', GRID2: '#141133',
  TEXT: '#f2eeff', DIM: '#8f88bb',
  MAGENTA: '#ff2bd6', CYAN: '#18e7ff', LIME: '#b6ff2e', YELLOW: '#ffe23d', ORANGE: '#ff7a1a', VIOLET: '#9b5cff', RED: '#ff3355', ICE: '#e8f4ff', GREEN: '#2bff88',
  INK: '#0b0918',             // dunkle Flächen und Trennlinien
  INK_RGB: [11, 9, 24],
  LW: 5,
  fx: true,                   // Lichtwirkung an/aus
  SYMS: ['blitz', 'raute', 'dreieck', 'quadrat', 'sechseck', 'stern', 'plus', 'kreis'],

  rgb: (c, a) => a == null ? U.rgb(c) : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`,
  dark: c => U.shade(c, 0.55),
  light: c => U.mix(c, [255, 255, 255], 0.45),
  hex2rgb(h) { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; },
  rgba(h, a) { const c = typeof h === 'string' ? ST.hex2rgb(h) : h; return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; },

  // ---------- Farben ----------
  // beliebige Canvas-Farbe in [r,g,b,a] umwandeln (zwischengespeichert)
  _pc: new Map(), _pctx: null,
  parse(c) {
    let v = ST._pc.get(c); if (v) return v;
    if (!ST._pctx) ST._pctx = U.canvas(1, 1).getContext('2d');
    const x = ST._pctx; x.fillStyle = '#000'; x.fillStyle = c; const s = x.fillStyle;
    if (s[0] === '#') { const n = parseInt(s.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255, 1]; }
    else { const m = s.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; }
    ST._pc.set(c, v); return v;
  },
  // Pastell-/Cartoonfarbe in eine Neonfarbe übersetzen (gleicher Farbton, satt und hell)
  _nc: new Map(),
  neonRGB(c) {
    const key = typeof c === 'string' ? c : c.join();
    let v = ST._nc.get(key); if (v) return v;
    const [r, g, b] = typeof c === 'string' ? ST.parse(c) : c;
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn;
    let h = 0;
    if (d > 0) {
      if (mx === r / 255) h = ((g - b) / 255 / d) % 6; else if (mx === g / 255) h = (b - r) / 255 / d + 2; else h = (r - g) / 255 / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (s < 0.18 || d < 0.08) v = l > 0.8 ? [236, 244, 255] : [170, 162, 220];
    else v = ST.hsl(h, 1, U.clamp(l, 0.56, 0.66));
    ST._nc.set(key, v); return v;
  },
  neon(c) { return U.rgb(ST.neonRGB(c)); },
  hsl(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  },
  whiten(c, k) { return U.mix(c, [255, 255, 255], k); },

  // ---------- Leuchtlinien ----------
  // den aktuellen Pfad leuchtend nachziehen (ohne teuren Weichzeichner: breite, schwache Striche + heller Kern)
  glow(g, color, w, a) {
    const c = typeof color === 'string' ? ST.parse(color) : color;
    const A = g.globalAlpha, al = a == null ? 1 : a;
    g.lineJoin = 'miter'; g.miterLimit = 4;
    if (ST.fx) {
      g.globalAlpha = A * al * 0.16; g.strokeStyle = U.rgb(c); g.lineWidth = w * 3.4; g.stroke();
      g.globalAlpha = A * al * 0.35; g.lineWidth = w * 1.9; g.stroke();
    }
    g.globalAlpha = A * al; g.lineWidth = w; g.stroke();
    g.strokeStyle = U.rgb(ST.whiten(c, ST.fx ? 0.55 : 0.3)); g.lineWidth = Math.max(1, w * (ST.fx ? 0.38 : 0.25)); g.stroke();
    g.globalAlpha = A;
  },
  // feine Innenlinie
  thin(g, color, w, a) {
    const A = g.globalAlpha; g.globalAlpha = A * (a == null ? 0.6 : a);
    g.strokeStyle = typeof color === 'string' ? color : U.rgb(color); g.lineWidth = w || 1.5; g.stroke(); g.globalAlpha = A;
  },
  // Fläche: dunkler Körper, leichter Farbschimmer, Leuchtkontur in Neon
  fill(g, fill, lw) {
    lw = lw || ST.LW;
    let col;
    if (typeof fill === 'string') col = ST.neonRGB(fill);
    else if (Array.isArray(fill)) col = ST.neonRGB(fill);
    else col = [232, 244, 255];
    const pa = typeof fill === 'string' ? ST.parse(fill)[3] : 1;
    const A = g.globalAlpha;
    if (pa > 0.6) { g.fillStyle = ST.BODY; g.fill(); }
    g.globalAlpha = A * (pa > 0.6 ? 0.2 : 0.12); g.fillStyle = U.rgb(col); g.fill();
    g.globalAlpha = A;
    ST.glow(g, col, Math.max(1.5, lw * 0.62));
  },
  // massiv leuchtende Fläche (Lampen, Laser, Signale)
  solid(g, color, a) {
    const c = typeof color === 'string' ? ST.parse(color) : color, A = g.globalAlpha;
    g.globalAlpha = A * (a == null ? 0.85 : a); g.fillStyle = U.rgb(c); g.fill();
    g.globalAlpha = A; ST.glow(g, ST.whiten(c, 0.2), 2.5);
  },

  shadow(g, x, y, rx, ry, a) { g.fillStyle = `rgba(0,0,0,${a == null ? 0.45 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); },
  // weicher Farbschein auf dem Boden
  pool(g, x, y, r, col, a) {
    if (!ST.fx || r < 2) return;
    const c = typeof col === 'string' ? ST.parse(col) : col;
    const gr = g.createRadialGradient(x, y, 1, x, y, r);
    gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 0.25 : a})`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  },

  // gefastes Rechteck (ersetzt abgerundete Ecken)
  rrect(g, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    const c = Math.max(0, Math.min(r * 0.8, w / 2, h / 2));
    g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h); g.lineTo(x, y + h - c); g.lineTo(x, y + c); g.closePath();
  },
  oct(g, x, y, r, rot) { g.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4 + (rot || 0); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); },
  line(g, x0, y0, x1, y1) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); },

  // Rasterboden; die Akzentfarbe ergibt sich aus der (alten) Bodenfarbe
  floor(g, x, y, w, h, c1, c2, cell) {
    cell = cell || 100;
    const acc = ST.neonRGB(c1 || '#9b5cff');
    g.fillStyle = '#0a0817'; g.fillRect(x, y, w, h);
    if (ST.fx) {
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
      gr.addColorStop(0, ST.rgb(acc, 0.09)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    const lw = Math.max(1, cell / 60);
    g.beginPath();
    for (let i = x + cell / 2; i < x + w; i += cell) { g.moveTo(i, y); g.lineTo(i, y + h); }
    for (let j = y + cell / 2; j < y + h; j += cell) { g.moveTo(x, j); g.lineTo(x + w, j); }
    g.strokeStyle = ST.rgb(acc, 0.06); g.lineWidth = lw; g.stroke();
    g.beginPath();
    for (let i = x + cell; i < x + w; i += cell) { g.moveTo(i, y); g.lineTo(i, y + h); }
    for (let j = y + cell; j < y + h; j += cell) { g.moveTo(x, j); g.lineTo(x + w, j); }
    g.strokeStyle = ST.rgb(acc, 0.17); g.lineWidth = lw * 1.4; g.stroke();
    g.fillStyle = ST.rgb(acc, 0.45);
    const d = lw * 2.5;
    for (let i = x + cell * 2; i < x + w; i += cell * 2) for (let j = y + cell * 2; j < y + h; j += cell * 2) g.fillRect(i - d / 2, j - d / 2, d, d);
  },
  // leuchtender Rahmen mit Innenlinie, Eckwinkeln und Randmarken
  frame(g, x, y, w, h, col, lw, cell) {
    col = col || ST.CYAN; lw = lw || 5; const c = ST.parse(col);
    const ch = Math.min(w, h) * 0.03 + 6;
    ST.rrect(g, x, y, w, h, ch); ST.glow(g, c, lw);
    ST.rrect(g, x + lw * 2.5, y + lw * 2.5, w - lw * 5, h - lw * 5, ch * 0.7); ST.thin(g, c, Math.max(1, lw * 0.3), 0.35);
    const b = Math.min(w, h) * 0.06 + 10, o = lw * 4;
    g.beginPath();
    for (const [cx, cy, sx, sy] of [[x + o, y + o, 1, 1], [x + w - o, y + o, -1, 1], [x + o, y + h - o, 1, -1], [x + w - o, y + h - o, -1, -1]]) { g.moveTo(cx, cy + sy * b); g.lineTo(cx, cy); g.lineTo(cx + sx * b, cy); }
    ST.glow(g, c, lw * 0.5);
    if (cell) {
      g.fillStyle = ST.rgb(c, 0.55);
      for (let i = x + cell; i < x + w - cell / 2; i += cell) { g.fillRect(i - 1, y - lw * 2.4, 2, lw * 1.2); g.fillRect(i - 1, y + h + lw * 1.2, 2, lw * 1.2); }
      for (let j = y + cell; j < y + h - cell / 2; j += cell) { g.fillRect(x - lw * 2.4, j - 1, lw * 1.2, 2); g.fillRect(x + w + lw * 1.2, j - 1, lw * 1.2, 2); }
    }
  },

  // Hintergrund außerhalb des Spielfelds (ganze Leinwand, zwischengespeichert)
  _bd: null,
  backdrop(g, W, H, top) {
    const key = Math.round(W) + 'x' + Math.round(H) + (top || '');
    if (!ST._bd || ST._bd.key !== key) {
      const c = U.canvas(Math.max(2, Math.round(W)), Math.max(2, Math.round(H))), x = c.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#07060f'); gr.addColorStop(0.65, '#0d0920'); gr.addColorStop(1, '#170b2c');
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      const r = U.rng(17);
      for (let i = 0; i < W * H / 6000; i++) {
        const s = r.random();
        x.fillStyle = `rgba(242,238,255,${0.15 + s * 0.5})`;
        x.fillRect(r.random() * W, r.random() * H, s > 0.92 ? 2 : 1, s > 0.92 ? 2 : 1);
      }
      x.strokeStyle = 'rgba(155,92,255,.07)'; x.lineWidth = 1; x.beginPath();
      for (let gx = 0; gx < W; gx += 48) { x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, H); }
      for (let gy = 0; gy < H; gy += 48) { x.moveTo(0, gy + 0.5); x.lineTo(W, gy + 0.5); }
      x.stroke();
      ST._bd = { key, c };
    }
    g.drawImage(ST._bd.c, 0, 0, W, H);
  },
  // Abschluss: Scanlines und Randabdunklung über dem Spielbild
  _ov: null,
  overlay(g, W, H) {
    if (!ST.fx) return;
    const key = Math.round(W) + 'x' + Math.round(H);
    if (!ST._ov || ST._ov.key !== key) {
      const c = U.canvas(Math.max(2, Math.round(W)), Math.max(2, Math.round(H))), x = c.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,.10)';
      for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
      const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
      x.fillStyle = v; x.fillRect(0, 0, W, H);
      ST._ov = { key, c };
    }
    g.drawImage(ST._ov.c, 0, 0, W, H);
  },

  // ---------- Spieler-Token ----------
  _si: new Map(),
  symFor(col) {
    const key = col.join ? col.join() : String(col);
    let s = ST._si.get(key);
    if (s === undefined) {
      const i = (HR.PARTY_COLORS || []).findIndex(c => c.join() === key);
      s = i >= 0 ? ST.SYMS[i] : 'auge';
      ST._si.set(key, s);
    }
    return s;
  },
  symbol(g, kind, x, y, s, col) {
    const c = typeof col === 'string' ? ST.parse(col) : col;
    const fc = U.rgb(ST.whiten(c, 0.3));
    g.fillStyle = fc; g.strokeStyle = fc; g.lineWidth = s * 0.34; g.lineCap = 'butt';
    g.beginPath();
    const P = pts => { pts.forEach(([a, b], i) => i ? g.lineTo(x + a * s, y + b * s) : g.moveTo(x + a * s, y + b * s)); g.closePath(); g.fill(); };
    if (kind === 'kreis') { g.arc(x, y, s * 0.55, 0, 7); g.fill(); }
    else if (kind === 'dreieck') P([[0, -0.72], [0.66, 0.5], [-0.66, 0.5]]);
    else if (kind === 'quadrat') P([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]);
    else if (kind === 'raute') P([[0, -0.78], [0.6, 0], [0, 0.78], [-0.6, 0]]);
    else if (kind === 'sechseck') { const p = []; for (let k = 0; k < 6; k++) p.push([Math.cos(k * Math.PI / 3) * 0.66, Math.sin(k * Math.PI / 3) * 0.66]); P(p); }
    else if (kind === 'stern') { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.33 : 0.78; p.push([Math.cos(a) * r, Math.sin(a) * r]); } P(p); }
    else if (kind === 'blitz') P([[0.12, -0.8], [-0.5, 0.1], [-0.02, 0.1], [-0.16, 0.8], [0.5, -0.12], [0.02, -0.12]]);
    else if (kind === 'kreuz') { g.moveTo(x - s * 0.5, y - s * 0.5); g.lineTo(x + s * 0.5, y + s * 0.5); g.moveTo(x + s * 0.5, y - s * 0.5); g.lineTo(x - s * 0.5, y + s * 0.5); g.stroke(); }
    else if (kind === 'plus') { g.moveTo(x - s * 0.62, y); g.lineTo(x + s * 0.62, y); g.moveTo(x, y - s * 0.62); g.lineTo(x, y + s * 0.62); g.stroke(); }
    else { g.ellipse(x, y, s * 0.7, s * 0.38, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, s * 0.2, 0, 7); g.fill(); }
  },

  // Token als kleines SVG für Menüs und Lobby (Achteck + Symbol)
  tokenSVG(col, size) {
    const c = typeof col === 'string' ? ST.parse(col) : col, rgb = `rgb(${c[0]},${c[1]},${c[2]})`, lt = U.rgb(ST.whiten(c, 0.3));
    const pts = (arr, k) => arr.map(([x, y]) => (x * k).toFixed(2) + ',' + (y * k).toFixed(2)).join(' ');
    const ring = n => { const a = []; for (let i = 0; i < n; i++) { const t = Math.PI / n + i * 2 * Math.PI / n; a.push([Math.cos(t), Math.sin(t)]); } return a; };
    const kind = ST.symFor(c);
    let sym;
    if (kind === 'kreis') sym = `<circle r="2.8" fill="${lt}"/>`;
    else if (kind === 'dreieck') sym = `<polygon points="${pts([[0, -0.72], [0.66, 0.5], [-0.66, 0.5]], 5)}" fill="${lt}"/>`;
    else if (kind === 'quadrat') sym = `<rect x="-2.5" y="-2.5" width="5" height="5" fill="${lt}"/>`;
    else if (kind === 'raute') sym = `<polygon points="${pts([[0, -0.78], [0.6, 0], [0, 0.78], [-0.6, 0]], 5)}" fill="${lt}"/>`;
    else if (kind === 'sechseck') sym = `<polygon points="${pts(ring(6).map(([x, y]) => [y, x]), 3.3)}" fill="${lt}"/>`;
    else if (kind === 'stern') { const a = []; for (let k = 0; k < 10; k++) { const t = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.33 : 0.78; a.push([Math.cos(t) * r, Math.sin(t) * r]); } sym = `<polygon points="${pts(a, 5)}" fill="${lt}"/>`; }
    else if (kind === 'plus') sym = `<path d="M-3.1 0H3.1M0 -3.1V3.1" stroke="${lt}" stroke-width="1.7"/>`;
    else if (kind === 'blitz') sym = `<polygon points="${pts([[0.12, -0.8], [-0.5, 0.1], [-0.02, 0.1], [-0.16, 0.8], [0.5, -0.12], [0.02, -0.12]], 5)}" fill="${lt}"/>`;
    else sym = `<circle r="1.6" fill="${lt}"/>`;
    const s = size || 22;
    return `<svg class="tok" width="${s}" height="${s}" viewBox="-12 -12 24 24" aria-hidden="true" style="filter:drop-shadow(0 0 3px ${rgb})"><polygon points="${pts(ring(8), 10)}" fill="rgba(${c[0]},${c[1]},${c[2]},.16)" stroke="${rgb}" stroke-width="1.8"/>${sym}</svg>`;
  },

  // Der Spieler als Token. o: {look:[x,y], t, stun, dead, hat:'crown'|'cowboy'|'beanie', squash, alpha, noShadow, still, sym}
  char(g, x, y, r, col, o) {
    o = o || {};
    const t = o.t || 0, sq = o.squash || 0;
    const bob = o.still ? 0 : Math.sin(t * 6 + x * 0.05) * r * 0.05;
    const A = g.globalAlpha;
    if (o.alpha != null) g.globalAlpha = A * o.alpha;
    const out = !!o.dead, c = out ? [90, 84, 130] : col;
    if (!o.noShadow) { ST.shadow(g, x, y + r * 0.95, r * 0.8, r * 0.22, 0.4); if (!out) ST.pool(g, x, y + r * 0.4, r * 2.4, col, 0.2); }
    g.save();
    g.translate(x, y + bob);
    g.scale(1 + sq, 1 - sq);
    // Körper und Ring
    ST.oct(g, 0, 0, r);
    g.fillStyle = ST.BODY; g.fill();
    g.globalAlpha = g.globalAlpha * 0.2; g.fillStyle = U.rgb(c); g.fill(); g.globalAlpha = A * (o.alpha != null ? o.alpha : 1);
    if (out) { g.setLineDash([r * 0.3, r * 0.25]); ST.glow(g, c, Math.max(1.5, r * 0.11)); g.setLineDash([]); }
    else ST.glow(g, c, Math.max(1.5, r * 0.13));
    if (!out && r >= 11) {
      ST.oct(g, 0, 0, r * 0.68); ST.thin(g, c, Math.max(1, r * 0.045), 0.7);
      if (r >= 16) {
        g.beginPath();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); g.lineTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88); }
        ST.thin(g, c, Math.max(1, r * 0.05), 0.75);
      }
      // Glanzkante oben links
      const a1 = Math.PI / 8 + Math.PI, a2 = a1 + Math.PI / 4, rr = r - Math.max(2, r * 0.12);
      ST.line(g, Math.cos(a1) * rr, Math.sin(a1) * rr, Math.cos(a2) * rr, Math.sin(a2) * rr);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, r * 0.06); g.stroke();
    }
    // Richtungsspitze (ersetzt die Augen)
    const lk = o.look || [0, 0], ll = Math.hypot(lk[0], lk[1]);
    if (!out && ll > 0.3) {
      const d = Math.atan2(lk[1], lk[0]);
      const P = (a, k) => [Math.cos(d + a) * r * k, Math.sin(d + a) * r * k];
      const [lx, ly] = P(-0.42, 0.98), [tx, ty] = P(0, 1.5), [rx, ry] = P(0.42, 0.98), [mx, my] = P(0, 1.12);
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(tx, ty); g.lineTo(rx, ry); g.lineTo(mx, my); g.closePath();
      const B = g.globalAlpha; g.globalAlpha = B * 0.55; g.fillStyle = U.rgb(c); g.fill(); g.globalAlpha = B;
      ST.glow(g, c, Math.max(1.2, r * 0.09));
    }
    // Symbol
    ST.symbol(g, out ? 'kreuz' : (o.sym || ST.symFor(col)), 0, 0, r * 0.5, out ? [150, 144, 190] : c);
    if (o.stun) {
      g.setLineDash([r * 0.2, r * 0.3]); g.beginPath(); g.arc(0, 0, r * 1.38, t * 3, t * 3 + 7); ST.glow(g, [255, 255, 255], Math.max(1.2, r * 0.07)); g.setLineDash([]);
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + k * 2.1, sx = Math.cos(a) * r * 1.55, sy = Math.sin(a) * r * 1.55 * 0.6 - r * 0.6, s = r * 0.16;
        g.beginPath(); g.moveTo(sx, sy - s); g.lineTo(sx + s * 0.7, sy); g.lineTo(sx, sy + s); g.lineTo(sx - s * 0.7, sy); g.closePath();
        g.fillStyle = ST.YELLOW; g.fill();
      }
    }
    if (o.hat) ST.hat(g, o.hat, r, t);
    g.restore();
    g.globalAlpha = A;
  },

  hat(g, kind, r, t) {
    if (kind === 'crown') {
      g.save(); g.translate(0, -r * 1.12); g.rotate(Math.sin(t * 4) * 0.06);
      g.beginPath(); g.moveTo(-r * 0.85, r * 0.3); g.lineTo(-r * 0.85, -r * 0.25); g.lineTo(-r * 0.42, r * 0.05); g.lineTo(0, -r * 0.45); g.lineTo(r * 0.42, r * 0.05); g.lineTo(r * 0.85, -r * 0.25); g.lineTo(r * 0.85, r * 0.3); g.closePath();
      g.fillStyle = 'rgba(255,226,61,.25)'; g.fill(); ST.glow(g, ST.YELLOW, Math.max(1.5, r * 0.1));
      for (const dx of [-0.42, 0, 0.42]) { g.beginPath(); g.arc(dx * r, r * 0.14, Math.max(1.5, r * 0.08), 0, 7); g.fillStyle = ST.MAGENTA; g.fill(); }
      g.restore();
    } else if (kind === 'cowboy') {
      g.beginPath(); g.moveTo(-r * 1.15, -r * 0.82); g.lineTo(-r * 0.6, -r * 0.92); g.lineTo(-r * 0.48, -r * 1.42); g.lineTo(r * 0.48, -r * 1.42); g.lineTo(r * 0.6, -r * 0.92); g.lineTo(r * 1.15, -r * 0.82);
      ST.glow(g, ST.ORANGE, Math.max(1.5, r * 0.08));
      ST.line(g, -r * 0.55, -r * 1.05, r * 0.55, -r * 1.05); ST.thin(g, ST.ORANGE, Math.max(1, r * 0.05), 0.8);
    } else if (kind === 'beanie') {
      g.beginPath(); g.moveTo(-r * 0.72, -r * 0.7); g.lineTo(-r * 0.55, -r * 1.12); g.lineTo(0, -r * 1.3); g.lineTo(r * 0.55, -r * 1.12); g.lineTo(r * 0.72, -r * 0.7); g.closePath();
      g.fillStyle = 'rgba(232,244,255,.15)'; g.fill(); ST.glow(g, ST.ICE, Math.max(1.5, r * 0.08));
      ST.oct(g, 0, -r * 1.42, r * 0.16); ST.glow(g, ST.ICE, Math.max(1, r * 0.06));
    }
  },

  // Markierung "das bist du" (Leuchtpfeil über dem Token)
  you(g, x, y, t, label) {
    const yy = y + Math.sin(t * 6) * 5;
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x - 13, yy - 15); g.lineTo(x, yy - 9); g.lineTo(x + 13, yy - 15); g.closePath();
    g.fillStyle = 'rgba(255,226,61,.6)'; g.fill(); ST.glow(g, ST.YELLOW, 2.5);
    if (label) ST.text(g, label, x, yy - 18, 20, ST.YELLOW, 'center', 'bottom');
  },

  // Schrift: eckige Display-Schrift mit Leuchten und dunkler Kante
  text(g, txt, x, y, size, color, align, base) {
    txt = String(txt);
    g.font = `700 ${Math.round(size)}px ${HR.FONT}`; g.textAlign = align || 'center'; g.textBaseline = base || 'middle';
    g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * 0.14); g.strokeStyle = 'rgba(7,6,15,.85)'; g.strokeText(txt, x, y);
    const col = color || ST.TEXT;
    if (ST.fx && size >= 18) {
      const A = g.globalAlpha; g.globalAlpha = A * 0.45;
      g.shadowColor = col; g.shadowBlur = size * 0.45; g.fillStyle = col; g.fillText(txt, x, y);
      g.shadowBlur = 0; g.shadowColor = 'transparent'; g.globalAlpha = A;
    }
    g.fillStyle = col; g.fillText(txt, x, y);
  },

  // Münze / Edelstein / Bombe als Leuchtformen
  coin(g, x, y, r, t) {
    const w = Math.max(0.25, Math.abs(Math.cos((t || 0) * 3 + x * 0.01)));
    ST.pool(g, x, y, r * 2.2, ST.YELLOW, 0.22);
    g.save(); g.translate(x, y); g.scale(w, 1);
    ST.oct(g, 0, 0, r); g.fillStyle = 'rgba(255,226,61,.22)'; g.fill(); ST.glow(g, ST.YELLOW, Math.max(1.5, r * 0.16) / Math.max(w, 0.6));
    if (w > 0.45) { ST.oct(g, 0, 0, r * 0.55); ST.thin(g, ST.YELLOW, Math.max(1, r * 0.1), 0.8); }
    g.restore();
  },
  gem(g, x, y, r, col) {
    const c = ST.neonRGB(col || '#18e7ff');
    ST.pool(g, x, y, r * 2.2, c, 0.25);
    g.beginPath(); g.moveTo(x - r * 0.9, y - r * 0.3); g.lineTo(x - r * 0.45, y - r * 0.9); g.lineTo(x + r * 0.45, y - r * 0.9); g.lineTo(x + r * 0.9, y - r * 0.3); g.lineTo(x, y + r); g.closePath();
    g.fillStyle = ST.rgb(c, 0.3); g.fill(); ST.glow(g, c, Math.max(1.5, r * 0.14));
    g.beginPath(); g.moveTo(x - r * 0.9, y - r * 0.3); g.lineTo(x + r * 0.9, y - r * 0.3); g.moveTo(x - r * 0.45, y - r * 0.3); g.lineTo(x, y + r); g.lineTo(x + r * 0.45, y - r * 0.3);
    ST.thin(g, ST.whiten(c, 0.6), Math.max(1, r * 0.07), 0.85);
  },
  bomb(g, x, y, r, t) {
    ST.pool(g, x, y, r * 2, ST.RED, 0.2);
    ST.oct(g, x, y, r); g.fillStyle = ST.BODY; g.fill(); g.fillStyle = 'rgba(255,51,85,.2)'; g.fill(); ST.glow(g, ST.RED, Math.max(1.5, r * 0.14));
    ST.oct(g, x, y, r * 0.55); ST.thin(g, ST.RED, Math.max(1, r * 0.07), 0.7);
    g.beginPath(); g.moveTo(x + r * 0.5, y - r * 0.8); g.lineTo(x + r * 0.9, y - r * 1.25); g.lineTo(x + r * 1.25, y - r * 1.3); ST.glow(g, ST.ORANGE, Math.max(1, r * 0.1));
    const on = Math.floor((t || 0) * 12) % 2;
    g.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + (on ? 0.4 : 0); g.moveTo(x + r * 1.25, y - r * 1.3); g.lineTo(x + r * 1.25 + Math.cos(a) * r * 0.4, y - r * 1.3 + Math.sin(a) * r * 0.4); }
    ST.glow(g, on ? ST.YELLOW : ST.ORANGE, Math.max(1, r * 0.08));
  },

  // Funkenexplosion (Zeit seit Beginn k, 0..1)
  burst(g, x, y, k, col, n, size) {
    if (k < 0 || k > 1) return;
    n = n || 10; size = size || 60;
    const c = ST.neonRGB(col || '#ffe23d'), A = g.globalAlpha;
    g.globalAlpha = A * Math.max(0, 1 - k);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + i * 0.7, d0 = size * (0.15 + k * 0.7), d1 = d0 + size * (0.25 + (i % 3) * 0.12) * (1 - k * 0.5);
      g.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); g.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
    }
    ST.glow(g, c, Math.max(1.5, size * 0.05));
    g.beginPath(); g.arc(x, y, size * (0.2 + k * 0.9), 0, 7); ST.glow(g, c, Math.max(1, size * 0.04 * (1 - k)));
    g.globalAlpha = A;
  },

  // ---------- Steuerung (unverändert) ----------
  dir(i) { let x = (i.r ? 1 : 0) - (i.l ? 1 : 0), y = (i.d ? 1 : 0) - (i.u ? 1 : 0); const n = Math.hypot(x, y) || 1; return [x / n, y / n]; },

  separate(list, r) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < r * 2) { const k = (r * 2 - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
  },
};

// Helfer aus dem Original-Stil, damit Zeichnungen ohne eigene Neon-Fassung trotzdem funktionieren
for (const [k, v] of Object.entries({
  "ASPHALT": '#6f6f75',
  "ASPHALT2": '#66666c',
  "GRASS": '#6ebe50',
  "GRASS2": '#60ac46',
  "SKY": ['#2878dc', '#afd7fa'],
  "KERB": ['#f0f0f0', '#cd2d2d'],
  "kind": function (h) {
    if (typeof h !== 'string' || h[0] !== '#' || h.length < 7) return 'other';
    const [r, gg, b] = ST.hex2rgb(h), l = 0.3 * r + 0.59 * gg + 0.11 * b;
    if (l < 45) return 'dark';
    if (gg > r + 15 && gg > b + 5) return 'green';
    if (b > r + 40 && b >= gg) return 'sky';
    return 'other';
  },
  "grain": function (g, x, y, w, h, col, n, sz) {
    g.fillStyle = col; let s = 1234567;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) g.fillRect(x + r() * w, y + r() * h, sz, sz);
  },
  "grass": function (g, x, y, w, h, band) {
    band = band || 60;
    for (let i = 0; i * band < h; i++) { g.fillStyle = i % 2 ? ST.GRASS2 : ST.GRASS; g.fillRect(x, y + i * band, w, Math.min(band, h - i * band)); }
    ST.grain(g, x, y, w, h, 'rgba(30,80,20,.22)', Math.min(1500, (w * h) / 900), 3);
  },
  "kerb": function (g, x, y, w, h, t, seg) {
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
  "tyre": function (g, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.3, r, 0, 7); g.fill();
    g.fillStyle = '#1c1c20'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = '#4a4a52'; g.lineWidth = Math.max(1, r * 0.14); g.beginPath(); g.arc(x, y, r * 0.72, 0, 7); g.stroke();
    g.fillStyle = '#34343a'; g.beginPath(); g.arc(x, y, r * 0.42, 0, 7); g.fill();
  },
  "car": function (g, x, y, ang, col, L, o) {
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
  }
})) if (!(k in ST)) ST[k] = v;
