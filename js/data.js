// =====================================================================
// DATA – loads the archived NASA data files (no API calls, no keys).
//   data/flares_2026.json  NASA CCMC DONKI solar flares (Moon missions)
//   data/flares.json       NASA CCMC DONKI solar flares 2024 (Mars missions)
//   data/radiation.json    NASA OSDR RadLab dose rates (radiation scaling)
//   data/facts.json        NASA OSDR study facts ("Did you know?")
//   data/cards.json        Plan cards with their "Real science" lines
// fetch() needs a web server: run  python -m http.server  (see README).
// =====================================================================

function getJSON(path) {
  return fetch(path).then((r) => {
    if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
    return r.json();
  });
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
    flares: {
      moon: f2026.events,                                              // all 2026 flares (C, M and X class)
      mars: f2024.events.filter((e) => e.severity !== 'mild'),         // Mars: only the strong M and X flares of 2024
    },
    flareInfo: {
      moon: { file: 'data/flares_2026.json', year: 2026, count: f2026.count, fetched: f2026.fetched_on },
      mars: { file: 'data/flares.json', year: 2024, count: f2024.events.filter((e) => e.severity !== 'mild').length, total: f2024.count, fetched: f2024.fetched_on },
    },
    radiation,
    facts: facts.facts,
    factsInfo: { fetched: facts.fetched_on },
  };
}

// How much a flare class matters. Bigger class = faster storm + more radiation.
export function flarePower(flare) {
  const letter = (flare.class || 'C').charAt(0).toUpperCase();
  const size = parseFloat(flare.class.slice(1)) || 1;
  if (letter === 'X') return { damage: 1.5 + Math.min(0.5, (size - 1) * 0.07), speed: 0.85, label: 'X-class (the strongest kind)' };
  if (letter === 'M') return { damage: 1.0 + Math.min(0.3, (size - 1) * 0.04), speed: 1.0, label: 'M-class (strong)' };
  return { damage: 0.6, speed: 1.15, label: 'C-class (small)' };
}
