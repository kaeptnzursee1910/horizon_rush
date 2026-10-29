// Horizon Rush – Spielablauf, Menüs, Modi, Online-Lobby
'use strict';

const Game = HR.Game = {
  canvas: null, g: null, W: 0, H: 0, dpr: 1,
  sprites: null, bgCache: new Map(), trackCache: {}, frameCache: {},
  race: null, views: [], paused: false, champ: null, lastParams: null, online: null, party: null,
  diff: 1,

  // ---------- Einstellungen und Bestzeiten ----------
  settings: { diff: 1, sound: true, split: 'auto', name: '', car: 0, paint: 0, laps: 3 },
  records: { lap: {}, race: {} },
  load() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('hr_settings') || '{}')); } catch (_) { }
    try { const r = JSON.parse(localStorage.getItem('hr_records') || 'null'); if (r && r.lap && r.race) this.records = r; } catch (_) { }
    if (!this.settings.name) this.settings.name = 'Fahrer ' + Math.floor(10 + Math.random() * 90);
    this.diff = this.settings.diff;
  },
  save() {
    this.settings.diff = this.diff;
    try { localStorage.setItem('hr_settings', JSON.stringify(this.settings)); } catch (_) { }
    try { localStorage.setItem('hr_records', JSON.stringify(this.records)); } catch (_) { }
  },
  recordLap(track, t) {
    const old = this.records.lap[track];
    if (old == null || t < old) { this.records.lap[track] = +t.toFixed(3); this.save(); return true; }
    return false;
  },
  recordRace(track, laps, t) {
    const key = track + '|' + laps, old = this.records.race[key];
    if (old == null || t < old) { this.records.race[key] = +t.toFixed(3); this.save(); return true; }
    return false;
  },

  // ---------- Ressourcen ----------
  getTrack(i) { return this.trackCache[i] || (this.trackCache[i] = HR.buildTrack(HR.TRACKS[i], this.sprites)); },
  carFrames(car, color) {
    const k = car + ':' + color.join(',');
    return this.frameCache[k] || (this.frameCache[k] = HR.makeCarFrames(car, color));
  },
  getBg(i, vw, vh) {
    const k = i + ':' + Math.round(vw) + 'x' + Math.round(vh);
    let b = this.bgCache.get(k);
    if (!b) { b = HR.makeBackground(HR.TRACKS[i], vw, vh); this.bgCache.set(k, b); if (this.bgCache.size > 8) this.bgCache.delete(this.bgCache.keys().next().value); }
    return b;
  },

  // ---------- Start ----------
  init() {
    this.load();
    HR.Audio.setMuted(!this.settings.sound);
    this.canvas = document.getElementById('game');
    this.g = this.canvas.getContext('2d');
    this.sprites = HR.makeSprites();
    HR.Input.init(this.canvas);
    HR.Input.onPause = () => this.togglePause();
    HR.Input.onKey = e => this.globalKey(e);
    HR.Input.onTap = () => this.tapped();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.race && !this.race.demo && !this.online && !this.party && !this.paused && this.race.state !== 'done') this.togglePause();
    });
    HR.Net.onMsg = (m, from) => this.netMsg(m, from);
    HR.Net.onDrop = id => this.netDrop(id);
    this.resize();
    this.startDemo();
    UI.main();
    let last = performance.now(), acc = 0;
    const frame = now => {
      const dt = Math.min(1 / 20, (now - last) / 1000); last = now;
      const arena = HR.Party.arena;
      if (arena) {
        try { arena.frame(dt); arena.render(this.g, this.W, this.H, this.dpr); } catch (e) { console.error(e); }
        requestAnimationFrame(frame);
        return;
      }
      if (this.race && !this.paused) {
        acc += dt;
        while (acc >= HR.STEP) { this.update(HR.STEP); acc -= HR.STEP; }
      } else acc = 0;
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr); this.canvas.height = Math.round(this.H * this.dpr);
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.layoutViews();
    document.body.classList.toggle('portrait', this.H > this.W && HR.Input.touchMode);
  },

  layoutViews() {
    const W = this.W, H = this.H;
    if (!this.race) { this.views = []; return; }
    const race = this.race;
    const list = race.demo ? [0] : race.players.slice().sort((a, b) => a.pid - b.pid).map(p => race.cars.indexOf(p));
    let split = this.settings.split;
    if (split === 'auto') split = HR.Input.touchMode ? 'lr' : 'tb';
    this.views = list.map((ci, k) => {
      let v;
      if (list.length === 1) v = { x: 0, y: 0, w: W, h: H };
      else if (split === 'lr') v = { x: k * W / 2 + (k ? 1 : 0), y: 0, w: W / 2 - 1, h: H };
      else v = { x: 0, y: k * H / 2 + (k ? 1 : 0), w: W, h: H / 2 - 1 };
      return Object.assign(v, { car: ci, dd: list.length > 1 ? HR.DRAW_SPLIT : HR.DRAW, label: list.length > 1 ? 'SPIELER ' + (k + 1) : '', first: k === 0 });
    });
    HR.Input.layout(race.demo ? [] : this.views, W, H, race.rules && race.rules.extraButton);
  },

  // ---------- Rennen ----------
  startDemo() {
    this.paused = false;
    const ai = HR.makeAI(HR.FIELD, 1).map((a, i) => Object.assign(a, { id: 'ai' + i, skill: U.uniform(0.85, 0.97) }));
    this.race = new HR.Race(this, { track: Math.floor(Math.random() * 3), laps: 999, mode: 'demo', demo: true, entrants: ai, startSpeed: 0.6 });
    HR.Audio.stopEngines();
    this.layoutViews();
  },

  // params: {mode, track, laps, picks:[{car, color}]}
  startRace(params) {
    this.lastParams = params;
    const n = params.picks.length;
    let ai = [];
    if (params.mode === 'champ') ai = this.champ.ai;
    else if (params.mode !== 'trial') ai = HR.makeAI(HR.FIELD - n, this.diff);
    const entrants = ai.map((a, i) => Object.assign({}, a, { id: 'ai' + i }));
    params.picks.forEach((p, i) => entrants.push({ id: 'p' + i, name: n === 1 ? 'Du' : 'Spieler ' + (i + 1), car: p.car, color: p.color, pid: i, human: true }));
    this.beginRace({ mode: params.mode, track: params.track, laps: params.laps, entrants }, n);
  },

  beginRace(opts, localCount) {
    HR.Audio.init();
    this.paused = false;
    this.race = new HR.Race(this, opts);
    if (this.online && !this.online.host) this.race.netClient = true;
    HR.Input.splitKeys = localCount > 1;
    HR.Audio.startEngines(localCount, this.race.engineVol);
    this.resultsShown = false;
    this.layoutViews();
    UI.hide();
    this.requestWakeLock();
  },

  update(dt) {
    const race = this.race;
    const inputs = [0, 1].map(i => { const c = HR.Input.control(i); return { up: c.gas, down: c.brake, left: c.left, right: c.right, act: c.act }; });
    race.update(dt, inputs);
    if (this.online) this.netTick(dt);
    if (this.party) { if (HR.Party.ctl && HR.Party.ctl.tick) HR.Party.ctl.tick(dt); return; }
    if (!race.demo && race.state === 'done' && !this.resultsShown) {
      if (!this.online || this.online.host) {
        if (race.doneT > 5 || (this.online && race.doneT > 3)) this.showResults();
      }
    }
  },

  tapped() {
    const r = this.race;
    if (r && !r.demo && r.state === 'done' && r.doneT > 0.8 && !this.resultsShown && !this.online && !this.party) this.showResults();
  },

  render() {
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, this.W, this.H);
    if (!this.race || !this.views.length) return;
    for (const v of this.views) HR.Render.view(g, this, v);
    if (!this.race.demo && this.race.state !== 'done' && !this.paused) HR.Render.touch(g);
  },

  togglePause() {
    if (this.party) { if (HR.Party.ctl) UI.partyPause(); return; }
    const r = this.race;
    if (!r || r.demo || this.resultsShown) return;
    if (r.state === 'done') { if (!this.online) this.showResults(); return; }
    if (this.online) { UI.pause(true); return; }
    this.paused = !this.paused;
    if (this.paused) { HR.Audio.silence(); UI.pause(false); } else UI.hide();
  },

  resume() { this.paused = false; UI.hide(); },

  quitToMenu() {
    if (this.party) HR.Party.reset();
    if (this.online) { HR.Net.close(); this.online = null; }
    this.champ = null;
    this.startDemo();
    UI.main();
  },

  rematch() { if (this.lastParams) this.startRace(this.lastParams); },

  showResults() {
    if (this.resultsShown) return;
    this.resultsShown = true;
    HR.Audio.silence();
    const race = this.race;
    const rows = race.results();
    if (this.online && this.online.host) {
      HR.Net.broadcast({ t: 'results', rows, track: race.trackIdx, laps: race.laps });
      this.online.state = 'results';
    }
    let points = null;
    if (this.champ) {
      points = {};
      rows.forEach((r, i) => { const p = HR.POINTS[i] || 0; points[r.name] = p; this.champ.points[r.name] = (this.champ.points[r.name] || 0) + p; });
      this.champ.idx += 1;
    }
    UI.results(rows, { track: race.trackIdx, laps: race.laps, mode: race.mode, points });
  },

  async requestWakeLock() {
    try { if ('wakeLock' in navigator && !this.wakeLock) { this.wakeLock = await navigator.wakeLock.request('screen'); this.wakeLock.addEventListener('release', () => this.wakeLock = null); } } catch (_) { }
  },

  globalKey(e) {
    if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Escape') { UI.key(e); return true; } return false; }
    if (e.code === 'KeyM') { this.settings.sound = !this.settings.sound; HR.Audio.setMuted(!this.settings.sound); this.save(); UI.toast(this.settings.sound ? 'Ton an' : 'Ton aus'); return true; }
    if (e.code === 'F11') { UI.fullscreen(); return true; }
    if (UI.visible()) return UI.key(e);
    const r = this.race;
    if (r && !r.demo && r.state === 'done' && !this.online && !this.party && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) { if (r.doneT > 0.8) this.showResults(); return true; }
    if (e.code === 'Escape' || e.code === 'KeyP') { this.togglePause(); return true; }
    return false;
  },

  // ---------- Meisterschaft ----------
  startChamp(pick) {
    this.champ = { ai: HR.makeAI(HR.FIELD - 1, this.diff), pick, idx: 0, points: {}, laps: 3 };
    this.nextChamp();
  },
  nextChamp() {
    const c = this.champ;
    this.startRace({ mode: 'champ', track: c.idx, laps: c.laps, picks: [c.pick] });
  },

  // ---------- Online ----------
  myPick() { const s = this.settings; const paints = HR.paintsFor(s.car); return { car: s.car, color: paints[s.paint % paints.length] }; },

  onlineHost() {
    UI.busy('Rennen wird erstellt …');
    HR.Net.host((err, code) => {
      if (err) { UI.error(err, () => UI.online()); return; }
      HR.Audio.init();
      const p = this.myPick();
      this.online = { host: true, code, state: 'lobby', track: 0, laps: 3, diff: this.diff,
        players: [{ id: 0, name: this.settings.name, car: p.car, color: p.color }] };
      UI.lobby();
    });
  },

  onlineJoin(code) {
    UI.busy('Verbinde mit Rennen ' + code + ' …');
    HR.Net.join(code, (err, id) => {
      if (err) { UI.error(err, () => UI.online()); return; }
      HR.Audio.init();
      this.online = { host: false, code, state: 'lobby', myId: id, players: [], track: 0, laps: 3, diff: 1 };
      const p = this.myPick();
      HR.Net.send({ t: 'hello', name: this.settings.name, car: p.car, color: p.color });
      UI.lobby();
    });
  },

  lobbyState() { const o = this.online; return { t: 'lobby', players: o.players, track: o.track, laps: o.laps, diff: o.diff }; },

  lobbyChanged() {
    if (!this.online) return;
    if (this.online.host) HR.Net.broadcast(this.lobbyState());
    if (this.online.state === 'lobby') UI.lobby();
  },

  setMyCar(car) {
    this.settings.car = car; this.settings.paint = 0; this.save();
    const o = this.online; if (!o) return;
    const p = this.myPick();
    if (o.host) { Object.assign(o.players[0], p); this.lobbyChanged(); }
    else { HR.Net.send({ t: 'car', car: p.car, color: p.color }); const me = o.players.find(x => x.id === o.myId); if (me) Object.assign(me, p); UI.lobby(); }
  },

  onlineStart() {
    const o = this.online;
    const ai = HR.makeAI(Math.max(0, HR.FIELD - o.players.length), o.diff);
    const entrants = ai.map((a, i) => Object.assign(a, { id: 'ai' + i }));
    for (const p of o.players) entrants.push({ id: 'h' + p.id, name: p.name, car: p.car, color: p.color, human: true });
    const opts = { mode: 'online', track: o.track, laps: o.laps, entrants };
    HR.Net.broadcast({ t: 'start', opts });
    this.startOnlineRace(opts);
  },

  startOnlineRace(opts) {
    const o = this.online;
    const me = 'h' + (o.host ? 0 : o.myId);
    const entrants = opts.entrants.map(e => Object.assign({}, e, {
      pid: e.id === me ? 0 : null,
      remote: e.id !== me && (e.human || !o.host),
    }));
    o.state = 'race'; o.sendT = 0;
    this.beginRace({ mode: 'online', online: true, track: opts.track, laps: opts.laps, entrants }, 1);
  },

  netTick(dt) {
    const o = this.online, race = this.race;
    if (!race || o.state !== 'race') return;
    o.sendT -= dt;
    if (o.sendT > 0) return;
    o.sendT = 0.05;
    const pack = c => [c.id, Math.round(c.dist), +c.x.toFixed(3), Math.round(c.speed), c.lean, c.braking ? 1 : 0,
      c.finished ? +c.finishTime.toFixed(3) : null, c.bestLap != null ? +c.bestLap.toFixed(3) : null];
    if (o.host) HR.Net.broadcast({ t: 'snap', c: race.cars.map(pack), st: race.state });
    else { const me = race.players[0]; if (me) HR.Net.send({ t: 'st', c: pack(me) }); }
  },

  applyPack(c) {
    if (!this.race) return;
    const car = this.race.cars.find(x => x.id === c[0]);
    if (!car || !car.remote) return;
    car.net = { d: c[1], x: c[2], s: c[3], ln: c[4], br: c[5], f: c[6], b: c[7], t: performance.now() };
  },

  netMsg(m, from) {
    const o = this.online;
    if (!o) return;
    if (o.host) {
      if (m.t === 'hello') {
        if (o.state !== 'lobby') { HR.Net.sendTo(from, { t: 'busy' }); return; }
        o.players.push({ id: from, name: String(m.name || 'Gast').slice(0, 16), car: U.clamp(m.car | 0, 0, 3), color: Array.isArray(m.color) ? m.color.slice(0, 3).map(v => U.clamp(v | 0, 0, 255)) : HR.CARS[0].color });
        HR.Audio.play('blip');
        this.lobbyChanged();
      } else if (m.t === 'car') {
        const p = o.players.find(p => p.id === from);
        if (p) { p.car = U.clamp(m.car | 0, 0, 3); if (Array.isArray(m.color)) p.color = m.color.slice(0, 3).map(v => U.clamp(v | 0, 0, 255)); this.lobbyChanged(); }
      } else if (m.t === 'st') this.applyPack(m.c);
    } else {
      if (m.t === 'lobby') {
        Object.assign(o, { players: m.players, track: m.track, laps: m.laps, diff: m.diff });
        if (o.state === 'results') { this.startDemo(); }
        o.state = 'lobby';
        UI.lobby();
      } else if (m.t === 'start') this.startOnlineRace(m.opts);
      else if (m.t === 'snap') { for (const c of m.c) this.applyPack(c); }
      else if (m.t === 'results') {
        o.state = 'results'; this.resultsShown = true;
        if (this.race) this.race.state = 'done';
        HR.Audio.silence();
        UI.results(m.rows, { track: m.track, laps: m.laps, mode: 'online' });
      } else if (m.t === 'busy') {
        HR.Net.close(); this.online = null;
        UI.error('Das Rennen läuft gerade. Versuche es gleich noch einmal.', () => UI.online());
      }
    }
  },

  netDrop(id) {
    const o = this.online;
    if (!o) return;
    if (o.host) {
      const p = o.players.find(p => p.id === id);
      o.players = o.players.filter(p => p.id !== id);
      if (p) UI.toast(p.name + ' hat das Rennen verlassen');
      if (this.race && o.state === 'race') {
        const c = this.race.cars.find(c => c.id === 'h' + id);
        if (c) { c.remote = false; c.gone = true; c.human = false; c.skill = 0.9; this.race.humans = this.race.humans.filter(h => h !== c); }
      }
      this.lobbyChanged();
    } else {
      HR.Net.close(); this.online = null;
      this.startDemo();
      UI.error('Die Verbindung zum Gastgeber ist abgebrochen.', () => UI.main());
    }
  },

  backToLobby() {
    const o = this.online;
    this.startDemo();
    o.state = 'lobby';
    HR.Net.broadcast(this.lobbyState());
    UI.lobby();
  },
};

// ======================================================================
// Menüs (HTML über dem Demo-Rennen)
// ======================================================================
const UI = HR.UI = {
  el: null, back: null, enterAct: null,

  init() { this.el = document.getElementById('menu'); this.toastEl = document.getElementById('toast'); },
  visible() { return !this.el.hidden; },
  hide() { this.el.hidden = true; this.back = null; document.body.classList.remove('menu-open'); },

  show(html, back, opts = {}) {
    this.el.hidden = false;
    document.body.classList.add('menu-open');
    this.el.innerHTML = html;
    this.back = back || null;
    this.keys = opts.keys || null;
    this.bind(this.el);
    const f = this.el.querySelector('[autofocus]') || this.el.querySelector('button:not([disabled])');
    if (f) f.focus({ preventScroll: true });
    const sc = this.el.querySelector('.panel'); if (sc) sc.scrollTop = 0;
  },

  bind(root) {
    root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', ev => {
      ev.preventDefault();
      HR.Audio.init(); HR.Audio.play(b.dataset.act === 'back' ? 'blip' : 'select');
      const fn = this.acts[b.dataset.act]; if (fn) fn(b.dataset.arg, b, ev);
    }));
  },

  key(e) {
    if (this.keys && this.keys(e)) return true;
    const items = [...this.el.querySelectorAll('button:not([disabled]):not(.nofocus), input')];
    const i = items.indexOf(document.activeElement);
    const inInput = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (e.code === 'Escape' || (e.code === 'Backspace' && !inInput)) { if (this.back) { HR.Audio.play('blip'); this.back(); } return true; }
    if (!inInput && (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyS')) {
      const d = (e.code === 'ArrowDown' || e.code === 'KeyS') ? 1 : -1;
      const n = items[(i + d + items.length) % items.length] || items[0];
      if (n) { n.focus(); HR.Audio.play('blip'); }
      return true;
    }
    if (inInput && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) {
      const n = items[(i + (e.code === 'ArrowDown' ? 1 : -1) + items.length) % items.length]; if (n) n.focus(); return true;
    }
    return false;
  },

  toast(msg) {
    const t = this.toastEl; t.textContent = msg; t.hidden = false;
    clearTimeout(this._tt); this._tt = setTimeout(() => t.hidden = true, 2400);
  },

  fullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else {
        const r = el.requestFullscreen || el.webkitRequestFullscreen;
        if (r) { const p = r.call(el); if (p && p.catch) p.catch(() => this.toast('Vollbild: Teilen → „Zum Home-Bildschirm“')); }
        else this.toast('Vollbild: Teilen → „Zum Home-Bildschirm“');
      }
    } catch (_) { this.toast('Vollbild ist hier nicht verfügbar'); }
  },

  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  swatch(c) { return `<span class="sw" style="background:${U.rgb(c)}"></span>`; },

  // ---------- Hauptmenü ----------
  main() {
    Game.champ = null;
    const d = HR.DIFFS[Game.diff][0];
    this.show(`
      <div class="panel main">
        <h1 class="logo">HORIZON RUSH</h1>
        <p class="tag">Arcade-Rennspiel</p>
        <nav class="list">
          <button data-act="party" class="hot" autofocus>Party</button>
          <button data-act="mode" data-arg="race">Einzelrennen</button>
          <button data-act="mode" data-arg="champ">Meisterschaft</button>
          <button data-act="mode" data-arg="trial">Zeitfahren</button>
          <button data-act="mode" data-arg="split">2 Spieler (Splitscreen)</button>
          <button data-act="online">Online-Rennen</button>
          <button data-act="diff" id="diffbtn">Schwierigkeit:&nbsp; ◄ ${d} ►</button>
          <button data-act="records">Bestzeiten</button>
          <button data-act="settings">Einstellungen</button>
        </nav>
        <p class="hint">${HR.Input.touchMode ? 'Tippen zum Wählen' : '↑↓ wählen  ·  Enter bestätigen  ·  F11 Vollbild  ·  M Ton'}</p>
      </div>`, null, {
      keys: e => {
        if (document.activeElement && document.activeElement.id === 'diffbtn' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD')) {
          this.acts.diff(e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1); return true;
        }
        return false;
      },
    });
  },

  // Autoauswahl wie im Original: ◄► Auto, ↑↓ Lackierung
  carSelect(title, ctrlHint, startCar, done, back) {
    let car = startCar || 0, paint = 0;
    const render = () => {
      const ct = HR.CARS[car], paints = HR.paintsFor(car);
      const bar = v => `<span class="bar"><i style="width:${Math.round(U.clamp(0.35 + (v - 0.8) / 0.2 * 0.65, 0.05, 1) * 100)}%"></i></span>`;
      this.show(`<div class="panel wide carsel">
        <header><button class="backbtn" data-act="back">‹ Zurück</button><h2>${title}</h2></header>
        ${ctrlHint ? `<p class="note">${ctrlHint}</p>` : ''}
        <div class="carstage">
          <button class="arrow" data-act="carPrev" aria-label="Vorheriges Auto">◄</button>
          <canvas id="carprev" width="480" height="256"></canvas>
          <button class="arrow" data-act="carNext" aria-label="Nächstes Auto">►</button>
        </div>
        <div class="carinfo">
          <h3>${ct.name}</h3><p>${ct.desc}</p>
          <div class="stats">
            <span>Höchstgeschw.</span>${bar(ct.top)}<b>${Math.round(330 * ct.top)} km/h</b>
            <span>Beschleunigung</span>${bar(ct.accel)}<b></b>
            <span>Handling</span>${bar(ct.handling)}<b></b>
          </div>
          <p class="lbl">Lackierung</p>
          <div class="paints">${paints.map((p, i) => `<button class="paint ${i === paint ? 'on' : ''}" data-act="paint" data-arg="${i}" style="background:${U.rgb(p)}" aria-label="Farbe ${i + 1}"></button>`).join('')}</div>
        </div>
        <nav class="list row"><button data-act="carOk" autofocus>Auswählen</button></nav>
        <p class="hint">${HR.Input.touchMode ? '' : '◄► Auto  ·  ↑↓ Farbe  ·  Enter bestätigen  ·  Esc zurück'}</p>
      </div>`, back, {
        keys: e => {
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') { car = (car + 3) % 4; paint = 0; HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'ArrowRight' || e.code === 'KeyD') { car = (car + 1) % 4; paint = 0; HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'ArrowUp' || e.code === 'KeyW') { paint = (paint + paints.length - 1) % paints.length; HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'ArrowDown' || e.code === 'KeyS') { paint = (paint + 1) % paints.length; HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { HR.Audio.play('select'); this.acts.carOk(); return true; }
          return false;
        },
      });
      const cv = this.el.querySelector('#carprev');
      cv.getContext('2d').drawImage(Game.carFrames(car, paints[paint])['0,0'], 0, 0, 480, 256);
    };
    this._car = {
      prev: () => { car = (car + 3) % 4; paint = 0; render(); },
      next: () => { car = (car + 1) % 4; paint = 0; render(); },
      paint: i => { paint = i; render(); },
      ok: () => { Game.settings.car = car; Game.settings.paint = paint; Game.save(); done({ car, color: HR.paintsFor(car)[paint] }); },
    };
    render();
  },

  trackSelect(title, done, back) {
    let t = 0, laps = Game.settings.laps || 3;
    const render = () => {
      const cards = HR.TRACKS.map((tr, i) => {
        const L = Game.getTrack(i).length;
        const lr = Game.records.lap[tr.name], rr = Game.records.race[tr.name + '|' + laps];
        return `<button class="card track t${i} ${i === t ? 'on' : ''}" data-act="pickTrack" data-arg="${i}" ${i === t ? 'autofocus' : ''}>
          <strong>${tr.name}</strong><span class="desc">${tr.desc}</span>
          <span class="meta">Streckenlänge: ${(L * 330 / 3.6 / HR.MAXSPEED / 1000).toFixed(1).replace(".", ",")} km</span>
          <span class="meta">Rundenrekord: ${U.fmtTime(lr)}  ·  Bestes Rennen (${laps} R.): ${U.fmtTime(rr)}</span></button>`;
      }).join('');
      this.show(`<div class="panel wide">
        <header><button class="backbtn" data-act="back">‹ Zurück</button><h2>${title}</h2></header>
        <div class="tracks">${cards}</div>
        <div class="laps"><span>Runden:</span><button class="arrow small" data-act="laps" data-arg="-1" aria-label="Weniger Runden">◄</button><b>${laps}</b><button class="arrow small" data-act="laps" data-arg="1" aria-label="Mehr Runden">►</button></div>
        <nav class="list row"><button data-act="trackOk">Start</button></nav>
        <p class="hint">${HR.Input.touchMode ? '' : '↑↓ Strecke  ·  ◄► Runden  ·  Enter Start  ·  Esc zurück'}</p>
      </div>`, back, {
        keys: e => {
          if (e.code === 'ArrowUp' || e.code === 'KeyW') { t = (t + 2) % 3; HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'ArrowDown' || e.code === 'KeyS') { t = (t + 1) % 3; HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') { laps = Math.max(1, laps - 1); HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'ArrowRight' || e.code === 'KeyD') { laps = Math.min(9, laps + 1); HR.Audio.play('blip'); render(); return true; }
          if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { HR.Audio.play('select'); this.acts.trackOk(); return true; }
          return false;
        },
      });
    };
    this._track = {
      pick: i => { if (t === i) this._track.ok(); else { t = i; render(); } },
      laps: d => { laps = U.clamp(laps + d, 1, 9); render(); },
      ok: () => { Game.settings.laps = laps; Game.save(); done(t, laps); },
    };
    render();
  },

  // ---------- Pause / Ergebnisse ----------
  pause(online) {
    this.show(`<div class="panel narrow"><h2>${online ? 'MENÜ' : 'PAUSE'}</h2>
      ${online ? '<p class="note">Das Online-Rennen läuft weiter.</p>' : ''}
      <nav class="list">
        <button data-act="resume" autofocus>Weiter</button>
        <button data-act="sound">${Game.settings.sound ? 'Ton aus' : 'Ton an'}</button>
        <button data-act="quit">Zurück zum Menü</button>
      </nav>
      <p class="hint">${HR.Input.touchMode ? '' : 'Esc / Enter: weiter   ·   Q: zurück zum Menü'}</p></div>`, () => this.acts.resume(), {
      keys: e => { if (e.code === 'KeyQ') { this.acts.quit(); return true; } if (e.code === 'Escape' || e.code === 'KeyP') { this.acts.resume(); return true; } return false; },
    });
  },

  results(rows, info) {
    const o = Game.online, champ = Game.champ;
    const tr = HR.TRACKS[info.track];
    let title = info.mode === 'trial' ? 'ZEITFAHREN' : 'ERGEBNIS';
    if (champ) title = `MEISTERSCHAFT  –  RENNEN ${champ.idx}/3`;
    const myIds = Game.race ? Game.race.players.map(p => p.id) : [];
    let body;
    if (info.mode === 'trial') {
      const r = rows[0];
      const best = r.best;
      body = `<div class="tablewrap"><table class="res"><tbody>${r.laps.map((t, i) => `<tr class="${t === best ? 'best' : ''}"><td>Runde ${i + 1}</td><td class="num">${U.fmtTime(t)}</td></tr>`).join('')}
        <tr class="me"><td>Gesamt</td><td class="num">${U.fmtTime(r.time)}</td></tr></tbody></table></div>`;
    } else {
      body = `<div class="tablewrap"><table class="res"><thead><tr><th>#</th><th>Fahrer</th><th>Auto</th><th class="num">Zeit</th><th class="num">Beste Runde</th>${info.points ? '<th class="num">Punkte</th>' : ''}</tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${myIds.includes(r.id) || (o && r.id === 'h' + (o.host ? 0 : o.myId)) ? 'me' : ''}"><td>${i + 1}</td><td>${this.swatch(r.color)}${this.esc(r.name)}</td><td>${HR.CARS[r.car].name}</td>
          <td class="num">${r.est ? '~' : ''}${U.fmtTime(r.time)}</td><td class="num">${U.fmtTime(r.best)}</td>${info.points ? `<td class="num">+${info.points[r.name] || 0}</td>` : ''}</tr>`).join('')}
        </tbody></table></div>`;
      if (champ) {
        const top = Object.entries(champ.points).sort((a, b) => b[1] - a[1]).slice(0, 4);
        body += `<p class="note">Gesamtwertung:&nbsp; ${top.map(([n, p], i) => `${i + 1}. ${this.esc(n)} (${p})`).join('&nbsp;&nbsp; ')}</p>`;
      }
    }
    let buttons, keys;
    if (o) {
      buttons = o.host ? `<button data-act="lobby" autofocus>Zurück zur Lobby</button><button data-act="quit">Online-Rennen beenden</button>`
        : `<p class="note">Warte auf den Gastgeber …</p><button data-act="quit">Verlassen</button>`;
    } else if (champ) {
      buttons = `<button data-act="champNext" autofocus>Weiter</button>`;
      keys = e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') { this.acts.champNext(); return true; } return false; };
    } else {
      buttons = `<button data-act="quit" autofocus>Menü</button><button data-act="rematch">Revanche</button>`;
      keys = e => { if (e.code === 'KeyR') { this.acts.rematch(); return true; } return false; };
    }
    this.show(`<div class="panel wide"><h2>${title}</h2><p class="sub">${tr.name}  ·  ${info.laps} Runde${info.laps === 1 ? '' : 'n'}</p>
      ${body}<nav class="list row">${buttons}</nav>
      <p class="hint">${HR.Input.touchMode || o ? '' : champ ? 'Enter: weiter' : 'Enter: Menü  ·  R: Revanche'}</p></div>`, o ? null : (champ ? null : () => this.acts.quit()), { keys });
  },

  champFinal() {
    const c = Game.champ;
    const list = Object.entries(c.points).sort((a, b) => b[1] - a[1]);
    const rows = list.map(([n, p], i) => `<tr class="${n === 'Du' ? 'me' : ''}"><td>${i + 1}.</td><td>${this.esc(n)}</td><td class="num">${p} Pkt.</td></tr>`).join('');
    this.show(`<div class="panel narrow"><h2>MEISTERSCHAFT – ENDSTAND</h2>
      <p class="champ">Champion: ${this.esc(list[0][0])}</p>
      <div class="tablewrap"><table class="res"><tbody>${rows}</tbody></table></div>
      <nav class="list"><button data-act="quit" autofocus>Zurück zum Menü</button></nav>
      <p class="hint">${HR.Input.touchMode ? '' : 'Enter: zurück zum Menü'}</p></div>`, () => this.acts.quit());
  },

  records() {
    const blocks = HR.TRACKS.map(t => {
      const lap = Game.records.lap[t.name];
      const races = Object.entries(Game.records.race).filter(([k]) => k.startsWith(t.name + '|')).sort((a, b) => a[0].localeCompare(b[0]));
      return `<div class="recblock"><h3>${t.name}</h3>
        <p>Schnellste Runde:&nbsp; <b>${U.fmtTime(lap)}</b></p>
        ${races.length ? races.map(([k, v]) => `<p>Rennen:&nbsp; ${k.split('|')[1]} R.: <b>${U.fmtTime(v)}</b></p>`).join('') : '<p class="dim">noch kein Rennen beendet</p>'}</div>`;
    }).join('');
    this.show(`<div class="panel wide"><header><button class="backbtn" data-act="back">‹ Zurück</button><h2>BESTZEITEN</h2></header>
      <div class="recs">${blocks}</div><p class="note">Bestzeiten werden auf diesem Gerät gespeichert.</p></div>`, () => this.main());
  },

  settings() {
    const s = Game.settings;
    const splitNames = { auto: 'Automatisch', tb: 'Oben / Unten', lr: 'Nebeneinander' };
    const key = HR.Net.getKey();
    this.show(`<div class="panel narrow"><header><button class="backbtn" data-act="back">‹ Zurück</button><h2>Einstellungen</h2></header>
      <nav class="list settings">
        <button data-act="sound" autofocus>Ton: <b>${s.sound ? 'an' : 'aus'}</b></button>
        <button data-act="cycleSplit">Splitscreen: <b>${splitNames[s.split]}</b></button>
        <button data-act="keyform">Verbindungsserver: <b>${key ? 'eingerichtet' : 'nicht eingerichtet'}</b></button>
        <button data-act="fullscreen">Vollbild</button>
      </nav>
      <p class="note">Splitscreen „Automatisch“: Auf Touch-Geräten nebeneinander, damit jeder Spieler seine eigenen Tasten hat. Mit Tastatur oben und unten (Spieler 1: WASD, Spieler 2: Pfeiltasten).</p></div>`, () => this.main());
  },

  // ---------- Online ----------
  online() {
    const s = Game.settings;
    const key = HR.Net.getKey();
    if (!HR.Net.available()) { this.error('Die Online-Funktion konnte nicht geladen werden. Ist das Gerät mit dem Internet verbunden?', () => this.main()); return; }
    this.show(`<div class="panel narrow"><header><button class="backbtn" data-act="back">‹ Zurück</button><h2>Online-Rennen</h2></header>
      <label class="field"><span>Dein Name</span><input id="pname" maxlength="16" value="${this.esc(s.name)}" autocomplete="off"></label>
      <nav class="list"><button data-act="host" autofocus>Rennen erstellen</button></nav>
      <div class="join">
        <label class="field"><span>Code eines Rennens</span><input id="jcode" inputmode="numeric" maxlength="4" placeholder="1234" autocomplete="off"></label>
        <button data-act="join">Beitreten</button>
      </div>
      <p class="note"><button class="link" data-act="keyform">Verbindungseinstellungen</button></p>
      <p class="error" id="err" hidden></p></div>`, () => this.main());
    this.el.querySelector('#jcode').addEventListener('keydown', e => { if (e.key === 'Enter') this.acts.join(); });
    this.el.querySelector('#pname').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  },

  keyform() {
    const k = HR.Net.getKey() || {};
    this.show(`<div class="panel narrow"><header><button class="backbtn" data-act="back">‹ Zurück</button><h2>Verbindungsserver</h2></header>
      <p class="note">In manchen Netzwerken, etwa in Firmen- oder Hochschul-WLANs, können sich Geräte nicht direkt verbinden. Dann läuft die Verbindung über einen Verbindungsserver. Die Zugangsdaten werden nur auf diesem Gerät gespeichert.</p>
      <label class="field"><span>Benutzername</span><input id="kuser" value="${this.esc(k.user || '')}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <label class="field"><span>Passwort</span><input id="kpass" type="password" value="${this.esc(k.pass || '')}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <nav class="list row"><button data-act="keysave">Speichern</button>${k.user ? '<button data-act="keydel">Löschen</button>' : ''}</nav></div>`, () => this._keyBack ? this._keyBack() : this.online());
  },

  lobby() {
    const o = Game.online; if (!o) return;
    const myId = o.host ? 0 : o.myId;
    const me = o.players.find(p => p.id === myId);
    const myCar = me ? me.car : Game.settings.car;
    const plist = o.players.map(p => `<li class="${p.id === myId ? 'me' : ''}">${this.swatch(p.color)}<b>${this.esc(p.name)}</b><span>${HR.CARS[p.car].name}</span>${p.id === 0 ? '<small>Gastgeber</small>' : ''}</li>`).join('');
    const free = Math.max(0, HR.FIELD - o.players.length);
    const carBtns = HR.CARS.map((c, i) => `<button class="chip ${i === myCar ? 'on' : ''}" data-act="lobbyCar" data-arg="${i}">${c.name}</button>`).join('');
    const hostCtl = o.host ? `
      <nav class="list settings">
        <button data-act="lcycle" data-arg="track">Strecke: <b>${HR.TRACKS[o.track].name}</b></button>
        <button data-act="lcycle" data-arg="laps">Runden: <b>${o.laps}</b></button>
        <button data-act="lcycle" data-arg="diff">KI-Schwierigkeit: <b>${HR.DIFFS[o.diff][0]}</b></button>
      </nav>
      <nav class="list"><button data-act="ostart" class="hot" autofocus>Rennen starten</button></nav>`
      : `<p class="trackinfo">Strecke <b>${HR.TRACKS[o.track].name}</b> · ${o.laps} Runde${o.laps === 1 ? "" : "n"} · KI ${HR.DIFFS[o.diff][0]}</p><p class="note">Warte, bis der Gastgeber das Rennen startet …</p>`;
    this.show(`<div class="panel wide lobby"><header><button class="backbtn" data-act="quit">‹ Verlassen</button><h2>Online-Lobby</h2></header>
      <div class="lobbygrid">
        <div class="codebox"><span>Code</span><b>${o.code}</b><small>${o.host ? 'Mitspieler tippen auf „Online-Rennen“ und geben diesen Code ein.' : 'Verbunden'}</small></div>
        <div><h3>Fahrer (${o.players.length}/${HR.MAX_ONLINE})</h3><ul class="players">${plist}</ul><p class="note">${free} Startplätze fährt die KI.</p></div>
      </div>
      <h3>Dein Auto</h3><div class="chips">${carBtns}</div>
      ${hostCtl}</div>`, () => this.acts.quit());
  },

  busy(msg) { this.show(`<div class="panel narrow"><h2>${msg}</h2><div class="spinner"></div><nav class="list"><button data-act="quit">Abbrechen</button></nav></div>`, () => this.acts.quit()); },

  error(msg, then) {
    this._errThen = then;
    this.show(`<div class="panel narrow"><h2>Hoppla</h2><p class="error">${this.esc(msg)}</p><nav class="list"><button data-act="errok" autofocus>OK</button></nav></div>`, () => this.acts.errok());
  },

  // ---------- Aktionen ----------
  acts: {
    back() { if (UI.back) UI.back(); },
    mode(m) {
      if (m === 'race' || m === 'trial') {
        UI.carSelect('AUTO WÄHLEN', '', Game.settings.car, pick =>
          UI.trackSelect('STRECKE WÄHLEN  –  ' + (m === 'race' ? 'EINZELRENNEN' : 'ZEITFAHREN'), (t, laps) => Game.startRace({ mode: m, track: t, laps, picks: [pick] }), () => UI.acts.mode(m)),
        () => UI.main());
      } else if (m === 'champ') {
        UI.carSelect('AUTO WÄHLEN', '', Game.settings.car, pick => Game.startChamp(pick), () => UI.main());
      } else if (m === 'split') {
        UI.carSelect('AUTO WÄHLEN  –  Spieler 1', 'Steuerung: WASD (oder Touch-Tasten links)', Game.settings.car, p1 =>
          UI.carSelect('AUTO WÄHLEN  –  Spieler 2', 'Steuerung: Pfeiltasten (oder Touch-Tasten rechts)', (p1.car + 1) % 4, p2 =>
            UI.trackSelect('STRECKE WÄHLEN  –  2 SPIELER', (t, laps) => Game.startRace({ mode: 'split', track: t, laps, picks: [p1, p2] }), () => UI.acts.mode('split')),
          () => UI.acts.mode('split')),
        () => UI.main());
      }
    },
    diff(d) {
      Game.diff = (Game.diff + (d === -1 || d === '-1' ? 2 : 1)) % 3; Game.save();
      const b = document.getElementById('diffbtn'); if (b) b.innerHTML = `Schwierigkeit:&nbsp; ◄ ${HR.DIFFS[Game.diff][0]} ►`;
    },
    carPrev() { UI._car.prev(); }, carNext() { UI._car.next(); },
    paint(i) { UI._car.paint(+i); }, carOk() { UI._car.ok(); },
    pickTrack(i) { UI._track.pick(+i); }, laps(d) { UI._track.laps(+d); }, trackOk() { UI._track.ok(); },
    resume() { if (Game.online) UI.hide(); else Game.resume(); },
    rematch() { Game.rematch(); },
    quit() { Game.quitToMenu(); },
    sound(_, b) {
      const s = Game.settings; s.sound = !s.sound; HR.Audio.setMuted(!s.sound); Game.save();
      if (UI.el.querySelector('.settings')) UI.settings(); else if (b) b.textContent = s.sound ? 'Ton aus' : 'Ton an';
    },
    records() { UI.records(); },
    settings() { UI.settings(); },
    fullscreen() { UI.fullscreen(); },
    cycleSplit() { const s = Game.settings; s.split = { auto: 'tb', tb: 'lr', lr: 'auto' }[s.split]; Game.save(); UI.settings(); const b = UI.el.querySelector('[data-act="cycleSplit"]'); if (b) b.focus(); },
    champNext() { if (Game.champ.idx >= 3) UI.champFinal(); else Game.nextChamp(); },
    online() { UI._keyBack = null; UI.online(); },
    keyform() { UI._keyBack = UI.el.querySelector('.settings') ? () => UI.settings() : () => UI.online(); UI.keyform(); },
    keysave() {
      const u = UI.el.querySelector('#kuser').value.trim(), p = UI.el.querySelector('#kpass').value.trim();
      HR.Net.setKey(u, p); UI.toast(u && p ? 'Zugangsdaten gespeichert' : 'Zugangsdaten gelöscht');
      UI._keyBack ? UI._keyBack() : UI.online();
    },
    keydel() { HR.Net.setKey(null); UI.toast('Zugangsdaten gelöscht'); UI._keyBack ? UI._keyBack() : UI.online(); },
    readName() { const n = UI.el.querySelector('#pname'); if (n) { Game.settings.name = n.value.trim().slice(0, 16) || Game.settings.name; Game.save(); } },
    host() { UI.acts.readName(); Game.onlineHost(); },
    join() {
      UI.acts.readName();
      const c = (UI.el.querySelector('#jcode').value || '').replace(/\D/g, '');
      if (c.length !== 4) { const e = UI.el.querySelector('#err'); e.textContent = 'Bitte den 4-stelligen Code eingeben.'; e.hidden = false; return; }
      Game.onlineJoin(c);
    },
    lobbyCar(i) { Game.setMyCar(+i); },
    lcycle(k) {
      const o = Game.online;
      if (k === 'track') o.track = (o.track + 1) % HR.TRACKS.length;
      if (k === 'laps') o.laps = o.laps >= 9 ? 1 : o.laps + 1;
      if (k === 'diff') o.diff = (o.diff + 1) % 3;
      Game.lobbyChanged();
      const b = UI.el.querySelector(`[data-arg="${k}"]`); if (b) b.focus();
    },
    ostart() { Game.onlineStart(); },
    lobby() { Game.backToLobby(); },
    errok() { const t = UI._errThen; UI._errThen = null; if (t) t(); else UI.main(); },
  },
};

window.addEventListener('DOMContentLoaded', () => { UI.init(); Game.init(); });
