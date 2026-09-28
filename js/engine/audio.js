/* ============ 程序化音频引擎：BGM作曲 + SE + 语音音钉 + 环境音 ============ */
window.AudioSys = (function () {
  let ctx = null, master, gBGM, gSE, gAMB;
  let curTrack = null, curName = null, timer = null, barCount = 0;
  let ambNodes = null, ambName = null;
  let vol = { bgm: 0.75, se: 0.9, amb: 0.6 };

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    gBGM = ctx.createGain(); gBGM.gain.value = vol.bgm; gBGM.connect(master);
    gSE = ctx.createGain(); gSE.gain.value = vol.se; gSE.connect(master);
    gAMB = ctx.createGain(); gAMB.gain.value = vol.amb; gAMB.connect(master);
  }

  /* ---------- 乐器 ---------- */
  function env(g, t, a, d, s, r, dur, vel) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(vel * s, 0.001), t + a + d);
    g.gain.setTargetAtTime(0.0001, t + Math.max(dur, a + d), r / 3 + 0.02);
  }
  function piano(t, f, dur, vel) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o1.type = "triangle"; o2.type = "sine"; o1.frequency.value = f; o2.frequency.value = f * 2.001;
    lp.type = "lowpass"; lp.frequency.value = Math.min(f * 6, 6000);
    const g2 = ctx.createGain(); g2.gain.value = 0.24;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(gBGM);
    env(g, t, 0.004, dur * 0.5, 0.25, dur, dur, vel);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.4); o2.stop(t + dur + 0.4);
  }
  function musicbox(t, f, dur, vel) {
    [1, 4, 9.2].forEach((mult, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * [0.55, 0.2, 0.07][i], t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * [1, 0.5, 0.3][i]);
      o.connect(g); g.connect(gBGM); o.start(t); o.stop(t + dur + 0.2);
    });
  }
  function pluck(t, f, dur, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = Math.min(f * 4, 3400);
    o.connect(lp); lp.connect(g); g.connect(gBGM);
    env(g, t, 0.003, dur * 0.3, 0.1, dur, dur, vel * 0.8);
    o.start(t); o.stop(t + dur + 0.2);
  }
  function strings(t, f, dur, vel) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(g); g.connect(gBGM);
    [0, 6].forEach(det => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det - 3;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.5);
    });
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.5, t + dur * 0.3);
    g.gain.setValueAtTime(vel * 0.5, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
  }
  function flute(t, f, dur, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    v.frequency.value = 5.2; vg.gain.value = f * 0.006; v.connect(vg); vg.connect(o.frequency);
    o.connect(g); g.connect(gBGM);
    env(g, t, 0.09, dur * 0.2, 0.82, dur * 0.3, dur, vel * 0.8);
    o.start(t); v.start(t); o.stop(t + dur + 0.3); v.stop(t + dur + 0.3);
  }
  function bassN(t, f, dur, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = f;
    o.connect(g); g.connect(gBGM);
    env(g, t, 0.02, dur * 0.4, 0.5, dur, dur, vel);
    o.start(t); o.stop(t + dur + 0.3);
  }
  function bell(t, f, dur, vel) {
    [1, 2.76, 5.4].forEach((mult, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f * mult;
      g.gain.setValueAtTime(vel * [0.5, 0.18, 0.08][i], t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * [1, 0.6, 0.35][i]);
      o.connect(g); g.connect(gBGM); o.start(t); o.stop(t + dur + 0.2);
    });
  }
  const INST = { piano, musicbox, pluck, strings, flute, bass: bassN, bell };

  /* ---------- 曲目表 ---------- */
  const MINOR = [0, 2, 3, 5, 7, 8, 10], MAJOR = [0, 2, 4, 5, 7, 9, 11],
        PENTM = [0, 3, 5, 7, 10], PENT = [0, 2, 4, 7, 9], DORIAN = [0, 2, 3, 5, 7, 9, 10];
  const T = (r) => r.map(x => (x < 0 ? x + 12 : x) % 12 - (x < 0 ? 0 : 0));
  const TRACKS = {
    title:   { bpm: 63, root: 57, scale: PENTM, chords: [[0, 3, 7], [-2, 3, 5], [0, 3, 7], [-4, 0, 3]], lead: "musicbox", pad: "strings", arp: 0, md: 0.34, dur: 2.2, lv: 0.16 },
    op:      { bpm: 82, root: 57, scale: MINOR, chords: [[0, 3, 7], [5, 8, 0], [3, 7, 10], [-2, 2, 5]], lead: "piano", pad: "strings", arp: 1, md: 0.4, dur: 2.6, lv: 0.2 },
    daily:   { bpm: 116, root: 60, scale: MAJOR, chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [2, 5, 9]], lead: "piano", pad: null, arp: 1, md: 0.42, dur: 1.0, lv: 0.15 },
    qwen:    { bpm: 104, root: 62, scale: MAJOR, chords: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [4, 7, 11]], lead: "pluck", pad: "strings", arp: 1, md: 0.5, dur: 1.5, lv: 0.15 },
    ernie:   { bpm: 70, root: 57, scale: MINOR, chords: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [3, 7, 10]], lead: "piano", pad: null, arp: 0, md: 0.3, dur: 2.4, lv: 0.18 },
    glm:     { bpm: 56, root: 57, scale: MINOR, chords: [[0, 3, 7], [-2, 3, 7]], lead: "musicbox", pad: null, arp: 0, md: 0.22, dur: 2.8, lv: 0.14 },
    gpt:     { bpm: 48, root: 50, scale: DORIAN, chords: [[0, 3, 7], [-2, 2, 5], [0, 5, 8], [-4, 0, 3]], lead: "bell", pad: "strings", arp: 0, md: 0.2, dur: 3.4, lv: 0.15 },
    kimi:    { bpm: 62, root: 62, scale: PENT, chords: [[0, 4, 9], [-3, 0, 4], [2, 7, 11], [-1, 2, 7]], lead: "musicbox", pad: "strings", arp: 0, md: 0.26, dur: 2.6, lv: 0.15 },
    minimax: { bpm: 138, root: 60, scale: MAJOR, chords: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [-3, 0, 4]], lead: "pluck", pad: null, arp: 1, md: 0.55, dur: 0.9, lv: 0.14 },
    momo:    { bpm: 78, root: 58, scale: PENT, chords: [[0, 4, 7], [-3, 0, 4], [2, 5, 9], [-1, 2, 7]], lead: "musicbox", pad: "strings", arp: 1, md: 0.3, dur: 2.0, lv: 0.15 },
    rain:    { bpm: 58, root: 55, scale: MINOR, chords: [[0, 3, 7], [-2, 3, 5]], lead: "piano", pad: null, arp: 0, md: 0.16, dur: 3.0, lv: 0.13 },
    countdown:{ bpm: 96, root: 52, scale: MINOR, chords: [[0, 3, 7], [0, 3, 7], [1, 5, 8], [0, 3, 7]], lead: "piano", pad: "strings", arp: 1, md: 0.3, dur: 1.2, lv: 0.17 },
    firework:{ bpm: 68, root: 57, scale: MAJOR, chords: [[0, 4, 7], [-5, 0, 4], [2, 5, 9], [-3, 0, 4]], lead: "piano", pad: "strings", arp: 1, md: 0.3, dur: 2.2, lv: 0.2 },
    sad:     { bpm: 54, root: 57, scale: MINOR, chords: [[0, 3, 7], [-4, 0, 3]], lead: "piano", pad: "strings", arp: 0, md: 0.18, dur: 3.2, lv: 0.16 },
    tide:    { bpm: 60, root: 57, scale: PENTM, chords: [[0, 3, 7], [-2, 3, 7], [-4, 0, 3], [0, 3, 7]], lead: "musicbox", pad: "strings", arp: 1, md: 0.3, dur: 2.4, lv: 0.16 },
  };

  let melodyPrev = 0;
  function scheduleBar(tr, t0) {
    const beat = 60 / tr.bpm, barDur = beat * 4;
    const chord = tr.chords[barCount % tr.chords.length];
    const rnd = mulberry32(tr.seed + barCount * 7919);
    // 低音
    INST.bass(t0, mtof(tr.root - 24 + chord[0]), beat * 2.4, 0.34);
    if (rnd() < 0.5) INST.bass(t0 + beat * 2.5, mtof(tr.root - 24 + chord[0]), beat * 1.2, 0.22);
    // 铺底和弦
    if (tr.pad) chord.forEach(iv => INST[tr.pad](t0 + 0.01, mtof(tr.root + iv), barDur * 0.96, 0.12));
    // 琶音
    if (tr.arp) for (let i = 0; i < 8; i++) {
      const iv = chord[i % chord.length] + 12 * (1 + Math.floor(i / chord.length) % 2);
      INST.pluck(t0 + i * beat / 2, mtof(tr.root + iv), beat * 0.6, 0.07 + rnd() * 0.03);
    }
    // 旋律
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      if (rnd() > tr.md) continue;
      if (barCount % 4 === 3 && rnd() < 0.5) continue;             // 乐句呼吸
      const jump = Math.floor(rnd() * 7) - 3;
      melodyPrev = Math.max(-5, Math.min(14, melodyPrev + jump));
      let deg = tr.scale[((melodyPrev % tr.scale.length) + tr.scale.length) % tr.scale.length];
      const oct = Math.floor(melodyPrev / tr.scale.length);
      const midi = tr.root + 12 + deg + oct * 12;
      const dt = t0 + i * beat / 2 + (rnd() < 0.12 ? beat / 4 : 0);
      INST[tr.lead](dt, mtof(midi), tr.dur * (0.7 + rnd() * 0.6), tr.lv);
    }
    return barDur;
  }

  function playBGM(name) {
    init();
    if (curName === name) return;
    stopBGM(0.8);
    if (!name || !TRACKS[name]) return;
    const tr = Object.assign({ seed: (Math.random() * 1e9) | 0 }, TRACKS[name]);
    curTrack = tr; curName = name; barCount = 0; melodyPrev = 4;
    // 取消淡出计划并做淡入
    gBGM.gain.cancelScheduledValues(ctx.currentTime);
    gBGM.gain.setValueAtTime(Math.max(gBGM.gain.value, 0.001), ctx.currentTime);
    gBGM.gain.linearRampToValueAtTime(vol.bgm, ctx.currentTime + 1.4);
    let next = ctx.currentTime + 0.12;
    timer = setInterval(() => {
      if (!curTrack) return;
      while (next < ctx.currentTime + 0.6) { next += scheduleBar(curTrack, next); barCount++; }
    }, 160);
  }
  function stopBGM(fade) {
    if (timer) { clearInterval(timer); timer = null; }
    curTrack = null; curName = null;
    if (gBGM && fade > 0) {
      const v = gBGM.gain.value; gBGM.gain.cancelScheduledValues(ctx.currentTime);
      gBGM.gain.setValueAtTime(v, ctx.currentTime);
      gBGM.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
      const gg = gBGM; setTimeout(() => { if (!curTrack) gg.gain.setValueAtTime(vol.bgm, ctx.currentTime + 0.01); }, fade * 1000 + 60);
    }
  }

  /* ---------- 环境音 ---------- */
  function noiseBuf(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
    }
    return b;
  }
  function amb(name) {
    init();
    if (ambName === name) return;
    if (ambNodes) { ambNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }); ambNodes = null; }
    ambName = name;
    if (!name) return;
    if (name === "rain" || name === "wave" || name === "wind" || name === "cafe") {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf(3); src.loop = true;
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      if (name === "rain") { f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.5; g.gain.value = 0.16; }
      if (name === "wave") { f.type = "lowpass"; f.frequency.value = 520; g.gain.value = 0.001;
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.09; lg.gain.value = 0.13; lfo.connect(lg); lg.connect(g.gain); lfo.start();
        src._lfo = lfo;
        ambNodes_extra = [lfo];
      }
      if (name === "wind") { f.type = "bandpass"; f.frequency.value = 420; f.Q.value = 1.6; g.gain.value = 0.08; }
      if (name === "cafe") { f.type = "lowpass"; f.frequency.value = 300; g.gain.value = 0.07; }
      src.connect(f); f.connect(g); g.connect(gAMB); src.start();
      ambNodes = [src, f, g];
    }
  }
  let ambNodes_extra = [];

  /* ---------- SE ---------- */
  function playSE(name) {
    init();
    const t = ctx.currentTime;
    const beep = (f0, f1, dur, vel, type) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(gSE); o.start(t); o.stop(t + dur + 0.05);
    };
    const noise = (dur, fc, vel, sweepTo) => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(Math.max(dur, 0.1));
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.frequency.setValueAtTime(fc, t);
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(gSE); s.start(t); s.stop(t + dur + 0.05);
    };
    switch (name) {
      case "click": beep(1800, 900, 0.05, 0.12, "triangle"); break;
      case "confirm": beep(880, 1320, 0.1, 0.16); setTimeout(() => beep(1320, 1760, 0.12, 0.12), 70); break;
      case "page": noise(0.14, 2600, 0.2); break;
      case "book": noise(0.3, 1800, 0.22); break;
      case "bell": [0, 0.13, 0.27].forEach((d, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = [1568, 2093, 2637][i]; g.gain.setValueAtTime(0.14, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 1.1); o.connect(g); g.connect(gSE); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 1.2); }); break;
      case "shutter": beep(2400, 1200, 0.03, 0.2, "square"); setTimeout(() => noise(0.06, 4000, 0.25), 40); break;
      case "heartbeat": beep(70, 45, 0.16, 0.5, "sine"); setTimeout(() => beep(65, 42, 0.2, 0.42, "sine"), 240); break;
      case "door": noise(0.22, 240, 0.3); beep(120, 70, 0.2, 0.2, "triangle"); break;
      case "pencil": noise(0.18, 3200, 0.12); break;
      case "splash": noise(0.5, 2200, 0.35, 300); break;
      case "fw_launch": beep(300, 1200, 0.7, 0.06, "sawtooth"); break;
      case "fw_burst": noise(0.9, 5200, 0.4, 400); beep(900, 200, 0.5, 0.1); break;
      case "message": beep(1318, 1318, 0.07, 0.15); setTimeout(() => beep(1760, 1760, 0.09, 0.13), 90); break;
      case "impact": beep(90, 40, 0.4, 0.6, "sine"); noise(0.3, 500, 0.3); break;
      case "chime": beep(1046, 1046, 0.5, 0.12); setTimeout(() => beep(1568, 1568, 0.7, 0.1), 160); break;
      case "tide": noise(2.6, 900, 0.3, 200); break;
    }
  }

  /* ---------- 角色语音音钉 ---------- */
  function blip(charId) {
    init();
    const c = (window.CHARS && window.CHARS[charId]) || { blip: { freq: 600, wave: "sine" } };
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 2400;
    const f = c.blip.freq * (0.94 + Math.random() * 0.12);
    o.type = c.blip.wave; o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.06);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(lp); lp.connect(g); g.connect(gSE); o.start(t); o.stop(t + 0.09);
  }

  function setVolumes(v) {
    Object.assign(vol, v);
    if (!ctx) return;
    if (gBGM && curTrack) gBGM.gain.value = vol.bgm;
    if (gSE) gSE.gain.value = vol.se;
    if (gAMB) gAMB.gain.value = vol.amb;
  }
  return { init, playBGM, stopBGM, amb, playSE, blip, setVolumes, get vol() { return vol; },
           get currentName() { return curName; } };
})();
