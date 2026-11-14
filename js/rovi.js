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
    { text: 'Hi, I am ROVI! Every [[sol]] starts with a plan. Pick ONE card: it helps one bar but costs another.', done: (c) => c.phase !== 'briefing' },
    { text: 'You are in the lander! Press [Space] (or JUMP) to jump out.', done: (c) => c.playerMode !== 'lander' },
    { text: 'Steer your thrusters with [W] [A] [S] [D]. Land near glowing supplies or a hut!', done: (c) => c.phase === 'explore' && c.playerMode === 'walk' },
    { text: 'Walk with [W] [A] [S] [D] and drag the mouse to look around. Hold [Shift] to sprint.', done: (c) => c.moved > 12 },
    { text: 'See the glowing beams? Walk into a supply to put it in your backpack.', done: (c) => c.collected > 0 },
    { text: 'Press [Tab] (or BAG) to open your backpack. It has only a few slots, so choose well!', done: (c) => c.bagOpened },
    { text: 'Press [1] to use the item in slot 1. Use supplies when a bar gets low.', done: (c) => c.used > 0 },
    { text: 'Rovers are fast, but driving uses Power! Find a rover (white square on the map) and press [E].', done: (c) => c.droveRover || c.stepTime > 30 },
    { text: 'A REAL [[solar flare]] is coming! Stay inside the glowing circle and go to the yellow beam: that is your storm shelter.', done: (c) => c.inFinal, waitFor: (c) => c.stormStage !== 'calm' },
    { text: 'You made it to the shelter! Inside, the crew is safe from radiation. Press [F] to fast-forward the storm.', done: () => false },
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
