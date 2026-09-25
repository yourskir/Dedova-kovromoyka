// ===== Audio: all synthesized, soft =====
const AU = {
  ctx: null, ok: false, on: true, vol: { music: 0.55, sfx: 0.85 }, loops: {}, gaps: {},
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch (e) {}
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? 0.9 : 0;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 40;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.25;
    this.master.connect(hp); hp.connect(this.comp); this.comp.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = this.vol.music * 0.5; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = this.vol.sfx; this.sfx.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = this.vol.music * 0.6; this.amb.connect(this.master);
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(2.6, 2.4);
    this.revOut = ctx.createGain(); this.revOut.gain.value = 0.55; this.rev.connect(this.revOut); this.revOut.connect(this.master);
    this.white = this.noiseBuf("white"); this.pink = this.noiseBuf("pink"); this.brown = this.noiseBuf("brown");
    // silent unlock
    const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    this.ok = true;
    this.startMusic();
    document.addEventListener("visibilitychange", () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else if (this.on) this.ctx.resume(); });
  },
  setOn(v) {
    this.on = v;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.08);
    if (v && this.ctx.state === "suspended") this.ctx.resume();
    try { if (navigator.audioSession) navigator.audioSession.type = v ? "playback" : "auto"; } catch (e) {}
  },
  setVol(k, v) {
    this.vol[k] = v;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (k === "music") { this.music.gain.setTargetAtTime(v * 0.5, t, 0.1); this.amb.gain.setTargetAtTime(v * 0.6, t, 0.1); }
    else this.sfx.gain.setTargetAtTime(v, t, 0.1);
  },
  impulse(sec, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * sec);
    const b = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < rate * 0.01 ? i / (rate * 0.01) : 1); }
    return b;
  },
  noiseBuf(kind) {
    const ctx = this.ctx, len = ctx.sampleRate * 3;
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.5;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    }
    // crossfade loop seam
    const f = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < f; i++) { const k = i / f; d[len - f + i] = d[len - f + i] * (1 - k) + d[i] * k; }
    return b;
  },
  src(buf, loop) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; if (loop) s.loopStart = 0; return s; },
  // ---------- continuous loops ----------
  loop(name) {
    if (!this.ok) return null;
    if (this.loops[name]) return this.loops[name];
    const ctx = this.ctx, t = ctx.currentTime;
    const L = { g: ctx.createGain(), nodes: [] };
    L.g.gain.value = 0; L.g.connect(this.sfx);
    const mk = (buf, type, f, q, gain) => {
      const s = this.src(buf, true); s.loopEnd = buf.duration; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
      const g = ctx.createGain(); g.gain.value = gain; s.connect(fl); fl.connect(g); g.connect(L.g); s.start(t, Math.random() * 2); L.nodes.push(s); return { s, fl, g };
    };
    const osc = (type, f, lp, gain) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; const g = ctx.createGain(); g.gain.value = gain; o.connect(fl); fl.connect(g); g.connect(L.g); o.start(t); L.nodes.push(o); return { o, fl, g }; };
    if (name === "vacuum") { L.a = mk(this.pink, "bandpass", 750, 0.6, 0.9); L.b = mk(this.brown, "lowpass", 380, 0.7, 0.5); L.c = osc("sawtooth", 118, 420, 0.035); }
    else if (name === "machine") {
      L.a = osc("triangle", 72, 260, 0.18); L.b = osc("sine", 144, 400, 0.06);
      L.c = mk(this.pink, "bandpass", 1900, 0.9, 0.45);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 6.5; const lg = ctx.createGain(); lg.gain.value = 0.2; lfo.connect(lg); lg.connect(L.c.g.gain); lfo.start(t); L.nodes.push(lfo);
      L.d = mk(this.brown, "bandpass", 520, 1.4, 0.0);
    }
    else if (name === "washer") { L.a = mk(this.white, "highpass", 1400, 0.5, 0.32); L.a2 = ctx.createBiquadFilter(); L.b = mk(this.pink, "lowpass", 700, 0.7, 0.55); }
    else if (name === "hose") { L.a = mk(this.pink, "bandpass", 1100, 0.6, 0.6); L.b = mk(this.brown, "lowpass", 500, 0.7, 0.4); }
    else if (name === "foam") { L.a = mk(this.pink, "bandpass", 1500, 0.8, 0.55); L.b = mk(this.brown, "lowpass", 500, 0.7, 0.3); }
    else if (name === "squeegee") { L.a = mk(this.brown, "bandpass", 420, 1.1, 2.2); L.b = mk(this.pink, "bandpass", 1300, 1.4, 0.3); }
    else if (name === "brush") { L.a = mk(this.pink, "bandpass", 2600, 1.2, 0.5); L.b = mk(this.brown, "bandpass", 600, 1.0, 0.3); }
    else if (name === "uv") { L.a = osc("sine", 110, 400, 0.05); L.b = osc("sine", 220.5, 600, 0.02); }
    else if (name === "iron") { L.a = mk(this.white, "highpass", 2500, 0.5, 0.18); L.b = mk(this.pink, "bandpass", 800, 1, 0.15); }
    else if (name === "drain") { L.a = mk(this.brown, "bandpass", 260, 2.2, 0.9); }
    else if (name === "spin") { L.a = osc("triangle", 60, 300, 0.2); L.b = mk(this.pink, "bandpass", 900, 0.8, 0.4); }
    else if (name === "duster") {
      L.a = osc("triangle", 55, 220, 0.16); L.b = osc("sine", 176, 420, 0.03);
      L.c = mk(this.brown, "lowpass", 320, 0.8, 1.1);
      const lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 0.55; lfo.connect(lg); lg.connect(L.c.g.gain); lfo.start(t); L.nodes.push(lfo); L.lfo = lfo;
      L.d = mk(this.pink, "bandpass", 1500, 0.8, 0.25);
    }
    else if (name === "fan") { L.a = mk(this.pink, "bandpass", 520, 0.5, 0.7); L.b = osc("sine", 50, 160, 0.05); }
    else if (name === "dry") { L.a = mk(this.pink, "lowpass", 900, 0.6, 0.6); L.b = osc("sine", 96, 200, 0.05); }
    this.loops[name] = L;
    return L;
  },
  setLoop(name, level, p) {
    const L = level > 0.001 ? this.loop(name) : this.loops[name];
    if (!L) return;
    const t = this.ctx.currentTime;
    L.g.gain.setTargetAtTime(level, t, level > (L.lv || 0) ? 0.05 : 0.12);
    L.lv = level;
    p = p || 0;
    if (name === "vacuum") { L.a.fl.frequency.setTargetAtTime(650 + p * 500, t, 0.1); L.c.o.frequency.setTargetAtTime(110 + p * 18, t, 0.2); }
    if (name === "machine") { L.d.g.gain.setTargetAtTime(p * 0.7, t, 0.1); }
    if (name === "squeegee") { L.a.fl.frequency.setTargetAtTime(330 + p * 260, t, 0.08); }
    if (name === "spin") { L.a.o.frequency.setTargetAtTime(50 + p * 140, t, 0.2); L.b.fl.frequency.setTargetAtTime(500 + p * 1400, t, 0.2); }
    if (name === "duster") { L.a.o.frequency.setTargetAtTime(40 + p * 30, t, 0.2); L.lfo.frequency.setTargetAtTime(4 + p * 9, t, 0.2); }
    if (name === "fan") { L.a.fl.frequency.setTargetAtTime(380 + p * 300, t, 0.3); }
    if (name === "drain") { L.a.fl.frequency.setTargetAtTime(200 + Math.random() * 140, t, 0.05); }
  },
  stopLoops(except) { for (const k in this.loops) if (k !== except) this.setLoop(k, 0); },
  gapOK(key, sec) { const n = now(); if (this.gaps[key] && n - this.gaps[key] < sec) return false; this.gaps[key] = n; return true; },
  // ---------- one-shots ----------
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  thump(power, dust) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
    const g = ctx.createGain(); this.env(g, t, 0.004, 0.55 * power, 0.26); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.35);
    const n = this.src(this.brown); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    const g2 = ctx.createGain(); this.env(g2, t, 0.003, 0.5 * power, 0.22); n.connect(f); f.connect(g2); g2.connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.3);
    if (dust > 0.02) {
      const h = this.src(this.pink); const hf = ctx.createBiquadFilter(); hf.type = "bandpass"; hf.frequency.value = 1700; hf.Q.value = 0.6;
      const hg = ctx.createGain(); this.env(hg, t + 0.02, 0.05, Math.min(0.28, dust * 0.05), 0.7); h.connect(hf); hf.connect(hg); hg.connect(this.sfx); hg.connect(this.rev); h.start(t, Math.random() * 2); h.stop(t + 0.9);
    }
  },
  splash(v) {
    if (!this.ok || !this.gapOK("splash", 0.12)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.white); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.45);
    const g = ctx.createGain(); this.env(g, t, 0.01, Math.min(0.5, 0.14 + v * 0.03), 0.5); n.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.rev); n.start(t, Math.random() * 2); n.stop(t + 0.6);
    this.bubbles(3 + Math.min(6, v * 0.3), 0.06);
  },
  bubbles(n, vol, lo) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const t = t0 + Math.random() * 0.35;
      const o = ctx.createOscillator(); o.type = "sine";
      const f0 = (lo || 280) + Math.random() * (lo ? 200 : 600);
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.9, t + 0.05);
      const g = ctx.createGain(); this.env(g, t, 0.004, vol * (0.5 + Math.random() * 0.5), 0.06);
      o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.1);
    }
  },
  psh(vol) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.white); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.02); g.gain.linearRampToValueAtTime(0.0001, t + 0.28);
    n.connect(f); f.connect(g); g.connect(this.sfx); n.start(t, Math.random() * 2); n.stop(t + 0.32);
  },
  bell(freq, vol, when, dur) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime + (when || 0);
    const parts = [[1, 1], [2.76, 0.35], [5.4, 0.12], [2, 0.2]];
    for (const [r, a] of parts) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq * r;
      const g = ctx.createGain(); this.env(g, t, 0.006, vol * a, (dur || 1.8) / Math.sqrt(r));
      o.connect(g); g.connect(this.sfx); g.connect(this.rev); o.start(t); o.stop(t + (dur || 1.8) + 0.2);
    }
  },
  chime() { if (!this.gapOK("chime", 1.2)) return; const n = [587.3, 659.3, 740, 880, 987.8]; const f = n[Math.floor(Math.random() * n.length)]; this.bell(f, 0.12); this.bell(f * 1.5, 0.06, 0.12); },
  fanfare() { [587.3, 740, 880, 1174.7].forEach((f, i) => this.bell(f, 0.13, i * 0.16, 2.4)); },
  tok() {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.05);
    const g = ctx.createGain(); this.env(g, t, 0.003, 0.07, 0.07); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.12);
  },
  // scale: soft creak of the spring when the rug lands
  spring(k) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.55);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7.5; const lg = ctx.createGain(); lg.gain.value = 10; lfo.connect(lg); lg.connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    const g = ctx.createGain(); this.env(g, t + 0.02, 0.03, 0.06 * (k || 1), 0.6);
    o.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.rev);
    o.start(t); lfo.start(t); o.stop(t + 0.75); lfo.stop(t + 0.75);
  },
  // drying room: a drop landing in the tray
  drop() {
    if (!this.ok || !this.gapOK("drop", 0.07)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine"; const f = 700 + Math.random() * 600;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.05);
    const g = ctx.createGain(); this.env(g, t, 0.002, 0.045, 0.08); o.connect(g); g.connect(this.sfx); g.connect(this.rev); o.start(t); o.stop(t + 0.14);
  },
  // darning: wool pulled through the foundation
  stitch() {
    if (!this.ok || !this.gapOK("stitch", 0.16)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.pink); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.09); f.Q.value = 1.4;
    const g = ctx.createGain(); this.env(g, t, 0.01, 0.07, 0.09); n.connect(f); f.connect(g); g.connect(this.sfx); n.start(t, Math.random() * 2); n.stop(t + 0.14);
  },
  // scale: faint click of the needle mechanism
  tick(big) {
    if (!this.ok || !this.gapOK("tick", 0.05)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.pink); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = big ? 1700 : 2600; f.Q.value = 3;
    const g = ctx.createGain(); this.env(g, t, 0.001, big ? 0.09 : 0.04, big ? 0.04 : 0.025); n.connect(f); f.connect(g); g.connect(this.sfx); n.start(t, Math.random() * 2); n.stop(t + 0.07);
  },
  unroll() {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.pink); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1200, t + 1.1); f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.15); g.gain.linearRampToValueAtTime(0.12, t + 0.9); g.gain.linearRampToValueAtTime(0.0001, t + 1.3);
    n.connect(f); f.connect(g); g.connect(this.sfx); n.start(t, Math.random()); n.stop(t + 1.4);
    setTimeout(() => this.thump(0.45, 0.5), 1150);
  },
  purr() {
    if (!this.ok || !this.gapOK("purr", 2)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.brown); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220;
    const am = ctx.createGain(); am.gain.value = 0.5; const lfo = ctx.createOscillator(); lfo.frequency.value = 24; const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.3); g.gain.linearRampToValueAtTime(0.4, t + 1.3); g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
    n.connect(f); f.connect(am); am.connect(g); g.connect(this.sfx); n.start(t); lfo.start(t); n.stop(t + 1.9); lfo.stop(t + 1.9);
  },
  crunch() {
    if (!this.ok || !this.gapOK("crunch", 0.15)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const n = this.src(this.white); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 1800; f.Q.value = 2;
      const g = ctx.createGain(); this.env(g, t + i * 0.025, 0.002, 0.07, 0.04); n.connect(f); f.connect(g); g.connect(this.sfx); n.start(t + i * 0.025, Math.random() * 2); n.stop(t + i * 0.025 + 0.08);
    }
  },
  // ---------- music ----------
  startMusic() {
    if (this.musicOn) return;
    this.musicOn = true;
    this.beat = 0; this.nextT = this.ctx.currentTime + 0.5;
    this.style = "garage";
    const tick = () => { this.schedule(); };
    this.musicTimer = setInterval(tick, 200);
    this.ambStart();
  },
  setStyle(st) { this.style = st; this.ambSet(st); },
  schedule() {
    if (!this.ok || this.ctx.state !== "running") return;
    if (UPG.radio) return this.scheduleWaltz();
    const ctx = this.ctx;
    const spb = this.style === "yard" ? 60 / 58 : 60 / 64;
    while (this.nextT < ctx.currentTime + 0.6) {
      const b = this.beat, t = this.nextT;
      const prog = this.style === "yard" ? [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 67]] : [[62, 66, 69, 73, 76], [59, 62, 66, 69, 73], [55, 59, 62, 66, 69], [57, 61, 64, 67, 71]];
      const bar = Math.floor(b / 4) % 4, beatInBar = b % 4;
      const ch = prog[bar];
      if (beatInBar === 0) {
        ch.forEach((n, i) => this.ep(n, t + i * 0.035, 0.028, 3.2));
        this.ep(ch[0] - 24, t, 0.05, 3.4, true);
      }
      if (beatInBar === 2 && Math.random() < 0.5) this.ep(ch[1] - 12, t, 0.02, 1.6);
      const scale = [74, 76, 78, 81, 83, 86, 88];
      if (Math.random() < (this.style === "garage" ? 0.28 : 0.38)) this.ep(scale[Math.floor(Math.random() * scale.length)], t + (Math.random() < 0.3 ? spb / 2 : 0), 0.022, 2.2);
      this.beat++; this.nextT += spb;
    }
  },
  scheduleWaltz() {
    const ctx = this.ctx, spb = 60 / 138;
    const prog = [[50, 62, 66, 69], [50, 62, 66, 69], [45, 61, 64, 67], [45, 61, 64, 67], [43, 59, 62, 67], [45, 61, 64, 69], [50, 62, 66, 69], [45, 61, 64, 67]];
    const mel = [74, 76, 78, 76, 74, 73, 71, 73, 74, 69, 71, 73, 74, 76, 74, 73, 71, 69, 71, 73, 74, 0, 74, 76];
    while (this.nextT < ctx.currentTime + 0.6) {
      const b = this.beat, t = this.nextT;
      const bar = Math.floor(b / 3) % prog.length, bi = b % 3;
      const ch = prog[bar];
      if (bi === 0) this.acc(ch[0] - 12, t, 0.05, spb * 0.9, true);
      else ch.slice(1).forEach((n) => this.acc(n, t, 0.014, spb * 0.55));
      const m = mel[b % mel.length];
      if (m && (bi === 0 || Math.random() < 0.55)) this.acc(m + 12, t, 0.02, spb * (bi === 0 ? 1.6 : 0.8));
      this.beat++; this.nextT += spb;
    }
  },
  acc(midi, t, vol, dur, bass) {
    const ctx = this.ctx, f = 440 * Math.pow(2, (midi - 69) / 12);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.value = f; o2.frequency.value = f * 1.006;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = bass ? 420 : 1500; lp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol * 0.85, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.music); if (!bass) g.connect(this.rev);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.2); o2.stop(t + dur + 0.2);
  },
  ep(midi, t, vol, dur, bass) {
    const ctx = this.ctx;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = f * (bass ? 1 : 2.0);
    const mg = ctx.createGain(); mg.gain.setValueAtTime(f * (bass ? 0.3 : 1.1), t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = bass ? 500 : 2400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(lp); lp.connect(g); g.connect(this.music); if (!bass) g.connect(this.rev);
    car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  },
  // ---------- ambience ----------
  ambStart() {
    const ctx = this.ctx, t = ctx.currentTime;
    this.ambA = this.src(this.pink, true); this.ambAf = ctx.createBiquadFilter(); this.ambAf.type = "lowpass"; this.ambAf.frequency.value = 2400;
    this.ambAg = ctx.createGain(); this.ambAg.gain.value = 0.0; this.ambA.connect(this.ambAf); this.ambAf.connect(this.ambAg); this.ambAg.connect(this.amb); this.ambA.start(t);
    this.ambB = this.src(this.brown, true); this.ambBf = ctx.createBiquadFilter(); this.ambBf.type = "lowpass"; this.ambBf.frequency.value = 160;
    this.ambBg = ctx.createGain(); this.ambBg.gain.value = 0.0; this.ambB.connect(this.ambBf); this.ambBf.connect(this.ambBg); this.ambBg.connect(this.amb); this.ambB.start(t);
    this.dripTimer = setInterval(() => this.drip(), 1400);
    this.ambSet(this.style || "garage");
  },
  ambSet(st) {
    if (!this.ambAg) return;
    const t = this.ctx.currentTime;
    const cfg = { garage: [0.05, 2600, 0.25, 150], workshop: [0.018, 1800, 0.35, 180], plant: [0.012, 1400, 0.5, 110], yard: [0.07, 900, 0.1, 200], title: [0.04, 2400, 0.25, 150] }[st] || [0.03, 2000, 0.3, 150];
    this.ambAg.gain.setTargetAtTime(cfg[0], t, 1); this.ambAf.frequency.setTargetAtTime(cfg[1], t, 1);
    this.ambBg.gain.setTargetAtTime(cfg[2], t, 1); this.ambBf.frequency.setTargetAtTime(cfg[3], t, 1);
  },
  drip() {
    if (!this.ok || this.ctx.state !== "running" || Math.random() > 0.35) return;
    if (this.style === "yard") return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine"; const f = 900 + Math.random() * 700;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.04);
    const g = ctx.createGain(); this.env(g, t, 0.002, 0.03, 0.09); o.connect(g); g.connect(this.amb); g.connect(this.rev); o.start(t); o.stop(t + 0.15);
  },
};
