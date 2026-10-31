// Horizon Rush – Grundgerüst der 2D-Party-Spiele (Arena)
// Der Gastgeber rechnet das Spiel, die anderen schicken nur ihre Tasten und bekommen
// 20-mal pro Sekunde den Spielstand, den sie weich zwischen zwei Ständen anzeigen.
// Unveränderliche Teile (Labyrinth, Strecke, Wolken, Hindernisse) erzeugt jedes Gerät
// selbst aus demselben Startwert.
'use strict';

HR.ArenaGame = class {
  constructor(def, ctx) {
    this.def = def; this.ctx = ctx; this.host = ctx.host; this.me = ctx.me;
    this.W = def.W || 1600; this.H = def.H || 1000;
    this.S = def.init(ctx.players.map(p => ({ id: p.id, name: p.name, c: p.color })), U.rng(ctx.seed), this);
    this.S.time = 0;
    this.names = {}; for (const p of ctx.players) this.names[p.id] = p.name;
    this.phase = 'count'; this.count = 3.5; this.goT = 0; this.acc = 0; this.snapT = 0; this.sendT = 0; this.endT = 0;
    this.inputs = {}; this.edges = {}; this.prevIn = {}; this.myPrev = 0; this.lastSent = -1; this.pendEdge = 0;
    this.snaps = []; this.fx = []; this.fxSeq = 0; this.fxSeen = 0; this.ended = false;
    this.lerpKeys = new Set(['x', 'y', 'a', 't', 'u', 'h', 'z', 'R', 'cb'].concat(def.lerpKeys || []));
    this.view = { sc: 1, ox: 0, oy: 0 };
    this.ai = ctx.players.filter(p => p.ai).map(p => p.id);   // Computer-Spieler (Singleplayer)
    this.sloppy = [0.3, 0.12, 0.02][Game.diff] || 0;
  }

  start() {
    HR.Party.arena = this;
    HR.Input.actKeys = true;
    HR.Audio.stopEngines();
    this.layout();
    this._rl = () => setTimeout(() => this.layout(), 50);
    window.addEventListener('resize', this._rl);
    if (this.def.start) this.def.start(this.S, this);
  }

  layout() { HR.Input.layoutPad(this.def.btns || [], Game.W, Game.H); }

  stop() {
    if (HR.Party.arena === this) HR.Party.arena = null;
    window.removeEventListener('resize', this._rl);
    HR.Input.buttons = [];
  }

  name(id) { return this.names[id] || '?'; }
  color(p) { return HR.PARTY_COLORS[p.c || 0]; }
  rgb(p, a) { const c = this.color(p); return a == null ? U.rgb(c) : `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  // Geräusche: der Gastgeber spielt sie und schickt sie mit dem nächsten Spielstand an alle
  sfx(name, onlyFor) {
    if (!this.host || this.show) return;
    if (onlyFor == null || onlyFor === this.me) HR.Audio.play(name);
    this.fx.push([++this.fxSeq, name, onlyFor == null ? -1 : onlyFor, this.S.time]);
    if (this.fx.length > 20) this.fx.shift();
  }

  readInput() {
    const c = HR.Input.control(0);
    return (c.left ? 1 : 0) | (c.right ? 2 : 0) | (c.gas ? 4 : 0) | (c.brake ? 8 : 0) | (c.act ? 16 : 0) | (c.act2 ? 32 : 0);
  }

  frame(dt) {
    const bits = this.readInput();
    const edge = bits & ~this.myPrev; this.myPrev = bits;
    if (edge & 3 && this.watching()) this.cycleWatch(edge & 1 ? -1 : 1);
    if (this.host) { this.inputs[this.me] = bits; this.edges[this.me] = (this.edges[this.me] | 0) | edge; }
    else {
      this.pendEdge |= edge;
      this.sendT -= dt;
      if (bits !== this.lastSent || this.pendEdge || this.sendT <= 0) {
        HR.Net.send({ t: 'in', k: bits, e: this.pendEdge });
        this.lastSent = bits; this.pendEdge = 0; this.sendT = 0.25;
      }
    }
    if (this.host) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= HR.STEP && n++ < 4) { this.step(HR.STEP); this.acc -= HR.STEP; }
      if (n >= 4) this.acc = 0;
      this.snapT -= dt;
      if (this.snapT <= 0) {
        this.snapT = 0.05;
        HR.Net.broadcast({ t: 'as', s: this.def.pack(this.S, this), ph: this.phase, c: +this.count.toFixed(2), fx: this.fx.filter(f => this.S.time - f[3] < 1.5).map(f => [f[0], f[1], f[2]]) });
      }
    } else this.interp();
    if (this.goT > 0) this.goT -= dt;
    if (this.def.local) this.def.local(this.S, dt, this);
  }

  step(dt) {
    const S = this.S;
    if (this.phase === 'count') {
      const b = Math.ceil(this.count); this.count -= dt; const a = Math.ceil(this.count);
      if (a !== b) HR.Audio.play(a > 0 ? 'beep' : 'go');
      if (this.count <= 0) { this.phase = 'play'; this.goT = 1; }
      return;
    }
    if (this.phase !== 'play') {
      this.endT += dt;
      if (this.endT > 2.5 && !this.ended) { this.ended = true; this.onEnd(this.def.rank(S, this)); }
      return;
    }
    for (const id of this.ai) { const p = S.p.find(q => q.id === id); if (p) this.inputs[id] = HR.Showcase.botBits(this.def, S, p, this.sloppy); }
    const inp = {};
    for (const p of S.p) {
      const k = this.inputs[p.id] | 0, pk = this.prevIn[p.id] | 0, e = (this.edges[p.id] | 0) | (k & ~pk);
      inp[p.id] = { l: !!(k & 1), r: !!(k & 2), u: !!(k & 4), d: !!(k & 8), a: !!(k & 16), b: !!(k & 32),
        pl: !!(e & 1), pr: !!(e & 2), pu: !!(e & 4), pd: !!(e & 8), pa: !!(e & 16), pb: !!(e & 32) };
      this.prevIn[p.id] = k; this.edges[p.id] = 0;
    }
    S.time += dt;
    this.def.step(S, inp, dt, this);
    if (this.def.over(S, this) || (this.def.duration && S.time >= this.def.duration)) {
      this.phase = 'end'; this.endT = 0;
      this.sfx('finish');
    }
  }

  msg(m, from) {
    if (this.host) {
      if (m.t === 'in') { this.inputs[from] = m.k | 0; this.edges[from] = (this.edges[from] | 0) | (m.e | 0); }
    } else if (m.t === 'as') {
      const now = performance.now();
      this.snaps.push({ t: now, s: m.s });
      if (this.snaps.length > 4) this.snaps.shift();
      if (this.phase === 'count' && m.ph === 'count') {
        const b = Math.ceil(this.count), a = Math.ceil(m.c);
        if (a !== b) HR.Audio.play(a > 0 ? 'beep' : 'go');
      }
      if (this.phase === 'count' && m.ph === 'play') { HR.Audio.play('go'); this.goT = 1; }
      this.phase = m.ph; this.count = m.c;
      for (const f of m.fx || []) {
        if (f[0] <= this.fxSeen) continue;
        this.fxSeen = f[0];
        if (f[2] === -1 || f[2] === this.me) HR.Audio.play(f[1]);
      }
    }
  }

  // Spielstand weich zwischen den letzten beiden Ständen anzeigen (50 ms Verzögerung)
  interp() {
    const sn = this.snaps; if (!sn.length) return;
    const t = performance.now() - 55;
    let a = sn[0], b = sn[sn.length - 1];
    for (let i = sn.length - 1; i > 0; i--) { if (sn[i - 1].t <= t) { a = sn[i - 1]; b = sn[i]; break; } }
    const f = b.t === a.t ? 1 : U.clamp((t - a.t) / (b.t - a.t), 0, 1);
    this.def.unpack(this.S, this.lerp(a.s, b.s, f), this);
  }

  lerp(a, b, f) {
    if (Array.isArray(b)) {
      if (!Array.isArray(a) || a.length !== b.length) return b;
      return b.map((v, i) => this.lerp(a[i], v, f));
    }
    if (b && typeof b === 'object') {
      if (!a || typeof a !== 'object' || (b.i !== undefined && a.i !== b.i)) return b;
      const o = {}, wrap = this.def.wrap || {};
      for (const k in b) {
        const av = a[k], bv = b[k];
        if (typeof bv === 'number' && typeof av === 'number' && this.lerpKeys.has(k)) {
          o[k] = wrap[k] && Math.abs(bv - av) > wrap[k] / 2 ? bv : Math.abs(bv - av) > 400 && k !== 't' && k !== 'z' && k !== 'cb' ? bv : av + (bv - av) * f;
        } else if (bv && typeof bv === 'object') o[k] = this.lerp(av, bv, f);
        else o[k] = bv;
      }
      return o;
    }
    return b;
  }

  // Zuschauen nach dem Ausscheiden: mit ◀ ▶ zwischen den verbliebenen Spielern wechseln
  watchList() { const d = this.def; return this.S.p.filter(p => !p.gone && !d.isOut(this.S, p)); }
  watching() {
    const d = this.def, S = this.S;
    if (this.show || !d.isOut) return null;
    const me = S.p.find(p => p.id === this.me);
    if (!me || !d.isOut(S, me)) return null;
    const list = this.watchList();
    if (!list.length) return null;
    const w = list.find(p => p.id === this.watchId) || list[0];
    this.watchId = w.id;
    return w;
  }
  cycleWatch(dir) {
    const list = this.watchList(), n = list.length;
    if (n < 2) return;
    const i = Math.max(0, list.findIndex(p => p.id === this.watchId));
    this.watchId = list[(i + dir + n) % n].id;
    HR.Audio.play('select');
  }

  drop(id) {
    const p = this.S.p.find(x => x.id === id);
    if (p) { p.gone = 1; if (this.def.kill) this.def.kill(this.S, p, this); }
  }

  // ---------- Zeichnen ----------
  render(g, W, H, dpr) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    HR.ST.backdrop(g, W, H, this.def.bgTop, this.def.bgBot);
    // mit Touch-Tasten bleibt unten ein Streifen für die Tasten frei
    const band = HR.Input.touchMode && !this.show ? Math.min(H * 0.24, 150 * U.clamp(Math.min(W / 900, H / 560), 0.6, 1.15)) : 0;
    const avH = H - band;
    const sc = Math.min(W / this.W, avH / this.H);
    this.view = { sc, ox: (W - this.W * sc) / 2, oy: (avH - this.H * sc) / 2, W, H };
    g.save();
    this.def.draw(g, this.S, this, W, H);
    g.restore();
    const w = this.watching();
    if (w && this.def.spot && this.phase === 'play') {
      const s = this.def.spot(this.S, w);
      if (s) { g.save(); this.world(g); this.meMark(g, s[0], s[1], 46, this.S.time); this.label(g, this.name(w.id), s[0], s[1] - 50, 26, 'rgb(255,210,40)'); g.restore(); }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.show) return;
    this.hud(g, W, H);
    HR.Render.touch(g);
  }

  // Welt-Koordinaten auf den Bildschirm
  world(g) { const v = this.view; g.translate(v.ox, v.oy); g.scale(v.sc, v.sc); }

  meMark(g, x, y, r, t) {
    g.strokeStyle = `rgba(255,255,255,${0.55 + 0.45 * Math.sin((t || 0) * 8)})`; g.lineWidth = Math.max(2, r * 0.12);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }

  // Party-Figur eines Spielers mit "DU"-Pfeil
  fig(g, p, x, y, r, o) {
    o = Object.assign({ t: this.S.time }, o || {});
    HR.ST.char(g, x, y, r, this.color(p), o);
    if (p.id === this.me && !o.dead && !o.noMark) HR.ST.you(g, x, y - r * (o.hat ? 1.9 : 1.25), this.S.time, r > 22 ? 'DU' : '');
  }

  label(g, txt, x, y, size, color) { HR.ST.text(g, txt, x, y, size, color || '#fff', 'center', 'bottom'); }

  hud(g, W, H) {
    const R = HR.Render, S = this.S, sc = U.clamp(Math.min(W / 1000, H / 640), 0.62, 1.3);
    const Y = 'rgb(255,210,40)';
    // Spielerliste oben links
    const rows = S.p.filter(p => !p.gone);
    const fs = Math.round(13 * sc), lh = fs * 1.45, w = 190 * sc;
    g.fillStyle = 'rgba(37,31,58,.78)'; g.beginPath(); g.roundRect(6, 6, w + 8, rows.length * lh + 10, 10 * sc); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.stroke();
    rows.forEach((p, i) => {
      const y = 10 + i * lh, st = this.def.status ? this.def.status(S, p, this) : '';
      const out = this.def.isOut ? this.def.isOut(S, p) : false;
      g.globalAlpha = out ? 0.45 : 1;
      g.fillStyle = this.rgb(p); g.beginPath(); g.arc(12 + fs * 0.4, y + lh * 0.2 + fs * 0.4, fs * 0.45, 0, 7); g.fill();
      g.font = `${p.id === this.me ? 'bold ' : ''}${fs}px ${HR.FONT}`; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = p.id === this.me ? Y : '#fff';
      let nm = this.name(p.id); if (nm.length > 12) nm = nm.slice(0, 11) + '…';
      g.fillText(nm, 12 + fs * 1.2, y + lh * 0.12);
      g.textAlign = 'right'; g.fillStyle = out ? 'rgb(255,120,110)' : '#fff';
      g.fillText(out ? 'raus' : st, w, y + lh * 0.12);
      g.globalAlpha = 1;
    });
    // Titel und Zeit oben rechts
    const T = HR.ST.text;
    T(g, this.def.name.toUpperCase(), W - 12, 18 * sc, 15 * sc, Y, 'right');
    if (this.def.duration && this.phase !== 'count') T(g, U.fmtTime(Math.max(0, this.def.duration - S.time)).replace(/\.\d+$/, ''), W - 12, 18 * sc + 26 * sc, 28 * sc, '#fff', 'right');
    if (this.def.hud) this.def.hud(g, S, this, W, H, sc);
    // Countdown, LOS, Ende
    if (this.phase === 'count') {
      const c = Math.ceil(this.count);
      if (c > 0 && c <= 3) T(g, String(c), W / 2, H * 0.42, 120 * sc, Y);
      T(g, this.def.short || '', W / 2, H * 0.42 + 85 * sc, 24 * sc, '#fff');
    } else if (this.goT > 0) T(g, 'LOS!', W / 2, H * 0.42, 110 * sc, 'rgb(90,235,110)');
    if (this.phase === 'end') T(g, 'ENDE!', W / 2, H * 0.42, 90 * sc, Y);
    else if (this.phase === 'play' && this.def.isOut && this.def.isOut(S, S.p.find(p => p.id === this.me) || {})) {
      T(g, 'AUSGESCHIEDEN', W / 2, H * 0.12 + 20 * sc, 30 * sc, 'rgb(255,110,100)');
      const w = this.watching();
      T(g, w ? 'Du schaust ' + this.name(w.id) + ' zu  ·  ◀ ▶ wechseln' : 'Du schaust den anderen zu', W / 2, H * 0.12 + 52 * sc, 17 * sc, '#fff');
    }
  }
};

// ---------- Helfer für die Spiele ----------
const AR = HR.AR = {
  define(def) {
    HR.addGame(Object.assign({ kind: 'arena', create: ctx => new HR.ArenaGame(def, ctx) }, def));
  },
  need: S => (S.p.length > 1 ? 1 : 0),
  aliveCount: S => S.p.filter(p => p.al && !p.gone).length,
  // Rangliste für "Wer zuletzt übrig ist, gewinnt": Überlebende vorn, dann nach Ausscheidezeit
  survival(S, extra) {
    return S.p.filter(p => !p.gone).map(p => p.al
      ? { id: p.id, s: 1e7 + (extra ? extra(p) : 0), txt: 'überlebt' }
      : { id: p.id, s: Math.round(p.dt * 100), txt: 'raus nach ' + Math.floor(p.dt) + ' s' }).sort((a, b) => b.s - a.s);
  },
  angDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; },
  rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); },
};
