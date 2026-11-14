// =====================================================================
// AUDIO – every sound is made live with the Web Audio API.
// No sound files are downloaded, so there is nothing to license.
//   audio.sfx('pickup', 2)   short sound effects
//   audio.loop('thruster', on) / audio.roverSpeed(0..1)   engine loops
//   audio.music(on)          calm space music pad
// Browsers only allow sound after the first click, so call audio.unlock()
// from a click handler.
// =====================================================================

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
let volume = 0.7, musicOn = true, muted = false, unlocked = false;   // no sound until the first click (browser rule)
const loops = {};

function ensure() {
  if (ctx) return ctx;
  if (!unlocked) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master);
  // white noise buffer for thrusters, wind and impacts
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolume();
  return ctx;
}
function applyVolume() { if (master) master.gain.value = muted ? 0 : volume; }

function tone(freq, start, len, type = 'sine', vol = 0.15, slideTo = null, bus = sfxBus) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + len);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  o.connect(g).connect(bus);
  o.start(t0); o.stop(t0 + len + 0.05);
}
function noise(start, len, vol = 0.2, freq = 800, q = 0.8) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + start;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t0); src.stop(t0 + len + 0.05);
}

const SFX = {
  click: () => tone(700, 0, 0.07, 'triangle', 0.08),
  select: () => { tone(520, 0, 0.08, 'triangle', 0.1); tone(780, 0.07, 0.12, 'triangle', 0.1); },
  pickup: (rarity = 0) => {
    const base = 600 + rarity * 120;
    tone(base, 0, 0.1, 'triangle', 0.12); tone(base * 1.5, 0.07, 0.16, 'triangle', 0.12);
    if (rarity >= 2) tone(base * 2, 0.15, 0.25, 'sine', 0.1);
  },
  use: () => { tone(440, 0, 0.1, 'sine', 0.12, 880); },
  drop: () => tone(300, 0, 0.12, 'triangle', 0.1, 180),
  full: () => { tone(220, 0, 0.12, 'square', 0.06); tone(180, 0.12, 0.15, 'square', 0.06); },
  beep: () => tone(880, 0, 0.12, 'square', 0.07),
  bigBeep: () => tone(1320, 0, 0.35, 'square', 0.08),
  alarm: () => { for (let i = 0; i < 3; i++) { tone(880, i * 0.34, 0.16, 'sawtooth', 0.06); tone(620, i * 0.34 + 0.17, 0.16, 'sawtooth', 0.06); } },
  whoosh: () => noise(0, 1.2, 0.18, 1200, 0.4),
  impact: () => { noise(0, 0.5, 0.35, 500); tone(110, 0, 0.35, 'sine', 0.2, 50); },
  land: () => noise(0, 0.35, 0.18, 400),
  jump: () => tone(300, 0, 0.18, 'sine', 0.06, 520),
  enter: () => { tone(330, 0, 0.1, 'triangle', 0.1); tone(495, 0.08, 0.12, 'triangle', 0.1); },
  levelup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.1)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.35, 'triangle', 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.22, 0.4, 'sine', 0.12)),
  safe: () => { tone(523, 0, 0.2, 'sine', 0.12); tone(784, 0.15, 0.4, 'sine', 0.12); },
};

// ---------- engine loops (thruster, rover) ----------
function startLoop(name) {
  if (!ensure() || loops[name]) return;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass';
  const g = ctx.createGain(); g.gain.value = 0;
  const osc = ctx.createOscillator(); osc.type = 'sawtooth';
  const og = ctx.createGain(); og.gain.value = 0;
  if (name === 'thruster') { f.frequency.value = 500; f.Q.value = 0.6; osc.frequency.value = 55; }
  else { f.frequency.value = 900; f.Q.value = 1.5; osc.frequency.value = 70; }
  src.connect(f).connect(g).connect(sfxBus);
  osc.connect(og).connect(sfxBus);
  src.start(); osc.start();
  loops[name] = { src, f, g, osc, og };
}

// ---------- music: slow, calm chords ----------
let musicTimer = null, chordIndex = 0;
const CHORDS = [[220, 277, 330], [196, 247, 294], [174.6, 220, 262], [196, 247, 330]];
function playChord() {
  if (!ensure() || !musicOn) return;
  const t0 = ctx.currentTime;
  CHORDS[chordIndex++ % CHORDS.length].forEach((f) => {
    [1, 1.004].forEach((detune) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * detune;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.06, t0 + 1.6);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 5.8);
      o.connect(g).connect(musicBus); o.start(t0); o.stop(t0 + 6);
    });
  });
}

export const audio = {
  unlock() {
    const first = !unlocked;
    unlocked = true;
    if (ensure() && ctx.state === 'suspended') ctx.resume();
    if (first && musicOn) this.music(true);
  },
  setVolume(v) { volume = v; applyVolume(); },
  setMuted(m) { muted = m; applyVolume(); },
  isMuted: () => muted,
  sfx(name, arg) { if (!ctx || muted) return; try { SFX[name] && SFX[name](arg); } catch (e) { /* never break the game */ } },
  loop(name, on, level = 1) {
    if (!ensure()) return;
    if (on) startLoop(name);
    const l = loops[name]; if (!l) return;
    const t = ctx.currentTime;
    l.g.gain.setTargetAtTime(on ? 0.12 * level : 0, t, 0.08);
    l.og.gain.setTargetAtTime(on ? 0.02 * level : 0, t, 0.08);
  },
  roverSpeed(k) {
    const l = loops.rover; if (!l) return;
    l.osc.frequency.setTargetAtTime(60 + k * 90, ctx.currentTime, 0.1);
    l.f.frequency.setTargetAtTime(600 + k * 900, ctx.currentTime, 0.1);
  },
  music(on) {
    musicOn = on;
    if (!ensure()) return;
    if (on && !musicTimer) { playChord(); musicTimer = setInterval(playChord, 5200); }
    if (!on && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  },
};
