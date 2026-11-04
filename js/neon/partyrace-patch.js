// Horizon Rush – Neon-Stil: wird nur geladen, wenn in den Einstellungen „Neon“ gewählt ist.
// Automatisch aus dem Stand vor der Umstellung erzeugt; ersetzt nur Zeichen-Code, die Spiellogik bleibt gemeinsam.
'use strict';

Object.assign(HR.PR, {
  "endHud": function (g, R, race, p, vw, vh, sc) {
    const alive = PR.alive(race);
    const won = !p.out && alive.length === 1;
    R.text(g, won ? 'GEWONNEN!' : 'ENDE', vw / 2, vh * 0.4, 64 * sc, won ? '#b6ff2e' : '#ffe23d', 'center', 'middle');
    if (!won && alive.length === 1) R.text(g, alive[0].name + ' gewinnt', vw / 2, vh * 0.4 + 50 * sc, 22 * sc, '#f2eeff', 'center', 'middle');
  },
  "banner": function (g, R, race, txt, sub, color, vw, vh, sc) {
    R.text(g, txt, vw / 2, vh * 0.13, 30 * sc, color || '#ffe23d', 'center', 'middle');
    if (sub) R.text(g, sub, vw / 2, vh * 0.13 + 30 * sc, 18 * sc, '#f2eeff', 'center', 'middle');
  },
  "outHud": function (g, R, race, p, vw, vh, sc) {
    const w = PR.spectate(race);
    R.text(g, 'AUSGESCHIEDEN', vw / 2, vh * 0.16, 34 * sc, '#ff3355', 'center', 'middle');
    if (w) R.text(g, 'Du schaust ' + w.name + ' zu' + (PR.alive(race).length > 1 ? '  ·  ◀ ▶ wechseln' : ''), vw / 2, vh * 0.16 + 34 * sc, 18 * sc, '#f2eeff', 'center', 'middle');
  },
  "siren": function (g, box, t) {
    const ST = HR.ST, w = box.w * 0.34, h = Math.max(3, box.w * 0.07), x = box.x + box.w / 2 - w / 2, y = box.y - h * 0.4;
    const on = Math.floor(t * 8) % 2;
    if (box.w > 30) ST.pool(g, on ? x + w * 0.25 : x + w * 0.75, y + h / 2, w * 0.9, on ? '#2f6bff' : ST.RED, 0.45);
    g.beginPath(); g.rect(x, y, w / 2, h); g.fillStyle = on ? 'rgba(80,140,255,.95)' : 'rgba(47,107,255,.25)'; g.fill(); ST.glow(g, '#4d8dff', Math.max(1, h * 0.25), on ? 1 : 0.5);
    g.beginPath(); g.rect(x + w / 2, y, w / 2, h); g.fillStyle = on ? 'rgba(255,51,85,.25)' : 'rgba(255,90,110,.95)'; g.fill(); ST.glow(g, ST.RED, Math.max(1, h * 0.25), on ? 0.5 : 1);
  },
  "bomb": function (g, box, t) {
    const r = Math.max(4, box.w * 0.13);
    HR.ST.bomb(g, box.x + box.w / 2, box.y - r * 1.2, r, t);
  }
});

(() => {
  const f = HR.GAMES["A1"]["rules"];
  HR.GAMES["A1"]["rules"] = function (ctx, ctl) {
    const r = f.apply(this, arguments);
    const n = ctx.players.length;
    Object.assign(r, {
      "hud": function (g, race, p, vw, vh, sc, R) {
        if (race.state === 'done') { PR.endHud(g, R, race, p, vw, vh, sc); return; }
        if (p.out) { PR.outHud(g, R, race, p, vw, vh, sc); return; }
        const alive = race.order.filter(c => !c.out), pos = alive.indexOf(p) + 1;
        R.panel(g, 6 * sc + 4, 7 * sc + 4, 140 * sc, 70 * sc, '#ff2bd6', sc);
        R.text(g, 'POSITION', 14 * sc + 4, 14 * sc + 4, 13 * sc, '#cfc9ec');
        R.text(g, `${pos}/${alive.length}`, 14 * sc + 4, 14 * sc + 4 + 16 * sc, 44 * sc, '#ff2bd6');
        if (race.state !== 'racing') return;
        const warn = pos === alive.length && alive.length > 1;
        const col = warn ? (Math.floor(race.time * 4) % 2 ? '#ff3355' : '#f2eeff') : '#ffe23d';
        PR.banner(g, R, race, 'AUSSCHEIDEN IN ' + Math.ceil(this.left), warn ? 'DU BIST LETZTER – GIB GAS!' : `Noch ${alive.length} im Rennen`, col, vw, vh, sc);
      }
    });
    return r;
  };
})();

(() => {
  const f = HR.GAMES["A2"]["rules"];
  HR.GAMES["A2"]["rules"] = function (ctx, ctl) {
    const r = f.apply(this, arguments);
    
    Object.assign(r, {
      "hud": function (g, race, p, vw, vh, sc, R) {
        const Y = '#ffe23d', pad = 14 * sc + 4;
        R.panel(g, pad - 8 * sc, pad - 7 * sc, 170 * sc, 62 * sc, '#4d8dff', sc);
        R.panel(g, vw - pad - 162 * sc, pad - 7 * sc, 170 * sc, 62 * sc, '#18e7ff', sc);
        R.text(g, 'POLIZEI-ZEIT', pad, pad, 13 * sc, '#cfc9ec');
        R.text(g, U.fmtTime(this.pt[p.id] || 0), pad, pad + 16 * sc, 32 * sc, '#4d8dff');
        R.text(g, 'NOCH', vw - pad, pad, 13 * sc, '#cfc9ec', 'right');
        R.text(g, U.fmtTime(this.left), vw - pad, pad + 16 * sc, 32 * sc, '#18e7ff', 'right');
        if (race.state === 'done') { R.text(g, 'ZEIT UM!', vw / 2, vh * 0.4, 60 * sc, Y, 'center', 'middle'); return; }
        const cop = race.cars.find(c => c.id === this.cop); if (!cop || race.state === 'countdown') return;
        if (cop === p) {
          let best = null;
          for (const c of race.cars) if (c !== p && !c.out) { const d = PR.gap(race, p, c); if (!best || Math.abs(d) < Math.abs(best.d)) best = { c, d }; }
          PR.banner(g, R, race, this.cd > 0 ? 'POLIZEI – KURZ WARTEN …' : 'DU BIST DIE POLIZEI',
            best ? `${best.c.name}: ${PR.meters(best.d)} m ${best.d >= 0 ? 'vor' : 'hinter'} dir` : '', Math.floor(race.time * 6) % 2 ? '#4d8dff' : '#ff3355', vw, vh, sc);
        } else {
          const d = PR.gap(race, p, cop);
          PR.banner(g, R, race, 'POLIZEI: ' + cop.name, `${PR.meters(d)} m ${d >= 0 ? 'vor' : 'hinter'} dir`, Math.abs(d) < 3000 ? '#ff3355' : Y, vw, vh, sc);
        }
      }
    });
    return r;
  };
})();

(() => {
  const f = HR.GAMES["A3"]["rules"];
  HR.GAMES["A3"]["rules"] = function (ctx, ctl) {
    const r = f.apply(this, arguments);
    const n = ctx.players.length;
    Object.assign(r, {
      "hud": function (g, race, p, vw, vh, sc, R) {
        if (race.state === 'done') { PR.endHud(g, R, race, p, vw, vh, sc); return; }
        if (p.out) { PR.outHud(g, R, race, p, vw, vh, sc); return; }
        const alive = PR.alive(race).length, Y = '#ffe23d';
        R.panel(g, 6 * sc + 4, 7 * sc + 4, 140 * sc, 70 * sc, '#ff7a1a', sc);
        R.text(g, 'IM RENNEN', 14 * sc + 4, 14 * sc + 4, 13 * sc, '#cfc9ec');
        R.text(g, String(alive), 14 * sc + 4, 14 * sc + 4 + 16 * sc, 44 * sc, '#ff7a1a');
        if (race.state !== 'racing') return;
        const b = race.cars.find(c => c.id === this.bomb);
        if (!b) { PR.banner(g, R, race, 'NEUE BOMBE KOMMT …', '', Y, vw, vh, sc); return; }
        if (b === p) PR.banner(g, R, race, 'DU HAST DIE BOMBE!', this.fuse < 5 ? 'GLEICH KNALLT ES!' : 'Ramm ein anderes Auto', Math.floor(race.time * (this.fuse < 5 ? 10 : 4)) % 2 ? '#ff3355' : '#f2eeff', vw, vh, sc);
        else { const d = PR.gap(race, p, b); PR.banner(g, R, race, 'BOMBE: ' + b.name, `${PR.meters(d)} m ${d >= 0 ? 'vor' : 'hinter'} dir`, Y, vw, vh, sc); }
      }
    });
    return r;
  };
})();

Object.assign(HR.ITEMS, {
  "turbo": { name: 'TURBO', color: '#ff7a1a' },
  "oil": { name: 'ÖLFLECK', color: '#aaa2dc' },
  "shield": { name: 'SCHILD', color: '#18e7ff' },
  "magnet": { name: 'MAGNET', color: '#ff2bd6' },
  "blitz": { name: 'BLITZ', color: '#ffe23d' }
});

HR.partySprites = function () {
  if (HR._pspr) return HR._pspr;
  const ST = HR.ST;
  const glow = (g, col, lw) => { g.save(); g.shadowColor = col; g.shadowBlur = lw * 3; g.strokeStyle = col; g.lineWidth = lw; g.stroke(); g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1, lw * 0.4); g.stroke(); g.restore(); };
  const box = U.canvas(128, 128), g = box.getContext('2d');
  ST.rrect(g, 14, 14, 100, 100, 16); g.fillStyle = 'rgba(12,10,28,.9)'; g.fill();
  const grd = g.createLinearGradient(14, 14, 114, 114); grd.addColorStop(0, 'rgba(255,43,214,.3)'); grd.addColorStop(1, 'rgba(24,231,255,.3)'); g.fillStyle = grd; g.fill();
  ST.rrect(g, 14, 14, 100, 100, 16); glow(g, '#ff2bd6', 5);
  ST.rrect(g, 26, 26, 76, 76, 10); g.strokeStyle = 'rgba(24,231,255,.6)'; g.lineWidth = 2; g.stroke();
  g.font = '700 70px ' + HR.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = '#18e7ff'; g.shadowBlur = 18; g.fillStyle = '#18e7ff'; g.fillText('?', 64, 68); g.restore();
  g.fillStyle = '#e8fbff'; g.fillText('?', 64, 68);
  const oil = U.canvas(256, 48), o = oil.getContext('2d');
  o.fillStyle = 'rgb(5,4,11)'; o.beginPath(); o.ellipse(128, 26, 120, 18, 0, 0, 7); o.fill();
  o.beginPath(); o.ellipse(128, 26, 120, 18, 0, 0, 7); glow(o, '#9b5cff', 2.5);
  o.beginPath(); o.ellipse(100, 22, 46, 5, 0, 0, 7); o.strokeStyle = 'rgba(255,43,214,.6)'; o.lineWidth = 2; o.stroke();
  o.beginPath(); o.ellipse(160, 29, 30, 4, 0, 0, 7); o.strokeStyle = 'rgba(24,231,255,.6)'; o.lineWidth = 2; o.stroke();
  return (HR._pspr = { box, oil });
};

(() => {
  const f = HR.GAMES["A5"]["rules"];
  HR.GAMES["A5"]["rules"] = function (ctx, ctl) {
    const r = f.apply(this, arguments);
    const spr = HR.partySprites();
    Object.assign(r, {
      "decorate": function (g, race, c, box) {
        if (box.own && this.shieldT > 0) {
          g.beginPath(); g.ellipse(box.x + box.w / 2, box.y + box.h * 0.55, box.w * 0.6, box.h * 0.75, 0, 0, 7);
          HR.ST.glow(g, HR.ST.CYAN, Math.max(2, box.w * 0.015), 0.5 + 0.3 * Math.sin(race.time * 10));
        }
      },
      "hud": function (g, race, p, vw, vh, sc, R) {
        const s = 74 * sc, x = vw / 2 - s / 2, y = HR.Input.touchMode ? vh * 0.2 : 14 * sc + 4;
        HR.ST.rrect(g, x, y, s, s, 12 * sc); g.fillStyle = 'rgba(12,10,28,.75)'; g.fill();
        HR.ST.glow(g, this.item ? HR.ITEMS[this.item].color : '#8f88bb', 2.5 * sc, this.item ? 1 : 0.6);
        if (this.item) R.text(g, HR.ITEMS[this.item].name, vw / 2, y + s / 2, (this.item === 'oil' ? 13 : 15) * sc, HR.ITEMS[this.item].color, 'center', 'middle');
        else R.text(g, 'EXTRA', vw / 2, y + s / 2, 13 * sc, 'rgba(242,238,255,.5)', 'center', 'middle');
        const fx = [];
        if (this.boostT > 0) fx.push('TURBO'); if (this.magnetT > 0) fx.push('MAGNET'); if (this.shieldT > 0) fx.push('SCHILD ' + Math.ceil(this.shieldT)); if (this.slowT > 0) fx.push('GEBREMST');
        if (fx.length) R.text(g, fx.join('  ·  '), vw / 2, y + s + 6, 16 * sc, '#ffe23d', 'center');
      }
    });
    return r;
  };
})();
