// B1 Lichtrad-Arena: jeder zieht eine Leuchtspur, wer gegen eine Spur oder Wand fährt, ist raus
'use strict';

HR.AR.define({
  code: 'B1', name: 'Lichtrad-Arena', short: 'Nicht gegen Spuren und Wände fahren!',
  desc: 'Jeder fährt ein Lichtrad, das eine leuchtende Spur hinter sich herzieht. Die Räder fahren von selbst geradeaus und werden mit der Zeit schneller. Du lenkst nur nach links oder rechts, immer im rechten Winkel.',
  goal: 'Nicht in eine Spur oder die Wand fahren. Wer als Letzter übrig ist, gewinnt.',
  touch: 'Steuerkreuz ◀ links abbiegen, ▶ rechts abbiegen', keys: '← / A links abbiegen, → / D rechts abbiegen',
  btns: [],
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
    const ST = HR.ST;
    ST.floor(g, 0, 0, 1600, 1000, '#cbbcff', '#bdabf6', 100);
    g.beginPath(); g.rect(3, 3, 1594, 994); g.lineWidth = 10; g.strokeStyle = ST.INK; g.stroke();
    g.lineCap = 'round'; g.lineJoin = 'round';
    // Spuren als dicke Bänder mit Umriss
    for (const p of S.p) {
      if (p.gone) continue;
      const pts = p.v.concat([[p.x, p.y]]);
      const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]); };
      g.globalAlpha = p.al ? 1 : 0.45;
      path(); g.strokeStyle = ST.INK; g.lineWidth = 22; g.stroke();
      path(); g.strokeStyle = G.rgb(p); g.lineWidth = 12; g.stroke();
      path(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; g.stroke();
      g.globalAlpha = 1;
    }
    for (const p of S.p) {
      if (p.gone) continue;
      const [dx, dy] = this.DIRS[p.d];
      if (!p.al) { ST.burst(g, p.x, p.y, Math.min(1, (S.time - p.dt) / 0.6), G.rgb(p), 10, 60); }
      G.fig(g, p, p.x, p.y - 6, 18, { look: [dx, dy], dead: !p.al, alpha: p.al ? 1 : 0.6 });
    }
  },
});
