// =====================================================================
// ROVI – the friendly robot helper. Short tips in a speech bubble.
// Hard words written as [[solar flare]] become buttons that explain them.
// Tips have a cooldown so ROVI does not talk too much.
// =====================================================================

// Kid-friendly explanations of hard words (facts from our data files).
export const GLOSSARY = {
  'sol': 'A sol is one day on Mars: 24 hours and 39 minutes. In this game, every round is one sol.',
  'solar flare': 'A solar flare is a giant burst of energy from the Sun. Big ones can send dangerous radiation into space. NASA keeps a record of flares in a database called DONKI.',
  'radiation dose': 'Radiation dose = how much radiation your body soaks up. Astronauts wear small meters called dosimeters to keep track of it.',
  'regolith': 'Regolith is the loose dust and broken rock that covers the Moon and Mars. Thick layers of it can block a lot of radiation.',
  'communication delay': 'Radio messages need time to travel. A message between Mars and Earth takes about 3 to 22 minutes one way, so you must decide things yourself. From the Moon it takes only about 1.3 seconds.',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Turn "[[solar flare]]" into a button, and "[Space]" into a key badge.
export function richText(text) {
  return esc(text)
    .replace(/\[\[([^\]]+)\]\]/g, (m, w) => `<button type="button" class="word" data-word="${w}">${w}</button>`)
    .replace(/\[([A-Za-z0-9 ]{1,12})\]/g, '<kbd>$1</kbd>');
}

export function createRovi(bubbleEl, textEl) {
  const lastSaid = {};
  let hideTimer = null, current = null;
  const rovi = {
    tutorialLock: false,
    // key: tips with the same key wait for `cooldown` seconds before repeating
    say(text, { key = text, cooldown = 15, seconds = 6, force = false, mood = 'info' } = {}) {
      const now = performance.now() / 1000;
      if (!force && lastSaid[key] && now - lastSaid[key] < cooldown) return false;
      if (rovi.tutorialLock && !force) return false;
      lastSaid[key] = now;
      current = text;
      textEl.innerHTML = richText(text);
      bubbleEl.hidden = false;
      bubbleEl.dataset.mood = mood;
      bubbleEl.classList.remove('pop'); void bubbleEl.offsetWidth; bubbleEl.classList.add('pop');
      clearTimeout(hideTimer);
      if (seconds > 0) hideTimer = setTimeout(() => { bubbleEl.hidden = true; current = null; }, seconds * 1000);
      return true;
    },
    sticky(text, mood = 'info') { return rovi.say(text, { force: true, seconds: 0, mood }); },
    hide() { clearTimeout(hideTimer); bubbleEl.hidden = true; current = null; },
    get current() { return current; },
  };
  return rovi;
}

// ---------- the step-by-step first-time tutorial ----------
export function createTutorial(rovi) {
  const steps = [
    { text: 'Welcome to the Moon! Walk with [W] [A] [S] [D] and drag the mouse to look around.', done: (c) => c.moved > 10 },
    { text: 'See the glowing beams? Walk into a supply. Ice and oxygen give Life Support!', done: (c) => c.collected > 0 },
    { text: 'Supplies keep your 3 bars up. Batteries give Power, shield plates give Radiation Safety.', done: (c) => c.stepTime > 6 },
    { text: 'A REAL [[solar flare]] is coming! Press [1], [2] or [3] to use a card. BEST shows the right one.', done: (c) => c.cardUsed, waitFor: (c) => c.stormStage !== 'calm' },
    { text: 'Now run back into the dashed safe zone around the base!', done: (c) => c.inZone || c.stepTime > 15 },
    { text: 'Great job! Stay in the safe zone until the storm passes.', done: () => false },
  ];

  const t = {
    active: false, index: 0, stepTime: 0,
    start() { t.active = true; t.index = 0; t.stepTime = 0; rovi.tutorialLock = false; t.show(); },
    show() { const s = steps[t.index]; if (s) { rovi.sticky(s.text, 'tutorial'); rovi.tutorialLock = true; } },
    stop() { t.active = false; rovi.tutorialLock = false; rovi.hide(); },
    update(dt, c) {
      if (!t.active) return;
      t.stepTime += dt;
      c.stepTime = t.stepTime;
      // when the storm warning arrives, jump straight to the storm step
      const stormStep = steps.findIndex((s) => s.waitFor);
      if (t.index < stormStep && c.stormStage !== 'calm' && c.phase === 'explore') { t.index = stormStep; t.stepTime = 0; t.waiting = false; t.show(); return; }
      const s = steps[t.index];
      if (!s) return;
      if (s.waitFor && !s.waitFor(c)) {
        if (!t.waiting) { t.waiting = true; rovi.sticky('Great job! Keep collecting supplies. I will warn you when the storm comes.', 'tutorial'); }
        return;
      }
      if (t.waiting) { t.waiting = false; t.show(); return; }
      if (s.done(c)) { t.index++; t.stepTime = 0; if (t.index < steps.length) t.show(); }
    },
  };
  return t;
}
