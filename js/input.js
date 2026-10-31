// Horizon Rush – Eingabe: Tastatur und Touch
'use strict';

HR.Input = {
  keys: new Set(),
  pointers: new Map(),     // pointerId -> {x, y}
  taps: [],                // kurze Tipper, die zwischen zwei Bildern schon wieder losgelassen wurden
  buttons: [],             // aktuelle Touch-Tasten
  touchMode: false,        // Touch-Tasten anzeigen?
  splitKeys: false,        // im Splitscreen: P1 = WASD, P2 = Pfeile
  actKeys: false,          // Party: Leertaste/Enter/E/Shift sind die Aktionstaste
  onPause: null,
  onKey: null,

  init(canvas) {
    this.touchMode = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !isTyping(e)) e.preventDefault();
      if (!e.repeat && this.onKey && this.onKey(e)) { e.preventDefault(); return; }
      if (isTyping(e)) return;
      this.keys.add(e.code);
      // mit externer Tastatur die Touch-Tasten ausblenden
      if (e.code.startsWith('Arrow') || /^Key[WASD]$/.test(e.code)) this.touchMode = false;
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); });

    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') this.touchMode = true;
      const p = pos(e); this.pointers.set(e.pointerId, p);
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
      for (const b of this.buttons) {
        if (b.action === 'dpad') { for (const a of this.dirs(b, p)) this.taps.push({ player: b.player, action: a }); }
        else if (b.action !== 'pause' && hit(b, p)) this.taps.push(b);
      }
      const pb = this.buttons.find(b => b.action === 'pause' && hit(b, p));
      if (pb && this.onPause) this.onPause();
      else if (this.onTap) this.onTap();
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => { if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, pos(e)); });
    const up = e => this.pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

    function isTyping(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'); }
    function hit(b, p) { return b.action !== 'dpad' && Math.hypot(p.x - b.x, p.y - b.y) <= b.r * 1.15; }
    this._hit = hit;
  },

  // Touch-Tasten für alle lokalen Ansichten anlegen
  layout(views, W, H, extra) {
    const B = [];
    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      const s = U.clamp(Math.min(v.w / 900, v.h / 560), 0.55, 1.15);
      const r = 46 * s, m = 22 * s;
      const by = v.y + v.h - m - r;
      B.push({ player: i, action: 'dpad', x: v.x + m + r * 1.9, y: by - r * 0.6, r: r * 1.9 });
      B.push({ player: i, action: 'gas', x: v.x + v.w - m - r * 1.15, y: by - r * 0.3, r: r * 1.15, label: 'GAS' });
      B.push({ player: i, action: 'brake', x: v.x + v.w - m - r * 3.5, y: by + r * 0.15, r: r * 0.9, label: 'BREMSE' });
      if (extra) B.push({ player: i, action: 'act', x: v.x + v.w - m - r * 1.15, y: by - r * 3.0, r: r * 0.95, label: extra });
    }
    if (views.length) {
      const side = views.length > 1 && views[1].x > 0;
      B.push({ player: -1, action: 'pause', x: W / 2, y: side ? H - 34 : 30, r: 22, label: 'II' });
    }
    this.buttons = B;
  },

  // Party-Spiele wie ein Controller: links das Steuerkreuz, rechts die Aktionstasten, oben die Pause
  // btns: [[action, label], ...] (erste Taste unten rechts, die zweite links darüber)
  layoutPad(btns, W, H) {
    const s = U.clamp(Math.min(W / 900, H / 560), 0.6, 1.15);
    const r = 46 * s, m = 22 * s;
    const B = [{ player: 0, action: 'dpad', x: m + r * 1.9, y: H - m - r * 1.9, r: r * 1.9 }];
    const pos = [[W - m - r * 1.1, H - m - r * 1.1], [W - m - r * 3.3, H - m - r * 2.0], [W - m - r * 1.1, H - m - r * 3.4]];
    btns.slice(0, 3).forEach(([action, label], j) => B.push({ player: 0, action, x: pos[j][0], y: pos[j][1], r: r * (j ? 0.95 : 1.1), label, k: j }));
    B.push({ player: -1, action: 'pause', x: W / 2, y: 30, r: 22, label: 'II' });
    this.buttons = B;
  },

  // Richtungen, die ein Finger auf dem Steuerkreuz drückt (auch schräg)
  dirs(b, p) {
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
    if (d > b.r * 1.3 || d < b.r * 0.12) return [];
    const out = [], cx = dx / d, cy = dy / d;
    if (cx < -0.42) out.push('left'); if (cx > 0.42) out.push('right');
    if (cy < -0.42) out.push('gas'); if (cy > 0.42) out.push('brake');
    return out;
  },

  control(i) {
    const k = this.keys;
    const c = { left: false, right: false, gas: false, brake: false, act: false, act2: false };
    if (this.splitKeys) {
      if (i === 0) { c.left = k.has('KeyA'); c.right = k.has('KeyD'); c.gas = k.has('KeyW'); c.brake = k.has('KeyS'); }
      else { c.left = k.has('ArrowLeft'); c.right = k.has('ArrowRight'); c.gas = k.has('ArrowUp'); c.brake = k.has('ArrowDown'); }
    } else if (i === 0) {
      c.left = k.has('ArrowLeft') || k.has('KeyA');
      c.right = k.has('ArrowRight') || k.has('KeyD');
      c.gas = k.has('ArrowUp') || k.has('KeyW');
      c.brake = k.has('ArrowDown') || k.has('KeyS') || (!this.actKeys && k.has('Space'));
      if (this.actKeys) {
        c.act = k.has('Space') || k.has('Enter') || k.has('NumpadEnter') || k.has('KeyE') || k.has('KeyF');
        c.act2 = k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyQ') || k.has('KeyX');
      }
    }
    for (const b of this.buttons) {
      if (b.player !== i) continue;
      for (const p of this.pointers.values()) {
        if (b.action === 'dpad') { for (const a of this.dirs(b, p)) c[a] = true; }
        else if (this._hit(b, p)) c[b.action] = true;
      }
    }
    if (this.taps.length) {
      for (const b of this.taps) if (b.player === i) c[b.action] = true;
      this.taps = this.taps.filter(b => b.player !== i);
    }
    return c;
  },

  pressed(b) {
    for (const p of this.pointers.values()) if (this._hit(b, p)) return true;
    return false;
  },

  dpadDirs(b) {
    const s = new Set();
    for (const p of this.pointers.values()) for (const a of this.dirs(b, p)) s.add(a);
    return s;
  },
};
