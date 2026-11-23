// ═════════════════════════════════════════════ AUDIO · música procedural que sigue a la escena
// Cada escena tiene un tema (tonalidad, modo, tempo, timbres). Las escenas actualizan cada fotograma
// Music.mood = {height: -1..1, intensity: 0..1, under: 0..1, rewind: 0|1}: el arpegio sube o baja con la
// altura, el filtro se cierra bajo el agua, la percusión entra con la tensión y el «rebobinado» invierte la melodía.
const THEMES = {
  base:     { root: 57, mode: [0, 2, 4, 7, 9], prog: [0, 5, 3, 4], bpm: 92, lead: "triangle", pad: "sine", bright: 0.55, swing: 0.1 },
  rocas:    { root: 60, mode: [0, 2, 4, 7, 9], prog: [0, 3, 4, 0], bpm: 118, lead: "triangle", pad: "triangle", bright: 0.7, swing: 0.18 },
  vertical: { root: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], bpm: 100, lead: "sine", pad: "sawtooth", bright: 0.5, swing: 0 },
  lago:     { root: 62, mode: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 0, 4], bpm: 72, lead: "sine", pad: "sine", bright: 0.4, swing: 0 },
  globo:    { root: 65, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 4], bpm: 132, lead: "triangle", pad: "triangle", bright: 0.65, swing: 0, waltz: true },
  avion:    { root: 57, mode: [0, 2, 4, 5, 7, 9, 10], prog: [0, 6, 3, 4], bpm: 128, lead: "square", pad: "sawtooth", bright: 0.75, swing: 0 },
  sub:      { root: 50, mode: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 6, 4], bpm: 84, lead: "sine", pad: "sawtooth", bright: 0.3, swing: 0 },
  tele:     { root: 64, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 3, 4], bpm: 108, lead: "triangle", pad: "sine", bright: 0.6, swing: 0.12 },
  dron:     { root: 52, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], bpm: 116, lead: "square", pad: "sawtooth", bright: 0.55, swing: 0 },
  tour:     { root: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], bpm: 112, lead: "sawtooth", pad: "sawtooth", bright: 0.65, swing: 0 },
};
const Music = {
  ctx: null, on: false, theme: THEMES.base, themeName: "base", step: 0, nextT: 0, timer: null,
  mood: { height: 0, intensity: 0.3, under: 0, rewind: 0 },
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0;
    this.comp = c.createDynamicsCompressor();
    this.filter = c.createBiquadFilter(); this.filter.type = "lowpass"; this.filter.frequency.value = 4000; this.filter.Q.value = 0.7;
    // Reverberación generada (ruido con caída exponencial).
    const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    this.wet = c.createGain(); this.wet.gain.value = 0.28;
    this.bus = c.createGain(); this.bus.gain.value = 1;
    this.bus.connect(this.filter); this.filter.connect(this.comp);
    this.bus.connect(this.verb); this.verb.connect(this.wet); this.wet.connect(this.comp);
    this.comp.connect(this.master); this.master.connect(c.destination);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  },
  setEnabled(v) {
    this.on = v;
    if (v) { this.init(); if (!this.ctx) return; this.ctx.resume(); this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.4); this.start(); }
    else if (this.ctx) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); this.stop(); }
  },
  setScene(name) {
    if (!THEMES[name] || name === this.themeName) return;
    this.themeName = name; this.theme = THEMES[name]; this.step = 0;
    this.mood = { height: 0, intensity: 0.3, under: 0, rewind: 0 };
    if (this.on && this.ctx) this.sweep();
  },
  start() { if (this.timer) return; this.nextT = this.ctx.currentTime + 0.1; this.timer = setInterval(() => this.schedule(), 60); },
  stop() { clearInterval(this.timer); this.timer = null; },
  pause(p) { if (!this.ctx) return; if (p) this.ctx.suspend(); else if (this.on) this.ctx.resume(); },
  midi: m => 440 * Math.pow(2, (m - 69) / 12),
  degree(d, octave = 0) { const s = this.theme.mode, n = s.length; const o = Math.floor(d / n); return this.theme.root + s[((d % n) + n) % n] + 12 * (o + octave); },
  schedule() {
    const c = this.ctx; if (!c || !this.on) return;
    const th = this.theme, m = this.mood, spb = 60 / th.bpm / 2; // corcheas
    // Filtro global: brillo del tema, más cerrado bajo el agua.
    const cut = 300 + 7000 * th.bright * (1 - 0.75 * m.under) * (0.7 + 0.3 * m.intensity);
    this.filter.frequency.setTargetAtTime(cut, c.currentTime, 0.3);
    while (this.nextT < c.currentTime + 0.25) {
      const st = this.step, beat = th.waltz ? 6 : 8, bar = Math.floor(st / (beat * 2));
      const chordRoot = th.prog[bar % th.prog.length];
      const t = this.nextT + ((st % 2) ? th.swing * spb : 0);
      const pos = st % (beat * 2);
      if (pos === 0) { // acorde de fondo
        for (const k of [0, 2, 4]) this.tone(this.midi(this.degree(chordRoot + k, -1)), t, spb * beat * 2, th.pad, 0.045, 0.6, 1.2);
        this.tone(this.midi(this.degree(chordRoot, -2)), t, spb * beat * 1.8, "sine", 0.12, 0.02, 0.5);
      }
      if (pos === beat) this.tone(this.midi(this.degree(chordRoot + 4, -2)), t, spb * beat * 0.9, "sine", 0.09, 0.02, 0.4);
      // Arpegio: registro según la altura de la escena; al rebobinar, sentido inverso.
      const dens = m.intensity > 0.6 ? 1 : m.intensity > 0.3 ? 2 : 4;
      if (st % dens === 0) {
        const seq = [0, 2, 4, 2, 4, 6, 4, 2];
        let i = (st / dens) % seq.length; if (m.rewind) i = seq.length - 1 - i;
        const lift = Math.round(m.height * 5);
        const note = this.degree(chordRoot + seq[i] + lift, 0);
        this.tone(this.midi(note), t, spb * 0.9, th.lead, 0.05 + 0.04 * m.intensity, 0.005, 0.25);
      }
      // Percusión con la intensidad.
      if (m.intensity > 0.45 && pos % (th.waltz ? 6 : 4) === 0) this.kick(t);
      if (m.intensity > 0.55 && st % 2 === 1) this.hat(t, 0.03 + 0.04 * m.intensity);
      this.nextT += spb; this.step++;
    }
  },
  tone(freq, t, dur, type, vol, att = 0.01, rel = 0.3) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setTargetAtTime(0, t + Math.max(att, dur - rel), rel / 3);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + rel * 2);
  },
  kick(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(this.comp); o.start(t); o.stop(t + 0.3);
  },
  hat(t, v) { this.noise(t, 0.05, v, 7000, "highpass"); },
  noise(t, dur, vol, freq, type = "bandpass", q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t); s.stop(t + dur + 0.05);
    return f;
  },
  sweep() { const t = this.ctx.currentTime; const f = this.noise(t, 0.9, 0.08, 400, "bandpass", 3); f.frequency.exponentialRampToValueAtTime(4000, t + 0.8); },
  // Efectos ligados a la animación.
  cue(name, v = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, th = this.theme;
    switch (name) {
      case "jump": this.tone(this.midi(this.degree(4 + Math.round(v * 5), 1)), t, 0.18, "triangle", 0.12, 0.005, 0.1); break;
      case "land": this.noise(t, 0.12, 0.12, 900); break;
      case "splash": { const f = this.noise(t, 0.6, 0.22, 1800, "bandpass", 0.6); f.frequency.exponentialRampToValueAtTime(300, t + 0.5); break; }
      case "bubble": this.tone(300 + Math.random() * 500, t, 0.08, "sine", 0.07, 0.002, 0.05); break;
      case "ping": this.tone(1318, t, 0.9, "sine", 0.1, 0.003, 0.8); this.tone(1318, t + 0.25, 0.6, "sine", 0.035, 0.003, 0.5); break;
      case "pop": this.tone(900, t, 0.06, "square", 0.06, 0.002, 0.04); this.noise(t, 0.08, 0.1, 2500); break;
      case "thud": this.tone(90, t, 0.2, "sine", 0.25, 0.003, 0.15); break;
      case "whoosh": { const f = this.noise(t, 0.7, 0.12, 600, "bandpass", 2); f.frequency.exponentialRampToValueAtTime(v > 0 ? 3000 : 200, t + 0.6); break; }
      case "lever": this.tone(220, t, 0.08, "square", 0.08, 0.002, 0.05); this.tone(330, t + 0.08, 0.1, "square", 0.08, 0.002, 0.05); break;
      case "rewind": { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.7); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.75); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.8); break; }
      case "tick": this.tone(this.midi(this.degree(Math.round(v), 1)), t, 0.1, "triangle", 0.09, 0.002, 0.06); break;
      case "success": [0, 2, 4, 7].forEach((d, i) => this.tone(this.midi(this.degree(d, 1)), t + i * 0.09, 0.5, th.lead === "square" ? "square" : "triangle", 0.11, 0.005, 0.4)); break;
      case "fanfare": [0, 4, 7, 9, 11, 14].forEach((d, i) => { this.tone(this.midi(this.degree(d, 0)), t + i * 0.11, 0.9, "sawtooth", 0.06, 0.01, 0.6); this.tone(this.midi(this.degree(d, 1)), t + i * 0.11, 0.9, "triangle", 0.07, 0.01, 0.6); }); this.kick(t); this.kick(t + 0.44); break;
      case "fail": this.tone(this.midi(this.theme.root + 3), t, 0.35, "triangle", 0.09, 0.01, 0.25); this.tone(this.midi(this.theme.root + 2), t + 0.18, 0.45, "triangle", 0.08, 0.01, 0.3); break;
      case "hint": [0, 4, 2].forEach((d, i) => this.tone(this.midi(this.degree(d + 7, 0)), t + i * 0.12, 0.4, "sine", 0.06, 0.01, 0.35)); break;
      case "engine": this.noise(t, 0.4, 0.05 + 0.05 * v, 180, "lowpass"); break;
    }
  },
};
