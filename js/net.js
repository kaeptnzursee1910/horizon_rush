// Horizon Rush – Online-Multiplayer über WebRTC (PeerJS)
// Die Relay-Zugangsdaten stehen nicht im Code. Jedes Gerät gibt sie einmal ein,
// sie bleiben nur im Speicher dieses Browsers.
'use strict';

HR.Net = {
  PREFIX: 'horizonrush-v1-',
  prefix: 'horizonrush-v1-',  // aktuelles Präfix (Rennen oder Party)
  limit: 8,                   // maximale Spielerzahl inklusive Gastgeber
  peer: null, isHost: false, conns: new Map(), hostConn: null, code: null,
  myId: null, onMsg: null, onDrop: null, nextId: 1,

  KEY_STORE: 'hr_online_key',
  MODE_STORE: 'hr_conn_mode',
  // Verbindungsweg: 'direct' = nur direkt (spart Server-Verkehr), 'auto' = direkt mit Server als Ausweichweg,
  // 'relay' = immer über den Verbindungsserver (TURN),
  // 'hotspot' = alle Geräte im Hotspot des Gastgebers (wie 'auto', zusätzlich reisen Name und Passwort des Hotspots im Link mit)
  MODES: { direct: 'Direkt (P2P)', auto: 'Automatisch', relay: 'Über Server', hotspot: 'Hotspot' },
  HOT_STORE: 'hr_hotspot',
  getHotspot() {
    try { const h = JSON.parse(localStorage.getItem(this.HOT_STORE) || 'null'); return h && h.ssid ? h : null; } catch (_) { return null; }
  },
  setHotspot(ssid, pass) {
    try { if (ssid) localStorage.setItem(this.HOT_STORE, JSON.stringify({ ssid, pass: pass || '' })); else localStorage.removeItem(this.HOT_STORE); } catch (_) { }
  },
  // Inhalt für einen WLAN-QR-Code: die Kamera von iPad, iPhone und Android verbindet sich damit direkt
  wifiCode(h) {
    const e = s => String(s).replace(/([\\;,:"])/g, '\\$1');
    return 'WIFI:T:' + (h.pass ? 'WPA' : 'nopass') + ';S:' + e(h.ssid) + ';' + (h.pass ? 'P:' + e(h.pass) + ';' : '') + ';';
  },
  getMode() {
    try { const m = localStorage.getItem(this.MODE_STORE); return this.MODES[m] ? m : 'auto'; } catch (_) { return 'auto'; }
  },
  setMode(m) {
    try { if (this.MODES[m]) localStorage.setItem(this.MODE_STORE, m); } catch (_) { }
  },
  // Ist der gewählte Weg möglich?
  modeProblem() {
    if (this.getMode() === 'relay' && !this.getKey()) return 'Für „Über Server“ werden Zugangsdaten für den Verbindungsserver benötigt (Verbindungseinstellungen).';
    return null;
  },
  getKey() {
    try { return JSON.parse(localStorage.getItem(this.KEY_STORE) || 'null'); } catch (_) { return null; }
  },
  setKey(user, pass) {
    try { if (user && pass) localStorage.setItem(this.KEY_STORE, JSON.stringify({ user, pass })); else localStorage.removeItem(this.KEY_STORE); } catch (_) { }
  },

  iceServers() {
    const mode = this.getMode();
    const ice = mode === 'relay' ? [] : [{ urls: 'stun:stun.relay.metered.ca:80' }, { urls: 'stun:stun.l.google.com:19302' }];
    const k = this.getKey();
    if (k && mode !== 'direct') {
      for (const u of ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp',
        'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp']) {
        ice.push({ urls: u, username: k.user, credential: k.pass });
      }
    }
    return ice;
  },

  available() { return typeof window.Peer === 'function'; },

  makePeer(id) {
    const relay = this.getMode() === 'relay';
    const opts = Object.assign({ debug: 0, config: { iceServers: this.iceServers(), iceTransportPolicy: relay ? 'relay' : 'all' } }, window.HR_PEER_SERVER || {});
    return id ? new Peer(id, opts) : new Peer(opts);
  },

  host(cb, prefix) {
    this.close();
    this.prefix = prefix || this.PREFIX;
    this.isHost = true; this.myId = 0; this.nextId = 1;
    const tryCode = (attempt) => {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const p = this.makePeer(this.prefix + code);
      let opened = false;
      // PeerJS meldet "open" nach jeder Neuanmeldung beim Vermittlungsserver erneut. Nur das erste Mal zählt,
      // sonst würde der Gastgeber nach einem kurzen Netzaussetzer eine neue, leere Party/Lobby anlegen.
      p.on('open', () => {
        if (opened) { if (this.peer === p) HR.NetLog.info('', 'Wieder beim Vermittlungsserver angemeldet' + (this._dcAt ? ' nach ' + HR.NetLog.secs(Date.now() - this._dcAt) : '') + '. Neue Mitspieler können wieder beitreten.'); this._dcAt = 0; this._dcLogged = false; return; }
        opened = true; this.peer = p; this.code = code;
        HR.NetLog.start((this.prefix === this.PREFIX ? 'Online-Rennen' : 'Party') + ' ' + code + ' eröffnet (dieses Gerät ist Gastgeber)');
        cb(null, code);
      });
      p.on('error', e => {
        if (!opened && e.type === 'unavailable-id' && attempt < 5) { p.destroy(); tryCode(attempt + 1); return; }
        if (!opened) { HR.NetLog.error('', 'Eröffnen fehlgeschlagen: ' + ((e && e.type) || '') + ' ' + ((e && e.message) || '')); cb(this.errText(e)); }
        else if (e.type !== 'peer-unavailable') { console.warn('Netz', e); if (this.peer === p && !(this._dcAt && e.type === 'network' && this._dcLogged)) { if (this._dcAt) this._dcLogged = true; HR.NetLog.warn('', 'Fehler beim Vermittlungsserver: ' + ((e && e.type) || '') + ' ' + ((e && e.message) || '')); } }
      });
      p.on('disconnected', () => {
        if (this.peer === p && !this._dcAt) { this._dcAt = Date.now(); HR.NetLog.warn('', 'Verbindung zum Vermittlungsserver verloren. Laufende Spiele gehen weiter, aber neue Mitspieler finden die Party gerade nicht. Melde neu an …'); }
        this.keepAlive(p);
      });
      p.on('connection', conn => this.acceptConn(conn));
    };
    tryCode(0);
  },

  // Der Gastgeber muss beim Vermittlungsserver angemeldet bleiben, sonst finden neue Mitspieler
  // seinen Code nicht mehr. Nach einem Abbruch (Standby, WLAN-Wechsel) immer wieder neu anmelden.
  keepAlive(p) {
    clearTimeout(this._ka);
    if (this.peer !== p || p.destroyed || !p.disconnected) return;
    try { p.reconnect(); } catch (_) { }
    this._ka = setTimeout(() => this.keepAlive(p), 4000);
  },

  acceptConn(conn) {
    conn.on('open', () => {
      if (this.conns.size >= this.limit - 1) { HR.NetLog.info('', 'Beitritt abgelehnt: schon voll (' + this.limit + ').'); conn.send({ t: 'full', max: this.limit }); setTimeout(() => conn.close(), 300); return; }
      const id = this.nextId++;
      conn.hrId = id;
      this.conns.set(id, conn);
      HR.NetLog.attach(conn, id);
      HR.NetLog.info('Gerät (#' + id + ')', 'Neues Gerät verbunden.');
      conn.on('data', d => { if (HR.NetLog.onData(d, id)) return; if (this.onMsg) this.onMsg(d, id); });
      conn.on('close', () => this.drop(id, 'Verbindung wurde geschlossen'));
      conn.on('error', e => this.drop(id, 'Fehler ' + ((e && (e.type || e.message)) || '')));
      this.watchIce(conn, s => this.drop(id, 'Netzwerkstatus ' + s));
      conn.send({ t: 'welcome', id });
    });
  },

  drop(id, why) {
    if (!this.conns.has(id)) return;
    HR.NetLog.detach(id, why || 'unbekannt');
    this.conns.delete(id);
    if (this.onDrop) this.onDrop(id);
  },

  join(code, cb, prefix, attempt) {
    attempt = attempt || 0;
    this.close();
    this.prefix = prefix || this.PREFIX;
    this.isHost = false;
    const p = this.makePeer();
    let done = false;
    const fail = msg => { if (done) return; done = true; HR.NetLog.error('', 'Beitreten fehlgeschlagen: ' + msg); cb(msg); this.close(); };
    HR.NetLog.start((this.prefix === this.PREFIX ? 'Online-Rennen ' : 'Party ') + code + ' beitreten (dieses Gerät ist Gast)' + (attempt ? ', 2. Versuch' : ''));
    const timer = setTimeout(() => fail('Keine Verbindung zum Gastgeber. Bitte den Code prüfen und es erneut versuchen.'), 20000);
    p.on('open', () => {
      this.peer = p;
      HR.NetLog.info('', 'Beim Vermittlungsserver angemeldet, verbinde mit dem Gastgeber …');
      const conn = p.connect(this.prefix + code, { reliable: true, serialization: 'json' });
      const t0 = Date.now();
      HR.NetLog.attach(conn, 0, why => lost(why));
      conn.on('data', d => {
        if (HR.NetLog.onData(d, 0)) return;
        if (d.t === 'welcome' && !done) { done = true; clearTimeout(timer); this.myId = d.id; this.hostConn = conn; this.code = code; HR.NetLog.info('', 'Verbunden als Gerät #' + d.id + ' (Aufbau ' + HR.NetLog.secs(Date.now() - t0) + ').'); cb(null, d.id); return; }
        if (d.t === 'full') { clearTimeout(timer); fail('Hier ist schon alles voll (maximal ' + (d.max || HR.MAX_ONLINE) + ' Spieler).'); return; }
        if (this.onMsg) this.onMsg(d, 0);
      });
      const lost = why => { if (done && this.hostConn === conn) { HR.NetLog.detach(0, why); this.hostConn = null; if (this.onDrop) this.onDrop(0); } };
      conn.on('close', () => lost('Verbindung wurde geschlossen'));
      conn.on('error', e => lost('Fehler ' + ((e && (e.type || e.message)) || '')));
      this.watchIce(conn, s => lost('Netzwerkstatus ' + s));
    });
    p.on('error', e => {
      clearTimeout(timer);
      // Code noch nicht gefunden: kurz warten und es noch einmal versuchen (der Gastgeber meldet sich evtl. gerade neu an)
      if (!done && e.type === 'peer-unavailable' && attempt < 1) { done = true; this.close(); setTimeout(() => this.join(code, cb, prefix, attempt + 1), 2000); return; }
      if (!done) { HR.NetLog.warn('', 'Fehler: ' + ((e && e.type) || '?') + ' ' + ((e && e.message) || '')); fail(this.errText(e)); }
      // Nach dem Beitritt läuft das Spiel direkt zwischen den Geräten. Ein Abbruch zum Vermittlungsserver
      // (Fehler "network") ist dann kein Grund, die Party zu verlassen: früher flogen dadurch alle Gäste raus,
      // obwohl ihre Verbindung zum Gastgeber noch stand. Echte Abbrüche melden "close" oder der Netzwerkstatus.
      else if (this.peer === p) HR.NetLog.info('', 'Meldung vom Vermittlungsserver: ' + ((e && e.type) || '') + ' ' + ((e && e.message) || '') + ' (Spielverbindung bleibt bestehen).');
    });
    p.on('disconnected', () => { if (this.peer === p) HR.NetLog.info('', 'Verbindung zum Vermittlungsserver getrennt (für Gäste unkritisch, das Spiel läuft direkt weiter).'); });
  },

  // tatsächlich genutzter Weg einer Verbindung: 'direct' oder 'relay' (null = noch unbekannt)
  async connType(conn) {
    const pc = conn && conn.peerConnection;
    if (!pc || !pc.getStats) return null;
    try {
      const st = await pc.getStats();
      let pair = null;
      st.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
      if (!pair) st.forEach(r => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
      if (!pair) return null;
      const l = st.get(pair.localCandidateId), rm = st.get(pair.remoteCandidateId);
      return (l && l.candidateType === 'relay') || (rm && rm.candidateType === 'relay') ? 'relay' : 'direct';
    } catch (_) { return null; }
  },

  // Gastgeber: Weg jeder Verbindung in die Spielerliste eintragen; true, wenn sich etwas geändert hat
  async measureVia(players) {
    let changed = false;
    for (const [id, conn] of this.conns) {
      const t = await this.connType(conn);
      const p = players && players.find(x => x.id === id);
      if (p && t && p.via !== t) { p.via = t; changed = true; }
      const ms = HR.NetLog.pingOf(id);
      if (p && ms != null && (p.ping == null || Math.abs(p.ping - ms) >= Math.max(15, p.ping * 0.25))) { p.ping = ms; changed = true; }
    }
    return changed;
  },

  watchIce(conn, onDead) {
    const pc = conn.peerConnection;
    if (!pc) return;
    pc.addEventListener('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') onDead(pc.iceConnectionState);
    });
  },

  errText(e) {
    switch (e && e.type) {
      case 'peer-unavailable': return (this.prefix === this.PREFIX ? 'Kein Rennen mit diesem Code gefunden.' : 'Keine Party mit diesem Code gefunden.') + (this.getMode() === 'hotspot' ? ' Bist du mit dem Hotspot des Gastgebers verbunden?' : '');
      case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
        return 'Keine Verbindung zum Vermittlungsserver. Ist das Gerät online?' + (this.getMode() === 'hotspot' ? ' Prüfe, ob du mit dem Hotspot verbunden bist und ob beim Hotspot-Gerät mobile Daten an sind.' : '');
      case 'browser-incompatible': return 'Dieser Browser unterstützt kein WebRTC.';
      default: return 'Verbindungsfehler: ' + ((e && (e.type || e.message)) || 'unbekannt');
    }
  },

  send(msg) { // Gast -> Gastgeber
    if (this.hostConn && this.hostConn.open) try { this.hostConn.send(msg); HR.NetLog.out(0); } catch (e) { HR.NetLog.sendFail(0, e); }
  },
  broadcast(msg, except) { // Gastgeber -> alle
    for (const [id, c] of this.conns) if (id !== except && c.open) try { c.send(msg); HR.NetLog.out(id); } catch (e) { HR.NetLog.sendFail(id, e); }
  },
  sendTo(id, msg) { const c = this.conns.get(id); if (c && c.open) try { c.send(msg); HR.NetLog.out(id); } catch (e) { HR.NetLog.sendFail(id, e); } },

  active() { return !!this.peer && (this.isHost || !!this.hostConn); },

  close() {
    if (this.peer) HR.NetLog.stop('Sitzung beendet (Verbindung geschlossen).');
    for (const c of this.conns.values()) try { c.close(); } catch (_) { }
    this.conns.clear();
    if (this.hostConn) try { this.hostConn.close(); } catch (_) { }
    this.hostConn = null;
    if (this.peer) try { this.peer.destroy(); } catch (_) { }
    this.peer = null; this.code = null; this.isHost = false; this.myId = null; this.limit = HR.MAX_ONLINE;
  },
};
