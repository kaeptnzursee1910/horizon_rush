// Horizon Rush – Rennlogik (Fahrphysik, KI, Runden), portiert aus dem Original
'use strict';

HR.Race = class {
  // opts: { track, laps, mode, demo, entrants: [{id, name, car, color, skill, pid, human, remote}] }
  constructor(game, opts) {
    this.game = game;
    this.mode = opts.mode;
    this.demo = !!opts.demo;
    this.trackIdx = opts.track;
    this.track = game.getTrack(opts.track);
    this.laps = opts.laps;
    this.time = 0;
    this.count = 3.0;
    this.goT = 0;
    this.state = this.demo ? 'racing' : 'countdown';
    this.finishOrder = 0;
    this.doneT = 0;
    this.online = !!opts.online;
    this.party = !!opts.party;
    this.rules = opts.rules || null;   // Party-Spielregeln (partyrace.js)
    const n = opts.entrants.length;
    this.cars = opts.entrants.map((e, i) => {
      const ct = HR.CARS[e.car];
      return {
        id: e.id, pidx: e.pidx, name: e.name, car: e.car, ct, color: e.color || ct.color,
        frames: game.carFrames(e.car, e.color || ct.color),
        pid: e.pid == null ? null : e.pid, human: !!e.human, remote: !!e.remote,
        maxSpeed: HR.MAXSPEED * ct.top, accel: HR.MAXSPEED * 0.22 * ct.accel,
        steer: 2.1 * ct.handling, grip: 1.3 - 0.5 * ct.handling, handling: ct.handling,
        skill: e.skill != null ? e.skill : 0.95,
        aiLane: U.choice([-0.5, 0, 0.5]), aiTimer: U.uniform(2, 5),
        dist: -HR.SEG * 3 - Math.floor(i / 2) * HR.SEG * 2.5,
        x: n === 1 ? 0 : (i % 2 === 0 ? -0.5 : 0.5),
        speed: opts.startSpeed ? opts.startSpeed * HR.MAXSPEED * ct.top : 0,
        lean: 0, braking: false, offroad: false, lapsDone: -1, lapStart: 0, lapTimes: [], bestLap: null,
        finished: false, finishTime: null, finishRank: 0, place: i + 1,
        gear: 1, rpm: 0.1, crashCd: 0, msg: '', msg2: '', msgT: 0, bg: 0, net: null,
        out: false, spinT: 0,
      };
    });
    this.players = this.cars.filter(c => c.pid != null);
    this.humans = this.cars.filter(c => c.human || c.pid != null);
    this.order = this.cars.slice();
    this.engineVol = this.players.length < 2 ? 0.55 : 0.4;
  }

  say(c, title, sub, dur) { c.msg = title; c.msg2 = sub; c.msgT = dur; }

  update(dt, inputs) {
    if (this.state === 'countdown') {
      const before = Math.ceil(this.count);
      this.count -= dt;
      const after = Math.ceil(this.count);
      for (const p of this.players) {
        p.rpm += ((inputs[p.pid].up ? 0.75 : 0.1) - p.rpm) * Math.min(1, dt * 6);
        HR.Audio.engine(p.pid, p.rpm, this.engineVol);
      }
      for (const c of this.cars) if (c.remote) this.netSmooth(c, dt);
      if (after !== before) HR.Audio.play(after > 0 ? 'beep' : 'go');
      if (after <= 0) { this.state = 'racing'; this.goT = 1.2; }
      return;
    }
    this.time += dt;
    if (this.goT > 0) this.goT -= dt;
    for (const c of this.cars) {
      if (c.out) continue;
      if (c.remote) this.netSmooth(c, dt);
      else if (c.pid != null && !c.finished) this.drivePlayer(c, inputs[c.pid], dt);
      else this.driveAI(c, dt);
      c.bg += this.track.segAt(this.mod(c.dist)).curve * (c.speed / HR.MAXSPEED) * dt * 60;
      if (c.crashCd > 0) c.crashCd -= dt;
      if (c.msgT > 0) c.msgT -= dt;
      if (!c.remote) this.checkLap(c);
    }
    for (const p of this.players) if (!p.out) this.updateEngine(p, p.finished ? { up: true } : inputs[p.pid], dt);
    this.rank();
    if (this.rules) this.rules.update(this, dt, inputs);
    if (this.state === 'racing' && !this.demo && !this.netClient) {
      const all = this.humans.length && this.humans.every(p => p.finished || p.gone);
      const first = this.humans.find(p => p.finished);
      if (first && this.online) this.firstFin = this.firstFin || this.time;
      if (all || (this.firstFin && this.time - this.firstFin > 60)) this.state = 'done';
    }
    if (this.state === 'done') this.doneT += dt;
  }

  mod(d) { const L = this.track.length; return ((d % L) + L) % L; }

  drivePlayer(c, inp, dt) {
    const seg = this.track.segAt(this.mod(c.dist));
    const sp = c.speed / HR.MAXSPEED;
    const dx = dt * c.steer * Math.min(1, sp * 1.5);
    const mul = this.rules ? this.rules.speedMul(this, c) : 1, maxS = c.maxSpeed * mul;
    c.lean = 0;
    if (c.spinT > 0) {
      // ins Schleudern geraten: keine Kontrolle, Auto wackelt
      c.spinT -= dt;
      c.lean = Math.sin(c.spinT * 30) > 0 ? 1 : -1;
      inp = { left: false, right: false, up: false, down: true };
    }
    if (inp.left) { c.x -= dx; c.lean = -1; }
    else if (inp.right) { c.x += dx; c.lean = 1; }
    c.x -= dt * 2 * sp * sp * seg.curve * HR.CENTRIFUGAL * c.grip;
    if (inp.up) c.speed += c.accel * (mul > 1 ? mul * mul : 1) * (1 - 0.55 * c.speed / maxS) * dt;
    else if (inp.down) c.speed -= HR.MAXSPEED * 0.9 * dt;
    else c.speed -= HR.MAXSPEED * 0.18 * dt;
    c.braking = !!inp.down;
    c.offroad = Math.abs(c.x) > 1.0;
    if (c.offroad) {
      if (c.speed > c.maxSpeed * 0.3) c.speed -= HR.MAXSPEED * 0.55 * dt;
      for (const [kind, off] of seg.sprites) {
        const sd = this.game.sprites[kind];
        if (sd[2] > 0 && Math.abs(c.x - off) < sd[2] + HR.CAR_HALF) {
          if (c.speed > HR.MAXSPEED * 0.15 && c.crashCd <= 0) { HR.Audio.play('crash'); c.shake = 0.6; }
          c.crashCd = 0.6;
          c.speed = Math.min(c.speed, HR.MAXSPEED * 0.12);
          c.x += c.x >= off ? 0.08 : -0.08;
          break;
        }
      }
    }
    this.collideCars(c);
    c.x = U.clamp(c.x, -2.6, 2.6);
    c.speed = mul < 1 && c.speed > maxS ? Math.max(maxS, c.speed - HR.MAXSPEED * 1.2 * dt) : U.clamp(c.speed, 0, maxS);
    c.dist += c.speed * dt;
  }

  collideCars(c) {
    const L = this.track.length;
    for (const o of this.cars) {
      if (o === c || o.out) continue;
      const dz = this.mod(o.dist - c.dist);
      if (dz < HR.CAR_LEN && Math.abs(o.x - c.x) < HR.CAR_W / HR.ROADW * 0.8 && c.speed > o.speed) {
        if (c.pid != null && c.crashCd <= 0) { HR.Audio.play('bump'); c.crashCd = 0.3; }
        c.speed = o.speed * 0.85;
        c.dist -= HR.CAR_LEN - dz;
        if (!o.remote) o.speed = Math.min(o.maxSpeed, o.speed + 300);
        break;
      }
    }
    void L;
  }

  driveAI(c, dt) {
    const tr = this.track, L = tr.length;
    const seg = tr.segAt(this.mod(c.dist));
    const ahead = tr.segAt(this.mod(c.dist + HR.SEG * 12));
    const curv = Math.max(Math.abs(seg.curve), Math.abs(ahead.curve));
    let target = c.maxSpeed * Math.min(1, c.skill) * (1 - curv * 0.022 / c.handling);
    if (this.humans.length && !c.human && c.pid == null && !this.demo) {
      const lead = Math.max(...this.humans.map(p => p.dist));
      const gap = (c.dist - lead) / L;
      if (gap > 0.08) target *= 0.93;
      else if (gap < -0.15) target *= 1.06;
    }
    if (c.speed < target) c.speed += c.accel * (1 - 0.5 * c.speed / c.maxSpeed) * dt;
    else c.speed = Math.max(target, c.speed - HR.MAXSPEED * 0.4 * dt);
    c.aiTimer -= dt;
    if (c.aiTimer <= 0) { c.aiLane = U.choice([-0.6, -0.2, 0.2, 0.6]); c.aiTimer = U.uniform(3, 7); }
    let desired = c.aiLane;
    for (const o of this.cars) {
      if (o === c) continue;
      const dz = this.mod(o.dist - c.dist);
      if (dz < HR.SEG * 6 && Math.abs(o.x - desired) < 0.45) {
        if (c.speed > o.speed * 0.98 || o.pid != null || o.human) desired = o.x > 0 ? o.x - 0.6 : o.x + 0.6;
        if (dz < HR.CAR_LEN * 1.3 && Math.abs(o.x - c.x) < 0.35) c.speed = Math.min(c.speed, o.speed);
      }
    }
    desired = U.clamp(desired, -0.8, 0.8);
    const step = U.clamp(desired - c.x, -dt * 0.9, dt * 0.9);
    c.x += step;
    c.lean = step < -dt * 0.3 ? -1 : step > dt * 0.3 ? 1 : 0;
    c.braking = c.speed > target + 50;
    c.offroad = false;
    c.dist += c.speed * dt;
  }

  updateEngine(p, inp, dt) {
    const sp = p.speed / p.maxSpeed;
    const g = Math.min(4, Math.floor(sp * 5)), frac = sp * 5 - g;
    p.gear = g + 1;
    const target = g === 0 ? 0.1 + 0.9 * frac : 0.35 + 0.65 * frac;
    p.rpm += (target - p.rpm) * Math.min(1, dt * 10);
    HR.Audio.engine(p.pid, p.rpm, this.engineVol * (0.75 + 0.25 * (inp.up ? 1 : 0)));
    HR.Audio.rumble(p.pid, p.offroad && p.speed > 800);
  }

  checkLap(c) {
    const done = Math.floor(c.dist / this.track.length);
    if (done <= c.lapsDone) return;
    c.lapsDone = done;
    if (done === 0) { c.lapStart = this.time; return; }
    const lt = this.time - c.lapStart; c.lapStart = this.time;
    c.lapTimes.push(lt);
    if (c.bestLap == null || lt < c.bestLap) c.bestLap = lt;
    const isPlayer = c.pid != null && !c.finished && !this.demo;
    const record = isPlayer && !this.party && this.game.recordLap(this.track.cfg.name, lt);
    if (this.rules && this.rules.noLaps) return;
    if (done >= this.laps && !c.finished) {
      c.finished = true; c.finishTime = this.time;
      this.finishOrder += 1; c.finishRank = this.finishOrder;
      if (isPlayer) {
        this.rank();
        const raceRec = !this.party && this.game.recordRace(this.track.cfg.name, this.laps, this.time);
        const place = this.mode === 'trial' ? '' : `Platz ${c.place}  ·  `;
        this.say(c, 'ZIEL!', place + U.fmtTime(this.time) + (raceRec ? '  ·  NEUER REKORD!' : ''), 99);
        HR.Audio.play('finish');
      }
    } else if (isPlayer) {
      const title = done === this.laps - 1 ? 'LETZTE RUNDE!' : `RUNDE ${done + 1}`;
      this.say(c, title, `Runde: ${U.fmtTime(lt)}` + (record ? '  ·  BESTZEIT!' : ''), 2.5);
      HR.Audio.play('lap');
    }
  }

  rank() {
    this.order = this.cars.slice().sort((a, b) => {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.finished && b.finished) return (a.finishTime - b.finishTime) || (a.finishRank - b.finishRank);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.dist - a.dist;
    });
    this.order.forEach((c, i) => c.place = i + 1);
  }

  results() {
    const rows = this.cars.map(c => {
      let t, est;
      if (c.finished) { t = c.finishTime; est = false; }
      else { t = this.time + (this.laps * this.track.length - c.dist) / Math.max(c.maxSpeed * (c.human ? 0.85 : c.skill * 0.85), 1); est = true; }
      return { id: c.id, name: c.name, car: c.car, color: c.color, time: t, est, best: c.bestLap, pid: c.pid, human: c.human, laps: c.lapTimes.slice() };
    });
    rows.sort((a, b) => a.time - b.time);
    return rows;
  }

  // Autos anderer Geräte weich nachführen
  netSmooth(c, dt) {
    const n = c.net; if (!n) return;
    const age = Math.min(0.4, (performance.now() - n.t) / 1000);
    const pred = n.d + n.s * age;
    const diff = pred - c.dist;
    if (Math.abs(diff) > HR.SEG * 30) c.dist = pred;
    else c.dist += diff * Math.min(1, dt * 12);
    c.x += (n.x - c.x) * Math.min(1, dt * 12);
    c.speed = n.s; c.lean = n.ln; c.braking = !!n.br;
    c.lapsDone = Math.floor(c.dist / this.track.length);
    if (n.b != null) c.bestLap = n.b;
    if (n.f != null && !c.finished) { c.finished = true; c.finishTime = n.f; this.finishOrder += 1; c.finishRank = this.finishOrder; }
  }
};
