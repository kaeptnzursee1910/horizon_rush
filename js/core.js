// Horizon Rush – Grundlagen: Konstanten, Strecken, Autos, Grafiken
// Portiert aus der pygame-Version (Claude Racer 2D/horizon_rush.py).
'use strict';

const HR = window.HR = {};

// ---------- Konstanten (wie im Original) ----------
HR.SEG = 200;              // Segmentlänge
HR.RUMBLE = 3;             // Segmente pro Randstreifen-Farbe
HR.ROADW = 2000;           // halbe Straßenbreite
HR.LANES = 3;
HR.CAMH = 1000;            // Kamerahöhe
HR.CAMDEPTH = 0.84;
HR.HORIZON = 0.42;         // Horizont als Anteil der Ansichtshöhe
HR.LENS = 0.9;             // Projektionsmaßstab relativ zur Ansichtshöhe
HR.PLAYERZ = HR.CAMDEPTH * HR.CAMH * HR.LENS / (0.92 - HR.HORIZON);
HR.DRAW = 150;
HR.DRAW_SPLIT = 110;
HR.FOG_DENSITY = 3.5;
HR.CENTRIFUGAL = 0.25;
HR.MAXSPEED = HR.SEG * 60; // 12000 Einheiten/s
HR.KMH = 330 / HR.MAXSPEED;
HR.CAR_W = 760;
HR.CAR_LEN = 360;
HR.CAR_HALF = HR.CAR_W / HR.ROADW / 2 * 0.8;
HR.POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
HR.STEP = 1 / 60;
HR.FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

// ---------- Hilfsfunktionen ----------
const U = HR.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  easeIn: (a, b, p) => a + (b - a) * p * p,
  easeInOut: (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5),
  uniform: (a, b) => a + Math.random() * (b - a),
  choice: arr => arr[Math.floor(Math.random() * arr.length)],
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  fmtTime(t) {
    if (t == null || !isFinite(t)) return '-:--.--';
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  },
  // deterministischer Zufall, damit alle Geräte dieselbe Landschaft sehen
  rng(seed) {
    let s = seed >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return {
      random: next,
      uniform: (a, b) => a + next() * (b - a),
      choice: arr => arr[Math.floor(next() * arr.length)],
      randint: (a, b) => a + Math.floor(next() * (b - a + 1)),
      choices(items, weights) { const tot = weights.reduce((x, y) => x + y, 0); let r = next() * tot; for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; } return items[items.length - 1]; },
    };
  },
  rgb: c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`,
  mix: (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f],
  shade: (c, f) => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)],
  canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
};
HR.FOG = Array.from({ length: HR.DRAW }, (_, i) => Math.exp(-((i / HR.DRAW) ** 2) * HR.FOG_DENSITY));

// ---------- Autos ----------
HR.CARS = [
  { name: 'Strato V12', color: [205, 30, 38], top: 1.00, accel: 0.82, handling: 0.80, style: 'wedge',
    desc: 'Brachialer Zwölfzylinder. Unschlagbar auf der Geraden, aber in Kurven ein wildes Tier.' },
  { name: 'Lumen GT', color: [240, 190, 35], top: 0.95, accel: 0.90, handling: 0.88, style: 'round',
    desc: 'Eleganter Gran Turismo. Ausgewogen, schnell und gutmütig.' },
  { name: 'Kestrel S', color: [40, 95, 215], top: 0.91, accel: 1.00, handling: 0.93, style: 'sport',
    desc: 'Leichter Mittelmotor-Sportler mit explosivem Antritt.' },
  { name: 'Nova Rally', color: [40, 160, 90], top: 0.87, accel: 0.96, handling: 1.00, style: 'rally',
    desc: 'Allrad-Rallyeauto. Klebt in jeder Haarnadel auf der Straße.' },
];
HR.PAINTS = [[205, 30, 38], [240, 190, 35], [40, 95, 215], [40, 160, 90], [235, 235, 240],
  [30, 30, 36], [240, 110, 20], [140, 50, 190], [60, 200, 220], [150, 150, 160]];
HR.AI_NAMES = ['Rina Vogt', 'Marco Belli', 'Kenji Arai', 'Lena Stark', 'Tom Brandt', 'Sofia Lind',
  'Jonas Wolf', 'Ines Moreau', 'Pavel Novak', 'Mia Kessler'];
HR.DIFFS = [['Leicht', [0.80, 0.88]], ['Normal', [0.88, 0.95]], ['Schwer', [0.94, 1.00]]];
HR.paintsFor = car => [HR.CARS[car].color].concat(HR.PAINTS.filter(p => p.join() !== HR.CARS[car].color.join()));

HR.makeAI = function (n, diff, rnd) {
  rnd = rnd || { uniform: U.uniform, choice: U.choice, random: Math.random };
  const names = HR.AI_NAMES.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    const name = names.splice(Math.floor(rnd.random() * names.length), 1)[0];
    const [lo, hi] = HR.DIFFS[diff][1];
    out.push({ name, car: Math.floor(rnd.random() * 4), color: rnd.choice(HR.PAINTS), skill: rnd.uniform(lo, hi) });
  }
  return out;
};

// ---------- Strecken (wörtlich aus dem Original) ----------
HR.TRACKS = [
  {
    name: 'Küstenstraße', seed: 11,
    desc: 'Sonnige Küstenstraße mit Palmen, Villen und sanften Hügeln.',
    sky: [[40, 120, 220], [175, 215, 250]], fog: [175, 215, 250],
    light: { grass: [110, 190, 80], rumble: [240, 240, 240], road: [120, 120, 126], lane: [240, 240, 240] },
    dark: { grass: [96, 172, 70], rumble: [205, 45, 45], road: [113, 113, 119], lane: null },
    far: { color: [125, 165, 205], height: 0.28, ks: [3, 5, 8, 13], rough: 0.8 },
    near: { color: [70, 145, 85], height: 0.15, ks: [4, 7, 11, 17], rough: 0.6 },
    sun: [255, 248, 215], clouds: true,
    decor: [['palm', 6, 1.3, 3.6], ['bush', 3, 1.25, 3.0], ['house', 1, 2.8, 4.6]],
    spacing: [3, 7], both: 0.4, billboardEvery: 90,
    layout: [[10, 10, 10, 0, 0], [30, 40, 30, 0, 10], [40, 60, 40, 2, 0], [30, 30, 30, 0, 20],
      [30, 50, 30, -3, -10], [20, 20, 20, 0, 0], [40, 40, 40, 4, 15], [30, 40, 30, -2, -25],
      [25, 60, 25, 0, 0], [30, 30, 30, -4, 10], [30, 30, 30, 3, 0], [30, 40, 30, 0, -20],
      [40, 50, 40, 2, 15], [30, 30, 30, -3, -10], [30, 60, 30, 0, 0]],
  },
  {
    name: 'Alpenpass', seed: 23,
    desc: 'Verschneiter Bergpass mit Haarnadelkurven und steilen Kuppen.',
    sky: [[80, 140, 210], [220, 232, 246]], fog: [220, 232, 246],
    light: { grass: [236, 241, 246], rumble: [235, 235, 235], road: [96, 96, 102], lane: [235, 235, 235] },
    dark: { grass: [218, 227, 237], rumble: [200, 35, 35], road: [88, 88, 95], lane: null },
    far: { color: [115, 130, 165], height: 0.62, ks: [2, 3, 5, 7, 11], rough: 0.5, snow: true },
    near: { color: [55, 90, 75], height: 0.22, ks: [5, 9, 14, 21], rough: 0.4 },
    sun: null, clouds: true,
    decor: [['pine', 8, 1.3, 4.0], ['rock_grey', 2, 1.3, 3.0]],
    spacing: [2, 5], both: 0.6, billboardEvery: 150,
    layout: [[10, 10, 10, 0, 0], [20, 30, 20, 0, 30], [25, 25, 25, 5, 0], [20, 20, 20, 0, -20],
      [25, 30, 25, -6, 20], [20, 15, 20, 0, 40], [25, 25, 25, 6, -30], [20, 20, 20, -5, 0],
      [25, 40, 25, 0, -40], [25, 25, 25, 4, 30], [20, 20, 20, -6, 10], [25, 30, 25, 0, -30],
      [25, 25, 25, 5, 20], [20, 30, 20, -3, -20], [30, 30, 30, 0, 0], [25, 25, 25, -5, 30],
      [25, 40, 25, 0, -30]],
  },
  {
    name: 'Wüstencanyon', seed: 37,
    desc: 'Lange Geraden durch einen roten Canyon im Abendlicht – Vollgas!',
    sky: [[60, 40, 110], [250, 155, 85]], fog: [242, 165, 105],
    light: { grass: [226, 182, 112], rumble: [250, 250, 250], road: [130, 112, 102], lane: [250, 240, 200] },
    dark: { grass: [211, 166, 100], rumble: [190, 60, 40], road: [122, 104, 96], lane: null },
    far: { color: [165, 75, 60], height: 0.40, ks: [2, 3, 5, 9], rough: 0.6, flat: 0.62 },
    near: { color: [190, 115, 72], height: 0.13, ks: [3, 6, 10], rough: 0.7 },
    sun: [255, 205, 130], clouds: false,
    decor: [['cactus', 5, 1.3, 3.5], ['rock_red', 3, 1.3, 3.5], ['shrub', 3, 1.25, 3.0]],
    spacing: [3, 8], both: 0.3, billboardEvery: 100,
    layout: [[10, 10, 10, 0, 0], [50, 100, 50, 0, 20], [60, 60, 60, 2, -20], [40, 80, 40, 0, 30],
      [50, 50, 50, -3, -10], [50, 120, 50, 0, -20], [40, 40, 40, 4, 10], [40, 40, 40, -4, 0],
      [60, 90, 60, 0, 20], [50, 50, 50, 2, -20], [50, 80, 50, 0, 0]],
  },
];
HR.BILLBOARDS = [['HORIZON RUSH', [20, 20, 32], [255, 200, 0]], ['TURBO-ÖL', [200, 30, 30], [255, 255, 255]],
  ['VOLTA REIFEN', [20, 90, 200], [255, 255, 255]], ['NITRO COLA', [250, 250, 250], [200, 0, 0]]];

HR.buildTrack = function (cfg, sprites) {
  const segs = [], curveStarts = [];
  const lastY = () => segs.length ? segs[segs.length - 1].y2 : 0;
  const addSeg = (curve, y) => {
    const i = segs.length;
    segs.push({ index: i, z1: i * HR.SEG, z2: (i + 1) * HR.SEG, y1: lastY(), y2: y, curve, sprites: [],
      dark: Math.floor(i / HR.RUMBLE) % 2 === 1, finish: false, clip: 0, ok: false });
  };
  const addRoad = (enter, hold, leave, curve, hill) => {
    const y0 = lastY(), y1 = y0 + hill * HR.SEG, total = enter + hold + leave;
    if (Math.abs(curve) >= 4) curveStarts.push([segs.length, curve]);
    for (let i = 0; i < enter; i++) addSeg(U.easeIn(0, curve, i / enter), U.easeInOut(y0, y1, (i + 1) / total));
    for (let i = 0; i < hold; i++) addSeg(curve, U.easeInOut(y0, y1, (enter + i + 1) / total));
    for (let i = 0; i < leave; i++) addSeg(U.easeInOut(curve, 0, i / leave), U.easeInOut(y0, y1, (enter + hold + i + 1) / total));
  };
  for (const p of cfg.layout) addRoad(...p);
  addRoad(40, 40, 40, 0, -lastY() / HR.SEG);
  segs[segs.length - 1].y2 = 0;
  const n = segs.length;
  segs[0].finish = segs[1].finish = true;

  // Landschaft
  const rnd = U.rng(cfg.seed);
  const kinds = cfg.decor.map(d => d[0]), weights = cfg.decor.map(d => d[1]);
  const ranges = {}; cfg.decor.forEach(d => ranges[d[0]] = [d[2], d[3]]);
  segs[0].sprites.push(['banner', 0]);
  const bb = ['bb0', 'bb1', 'bb2', 'bb3'];
  for (let i = 60; i < n - 20; i += cfg.billboardEvery) segs[i].sprites.push([rnd.choice(bb), rnd.choice([-1, 1]) * 1.75]);
  for (const [start, curve] of curveStarts) {
    const side = curve > 0 ? -1 : 1;
    for (let j = 0; j < 4; j++) if (start + j * 5 < n) segs[start + j * 5].sprites.push([curve > 0 ? 'chev_r' : 'chev_l', side * 1.3]);
  }
  let i = 8;
  while (i < n - 4) {
    let sides = [rnd.choice([-1, 1])];
    if (rnd.random() < cfg.both) sides = [-1, 1];
    for (const side of sides) {
      const kind = rnd.choices(kinds, weights);
      const [lo, hi] = ranges[kind];
      const off = side * rnd.uniform(lo, hi);
      if (segs[i].sprites.every(([, o]) => Math.abs(off - o) > 0.6)) segs[i].sprites.push([kind, off]);
    }
    i += rnd.randint(cfg.spacing[0], cfg.spacing[1]);
  }

  // Farben mit Nebel je Zeichenabstand
  const colors = {};
  for (const dark of [false, true]) {
    const pal = cfg[dark ? 'dark' : 'light'];
    colors[dark] = HR.FOG.map(f => [U.rgb(U.mix(cfg.fog, pal.grass, f)), U.rgb(U.mix(cfg.fog, pal.rumble, f)),
      U.rgb(U.mix(cfg.fog, pal.road, f)), pal.lane ? U.rgb(U.mix(cfg.fog, pal.lane, f)) : null]);
  }
  return { cfg, segs, n, length: n * HR.SEG, colors, segAt(z) { return segs[Math.floor(z / HR.SEG) % n]; } };
};

// ---------- Objekte am Straßenrand (prozedural, wie im Original) ----------
HR.makeSprites = function () {
  const S = {};
  const mk = (w, h, f) => { const c = U.canvas(w, h); const g = c.getContext('2d'); f(g, w, h); return c; };
  const col = c => U.rgb(c);
  const poly = (g, pts, c) => { g.fillStyle = col(c); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
  const circle = (g, x, y, r, c) => { g.fillStyle = col(c); g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); g.fill(); };
  const rrect = (g, x, y, w, h, r, c) => { g.fillStyle = col(c); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); };

  const palm = mk(170, 300, (g, w, h) => {
    let tx = 0, ty = 0;
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      tx = 75 + 18 * Math.sin(t * 2.2); ty = h - 6 - t * (h - 80);
      circle(g, tx, ty, 10 - 4 * t, i % 4 < 2 ? [130, 92, 52] : [100, 70, 40]);
    }
    for (let k = 0; k < 9; k++) {
      const a = (k * 40) * Math.PI / 180;
      const ex = tx + Math.cos(a) * 70, ey = ty + Math.sin(a) * 38 + 18;
      const mx = tx + Math.cos(a) * 38, my = ty + Math.sin(a) * 20 - 14;
      for (const [lw, c] of [[10, [30, 115, 40]], [4, [70, 165, 60]]]) {
        g.strokeStyle = col(c); g.lineWidth = lw; g.lineCap = 'round';
        g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      }
    }
  });
  const pine = mk(140, 260, (g) => {
    g.fillStyle = col([90, 60, 35]); g.fillRect(62, 210, 16, 50);
    for (let i = 0; i < 4; i++) {
      const top = 10 + 48 * i, half = 26 + 13 * i, c = [20 + 6 * i, 78 + 6 * i, 45];
      poly(g, [[70, top], [70 - half, top + 90], [70 + half, top + 90]], c);
      poly(g, [[70, top], [70 - half * 0.38, top + 34], [70 + half * 0.38, top + 34]], [240, 245, 250]);
    }
  });
  const cactus = mk(120, 220, (g) => {
    const c = [70, 145, 65];
    rrect(g, 45, 20, 30, 200, 15, c); rrect(g, 10, 70, 22, 75, 11, c); rrect(g, 10, 125, 45, 20, 10, c);
    rrect(g, 88, 45, 22, 65, 11, c); rrect(g, 65, 95, 45, 20, 10, c);
    g.strokeStyle = col([45, 105, 45]); g.lineWidth = 2;
    for (const x of [53, 60, 67]) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 210); g.stroke(); }
  });
  const rock = c => mk(160, 100, (g) => {
    poly(g, [[5, 100], [15, 55], [45, 25], [80, 15], [120, 30], [150, 60], [158, 100]], c);
    poly(g, [[45, 25], [80, 15], [120, 30], [90, 45], [55, 45]], U.shade(c, 1.25));
    poly(g, [[120, 30], [150, 60], [158, 100], [110, 100], [100, 60]], U.shade(c, 0.7));
  });
  const bush = c => mk(160, 90, (g) => {
    const cs = [[40, 60, 30], [80, 45, 40], [120, 60, 32], [60, 70, 25], [105, 72, 22]];
    for (const [x, y, r] of cs) circle(g, x + 3, y + 3, r, U.shade(c, 0.75));
    for (const [x, y, r] of cs) circle(g, x, y, r - 5, c);
  });
  const house = mk(220, 170, (g) => {
    g.fillStyle = col([245, 240, 228]); g.fillRect(20, 70, 180, 100);
    poly(g, [[5, 75], [110, 12], [215, 75]], [190, 80, 50]);
    g.fillStyle = col([70, 120, 180]); g.fillRect(42, 95, 36, 30); g.fillRect(142, 95, 36, 30);
    g.fillStyle = col([120, 80, 50]); g.fillRect(96, 115, 28, 55);
  });
  const billboard = (txt, bg, fg) => mk(300, 190, (g) => {
    g.fillStyle = col([60, 60, 66]); g.fillRect(60, 110, 14, 80); g.fillRect(226, 110, 14, 80);
    g.fillStyle = col([40, 40, 45]); g.fillRect(5, 0, 290, 110);
    g.fillStyle = col(bg); g.fillRect(10, 5, 280, 100);
    let fs = 48; g.font = `bold ${fs}px ${HR.FONT}`;
    while (g.measureText(txt).width > 265 && fs > 10) { fs -= 2; g.font = `bold ${fs}px ${HR.FONT}`; }
    g.fillStyle = col(fg); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 150, 57);
  });
  const chevron = dir => mk(120, 140, (g) => {
    g.fillStyle = col([70, 70, 75]); g.fillRect(54, 90, 12, 50);
    g.fillStyle = col([250, 210, 20]); g.fillRect(5, 5, 110, 90);
    g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(5, 5, 110, 90);
    for (const ox of [-18, 14]) {
      const x = 60 + ox * dir;
      const pts = dir > 0 ? [[x - 12, 18], [x + 8, 50], [x - 12, 82], [x - 2, 82], [x + 18, 50], [x - 2, 18]] : [[x + 12, 18], [x - 8, 50], [x + 12, 82], [x + 2, 82], [x - 18, 50], [x + 2, 18]];
      poly(g, pts, [15, 15, 15]);
    }
  });
  const banner = mk(440, 220, (g) => {
    for (const x of [0, 424]) for (let y = 0; y < 220; y += 20) { g.fillStyle = (y / 20) % 2 ? '#fff' : col([210, 30, 30]); g.fillRect(x, y, 16, 20); }
    g.fillStyle = '#000'; g.fillRect(0, 0, 440, 56);
    for (let c = 0; c < 44; c++) for (let r = 0; r < 2; r++) { g.fillStyle = (c + r) % 2 ? '#fff' : '#111'; g.fillRect(c * 10, 56 + r * 8, 10, 8); }
    g.fillStyle = col([255, 210, 0]); g.font = `bold 30px ${HR.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('START  ·  ZIEL', 220, 29);
  });
  // [Bild, Weltbreite, Kollisions-Halbbreite]
  S.palm = [palm, 1500, 0.12]; S.pine = [pine, 1300, 0.25]; S.cactus = [cactus, 900, 0.15];
  S.rock_grey = [rock([140, 140, 150]), 1100, 0.22]; S.rock_red = [rock([170, 85, 60]), 1100, 0.22];
  S.bush = [bush([60, 150, 60]), 900, 0]; S.shrub = [bush([150, 135, 80]), 800, 0];
  S.house = [house, 2600, 0.55]; S.chev_r = [chevron(1), 600, 0.1]; S.chev_l = [chevron(-1), 600, 0.1];
  S.banner = [banner, 4400, 0];
  HR.BILLBOARDS.forEach(([t, b, f], i) => S['bb' + i] = [billboard(t, b, f), 2000, 0.45]);
  return S;
};

// ---------- Hintergrund (Himmel, Sonne, Wolken, Bergketten) ----------
// Wird pro Strecke und Ansichtsgröße einmal gezeichnet.
HR.makeBackground = function (cfg, vw, vh) {
  vw = Math.max(64, Math.round(vw)); vh = Math.max(64, Math.round(vh));
  const hy = Math.round(vh * HR.HORIZON);
  const lw = vw * 2;
  const rnd = U.rng(cfg.seed + 99);
  const sky = U.canvas(vw, vh);
  {
    const g = sky.getContext('2d');
    for (let y = 0; y < hy; y++) { g.fillStyle = U.rgb(U.mix(cfg.sky[0], cfg.sky[1], Math.pow(y / hy, 0.8))); g.fillRect(0, y, vw, 1); }
    g.fillStyle = U.rgb(cfg.fog); g.fillRect(0, hy, vw, vh - hy);
  }
  const layer = (draw) => { const c = U.canvas(lw, hy); draw(c.getContext('2d')); return c; };
  const skyL = layer(g => {
    if (cfg.sun) {
      const x = 0.3 * lw, y = 0.5 * hy, r = 0.14 * hy;
      for (let k = 5; k >= 1; k--) { g.fillStyle = `rgba(${cfg.sun.join(',')},${22 / 255})`; g.beginPath(); g.arc(x, y, r * (1 + k * 0.35), 0, 7); g.fill(); }
      g.fillStyle = U.rgb(cfg.sun); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    if (cfg.clouds) {
      g.fillStyle = `rgba(255,255,255,${120 / 255})`;
      for (let i = 0; i < 12; i++) {
        const cx = rnd.uniform(0, lw), cy = rnd.uniform(0.08, 0.5) * hy, s = rnd.uniform(0.6, 1.4) * hy * 0.06;
        for (let j = 0; j < 6; j++) { g.beginPath(); g.ellipse(cx + rnd.uniform(-3, 3) * s, cy + rnd.uniform(-0.6, 0.6) * s, s * rnd.uniform(1.4, 2.4), s * rnd.uniform(0.7, 1.1), 0, 0, 7); g.fill(); }
      }
    }
  });
  const ridge = (p) => layer(g => {
    const amps = p.ks.map(k => rnd.uniform(0.4, 1) / Math.pow(k, p.rough));
    const phs = p.ks.map(() => rnd.uniform(0, Math.PI * 2));
    const sum = amps.reduce((a, b) => a + b, 0);
    const H = p.height * hy;
    const top = [];
    for (let x = 0; x <= lw; x += 2) {
      let v = 0;
      p.ks.forEach((k, i) => v += amps[i] * (0.5 + 0.5 * Math.sin(2 * Math.PI * k * x / lw + phs[i])));
      v /= sum;
      if (p.flat) v = Math.min(v, p.flat) / p.flat;
      top.push([x, hy - v * H]);
    }
    g.fillStyle = U.rgb(p.color);
    g.beginPath(); g.moveTo(0, hy); for (const [x, y] of top) g.lineTo(x, y); g.lineTo(lw, hy); g.closePath(); g.fill();
    if (p.snow) {
      g.save(); g.clip();
      g.fillStyle = 'rgb(240,244,250)'; g.fillRect(0, 0, lw, hy - 0.42 * H);
      g.restore();
    }
  });
  return { sky, skyL, far: ridge(cfg.far), near: ridge(cfg.near), vw, vh, hy, lw };
};

// ---------- Autos von hinten (6 Bilder: Neigung × Bremslicht) ----------
HR.makeCarFrames = function (car, color) {
  const ct = HR.CARS[car];
  const w = 240, h = 128;
  const frames = {};
  const poly = (g, pts, c) => { g.fillStyle = U.rgb(c); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
  const bt = { wedge: 54, round: 48, sport: 50, rally: 42 }[ct.style];
  const ctop = { wedge: 26, round: 14, sport: 20, rally: 9 }[ct.style];
  for (const lean of [-1, 0, 1]) for (const brake of [false, true]) {
    const c = U.canvas(w, h), g = c.getContext('2d');
    const L = lean * 7;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(w / 2, h - 8, w / 2 - 6, 9, 0, 0, 7); g.fill();
    g.fillStyle = 'rgb(22,22,26)'; g.fillRect(12, h - 48, 40, 42); g.fillRect(w - 52, h - 48, 40, 42);
    poly(g, [[8, h - 20], [6, bt + 16], [24 + L, bt], [w - 24 + L, bt], [w - 6, bt + 16], [w - 8, h - 20]], color);
    poly(g, [[10, bt + 18], [24 + L, bt + 3], [w - 24 + L, bt + 3], [w - 10, bt + 18], [w - 10, bt + 22], [10, bt + 22]], U.shade(color, 1.35));
    g.fillStyle = U.rgb(U.shade(color, 0.62)); g.fillRect(8, h - 30, w - 16, 12);
    poly(g, [[38 + L, bt + 2], [62 + 2 * L, ctop], [w - 62 + 2 * L, ctop], [w - 38 + L, bt + 2]], U.shade(color, 0.9));
    poly(g, [[46 + L, bt], [66 + 2 * L, ctop + 6], [w - 66 + 2 * L, ctop + 6], [w - 46 + L, bt]], [35, 50, 70]);
    for (const x0 of [16, w - 64]) {
      g.fillStyle = U.rgb(brake ? [255, 60, 50] : [180, 22, 22]); g.fillRect(x0 + L * 0.5, bt + 26, 48, 13);
      g.fillStyle = U.rgb(brake ? [255, 200, 180] : [235, 70, 60]); g.fillRect(x0 + 14 + L * 0.5, bt + 29, 20, 7);
    }
    g.fillStyle = 'rgb(235,235,225)'; g.fillRect(w / 2 - 24 + L * 0.5, h - 46, 48, 15);
    g.fillStyle = 'rgb(60,60,60)'; g.fillRect(w / 2 - 18 + L * 0.5, h - 41, 36, 4);
    g.fillStyle = 'rgb(70,70,75)'; g.fillRect(w / 2 - 70, h - 22, 14, 7); g.fillRect(w / 2 + 56, h - 22, 14, 7);
    if (ct.style === 'wedge') {
      g.fillStyle = U.rgb(U.shade(color, 0.45));
      g.fillRect(10 + L, bt - 18, w - 20, 9); g.fillRect(40 + L, bt - 10, 8, 12); g.fillRect(w - 48 + L, bt - 10, 8, 12);
    } else if (ct.style === 'sport') {
      g.fillStyle = U.rgb(U.shade(color, 0.5)); g.fillRect(24 + L, bt - 5, w - 48, 6);
      g.fillStyle = 'rgb(245,245,245)'; g.fillRect(w / 2 - 9 + L, bt, 18, h - 50 - bt);
    } else if (ct.style === 'round') {
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(30 + L, bt + 44, 30, 3); g.fillRect(w - 60 + L, bt + 44, 30, 3);
    } else if (ct.style === 'rally') {
      g.fillStyle = 'rgb(30,30,30)'; g.fillRect(64 + 2 * L, ctop - 8, w - 128, 9);
      g.fillStyle = 'rgb(255,230,90)'; for (let i = 0; i < 4; i++) g.fillRect(72 + 2 * L + i * 26, ctop - 7, 18, 7);
      g.fillStyle = 'rgb(25,25,25)'; g.fillRect(14, h - 20, 34, 12); g.fillRect(w - 48, h - 20, 34, 12);
    }
    frames[lean + ',' + (brake ? 1 : 0)] = c;
  }
  return frames;
};
