// Horizon Rush – Party-Fahrspiele auf den Pseudo-3D-Strecken:
// A1 Ausscheidungsrennen, A2 Polizeijagd, A3 Heiße Bombe, A5 Turbo-Rennen mit Extras
// Jedes Gerät fährt sein eigenes Auto (wie im Online-Rennen). Der Gastgeber entscheidet über
// Ausscheiden, Polizei, Bombe und Ölflecken und schickt das 20-mal pro Sekunde an alle.
'use strict';

HR.PartyRace = class {
  constructor(def, ctx) {
    this.def = def; this.ctx = ctx; this.host = ctx.host;
    this.rules = def.rules(ctx, this);
    this.sendT = 0; this.endT = 0; this.ended = false;
  }

  start() {
    const ctx = this.ctx, rnd = U.rng(ctx.seed);
    // zufällige Startaufstellung, für alle gleich
    const order = ctx.players.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const entrants = order.map(p => ({
      id: 'h' + p.id, pidx: p.id, name: p.name, car: p.car, color: HR.PARTY_COLORS[p.color], human: true,
      pid: p.id === ctx.me ? 0 : null, remote: p.id !== ctx.me,
    }));
    HR.Input.actKeys = !!this.rules.extraButton;
    Game.beginRace({ mode: 'party', party: true, online: true, track: ctx.setup.track, laps: this.rules.laps || 999, entrants, rules: this.rules }, 1);
    this.race = Game.race;
    this.race.netClient = !this.host;
    if (this.rules.init) this.rules.init(this.race, rnd);
  }

  carOf(id) { return this.race && this.race.cars.find(c => c.id === 'h' + id); }
  meCar() { return this.race && this.race.players[0]; }

  // nach jedem Physikschritt
  tick(dt) {
    const race = this.race; if (!race || this.ended) return;
    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 0.05;
      const pack = c => [c.id, Math.round(c.dist), +c.x.toFixed(3), Math.round(c.speed), c.lean, c.braking ? 1 : 0,
        c.finished ? +c.finishTime.toFixed(3) : null, c.bestLap != null ? +c.bestLap.toFixed(3) : null];
      if (this.host) HR.Net.broadcast({ t: 'snap', c: race.cars.filter(c => !c.out).map(pack), pr: this.rules.pack(race), st: race.state });
      else { const me = this.meCar(); if (me && !me.out) HR.Net.send({ t: 'st', c: pack(me) }); }
    }
    if (this.host && race.state === 'done') {
      this.endT += dt;
      if (this.endT > 3) { this.ended = true; this.onEnd(this.rules.ranking(race)); }
    }
  }

  msg(m, from) {
    const race = this.race; if (!race) return;
    if (this.host) {
      if (m.t === 'st') Game.applyPack(m.c);
      else if (m.t === 'ev' && this.rules.event) this.rules.event(race, m, from);
    } else {
      if (m.t === 'snap') {
        for (const c of m.c) Game.applyPack(c);
        this.rules.unpack(race, m.pr);
        if (m.st === 'done' && race.state !== 'done') race.state = 'done';
      }
    }
  }

  // Ereignis an den Gastgeber (oder direkt verarbeiten, wenn man selbst Gastgeber ist)
  event(m) {
    if (this.host) this.rules.event(this.race, m, this.ctx.me);
    else HR.Net.send(Object.assign({ t: 'ev' }, m));
  }

  drop(id) {
    const c = this.carOf(id);
    if (c) { c.out = true; c.gone = true; c.remote = false; this.race.humans = this.race.humans.filter(h => h !== c); }
    if (this.rules.drop) this.rules.drop(this.race, c);
  }

  stop() { this.race = null; Game.race = null; }
};

// ---------- gemeinsame Helfer ----------
const PR = HR.PR = {
  alive: race => race.cars.filter(c => !c.out),
  leader: race => race.order.find(c => !c.out),
  near(race, a, b) {
    const L = race.track.length;
    let dz = race.mod(b.dist - a.dist); dz = Math.min(dz, L - dz);
    return dz < HR.CAR_LEN * 1.3 && Math.abs(a.x - b.x) < 0.42;
  },
  gap(race, a, b) { // b vor a (positiv) oder hinter a (negativ), kürzester Weg auf der Runde
    const L = race.track.length;
    let d = race.mod(b.dist - a.dist); if (d > L / 2) d -= L;
    return d;
  },
  meters: u => Math.round(Math.abs(u) * 330 / 3.6 / HR.MAXSPEED * 10),
  // Ausscheiden: Reihenfolge und Rangliste
  knockOut(race, c, rules) {
    if (!c || c.out) return;
    c.out = true; c.outT = race.time;
    rules.outs.push(c.id);
    rules.flash = c.pid != null ? 0.8 : 0;
    if (c.pid != null) { HR.Audio.play('crash'); HR.Audio.silence(); }
  },
  applyOuts(race, rules, outs) {
    for (const id of outs || []) {
      if (rules.outs.includes(id)) continue;
      const c = race.cars.find(x => x.id === id);
      if (c) PR.knockOut(race, c, rules);
    }
  },
  survivalRanking(race, rules) {
    const rows = [];
    const alive = race.order.filter(c => !c.out && !c.gone);
    alive.forEach((c, i) => rows.push({ id: c.pidx, s: 1000 - i, txt: alive.length === 1 ? 'Sieger' : 'noch dabei' }));
    const outs = rules.outs.slice().reverse();
    outs.forEach((id, i) => { const c = race.cars.find(x => x.id === id); if (c && !c.gone) rows.push({ id: c.pidx, s: 500 - i, txt: 'raus nach ' + U.fmtTime(c.outT) }); });
    return rows;
  },
  spectate: race => PR.leader(race),
  endHud(g, R, race, p, vw, vh, sc) {
    const alive = PR.alive(race);
    const won = !p.out && alive.length === 1;
    R.text(g, won ? 'GEWONNEN!' : 'ENDE', vw / 2, vh * 0.4, 64 * sc, won ? 'rgb(80,255,100)' : 'rgb(255,210,40)', 'center', 'middle');
    if (!won && alive.length === 1) R.text(g, alive[0].name + ' gewinnt', vw / 2, vh * 0.4 + 50 * sc, 22 * sc, '#fff', 'center', 'middle');
  },
  banner(g, R, race, txt, sub, color, vw, vh, sc) {
    R.text(g, txt, vw / 2, vh * 0.13, 30 * sc, color || 'rgb(255,210,40)', 'center', 'middle');
    if (sub) R.text(g, sub, vw / 2, vh * 0.13 + 30 * sc, 18 * sc, '#fff', 'center', 'middle');
  },
  outHud(g, R, race, p, vw, vh, sc) {
    const lead = PR.leader(race);
    R.text(g, 'AUSGESCHIEDEN', vw / 2, vh * 0.42, 44 * sc, 'rgb(255,110,100)', 'center', 'middle');
    if (lead) R.text(g, 'Du schaust ' + lead.name + ' zu', vw / 2, vh * 0.42 + 40 * sc, 20 * sc, '#fff', 'center', 'middle');
  },
  // kleines Blaulicht über einem Auto
  siren(g, box, t) {
    const w = box.w * 0.34, h = Math.max(3, box.w * 0.07), x = box.x + box.w / 2 - w / 2, y = box.y - h * 0.4;
    const on = Math.floor(t * 8) % 2;
    g.fillStyle = on ? 'rgb(40,90,255)' : 'rgb(20,30,90)'; g.fillRect(x, y, w / 2, h);
    g.fillStyle = on ? 'rgb(90,10,10)' : 'rgb(255,40,40)'; g.fillRect(x + w / 2, y, w / 2, h);
    if (box.w > 30) { g.fillStyle = on ? 'rgba(60,110,255,.3)' : 'rgba(255,60,60,.3)'; g.beginPath(); g.arc(box.x + (on ? w * 0.25 : w * 0.75) + box.w / 2 - w / 2, y + h / 2, w * 0.45, 0, 7); g.fill(); }
  },
  bomb(g, box, t) {
    const r = Math.max(4, box.w * 0.13), cx = box.x + box.w / 2, cy = box.y - r * 1.2;
    g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#a07040'; g.lineWidth = Math.max(1, r * 0.18); g.beginPath(); g.moveTo(cx + r * 0.5, cy - r * 0.8); g.quadraticCurveTo(cx + r, cy - r * 1.6, cx + r * 1.3, cy - r * 1.5); g.stroke();
    g.fillStyle = Math.floor(t * 12) % 2 ? 'rgb(255,230,80)' : 'rgb(255,120,20)';
    g.beginPath(); g.arc(cx + r * 1.3, cy - r * 1.5, r * 0.35, 0, 7); g.fill();
  },
};

const raceDef = (def) => Object.assign({ kind: 'race', setup: (players, seed) => ({ track: U.rng(seed + 7).randint(0, HR.TRACKS.length - 1) }), create: ctx => new HR.PartyRace(def, ctx) }, def);
const KEYS_DRIVE = '← → lenken, ↑ Gas, ↓ Bremse (oder WASD)';
const TOUCH_DRIVE = 'links ◀ ▶ lenken, rechts GAS und BREMSE';

// ======================================================================
// A1 Ausscheidungsrennen
// ======================================================================
HR.addGame(raceDef({
  code: 'A1', name: 'Ausscheidungsrennen', short: 'Bloß nicht Letzter sein!',
  desc: 'Alle fahren auf derselben Strecke. In regelmäßigen Abständen scheidet das letzte Auto aus und schaut ab dann beim Führenden zu.',
  goal: 'Nicht Letzter sein, wenn die Uhr abläuft. Wer am Ende als Einziger übrig ist, gewinnt.',
  touch: TOUCH_DRIVE, keys: KEYS_DRIVE,
  rules(ctx, ctl) {
    const n = ctx.players.length;
    return {
      noLaps: true, outs: [], flash: 0, period: n <= 3 ? 25 : 30, left: n <= 3 ? 25 : 30,
      speedMul: () => 1,
      update(race, dt) {
        if (this.flash > 0) this.flash -= dt;
        if (race.state !== 'racing') return;
        const alive = PR.alive(race);
        if (!ctl.host) { this.left = Math.max(0, this.left - dt); return; }
        this.left -= dt;
        if (this.left <= 0) {
          const last = race.order.filter(c => !c.out).pop();
          PR.knockOut(race, last, this);
          this.left = this.period;
        }
        const need = n > 1 ? 1 : 0;
        if (PR.alive(race).length <= need || alive.length === 0) race.state = 'done';
      },
      pack() { return { o: this.outs, l: +this.left.toFixed(2) }; },
      unpack(race, d) { PR.applyOuts(race, this, d.o); this.left = d.l; },
      spectate: PR.spectate,
      hud(g, race, p, vw, vh, sc, R) {
        if (race.state === 'done') { PR.endHud(g, R, race, p, vw, vh, sc); return; }
        if (p.out) { PR.outHud(g, R, race, p, vw, vh, sc); return; }
        const alive = race.order.filter(c => !c.out), pos = alive.indexOf(p) + 1;
        R.text(g, 'POSITION', 14 * sc + 4, 14 * sc + 4, 18 * sc, 'rgb(255,210,40)');
        R.text(g, `${pos}/${alive.length}`, 14 * sc + 4, 14 * sc + 4 + 20 * sc, 48 * sc, '#fff');
        if (race.state !== 'racing') return;
        const warn = pos === alive.length && alive.length > 1;
        const col = warn ? (Math.floor(race.time * 4) % 2 ? 'rgb(255,80,70)' : '#fff') : 'rgb(255,210,40)';
        PR.banner(g, R, race, 'AUSSCHEIDEN IN ' + Math.ceil(this.left), warn ? 'DU BIST LETZTER – GIB GAS!' : `Noch ${alive.length} im Rennen`, col, vw, vh, sc);
      },
      ranking(race) { return PR.survivalRanking(race, this); },
    };
  },
}));

// ======================================================================
// A2 Polizeijagd
// ======================================================================
HR.addGame(raceDef({
  code: 'A2', name: 'Polizeijagd', short: 'Wer gerammt wird, ist Polizei.',
  desc: 'Ein Auto ist der Streifenwagen mit Blaulicht. Wen die Polizei anrempelt, der ist ab sofort selbst die Polizei. Der neue Streifenwagen muss kurz warten, damit die anderen fliehen können.',
  goal: 'So wenig Zeit wie möglich als Polizei verbringen. Abgerechnet wird nach 100 Sekunden.',
  touch: TOUCH_DRIVE, keys: KEYS_DRIVE,
  rules(ctx, ctl) {
    return {
      noLaps: true, cop: null, cd: 0, left: 100, pt: {}, flash: 0,
      init(race, rnd) { this.cop = race.cars[Math.floor(rnd.random() * race.cars.length)].id; this.cd = 0; this.notice(race, null); },
      speedMul(race, c) { return c.id !== this.cop ? 1 : this.cd > 0 ? 0.45 : 1.12; },
      notice(race, prev) {
        const me = race.players[0]; if (!me) return;
        if (this.cop === me.id) { race.say(me, 'DU BIST DIE POLIZEI!', 'Ramm ein anderes Auto', 2.5); HR.Audio.play('beep'); }
        else if (prev === me.id) { race.say(me, 'ERWISCHT!', 'Jetzt schnell weg hier', 2); HR.Audio.play('lap'); }
        else if (prev != null) { const c = race.cars.find(x => x.id === this.cop); if (c) race.say(me, c.name + ' ist jetzt Polizei', '', 1.6); }
      },
      update(race, dt) {
        if (this.flash > 0) this.flash -= dt;
        if (race.state !== 'racing') return;
        this.left = Math.max(0, this.left - dt);
        if (this.cd > 0) this.cd -= dt;
        if (!ctl.host) return;
        this.pt[this.cop] = (this.pt[this.cop] || 0) + dt;
        const cop = race.cars.find(c => c.id === this.cop);
        if (!cop || cop.out) { const a = PR.alive(race); if (a.length) { this.cop = U.choice(a).id; this.cd = 2; } }
        else if (this.cd <= 0) {
          for (const c of race.cars) {
            if (c === cop || c.out || !PR.near(race, cop, c)) continue;
            const prev = this.cop; this.cop = c.id; this.cd = 2.2;
            HR.Audio.play('bump'); this.notice(race, prev);
            break;
          }
        }
        if (this.left <= 0) race.state = 'done';
      },
      pack() { const pt = {}; for (const k in this.pt) pt[k] = +this.pt[k].toFixed(2); return { c: this.cop, cd: +this.cd.toFixed(2), l: +this.left.toFixed(2), pt }; },
      unpack(race, d) {
        const prev = this.cop;
        this.cop = d.c; this.cd = d.cd; this.left = d.l; this.pt = d.pt;
        if (prev !== this.cop) this.notice(race, prev);
      },
      decorate(g, race, c, box) { if (c.id === this.cop) PR.siren(g, box, race.time); },
      hud(g, race, p, vw, vh, sc, R) {
        const Y = 'rgb(255,210,40)', pad = 14 * sc + 4;
        R.text(g, 'POLIZEI-ZEIT', pad, pad, 18 * sc, Y);
        R.text(g, U.fmtTime(this.pt[p.id] || 0), pad, pad + 20 * sc, 34 * sc, '#fff');
        R.text(g, 'NOCH', vw - pad, pad, 18 * sc, Y, 'right');
        R.text(g, U.fmtTime(this.left), vw - pad, pad + 20 * sc, 34 * sc, '#fff', 'right');
        if (race.state === 'done') { R.text(g, 'ZEIT UM!', vw / 2, vh * 0.4, 60 * sc, Y, 'center', 'middle'); return; }
        const cop = race.cars.find(c => c.id === this.cop); if (!cop || race.state === 'countdown') return;
        if (cop === p) {
          let best = null;
          for (const c of race.cars) if (c !== p && !c.out) { const d = PR.gap(race, p, c); if (!best || Math.abs(d) < Math.abs(best.d)) best = { c, d }; }
          PR.banner(g, R, race, this.cd > 0 ? 'POLIZEI – KURZ WARTEN …' : 'DU BIST DIE POLIZEI',
            best ? `${best.c.name}: ${PR.meters(best.d)} m ${best.d >= 0 ? 'vor' : 'hinter'} dir` : '', Math.floor(race.time * 6) % 2 ? 'rgb(90,140,255)' : 'rgb(255,80,70)', vw, vh, sc);
        } else {
          const d = PR.gap(race, p, cop);
          PR.banner(g, R, race, 'POLIZEI: ' + cop.name, `${PR.meters(d)} m ${d >= 0 ? 'vor' : 'hinter'} dir`, Math.abs(d) < 3000 ? 'rgb(255,110,100)' : Y, vw, vh, sc);
        }
      },
      ranking(race) {
        return race.cars.filter(c => !c.gone).map(c => ({ id: c.pidx, s: -Math.round((this.pt[c.id] || 0) * 100), txt: 'Polizei: ' + U.fmtTime(this.pt[c.id] || 0) })).sort((a, b) => b.s - a.s);
      },
    };
  },
}));

// ======================================================================
// A3 Heiße Bombe
// ======================================================================
HR.addGame(raceDef({
  code: 'A3', name: 'Heiße Bombe', short: 'Gib die Bombe weiter!',
  desc: 'Ein Auto trägt eine tickende Bombe. Durch Anrempeln gibst du sie weiter. Niemand weiß genau, wann sie hochgeht, aber das Ticken wird schneller. Mit der Bombe fährst du etwas schneller.',
  goal: 'Die Bombe loswerden, bevor sie explodiert. Wer sie dann trägt, scheidet aus. Der Letzte im Rennen gewinnt.',
  touch: TOUCH_DRIVE, keys: KEYS_DRIVE,
  rules(ctx, ctl) {
    const n = ctx.players.length;
    return {
      noLaps: true, outs: [], bomb: null, fuse: 20, cd: 0, pause: 0, flash: 0, tickT: 0,
      init(race, rnd) { this.bomb = race.cars[Math.floor(rnd.random() * race.cars.length)].id; this.fuse = 16 + rnd.random() * 10; this.notice(race, null); },
      speedMul(race, c) { return c.id === this.bomb ? 1.1 : 1; },
      notice(race, prev) {
        const me = race.players[0]; if (!me || me.out) return;
        if (this.bomb === me.id) { race.say(me, 'DU HAST DIE BOMBE!', 'Ramm jemanden, schnell!', 2); HR.Audio.play('beep'); }
        else if (prev === me.id) { race.say(me, 'BOMBE WEITERGEGEBEN!', '', 1.5); HR.Audio.play('lap'); }
      },
      update(race, dt) {
        if (this.flash > 0) this.flash -= dt;
        if (race.state !== 'racing') return;
        if (this.cd > 0) this.cd -= dt;
        if (this.bomb) {
          this.fuse -= dt;
          this.tickT -= dt;
          if (this.tickT <= 0) { this.tickT = U.clamp(this.fuse / 10, 0.1, 0.9); const me = race.players[0]; if (me && me.id === this.bomb) HR.Audio.play('blip'); }
        }
        if (!ctl.host) return;
        if (!this.bomb) {
          this.pause -= dt;
          const a = PR.alive(race);
          if (this.pause <= 0 && a.length > (n > 1 ? 1 : 0)) { this.bomb = U.choice(a).id; this.fuse = 12 + Math.random() * 12; this.cd = 1; this.notice(race, null); }
        } else {
          const b = race.cars.find(c => c.id === this.bomb);
          if (!b || b.out) { this.bomb = null; this.pause = 1; }
          else if (this.fuse <= 0) { PR.knockOut(race, b, this); this.bang(race, b); this.bomb = null; this.pause = 2.5; }
          else if (this.cd <= 0) {
            for (const c of race.cars) {
              if (c === b || c.out || !PR.near(race, b, c)) continue;
              const prev = this.bomb; this.bomb = c.id; this.cd = 1.5; HR.Audio.play('bump'); this.notice(race, prev); break;
            }
          }
        }
        if (PR.alive(race).length <= (n > 1 ? 1 : 0)) race.state = 'done';
      },
      bang(race, b) {
        HR.Audio.play('crash');
        const me = race.players[0];
        if (me && me !== b && !me.out) race.say(me, 'BUMM!', b.name + ' ist raus', 2);
      },
      pack() { return { o: this.outs, b: this.bomb, f: +this.fuse.toFixed(2), cd: +this.cd.toFixed(2) }; },
      unpack(race, d) {
        const before = this.outs.length;
        PR.applyOuts(race, this, d.o);
        if (this.outs.length > before) { const c = race.cars.find(x => x.id === this.outs[this.outs.length - 1]); if (c) this.bang(race, c); }
        const prev = this.bomb;
        this.bomb = d.b; this.fuse = d.f; this.cd = d.cd;
        if (prev !== this.bomb && this.bomb) this.notice(race, prev);
      },
      spectate: PR.spectate,
      decorate(g, race, c, box) { if (c.id === this.bomb) PR.bomb(g, box, race.time); },
      hud(g, race, p, vw, vh, sc, R) {
        if (race.state === 'done') { PR.endHud(g, R, race, p, vw, vh, sc); return; }
        if (p.out) { PR.outHud(g, R, race, p, vw, vh, sc); return; }
        const alive = PR.alive(race).length, Y = 'rgb(255,210,40)';
        R.text(g, 'IM RENNEN', 14 * sc + 4, 14 * sc + 4, 18 * sc, Y);
        R.text(g, String(alive), 14 * sc + 4, 14 * sc + 4 + 20 * sc, 48 * sc, '#fff');
        if (race.state !== 'racing') return;
        const b = race.cars.find(c => c.id === this.bomb);
        if (!b) { PR.banner(g, R, race, 'NEUE BOMBE KOMMT …', '', Y, vw, vh, sc); return; }
        if (b === p) PR.banner(g, R, race, 'DU HAST DIE BOMBE!', this.fuse < 5 ? 'GLEICH KNALLT ES!' : 'Ramm ein anderes Auto', Math.floor(race.time * (this.fuse < 5 ? 10 : 4)) % 2 ? 'rgb(255,80,70)' : '#fff', vw, vh, sc);
        else { const d = PR.gap(race, p, b); PR.banner(g, R, race, 'BOMBE: ' + b.name, `${PR.meters(d)} m ${d >= 0 ? 'vor' : 'hinter'} dir`, Y, vw, vh, sc); }
      },
      ranking(race) { return PR.survivalRanking(race, this); },
    };
  },
}));

// ======================================================================
// A5 Turbo-Rennen mit Extras
// ======================================================================
HR.ITEMS = {
  turbo: { name: 'TURBO', color: 'rgb(255,140,30)' },
  oil: { name: 'ÖLFLECK', color: 'rgb(170,170,190)' },
  shield: { name: 'SCHILD', color: 'rgb(80,200,255)' },
  magnet: { name: 'MAGNET', color: 'rgb(255,80,120)' },
  blitz: { name: 'BLITZ', color: 'rgb(255,230,60)' },
};

HR.partySprites = function () {
  if (HR._pspr) return HR._pspr;
  const box = U.canvas(128, 128), g = box.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 128, 128);
  grd.addColorStop(0, 'rgb(255,90,200)'); grd.addColorStop(0.5, 'rgb(90,160,255)'); grd.addColorStop(1, 'rgb(90,255,160)');
  g.fillStyle = grd; g.fillRect(8, 8, 112, 112);
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8, 8, 112, 112);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(14, 14, 100, 34);
  g.fillStyle = '#fff'; g.font = 'bold 84px ' + HR.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 6; g.strokeText('?', 64, 70); g.fillText('?', 64, 70);
  const oil = U.canvas(256, 48), o = oil.getContext('2d');
  o.fillStyle = 'rgb(15,12,20)'; o.beginPath(); o.ellipse(128, 26, 124, 20, 0, 0, 7); o.fill();
  o.fillStyle = 'rgba(120,90,200,.45)'; o.beginPath(); o.ellipse(100, 20, 50, 6, 0, 0, 7); o.fill();
  o.fillStyle = 'rgba(90,200,200,.35)'; o.beginPath(); o.ellipse(160, 28, 34, 5, 0, 0, 7); o.fill();
  return (HR._pspr = { box, oil });
};

HR.addGame(raceDef({
  code: 'A5', name: 'Turbo-Rennen mit Extras', short: 'Rennen mit Extra-Boxen.',
  desc: 'Ein Rennen über 2 Runden mit Extra-Boxen auf der Strecke. Fahr durch eine Box, um ein Extra zu bekommen: Turbo, Ölfleck (hinter dir ablegen), Schild (schützt vor Öl und Blitz), Magnet (zieht dich nach vorn) oder Blitz (bremst alle vor dir). Weiter hinten gibt es stärkere Extras.',
  goal: 'Als Erster ins Ziel kommen.',
  touch: TOUCH_DRIVE + ', EXTRA einsetzen', keys: KEYS_DRIVE + ', Leertaste Extra einsetzen',
  rules(ctx, ctl) {
    const spr = HR.partySprites();
    return {
      laps: 2, extraButton: 'EXTRA', flash: 0,
      item: null, boxCd: {}, boostT: 0, magnetT: 0, slowT: 0, shieldT: 0, actPrev: false,
      oils: [], hitOils: new Set(), evSeq: 0, events: [], seenEv: 0, oilSeq: 1,
      init(race) {
        // Extra-Boxen: alle 110 Segmente drei Stück nebeneinander
        this.boxes = new Map();
        const n = race.track.n;
        for (let s = 50; s < n - 30; s += 110) this.boxes.set(s, [-0.55, 0, 0.55]);
      },
      speedMul(race, c) {
        if (c.pid == null) return 1;
        let m = 1;
        if (this.boostT > 0) m = 1.35;
        else if (this.magnetT > 0) m = 1.22;
        if (this.slowT > 0) m *= 0.55;
        return m;
      },
      update(race, dt, inputs) {
        if (this.flash > 0) this.flash -= dt;
        const me = race.players[0];
        for (const k of ['boostT', 'magnetT', 'slowT', 'shieldT']) if (this[k] > 0) this[k] -= dt;
        if (ctl.host) { const t = race.time; this.events = this.events.filter(e => t - e.at < 3); }
        if (!me || race.state !== 'racing' || me.finished) return;
        // Extra-Box einsammeln
        const n = race.track.n, si = Math.floor(race.mod(me.dist) / HR.SEG) % n;
        for (const d of [0, -1]) {
          const s = (si + d + n) % n, xs = this.boxes.get(s);
          if (!xs) continue;
          xs.forEach((bx, j) => {
            const key = s + ':' + j;
            if (Math.abs(me.x - bx) < 0.32 && !(this.boxCd[key] > race.time)) {
              this.boxCd[key] = race.time + 4;
              if (!this.item) { this.item = this.roll(race, me); HR.Audio.play('select'); race.say(me, HR.ITEMS[this.item].name, 'Einsetzen mit ' + (HR.Input.touchMode ? 'EXTRA' : 'Leertaste'), 1.4); }
            }
          });
        }
        // Ölflecken
        for (const o of this.oils) {
          if (this.hitOils.has(o[0])) continue;
          const os = o[1];
          if ((si === os || si === (os + 1) % n) && Math.abs(me.x - o[2]) < 0.34) {
            this.hitOils.add(o[0]);
            ctl.event({ k: 'oilhit', id: o[0] });
            this.hit(race, me, 'oil');
          }
        }
        // Extra einsetzen
        const act = !!(inputs[0] && inputs[0].act);
        if (act && !this.actPrev && this.item) this.use(race, me);
        this.actPrev = act;
        // Magnet: zieht zum nächsten Auto vor dir
        if (this.magnetT > 0) {
          let best = null;
          for (const c of race.cars) if (c !== me && !c.out) { const d = PR.gap(race, me, c); if (d > 0 && (!best || d < best)) best = d; }
          if (best != null && best < HR.CAR_LEN * 2) this.magnetT = 0;
        }
      },
      roll(race, me) {
        const n = race.cars.filter(c => !c.out).length;
        const f = n > 1 ? (me.place - 1) / (n - 1) : 0.5;
        const w = { oil: 40 - 30 * f, shield: 30 - 20 * f, turbo: 20 + 15 * f, magnet: 10 + 20 * f, blitz: f > 0.3 ? 35 * f : 0 };
        return U.rng(Math.floor(Math.random() * 1e9)).choices(Object.keys(w), Object.values(w));
      },
      use(race, me) {
        const it = this.item; this.item = null;
        if (it === 'turbo') { this.boostT = 2.2; me.speed = Math.max(me.speed, me.maxSpeed * 0.9); HR.Audio.play('go'); }
        if (it === 'shield') { this.shieldT = 10; HR.Audio.play('lap'); }
        if (it === 'magnet') { this.magnetT = 3; HR.Audio.play('go'); }
        if (it === 'oil') { ctl.event({ k: 'oil', d: Math.round(me.dist - HR.SEG * 3), x: +me.x.toFixed(2) }); HR.Audio.play('blip'); }
        if (it === 'blitz') { ctl.event({ k: 'blitz', d: Math.round(me.dist) }); }
      },
      hit(race, me, kind) {
        if (this.shieldT > 0) { this.shieldT = 0; race.say(me, 'SCHILD HAT GEHALTEN', '', 1.2); HR.Audio.play('bump'); return; }
        if (kind === 'oil') { me.spinT = 1.1; me.speed *= 0.45; race.say(me, 'ÖL!', '', 1.2); HR.Audio.play('crash'); }
        if (kind === 'blitz') { this.slowT = 2.6; race.say(me, 'BLITZ!', 'Kurz ausgebremst', 1.5); HR.Audio.play('crash'); }
      },
      // beim Gastgeber
      event(race, m, from) {
        if (m.k === 'oil') {
          const s = Math.floor(race.mod(m.d) / HR.SEG) % race.track.n;
          this.oils.push([this.oilSeq++, s, U.clamp(+m.x || 0, -1, 1), race.time]);
          if (this.oils.length > 24) this.oils.shift();
        } else if (m.k === 'oilhit') {
          this.oils = this.oils.filter(o => o[0] !== m.id);
        } else if (m.k === 'blitz') {
          const e = { n: ++this.evSeq, k: 'blitz', from: 'h' + from, d: m.d, at: race.time };
          this.events.push(e);
          this.applyEvents(race, [e]);
        }
      },
      applyEvents(race, list) {
        const me = race.players[0];
        for (const e of list) {
          if (e.n <= this.seenEv) continue;
          this.seenEv = e.n;
          if (e.k === 'blitz') {
            this.flash = 0.5;
            if (me && e.from !== me.id && !me.finished && me.dist > e.d) this.hit(race, me, 'blitz');
            else if (me && e.from === me.id) race.say(me, 'BLITZ!', 'Alle vor dir sind gebremst', 1.5);
          }
        }
      },
      pack(race) { return { o: this.oils.map(o => [o[0], o[1], o[2]]), e: this.events.map(e => ({ n: e.n, k: e.k, from: e.from, d: e.d })) }; },
      unpack(race, d) { this.oils = d.o || []; this.applyEvents(race, d.e || []); },
      extras(race, si) {
        const out = [];
        const xs = this.boxes && this.boxes.get(si);
        if (xs) xs.forEach((bx, j) => { if (!(this.boxCd[si + ':' + j] > race.time)) out.push([spr.box, 330, bx]); });
        for (const o of this.oils) if (o[1] === si && !this.hitOils.has(o[0])) out.push([spr.oil, 900, o[2]]);
        return out;
      },
      decorate(g, race, c, box) {
        if (box.own && this.shieldT > 0) {
          g.strokeStyle = `rgba(80,200,255,${0.5 + 0.3 * Math.sin(race.time * 10)})`; g.lineWidth = Math.max(2, box.w * 0.02);
          g.beginPath(); g.ellipse(box.x + box.w / 2, box.y + box.h * 0.55, box.w * 0.6, box.h * 0.75, 0, 0, 7); g.stroke();
        }
      },
      hud(g, race, p, vw, vh, sc, R) {
        const s = 74 * sc, x = vw / 2 - s / 2, y = HR.Input.touchMode ? vh * 0.2 : 14 * sc + 4;
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, s, s);
        g.strokeStyle = this.item ? HR.ITEMS[this.item].color : 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.strokeRect(x, y, s, s);
        if (this.item) R.text(g, HR.ITEMS[this.item].name, vw / 2, y + s / 2, (this.item === 'oil' ? 13 : 15) * sc, HR.ITEMS[this.item].color, 'center', 'middle');
        else R.text(g, 'EXTRA', vw / 2, y + s / 2, 13 * sc, 'rgba(255,255,255,.5)', 'center', 'middle');
        const fx = [];
        if (this.boostT > 0) fx.push('TURBO'); if (this.magnetT > 0) fx.push('MAGNET'); if (this.shieldT > 0) fx.push('SCHILD ' + Math.ceil(this.shieldT)); if (this.slowT > 0) fx.push('GEBREMST');
        if (fx.length) R.text(g, fx.join('  ·  '), vw / 2, y + s + 6, 16 * sc, 'rgb(255,210,40)', 'center');
      },
      ranking(race) {
        return race.results().filter(r => !race.cars.find(c => c.id === r.id).gone)
          .map(r => ({ id: race.cars.find(c => c.id === r.id).pidx, s: -Math.round(r.time * 100), txt: (r.est ? '~' : '') + U.fmtTime(r.time) }));
      },
    };
  },
}));
