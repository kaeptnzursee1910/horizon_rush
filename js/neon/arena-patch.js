// Horizon Rush – Neon-Stil: wird nur geladen, wenn in den Einstellungen „Neon“ gewählt ist.
// Automatisch aus dem Stand vor der Umstellung erzeugt; ersetzt nur Zeichen-Code, die Spiellogik bleibt gemeinsam.
'use strict';

HR.ArenaGame.prototype.render = function (g, W, H, dpr) {
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
      if (s) { g.save(); this.world(g); this.meMark(g, s[0], s[1], 46, this.S.time); this.label(g, this.name(w.id), s[0], s[1] - 50, 26, HR.ST.YELLOW); g.restore(); }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    HR.ST.overlay(g, W, H);
    if (this.show) return;
    this.hud(g, W, H);
    HR.Render.touch(g);
  };

HR.ArenaGame.prototype.meMark = function (g, x, y, r, t) {
    g.setLineDash([r * 0.25, r * 0.18]); HR.ST.oct(g, x, y, r, (t || 0) * 0.8);
    HR.ST.glow(g, HR.ST.YELLOW, Math.max(2, r * 0.07), 0.55 + 0.45 * Math.sin((t || 0) * 8)); g.setLineDash([]);
  };

HR.ArenaGame.prototype.label = function (g, txt, x, y, size, color) { HR.ST.text(g, txt, x, y, size, color || HR.ST.TEXT, 'center', 'bottom'); };

HR.ArenaGame.prototype.hud = function (g, W, H) {
    const ST = HR.ST, S = this.S, sc = U.clamp(Math.min(W / 1000, H / 640), 0.62, 1.3);
    const Y = ST.YELLOW;
    // Spielerliste oben links: gefaste Leiste mit Token-Symbol, Name und Wert
    const rows = S.p.filter(p => !p.gone);
    const fs = Math.round(13 * sc), lh = fs * 1.6, w = 196 * sc, x0 = 8, y0 = 8;
    ST.rrect(g, x0, y0, w + 10, rows.length * lh + 12, 12 * sc);
    g.fillStyle = 'rgba(12,10,28,.82)'; g.fill(); ST.glow(g, [58, 52, 102], 1.5);
    rows.forEach((p, i) => {
      const y = y0 + 6 + i * lh, cy = y + lh / 2, st = this.def.status ? this.def.status(S, p, this) : '';
      const out = this.def.isOut ? this.def.isOut(S, p) : false, c = this.color(p), mine = p.id === this.me;
      g.globalAlpha = out ? 0.45 : 1;
      if (mine) { ST.rrect(g, x0 + 4, y + 1, w + 2, lh - 2, 6 * sc); g.fillStyle = ST.rgb(c, 0.14); g.fill(); ST.thin(g, c, 1.2, 0.7); }
      ST.oct(g, x0 + 8 + fs * 0.6, cy, fs * 0.62); g.fillStyle = ST.BODY; g.fill(); ST.glow(g, c, 1.5);
      ST.symbol(g, ST.symFor(c), x0 + 8 + fs * 0.6, cy, fs * 0.36, c);
      g.font = `${mine ? 700 : 500} ${fs}px ${HR.FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = mine ? Y : ST.TEXT;
      let nm = this.name(p.id); if (nm.length > 12) nm = nm.slice(0, 11) + '…';
      g.fillText(nm.toUpperCase(), x0 + 10 + fs * 1.5, cy + 1);
      g.textAlign = 'right'; g.font = `700 ${fs}px ${HR.FONT}`; g.fillStyle = out ? ST.RED : U.rgb(c);
      g.fillText(out ? 'RAUS' : String(st).toUpperCase(), x0 + w + 2, cy + 1);
      g.globalAlpha = 1;
    });
    // Titel und Zeit oben rechts
    const T = ST.text;
    T(g, this.def.name.toUpperCase(), W - 14, 18 * sc, 15 * sc, ST.DIM, 'right');
    if (this.def.duration && this.phase !== 'count') {
      const left = Math.max(0, this.def.duration - S.time), f = left / this.def.duration;
      T(g, U.fmtTime(left).replace(/\.\d+$/, ''), W - 14, 18 * sc + 26 * sc, 28 * sc, left < 10 ? ST.RED : ST.CYAN, 'right');
      const bw = 150 * sc, by = 18 * sc + 46 * sc;
      g.fillStyle = 'rgba(24,231,255,.15)'; g.fillRect(W - 14 - bw, by, bw, 3 * sc);
      ST.line(g, W - 14 - bw, by + 1.5 * sc, W - 14 - bw + bw * f, by + 1.5 * sc); ST.glow(g, left < 10 ? ST.RED : ST.CYAN, 3 * sc);
    }
    if (this.def.hud) this.def.hud(g, S, this, W, H, sc);
    // Countdown, LOS, Ende
    if (this.phase === 'count') {
      const c = Math.ceil(this.count);
      if (c > 0 && c <= 3) { ST.oct(g, W / 2, H * 0.42, 78 * sc); g.fillStyle = 'rgba(12,10,28,.7)'; g.fill(); ST.glow(g, ST.MAGENTA, 4 * sc); T(g, String(c), W / 2, H * 0.42 + 4 * sc, 100 * sc, ST.TEXT); }
      T(g, (this.def.short || '').toUpperCase(), W / 2, H * 0.42 + 112 * sc, 22 * sc, ST.CYAN);
    } else if (this.goT > 0) T(g, 'LOS!', W / 2, H * 0.42, 110 * sc, ST.LIME);
    if (this.phase === 'end') T(g, 'ENDE!', W / 2, H * 0.42, 90 * sc, ST.MAGENTA);
    else if (this.phase === 'play' && this.def.isOut && this.def.isOut(S, S.p.find(p => p.id === this.me) || {})) {
      T(g, 'AUSGESCHIEDEN', W / 2, H * 0.12 + 20 * sc, 30 * sc, ST.RED);
      const w = this.watching();
      T(g, w ? 'Du schaust ' + this.name(w.id) + ' zu  ·  ◀ ▶ wechseln' : 'Du schaust den anderen zu', W / 2, H * 0.12 + 52 * sc, 17 * sc, ST.TEXT);
    }
  };
