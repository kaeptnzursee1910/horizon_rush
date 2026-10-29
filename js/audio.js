// Horizon Rush – Sound (Web Audio, synthetisch wie im Original)
'use strict';

HR.Audio = {
  ctx: null, master: null, muted: false, engines: [], noise: null, rumbleBuf: null,

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    const r = this.ctx.sampleRate;
    // Rauschen
    this.noise = this.ctx.createBuffer(1, r, r);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < r; i++) d[i] = Math.random() * 2 - 1;
    // Offroad-Rumpeln: tiefpassgefiltertes Rauschen, 0,5 s Schleife
    this.rumbleBuf = this.ctx.createBuffer(1, r / 2, r);
    const rd = this.rumbleBuf.getChannelData(0);
    let y = 0;
    for (let i = 0; i < rd.length; i++) { y = y * 0.85 + (Math.random() * 2 - 1) * 0.15; rd[i] = Math.max(-1, Math.min(1, y * 3)); }
    this.cache = {};
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
  },

  // Motor: Sägezahn + Oberton + Unterton, Frequenz nach Drehzahl (38–157 Hz wie im Original)
  startEngines(n, vol) {
    this.stopEngines();
    if (!this.ctx) return;
    this.engineVol = vol;
    for (let i = 0; i < n; i++) {
      const out = this.ctx.createGain(); out.gain.value = 0;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      lp.connect(out); out.connect(this.master);
      const mk = (type, gain) => { const o = this.ctx.createOscillator(); o.type = type; const g = this.ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(lp); o.start(); return o; };
      const saw = mk('sawtooth', 0.42), h2 = mk('sine', 0.28), sub = mk('sine', 0.22);
      const rs = this.ctx.createBufferSource(); rs.buffer = this.rumbleBuf; rs.loop = true;
      const rg = this.ctx.createGain(); rg.gain.value = 0; rs.connect(rg); rg.connect(this.master); rs.start();
      this.engines.push({ out, saw, h2, sub, rs, rg });
    }
  },

  engine(i, rpm, vol) {
    const e = this.engines[i]; if (!e || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 38 + Math.round(Math.max(0, Math.min(1, rpm)) * 17) * 7;
    e.saw.frequency.setTargetAtTime(f, t, 0.03);
    e.h2.frequency.setTargetAtTime(f * 2, t, 0.03);
    e.sub.frequency.setTargetAtTime(f / 2, t, 0.03);
    e.out.gain.setTargetAtTime(vol * 0.5, t, 0.05);
  },

  rumble(i, on) {
    const e = this.engines[i]; if (!e) return;
    e.rg.gain.setTargetAtTime(on ? 0.6 * 0.5 : 0, this.ctx.currentTime, 0.04);
  },

  stopEngines() {
    for (const e of this.engines) { try { e.saw.stop(); e.h2.stop(); e.sub.stop(); e.rs.stop(); e.out.disconnect(); e.rg.disconnect(); } catch (_) { } }
    this.engines = [];
  },

  silence() {
    if (!this.ctx) return;
    for (const e of this.engines) { e.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); e.rg.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); }
  },

  // Töne: 70 % Sinus + 30 % Rechteck, kurze Hüllkurve
  tone(notes, vol = 0.6) {
    if (!this.ctx) return;
    let t = this.ctx.currentTime + 0.01;
    for (const [f, d] of notes) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * 0.5, t + 0.005);
      g.gain.setValueAtTime(vol * 0.5, t + d - 0.02);
      g.gain.linearRampToValueAtTime(0, t + d);
      g.connect(this.master);
      const o1 = this.ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
      const o2 = this.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = f;
      const g1 = this.ctx.createGain(); g1.gain.value = 0.7; const g2 = this.ctx.createGain(); g2.gain.value = 0.3;
      o1.connect(g1); g1.connect(g); o2.connect(g2); g2.connect(g);
      o1.start(t); o2.start(t); o1.stop(t + d + 0.01); o2.stop(t + d + 0.01);
      t += d;
    }
  },

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'beep': return this.tone([[440, 0.18]]);
      case 'go': return this.tone([[880, 0.45]]);
      case 'lap': return this.tone([[660, 0.1], [990, 0.18]]);
      case 'finish': return this.tone([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.4]]);
      case 'blip': return this.tone([[700, 0.04]], 0.4);
      case 'select': return this.tone([[1000, 0.07]], 0.5);
      case 'crash': return this.burst(0.45, 9, 0.8, 55);
      case 'bump': return this.burst(0.12, 30, 0.6, 0);
    }
  },

  burst(dur, decay, vol, hum) {
    const r = this.ctx.sampleRate, n = Math.floor(r * dur);
    const key = dur + '|' + decay + '|' + hum;
    let buf = this.cache[key];
    if (!buf) {
      buf = this.ctx.createBuffer(1, n, r);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / r;
        let s = (Math.random() * 2 - 1) * Math.exp(-t * decay);
        if (hum) s += 0.6 * Math.sin(2 * Math.PI * hum * t) * Math.exp(-t * 6);
        d[i] = Math.max(-1, Math.min(1, s));
      }
      this.cache[key] = buf;
    }
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol * 0.5;
    s.connect(g); g.connect(this.master); s.start();
  },
};
