// =====================================================================
// DATA – loads the archived NASA data files (no API calls, no keys).
//   data/flares_2026.json  NASA CCMC DONKI solar flares 2026 (Moon)
//   data/flares.json       NASA CCMC DONKI solar flares 2024 (Mars)
//   data/radiation.json    NASA OSDR RadLab dose rates (radiation scaling)
//   data/facts.json        NASA OSDR study facts ("Did you know?")
//   data/cards.json        Emergency cards with their real science lines
// fetch() needs a web server: run  python -m http.server  (see README).
// =====================================================================

function getJSON(path) {
  return fetch(path).then((r) => {
    if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
    return r.json();
  });
}

// Sort flares by their class letter: { C: [...], M: [...], X: [...] }
function byClass(events) {
  const out = { C: [], M: [], X: [] };
  for (const e of events) {
    const k = (e.class || '').charAt(0).toUpperCase();
    if (out[k]) out[k].push(e);
  }
  return out;
}

export async function loadData() {
  const [cards, f2026, f2024, radiation, facts] = await Promise.all([
    getJSON('data/cards.json'),
    getJSON('data/flares_2026.json'),
    getJSON('data/flares.json'),
    getJSON('data/radiation.json'),
    getJSON('data/facts.json'),
  ]);
  return {
    cards: cards.cards,
    dangers: cards.dangers,
    flares: { moon: byClass(f2026.events), mars: byClass(f2024.events) },
    flareInfo: {
      moon: { year: 2026, count: f2026.count, fetched: f2026.fetched_on },
      mars: { year: 2024, count: f2024.count, fetched: f2024.fetched_on },
    },
    radiation,
    facts: facts.facts,
  };
}

// Which flare class a day gets: easy first win, then harder.
//  Moon: days 1–3 C-class, 4–8 M-class, 9–12 X-class.
//  Mars (harder): days 1–3 M-class, 4–12 X-class.
export function classForDay(level, day) {
  if (level === 'mars') return day <= 3 ? 'M' : 'X';
  return day <= 3 ? 'C' : day <= 8 ? 'M' : 'X';
}

// Pick a real flare of that class that was not used yet in this mission.
export function pickFlare(data, level, day, used) {
  const letter = classForDay(level, day);
  let pool = data.flares[level][letter].filter((f) => !used.has(f.id));
  if (!pool.length) pool = data.flares[level][letter];
  const f = pool[Math.floor(Math.random() * pool.length)];
  used.add(f.id);
  return f;
}

// How strong a flare is for the game (bigger class = more radiation).
export function flareStrength(flare) {
  const letter = (flare.class || 'C').charAt(0).toUpperCase();
  const size = parseFloat(flare.class.slice(1)) || 1;
  if (letter === 'X') return { hit: 20 + Math.min(8, (size - 1) * 1.2), zone: 1.5, label: 'X-class – the strongest kind' };
  if (letter === 'M') return { hit: 14, zone: 1.0, label: 'M-class – a strong flare' };
  return { hit: 8, zone: 0.6, label: 'C-class – a small flare' };
}
