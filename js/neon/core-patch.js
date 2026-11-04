// Horizon Rush – Neon-Stil: wird nur geladen, wenn in den Einstellungen „Neon“ gewählt ist.
// Automatisch aus dem Stand vor der Umstellung erzeugt; ersetzt nur Zeichen-Code, die Spiellogik bleibt gemeinsam.
'use strict';

HR.FONT = '"Chakra Petch", "Arial Narrow", Arial, sans-serif';

HR.FONT_TEXT = 'Barlow, "Helvetica Neue", Arial, sans-serif';

Object.assign(HR.TRACKS[0], {
  "sky": [[7, 6, 15], [58, 12, 66]],
  "fog": [44, 10, 56],
  "light": { grass: [12, 9, 26], rumble: [200, 30, 168], road: [20, 17, 40], lane: [24, 231, 255] },
  "dark": { grass: [15, 11, 32], rumble: [150, 158, 190], road: [24, 20, 46], lane: null },
  "far": { color: [26, 12, 48], height: 0.3, ks: [3, 5, 8, 13], rough: 0.8 },
  "near": { color: [14, 10, 30], height: 0.15, ks: [4, 7, 11, 17], rough: 0.6 },
  "neon": { edge: [24, 231, 255], grid: [255, 43, 214], ridge: [155, 92, 255], ridge2: [155, 92, 255], horizon: [255, 43, 214], sun: [[255, 226, 61], [255, 43, 214]], skyline: true },
  "sea": { water: [[6, 12, 40], [8, 16, 50]], sand: [[38, 16, 46], [44, 18, 54]] }
});

delete HR.TRACKS[0]["sun"];

delete HR.TRACKS[0]["clouds"];

Object.assign(HR.TRACKS[1], {
  "sky": [[4, 6, 14], [20, 34, 74]],
  "fog": [20, 32, 68],
  "light": { grass: [10, 14, 30], rumble: [18, 160, 185], road: [18, 20, 40], lane: [232, 244, 255] },
  "dark": { grass: [13, 18, 37], rumble: [150, 160, 190], road: [22, 24, 46], lane: null },
  "far": { color: [16, 20, 44], height: 0.62, ks: [2, 3, 5, 7, 11], rough: 0.5, snow: true },
  "near": { color: [8, 12, 28], height: 0.22, ks: [5, 9, 14, 21], rough: 0.4 },
  "neon": { edge: [232, 244, 255], grid: [24, 231, 255], ridge: [232, 244, 255], ridge2: [24, 231, 255], horizon: [24, 231, 255], moon: true }
});

delete HR.TRACKS[1]["sun"];

delete HR.TRACKS[1]["clouds"];

Object.assign(HR.TRACKS[2], {
  "sky": [[10, 5, 18], [92, 24, 46]],
  "fog": [74, 20, 40],
  "light": { grass: [22, 10, 20], rumble: [200, 90, 20], road: [26, 14, 30], lane: [255, 226, 61] },
  "dark": { grass: [28, 12, 24], rumble: [195, 170, 45], road: [30, 16, 34], lane: null },
  "far": { color: [36, 12, 30], height: 0.40, ks: [2, 3, 5, 9], rough: 0.6, flat: 0.62 },
  "near": { color: [20, 8, 20], height: 0.13, ks: [3, 6, 10], rough: 0.7 },
  "neon": { edge: [255, 122, 26], grid: [255, 43, 214], ridge: [255, 122, 26], ridge2: [255, 43, 214], horizon: [255, 122, 26], sun: [[255, 226, 61], [255, 51, 85]] }
});

delete HR.TRACKS[2]["sun"];

delete HR.TRACKS[2]["clouds"];

HR.BILLBOARDS = [['HORIZON RUSH', [24, 231, 255], [255, 43, 214]], ['TURBO-ÖL', [255, 122, 26], [255, 226, 61]],
  ['VOLTA REIFEN', [155, 92, 255], [24, 231, 255]], ['NITRO COLA', [255, 51, 85], [232, 244, 255]]];

HR.makeSprites = function () {
  const S = {};
  const ST = HR.ST;
  const mk = (w, h, f) => { const c = U.canvas(w, h); const g = c.getContext('2d'); g.lineJoin = 'miter'; g.miterLimit = 4; f(g, w, h); return c; };
  const C = c => typeof c === 'string' ? ST.parse(c) : c;
  // aktuellen Pfad leuchtend nachziehen (mit Weichzeichner, da nur einmal gezeichnet)
  const N = (g, col, lw, fillA) => {
    const c = C(col);
    g.save();
    if (fillA) { g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${fillA})`; g.fill(); }
    g.shadowColor = U.rgb(c); g.shadowBlur = lw * 3.2; g.strokeStyle = U.rgb(c); g.lineWidth = lw; g.stroke();
    g.shadowBlur = 0; g.strokeStyle = U.rgb(U.mix(c, [255, 255, 255], 0.55)); g.lineWidth = Math.max(1, lw * 0.4); g.stroke();
    g.restore();
  };
  const T = (g, col, lw, a) => { g.save(); g.globalAlpha = a == null ? 0.55 : a; g.strokeStyle = U.rgb(C(col)); g.lineWidth = lw; g.stroke(); g.restore(); };
  const body = (g, a) => { g.fillStyle = `rgba(12,10,28,${a == null ? 0.92 : a})`; g.fill(); };
  const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); };
  const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); };
  const rect = (g, x, y, w, h) => { g.beginPath(); g.rect(x, y, w, h); };
  const cham = (g, x, y, w, h, r) => ST.rrect(g, x, y, w, h, r);
  const pool = (g, x, y, r, col, a) => { const c = C(col), gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const text = (g, s, x, y, size, col, maxW) => {
    let fs = size; g.font = `700 ${fs}px ${HR.FONT}`;
    while (maxW && g.measureText(s).width > maxW && fs > 10) { fs -= 2; g.font = `700 ${fs}px ${HR.FONT}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.shadowColor = U.rgb(C(col)); g.shadowBlur = fs * 0.6; g.fillStyle = U.rgb(C(col)); g.fillText(s, x, y);
    g.shadowBlur = 0; g.fillStyle = U.rgb(U.mix(C(col), [255, 255, 255], 0.5)); g.fillText(s, x, y); g.restore();
  };
  const MAG = ST.MAGENTA, CY = ST.CYAN, LI = ST.LIME, YE = ST.YELLOW, OR = ST.ORANGE, VI = ST.VIOLET, RE = ST.RED, ICE = ST.ICE, GR = ST.GREEN, DIMC = [150, 142, 205];

  const palm = mk(170, 300, (g, w, h) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([75 + 18 * Math.sin(t * 2.2), h - 8 - t * (h - 86)]); }
    line(g, pts.map(([x, y]) => [x - 7, y])); N(g, MAG, 3);
    line(g, pts.map(([x, y]) => [x + 7, y])); N(g, MAG, 3);
    g.beginPath(); for (let i = 1; i < 12; i++) { const [x, y] = pts[i]; g.moveTo(x - 7, y); g.lineTo(x + 7, y - 6); } T(g, MAG, 2, 0.6);
    const [tx, ty] = pts[12];
    for (let k = 0; k < 9; k++) {
      const a = (k * 40) * Math.PI / 180, ex = tx + Math.cos(a) * 66, ey = ty + Math.sin(a) * 36 + 18, mx = tx + Math.cos(a) * 36, my = ty + Math.sin(a) * 18 - 14;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx, my, ex, ey); N(g, CY, 3);
      g.beginPath(); for (let q = 0.3; q < 0.95; q += 0.15) { const x = (1 - q) * (1 - q) * tx + 2 * (1 - q) * q * mx + q * q * ex, y = (1 - q) * (1 - q) * ty + 2 * (1 - q) * q * my + q * q * ey; g.moveTo(x, y); g.lineTo(x + Math.cos(a + 1.2) * 8, y + Math.sin(a + 1.2) * 8 + 4); } T(g, CY, 1.5, 0.55);
    }
  });
  const pine = mk(140, 260, (g) => {
    line(g, [[70, 214], [70, 254]]); N(g, DIMC, 4);
    for (let i = 3; i >= 0; i--) {
      const top = 14 + 46 * i, half = 24 + 13 * i;
      poly(g, [[70, top], [70 - half, top + 84], [70 + half, top + 84]]); body(g); N(g, GR, 3, 0.08);
      line(g, [[70 - half * 0.4, top + 34], [70, top], [70 + half * 0.4, top + 34]]); N(g, ICE, 2.5);
    }
  });
  const cactus = mk(120, 220, (g) => {
    const parts = [[44, 22, 32, 192, 14], [12, 72, 22, 72, 10], [12, 124, 44, 20, 9], [86, 46, 22, 64, 10], [64, 94, 44, 20, 9]];
    for (const [x, y, w, h, r] of parts) { cham(g, x, y, w, h, r); body(g); }
    for (const [x, y, w, h, r] of parts) { cham(g, x, y, w, h, r); N(g, LI, 3); }
    g.beginPath(); for (const x of [54, 60, 66]) { g.moveTo(x, 34); g.lineTo(x, 206); } T(g, LI, 1.5, 0.45);
  });
  const rock = c => mk(160, 100, (g) => {
    poly(g, [[6, 96], [16, 56], [46, 28], [80, 18], [118, 32], [148, 60], [154, 96]]); body(g); N(g, c, 3, 0.08);
    line(g, [[46, 28], [62, 52], [100, 46], [118, 32]]); T(g, c, 2, 0.55);
    line(g, [[62, 52], [56, 96]]); line(g, [[100, 46], [112, 96]]); T(g, c, 1.5, 0.4);
  });
  const bush = c => mk(160, 90, (g) => {
    poly(g, [[8, 86], [12, 58], [32, 36], [58, 28], [80, 16], [108, 22], [130, 40], [150, 60], [152, 86]]); body(g); N(g, c, 3, 0.08);
    line(g, [[34, 62], [56, 48], [80, 40], [104, 44], [126, 60]]); T(g, c, 1.5, 0.45);
  });
  const house = mk(220, 170, (g) => {
    rect(g, 22, 72, 176, 94); body(g); N(g, VI, 3);
    poly(g, [[8, 76], [110, 14], [212, 76]]); body(g); N(g, MAG, 3, 0.1);
    for (const x of [42, 142]) { rect(g, x, 96, 36, 28); N(g, YE, 2, 0.35); line(g, [[x + 18, 96], [x + 18, 124]]); T(g, YE, 1.5, 0.6); }
    rect(g, 96, 116, 28, 50); N(g, CY, 2, 0.12);
  });
  const billboard = (txt, c, c2) => mk(300, 190, (g) => {
    line(g, [[66, 112], [66, 186]]); N(g, DIMC, 4); line(g, [[234, 112], [234, 186]]); N(g, DIMC, 4);
    cham(g, 8, 6, 284, 102, 12); body(g, 0.95); N(g, c, 4, 0.08);
    cham(g, 18, 16, 264, 82, 8); T(g, c, 1.5, 0.5);
    text(g, txt, 150, 58, 44, c2, 250);
  });
  const chevron = dir => mk(120, 140, (g) => {
    line(g, [[60, 96], [60, 136]]); N(g, DIMC, 4);
    cham(g, 6, 6, 108, 88, 10); body(g, 0.95); N(g, YE, 3);
    for (const ox of [-18, 14]) {
      const x = 60 + ox * dir;
      line(g, dir > 0 ? [[x - 10, 20], [x + 10, 50], [x - 10, 80]] : [[x + 10, 20], [x - 10, 50], [x + 10, 80]]); N(g, YE, 5);
    }
  });
  const banner = mk(440, 220, (g) => {
    for (const x of [10, 414]) { rect(g, x, 50, 16, 166); body(g); N(g, MAG, 3); g.beginPath(); for (let y = 60; y < 210; y += 20) { g.moveTo(x, y); g.lineTo(x + 16, y + 10); } T(g, MAG, 1.5, 0.5); }
    cham(g, 4, 4, 432, 56, 10); body(g, 0.96); N(g, CY, 3);
    for (let c = 0; c < 42; c++) for (let r = 0; r < 2; r++) { g.fillStyle = (c + r) % 2 ? 'rgba(242,238,255,.9)' : 'rgba(11,9,24,.95)'; g.fillRect(10 + c * 10, 62 + r * 8, 10, 8); }
    line(g, [[8, 60], [432, 60]]); N(g, ICE, 2);
    text(g, 'START  ·  ZIEL', 220, 31, 30, MAG);
  });
  // [Bild, Weltbreite, Kollisions-Halbbreite]
  S.palm = [palm, 1500, 0.12]; S.pine = [pine, 1300, 0.25]; S.cactus = [cactus, 900, 0.15];
  S.rock_grey = [rock(DIMC), 1100, 0.22]; S.rock_red = [rock(OR), 1100, 0.22];
  S.bush = [bush(LI), 900, 0]; S.shrub = [bush(YE), 800, 0];
  S.house = [house, 2600, 0.55]; S.chev_r = [chevron(1), 600, 0.1]; S.chev_l = [chevron(-1), 600, 0.1];
  S.banner = [banner, 4400, 0];
  HR.BILLBOARDS.forEach(([t, c, c2], i) => S['bb' + i] = [billboard(t, c, c2), 2000, 0.45]);
  const villa = mk(240, 180, (g) => {
    rect(g, 16, 64, 208, 112); body(g); N(g, CY, 3);
    poly(g, [[6, 68], [120, 20], [234, 68]]); body(g); N(g, MAG, 3, 0.1);
    for (const x of [30, 166]) { rect(g, x, 88, 44, 36); N(g, YE, 2, 0.3); line(g, [[x - 2, 130], [x + 46, 130]]); N(g, LI, 2); }
    rect(g, 104, 112, 32, 64); N(g, MAG, 2, 0.12);
    rect(g, 110, 94, 20, 10); N(g, YE, 2, 0.5);
  });
  const lighthouse = mk(120, 320, (g) => {
    pool(g, 60, 46, 60, YE, 0.35);
    poly(g, [[34, 316], [44, 72], [76, 72], [86, 316]]); body(g); N(g, ICE, 3);
    g.beginPath(); for (let k = 0; k < 4; k++) { const y = 110 + k * 55; g.moveTo(42 - k * 1.3, y + 26); g.lineTo(78 + k * 1.3, y + 26); g.moveTo(43 - k, y); g.lineTo(77 + k, y); } N(g, RE, 2.5);
    rect(g, 38, 58, 44, 12); N(g, ICE, 2); rect(g, 46, 36, 28, 22); N(g, YE, 2, 0.6);
    poly(g, [[40, 34], [60, 10], [80, 34]]); N(g, ICE, 2.5);
    g.fillStyle = 'rgba(255,226,61,.18)'; poly(g, [[74, 40], [120, 20], [120, 62]]); g.fill();
  });
  const lamp = mk(110, 300, (g) => {
    pool(g, 84, 34, 34, CY, 0.55);
    line(g, [[25, 296], [25, 44]]); N(g, DIMC, 4);
    g.beginPath(); g.moveTo(25, 46); g.quadraticCurveTo(30, 12, 80, 20); N(g, DIMC, 4);
    rect(g, 66, 18, 34, 8); body(g); N(g, CY, 2);
    line(g, [[70, 30], [96, 30]]); N(g, '#ffffff', 3);
    rect(g, 15, 286, 20, 10); N(g, DIMC, 2);
  });
  const snowpole = mk(30, 200, (g) => {
    for (let k = 0; k < 8; k++) { rect(g, 10, 4 + k * 24, 10, 22); N(g, k % 2 ? ICE : RE, 2, 0.4); }
  });
  const telegraph = mk(140, 320, (g) => {
    line(g, [[70, 316], [70, 24]]); N(g, OR, 4);
    line(g, [[16, 44], [124, 44]]); N(g, OR, 3); line(g, [[28, 78], [112, 78]]); N(g, OR, 3);
    g.beginPath(); for (const x of [20, 46, 94, 120]) g.rect(x - 2, 32, 5, 10); for (const x of [34, 106]) g.rect(x - 2, 66, 5, 10); N(g, ICE, 1.5, 0.6);
  });
  const umbrella = mk(150, 150, (g) => {
    line(g, [[75, 40], [75, 146]]); N(g, DIMC, 3);
    g.beginPath(); g.moveTo(8, 62); g.lineTo(75, 16); g.lineTo(142, 62); g.closePath(); body(g, 0.85); N(g, MAG, 3, 0.15);
    g.beginPath(); for (const x of [30, 52, 98, 120]) { g.moveTo(75, 16); g.lineTo(x, 62); } T(g, ICE, 1.5, 0.6);
    rect(g, 14, 132, 54, 10); N(g, CY, 2, 0.2);
  });
  const boat = mk(200, 210, (g) => {
    poly(g, [[94, 14], [94, 148], [24, 148]]); N(g, ICE, 3, 0.1);
    poly(g, [[106, 32], [106, 148], [166, 148]]); N(g, YE, 3, 0.1);
    line(g, [[100, 8], [100, 156]]); N(g, DIMC, 3);
    poly(g, [[12, 160], [188, 160], [164, 194], [36, 194]]); body(g); N(g, CY, 3);
    line(g, [[22, 202], [178, 202]]); T(g, CY, 2, 0.5);
  });
  const chalet = mk(260, 200, (g) => {
    rect(g, 24, 86, 212, 110); body(g); N(g, OR, 3);
    g.beginPath(); for (let y = 100; y < 196; y += 14) { g.moveTo(26, y); g.lineTo(234, y); } T(g, OR, 1.2, 0.3);
    poly(g, [[4, 94], [130, 16], [256, 94]]); body(g); N(g, ICE, 3.5, 0.1);
    for (const x of [48, 174]) { rect(g, x, 112, 38, 30); N(g, YE, 2, 0.4); line(g, [[x - 4, 146], [x + 42, 146]]); N(g, RE, 2.5); }
    rect(g, 114, 140, 32, 56); N(g, OR, 2, 0.12);
  });
  const snowman = mk(120, 170, (g) => {
    for (const [y, r] of [[124, 40], [66, 28], [28, 19]]) { g.beginPath(); g.arc(60, y, r, 0, 7); body(g); N(g, ICE, 3); }
    line(g, [[42, 10], [78, 10]]); N(g, ICE, 3); rect(g, 47, -2, 26, 12); N(g, ICE, 2);
    g.fillStyle = '#e8f4ff'; g.fillRect(51, 22, 5, 5); g.fillRect(64, 22, 5, 5);
    line(g, [[60, 30], [80, 34], [60, 36]]); N(g, OR, 2);
    line(g, [[36, 46], [84, 46]]); N(g, RE, 3);
  });
  const mesa = mk(300, 360, (g) => {
    poly(g, [[22, 356], [52, 42], [80, 24], [228, 26], [250, 52], [280, 356]]); body(g); N(g, OR, 3.5, 0.08);
    g.beginPath(); for (const y of [90, 160, 230, 300]) { g.moveTo(44 - y * 0.02, y); g.lineTo(258 + y * 0.03, y + 6); } T(g, OR, 2, 0.4);
    line(g, [[200, 26], [214, 356]]); T(g, MAG, 1.5, 0.35);
  });
  const skull = mk(140, 70, (g) => {
    g.beginPath(); g.moveTo(12, 14); g.quadraticCurveTo(40, 40, 58, 30); g.moveTo(128, 14); g.quadraticCurveTo(100, 40, 82, 30); N(g, ICE, 4);
    poly(g, [[52, 26], [88, 26], [82, 62], [58, 62]]); body(g); N(g, ICE, 2.5);
    g.fillStyle = '#ff2bd6'; g.fillRect(60, 35, 6, 6); g.fillRect(74, 35, 6, 6);
  });
  const gas = mk(360, 200, (g) => {
    cham(g, 10, 22, 340, 46, 8); body(g, 0.95); N(g, RE, 3);
    text(g, 'TANKSTELLE', 180, 45, 26, RE);
    line(g, [[46, 68], [46, 196]]); N(g, DIMC, 4); line(g, [[314, 68], [314, 196]]); N(g, DIMC, 4);
    for (const x of [120, 210]) { cham(g, x, 120, 34, 76, 4); body(g); N(g, CY, 2.5); rect(g, x + 7, 128, 20, 14); N(g, CY, 1.5, 0.5); }
    rect(g, 250, 112, 90, 84); body(g); N(g, VI, 2.5); rect(g, 262, 124, 30, 26); N(g, YE, 2, 0.35);
  });
  const grandstand = mk(420, 220, (g) => {
    poly(g, [[4, 216], [4, 120], [416, 42], [416, 216]]); body(g); N(g, VI, 3);
    const crowd = [MAG, CY, LI, YE, OR, ICE, RE].map(C);
    const r = U.rng(5);
    for (let row = 0; row < 7; row++) for (let c = 0; c < 25; c++) {
      const x = 16 + c * 16, yTop = 120 - (x / 420) * 80;
      const col = crowd[Math.floor(r.random() * crowd.length)];
      g.fillStyle = U.rgb(col); g.globalAlpha = 0.5 + r.random() * 0.5;
      g.fillRect(x + r.uniform(-2, 2) - 2, yTop + 10 + row * 13 + r.uniform(-2, 2) - 2, 5, 5);
    }
    g.globalAlpha = 1;
    line(g, [[4, 110], [416, 32]]); N(g, MAG, 4);
    line(g, [[4, 206], [416, 206]]); N(g, VI, 2);
  });
  const flag = mk(110, 240, (g) => {
    line(g, [[10, 236], [10, 4]]); N(g, DIMC, 3);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? 'rgba(242,238,255,.95)' : 'rgba(11,9,24,.95)'; g.fillRect(14 + c * 14, 8 + r * 14, 14, 14); }
    rect(g, 14, 8, 84, 56); N(g, ICE, 2);
  });
  const cliff = (col, snow) => mk(420, 300, (g) => {
    const r = U.rng(C(col)[0] * 7 + C(col)[2]);
    const pts = [[4, 300], [4, 70]];
    for (let x = 4; x <= 416; x += 30) pts.push([x, 14 + r.uniform(0, 76)]);
    pts.push([416, 300]);
    poly(g, pts); body(g, 0.96); N(g, col, 3.5, 0.06);
    if (snow) { line(g, pts.slice(2, -1).map(([x, y]) => [x, y + 26 + (x % 60 ? 6 : -4)])); N(g, ICE, 2.5); }
    g.beginPath(); for (let k = 0; k < 5; k++) { const y = 120 + k * 36 + r.uniform(-8, 8); g.moveTo(10, y); for (let x = 40; x <= 410; x += 50) g.lineTo(x, y + r.uniform(-8, 8)); } T(g, col, 1.5, 0.35);
    for (let k = 0; k < 8; k++) { const x = r.uniform(30, 380), y = r.uniform(110, 270); poly(g, [[x, y], [x + 26, y - 14], [x + 40, y + 6], [x + 10, y + 18]]); T(g, col, 1.5, 0.5); }
  });
  Object.assign(S, {
    villa: [villa, 2700, 0.6], lighthouse: [lighthouse, 1700, 0.2], lamp: [lamp, 900, 0.06],
    snowpole: [snowpole, 140, 0.03], telegraph: [telegraph, 1200, 0.06], umbrella: [umbrella, 620, 0.08],
    boat: [boat, 1600, 0], chalet: [chalet, 2700, 0.6], snowman: [snowman, 700, 0.14],
    mesa: [mesa, 4200, 0], skull: [skull, 700, 0], gas: [gas, 3600, 0.85],
    grandstand: [grandstand, 3800, 0.95], flag: [flag, 700, 0.05],
    cliff_grey: [cliff(DIMC, true), 2600, 0.65], cliff_red: [cliff(OR), 2600, 0.65],
  });
  return S;
};

HR.makeBackground = function (cfg, vw, vh) {
  vw = Math.max(64, Math.round(vw)); vh = Math.max(64, Math.round(vh));
  const hy = Math.round(vh * HR.HORIZON);
  const lw = vw * 2;
  const rnd = U.rng(cfg.seed + 99);
  const nz = cfg.neon;
  const glowLine = (g, col, w) => {
    g.save(); g.shadowColor = U.rgb(col); g.shadowBlur = w * 4; g.strokeStyle = U.rgb(col); g.lineWidth = w; g.stroke();
    g.shadowBlur = 0; g.strokeStyle = U.rgb(U.mix(col, [255, 255, 255], 0.5)); g.lineWidth = Math.max(1, w * 0.4); g.stroke(); g.restore();
  };
  const sky = U.canvas(vw, vh);
  {
    const g = sky.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, hy);
    gr.addColorStop(0, U.rgb(cfg.sky[0])); gr.addColorStop(0.65, U.rgb(U.mix(cfg.sky[0], cfg.sky[1], 0.45))); gr.addColorStop(1, U.rgb(cfg.sky[1]));
    g.fillStyle = gr; g.fillRect(0, 0, vw, hy);
    const sr = U.rng(cfg.seed + 5);
    for (let i = 0; i < vw * hy / 2500; i++) {
      const s = sr.random(), x = sr.random() * vw, y = sr.random() * hy * 0.85;
      g.fillStyle = `rgba(242,238,255,${0.2 + s * 0.6})`; g.fillRect(x, y, s > 0.93 ? 2 : 1, s > 0.93 ? 2 : 1);
    }
    g.fillStyle = U.rgb(cfg.fog); g.fillRect(0, hy, vw, vh - hy);
  }
  const layer = (draw) => { const c = U.canvas(lw, hy + 2); const g = c.getContext('2d'); g.lineJoin = 'miter'; draw(g); return c; };
  const skyL = layer(g => {
    if (nz.sun) {
      const x = 0.3 * lw, r = 0.3 * hy, y = hy - r * 0.15;
      const glow = g.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y - r * 0.3, r * 2.4);
      glow.addColorStop(0, `rgba(${nz.sun[1].join(',')},.35)`); glow.addColorStop(1, `rgba(${nz.sun[1].join(',')},0)`);
      g.fillStyle = glow; g.fillRect(x - r * 2.5, 0, r * 5, hy);
      g.save(); g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.closePath(); g.clip();
      const sg = g.createLinearGradient(0, y - r, 0, y);
      sg.addColorStop(0, U.rgb(nz.sun[0])); sg.addColorStop(1, U.rgb(nz.sun[1]));
      g.fillStyle = sg; g.fillRect(x - r, y - r, r * 2, r);
      g.fillStyle = U.rgb(cfg.sky[1]);
      for (let k = 0; k < 8; k++) { const yy = y - r * 0.08 - k * r * 0.1; g.fillRect(x - r, yy, r * 2, Math.max(1, r * (0.012 + (7 - k) * 0.008))); }
      g.restore();
    }
    if (nz.moon) {
      const x = 0.7 * lw, y = 0.32 * hy, r = 0.09 * hy;
      const glow = g.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
      glow.addColorStop(0, 'rgba(232,244,255,.25)'); glow.addColorStop(1, 'rgba(232,244,255,0)');
      g.fillStyle = glow; g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = 'rgba(232,244,255,.12)'; g.fill(); glowLine(g, [232, 244, 255], Math.max(1.5, r * 0.08));
      g.beginPath(); g.arc(x - r * 0.3, y - r * 0.2, r * 0.25, 0, 7); g.strokeStyle = 'rgba(232,244,255,.4)'; g.lineWidth = 1; g.stroke();
      // Polarlicht
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let xx = 0; xx <= lw; xx += 8) g.lineTo(xx, hy * (0.18 + k * 0.07) + Math.sin(xx / lw * Math.PI * 6 + k) * hy * 0.05);
        g.strokeStyle = `rgba(43,255,136,${0.12 - k * 0.03})`; g.lineWidth = hy * 0.03; g.stroke();
      }
    }
  });
  const ridge = (p, col, near) => layer(g => {
    const amps = p.ks.map(k => rnd.uniform(0.4, 1) / Math.pow(k, p.rough));
    const phs = p.ks.map(() => rnd.uniform(0, Math.PI * 2));
    const sum = amps.reduce((a, b) => a + b, 0);
    const H = p.height * hy;
    const top = [];
    for (let x = 0; x <= lw; x += 4) {
      let v = 0;
      p.ks.forEach((k, i) => v += amps[i] * (0.5 + 0.5 * Math.sin(2 * Math.PI * k * x / lw + phs[i])));
      v /= sum;
      if (p.flat) v = Math.min(v, p.flat) / p.flat;
      top.push([x, hy - v * H]);
    }
    g.beginPath(); g.moveTo(0, hy + 2); for (const [x, y] of top) g.lineTo(x, y); g.lineTo(lw, hy + 2); g.closePath();
    g.fillStyle = U.rgb(p.color); g.fill();
    // senkrechte Gratlinien als Innenzeichnung
    g.save(); g.clip();
    g.strokeStyle = U.rgb(col); g.globalAlpha = near ? 0.12 : 0.18; g.lineWidth = 1; g.beginPath();
    for (let i = 4; i < top.length - 4; i += near ? 9 : 6) { const [x, y] = top[i]; g.moveTo(x, y); g.lineTo(x + (i % 2 ? 14 : -10), hy); }
    for (let k = 1; k < 4; k++) { const yy = hy - H * k / 4; g.moveTo(0, yy); g.lineTo(lw, yy); }
    g.stroke(); g.restore();
    if (p.snow) {
      g.beginPath(); let on = false;
      for (const [x, y] of top) { const s = hy - y > H * 0.55; if (s) { on ? g.lineTo(x, y + H * 0.08) : g.moveTo(x, y + H * 0.08); on = true; } else on = false; }
      g.strokeStyle = 'rgba(232,244,255,.55)'; g.lineWidth = 1.5; g.stroke();
    }
    g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    glowLine(g, col, near ? 2 : 1.6);
  });
  // Skyline als nahe Ebene (Küste)
  const skyline = (col) => layer(g => {
    const r = U.rng(cfg.seed + 3);
    let x = 0;
    while (x < lw) {
      const w = (0.03 + r.random() * 0.05) * lw / 2, h = (0.08 + r.random() * 0.2) * hy;
      const ww = Math.min(w, lw - x);
      g.fillStyle = '#0d0a1d'; g.fillRect(x, hy - h, ww, h + 2);
      g.strokeStyle = U.rgb(col); g.globalAlpha = 0.6; g.lineWidth = 1; g.strokeRect(x + 0.5, hy - h + 0.5, ww - 1, h + 4); g.globalAlpha = 1;
      const st = Math.max(5, hy * 0.025);
      for (let wy = hy - h + st; wy < hy - st * 0.5; wy += st) for (let wx = x + st * 0.6; wx < x + ww - st * 0.6; wx += st * 0.9) {
        if (r.random() < 0.2) { g.fillStyle = r.random() < 0.5 ? 'rgba(255,43,214,.8)' : 'rgba(24,231,255,.75)'; g.fillRect(wx, wy, Math.max(1, st * 0.35), Math.max(1, st * 0.22)); }
      }
      if (r.random() < 0.25 && ww > 6) { g.fillStyle = '#ff3355'; g.fillRect(x + ww / 2, hy - h - st, 2, st); }
      x += ww + 1 + r.random() * 4;
    }
  });
  const far = ridge(cfg.far, nz.ridge, false);
  const near = nz.skyline ? skyline(nz.ridge2) : ridge(cfg.near, nz.ridge2, true);
  // Horizontlinie
  { const g = sky.getContext('2d'); g.beginPath(); g.moveTo(0, hy); g.lineTo(vw, hy); glowLine(g, nz.horizon, 2); }
  return { sky, skyL, far, near, vw, vh, hy, lw };
};

HR.makeCarFrames = function (car, color) {
  const ST = HR.ST, ct = HR.CARS[car];
  const w = 240, h = 128;
  const frames = {};
  const nc = ST.neonRGB(color);
  const N = (g, col, lw, fillA) => {
    g.save();
    if (fillA) { g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${fillA})`; g.fill(); }
    g.shadowColor = U.rgb(col); g.shadowBlur = lw * 3; g.strokeStyle = U.rgb(col); g.lineWidth = lw; g.stroke();
    g.shadowBlur = 0; g.strokeStyle = U.rgb(U.mix(col, [255, 255, 255], 0.55)); g.lineWidth = Math.max(1, lw * 0.4); g.stroke();
    g.restore();
  };
  const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); };
  const bt = { wedge: 54, round: 48, sport: 50, rally: 42 }[ct.style];
  const ctop = { wedge: 26, round: 14, sport: 20, rally: 9 }[ct.style];
  const RED = [255, 51, 85], ICE = [232, 244, 255], GREY = [130, 124, 175];
  for (const lean of [-1, 0, 1]) for (const brake of [false, true]) {
    const c = U.canvas(w, h), g = c.getContext('2d');
    g.lineJoin = 'miter';
    const L = lean * 7;
    // Lichtfleck und Schatten
    const pg = g.createRadialGradient(w / 2, h - 8, 4, w / 2, h - 8, w / 2);
    pg.addColorStop(0, `rgba(${nc.join(',')},.25)`); pg.addColorStop(1, `rgba(${nc.join(',')},0)`);
    g.fillStyle = pg; g.fillRect(0, h - 40, w, 40);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(w / 2, h - 8, w / 2 - 10, 7, 0, 0, 7); g.fill();
    // Räder
    for (const x of [14, w - 52]) { g.beginPath(); g.rect(x, h - 48, 38, 40); g.fillStyle = '#05040b'; g.fill(); g.strokeStyle = U.rgb(GREY); g.lineWidth = 1.5; g.stroke(); g.beginPath(); for (let y = h - 42; y < h - 10; y += 7) { g.moveTo(x + 3, y); g.lineTo(x + 35, y); } g.strokeStyle = 'rgba(130,124,175,.35)'; g.lineWidth = 1; g.stroke(); }
    // Karosserie
    poly(g, [[8, h - 20], [6, bt + 16], [24 + L, bt], [w - 24 + L, bt], [w - 6, bt + 16], [w - 8, h - 20]]);
    g.fillStyle = '#0c0a1c'; g.fill(); N(g, nc, 3, 0.16);
    poly(g, [[12, bt + 19], [26 + L, bt + 5], [w - 26 + L, bt + 5], [w - 12, bt + 19]]); g.strokeStyle = `rgba(${nc.join(',')},.45)`; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.moveTo(12, h - 28); g.lineTo(w - 12, h - 28); g.strokeStyle = `rgba(${nc.join(',')},.5)`; g.lineWidth = 1.5; g.stroke();
    // Kabine und Heckscheibe
    poly(g, [[38 + L, bt + 2], [62 + 2 * L, ctop], [w - 62 + 2 * L, ctop], [w - 38 + L, bt + 2]]);
    g.fillStyle = '#0c0a1c'; g.fill(); N(g, nc, 2.5, 0.08);
    poly(g, [[48 + L, bt - 1], [67 + 2 * L, ctop + 6], [w - 67 + 2 * L, ctop + 6], [w - 48 + L, bt - 1]]);
    g.fillStyle = 'rgba(24,231,255,.08)'; g.fill(); g.strokeStyle = `rgba(${U.mix(nc, [255, 255, 255], 0.4).map(v => v | 0).join(',')},.6)`; g.lineWidth = 1.2; g.stroke();
    // Rückleuchten-Bänder
    const tl = brake ? [255, 90, 110] : RED;
    for (const x0 of [18, w - 66]) {
      g.beginPath(); g.rect(x0 + L * 0.5, bt + 27, 48, 10);
      g.save(); if (brake) { g.shadowColor = 'rgb(255,51,85)'; g.shadowBlur = 26; }
      g.fillStyle = brake ? 'rgba(255,120,140,.95)' : 'rgba(255,51,85,.45)'; g.fill(); g.restore();
      N(g, tl, brake ? 3 : 2);
    }
    g.beginPath(); g.moveTo(66 + L * 0.5, bt + 32); g.lineTo(w - 66 + L * 0.5, bt + 32); g.strokeStyle = brake ? 'rgba(255,90,110,.8)' : 'rgba(255,51,85,.35)'; g.lineWidth = 2; g.stroke();
    // Kennzeichen und Auspuff
    g.beginPath(); g.rect(w / 2 - 24 + L * 0.5, h - 46, 48, 14); g.fillStyle = 'rgba(232,244,255,.1)'; g.fill(); N(g, ICE, 1.5);
    for (const x of [w / 2 - 66, w / 2 + 52]) { g.beginPath(); g.rect(x, h - 23, 14, 6); g.strokeStyle = U.rgb(GREY); g.lineWidth = 1.5; g.stroke(); }
    // Stilmerkmale
    if (ct.style === 'wedge') {
      g.beginPath(); g.moveTo(10 + L, bt - 14); g.lineTo(w - 10 + L, bt - 14); N(g, nc, 3);
      g.beginPath(); g.moveTo(44 + L, bt - 12); g.lineTo(44 + L, bt); g.moveTo(w - 44 + L, bt - 12); g.lineTo(w - 44 + L, bt); N(g, nc, 2);
    } else if (ct.style === 'sport') {
      g.beginPath(); g.moveTo(26 + L, bt - 4); g.lineTo(w - 26 + L, bt - 4); N(g, nc, 2);
      g.beginPath(); g.moveTo(w / 2 - 6 + L, bt + 2); g.lineTo(w / 2 - 6 + L * 0.5, h - 48); g.moveTo(w / 2 + 6 + L, bt + 2); g.lineTo(w / 2 + 6 + L * 0.5, h - 48); N(g, ICE, 1.5);
    } else if (ct.style === 'round') {
      g.beginPath(); g.moveTo(28 + L, bt + 46); g.lineTo(62 + L, bt + 46); g.moveTo(w - 62 + L, bt + 46); g.lineTo(w - 28 + L, bt + 46); N(g, ICE, 1.5);
    } else if (ct.style === 'rally') {
      g.beginPath(); g.rect(64 + 2 * L, ctop - 9, w - 128, 8); g.fillStyle = '#0c0a1c'; g.fill(); N(g, GREY, 1.5);
      for (let i = 0; i < 4; i++) { g.beginPath(); g.rect(72 + 2 * L + i * 26, ctop - 8, 18, 6); N(g, [255, 226, 61], 1.5, 0.7); }
      for (const x of [16, w - 48]) { g.beginPath(); g.rect(x, h - 22, 32, 12); g.fillStyle = '#05040b'; g.fill(); N(g, GREY, 1.2); }
    }
    frames[lean + ',' + (brake ? 1 : 0)] = c;
  }
  return frames;
};
