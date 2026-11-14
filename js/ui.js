/* =====================================================================
   Survive the Sol – SCREEN CODE
   Draws the game (gauges, cards, panels, pop-ups, newspaper) and reacts
   to clicks and keys. Game rules live in game.js, words in strings.js,
   icons in icons.js, sounds in sound.js.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // Which icon goes with each kind of effect.
  var FX_ICON = { power: 'power', life: 'life', rad: 'rad', score: 'score', morale: 'morale', plant: 'plant' };
  var FX_NAME = { power: 'bar_power', life: 'bar_life', rad: 'bar_rad', score: 'score', morale: 'panel_crew', plant: 'panel_plant' };
  var LEVEL_ICON = { tutorial: 'graduation', moon: 'moon', mars: 'planet' };
  var NEXT_LEVEL = { tutorial: 'moon', moon: 'mars' };

  var UI = {
    data: null,        // everything from SolData.load()
    s: null,           // the current game state (from Game.newGame)
    levelId: null,
    name: '',
    selected: [],      // card ids picked today (can be un-picked before End Day)
    daySnap: null      // numbers at the start of the day (for un-picking)
  };

  // ---------- helpers ----------
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function signed(n) { return (n > 0 ? '+' : '−') + Math.abs(n); }
  function show(screenId) {
    ['screen-title', 'screen-game', 'screen-end'].forEach(function (id) { $(id).hidden = id !== screenId; });
    window.scrollTo(0, 0);
  }
  // A small "?" button that explains a hard word. label = optional word on the button.
  function tipButton(key, label) {
    return '<button class="tip' + (label ? ' tip-word' : '') + '" type="button" data-tip="' + key + '" aria-label="' +
      esc((label || '') + ' ' + t('whatIs')) + '">' + esc(label ? label + '?' : '?') + '</button>';
  }
  function chip(key, value) {
    return '<span class="chip ' + (value > 0 ? 'up' : 'down') + '">' + icon(FX_ICON[key]) +
      '<span class="sr-only">' + esc(t(FX_NAME[key])) + '</span>' + signed(value) + '</span>';
  }
  function flareLabel(f) { return f.kid_label || t('flare_' + f.severity); }

  // Fill every element that has data-s="key" with the right words.
  function applyStaticText() {
    document.querySelectorAll('[data-s]').forEach(function (el) { el.textContent = t(el.getAttribute('data-s')); });
    document.querySelectorAll('[data-s-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-s-ph')); });
    $('startBtn').innerHTML = icon('rocket') + '<span>' + esc(t('startTraining')) + '</span>';
    $('endDayBtn').innerHTML = icon('moon') + '<span>' + esc(t('endDay')) + '</span>';
    $('scoreIcon').innerHTML = icon('score');
    document.querySelectorAll('.mission-card').forEach(function (b) {
      var id = b.getAttribute('data-level');
      b.innerHTML =
        '<span class="mission-top"><span class="mission-icon">' + icon(LEVEL_ICON[id]) + '</span>' +
        '<span class="tag">' + esc(t('diff_' + id)) + '</span></span>' +
        '<h3>' + esc(t('lvl_' + id)) + '</h3><p>' + esc(t('lvl_' + id + '_d')) + '</p>' +
        '<span class="mission-meta">' + icon('database') + esc(t('data_' + id)) + '</span>';
    });
    renderSoundBtn();
  }

  function renderSoundBtn() {
    var on = Sound.isOn(), b = $('soundBtn');
    b.innerHTML = icon(on ? 'volumeOn' : 'volumeOff');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? t('soundOn') : t('soundOff'));
    b.title = on ? t('soundOn') : t('soundOff');
  }

  // ---------- starting a mission ----------
  function startLevel(levelId) {
    UI.levelId = levelId;
    UI.name = ($('playerName').value || '').trim() || 'Ayesha';
    try { localStorage.setItem('sts-name', UI.name); } catch (e) { /* ignore */ }
    UI.s = Game.newGame(levelId, UI.data);
    UI.gaugesBuilt = false;
    UI.prevBars = null;
    UI.lastBars = null;   // Mars: Earth only knows yesterday's numbers
    UI.tutStep = levelId === 'tutorial' ? 1 : 0;
    startDay();
    document.body.className = 'level-' + levelId;
    $('marsCredit').hidden = levelId !== 'mars';
    hideTip();
    show('screen-game');
    Sound.play('click');
    render();
    if (UI.tutStep) showTutorialStep(); else updateCoach();
    if (!UI.tutStep) focusFirstCard();
  }
  function startDay() {
    UI.selected = [];
    UI.daySnap = Game.snapshot(UI.s);
  }
  function focusFirstCard() {
    var c = $('hand').querySelector('.card:not([disabled])');
    if (c) c.focus();
  }

  // ---------- drawing the game screen ----------
  function render() {
    var s = UI.s;
    $('hudMission').hidden = false;
    $('hudMission').innerHTML = icon(LEVEL_ICON[s.level.id]) + '<span>' + esc(t('lvl_' + s.level.id)) + '</span>';
    $('hudSol').hidden = false;
    $('hudSol').innerHTML = '<span>' + esc(s.level.id === 'tutorial' ? t('sol0') : t('sol', { n: s.sol, total: s.level.days }).toUpperCase()) +
      '</span>' + tipButton('tip_sol');
    $('opsTitle').textContent = t('chooseActions', { total: s.level.picks });
    $('scoreText').textContent = s.score;
    renderBars();
    renderHand();
    renderSide();

    var n = UI.selected.length, total = s.level.picks;
    var playable = s.hand.some(function (c) { return UI.selected.indexOf(c.id) < 0 && Game.canPlay(s, c).ok; });
    var ready = n >= total || !playable;
    $('selCount').innerHTML = icon(ready ? 'check' : 'grid') + '<span>' + esc(t('selectedCount', { n: n, total: total })) + '</span>';
    $('selCount').classList.toggle('ready', ready);
    $('pickText').textContent = n >= total ? t('picksDone') : (!playable ? t('noneLeft') : '');
    $('endDayBtn').disabled = !ready;
    setFx();
  }

  // Gauges are built once per game, then only updated → smooth animation.
  function renderBars() {
    var s = UI.s, prev = UI.prevBars;
    if (!UI.gaugesBuilt) {
      $('bars').innerHTML = Game.BARS.map(function (b) {
        var extra = b === 'rad' ? tipButton('tip_dose', t('doseWord')) : '';
        return '<div class="gauge bar-' + b + '" data-bar="' + b + '">' +
          '<div class="gauge-head"><span class="gauge-icon">' + icon(FX_ICON[b]) + '</span>' +
          '<span class="gauge-label">' + esc(t('bar_' + b)) + ' ' + tipButton('tip_' + b) + extra + '</span>' +
          '<span class="gauge-num">0</span></div>' +
          '<div class="gauge-track" role="progressbar" aria-label="' + esc(t('bar_' + b)) + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="gauge-fill" style="width:0%"></div></div></div>';
      }).join('');
      UI.gaugesBuilt = true;
    }
    Game.BARS.forEach(function (b) {
      var v = s.bars[b];
      var g = $('bars').querySelector('[data-bar="' + b + '"]');
      g.classList.remove('good', 'warn', 'danger');
      g.classList.add(v > 50 ? 'good' : v > 25 ? 'warn' : 'danger');
      g.querySelector('.gauge-num').textContent = v;
      g.querySelector('.gauge-fill').style.width = v + '%';
      g.querySelector('.gauge-track').setAttribute('aria-valuenow', v);
      if (prev && prev[b] !== v) {
        var old = g.querySelector('.float-num');
        if (old) old.remove();
        var f = document.createElement('span');
        f.className = 'float-num ' + (v > prev[b] ? 'up' : 'down');
        f.setAttribute('aria-hidden', 'true');
        f.textContent = signed(v - prev[b]);
        g.appendChild(f);
      }
    });
    UI.prevBars = { power: s.bars.power, life: s.bars.life, rad: s.bars.rad };
  }

  function renderHand() {
    var s = UI.s, full = UI.selected.length >= s.level.picks;
    $('hand').innerHTML = s.hand.map(function (card, i) {
      var isSel = UI.selected.indexOf(card.id) >= 0;
      var check = isSel ? { ok: true } : Game.canPlay(s, card);
      var disabled = !isSel && (!check.ok || full);
      var fx = Game.cardEffects(s, card);
      var chips = Object.keys(fx).filter(function (k) { return fx[k]; }).map(function (k) { return chip(k, fx[k]); }).join('');
      var status = '';
      if (isSel) status = '<span class="card-status ok">' + icon('check') + esc(t('selected')) + '</span>';
      else if (check.reason === 'low') status = '<span class="card-status">' + icon('alert') + esc(t('tooLow', { bar: t('bar_' + check.bar) })) + '</span>';
      else if (card.solar && (Game.isNight(s) || Game.isDusty(s))) status = '<span class="card-status">' + icon('alert') + esc(t('halfSolar')) + '</span>';
      return '<button class="card' + (isSel ? ' is-selected' : '') + '" type="button" data-card="' + card.id + '" aria-pressed="' + isSel + '"' +
        (disabled ? ' disabled' : '') + '>' +
        '<span class="card-top"><span class="card-icon">' + icon(card.icon) + '</span>' +
        '<span class="card-title">' + esc(card.title) + '</span>' +
        '<span class="card-key" aria-hidden="true">' + (i + 1) + '</span></span>' +
        '<span class="card-desc">' + esc(card.desc) + '</span>' +
        '<span class="chips">' + chips + '</span>' + status +
        '<span class="card-science"><b>' + esc(t('scienceNote')) + ':</b> ' + esc(card.science) + '</span>' +
        '</button>';
    }).join('');
  }

  // ---------- side panels: conditions, crew, plant, NASA data ----------
  var CREW = [
    { key: 'crew_ayesha', initials: 'AY', offset: 5 },
    { key: 'crew_bilal', initials: 'BI', offset: 0 },
    { key: 'crew_zara', initials: 'ZA', offset: -5 }
  ];
  function plantState(v) { return v > 60 ? 'great' : v > 30 ? 'ok' : v > 0 ? 'weak' : 'dead'; }

  // A little drawn plant: more leaves when healthy, brown and drooping when wilted.
  function plantSvg(state) {
    var leaf = state === 'dead' ? '#9a6b3c' : state === 'weak' ? '#a3c96b' : '#5ee0a0';
    var leaves = { great: 3, ok: 2, weak: 1, dead: 1 }[state];
    var droop = state === 'dead' ? 'rotate(35 32 34)' : '';
    var parts = '<path d="M20 50h24l-3 12H23z" fill="#c9734a"/><rect x="18" y="46" width="28" height="6" rx="2" fill="#e08a5c"/>' +
      '<path d="M32 47V' + (state === 'great' ? 16 : state === 'ok' ? 24 : 32) + '" stroke="' + leaf + '" stroke-width="3" stroke-linecap="round" transform="' + droop + '"/>';
    var spots = [[32, 34, -1], [32, 28, 1], [32, 20, -1]];
    for (var i = 0; i < leaves; i++) {
      var p = spots[i], dx = p[2] * 11;
      parts += '<ellipse cx="' + (p[0] + dx) + '" cy="' + p[1] + '" rx="10" ry="5" fill="' + leaf + '" transform="rotate(' + (p[2] * -25) + ' ' + (p[0] + dx) + ' ' + p[1] + ') ' + droop + '"/>';
    }
    return '<svg class="plant-svg" viewBox="0 0 64 64" aria-hidden="true">' + parts + '</svg>';
  }

  function renderSide() {
    var s = UI.s;
    // conditions
    var conds = [];
    if (s.level.id === 'tutorial') conds.push(['graduation', 'cond_tutorial', '']);
    if (Game.isNight(s)) conds.push(['moon', 'cond_night', 'warn']);
    if (Game.isDusty(s)) conds.push(['tornado', 'cond_dust', 'warn']);
    if (s.level.commDelay) conds.push(['radio', 'cond_delay', '']);
    if (!conds.length) conds.push(['sun', 'cond_normal', '']);
    $('conditions').innerHTML = conds.map(function (c) {
      return '<p class="cond ' + c[2] + '">' + icon(c[0]) + '<span>' + esc(t(c[1])) + '</span></p>';
    }).join('');
    // crew morale
    $('crewPanel').innerHTML = CREW.map(function (c) {
      var m = s.morale + c.offset;
      var mood = m > 60 ? 'happy' : m > 30 ? 'ok' : 'sad';
      return '<div class="crew-member ' + mood + '"><span class="avatar" aria-hidden="true">' + c.initials + '</span>' +
        '<span class="crew-name">' + esc(t(c.key)) + '</span><span class="mood">' + icon('morale') + esc(t('mood_' + mood)) + '</span></div>';
    }).join('') + (s.morale < Game.LOW_MORALE ? '<p class="tired">' + esc(t('tiredNote')) + '</p>' : '');
    // plant
    var ps = plantState(s.plant);
    $('plantPanel').className = 'plant ' + ps;
    $('plantPanel').innerHTML = plantSvg(ps) + '<div style="flex:1"><p class="plant-state">' + esc(t('plant_' + ps)) + ' · ' + s.plant + '%</p>' +
      '<div class="plant-bar" role="progressbar" aria-label="' + esc(t('panel_plant')) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + s.plant + '">' +
      '<span style="width:' + s.plant + '%"></span></div></div>';
    // NASA data used in this level
    var rows = ['<p class="data-row">' + icon('flame') + '<span>' + esc(t('flare_source')) + '</span></p>'];
    var info = UI.data.radiationInfo, id = s.level.cardSet;
    if (info && info.game_scale && s.level.id !== 'tutorial') {
      rows.push('<p class="data-row">' + icon('gauge') + '<span>' +
        esc(t('rad_note_' + id, { x: info.game_scale[id] })).replace(info.game_scale[id] + '×', '<span class="num">' + info.game_scale[id] + '×</span>') +
        ' <a href="' + esc(info.source_link) + '" target="_blank" rel="noopener">' + esc(t('rad_source')) + '</a></span></p>');
    }
    $('dataPanel').innerHTML = rows.join('');
  }

  // Screen effects: dark lunar night, dust haze, red flare flash.
  function setFx() {
    var s = UI.s, b = document.body;
    b.classList.toggle('fx-night', !!s && Game.isNight(s));
    b.classList.toggle('fx-dust', !!s && Game.isDusty(s));
  }
  function flashFlare() {
    document.body.classList.remove('fx-flare');
    void document.body.offsetWidth; // restart animation
    document.body.classList.add('fx-flare');
    setTimeout(function () { document.body.classList.remove('fx-flare'); }, 1500);
  }

  // ---------- picking cards (pick / un-pick, then End Day) ----------
  function toggleCard(id) {
    var s = UI.s;
    var i = UI.selected.indexOf(id);
    if (i >= 0) {
      // Un-pick: go back to the start of the day and replay the other picks.
      UI.selected.splice(i, 1);
      Game.restore(s, UI.daySnap);
      UI.selected = UI.selected.filter(function (other) { return !!Game.playCard(s, other); });
      Sound.play('deselect');
    } else {
      if (UI.selected.length >= s.level.picks) return;
      if (!Game.playCard(s, id)) return;
      UI.selected.push(id);
      Sound.play('select');
    }
    render();
    if (UI.levelId === 'tutorial' && UI.tutStep >= 7) {
      UI.tutStep = UI.selected.length >= s.level.picks ? 8 : 7;
      showTutorialStep();
    }
    var again = $('hand').querySelector('[data-card="' + id + '"]');
    if (again && !again.disabled) again.focus();
    else if (!$('endDayBtn').disabled) $('endDayBtn').focus();
  }

  function onEndDay() {
    if ($('endDayBtn').disabled) return;
    UI.lastBars = { power: UI.s.bars.power, life: UI.s.bars.life, rad: UI.s.bars.rad };
    var rep = Game.endDay(UI.s);
    showDayReport(rep);
  }

  // ---------- "Did you know?" – real NASA facts (OSDR + RadLab), no repeats ----------
  function factPool() {
    var pool = (UI.data.facts || []).map(function (f) {
      return { icon: f.icon || 'lightbulb', text: f.text, source: f.source, link: f.source_link };
    });
    var info = UI.data.radiationInfo;
    if (info && info.places) {
      var iss = info.places.iss.median_uGy_per_hour;
      var ratio = function (k) { return (info.places[k].median_uGy_per_hour / iss).toFixed(1); };
      [['moon', 'dyk_rad_moon'], ['mars_surface', 'dyk_rad_mars'], ['deep_space', 'dyk_rad_deep']].forEach(function (p) {
        pool.push({ icon: 'gauge', text: t(p[1], { x: ratio(p[0]) }), source: t('rad_source'), link: info.source_link });
      });
    }
    return pool;
  }
  function nextFact() {
    var pool = factPool();
    if (!pool.length) return null;
    if (!UI.factOrder || !UI.factOrder.length) {
      UI.factOrder = pool.map(function (_, i) { return i; });
      for (var j = UI.factOrder.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1)), x = UI.factOrder[j]; UI.factOrder[j] = UI.factOrder[k]; UI.factOrder[k] = x;
      }
    }
    return pool[UI.factOrder.pop()];
  }
  function factHtml(f) {
    if (!f) return '';
    return '<div class="dyk"><span class="dyk-icon">' + icon(f.icon) + '</span><div><h3>' + esc(t('dyk_title')) + '</h3>' +
      '<p>' + esc(f.text) + '</p><p class="source"><a href="' + esc(f.link) + '" target="_blank" rel="noopener">' +
      esc(f.source) + icon('external') + '</a>' +
      (/archived/.test(f.source) ? '' : '<span>' + esc(t('archived')) + '</span>') + '</p></div></div>';
  }

  // ---------- end-of-day pop-up ----------
  var EVENT_ICON = { flare: 'flame', dust: 'tornado', failure: 'wrench', quiet: 'moon' };

  function showDayReport(rep) {
    var ev = rep.event, s = UI.s;
    var daily = {}, tonight = {};
    rep.changes.forEach(function (c) {
      var bucket = (c.cause === 'daily' || c.cause === 'night' || (c.cause === 'dust' && rep.dusty)) ? daily : tonight;
      bucket[c.bar] = (bucket[c.bar] || 0) + c.amount;
    });
    var hit = function (bar) { return -(tonight[bar] || 0); };
    var title, text, notes = '';
    if (ev.type === 'flare') {
      var f = ev.flare;
      title = esc(t('ev_flare_t', { cls: f['class'], date: f.date })) + ' ' + tipButton('tip_flare');
      text = t('ev_flare', { label: flareLabel(f).replace(/!$/, ''), hit: hit('rad') });
      if (rep.sheltered) notes += '<p class="good-note">' + icon('shieldCheck') + esc(t('ev_flare_sheltered')) + '</p>';
      if (UI.levelId !== 'mars' && /2026/.test(f.date)) notes += '<p class="caption">' + esc(t('ev_flare_this_year')) + '</p>';
    } else if (ev.type === 'dust') {
      title = esc(t('ev_dust_t')); text = t('ev_dust', { hit: hit('power') });
    } else if (ev.type === 'failure') {
      title = esc(t('ev_failure_t')); text = t('ev_failure_' + ev.bar, { hit: hit(ev.bar) });
    } else {
      title = esc(t('ev_quiet_t')); text = t('ev_quiet');
    }
    var chipsOf = function (obj) {
      return Object.keys(obj).map(function (b) { return chip(b, obj[b]); }).join(' ');
    };
    var extra = [];
    if (rep.night) extra.push(t('night'));
    if (rep.dusty) extra.push(t('dust'));
    var effects = '<div class="effects"><h3>' + esc(t('effectsTitle')) + '</h3>' +
      '<p class="caption">' + esc(t('dailyNeeds')) + (extra.length ? ' (' + esc(extra.join(', ')) + ')' : '') + '</p>' +
      '<div class="chips">' + chipsOf(daily) + '</div>' +
      (Object.keys(tonight).length ? '<p class="caption" style="margin-top:10px">' + esc(t('eventEffect')) + '</p><div class="chips">' + chipsOf(tonight) + '</div>' : '') +
      '</div>';
    var source = '';
    if (ev.type === 'flare') {
      source = '<p class="source">' + icon('database') + '<span>' + esc(t('source', { src: 'NASA CCMC DONKI' })) + '</span>' +
        (ev.flare.source_link ? '<a href="' + esc(ev.flare.source_link) + '" target="_blank" rel="noopener">' + esc(t('openSource')) + icon('external') + '</a>' : '') + '</p>';
    }
    $('modalBody').innerHTML =
      '<div class="ev-' + ev.type + '">' +
      '<div class="alert-band">' + icon(EVENT_ICON[ev.type]) + '<span>' + esc(t('alert_' + ev.type)) + '</span></div>' +
      '<div class="modal-body">' +
      '<p class="modal-day">' + esc(t('dayReport', { n: UI.levelId === 'tutorial' ? 0 : rep.sol })) + '</p>' +
      '<h2 id="modalTitle" class="modal-title">' + title + '</h2>' +
      '<p class="modal-text">' + esc(text) + '</p>' + notes + effects + source +
      (s.over ? '' : factHtml(nextFact())) +
      '</div></div>';
    $('modalBtn').innerHTML = '<span>' + esc(s.over ? t('seeResult') : t('continueTo', { n: s.sol })) + '</span>' + icon('arrowRight');
    openModal();
    if (ev.type === 'flare') { flashFlare(); Sound.play('alarm'); }
    else if (ev.type === 'dust' || ev.type === 'failure') Sound.play('alarm');
    else Sound.play('day');
  }

  function openModal() {
    var m = $('modal');
    if (typeof m.showModal === 'function') m.showModal(); else m.setAttribute('open', '');
    $('modalBtn').focus();
  }
  function closeModal() {
    var m = $('modal');
    if (typeof m.close === 'function') m.close(); else m.removeAttribute('open');
  }

  function onModalBtn() {
    closeModal();
    hideTip();
    Sound.play('click');
    if (UI.s.over) { showEnd(); return; }
    startDay();
    render();
    updateCoach();
    focusFirstCard();
  }

  // ---------- ROVI coach panel ----------
  function coach(text, nextLabel) {
    $('coachText').textContent = text || '';
    $('coachNext').hidden = !nextLabel;
    if (nextLabel) $('coachNext').innerHTML = '<span>' + esc(nextLabel) + '</span>' + icon('arrowRight');
  }
  function highlight(selector) {
    document.querySelectorAll('.highlight').forEach(function (el) { el.classList.remove('highlight'); });
    if (selector) { var el = document.querySelector(selector); if (el) el.classList.add('highlight'); }
  }

  // Tutorial: ROVI explains each bar and the cards, one step at a time.
  var TUT_TARGETS = { 2: '.bar-power', 3: '.bar-life', 4: '.bar-rad', 5: '#bars', 6: '#hand', 8: '#endDayBtn' };
  function showTutorialStep() {
    var n = UI.tutStep;
    $('earthText').hidden = true;
    $('coach').classList.remove('alert');
    coach(t('tut_' + n), n < 7 ? t('tutNext') : null);
    highlight(TUT_TARGETS[n]);
    if (n < 7) $('coachNext').focus();
  }
  function onCoachNext() {
    if (UI.levelId === 'tutorial' && UI.tutStep < 7) {
      UI.tutStep++;
      Sound.play('click');
      showTutorialStep();
      if (UI.tutStep === 7) focusFirstCard();
    }
  }

  // What ROVI says at the start of a normal day.
  function updateCoach() {
    var s = UI.s;
    highlight(null);
    coach(roviTip(s));
    $('coach').classList.toggle('alert', s.nextEvent.type === 'flare' || s.nextEvent.type === 'dust');
    // Mars: Earth's message is about YESTERDAY, because messages are slow.
    $('earthText').hidden = !s.level.commDelay;
    if (s.level.commDelay) $('earthText').textContent = UI.lastBars ? t('earth_msg', UI.lastBars) : t('earth_first');
  }

  // ROVI looks at tonight's event and your bars, and gives ONE helpful tip.
  function roviTip(s) {
    var ev = s.nextEvent.type, n = s.level.night;
    if (ev === 'flare') return t('rovi_flare');
    if (ev === 'dust') return t('rovi_dust');
    if (n && s.sol === n.from - 1) return t('rovi_night_soon');
    var low = Game.BARS.filter(function (b) { return s.bars[b] < 30; })
      .sort(function (a, b) { return s.bars[a] - s.bars[b]; })[0];
    if (low) return t('rovi_low_' + low);
    if (Game.isNight(s)) return t('rovi_night');
    if (ev === 'failure') return t('rovi_failure');
    if (s.morale < Game.LOW_MORALE) return t('rovi_tired');
    if (s.plant <= 30) return t('rovi_plant');
    return t('rovi_ok_' + (1 + (s.sol % 3)));
  }

  // ---------- end screen ----------
  function failReason(fail) {
    var key = 'fail_' + fail.bar + '_' + fail.cause;
    if (fail.cause === 'flare') {
      var f = fail.event.flare;
      return t(key, { label: flareLabel(f).replace(/!$/, '').toLowerCase(), cls: f['class'], date: f.date });
    }
    if (!STRINGS[key]) key = 'fail_' + fail.bar + '_daily';
    return t(key);
  }
  function daysSurvived(s) { return s.won ? s.level.days : s.sol - 1; }

  function endButtons(levelId, includeAgain) {
    var next = NEXT_LEVEL[levelId];
    return '<div class="result-actions">' +
      (next ? '<button class="btn btn-primary btn-lg" type="button" data-go="' + next + '">' + esc(t('nextMission')) + ': ' + esc(t('lvl_' + next)) + icon('arrowRight') + '</button>' : '') +
      (includeAgain ? '<button class="btn ' + (next ? 'btn-secondary' : 'btn-primary') + ' btn-lg" type="button" data-go="' + levelId + '">' + icon('rotate') + esc(t('playAgain')) + '</button>' : '') +
      '<button class="btn btn-ghost btn-lg" type="button" data-go="menu">' + icon('grid') + esc(t('backToMenu')) + '</button></div>';
  }

  function showEnd() {
    var s = UI.s, html;
    document.body.classList.remove('fx-night', 'fx-dust');
    highlight(null);
    var fact = nextFact();
    if (s.level.id === 'tutorial') {
      html = '<div class="result win glass"><span class="result-icon">' + icon('graduation') + '</span>' +
        '<h2>' + esc(t('tutorialDone_t')) + '</h2><p class="reason">' + esc(t('tutorialDone')) + '</p>' +
        factHtml(fact) + endButtons('tutorial', false) + '</div>';
      Sound.play('win');
    } else {
      var rank = Game.rank(s);
      var storms = s.log.filter(function (r) { return r.event.type === 'flare'; }).length;
      html = '<div class="result ' + (s.won ? 'win' : 'lose') + ' glass">' +
        '<span class="result-icon">' + icon(s.won ? 'trophy' : 'octagon') + '</span>' +
        '<h2>' + esc(s.won ? t('win_t') : t('lose_t', { n: s.sol })) + '</h2>' +
        '<p class="reason">' + esc(s.won ? t('win', { n: s.level.days, name: UI.name }) : failReason(s.fail)) + '</p>' +
        (s.won ? '' : '<p class="tip-box">' + esc(t('tip_fail_' + s.fail.bar)) + '</p>') +
        '<span class="rank-badge">' + icon('trophy') + esc(t('paper_rank', { rank: t('rank_' + rank) })) + '</span>' +
        '<div class="stats">' +
        '<div class="stat"><b>' + daysSurvived(s) + '/' + s.level.days + '</b><span>' + esc(t('paper_days')) + '</span></div>' +
        '<div class="stat"><b>' + s.score + '</b><span>' + esc(t('paper_science')) + '</span></div>' +
        '<div class="stat"><b>' + storms + '</b><span>' + esc(t('paper_storms')) + '</span></div>' +
        '<div class="stat"><b>' + s.plant + '%</b><span>' + esc(t('paper_plant')) + '</span></div></div>' +
        factHtml(fact) + endButtons(s.level.id, true) + '</div>' +
        '<div class="end-grid"><div class="paper-wrap">' +
        '<canvas id="paper" width="900" height="1240" role="img" aria-label="' + esc(paperHeadline(s)) + '"></canvas>' +
        '<button id="downloadBtn" class="btn btn-primary" type="button">' + icon('download') + esc(t('download')) + '</button></div>' +
        '<div class="debrief glass"><h3>' + esc(t('debrief_title')) + '</h3><ul>' +
        Game.debrief(s).map(function (d) {
          return '<li class="' + (d.good ? 'db-good' : 'db-tip') + '">' + icon(d.good ? 'check' : 'lightbulb') + '<span>' + esc(t('db_' + d.key)) + '</span></li>';
        }).join('') +
        '</ul><p class="rank-info" style="margin-top:16px">' + esc(t('rank_info')) + '</p></div></div>';
      Sound.play(s.won ? 'win' : 'lose');
    }
    $('endContent').innerHTML = html;
    $('hudSol').hidden = true;
    show('screen-end');
    if ($('paper')) {
      var draw = function () { drawNewspaper($('paper'), s, fact); };
      draw();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
      $('downloadBtn').addEventListener('click', downloadPaper);
    }
    var first = $('endContent').querySelector('.result-actions .btn');
    if (first) first.focus();
  }

  function goMenu() {
    document.body.className = '';
    $('marsCredit').hidden = true;
    $('hudMission').hidden = true;
    $('hudSol').hidden = true;
    highlight(null);
    hideTip();
    show('screen-title');
  }

  // ---------- newspaper (drawn on a canvas so it can be saved as PNG) ----------
  function paperHeadline(s) {
    var p = { name: UI.name.toUpperCase(), place: t('place_' + s.level.id), n: daysSurvived(s) };
    return s.won ? t('paper_hl_win', p) : t('paper_hl_lose', p);
  }
  function flareStrength(cls) {
    var order = { X: 3, M: 2, C: 1 };
    return (order[cls.charAt(0)] || 0) * 100 + parseFloat(cls.slice(1) || 0);
  }
  function biggestFlare(s) {
    var best = null;
    s.log.forEach(function (r) {
      if (r.event.type === 'flare' && (!best || flareStrength(r.event.flare['class']) > flareStrength(best['class']))) best = r.event.flare;
    });
    return best;
  }
  // Writes text that wraps onto new lines. Returns the y after the last line.
  function wrapText(ctx, text, x, y, maxW, lineH) {
    var words = String(text).split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = words[i]; y += lineH; }
      else line = test;
    }
    if (line) { ctx.fillText(line, x, y); y += lineH; }
    return y;
  }
  // A tiny repeatable random generator, so the "photo" looks the same every time.
  function seeded(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

  // The "photo": a drawing of the outpost on the Moon or Mars.
  function drawOutpost(ctx, x, y, w, h, s) {
    var mars = s.level.id === 'mars', rnd = seeded(mars ? 7 : 3);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    // sky
    var sky = ctx.createLinearGradient(0, y, 0, y + h);
    if (mars) { sky.addColorStop(0, '#d9a16f'); sky.addColorStop(1, '#f0c79a'); }
    else { sky.addColorStop(0, '#03050d'); sky.addColorStop(1, '#16203f'); }
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    if (!mars) {
      ctx.fillStyle = '#fff';
      for (var i = 0; i < 70; i++) ctx.fillRect(x + rnd() * w, y + rnd() * h * 0.6, rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1);
      // Earth in the sky
      var ex = x + w * 0.82, ey = y + h * 0.2;
      ctx.fillStyle = '#3b7bd9'; ctx.beginPath(); ctx.arc(ex, ey, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4fbf6a'; ctx.beginPath(); ctx.ellipse(ex - 6, ey - 4, 10, 7, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(ex + 8, ey + 10, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,240,210,.85)'; ctx.beginPath(); ctx.arc(x + w * 0.8, y + h * 0.18, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b4643c';
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.62);
      for (var hx = 0; hx <= w; hx += 40) ctx.lineTo(x + hx, y + h * 0.56 + Math.sin(hx / 70) * 14 + rnd() * 8);
      ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
    }
    // ground
    var gy = y + h * 0.66;
    ctx.fillStyle = mars ? '#a9532f' : '#8c8f9b';
    ctx.fillRect(x, gy, w, h - (gy - y));
    ctx.fillStyle = mars ? '#8f4325' : '#757884';
    for (var c = 0; c < 12; c++) {
      ctx.beginPath(); ctx.ellipse(x + rnd() * w, gy + 14 + rnd() * (h - (gy - y) - 20), 10 + rnd() * 26, 4 + rnd() * 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    // solar panels
    for (var p = 0; p < 3; p++) {
      var px = x + 40 + p * 74, py = gy - 44;
      ctx.fillStyle = '#5b5f6b'; ctx.fillRect(px + 30, py + 30, 4, 22);
      ctx.fillStyle = '#1d3b8a'; ctx.beginPath(); ctx.moveTo(px, py + 34); ctx.lineTo(px + 64, py + 34); ctx.lineTo(px + 56, py); ctx.lineTo(px + 8, py); ctx.fill();
      ctx.strokeStyle = '#7aa2ff'; ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) { ctx.beginPath(); ctx.moveTo(px + g * 16, py + 34); ctx.lineTo(px + 8 + g * 12, py); ctx.stroke(); }
    }
    // habitat domes
    function dome(cx, r, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, gy + 6, r, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(cx - r, gy + 2, r * 2, 6);
      ctx.fillStyle = '#2b3a66'; ctx.fillRect(cx - r * 0.5, gy - r * 0.45, r, r * 0.16);
    }
    dome(x + w * 0.52, 62, '#eef0f6');
    dome(x + w * 0.70, 42, '#dfe3ee');
    ctx.fillStyle = '#cfd4e2'; ctx.fillRect(x + w * 0.52 + 50, gy - 18, w * 0.18 - 80, 22);
    // greenhouse with the plant
    var ghx = x + w * 0.86, ps = plantState(s.plant);
    ctx.fillStyle = 'rgba(190,240,255,.35)'; ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ghx, gy + 6, 40, Math.PI, 0); ctx.fill(); ctx.stroke();
    var leaf = ps === 'dead' ? '#8a5a2b' : ps === 'weak' ? '#9cc463' : '#3fbf6f';
    var n = { great: 5, ok: 3, weak: 2, dead: 2 }[ps];
    for (var l = 0; l < n; l++) {
      ctx.fillStyle = leaf; ctx.beginPath();
      ctx.ellipse(ghx - 22 + l * (44 / Math.max(1, n - 1)), gy - (ps === 'dead' ? 4 : 12), 7, ps === 'dead' ? 4 : 11, 0, 0, Math.PI * 2); ctx.fill();
    }
    // antenna
    var ax = x + w * 0.38;
    ctx.strokeStyle = '#d9dce6'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, gy + 4); ctx.lineTo(ax, gy - 70); ctx.stroke();
    ctx.fillStyle = '#eef0f6'; ctx.beginPath(); ctx.ellipse(ax + 10, gy - 74, 18, 9, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8f22a'; ctx.beginPath(); ctx.arc(ax, gy - 72, 3, 0, Math.PI * 2); ctx.fill();
    // night or dust tint like a real photo
    if (mars) { ctx.fillStyle = 'rgba(160,80,30,.12)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
  }

  function drawNewspaper(cv, s, fact) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, M = 50;
    var serif = 'Georgia, "Times New Roman", serif';
    var ink = '#1b1b1b', soft = '#4a4a4a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // paper + border
    ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.strokeRect(20, 20, W - 40, H - 40);
    // top line
    ctx.fillStyle = soft; ctx.font = '16px ' + serif;
    ctx.textAlign = 'left'; ctx.fillText('VOL. 1 · NO. ' + s.sol, M, 56);
    ctx.textAlign = 'right'; ctx.fillText(t('lvl_' + s.level.id).toUpperCase() + ' EDITION', W - M, 56);
    ctx.textAlign = 'center';
    // masthead
    ctx.fillStyle = ink; ctx.font = 'bold 86px ' + serif; ctx.fillText(t('paper_name'), W / 2, 140);
    ctx.fillRect(M, 160, W - 2 * M, 3); ctx.fillRect(M, 167, W - 2 * M, 1);
    ctx.font = 'italic 19px ' + serif; ctx.fillStyle = soft;
    ctx.fillText(t('paper_tag') + ' · ' + (s.level.id === 'tutorial' ? t('sol0') : t('sol', { n: s.sol, total: s.level.days })), W / 2, 192);
    ctx.fillStyle = ink; ctx.fillRect(M, 204, W - 2 * M, 1);
    // headline
    ctx.font = 'bold 50px ' + serif;
    var y = wrapText(ctx, paperHeadline(s), W / 2, 266, W - 2 * M, 58);
    ctx.font = 'italic 24px ' + serif; ctx.fillStyle = soft;
    ctx.fillText(t('paper_rank', { rank: t('rank_' + Game.rank(s)) }) + ' · ' + daysSurvived(s) + ' / ' + s.level.days + ' ' + t('paper_days').toLowerCase(), W / 2, y + 4);
    y += 34;
    ctx.fillStyle = ink; ctx.fillRect(M, y, W - 2 * M, 1);
    y += 22;
    // photo (left) + stats column (right)
    var colGap = 24, photoW = Math.round((W - 2 * M) * 0.64), sideX = M + photoW + colGap, sideW = W - M - sideX, photoH = 360;
    drawOutpost(ctx, M, y, photoW, photoH, s);
    ctx.font = 'italic 17px ' + serif; ctx.fillStyle = soft; ctx.textAlign = 'left';
    wrapText(ctx, t('paper_photo', { place: s.level.id === 'mars' ? 'Mars' : 'Moon' }) + ' ' + t('paper_crew') + '.', M, y + photoH + 24, photoW, 22);
    // stats box
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.strokeRect(sideX, y, sideW, photoH);
    ctx.fillStyle = ink; ctx.fillRect(sideX, y, sideW, 40);
    ctx.fillStyle = '#f2ead8'; ctx.font = 'bold 18px ' + serif; ctx.textAlign = 'center';
    ctx.fillText(t('paper_stats').toUpperCase(), sideX + sideW / 2, y + 27);
    var stats = [
      [daysSurvived(s) + '/' + s.level.days, t('paper_days')],
      [String(s.score), t('paper_science')],
      [String(s.log.filter(function (r) { return r.event.type === 'flare'; }).length), t('paper_storms')],
      [s.plant + '%', t('paper_plant') + ' · ' + t('plant_' + plantState(s.plant)).toLowerCase()]
    ];
    stats.forEach(function (st, i) {
      var sy = y + 92 + i * 76;
      ctx.fillStyle = ink; ctx.font = 'bold 38px ' + serif; ctx.fillText(st[0], sideX + sideW / 2, sy);
      ctx.fillStyle = soft; ctx.font = '16px ' + serif; ctx.fillText(st[1], sideX + sideW / 2, sy + 24);
      if (i < 3) { ctx.fillStyle = '#c9bfa8'; ctx.fillRect(sideX + 20, sy + 40, sideW - 40, 1); }
    });
    y += photoH + 64;
    ctx.fillStyle = ink; ctx.fillRect(M, y, W - 2 * M, 2);
    y += 36;
    // two text columns
    var colW = (W - 2 * M - colGap) / 2, c1 = M, c2 = M + colW + colGap;
    ctx.fillRect(c1 + colW + colGap / 2, y - 14, 1, H - y - 60);
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px ' + serif; ctx.fillStyle = ink;
    ctx.fillText(t('paper_story').toUpperCase(), c1, y);
    ctx.fillText(t('paper_science_col').toUpperCase(), c2, y);
    ctx.font = '19px ' + serif;
    var big = biggestFlare(s);
    var y1 = wrapText(ctx, s.won ? t('win', { n: s.level.days, name: UI.name }) : failReason(s.fail), c1, y + 34, colW, 27);
    wrapText(ctx, big ? t('paper_biggest', { cls: big['class'], date: big.date }) : t('paper_nostorm'), c1, y1 + 8, colW, 27);
    var y2 = y + 34;
    if (fact) {
      y2 = wrapText(ctx, fact.text, c2, y2, colW, 27);
      ctx.font = 'italic 16px ' + serif; ctx.fillStyle = soft;
      wrapText(ctx, '— ' + fact.source + ' (' + t('archived') + ')', c2, y2 + 6, colW, 22);
    }
    // footer
    ctx.textAlign = 'center'; ctx.fillStyle = ink; ctx.fillRect(M, H - 82, W - 2 * M, 1);
    ctx.font = '16px ' + serif; ctx.fillStyle = soft;
    ctx.fillText(t('paper_footer'), W / 2, H - 56);
    ctx.fillText('Survive the Sol · TechNest Thinkers · NASA Space Apps Challenge 2026', W / 2, H - 34);
  }
  function downloadPaper() {
    var a = document.createElement('a');
    a.download = 'sol-times-' + (UI.name || 'commander').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
    a.href = $('paper').toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();
    Sound.play('click');
  }

  // ---------- "?" tooltips (hover, tap or keyboard) ----------
  var tipOwner = null;
  function showTip(btn) {
    var bubble = $('tipBubble');
    bubble.textContent = t(btn.getAttribute('data-tip'));
    bubble.hidden = false;
    // keep tooltips inside the dialog when it is open (top layer)
    var host = btn.closest('dialog') || document.body;
    if (bubble.parentNode !== host) host.appendChild(bubble);
    var r = btn.getBoundingClientRect();
    var w = Math.min(300, window.innerWidth - 32);
    bubble.style.width = w + 'px';
    bubble.style.left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2)) + 'px';
    var top = r.bottom + 10;
    bubble.style.top = top + 'px';
    if (top + bubble.offsetHeight > window.innerHeight - 8) bubble.style.top = Math.max(8, r.top - bubble.offsetHeight - 10) + 'px';
    btn.setAttribute('aria-describedby', 'tipBubble');
    tipOwner = btn;
  }
  function hideTip() {
    $('tipBubble').hidden = true;
    if (tipOwner) tipOwner.removeAttribute('aria-describedby');
    tipOwner = null;
  }

  // ---------- wiring ----------
  function wire() {
    document.addEventListener('click', function (e) {
      var tip = e.target.closest('.tip');
      if (tip) { e.preventDefault(); e.stopPropagation(); if (tipOwner === tip) hideTip(); else showTip(tip); return; }
      hideTip();
      var card = e.target.closest('.card');
      if (card && !card.disabled) { toggleCard(card.getAttribute('data-card')); return; }
      var lvl = e.target.closest('.level-btn');
      if (lvl && UI.data) { startLevel(lvl.getAttribute('data-level')); return; }
      var go = e.target.closest('[data-go]');
      if (go) { var dest = go.getAttribute('data-go'); if (dest === 'menu') goMenu(); else startLevel(dest); }
    });
    document.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('tip')) showTip(e.target); });
    document.addEventListener('mouseover', function (e) { var tip = e.target.closest && e.target.closest('.tip'); if (tip && tip !== tipOwner) showTip(tip); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideTip(); return; }
      // Keyboard play: 1-4 picks/un-picks a card, E ends the day (not while typing or in a pop-up).
      if ($('screen-game').hidden || $('modal').open || /INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key)) {
        var card = $('hand').querySelectorAll('.card')[Number(e.key) - 1];
        if (card && !card.disabled) { e.preventDefault(); toggleCard(card.getAttribute('data-card')); }
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault(); onEndDay();
      }
    });
    window.addEventListener('scroll', hideTip, { passive: true });
    window.addEventListener('resize', hideTip);

    $('endDayBtn').addEventListener('click', onEndDay);
    $('modalBtn').addEventListener('click', onModalBtn);
    $('coachNext').addEventListener('click', onCoachNext);
    // Escape must not close the day report without moving on.
    $('modal').addEventListener('cancel', function (e) { e.preventDefault(); });
    $('soundBtn').addEventListener('click', function () { Sound.toggle(); renderSoundBtn(); });
    $('brandBtn').addEventListener('click', function () {
      if (!$('screen-game').hidden && UI.s && !UI.s.over && !window.confirm('Leave this mission and go back to the start?')) return;
      goMenu();
    });
  }

  function init() {
    var name = '';
    try { name = localStorage.getItem('sts-name') || ''; } catch (e) { /* ignore */ }
    $('playerName').value = name;
    applyStaticText();
    wire();
    $('loadMsg').textContent = t('loading');
    document.querySelectorAll('.level-btn').forEach(function (b) { b.disabled = true; });
    SolData.load().then(function (data) {
      UI.data = data;
      $('loadMsg').textContent = '';
      document.querySelectorAll('.level-btn').forEach(function (b) { b.disabled = false; });
    }).catch(function (err) {
      console.error(err);
      $('loadMsg').textContent = t('loadError');
    });
  }

  window.SolUI = UI;   // handy for testing in the browser console
  document.addEventListener('DOMContentLoaded', init);
})();
