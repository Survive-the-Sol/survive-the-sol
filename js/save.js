// =====================================================================
// SAVE – progress and settings, kept in this browser (localStorage).
// Everything is wrapped in try/catch: private windows may block storage,
// and the game must still work.
// =====================================================================

const KEY = 'sts-royale-v1';

const reduceMotionDefault = (() => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
})();

const DEFAULTS = {
  name: '',
  xp: 0,
  moonWon: false,
  marsWon: false,
  tutorialDone: false,
  missions: 0,
  settings: {
    quality: 'medium', volume: 0.7, music: true, reduceMotion: reduceMotionDefault,
    sensitivity: 1, missionLength: 12, unlockAll: false, touch: 'auto',
    suit: 'yellow', roverSkin: 'white',
  },
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

export const save = {
  data: clone(DEFAULTS),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.data = { ...clone(DEFAULTS), ...d, settings: { ...DEFAULTS.settings, ...(d.settings || {}) } };
      }
    } catch (e) { /* storage blocked: keep defaults */ }
    return this.data;
  },
  write() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },
  reset() { this.data = clone(DEFAULTS); this.write(); },
};

// ---------- ranks + unlocks (by total XP) ----------
export const RANKS = [
  { id: 'cadet', label: 'Cadet', xp: 0 },
  { id: 'pilot', label: 'Pilot', xp: 800 },
  { id: 'commander', label: 'Commander', xp: 2500 },
  { id: 'specialist', label: 'Mission Specialist', xp: 5000 },
];
export function rankFor(xp) {
  let r = RANKS[0];
  for (const k of RANKS) if (xp >= k.xp) r = k;
  return r;
}
export function nextRank(xp) { return RANKS.find((k) => k.xp > xp) || null; }

export const SUITS = [
  { id: 'yellow', label: 'Space Apps yellow', color: '#e8f22a', xp: 0 },
  { id: 'teal', label: 'Teal', color: '#7cf5c8', xp: 300 },
  { id: 'coral', label: 'Coral', color: '#ff6b6b', xp: 900 },
  { id: 'purple', label: 'Nebula purple', color: '#b06bff', xp: 1800 },
  { id: 'gold', label: 'Gold', color: '#ffc94a', xp: 3500 },
];
export const ROVER_SKINS = [
  { id: 'white', label: 'Classic white', color: '#eef1f8', xp: 0 },
  { id: 'orange', label: 'Rescue orange', color: '#ff9f43', xp: 600 },
  { id: 'blue', label: 'Deep blue', color: '#4f7bff', xp: 1500 },
];
export const BACKPACK_UNLOCKS = [0, 500, 2000];   // XP needed for backpack level 1 / 2 / 3
export function backpackLevelFor(xp) { return BACKPACK_UNLOCKS.filter((x) => xp >= x).length; }
