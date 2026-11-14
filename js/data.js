/* =====================================================================
   Survive the Sol – DATA LOADER
   Loads the JSON files in /data with fetch().
   NOTE: fetch() does not work if you double-click index.html (file://).
   Run a small web server instead:   python -m http.server 8000
   All NASA data here is an ARCHIVED snapshot saved by our scripts.
   It is never live, and no API key is used anywhere.
   ===================================================================== */
(function (root) {
  'use strict';

  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
      return r.json();
    });
  }
  // Optional files: if missing, the game still works.
  function getOptional(path) {
    return getJSON(path).catch(function () { return null; });
  }

  var SolData = {
    load: function () {
      return Promise.all([
        getJSON('data/cards.json'),
        getJSON('data/flares_2026.json'),   // Moon level: flares from this year
        getJSON('data/flares.json'),        // Mars level: strongest flares of 2024
        getOptional('data/radiation.json'), // RadLab dose rates (step 3)
        getOptional('data/facts.json')      // OSDR "Did you know?" facts (step 3)
      ]).then(function (res) {
        var cards = res[0], f2026 = res[1], f2024 = res[2], rad = res[3], facts = res[4];
        return {
          cards: cards.cards,
          flares: {
            moon: f2026.events,
            // Mars uses only the big ones: X-class ("extreme") flares of 2024.
            mars: f2024.events.filter(function (e) { return e.severity === 'extreme'; })
          },
          flareMeta: {
            moon: { dataset: f2026.dataset, fetched_on: f2026.fetched_on },
            mars: { dataset: f2024.dataset, fetched_on: f2024.fetched_on }
          },
          radiation: rad && rad.game_scale ? rad.game_scale : null,
          radiationInfo: rad,
          facts: facts ? facts.facts : []
        };
      });
    }
  };
  root.SolData = SolData;
})(window);
