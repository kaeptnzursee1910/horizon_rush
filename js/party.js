// Horizon Rush – Party-Modus: Party eröffnen, Lobby mit Chat, Rundenablauf, Punkte, Siegerehrung
// Der Gastgeber führt die Party. Alle anderen bekommen seinen Zustand und sehen dieselben Einstellungen.
'use strict';

HR.PARTY_PREFIX = 'horizonparty-v1-';
HR.PARTY_COLORS = [[235, 60, 55], [255, 205, 40], [60, 125, 245], [60, 195, 95], [250, 135, 35], [165, 80, 230], [45, 215, 225], [250, 115, 185]];
HR.PARTY_COLOR_NAMES = ['Rot', 'Gelb', 'Blau', 'Grün', 'Orange', 'Lila', 'Türkis', 'Pink'];

// Spiele melden sich hier an (partyrace.js und games/*.js)
HR.GAMES = {};
HR.GAME_ORDER = ['A1', 'A2', 'A3', 'A5', 'B1', 'B2', 'B3', 'B4', 'B6', 'B7', 'B9', 'B10'];
HR.addGame = def => { HR.GAMES[def.code] = def; };

const Party = HR.Party = {
  P: null,          // geteilter Zustand (der Gastgeber schickt ihn an alle)
  chat: [],
  ctl: null,        // laufendes Spiel
  arena: null,      // laufendes 2D-Spiel (zeichnet selbst)
  screen: null,

  active() { return !!this.P; },
  isHost() { return !!this.P && this.P.host; },
  me() { return this.P ? this.P.myId : null; },
  player(id) { return this.P && this.P.players.find(p => p.id === id); },
  color(p) { return HR.PARTY_COLORS[(p && p.color) || 0]; },
  hostName() { const h = this.player(0); return h ? h.name : 'der Gastgeber'; },

  // ---------- Eröffnen und beitreten ----------
  create() {
    UI.busy('Party wird eröffnet …');
    HR.Net.onMsg = (m, from) => this.msg(m, from);
    HR.Net.onDrop = id => this.drop(id);
    HR.Net.host((err, code) => {
      if (err) { this.reset(); UI.error(err, () => UI.party()); return; }
      HR.Audio.init();
      this.P = {
        host: true, myId: 0, code, phase: 'lobby', max: 8, rounds: 5, pick: 'random', picks: HR.GAME_ORDER.slice(),
        players: [{ id: 0, name: Game.settings.name, color: 0, car: Game.settings.car }],
        scores: {}, round: 0, playlist: [], current: null, ready: [], last: null,
      };
      HR.Net.limit = this.P.max;
      this.chat = [];
      Game.party = this;
      this.sys('Party eröffnet. Code: ' + code);
      this.show();
    }, HR.PARTY_PREFIX);
  },

  // Singleplayer: dieselbe Party, aber nur auf diesem Gerät, die Mitspieler sind Computer
  createSolo() {
    HR.Audio.init();
    this.P = {
      host: true, solo: true, myId: 0, code: '', phase: 'lobby', max: 6, rounds: 5, pick: 'random', picks: HR.GAME_ORDER.slice(),
      players: [{ id: 0, name: Game.settings.name, color: 0, car: Game.settings.car }],
      scores: {}, round: 0, playlist: [], current: null, ready: [], last: null,
    };
    this.chat = [];
    this.botPool = HR.makeAI(7, Game.diff);
    this.fillBots();
    Game.party = this;
    this.show();
  },

  fillBots() {
    const P = this.P, me = P.players[0];
    const colors = [0, 1, 2, 3, 4, 5, 6, 7].filter(c => c !== me.color);
    const [lo, hi] = HR.DIFFS[Game.diff][1];
    P.players = [me].concat(this.botPool.slice(0, P.max - 1).map((a, i) => ({
      id: i + 1, name: a.name, color: colors[i], car: a.car, ai: true, skill: lo + (hi - lo) * (i % 3) / 2,
    })));
  },

  join(code) {
    UI.busy('Verbinde mit Party ' + code + ' …');
    HR.Net.onMsg = (m, from) => this.msg(m, from);
    HR.Net.onDrop = id => this.drop(id);
    HR.Net.join(code, (err, id) => {
      if (err) { this.reset(); UI.error(err, () => UI.party()); return; }
      HR.Audio.init();
      this.P = { host: false, myId: id, code, phase: 'lobby', players: [], max: 8, rounds: 5, pick: 'random', picks: [], scores: {}, round: 0, ready: [] };
      this.chat = [];
      Game.party = this;
      HR.Net.send({ t: 'phello', name: Game.settings.name, car: Game.settings.car });
    }, HR.PARTY_PREFIX);
  },

  // alles zurücksetzen und die normalen Online-Rennen wieder anmelden
  reset() {
    this.stopGame();
    HR.Net.close();
    this.P = null; this.chat = []; this.screen = null;
    Game.party = null;
    HR.Net.onMsg = (m, from) => Game.netMsg(m, from);
    HR.Net.onDrop = id => Game.netDrop(id);
  },

  leave() {
    this.reset();
    Game.quitToMenu();
  },

  // ---------- Nachrichten ----------
  broadcastState() {
    if (!this.isHost()) return;
    const P = this.P;
    HR.Net.broadcast({ t: 'pstate', s: {
      code: P.code, phase: P.phase, max: P.max, rounds: P.rounds, pick: P.pick, picks: P.picks, players: P.players,
      scores: P.scores, round: P.round, playlist: P.playlist, current: P.current, ready: P.ready, last: P.last,
    } });
  },

  changed() { this.broadcastState(); this.refresh(); },

  msg(m, from) {
    const P = this.P;
    if (!P) return;
    if (m.t === 'chat') { this.onChat(m, from); return; }
    if (P.host) {
      if (m.t === 'phello') {
        if (P.phase !== 'lobby') { HR.Net.sendTo(from, { t: 'pbusy' }); return; }
        if (P.players.length >= P.max) { HR.Net.sendTo(from, { t: 'pfull', max: P.max }); return; }
        const used = P.players.map(p => p.color);
        const color = [0, 1, 2, 3, 4, 5, 6, 7].find(c => !used.includes(c));
        const name = this.uniqueName(String(m.name || 'Gast').trim().slice(0, 16) || 'Gast');
        P.players.push({ id: from, name, color: color == null ? from % 8 : color, car: U.clamp(m.car | 0, 0, 3) });
        HR.Net.sendTo(from, { t: 'chatlog', list: this.chat.slice(-40) });
        HR.Audio.play('blip');
        this.sys(name + ' ist beigetreten.');
        this.changed();
      } else if (m.t === 'pcolor') { this.cycleColor(from); }
      else if (m.t === 'pready') { this.setReady(from); }
      else if (this.ctl && this.ctl.msg) this.ctl.msg(m, from);
    } else {
      if (m.t === 'pstate') { this.applyState(m.s); }
      else if (m.t === 'chatlog') { this.chat = m.list || []; this.renderChat(); }
      else if (m.t === 'pgo') { this.startGame(m); }
      else if (m.t === 'pfull') { this.reset(); UI.error('Die Party ist schon voll (' + m.max + ' Spieler).', () => UI.party()); }
      else if (m.t === 'pbusy') { this.reset(); UI.error('Die Party läuft gerade. Neue Mitspieler können nur in der Lobby beitreten.', () => UI.party()); }
      else if (this.ctl && this.ctl.msg) this.ctl.msg(m, from);
    }
  },

  uniqueName(name) {
    let n = name, k = 2;
    while (this.P.players.some(p => p.name === n)) n = name.slice(0, 13) + ' ' + k++;
    return n;
  },

  applyState(s) {
    const P = this.P, oldPhase = P.phase, oldRound = P.round;
    Object.assign(P, s);
    if (!P.players.some(p => p.id === P.myId)) return;
    if (P.phase !== oldPhase || P.round !== oldRound || !this.screen) {
      if (P.phase !== 'play') this.stopGame();
      this.show();
    } else this.refresh();
  },

  drop(id) {
    const P = this.P;
    if (!P) return;
    if (P.host) {
      const p = this.player(id);
      P.players = P.players.filter(x => x.id !== id);
      P.ready = P.ready.filter(x => x !== id);
      if (p) this.sys(p.name + ' hat die Party verlassen.');
      if (this.ctl && this.ctl.drop) this.ctl.drop(id);
      this.changed();
      if (P.phase === 'intro') this.checkReady();
    } else {
      this.reset();
      Game.startDemo();
      UI.error('Die Verbindung zur Party ist abgebrochen.', () => UI.main());
    }
  },

  // ---------- Chat ----------
  sendChat(text) {
    text = String(text || '').trim().slice(0, 200);
    if (!text || !this.P) return;
    if (this.P.host) this.onChat({ text }, 0);
    else HR.Net.send({ t: 'chat', text });
  },

  onChat(m, from) {
    const P = this.P;
    if (P.host) {
      const p = this.player(from); if (!p) return;
      const e = { id: from, name: p.name, color: p.color, text: String(m.text || '').slice(0, 200) };
      this.addChat(e);
      HR.Net.broadcast({ t: 'chat', e });
    } else if (m.e) this.addChat(m.e);
  },

  sys(text) {
    const e = { sys: true, text };
    this.addChat(e);
    if (this.isHost()) HR.Net.broadcast({ t: 'chat', e });
  },

  addChat(e) {
    this.chat.push(e);
    if (this.chat.length > 80) this.chat.shift();
    if (!e.sys && e.id !== this.me()) HR.Audio.play('blip');
    this.renderChat();
    // während eines Spiels erscheint die Nachricht kurz unten
    if ((this.ctl || (this.P && this.P.phase === 'play')) && !e.sys) UI.toast(e.name + ': ' + e.text);
  },

  // ---------- Einstellungen (nur Gastgeber) ----------
  set(key, val) {
    const P = this.P; if (!P || !P.host || P.phase !== 'lobby') return;
    if (P.solo && (key === 'max' || key === 'diff')) {
      if (key === 'max') P.max = U.clamp(P.max + val, 2, 8);
      else { Game.diff = U.clamp(Game.diff + val, 0, 2); Game.save(); }
      this.fillBots(); this.refresh(); return;
    }
    if (key === 'max') P.max = U.clamp(P.max + val, Math.max(2, P.players.length), 8);
    if (key === 'rounds') P.rounds = U.clamp(P.rounds + val, 1, 20);
    if (key === 'pick') P.pick = val;
    if (key === 'toggle') { P.picks = P.picks.includes(val) ? P.picks.filter(c => c !== val) : HR.GAME_ORDER.filter(c => c === val || P.picks.includes(c)); }
    if (key === 'all') P.picks = val ? HR.GAME_ORDER.slice() : [];
    HR.Net.limit = P.max;
    this.changed();
  },

  cycleColor(id) {
    const P = this.P, p = this.player(id); if (!p || P.phase !== 'lobby') return;
    if (P.solo) { p.color = (p.color + 1) % 8; this.fillBots(); this.refresh(); return; }
    const used = P.players.filter(x => x !== p).map(x => x.color);
    for (let k = 1; k <= 8; k++) { const c = (p.color + k) % 8; if (!used.includes(c)) { p.color = c; break; } }
    this.changed();
  },

  myColor() { if (this.P.host) this.cycleColor(0); else HR.Net.send({ t: 'pcolor' }); },

  // ---------- Ablauf ----------
  start() {
    const P = this.P; if (!P.host) return;
    // Zufällig: Spielliste mit jedem Spiel einmal in zufälliger Reihenfolge, dann von vorn, ohne direkte Wiederholung.
    // Auswählen: der Gastgeber wählt vor jeder Runde, die Liste füllt sich dabei.
    const list = [];
    while (P.pick === 'random' && list.length < P.rounds) {
      let bag = U.shuffle(HR.GAME_ORDER);
      if (list.length && bag[0] === list[list.length - 1]) bag.push(bag.shift());
      list.push(...bag);
    }
    P.playlist = list.slice(0, P.rounds);
    P.scores = {}; for (const p of P.players) P.scores[p.id] = 0;
    P.round = 0; P.last = null;
    this.sys('Die Party beginnt: ' + P.rounds + (P.rounds === 1 ? ' Runde.' : ' Runden.'));
    this.nextRound();
  },

  nextRound() {
    const P = this.P;
    if (P.round >= P.rounds) { P.phase = 'final'; this.changed(); this.show(); return; }
    P.round += 1;
    P.ready = [];
    if (P.pick === 'pick') { P.current = null; P.phase = 'choose'; }
    else { P.current = P.playlist[P.round - 1]; P.phase = 'intro'; }
    this.broadcastState();
    this.show();
  },

  // Gastgeber wählt das Minispiel der nächsten Runde
  choose(code) {
    const P = this.P;
    if (!P.host || P.phase !== 'choose' || !HR.GAMES[code]) return;
    P.current = code;
    P.playlist = P.playlist.slice(0, P.round - 1).concat([code]);
    P.phase = 'intro';
    this.sys(Party.hostName() + ' hat ' + HR.GAMES[code].name + ' gewählt.');
    this.broadcastState();
    this.show();
  },

  ready() {
    if (!this.P || this.P.phase !== 'intro') return;
    if (this.P.solo) { this.P.ready = this.P.players.map(p => p.id); this.checkReady(); return; }
    if (this.P.host) this.setReady(0); else HR.Net.send({ t: 'pready' });
    const b = UI.el.querySelector('[data-act="pready"]'); if (b) { b.disabled = true; b.textContent = 'Warte auf die anderen …'; }
  },

  setReady(id) {
    const P = this.P; if (P.phase !== 'intro' || P.ready.includes(id) || !this.player(id)) return;
    P.ready.push(id);
    HR.Audio.play('blip');
    this.changed();
    this.checkReady();
  },

  checkReady() {
    const P = this.P;
    if (P.phase !== 'intro' || !P.players.length) return;
    if (P.players.every(p => P.ready.includes(p.id))) setTimeout(() => this.go(), 400);
  },

  go() {
    const P = this.P; if (!P.host || P.phase !== 'intro') return;
    const def = HR.GAMES[P.current];
    const seed = Math.floor(Math.random() * 2 ** 31);
    const players = P.players.map(p => ({ id: p.id, name: p.name, color: p.color, car: p.car, ai: p.ai, skill: p.skill }));
    const setup = def.setup ? def.setup(players, seed) : null;
    P.phase = 'play';
    this.broadcastState();
    const m = { t: 'pgo', code: P.current, seed, players, setup };
    HR.Net.broadcast(m);
    this.startGame(m);
  },

  startGame(m) {
    this.stopGame();
    const def = HR.GAMES[m.code];
    UI.hide();
    this.screen = 'play';
    HR.Audio.init();
    const ctx = { party: this, code: m.code, seed: m.seed, players: m.players, setup: m.setup, host: this.P.host, me: this.P.myId };
    this.ctl = def.create(ctx);
    this.ctl.onEnd = ranking => this.roundEnd(ranking);
    this.ctl.start();
    Game.requestWakeLock();
  },

  stopGame() {
    if (this.ctl) { try { this.ctl.stop(); } catch (e) { console.warn(e); } }
    this.ctl = null; this.arena = null;
    HR.Input.actKeys = false;
    HR.Audio.stopEngines();
  },

  // ranking: [{id, s, txt}] beste zuerst; gleiches s = gleicher Platz
  roundEnd(ranking) {
    const P = this.P; if (!P || !P.host || P.phase !== 'play') return;
    const rows = ranking.filter(r => this.player(r.id));
    let place = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.s !== rows[i - 1].s) place = i;
      r.place = place + 1;
      r.pts = HR.POINTS[place] || 0;
      P.scores[r.id] = (P.scores[r.id] || 0) + r.pts;
    });
    P.last = { code: P.current, rows };
    P.phase = 'round';
    this.stopGame();
    Game.startDemo();
    this.broadcastState();
    this.show();
  },

  // Spiel unterbrechen und zurück in die Lobby (nur Gastgeber)
  toLobby() {
    const P = this.P; if (!P.host) return;
    this.stopGame();
    P.phase = 'lobby'; P.round = 0; P.ready = []; P.current = null;
    this.broadcastState();
    Game.startDemo();
    this.show();
  },

  // ---------- Spielverlauf während eines Rennens ----------
  standings() {
    const P = this.P;
    return P.players.slice().sort((a, b) => (P.scores[b.id] || 0) - (P.scores[a.id] || 0) || a.id - b.id);
  },

  // ---------- Bildschirme ----------
  show() {
    const P = this.P; if (!P) return;
    if (P.phase === 'play') { if (!this.ctl) this.screen = null; return; }
    if (!Game.race || !Game.race.demo) Game.startDemo();
    this.screen = P.phase + ':' + P.round;
    PUI[P.phase]();
  },

  refresh() {
    const P = this.P; if (!P || !this.screen || P.phase === 'play') return;
    if (PUI.refresh[P.phase]) PUI.refresh[P.phase]();
  },

  renderChat() {
    const log = document.getElementById('pchatlog'); if (!log) return;
    log.innerHTML = this.chat.map(e => e.sys ? `<p class="sys">${UI.esc(e.text)}</p>`
      : `<p><b style="color:${U.rgb(HR.PARTY_COLORS[e.color || 0])}">${UI.esc(e.name)}:</b> ${UI.esc(e.text)}</p>`).join('');
    log.scrollTop = log.scrollHeight;
  },
};

// ======================================================================
// Party-Bildschirme
// ======================================================================
const PUI = HR.PUI = {
  dot(p) { return `<span class="pdot" style="background:${U.rgb(Party.color(p))}"></span>`; },

  chatBox() {
    return `<section class="pchat"><h3>Chat</h3><div id="pchatlog" class="chatlog" aria-live="polite"></div>
      <form id="pchatform" class="chatform" autocomplete="off"><input id="pchatin" maxlength="200" placeholder="Nachricht schreiben …" enterkeyhint="send"><button type="submit">Senden</button></form></section>`;
  },

  bindChat() {
    const f = document.getElementById('pchatform'); if (!f) return;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const i = document.getElementById('pchatin');
      Party.sendChat(i.value); i.value = '';
    });
    Party.renderChat();
  },

  frame(title, sub, body) {
    const P = Party.P;
    UI.show(`<div class="panel wide party">
      <header><button class="backbtn" data-act="pleave">‹ ${P.solo ? 'Beenden' : 'Verlassen'}</button><div class="ptitle"><h2>${title}</h2>${sub ? `<span>${sub}</span>` : ''}</div>
        ${P.solo ? '' : `<span class="codepill">Code <b>${P.code}</b></span>`}</header>
      <div class="pgrid"><div class="pmain">${body}</div><div class="pside"><section><h3>Spieler <span id="pcount"></span></h3><ul class="players" id="pplayers"></ul></section>${P.solo ? '' : this.chatBox()}</div></div>
    </div>`, null);
    this.bindChat();
    this.players();
  },

  players() {
    const P = Party.P, ul = document.getElementById('pplayers'); if (!ul) return;
    const phase = P.phase;
    ul.innerHTML = P.players.map(p => {
      let right = p.ai ? '<small>Computer</small>' : p.id === 0 && !P.solo ? '<small>Gastgeber</small>' : '';
      if (phase === 'intro') right = P.ready.includes(p.id) ? '<small class="ok">✓ bereit</small>' : '<small class="wait">liest …</small>';
      if (phase === 'round' || phase === 'final') right = `<small>${P.scores[p.id] || 0} Pkt.</small>`;
      const me = p.id === P.myId;
      const dot = me && phase === 'lobby' ? `<button class="pdot btn" data-act="pcolor" title="Farbe wechseln" aria-label="Farbe wechseln" style="background:${U.rgb(Party.color(p))}"></button>` : this.dot(p);
      return `<li class="${me ? 'me' : ''}">${dot}<b>${UI.esc(p.name)}</b>${right}</li>`;
    }).join('');
    const c = document.getElementById('pcount'); if (c) c.textContent = phase === 'lobby' && !P.solo ? `(${P.players.length}/${P.max})` : `(${P.players.length})`;
    UI.bind(ul);
  },

  // --- Lobby: alle sehen die Einstellungen des Gastgebers ---
  lobby() {
    this.frame(Party.P.solo ? 'Singleplayer' : 'Party-Lobby', Party.P.solo ? 'Minispiele gegen Computergegner' : '', '<div id="pset"></div>');
    this.settings();
  },

  settings() {
    const P = Party.P, el = document.getElementById('pset'); if (!el) return;
    const host = P.host, dis = host ? '' : 'disabled';
    const focus = document.activeElement && el.contains(document.activeElement) ? [document.activeElement.dataset.act, document.activeElement.dataset.arg] : null;
    const step = (key, label, val) => `<div class="pstep"><span>${label}</span>
      <button class="arrow small" data-act="pset" data-arg="${key}:-1" ${dis} aria-label="${label} weniger">◄</button><b>${val}</b>
      <button class="arrow small" data-act="pset" data-arg="${key}:1" ${dis} aria-label="${label} mehr">►</button></div>`;
    const games = HR.GAME_ORDER.map(c => {
      const g = HR.GAMES[c];
      return `<button class="gchip auto" disabled>${g ? g.name : c}</button>`;
    }).join('');
    const n = HR.GAME_ORDER.length;
    el.innerHTML = `
      <h3>Einstellungen</h3>
      ${P.solo ? step('max', 'Gegner', P.max - 1) + step('diff', 'Stärke', HR.DIFFS[Game.diff][0]) : step('max', 'Spieler', P.max)}
      ${step('rounds', 'Runden', P.rounds)}
      <div class="pstep"><span>Minispiele</span><div class="seg">
        <button class="${P.pick === 'random' ? 'on' : ''}" data-act="ppick" data-arg="random" ${dis}>Zufällig</button>
        <button class="${P.pick === 'pick' ? 'on' : ''}" data-act="ppick" data-arg="pick" ${dis}>Auswählen</button></div></div>
      <p class="note">${P.pick === 'random' ? `Jede Runde kommt ein zufälliges Spiel aus allen ${n} Minispielen.` : `Vor jeder Runde wählt ${host ? 'du' : UI.esc(Party.hostName())} eines der ${n} Minispiele aus.`}</p>
      <div class="games">${games}</div>
      ${P.solo ? `<nav class="list row"><button class="hot" data-act="pstart">Starten</button></nav>
        <p class="note">Lieber ein normales Rennen? <button class="link" data-act="soloRace">Freies Rennen fahren</button></p>`
      : host ? `<nav class="list row"><button class="hot" data-act="pstart">Party starten</button></nav>
        <p class="note">Die anderen tippen auf <b>Party → Beitreten</b> und geben den Code <b>${P.code}</b> ein.</p>`
        : `<p class="note wait">Nur ${UI.esc(Party.hostName())} kann die Einstellungen ändern. Warte, bis die Party startet …</p>`}`;
    UI.bind(el);
    if (focus) { const b = el.querySelector(`[data-act="${focus[0]}"]${focus[1] != null ? `[data-arg="${focus[1]}"]` : ''}`); if (b && !b.disabled) b.focus({ preventScroll: true }); }
    else if (host && !UI.el.contains(document.activeElement)) { const b = el.querySelector('[data-act="pstart"]'); if (b) b.focus({ preventScroll: true }); }
  },

  // --- Minispiel für die nächste Runde wählen (Modus "Auswählen") ---
  choose() {
    const P = Party.P, host = P.host;
    const cards = HR.GAME_ORDER.map(c => {
      const g = HR.GAMES[c], n = P.playlist.filter(x => x === c).length;
      return `<button class="gcard" data-act="pchoose" data-arg="${c}" ${host ? '' : 'disabled'}>
        <i>${g.kind === 'race' ? 'Fahrspiel' : 'Arena-Spiel'}</i><strong>${g.name}</strong><span>${g.short || ''}</span>${n ? `<small>schon ${n}× gespielt</small>` : ''}</button>`;
    }).join('');
    const body = `${host ? `<p class="note">Tippe auf das Minispiel für diese Runde.${P.solo ? '' : ' Alle sehen deine Auswahl.'}</p>`
      : `<p class="note wait">${UI.esc(Party.hostName())} wählt gerade das Minispiel für diese Runde …</p>`}<div class="gcards">${cards}</div>`;
    this.frame('Minispiel wählen', `Runde ${P.round} von ${P.rounds}`, body);
    if (host) { const b = UI.el.querySelector('.gcard'); if (b) b.focus({ preventScroll: true }); }
  },

  // --- Spielbeschreibung vor jeder Runde ---
  intro() {
    const P = Party.P, def = HR.GAMES[P.current];
    const touch = HR.Input.touchMode;
    const body = `<div class="intro">
      <p class="gcode">${def.kind === 'race' ? 'Fahrspiel' : 'Arena-Spiel'}</p>
      <p class="gdesc">${def.desc}</p>
      <h3>Ziel</h3><p>${def.goal}</p>
      <h3>Steuerung</h3>
      <div class="ctrl"><div class="${touch ? 'cur' : ''}"><b>Touch</b><span>${def.touch}</span></div><div class="${touch ? '' : 'cur'}"><b>Tastatur</b><span>${def.keys}</span></div></div>
      <nav class="list row"><button class="hot" data-act="pready" ${P.ready.includes(P.myId) ? 'disabled' : 'autofocus'}>${P.ready.includes(P.myId) ? 'Warte auf die anderen …' : P.solo ? 'Los!' : 'Bereit!'}</button></nav>
      <p class="note" id="preadynote"></p></div>`;
    this.frame(def.name, `Runde ${P.round} von ${P.rounds}`, body);
    this.refresh.intro();
  },

  // --- Ergebnis einer Runde ---
  round() {
    const P = Party.P, last = P.last, def = HR.GAMES[last.code];
    const rows = last.rows.map(r => { const p = Party.player(r.id) || { name: '?', color: 0 };
      return `<tr class="${r.id === P.myId ? 'me' : ''}"><td>${r.place}.</td><td>${this.dot(p)}${UI.esc(p.name)}</td><td>${UI.esc(r.txt || '')}</td><td class="num">+${r.pts}</td></tr>`; }).join('');
    const stand = Party.standings().map((p, i) => `<tr class="${p.id === P.myId ? 'me' : ''}"><td>${i + 1}.</td><td>${this.dot(p)}${UI.esc(p.name)}</td><td class="num">${P.scores[p.id] || 0}</td></tr>`).join('');
    const lastRound = P.round >= P.rounds;
    const body = `<div class="tablewrap"><table class="res"><thead><tr><th>#</th><th>Spieler</th><th>Ergebnis</th><th class="num">Punkte</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h3>Gesamtwertung</h3><div class="tablewrap"><table class="res"><tbody>${stand}</tbody></table></div>
      ${P.host ? `<nav class="list row"><button class="hot" data-act="pnext" autofocus>${lastRound ? 'Zur Siegerehrung' : 'Nächste Runde'}</button></nav><p class="note" id="pauto"></p>`
        : `<p class="note wait">${UI.esc(Party.hostName())} startet gleich ${lastRound ? 'die Siegerehrung' : 'die nächste Runde'} …</p>`}`;
    this.frame('Ergebnis: ' + def.name, `Runde ${P.round} von ${P.rounds}`, body);
    HR.Audio.play('finish');
    if (P.host) {
      // nach 20 Sekunden geht es von selbst weiter
      let left = 20;
      clearInterval(this._auto);
      const tick = () => {
        const n = document.getElementById('pauto');
        if (!n || Party.P !== P || P.phase !== 'round') { clearInterval(this._auto); return; }
        n.textContent = `Geht in ${left} s automatisch weiter.`;
        if (left-- <= 0) { clearInterval(this._auto); Party.nextRound(); }
      };
      tick(); this._auto = setInterval(tick, 1000);
    }
  },

  // --- Siegerehrung ---
  final() {
    const P = Party.P, st = Party.standings();
    const pod = [1, 0, 2].map(i => { const p = st[i]; if (!p) return '<div class="pod empty"></div>';
      return `<div class="pod p${i + 1}"><span class="pname">${this.dot(p)}${UI.esc(p.name)}</span><span class="ppts">${P.scores[p.id] || 0} Punkte</span><div class="block">${i + 1}</div></div>`; }).join('');
    const rest = st.map((p, i) => `<tr class="${p.id === P.myId ? 'me' : ''}"><td>${i + 1}.</td><td>${this.dot(p)}${UI.esc(p.name)}</td><td class="num">${P.scores[p.id] || 0} Pkt.</td></tr>`).join('');
    const body = `<p class="champ">${st[0] ? UI.esc(st[0].name) + ' gewinnt die Party!' : ''}</p><div class="podium">${pod}</div>
      <div class="tablewrap"><table class="res"><tbody>${rest}</tbody></table></div>
      ${P.host ? `<nav class="list row"><button class="hot" data-act="plobby" autofocus>${P.solo ? 'Nochmal spielen' : 'Neue Party-Runde'}</button><button data-act="pleave">${P.solo ? 'Beenden' : 'Party beenden'}</button></nav>`
        : `<p class="note wait">${UI.esc(Party.hostName())} entscheidet, ob es weitergeht.</p>`}`;
    this.frame('Siegerehrung', `${P.rounds} Runde${P.rounds === 1 ? '' : 'n'} gespielt`, body);
    HR.Audio.play('finish');
  },
};

PUI.refresh = {
  lobby() { PUI.players(); PUI.settings(); },
  intro() {
    PUI.players();
    const P = Party.P, n = document.getElementById('preadynote');
    if (n && P.solo) n.textContent = '';
    else if (n) { const wait = P.players.filter(p => !P.ready.includes(p.id)).map(p => p.name); n.textContent = wait.length ? 'Warte auf: ' + wait.join(', ') : 'Alle bereit – los geht’s!'; }
  },
  choose() { PUI.players(); },
  round() { PUI.players(); },
  final() { PUI.players(); },
};

Object.assign(UI.acts, {
  party() { UI.party(); },
  pcreate() { UI.acts.readName(); Party.create(); },
  pjoin() {
    UI.acts.readName();
    const c = (UI.el.querySelector('#jcode').value || '').replace(/\D/g, '');
    if (c.length !== 4) { const e = UI.el.querySelector('#err'); e.textContent = 'Bitte den 4-stelligen Code eingeben.'; e.hidden = false; return; }
    Party.join(c);
  },
  pleave() { Party.leave(); },
  pset(a) { const [k, d] = a.split(':'); Party.set(k, +d); },
  ppick(v) { Party.set('pick', v); },
  ptoggle(c) { Party.set('toggle', c); },
  pall(v) { Party.set('all', v === '1'); },
  pstart() { Party.start(); },
  pchoose(c) { Party.choose(c); },
  pready() { Party.ready(); },
  pnext() { clearInterval(PUI._auto); Party.nextRound(); },
  plobby() { Party.toLobby(); },
  pcolor() { Party.myColor(); },
  presume() { Game.paused = false; UI.hide(); },
  solo() { Party.createSolo(); },
  soloRace() { Party.reset(); Game.startDemo(); UI.acts.mode('race'); },
  pabort() { Party.toLobby(); },
});

// Startbildschirm des Party-Modus
UI.party = function () {
  const s = Game.settings, key = HR.Net.getKey();
  if (!HR.Net.available()) { this.error('Der Party-Modus konnte nicht geladen werden. Ist das Gerät mit dem Internet verbunden?', () => this.main()); return; }
  UI._keyBack = () => UI.party();
  this.show(`<div class="panel narrow"><header><button class="backbtn" data-act="back">‹ Zurück</button><h2>Party</h2></header>
    <p class="note">Bis zu 8 Spieler, jeder auf seinem eigenen Gerät. Mehrere Runden mit wechselnden Minispielen, am Ende gibt es eine Siegerehrung.</p>
    <label class="field"><span>Dein Name</span><input id="pname" maxlength="16" value="${this.esc(s.name)}" autocomplete="off"></label>
    <nav class="list"><button data-act="pcreate" autofocus>Party eröffnen</button></nav>
    <div class="join">
      <label class="field"><span>Code einer Party</span><input id="jcode" inputmode="numeric" maxlength="4" placeholder="1234" autocomplete="off"></label>
      <button data-act="pjoin">Beitreten</button>
    </div>
    <p class="note"><button class="link" data-act="keyform">Verbindungseinstellungen</button></p>
    <p class="error" id="err" hidden></p></div>`, () => this.main());
  this.el.querySelector('#jcode').addEventListener('keydown', e => { if (e.key === 'Enter') UI.acts.pjoin(); });
  this.el.querySelector('#pname').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
};

// Menü während eines Party-Spiels
UI.partyPause = function () {
  const host = Party.isHost(), solo = Party.P.solo;
  if (solo) { Game.paused = true; HR.Audio.silence(); }
  this.show(`<div class="panel narrow"><h2>${solo ? 'PAUSE' : 'MENÜ'}</h2>${solo ? '' : '<p class="note">Das Spiel läuft weiter.</p>'}
    <nav class="list">
      <button data-act="presume" autofocus>Weiter</button>
      <button data-act="sound">${Game.settings.sound ? 'Ton aus' : 'Ton an'}</button>
      ${host ? `<button data-act="pabort">Runde abbrechen (zur ${solo ? 'Auswahl' : 'Lobby'})</button>` : ''}
      <button data-act="pleave">${solo ? 'Beenden' : 'Party verlassen'}</button>
    </nav></div>`, () => UI.acts.presume());
};
