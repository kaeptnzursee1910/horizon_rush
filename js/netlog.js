// Horizon Rush – Verbindungslog für Mehrspieler-Partys und Online-Rennen
// Jedes Gerät schreibt mit, was mit seinen Verbindungen passiert: Ping (Antwortzeit), Funkstille (keine Daten),
// Verbindungsabbrüche, Wechsel des Verbindungswegs, Hänger des eigenen Geräts, Hintergrund/Standby.
// Das Log bleibt im Speicher des Browsers (auch nach einem Absturz oder Neuladen) und lässt sich
// herunterladen, teilen oder kopieren. Der Gastgeber kann die Logs aller verbundenen Geräte einsammeln
// und als eine Datei mit gemeinsamer Zeitleiste speichern.
// Zugangsdaten (Verbindungsserver, Hotspot-Passwort) landen nie im Log.
'use strict';

HR.NetLog = {
  STORE: 'hr_netlog',
  MAX: 5000,             // so viele Einträge bleiben gespeichert
  PING_MS: 1000,         // alle 1 s ein Ping an jede Verbindung
  GAP_MS: 1500,          // ab so langer Funkstille wird ein Aussetzer notiert
  SILENT_MS: 3000,       // so lange keine Daten: Warnung, solange es andauert
  DEAD_MS: 25000,        // Gast: so lange gar nichts vom Gastgeber -> Verbindung gilt als verloren
  HIGH_PING: 300,        // ab so viel Antwortzeit gilt der Ping als hoch
  SUMMARY_MS: 15000,     // alle 15 s eine Zusammenfassung je Verbindung
  list: [],              // Einträge: [Zeit ms, Stufe 'i'|'w'|'e', Wer, Text, Zusammenhang]
  peers: new Map(),      // Verbindungs-Nr. -> Statistik
  active: false,         // läuft gerade eine Mehrspieler-Sitzung?
  seq: 0,

  init() {
    try { const a = JSON.parse(localStorage.getItem(this.STORE) || '[]'); if (Array.isArray(a)) this.list = a.slice(-this.MAX); } catch (_) { this.list = []; }
    this.lastTick = Date.now();
    setInterval(() => this.tick(), this.PING_MS);
    document.addEventListener('visibilitychange', () => {
      if (!this.active) return;
      if (document.hidden) { this.hiddenAt = Date.now(); this.add('w', '', 'Spiel in den Hintergrund gewechselt (App gewechselt, Bildschirm gesperrt oder Tab verdeckt). Das Gerät sendet jetzt evtl. nichts mehr.'); }
      else { this.add(this.hiddenAt && Date.now() - this.hiddenAt > 2000 ? 'w' : 'i', '', 'Spiel wieder im Vordergrund' + (this.hiddenAt ? ' nach ' + this.secs(Date.now() - this.hiddenAt) : '') + '.'); this.hiddenAt = 0; }
    });
    window.addEventListener('online', () => this.active && this.add('i', '', 'Browser meldet: wieder online.'));
    window.addEventListener('offline', () => this.active && this.add('e', '', 'Browser meldet: offline (keine Netzverbindung).'));
    window.addEventListener('pagehide', () => { if (this.active) this.add('w', '', 'Seite wird geschlossen oder neu geladen.'); this.save(true); });
    const nc = navigator.connection;
    if (nc && nc.addEventListener) nc.addEventListener('change', () => this.active && this.add('w', '', 'Netz des Geräts hat gewechselt: ' + this.netInfo()));
    // Bildrate messen: zeigt, ob Ruckeln am Gerät liegt und nicht am Netz
    this.fr = { n: 0, worst: 0, last: 0 };
    const loop = t => {
      if (this.active) { const f = this.fr; if (f.last) { const d = t - f.last; f.n++; if (d > f.worst) f.worst = d; } f.last = t; }
      else this.fr.last = 0;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  // ---------- Einträge ----------
  add(lvl, who, text) {
    const e = [Date.now(), lvl, who || '', text, this.ctx()];
    this.list.push(e);
    if (this.list.length > this.MAX + 200) this.list.splice(0, this.list.length - this.MAX);
    if (lvl === 'e') console.warn('[Netz]', who, text);
    this.save();
    if (this.onAdd) this.onAdd(e);
    return e;
  },
  info(who, text) { return this.add('i', who, text); },
  warn(who, text) { return this.add('w', who, text); },
  error(who, text) { return this.add('e', who, text); },

  save(now) {
    clearTimeout(this._st);
    const w = () => { try { localStorage.setItem(this.STORE, JSON.stringify(this.list.slice(-this.MAX))); } catch (_) { } };
    if (now) w(); else this._st = setTimeout(w, 3000);
  },

  clear() { this.list = []; this.save(true); },

  // In welchem Teil des Spiels ist das passiert?
  ctx() {
    const P = HR.Party && HR.Party.P;
    if (P) {
      const g = P.current && HR.GAMES && HR.GAMES[P.current];
      const names = { lobby: 'Lobby', choose: 'Minispiel-Auswahl', intro: 'Spielerklärung', play: 'Spiel läuft', round: 'Rundenergebnis', final: 'Siegerehrung' };
      return 'Party ' + (P.code || '') + ' · ' + (names[P.phase] || P.phase) + (P.round && P.phase !== 'lobby' ? ' · Runde ' + P.round + '/' + P.rounds : '') + (g && (P.phase === 'intro' || P.phase === 'play') ? ' · ' + g.name : '');
    }
    const o = typeof Game !== 'undefined' && Game.online;
    if (o) return 'Online-Rennen ' + (o.code || '') + ' · ' + o.state;
    return HR.Net && HR.Net.peer ? 'Verbindung' : 'Menü';
  },

  // Name eines Mitspielers zu einer Verbindungs-Nr.
  who(id) {
    if (id == null) return '';
    const P = HR.Party && HR.Party.P;
    let p = P && P.players && P.players.find(x => x.id === id);
    const o = !p && typeof Game !== 'undefined' && Game.online;
    if (o && o.players) p = o.players.find(x => x.id === id);
    if (id === 0 && !(HR.Net && HR.Net.isHost)) return 'Gastgeber' + (p ? ' ' + p.name : '');
    return (p ? p.name : 'Gerät') + ' (#' + id + ')';
  },

  secs(ms) { return (ms / 1000).toFixed(1).replace('.', ',') + ' s'; },

  netInfo() {
    const nc = navigator.connection;
    if (!nc) return 'unbekannt';
    return [nc.type, nc.effectiveType && 'Qualität ' + nc.effectiveType, nc.downlink && nc.downlink + ' Mbit/s', nc.rtt != null && 'RTT ' + nc.rtt + ' ms'].filter(Boolean).join(', ') || 'unbekannt';
  },

  device() {
    const n = navigator, s = screen;
    return {
      ua: n.userAgent, lang: n.language, screen: s.width + '×' + s.height + ' @' + (window.devicePixelRatio || 1) + 'x',
      touch: !!(HR.Input && HR.Input.touchMode), net: this.netInfo(), theme: HR.THEME || '',
      mode: HR.Net ? HR.Net.MODES[HR.Net.getMode()] : '', relayKey: !!(HR.Net && HR.Net.getKey()),
      name: typeof Game !== 'undefined' && Game.settings ? Game.settings.name : '',
      url: location.origin + location.pathname,
    };
  },

  // ---------- Sitzung ----------
  start(text) {
    this.active = true;
    this.peers.clear();
    this.hostOff = 0;
    this.lastTick = Date.now();
    this.sumAt = Date.now();
    this.fr = { n: 0, worst: 0, last: 0 };
    const d = this.device();
    this.info('', '=== ' + text + ' ===');
    this.info('', 'Gerät: ' + d.ua);
    this.info('', 'Bildschirm ' + d.screen + (d.touch ? ', Touch' : '') + ' · Netz: ' + d.net + ' · Verbindungsweg: ' + d.mode + ' · Verbindungsserver ' + (d.relayKey ? 'eingerichtet' : 'nicht eingerichtet'));
  },

  stop(text) {
    if (!this.active) return;
    for (const id of this.peers.keys()) this.summary(id, true);
    this.info('', text || 'Sitzung beendet.');
    this.active = false;
    this.peers.clear();
    this.save(true);
  },

  // neue Verbindung beobachten (id 0 = Gastgeber aus Sicht eines Gastes)
  attach(conn, id, onDead) {
    if (!this.active) this.start('Verbindung');
    const now = Date.now();
    const st = { conn, id, since: now, last: now, rtts: [], pend: new Map(), inN: 0, outN: 0, gaps: 0, gapMax: 0, buf: 0,
      silentLogged: false, onDead, hiAt: 0, bufAt: 0, via: null, ice: null, allRtt: [], allGaps: 0, lost: 0, off: 0 };
    this.peers.set(id, st);
    const pc = conn.peerConnection;
    if (pc) {
      st.ice = pc.iceConnectionState;
      pc.addEventListener('iceconnectionstatechange', () => {
        const s = pc.iceConnectionState; if (s === st.ice) return;
        const txt = { checking: 'Verbindung wird geprüft', connected: 'verbunden', completed: 'verbunden (fertig ausgehandelt)',
          disconnected: 'Verbindung gestört (kann sich von selbst erholen)', failed: 'Verbindung fehlgeschlagen', closed: 'Verbindung geschlossen' }[s] || s;
        this.add(s === 'failed' ? 'e' : s === 'disconnected' ? 'w' : 'i', this.who(id), 'Netzwerkstatus: ' + txt + ' (vorher ' + st.ice + ').');
        st.ice = s;
        if (s === 'connected' || s === 'completed') setTimeout(() => this.route(id), 500);
      });
    }
    setTimeout(() => this.route(id), 1500);
  },

  // Verbindung ist weg (reason: Text, warum)
  detach(id, reason) {
    const st = this.peers.get(id);
    if (!st) return;
    this.summary(id, true);
    const quiet = Date.now() - st.last;
    this.error(this.who(id), 'Verbindung getrennt: ' + reason + '. Bestand ' + this.secs(Date.now() - st.since) +
      (quiet > 1000 ? ', letzte Daten vor ' + this.secs(quiet) : '') + (st.ice ? ', Netzwerkstatus ' + st.ice : '') + '.');
    this.peers.delete(id);
  },

  // tatsächlich genutzter Weg (direkt/Server) samt Protokoll
  async route(id) {
    const st = this.peers.get(id), pc = st && st.conn.peerConnection;
    if (!pc || !pc.getStats) return;
    try {
      const rep = await pc.getStats();
      let pair = null;
      rep.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = rep.get(r.selectedCandidatePairId); });
      if (!pair) rep.forEach(r => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
      if (!pair) return;
      st.pair = pair.id;
      const l = rep.get(pair.localCandidateId) || {}, r = rep.get(pair.remoteCandidateId) || {};
      const relay = l.candidateType === 'relay' || r.candidateType === 'relay';
      const kinds = { host: 'lokales Netz', srflx: 'über Internet (NAT)', prflx: 'über Internet (NAT)', relay: 'Verbindungsserver' };
      const via = (relay ? 'über Verbindungsserver' : 'direkt') + ' · ' + (kinds[l.candidateType] || l.candidateType || '?') + ' ↔ ' + (kinds[r.candidateType] || r.candidateType || '?') +
        ' · ' + (l.protocol || '?').toUpperCase() + (l.relayProtocol ? ' (Relay ' + l.relayProtocol.toUpperCase() + ')' : '');
      if (via !== st.via) { this.info(this.who(id), (st.via ? 'Verbindungsweg gewechselt: ' : 'Verbindungsweg: ') + via + '.'); st.via = via; }
      st.relay = relay;
    } catch (_) { }
  },

  // ---------- Datenverkehr ----------
  // eingehende Nachricht; true = war eine Log-Nachricht und ist erledigt
  onData(d, id) {
    const st = this.peers.get(id), now = Date.now();
    if (st) {
      st.inN++;
      const gap = now - st.last;
      if (gap > this.GAP_MS) {
        st.gaps++; st.allGaps++; if (gap > st.gapMax) st.gapMax = gap;
        const bg = this.hiddenAt || (this.lastHidden && now - this.lastHidden < gap + 1000) || now - this.lastTick > this.PING_MS + 1200;
        this.warn(this.who(id), 'Funkstille vorbei: ' + this.secs(gap) + ' lang kamen keine Daten an' + (bg ? ' (dieses Gerät war in der Zeit im Hintergrund oder hing)' : '') + '.');
      }
      st.last = now; st.silentLogged = false;
    }
    if (!d || typeof d.t !== 'string' || d.t[0] !== '_') return false;
    if (d.t === '_np') { this.sendRaw(id, { t: '_nq', s: d.s, c: d.c, r: now }); return true; }
    if (d.t === '_nq' && st) {
      const rtt = now - d.c;
      st.pend.delete(d.s);
      if (rtt >= 0 && rtt < 60000) {
        st.rtts.push(rtt); st.allRtt.push(rtt); if (st.allRtt.length > 600) st.allRtt.shift();
        st.off = d.r - (d.c + rtt / 2);   // Uhr der Gegenseite minus eigene Uhr
        if (id === 0 && !HR.Net.isHost) this.hostOff = st.off;
        st.ping = rtt;
        if (rtt > this.HIGH_PING && now - st.hiAt > 5000) { st.hiAt = now; this.warn(this.who(id), 'Hohe Verzögerung: Ping ' + rtt + ' ms.'); }
      }
      return true;
    }
    if (d.t === '_nlreq') { this.sendMine(id, d.k); return true; }
    if (d.t === '_nlpart') { this.gotPart(id, d); return true; }
    return true;
  },

  sendRaw(id, msg) {
    const st = this.peers.get(id), c = st && st.conn;
    if (!c || !c.open) return false;
    try { c.send(msg); return true; } catch (e) { this.error(this.who(id), 'Senden fehlgeschlagen: ' + ((e && e.message) || e)); return false; }
  },

  // ausgehende Spielnachricht zählen
  out(id) { const st = this.peers.get(id); if (st) st.outN++; },
  sendFail(id, e) {
    const st = this.peers.get(id), now = Date.now();
    if (st && now - (st.failAt || 0) < 5000) return;
    if (st) st.failAt = now;
    this.error(this.who(id), 'Senden fehlgeschlagen: ' + ((e && e.message) || e || 'Verbindung nicht offen'));
  },

  tick() {
    const now = Date.now(), dt = now - this.lastTick;
    this.lastTick = now;
    if (!this.active) return;
    if (document.hidden) this.lastHidden = now;
    else if (dt > this.PING_MS + 1200) {
      this.lastHidden = now;
      this.warn('', 'Dieses Gerät hing ' + this.secs(dt - this.PING_MS) + ' (Spiel war blockiert, z. B. durch Standby oder Überlastung). In der Zeit wurde nichts gesendet oder verarbeitet.');
    }
    for (const [id, st] of this.peers) {
      if (!st.conn.open) continue;
      // Ping
      const s = ++this.seq;
      st.pend.set(s, now);
      this.sendRaw(id, { t: '_np', s, c: now });
      for (const [k, t] of st.pend) if (now - t > 5000) { st.pend.delete(k); st.lost++; }
      // Funkstille, die gerade andauert
      const quiet = now - st.last;
      if (quiet > this.SILENT_MS && !st.silentLogged && !document.hidden) {
        st.silentLogged = true;
        this.warn(this.who(id), 'Funkstille: seit ' + this.secs(quiet) + ' keine Daten mehr (Netzwerkstatus ' + (st.ice || '?') + ').');
      }
      // Gast: vom Gastgeber kommt gar nichts mehr (sonst kommt jede Sekunde ein Ping) -> Verbindung aufgeben
      if (st.onDead && quiet > this.DEAD_MS && !document.hidden) { st.onDead('seit ' + this.secs(quiet) + ' keine Daten mehr'); continue; }
      // Sendepuffer staut sich: das Netz kommt nicht hinterher
      const dc = st.conn.dataChannel, buf = dc ? dc.bufferedAmount : 0;
      if (buf > st.buf) st.buf = buf;
      if (buf > 64 * 1024 && now - st.bufAt > 5000) { st.bufAt = now; this.warn(this.who(id), 'Sendepuffer staut sich: ' + Math.round(buf / 1024) + ' KB warten auf Versand (Netz zu langsam).'); }
    }
    if (now - this.sumAt >= this.SUMMARY_MS) {
      this.sumAt = now;
      for (const id of this.peers.keys()) this.summary(id);
      const f = this.fr, secs = this.SUMMARY_MS / 1000;
      if (f.n && !document.hidden) {
        const fps = Math.round(f.n / secs);
        this.add(fps < 30 || f.worst > 250 ? 'w' : 'i', '', 'Bildrate ' + fps + ' fps, längstes Bild ' + Math.round(f.worst) + ' ms.');
      }
      f.n = 0; f.worst = 0;
      if (HR.Net.isHost && HR.Net.peer && HR.Net.peer.disconnected) this.warn('', 'Immer noch ohne Verbindung zum Vermittlungsserver.');
    }
  },

  // Zusammenfassung einer Verbindung für das letzte Zeitfenster
  summary(id, final) {
    const st = this.peers.get(id); if (!st) return;
    const r = st.rtts;
    let txt;
    if (r.length) {
      const avg = Math.round(r.reduce((a, b) => a + b, 0) / r.length), mx = Math.max(...r), mn = Math.min(...r);
      let jit = 0; for (let i = 1; i < r.length; i++) jit += Math.abs(r[i] - r[i - 1]); jit = r.length > 1 ? Math.round(jit / (r.length - 1)) : 0;
      st.avg = avg;
      txt = 'Ping Ø ' + avg + ' ms (min ' + mn + ', max ' + mx + ', Schwankung ' + jit + ')';
    } else txt = 'keine Ping-Antworten';
    txt += ' · Nachrichten ' + st.inN + ' rein / ' + st.outN + ' raus';
    if (st.gaps) txt += ' · ' + st.gaps + '× Funkstille (längste ' + this.secs(st.gapMax) + ')';
    if (st.lost) txt += ' · ' + st.lost + ' Pings ohne Antwort';
    if (st.buf > 16 * 1024) txt += ' · Sendepuffer bis ' + Math.round(st.buf / 1024) + ' KB';
    if (st.relay != null) txt += st.relay ? ' · über Server' : ' · direkt';
    const bad = !r.length || (st.avg > this.HIGH_PING) || st.gaps || st.lost;
    this.add(bad ? 'w' : 'i', this.who(id), (final ? 'Bilanz: ' : '') + txt + '.');
    st.rtts = []; st.inN = 0; st.outN = 0; st.gaps = 0; st.gapMax = 0; st.lost = 0; st.buf = 0;
  },

  // aktuelle Übersicht für die Anzeige
  overview() {
    return [...this.peers.values()].map(st => {
      const a = st.allRtt.slice(-30);
      return { id: st.id, who: this.who(st.id), ping: st.ping, avg: a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null,
        max: a.length ? Math.max(...a) : null, gaps: st.allGaps, relay: st.relay, quiet: Date.now() - st.last, ice: st.ice };
    });
  },

  // geglätteter Ping einer Verbindung (für die Spielerliste)
  pingOf(id) {
    const st = this.peers.get(id); if (!st || !st.allRtt.length) return null;
    const a = st.allRtt.slice(-5); return Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  },

  // ---------- Text und Export ----------
  fmtTime(t) {
    const d = new Date(t), p = (n, l = 2) => String(n).padStart(l, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3);
  },
  fmtDate(t) { const d = new Date(t); return d.toLocaleDateString('de-DE'); },
  LVL: { i: '     ', w: 'WARN ', e: 'FEHLER' },

  line(e, dev) {
    return this.fmtTime(e[0]) + '  ' + (this.LVL[e[1]] || '     ').padEnd(6) + ' ' + (dev ? '[' + dev + '] ' : '') + (e[2] ? e[2] + ': ' : '') + e[3] + (e[4] ? '   {' + e[4] + '}' : '');
  },

  header(title, d) {
    return [title, 'Erstellt: ' + this.fmtDate(Date.now()) + ' ' + this.fmtTime(Date.now()),
      'Gerät: ' + (d.name ? d.name + ' · ' : '') + d.ua, 'Bildschirm: ' + d.screen + (d.touch ? ' (Touch)' : '') + ' · Netz: ' + d.net,
      'Verbindungsweg: ' + d.mode + ' · Verbindungsserver ' + (d.relayKey ? 'eingerichtet' : 'nicht eingerichtet') + ' · Grafikstil: ' + d.theme,
      'Seite: ' + d.url, '',
      'Lesehilfe: Ping = Antwortzeit hin und zurück (unter 100 ms gut, über 300 ms spürbar). Funkstille = so lange kamen keine Daten an.',
      '"Dieses Gerät hing" = das Gerät selbst war blockiert, nicht das Netz. {…} = wo im Spiel es passiert ist.', ''];
  },

  text() {
    return this.header('Horizon Rush – Verbindungslog', this.device()).concat(this.list.map(e => this.line(e))).join('\n') + '\n';
  },

  fileName(all) {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return 'horizon-rush-log' + (all ? '-alle-geraete' : '') + '-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.txt';
  },

  download(text, name) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  },

  async share(text, name) {
    try {
      const f = new File([text], name, { type: 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Horizon Rush Verbindungslog' }); return true; }
      if (navigator.share) { await navigator.share({ title: 'Horizon Rush Verbindungslog', text }); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return true; }
    return false;
  },

  // ---------- Logs aller Geräte einsammeln (Gastgeber) ----------
  collect(done, progress) {
    const ids = [...HR.Net.conns.keys()];
    const k = Date.now() % 1e9;
    this.col = { k, want: new Set(ids), total: ids.length, parts: {}, done, progress, timer: setTimeout(() => this.finishCollect(), 10000) };
    this.info('', 'Sammle die Logs von ' + ids.length + ' Gerät(en) ein.');
    if (!ids.length) { this.finishCollect(); return; }
    for (const id of ids) this.sendRaw(id, { t: '_nlreq', k });
  },

  // Gast: eigenes Log in Stücken an den Gastgeber schicken (die letzten 3 Stunden)
  sendMine(id, k) {
    const from = Date.now() - 3 * 3600e3;
    const e = this.list.filter(x => x[0] >= from).slice(-3000), CH = 200, n = Math.max(1, Math.ceil(e.length / CH));
    this.info('', 'Gastgeber hat das Log angefordert, sende ' + e.length + ' Einträge.');
    for (let i = 0; i < n; i++) this.sendRaw(id, { t: '_nlpart', k, i, n, off: this.hostOff || 0, dev: i === 0 ? this.device() : null, e: e.slice(i * CH, (i + 1) * CH) });
  },

  gotPart(id, d) {
    const c = this.col; if (!c || d.k !== c.k) return;
    const p = c.parts[id] || (c.parts[id] = { n: d.n, got: 0, chunks: [], off: d.off, dev: null });
    if (d.dev) p.dev = d.dev;
    if (!p.chunks[d.i]) { p.chunks[d.i] = d.e || []; p.got++; }
    if (p.got >= p.n) c.want.delete(id);
    if (c.progress) c.progress(c.total - c.want.size, c.total);
    if (!c.want.size) this.finishCollect();
  },

  finishCollect() {
    const c = this.col; if (!c) return;
    clearTimeout(c.timer); this.col = null;
    const me = this.device(), host = (me.name || 'Gastgeber') + ' (Gastgeber)';
    const devs = [{ label: host, d: me, entries: this.list.slice(-3000), off: 0 }];
    for (const id of Object.keys(c.parts)) {
      const p = c.parts[id], d = p.dev || {};
      devs.push({ label: (d.name || 'Gerät') + ' (#' + id + ')', d, entries: [].concat(...p.chunks.filter(Boolean)), off: p.off || 0 });
    }
    const missing = [...c.want].map(id => this.who(id));
    if (missing.length) this.warn('', 'Keine (vollständige) Antwort von: ' + missing.join(', ') + '.');
    else this.info('', 'Logs von allen Geräten eingesammelt.');
    const out = this.header('Horizon Rush – Verbindungslog aller Geräte', me);
    out.push('Geräte:');
    devs.forEach(v => out.push('  [' + v.label + '] ' + (v.d.ua || '?') + (v.d.net ? ' · Netz: ' + v.d.net : '') + (v.d.mode ? ' · Weg: ' + v.d.mode : '') +
      (v.off ? ' · Uhr weicht ' + Math.round(-v.off) + ' ms ab' : '')));
    if (missing.length) out.push('  Nicht erreicht: ' + missing.join(', ') + ' (diese Geräte können ihr Log selbst unter Einstellungen → Verbindungslog herunterladen).');
    // gemeinsame Zeitleiste: Zeiten der Gäste auf die Uhr des Gastgebers umgerechnet
    const since = Date.now() - 3 * 3600e3, all = [];
    devs.forEach(v => v.entries.forEach(e => { const t = e[0] + v.off; if (t >= since) all.push([t, e, v.label]); }));
    all.sort((a, b) => a[0] - b[0]);
    out.push('', '========== Gemeinsame Zeitleiste (Uhrzeit des Gastgebers, letzte 3 Stunden) ==========');
    all.forEach(([t, e, label]) => out.push(this.line([t].concat(e.slice(1)), label)));
    devs.forEach(v => {
      out.push('', '========== ' + v.label + ' (eigene Uhrzeit des Geräts) ==========');
      v.entries.forEach(e => out.push(this.line(e)));
    });
    const text = out.join('\n') + '\n';
    if (c.done) c.done(text, devs.length, missing);
  },
};
