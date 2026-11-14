/* =====================================================================
   Survive the Sol – GAME RULES
   This file has NO screen code. It only keeps the game "state" and
   changes the numbers. ui.js draws everything on the screen.
   Easy things to tweak are in LEVELS below (start values, daily drain,
   event chances).
   ===================================================================== */
(function (root) {
  'use strict';

  // The 3 core bars. Every bar goes from 0 to 100. If one hits 0 → mission fails.
  var BARS = ['power', 'life', 'rad'];

  // ---------- Level settings (change these to make the game easier/harder) ----------
  var LEVELS = {
    // Sol 0: one guided day. Fixed cards, a small real solar flare at the end.
    tutorial: {
      id: 'tutorial', days: 1, handSize: 4, picks: 2, cardSet: 'moon',
      start: { power: 60, life: 60, rad: 60, morale: 70, plant: 40 },
      drain: { power: 4, life: 4, rad: 2 },
      night: null, dust: null, commDelay: false,
      fixedHand: ['shield_wall', 'fix_solar', 'veg', 'research'],
      fixedEvent: 'flare',
      flareSet: 'moon', severityWeights: { mild: 100 },
      events: { quiet: 100 }
    },
    // Moon (easy): long lunar night in the middle, flares from THIS year (2026).
    moon: {
      id: 'moon', days: 12, handSize: 4, picks: 2, cardSet: 'moon',
      start: { power: 80, life: 75, rad: 90, morale: 70, plant: 50 },
      drain: { power: 5, life: 6, rad: 2 },
      // Lunar night from day 6 to day 10: solar panels make less power.
      night: { from: 6, to: 10, power: 5 },
      dust: null, commDelay: false,
      events: { flare: 26, failure: 14, quiet: 60 },
      flareSet: 'moon', severityWeights: { mild: 40, strong: 45, extreme: 15 }
    },
    // Mars (hard): fewer cards, dust storms, the strongest 2024 flares, message delay.
    mars: {
      id: 'mars', days: 12, handSize: 3, picks: 2, cardSet: 'mars',
      start: { power: 70, life: 70, rad: 80, morale: 65, plant: 50 },
      drain: { power: 5, life: 6, rad: 2 },
      night: null,
      dust: { days: 2, power: 6 },   // a dust storm lasts 2 more days
      commDelay: true,
      events: { flare: 20, dust: 22, failure: 14, quiet: 44 },
      flareSet: 'mars', severityWeights: { extreme: 100 }  // only X-class flares
    }
  };

  var DAILY_MORALE_DROP = 3;
  var DAILY_PLANT_DROP = 10;
  var LOW_MORALE = 30;          // below this the crew is tired: card gains are smaller
  var FAILURE_HIT = 10;         // equipment failure damage

  // ---------- small helpers ----------
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function pickRandom(list, rng) { return list[Math.floor(rng() * list.length)]; }
  function pickWeighted(weights, rng) {
    var total = 0, k;
    for (k in weights) total += weights[k];
    var r = rng() * total;
    for (k in weights) { r -= weights[k]; if (r < 0) return k; }
    return k;
  }
  function shuffle(list, rng) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  /* ---------------------------------------------------------------
     newGame(levelId, data)
     data = { cards: [...], flares: { moon: [...], mars: [...] },
              radiation: {moon: 1.0, mars: 1.0} (optional scale) }
     --------------------------------------------------------------- */
  function newGame(levelId, data, rng) {
    var level = LEVELS[levelId];
    var s = {
      level: level,
      sol: 1,
      bars: { power: level.start.power, life: level.start.life, rad: level.start.rad },
      morale: level.start.morale,
      plant: level.start.plant,
      score: 0,
      picksLeft: level.picks,
      playedToday: [],
      hand: [],
      shelter: false,
      dustLeft: 0,
      nextEvent: null,
      usedFlares: {},
      history: [],          // every card played: {sol, id}
      log: [],              // every end-of-day report
      over: false, won: false, fail: null,
      rng: rng || Math.random,
      cards: data.cards.filter(function (c) { return c.levels.indexOf(level.cardSet) >= 0; }),
      allCards: data.cards,
      flares: (data.flares && data.flares[level.flareSet]) || [],
      // How much harsher the radiation is than on the ISS (from RadLab data, step 3).
      radScale: (data.radiation && data.radiation[level.cardSet]) || 1
    };
    s.nextEvent = rollEvent(s);
    dealHand(s);
    return s;
  }

  function isNight(s) {
    var n = s.level.night;
    return !!n && s.sol >= n.from && s.sol <= n.to;
  }
  function isDusty(s) { return s.dustLeft > 0; }

  // Deal new cards. One card always helps the lowest bar (kid-friendly).
  function dealHand(s) {
    var lvl = s.level, rng = s.rng;
    s.playedToday = [];
    s.picksLeft = lvl.picks;
    if (lvl.fixedHand) {
      s.hand = lvl.fixedHand.map(findCard.bind(null, s)).filter(Boolean);
      return s.hand;
    }
    var lowest = BARS.slice().sort(function (a, b) { return s.bars[a] - s.bars[b]; })[0];
    var helpers = s.cards.filter(function (c) { return (c.effects[lowest] || 0) > 0; });
    var hand = [];
    if (helpers.length) hand.push(pickRandom(helpers, rng));
    var rest = shuffle(s.cards.filter(function (c) { return hand.indexOf(c) < 0; }), rng);
    while (hand.length < lvl.handSize && rest.length) hand.push(rest.pop());
    s.hand = shuffle(hand, rng);
    return s.hand;
  }

  function findCard(s, id) {
    for (var i = 0; i < s.allCards.length; i++) if (s.allCards[i].id === id) return s.allCards[i];
    return null;
  }

  // The REAL effect of a card right now (night, dust and tired crew change it).
  function cardEffects(s, card) {
    var out = {};
    for (var k in card.effects) {
      var v = card.effects[k];
      if (k === 'power' && v > 0 && card.solar && (isNight(s) || isDusty(s))) v = v / 2;
      if (v > 0 && k !== 'morale' && s.morale < LOW_MORALE) v = v * 0.75;
      out[k] = Math.round(v);
    }
    return out;
  }

  // Can the player pick this card? (Not if it would empty a bar.)
  function canPlay(s, card) {
    if (s.over || s.picksLeft <= 0) return { ok: false, reason: 'noPicks' };
    if (s.playedToday.indexOf(card.id) >= 0) return { ok: false, reason: 'played' };
    var fx = cardEffects(s, card);
    for (var i = 0; i < BARS.length; i++) {
      var b = BARS[i];
      if (fx[b] < 0 && s.bars[b] + fx[b] <= 0) return { ok: false, reason: 'low', bar: b };
    }
    return { ok: true };
  }

  function playCard(s, cardId) {
    var card = findCard(s, cardId);
    var check = canPlay(s, card);
    if (!check.ok) return null;
    var fx = cardEffects(s, card);
    applyEffects(s, fx);
    if (card.shelter) s.shelter = true;
    s.playedToday.push(card.id);
    s.history.push({ sol: s.sol, id: card.id });
    s.picksLeft--;
    return fx;
  }

  function applyEffects(s, fx) {
    for (var k in fx) {
      if (BARS.indexOf(k) >= 0) s.bars[k] = clamp(s.bars[k] + fx[k]);
      else if (k === 'morale') s.morale = clamp(s.morale + fx[k]);
      else if (k === 'plant') s.plant = clamp(s.plant + fx[k]);
      else if (k === 'score') s.score = Math.max(0, s.score + fx[k]);
    }
  }

  // Decide tonight's event at the START of the day (so ROVI can warn you).
  function rollEvent(s) {
    var lvl = s.level, rng = s.rng;
    var type = lvl.fixedEvent || pickWeighted(lvl.events, rng);
    if (type === 'dust' && isDusty(s)) type = 'quiet';     // no storm on top of a storm
    if (type === 'flare' && !s.flares.length) type = 'quiet';
    if (s.sol === 1 && !lvl.fixedEvent && type !== 'quiet') type = 'quiet'; // gentle first day
    var ev = { type: type };
    if (type === 'flare') ev.flare = pickFlare(s);
    if (type === 'failure') ev.bar = pickRandom(BARS, rng);
    return ev;
  }

  function pickFlare(s) {
    var sev = pickWeighted(s.level.severityWeights, s.rng);
    var list = s.flares.filter(function (f) { return f.severity === sev && !s.usedFlares[f.id]; });
    if (!list.length) list = s.flares;
    var f = pickRandom(list, s.rng);
    s.usedFlares[f.id] = true;
    return f;
  }

  /* ---------------------------------------------------------------
     endDay(s): daily needs + tonight's event. Returns a report the UI
     shows in a pop-up. If a bar hits 0 we remember WHY (report.fail).
     --------------------------------------------------------------- */
  function endDay(s) {
    var lvl = s.level;
    var rep = { sol: s.sol, night: isNight(s), dusty: isDusty(s), changes: [], event: s.nextEvent, fail: null };

    function hit(bar, amount, cause) {
      amount = Math.round(amount);
      if (amount <= 0) return;
      s.bars[bar] = clamp(s.bars[bar] - amount);
      rep.changes.push({ bar: bar, amount: -amount, cause: cause });
      if (s.bars[bar] <= 0 && !rep.fail) rep.fail = { bar: bar, cause: cause, event: rep.event };
    }

    // 1) Daily needs: the crew uses power, air/water/food and gets some radiation.
    // In the lunar night or a dust storm the power loss is bigger – and if power
    // runs out then, the night/storm is the reason (shown on the fail screen).
    var powerLoss = lvl.drain.power, powerCause = 'daily';
    if (rep.night) { powerLoss += lvl.night.power; powerCause = 'night'; }
    if (rep.dusty) { powerLoss += lvl.dust.power; powerCause = 'dust'; }
    hit('power', powerLoss, powerCause);
    hit('life', lvl.drain.life, 'daily');
    hit('rad', lvl.drain.rad * s.radScale, 'daily');
    s.morale = clamp(s.morale - DAILY_MORALE_DROP);
    s.plant = clamp(s.plant - DAILY_PLANT_DROP);

    // 2) Tonight's event.
    var ev = s.nextEvent;
    if (ev.type === 'flare') {
      var amount = ev.flare.radiation_hit;
      rep.sheltered = s.shelter;
      if (s.shelter) amount = amount / 2;
      hit('rad', amount, 'flare');
    } else if (ev.type === 'failure') {
      hit(ev.bar, FAILURE_HIT, 'failure');
    } else if (ev.type === 'dust') {
      hit('power', lvl.dust.power, 'dust');
      s.dustLeft = lvl.dust.days + 1;  // +1 because we count down below
    } else if (ev.type === 'quiet') {
      s.morale = clamp(s.morale + 5);
    }
    if (s.dustLeft > 0) s.dustLeft--;
    s.shelter = false;
    s.log.push(rep);

    // 3) Win or lose?
    if (rep.fail) {
      s.over = true; s.fail = rep.fail;
    } else if (s.sol >= lvl.days) {
      s.over = true; s.won = true; rep.win = true;
    } else {
      s.sol++;
      s.nextEvent = rollEvent(s);
      dealHand(s);
    }
    return rep;
  }

  // Save / restore the day's numbers, so the player can un-select a card
  // before pressing "End Day".
  function snapshot(s) {
    return {
      bars: { power: s.bars.power, life: s.bars.life, rad: s.bars.rad },
      morale: s.morale, plant: s.plant, score: s.score, shelter: s.shelter,
      picksLeft: s.picksLeft, playedToday: s.playedToday.slice(), historyLength: s.history.length
    };
  }
  function restore(s, snap) {
    s.bars = { power: snap.bars.power, life: snap.bars.life, rad: snap.bars.rad };
    s.morale = snap.morale; s.plant = snap.plant; s.score = snap.score; s.shelter = snap.shelter;
    s.picksLeft = snap.picksLeft; s.playedToday = snap.playedToday.slice();
    s.history.length = snap.historyLength;
  }

  // Rank for the newspaper: Cadet / Pilot / Commander.
  function rank(s) {
    if (!s.won) return 'cadet';
    return (s.score >= 35 && s.plant > 0) ? 'commander' : 'pilot';
  }

  // "What would a real astronaut do?" – compare choices with NASA practice.
  function debrief(s) {
    var played = {};
    s.history.forEach(function (h) { played[h.id] = (played[h.id] || 0) + 1; });
    var flares = s.log.filter(function (r) { return r.event && r.event.type === 'flare'; });
    var sheltered = flares.filter(function (r) { return r.sheltered; }).length;
    var out = [];
    if (flares.length) out.push({ key: sheltered ? 'shelter_good' : 'shelter_tip', good: sheltered > 0 });
    out.push({ key: (played.shield_wall || played.water_wall) ? 'shield_good' : 'shield_tip',
               good: !!(played.shield_wall || played.water_wall) });
    out.push({ key: played.veg ? 'food_good' : 'food_tip', good: !!played.veg });
    if (s.level.night) out.push({ key: played.nuclear ? 'night_good' : 'night_tip', good: !!played.nuclear });
    if (s.level.commDelay) out.push({ key: 'delay_note', good: true });
    if (played.rest || played.exercise) out.push({ key: 'rest_good', good: true });
    return out;
  }

  var Game = {
    BARS: BARS, LEVELS: LEVELS, LOW_MORALE: LOW_MORALE,
    newGame: newGame, dealHand: dealHand, canPlay: canPlay, playCard: playCard,
    cardEffects: cardEffects, endDay: endDay, isNight: isNight, isDusty: isDusty,
    rank: rank, debrief: debrief, findCard: findCard, snapshot: snapshot, restore: restore
  };
  root.Game = Game;
  if (typeof module !== 'undefined' && module.exports) module.exports = Game;
})(typeof window !== 'undefined' ? window : globalThis);
