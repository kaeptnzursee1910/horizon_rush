// B1 Lichtrad-Arena: jeder zieht eine Leuchtspur, wer gegen eine Spur oder Wand fährt, ist raus
'use strict';

HR.AR.define({
  code: 'B1', name: 'Lichtrad-Arena', short: 'Nicht gegen Spuren und Wände fahren!',
  desc: 'Jeder fährt ein Lichtrad, das eine leuchtende Spur hinter sich herzieht. Die Räder fahren von selbst geradeaus und werden mit der Zeit schneller. Du lenkst nur nach links oder rechts, immer im rechten Winkel.',
  goal: 'Nicht in eine Spur oder die Wand fahren. Wer als Letzter übrig ist, gewinnt.',
  touch: '◀ links abbiegen, ▶ rechts abbiegen', keys: '← / A links abbiegen, → / D rechts abbiegen',
  padL: [['left', '◀']], padR: [['right', '▶']],
  duration: 120,
  DIRS: [[1, 0], [0, 1], [-1, 0], [0, -1]],

  init(players) {
    const n = players.length;
    const p = players.map((pl, i) => {
      const ang = i / n * Math.PI * 2 + Math.PI / 4;
      const x = Math.round(800 + Math.cos(ang) * 560), y = Math.round(500 + Math.sin(ang) * 330);
      const c = Math.cos(ang), s = Math.sin(ang);
      const d = Math.abs(c) > Math.abs(s) ? (c > 0 ? 2 : 0) : (s > 0 ? 3 : 1);
      return { id: pl.id, c: pl.c, x, y, d, al: 1, dt: 0, v: [[x, y]] };
    });
    return { p, sp: 220 };
  },

  step(S, inp, dt, G) {
    S.sp = 220 + S.time * 1.6;
    for (const p of S.p) {
      if (!p.al) continue;
      const i = inp[p.id];
      if (i.pl || i.pr) { p.d = (p.d + (i.pl ? 3 : 1)) % 4; p.v.push([p.x, p.y]); }
      const [dx, dy] = this.DIRS[p.d];
      p.x += dx * S.sp * dt; p.y += dy * S.sp * dt;
    }
    for (const p of S.p) {
      if (!p.al) continue;
      if (p.x < 4 || p.x > 1596 || p.y < 4 || p.y > 996 || this.hits(S, p)) {
        p.al = 0; p.dt = S.time; G.sfx('crash');
      }
    }
  },

  // Abstand des Kopfes zu allen Spurstücken
  hits(S, me) {
    const x = me.x, y = me.y, R = 4.5;
    for (const o of S.p) {
      const v = o.v, n = v.length;
      for (let k = 0; k < n; k++) {
        const a = v[k], b = k + 1 < n ? v[k + 1] : [o.x, o.y];
        if (o === me) {
          if (k === n - 1) continue;                       // aktuelles Stück
          if (k === n - 2) {                               // gerade abgebogen: Ende des letzten Stücks ignorieren
            if (Math.hypot(x - b[0], y - b[1]) < 12) continue;
          }
        }
        const minx = Math.min(a[0], b[0]) - R, maxx = Math.max(a[0], b[0]) + R;
        const miny = Math.min(a[1], b[1]) - R, maxy = Math.max(a[1], b[1]) + R;
        if (x > minx && x < maxx && y > miny && y < maxy) return true;
      }
    }
    return false;
  },

  over(S) { return HR.AR.aliveCount(S) <= HR.AR.need(S); },
  rank(S) { return HR.AR.survival(S); },
  isOut: (S, p) => !p.al,
  spot: (S, p) => [p.x, p.y],
  kill(S, p) { p.al = 0; p.dt = S.time; },

  pack(S) { return { t: +S.time.toFixed(3), sp: S.sp, p: S.p.map(p => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), d: p.d, al: p.al, dt: p.dt, g: p.gone ? 1 : 0, n: p.v.length, v: p.v.slice(-4) })) }; },
  unpack(S, d) {
    S.time = d.t; S.sp = d.sp;
    d.p.forEach((q, i) => {
      const p = S.p[i];
      p.x = q.x; p.y = q.y; p.d = q.d; p.al = q.al; p.dt = q.dt; p.gone = q.g;
      // neue Knickpunkte anhängen
      const off = q.n - q.v.length;
      while (p.v.length < q.n) { const k = p.v.length - off; p.v.push(k >= 0 ? q.v[k] : [p.x, p.y]); }
      if (p.v.length > q.n) p.v.length = q.n;
    });
  },

  draw(g, S, G) {
    G.world(g);
    // Boden mit Raster
    g.fillStyle = '#070b1c'; g.fillRect(0, 0, 1600, 1000);
    g.strokeStyle = 'rgba(80,140,255,.12)'; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= 1600; x += 50) { g.moveTo(x, 0); g.lineTo(x, 1000); }
    for (let y = 0; y <= 1000; y += 50) { g.moveTo(0, y); g.lineTo(1600, y); }
    g.stroke();
    g.strokeStyle = 'rgba(120,180,255,.8)'; g.lineWidth = 6; g.strokeRect(3, 3, 1594, 994);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const p of S.p) {
      if (p.gone) continue;
      const pts = p.v.concat([[p.x, p.y]]);
      const a = p.al ? 1 : 0.35;
      for (const [w, al] of [[16, 0.18], [8, 0.45], [3, 1]]) {
        g.strokeStyle = w === 3 ? `rgba(255,255,255,${a * 0.85})` : G.rgb(p, al * a); g.lineWidth = w;
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
        g.stroke();
      }
      if (p.al) {
        g.fillStyle = G.rgb(p); g.beginPath(); g.arc(p.x, p.y, 11, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 5, 0, 7); g.fill();
        if (p.id === G.me) { G.meMark(g, p.x, p.y, 22, S.time); G.label(g, 'DU', p.x, p.y - 26, 22, '#fff'); }
      } else {
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(p.x - 12, p.y - 12); g.lineTo(p.x + 12, p.y + 12); g.moveTo(p.x + 12, p.y - 12); g.lineTo(p.x - 12, p.y + 12); g.stroke();
      }
    }
  },
});
