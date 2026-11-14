/* =====================================================================
   Survive the Sol – SOUND EFFECTS
   Tiny beeps made with the Web Audio API (no sound files to download).
   Sound.play('click' | 'select' | 'alarm' | 'win' | 'lose' | 'day')
   The mute button in the header calls Sound.toggle().
   ===================================================================== */
(function (root) {
  'use strict';

  var ctx = null;
  var on = true;
  try { on = localStorage.getItem('sts-sound') !== 'off'; } catch (e) { /* private mode */ }

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One short tone. type = 'sine' | 'square' | 'triangle' | 'sawtooth'
  function tone(freq, start, length, type, volume) {
    var a = audio();
    if (!a) return;
    var osc = a.createOscillator(), gain = a.createGain();
    var t0 = a.currentTime + start;
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume || 0.08, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + length + 0.05);
  }

  var SOUNDS = {
    click: function () { tone(660, 0, 0.08, 'triangle', 0.06); },
    select: function () { tone(520, 0, 0.08, 'triangle', 0.06); tone(780, 0.07, 0.12, 'triangle', 0.06); },
    deselect: function () { tone(600, 0, 0.08, 'triangle', 0.05); tone(420, 0.07, 0.1, 'triangle', 0.05); },
    day: function () { tone(392, 0, 0.18, 'sine', 0.07); tone(523, 0.12, 0.25, 'sine', 0.07); },
    alarm: function () {
      for (var i = 0; i < 3; i++) { tone(880, i * 0.32, 0.15, 'square', 0.04); tone(660, i * 0.32 + 0.16, 0.15, 'square', 0.04); }
    },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.3, 'triangle', 0.07); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, i * 0.2, 0.35, 'sine', 0.07); }); }
  };

  var Sound = {
    isOn: function () { return on; },
    toggle: function () {
      on = !on;
      try { localStorage.setItem('sts-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
      if (on) SOUNDS.click();
      return on;
    },
    play: function (name) {
      if (!on || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* sound is optional – never break the game */ }
    }
  };
  root.Sound = Sound;
})(window);
