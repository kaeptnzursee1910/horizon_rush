// Horizon Rush – Pseudo-3D-Darstellung und HUD (wie im Original)
'use strict';

HR.Render = {
  poly(g, c, pts) {
    g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fill();
  },

  background(g, bg, viewer, vw) {
    g.drawImage(bg.sky, 0, 0);
    const f = vw / 960;
    for (const [img, m] of [[bg.skyL, 0.2], [bg.far, 0.5], [bg.near, 1.0]]) {
      let x = -(((viewer.bg * m * f) % bg.lw) + bg.lw) % bg.lw;
      g.drawImage(img, x, 0); g.drawImage(img, x + bg.lw, 0);
      if (x + bg.lw * 2 < vw) g.drawImage(img, x + bg.lw * 2, 0);
    }
  },

  sprite(g, img, worldW, sk, sx, sy, clip) {
    const dw = worldW * sk;
    if (dw < 2 || dw > 2600 * (sk > 0 ? 1 : 1) * 3) return null;
    const dh = dw * img.height / img.width;
    const y = sy - dh;
    if (y >= clip) return null;
    const hidden = y + dh - clip;
    if (hidden > 0) g.drawImage(img, 0, 0, img.width, img.height * (dh - hidden) / dh, sx - dw / 2, y, dw, dh - hidden);
    else g.drawImage(img, sx - dw / 2, y, dw, dh);
    return { x: sx - dw / 2, y, w: dw, h: dh };
  },

  view(g, game, view) {
    const race = game.race, tr = race.track, segs = tr.segs, n = tr.n, L = tr.length;
    const R = race.rules;
    let viewer = race.cars[view.car];
    if (viewer.out && R && R.spectate) viewer = R.spectate(race, viewer) || viewer;
    const vw = view.w, vh = view.h;
    const hy = vh * HR.HORIZON, k = vh * HR.LENS, half = vw / 2;
    const dd = view.dd;
    g.save();
    g.beginPath(); g.rect(view.x, view.y, vw, vh); g.clip();
    g.translate(view.x, view.y);
    if (viewer.shake > 0) { viewer.shake -= 1 / 60; g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5); }

    this.background(g, game.getBg(race.trackIdx, vw, vh), viewer, vw);

    const camZ = race.mod(viewer.dist - HR.PLAYERZ);
    const baseI = Math.floor(camZ / HR.SEG), base = segs[baseI % n];
    const basePct = (camZ % HR.SEG) / HR.SEG;
    const pz = race.mod(viewer.dist), pseg = segs[Math.floor(pz / HR.SEG) % n];
    const playerY = pseg.y1 + (pseg.y2 - pseg.y1) * ((pz % HR.SEG) / HR.SEG);
    const camY = playerY + HR.CAMH, camX = viewer.x * HR.ROADW;
    let maxy = vh, x = 0, dx = -base.curve * basePct;
    const colors = tr.colors;

    for (let i = 0; i < dd; i++) {
      const idx = baseI + i, seg = segs[idx % n];
      const zoff = idx >= n ? L : 0;
      const cz1 = seg.z1 + zoff - camZ, cz2 = seg.z2 + zoff - camZ;
      const x1c = x - camX, x2c = x + dx - camX;
      x += dx; dx += seg.curve;
      seg.clip = maxy;
      if (cz1 <= HR.CAMDEPTH) { seg.ok = false; continue; }
      const s1 = HR.CAMDEPTH / cz1, s2 = HR.CAMDEPTH / cz2;
      let X1 = half + s1 * x1c * k, Y1 = hy - s1 * (seg.y1 - camY) * k, W1 = s1 * HR.ROADW * k;
      const X2 = half + s2 * x2c * k, Y2 = hy - s2 * (seg.y2 - camY) * k, W2 = s2 * HR.ROADW * k;
      seg.X1 = X1; seg.Y1 = Y1; seg.W1 = W1; seg.S1 = s1;
      seg.X2 = X2; seg.Y2 = Y2; seg.W2 = W2; seg.S2 = s2;
      seg.ok = true;
      if (Y2 >= Y1 || Y2 >= maxy) continue;
      if (Y1 > maxy) { const t = (Y1 - maxy) / (Y1 - Y2); X1 += (X2 - X1) * t; W1 += (W2 - W1) * t; Y1 = maxy; }
      const y1 = Math.ceil(Y1), y2 = Math.ceil(Y2) - 0.5;
      maxy = Y2;
      if (y1 <= y2) continue;
      const [grass, rumble, road, lane] = colors[seg.dark][Math.min(i, HR.FOG.length - 1)];
      g.fillStyle = grass; g.fillRect(0, y2, vw, y1 - y2);
      if (seg.sea) {
        const [sand, water] = colors['sea' + (seg.dark ? 1 : 0)][Math.min(i, HR.FOG.length - 1)];
        const sd = seg.sea, e1 = vw * (sd > 0 ? 1 : 0);
        const a1 = X1 + sd * W1 * 1.17, a2 = X2 + sd * W2 * 1.17, b1 = X1 + sd * W1 * 1.6, b2 = X2 + sd * W2 * 1.6;
        this.poly(g, sand, [[a1, y1], [b1, y1], [b2, y2], [a2, y2]]);
        this.poly(g, water, [[b1, y1], [e1, y1], [e1, y2], [b2, y2]]);
      }
      const r1 = W1 / 6, r2 = W2 / 6;
      this.poly(g, rumble, [[X1 - W1 - r1, y1], [X1 - W1, y1], [X2 - W2, y2], [X2 - W2 - r2, y2]]);
      this.poly(g, rumble, [[X1 + W1 + r1, y1], [X1 + W1, y1], [X2 + W2, y2], [X2 + W2 + r2, y2]]);
      this.poly(g, road, [[X1 - W1, y1], [X1 + W1, y1], [X2 + W2, y2], [X2 - W2, y2]]);
      if (seg.finish) {
        for (let c = 0; c < 10; c++) if ((c + seg.index) % 2) {
          const a = -1 + 2 * c / 10, b = -1 + 2 * (c + 1) / 10;
          this.poly(g, 'rgb(240,240,240)', [[X1 + W1 * a, y1], [X1 + W1 * b, y1], [X2 + W2 * b, y2], [X2 + W2 * a, y2]]);
        }
      } else if (lane) {
        const l1 = W1 / 32, l2 = W2 / 32;
        for (let ln = 1; ln < HR.LANES; ln++) {
          const f = -1 + 2 * ln / HR.LANES, lx1 = X1 + W1 * f, lx2 = X2 + W2 * f;
          this.poly(g, lane, [[lx1 - l1, y1], [lx1 + l1, y1], [lx2 + l2, y2], [lx2 - l2, y2]]);
        }
      }
    }

    // Autos nach Segment sortieren
    const buckets = new Map();
    for (const c of race.cars) {
      if (c === viewer || c.out) continue;
      const si = Math.floor(race.mod(c.dist) / HR.SEG) % n;
      let b = buckets.get(si); if (!b) buckets.set(si, b = []);
      b.push(c);
    }
    const spr = game.sprites;
    for (let i = dd - 1; i > 0; i--) {
      const seg = segs[(baseI + i) % n];
      if (!seg.ok) continue;
      for (const [kind, off] of seg.sprites) {
        const sd = spr[kind];
        this.sprite(g, sd[0], sd[1], seg.S1 * k, seg.X1 + off * seg.W1, seg.Y1, seg.clip);
      }
      if (R && R.extras) for (const [img, ww, off] of R.extras(race, seg.index, viewer)) this.sprite(g, img, ww, seg.S1 * k, seg.X1 + off * seg.W1, seg.Y1, seg.clip);
      const cars = buckets.get(seg.index);
      if (cars) {
        if (cars.length > 1) cars.sort((a, b) => race.mod(b.dist) - race.mod(a.dist));
        for (const c of cars) {
          const pct = (race.mod(c.dist) % HR.SEG) / HR.SEG;
          const sc = seg.S1 + (seg.S2 - seg.S1) * pct, w_ = seg.W1 + (seg.W2 - seg.W1) * pct;
          const sx = seg.X1 + (seg.X2 - seg.X1) * pct + c.x * w_, sy = seg.Y1 + (seg.Y2 - seg.Y1) * pct;
          const box = this.sprite(g, c.frames[c.lean + ',' + (c.braking ? 1 : 0)], HR.CAR_W, sc * k, sx, sy, seg.clip);
          if (box && R && R.decorate && box.y + box.h <= seg.clip) R.decorate(g, race, c, box);
          if (box && c.human && (game.online || game.party) && i < dd * 0.5 && box.y + box.h <= seg.clip) this.tag(g, c.name, sx, box.y - 3, U.clamp(box.w / 7, 10, 18));
        }
      }
    }
    if (view.showOwn !== false) {
      const img = viewer.frames[viewer.lean + ',' + (viewer.braking ? 1 : 0)];
      const sk = HR.CAMDEPTH / HR.PLAYERZ * k;
      const dw = HR.CAR_W * sk, dh = dw * img.height / img.width;
      let bounce = 0;
      if (viewer.speed > 100) {
        bounce = Math.sin(race.time * 40) * vh * 0.002;
        if (viewer.offroad) bounce = (Math.random() * 2 - 1) * vh * 0.008;
      }
      const yRoad = hy + sk * HR.CAMH;
      g.drawImage(img, half - dw / 2, yRoad - dh + bounce, dw, dh);
      if (R && R.decorate) R.decorate(g, race, viewer, { x: half - dw / 2, y: yRoad - dh + bounce, w: dw, h: dh, own: true });
      // Staub neben der Straße
      if (viewer.offroad && viewer.speed > 800) {
        const a = Math.min(0.5, viewer.speed / HR.MAXSPEED);
        for (let q = 0; q < 8; q++) {
          const side = q % 2 ? 1 : -1, t = Math.random();
          g.fillStyle = `rgba(190,170,130,${a * (1 - t)})`;
          g.beginPath(); g.arc(half + side * dw * (0.36 + t * 0.25), yRoad - dh * 0.1 - t * dh * 0.5, dw * (0.05 + t * 0.12), 0, 7); g.fill();
        }
      }
    }
    if (!race.demo) this.hud(g, game, view, viewer, vw, vh);
    const own = race.cars[view.car];
    if (!race.demo && own.out && viewer !== own && race.state === 'racing') {
      const sc = U.clamp(Math.min(vw / 1000, vh / 640), 0.62, 1.3), more = race.cars.filter(c => !c.out && !c.gone).length > 1;
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(vw / 2 - 230 * sc, vh * 0.25 - 4 * sc, 460 * sc, 58 * sc);
      this.text(g, 'AUSGESCHIEDEN', vw / 2, vh * 0.25, 22 * sc, 'rgb(255,110,100)', 'center');
      this.text(g, 'Du schaust ' + viewer.name + ' zu' + (more ? '  ·  ◀ ▶ wechseln' : ''), vw / 2, vh * 0.25 + 27 * sc, 18 * sc, '#fff', 'center');
    }
    if (R && R.flash > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.7, R.flash)})`; g.fillRect(0, 0, vw, vh); }
    g.restore();
  },

  tag(g, name, x, y, size) {
    g.font = `bold ${size}px ${HR.FONT}`;
    const tw = g.measureText(name).width + 10;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - tw / 2, y - size - 5, tw, size + 6);
    g.fillStyle = 'rgb(255,210,40)'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(name, x, y - 3);
  },

  // Text mit schwarzem Schatten wie im Original
  text(g, s, x, y, size, color, align = 'left', base = 'top', italic = false) {
    g.font = `${italic ? 'italic ' : ''}bold ${Math.round(size)}px ${HR.FONT}`;
    g.textAlign = align; g.textBaseline = base;
    const o = Math.max(1, Math.floor(size / 16));
    g.fillStyle = '#000'; g.fillText(s, x + o, y + o);
    g.fillStyle = color; g.fillText(s, x, y);
  },

  hud(g, game, view, p, vw, vh) {
    const race = game.race;
    const sc = Math.min(vh / 540, vw / 700);
    const big = 48 * sc, mid = 26 * sc, small = 18 * sc;
    const pad = 14 * sc + 4;
    const Y = 'rgb(255,210,40)', Wt = '#fff';
    const touch = HR.Input.touchMode;
    const R = race.rules, noLaps = R && R.noLaps;
    // oben links
    let y = pad;
    if (race.mode !== 'trial' && !noLaps) {
      this.text(g, 'POSITION', pad, y, small, Y); y += small * 1.1;
      this.text(g, `${p.place}/${race.cars.length}`, pad, y, big, Wt); y += big * 1.05;
    }
    if (!noLaps) {
      this.text(g, 'RUNDE', pad, y, small, Y); y += small * 1.1;
      const lap = Math.min(race.laps, Math.max(1, p.lapsDone + 1));
      this.text(g, `${lap}/${race.laps}`, pad, y, mid, Wt);
    }
    // oben rechts
    const rx = vw - pad; y = pad;
    if (noLaps) { /* Zeiten zeigt das Partyspiel selbst */ } else {
    this.text(g, 'ZEIT', rx, y, small, Y, 'right'); y += small * 1.1;
    this.text(g, U.fmtTime(p.finished ? p.finishTime : race.time), rx, y, mid, Wt, 'right'); y += mid * 1.15 + 4;
    const cur = p.finished || race.state === 'countdown' ? null : race.time - p.lapStart;
    this.text(g, `RUNDE  ${U.fmtTime(p.lapsDone >= 0 ? cur : (race.state === 'countdown' ? null : race.time))}`, rx, y, small, Wt, 'right'); y += small * 1.2;
    this.text(g, `BESTE   ${U.fmtTime(p.bestLap)}`, rx, y, small, Wt, 'right'); y += small * 1.2;
    if (!race.party) this.text(g, `REKORD  ${U.fmtTime(game.records.lap[race.track.cfg.name])}`, rx, y, small, 'rgb(200,200,200)', 'right');
    }

    // Tacho, Gang, Drehzahl (Touch: in der Mitte unten, zwischen den Tasten)
    const kmh = Math.round(p.speed * HR.KMH);
    const barW = 200 * sc, segW = barW / 20, barH = Math.max(4, 10 * sc);
    const sx = touch ? vw / 2 + barW / 2 : rx;
    const by = vh - pad;
    this.drawRev(g, sx - barW, by - barH, barW, barH, segW, p.rpm);
    this.text(g, 'km/h', sx, by - barH - 6, small, Y, 'right', 'bottom');
    this.text(g, String(kmh).padStart(3, ' '), sx - 60 * sc, by - barH - 2, big, Wt, 'right', 'bottom');
    this.text(g, 'G' + p.gear, sx - barW, by - barH - big - 4, mid, Y, 'left', 'bottom');

    // Streckenfortschritt (nicht im Zeitfahren)
    if (race.mode !== 'trial') {
      const pw = 220 * sc;
      const px = touch ? vw / 2 - pw / 2 : pad, py = touch ? pad + small * (view.label ? 3.2 : 2) + 12 * sc : vh - pad - 6 * sc;
      {
        this.text(g, 'STRECKE', px, py - 10 * sc, small, Y, 'left', 'bottom');
        g.fillStyle = '#000'; g.fillRect(px, py - 3 * sc, pw, 6 * sc);
        const L = race.track.length;
        for (const c of race.cars) {
          if (c === p || c.out) continue;
          g.fillStyle = U.rgb(c.color); g.beginPath(); g.arc(px + race.mod(c.dist) / L * pw, py, 5 * sc, 0, 7); g.fill();
        }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(px + race.mod(p.dist) / L * pw, py, 7 * sc, 0, 7); g.fill();
      }
    }

    // Meldungen
    if (race.state === 'countdown') {
      const c = Math.ceil(race.count);
      if (c > 0) this.text(g, String(c), vw / 2, vh * 0.3, 120 * sc, Y, 'center', 'middle');
    } else if (race.goT > 0) this.text(g, 'LOS!', vw / 2, vh * 0.3, 120 * sc, 'rgb(80,255,100)', 'center', 'middle');
    if (p.msgT > 0) {
      this.text(g, p.msg, vw / 2, vh * 0.2, 56 * sc, Y, 'center', 'middle');
      if (p.msg2) this.text(g, p.msg2, vw / 2, vh * 0.2 + 50 * sc, mid, Wt, 'center', 'middle');
    }
    if (view.label) this.text(g, view.label, vw / 2, pad, small, Y, 'center');
    if (R && R.hud) R.hud(g, race, p, vw, vh, sc, this);
    if (race.state === 'done' && race.doneT > 0.8 && view.first && !game.online && !game.party) {
      this.text(g, touch ? 'Tippe: Ergebnis' : 'Enter: Ergebnis', vw / 2, vh * 0.42, mid, Wt, 'center', 'middle');
    }
  },

  drawRev(g, x, y, w, h, segW, rpm) {
    for (let i = 0; i < 20; i++) {
      const f = i / 20;
      let c = 'rgb(50,50,55)';
      if (f < rpm) c = f >= 0.8 ? 'rgb(230,40,40)' : f >= 0.55 ? 'rgb(255,210,40)' : 'rgb(60,220,90)';
      g.fillStyle = c; g.fillRect(x + i * segW, y, segW - 2, h);
    }
  },

  touch(g) {
    if (!HR.Input.touchMode) return;
    for (const b of HR.Input.buttons) {
      if (b.action === 'dpad') { this.dpad(g, b); continue; }
      const on = HR.Input.pressed(b);
      g.fillStyle = on ? 'rgba(255,210,40,.55)' : 'rgba(10,12,30,.35)';
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${Math.round(b.label.length > 2 ? b.r * 0.36 : b.r * 0.6)}px ${HR.FONT}`;
      g.fillText(b.label, b.x, b.y + 1);
    }
  },

  // Steuerkreuz: vier Arme, gedrückte Richtungen leuchten
  dpad(g, b) {
    const on = HR.Input.dpadDirs(b), w = b.r * 0.62, L = b.r * 0.98;
    g.save(); g.translate(b.x, b.y);
    g.fillStyle = 'rgba(10,12,30,.28)'; g.beginPath(); g.arc(0, 0, b.r * 1.05, 0, 7); g.fill();
    const arms = [['gas', 0, -1], ['brake', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of arms) {
      const x = dx ? (dx > 0 ? w / 2 : -L) : -w / 2, y = dy ? (dy > 0 ? w / 2 : -L) : -w / 2;
      const ww = dx ? L - w / 2 : w, hh = dy ? L - w / 2 : w;
      g.fillStyle = on.has(a) ? 'rgba(255,210,40,.75)' : 'rgba(30,32,55,.6)';
      g.beginPath(); g.roundRect(x, y, ww, hh, w * 0.25); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.stroke();
      // Pfeil
      const ax = dx * (L * 0.68), ay = dy * (L * 0.68), s = w * 0.24;
      g.fillStyle = '#fff'; g.beginPath();
      g.moveTo(ax + dx * s, ay + dy * s); g.lineTo(ax - dx * s * 0.6 - dy * s, ay - dy * s * 0.6 - dx * s); g.lineTo(ax - dx * s * 0.6 + dy * s, ay - dy * s * 0.6 + dx * s);
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(30,32,55,.6)'; g.fillRect(-w / 2, -w / 2, w, w);
    g.restore();
  },
};
