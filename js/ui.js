/* =====================================================================
   Survive the Sol – SCREEN CODE
   Draws the game (bars, cards, pop-ups) and reacts to clicks/keys.
   Game rules live in game.js, words live in i18n.js.
   ===================================================================== */
(function () {
  'use strict';

  var t = I18N.t;
  var $ = function (id) { return document.getElementById(id); };

  // Little icons for each kind of effect on a card.
  var ICONS = { power: '⚡', life: '💚', rad: '🛡️', score: '🔬', morale: '😊', plant: '🌱' };

  var UI = {
    data: null,        // everything from SolData.load()
    s: null,           // the current game state (from Game.newGame)
    levelId: null,
    name: ''
  };

  // ---------- helpers ----------
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Flare names come from the data in English; in Urdu we use our own words.
  function flareLabel(f) { return I18N.lang === 'en' ? f.kid_label : t('flare_' + f.severity); }
  function signed(n) { return (n > 0 ? '+' : '−') + Math.abs(n); }
  function show(screenId) {
    ['screen-title', 'screen-game', 'screen-end'].forEach(function (id) { $(id).hidden = id !== screenId; });
    window.scrollTo(0, 0);
  }
  // A small "?" button that explains a hard word. label = optional word on the button.
  function tipButton(key, label) {
    return '<button class="tip' + (label ? ' tip-word' : '') + '" type="button" data-tip="' + key + '" aria-label="' +
      esc(label ? label + ' – ' + t('whatIs') : t('whatIs')) + '">' + esc(label ? label + '?' : '?') + '</button>';
  }

  // Fill every element that has data-i18n="key" with the right words.
  function applyStaticText() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    $('langBtn').textContent = t('langButton');
    document.title = t('title') + ' – ' + t('tagline');
  }

  // ---------- starting a mission ----------
  function startLevel(levelId) {
    UI.levelId = levelId;
    UI.name = ($('playerName').value || '').trim() || 'Ayesha';
    try { localStorage.setItem('sts-name', UI.name); } catch (e) { /* ignore */ }
    UI.s = Game.newGame(levelId, UI.data);
    UI.prevBars = null;
    UI.tutStep = levelId === 'tutorial' ? 1 : 0;
    UI.lastBars = null;   // Mars: Earth only knows yesterday's numbers
    document.body.className = 'level-' + levelId;
    show('screen-game');
    render();
    if (UI.tutStep) showTutorialStep(); else updateCoach();
    $('hand').querySelector('button:not([disabled])') && $('hand').querySelector('button:not([disabled])').focus();
  }

  // ---------- drawing the game screen ----------
  function render() {
    var s = UI.s;
    $('levelName').textContent = t('lvl_' + s.level.id);
    $('solText').textContent = s.level.id === 'tutorial' ? t('sol0') : t('sol', { n: s.sol, total: s.level.days });
    $('scoreText').textContent = s.score;
    renderBars();
    renderBase();
    renderRadNote();
    renderBanners();
    renderHand();
    var playable = s.hand.some(function (c) { return Game.canPlay(s, c).ok; });
    $('pickText').textContent = s.picksLeft > 0 && playable ? t('pickCards', { n: s.picksLeft }) : t('picksDone');
    $('endDayBtn').disabled = s.picksLeft > 0 && playable;
    setFx();
  }

  function renderBars() {
    var s = UI.s, prev = UI.prevBars;
    $('bars').innerHTML = Game.BARS.map(function (b) {
      var v = s.bars[b];
      var level = v > 50 ? 'ok' : v > 25 ? 'warn' : 'danger';
      var delta = prev && prev[b] !== v ? '<span class="delta ' + (v > prev[b] ? 'up' : 'down') + '">' + signed(v - prev[b]) + '</span>' : '';
      var extraTip = b === 'rad' ? tipButton('tip_dose', t('doseWord')) : '';
      return '<div class="bar bar-' + b + ' ' + level + '">' +
        '<div class="bar-label"><span aria-hidden="true">' + ICONS[b] + '</span> ' + esc(t('bar_' + b)) + ' ' + tipButton('tip_' + b) + extraTip +
        '<b class="bar-num">' + v + '</b>' + delta + '</div>' +
        '<div class="bar-track" role="progressbar" aria-label="' + esc(t('bar_' + b)) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '">' +
        '<div class="bar-fill" style="width:' + v + '%"></div></div></div>';
    }).join('');
    UI.prevBars = { power: s.bars.power, life: s.bars.life, rad: s.bars.rad };
  }

  // Crew faces show morale; the plant shows how well you cared for it.
  var CREW = [
    { key: 'crew_ayesha', avatar: '👩‍🚀', offset: 5 },
    { key: 'crew_bilal', avatar: '👨‍🔧', offset: 0 },
    { key: 'crew_zara', avatar: '👩‍⚕️', offset: -5 }
  ];
  function plantState(v) { return v > 60 ? 'great' : v > 30 ? 'ok' : v > 0 ? 'weak' : 'dead'; }
  function renderBase() {
    var s = UI.s;
    var crew = CREW.map(function (c) {
      var m = s.morale + c.offset;
      var mood = m > 60 ? 'happy' : m > 30 ? 'ok' : 'sad';
      var face = { happy: '😀', ok: '🙂', sad: '😟' }[mood];
      return '<div class="crew-member" title="' + esc(t('mood_' + mood)) + '"><span class="face" aria-hidden="true">' + c.avatar + face + '</span>' +
        '<span>' + esc(t(c.key)) + '<small>' + esc(t('mood_' + mood)) + '</small></span></div>';
    }).join('');
    var ps = plantState(s.plant);
    var plantFace = { great: '🥬', ok: '🌿', weak: '🌱', dead: '🥀' }[ps];
    var tired = s.morale < Game.LOW_MORALE ? '<span class="tired">' + esc(t('tiredNote')) + '</span>' : '';
    $('basePanel').innerHTML = crew + tipButton('tip_morale') + tired +
      '<div class="plant-box ' + ps + '"><span class="face" aria-hidden="true">' + plantFace + '</span><span>' + esc(t('plant')) +
      ' ' + tipButton('tip_plant') + '<small>' + esc(t('plant_' + ps)) + ' (' + s.plant + '%)</small></span></div>';
  }

  // Shows how the RadLab data changes this level (Validity!).
  function renderRadNote() {
    var info = UI.data.radiationInfo, s = UI.s, id = s.level.cardSet, el = $('radNote');
    $('marsCredit').hidden = s.level.id !== 'mars';
    if (!info || !info.game_scale || s.level.id === 'tutorial') { el.innerHTML = ''; return; }
    el.innerHTML = esc(t('rad_note_' + id, { x: info.game_scale[id] })) +
      ' <a href="' + esc(info.source_link) + '" target="_blank" rel="noopener">' + esc(t('rad_source')) + '</a>';
  }

  // "Did you know?" – real NASA facts (OSDR studies + RadLab numbers), no repeats.
  function factPool() {
    var pool = (UI.data.facts || []).map(function (f) {
      return { emoji: f.emoji, text: I18N.field(f, 'text'), source: f.source, link: f.source_link };
    });
    var info = UI.data.radiationInfo;
    if (info && info.places) {
      var iss = info.places.iss.median_uGy_per_hour;
      var ratio = function (k) { return (info.places[k].median_uGy_per_hour / iss).toFixed(1); };
      ['moon', 'mars_surface', 'deep_space'].forEach(function (k) {
        var key = { moon: 'dyk_rad_moon', mars_surface: 'dyk_rad_mars', deep_space: 'dyk_rad_deep' }[k];
        pool.push({ emoji: '📊', text: t(key, { x: ratio(k) }), source: t('rad_source'), link: info.source_link });
      });
    }
    return pool;
  }
  function nextFact() {
    var pool = factPool();
    if (!pool.length) return null;
    UI.factOrder = UI.factOrder && UI.factOrder.length ? UI.factOrder : shuffleIdx(pool.length);
    return pool[UI.factOrder.pop()];
  }
  function shuffleIdx(n) {
    var a = []; for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function factHtml(f) {
    if (!f) return '';
    return '<div class="dyk"><h3>' + esc(t('dyk_title')) + '</h3><p><span aria-hidden="true">' + f.emoji + '</span> ' + esc(f.text) + '</p>' +
      '<p class="source"><a href="' + esc(f.link) + '" target="_blank" rel="noopener">' + esc(f.source) + '</a> · ' + esc(t('archived')) + '</p></div>';
  }

  function renderBanners() {
    var s = UI.s, out = [];
    if (s.level.id === 'tutorial') out.push(t('banner_tutorial'));
    if (Game.isNight(s)) out.push(t('banner_night'));
    if (Game.isDusty(s)) out.push(t('banner_dust'));
    if (s.level.commDelay) out.push(t('banner_delay'));
    $('banners').innerHTML = out.map(function (m) { return '<p class="banner">' + esc(m) + '</p>'; }).join('');
  }

  function renderHand() {
    var s = UI.s;
    $('hand').innerHTML = s.hand.map(function (card, i) {
      var check = Game.canPlay(s, card);
      var fx = Game.cardEffects(s, card);
      var chips = Object.keys(fx).map(function (k) {
        if (!fx[k]) return '';
        return '<span class="chip ' + (fx[k] > 0 ? 'up' : 'down') + '" title="' + esc(t('bar_' + k) || k) + '">' +
          ICONS[k] + ' ' + signed(fx[k]) + '</span>';
      }).join('');
      var status = '';
      if (!check.ok) {
        status = check.reason === 'played' ? t('alreadyPlayed') :
                 check.reason === 'low' ? t('tooLow', { bar: t('bar_' + check.bar) }) : t('noPicks');
      }
      var solarNote = card.solar && (Game.isNight(s) || Game.isDusty(s)) ? '<span class="card-warn">' + esc(t('halfSolar')) + '</span>' : '';
      return '<button class="card' + (check.reason === 'played' ? ' played' : '') + '" type="button" data-card="' + card.id + '"' +
        (check.ok ? '' : ' disabled') + '>' +
        '<span class="card-key" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="card-emoji" aria-hidden="true">' + card.emoji + '</span>' +
        '<span class="card-title">' + esc(I18N.field(card, 'title')) + '</span>' +
        '<span class="card-desc">' + esc(I18N.field(card, 'desc')) + '</span>' +
        '<span class="chips">' + chips + '</span>' + solarNote +
        (status ? '<span class="card-status">' + esc(status) + '</span>' : '') +
        '<span class="card-science"><span aria-hidden="true">🔭</span> ' + esc(I18N.field(card, 'science')) + '</span>' +
        '</button>';
    }).join('');
  }

  // Screen effects: dark lunar night, dust haze.
  function setFx() {
    var s = UI.s, b = document.body;
    b.classList.toggle('fx-night', !!s && Game.isNight(s));
    b.classList.toggle('fx-dust', !!s && Game.isDusty(s));
  }
  function flashFlare() {
    document.body.classList.remove('fx-flare');
    void document.body.offsetWidth; // restart animation
    document.body.classList.add('fx-flare');
    setTimeout(function () { document.body.classList.remove('fx-flare'); }, 1600);
  }

  // ---------- playing ----------
  function onCard(id) {
    var fx = Game.playCard(UI.s, id);
    if (!fx) return;
    render();
    if (UI.levelId === 'tutorial' && UI.s.picksLeft === 0) { UI.tutStep = 8; showTutorialStep(); }
    var next = $('hand').querySelector('button:not([disabled])') || $('endDayBtn');
    next.focus();
  }

  function onEndDay() {
    UI.lastBars = { power: UI.s.bars.power, life: UI.s.bars.life, rad: UI.s.bars.rad };
    var rep = Game.endDay(UI.s);
    showDayReport(rep);
  }

  // ---------- end-of-day pop-up ----------
  function eventHtml(rep) {
    var ev = rep.event, html = '';
    var hitOf = function (cause) {
      return rep.changes.filter(function (c) { return c.cause === cause; })
        .reduce(function (sum, c) { return sum - c.amount; }, 0);
    };
    if (ev.type === 'flare') {
      var f = ev.flare;
      html += '<h3>' + esc(t('ev_flare_t', { label: flareLabel(f) })) + ' ' + tipButton('tip_flare') + '</h3>';
      html += '<p>' + esc(t('ev_flare', { cls: f['class'], date: f.date, hit: hitOf('flare') })) + '</p>';
      if (rep.sheltered) html += '<p class="good">' + esc(t('ev_flare_sheltered')) + '</p>';
      if (UI.levelId !== 'mars' && /2026/.test(f.date)) html += '<p class="note">' + esc(t('ev_flare_this_year')) + '</p>';
      html += '<p class="source">' + esc(t('source', { src: f.source || 'NASA CCMC DONKI' })) +
        (f.source_link ? ' · <a href="' + esc(f.source_link) + '" target="_blank" rel="noopener">' + esc(t('openSource')) + '</a>' : '') + '</p>';
    } else if (ev.type === 'dust') {
      html += '<h3>' + esc(t('ev_dust_t')) + '</h3><p>' + esc(t('ev_dust', { hit: hitOf('dust') })) + '</p>';
    } else if (ev.type === 'failure') {
      html += '<h3>' + esc(t('ev_failure_t')) + '</h3><p>' + esc(t('ev_failure_' + ev.bar, { hit: hitOf('failure') })) + '</p>';
    } else {
      html += '<h3>' + esc(t('ev_quiet_t')) + '</h3><p>' + esc(t('ev_quiet')) + '</p>';
    }
    return html;
  }

  function showDayReport(rep) {
    var daily = {};
    rep.changes.filter(function (c) { return c.cause === 'daily' || c.cause === 'night' || (c.cause === 'dust' && rep.dusty); })
      .forEach(function (c) { daily[c.bar] = (daily[c.bar] || 0) + c.amount; });
    var needs = Object.keys(daily).map(function (b) {
      return '<span class="chip down">' + ICONS[b] + ' ' + esc(t('bar_' + b)) + ' ' + signed(daily[b]) + '</span>';
    }).join(' ');
    var extra = [];
    if (rep.night) extra.push(t('night'));
    if (rep.dusty) extra.push(t('dust'));

    var html = '<h2 id="modalTitle">' + esc(t('dayReport', { n: UI.levelId === 'tutorial' ? 0 : rep.sol })) + '</h2>' +
      '<div class="report-needs"><p>' + esc(t('dailyNeeds')) + (extra.length ? ' (' + esc(extra.join(', ')) + ')' : '') + ':</p>' + needs + '</div>' +
      '<div class="report-event ev-' + rep.event.type + '">' + eventHtml(rep) + '</div>' +
      (UI.s.over ? '' : factHtml(nextFact()));

    $('modalBody').innerHTML = html;
    $('modalBtn').textContent = UI.s.over ? t('seeResult') : t('next');
    openModal();
    if (rep.event.type === 'flare') flashFlare();
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
    if (UI.s.over) showEnd();
    else { render(); updateCoach(); $('hand').querySelector('button:not([disabled])').focus(); }
  }

  // ---------- ROVI coach panel ----------
  function coach(text, nextLabel) {
    $('coach').hidden = !text;
    $('coachText').textContent = text || '';
    $('coachNext').hidden = !nextLabel;
    if (nextLabel) $('coachNext').textContent = nextLabel;
  }
  function highlight(selector) {
    document.querySelectorAll('.highlight').forEach(function (el) { el.classList.remove('highlight'); });
    if (selector) { var el = document.querySelector(selector); if (el) el.classList.add('highlight'); }
  }

  // Tutorial: ROVI explains each bar and the cards, one step at a time.
  var TUT_TARGETS = { 2: '.bar-power', 3: '.bar-life', 4: '.bar-rad', 5: '#bars', 6: '#hand', 8: '#endDayBtn' };
  function showTutorialStep() {
    var n = UI.tutStep;
    coach(t('tut_' + n), n < 7 ? t('tutNext') : null);
    highlight(TUT_TARGETS[n]);
    if (n < 7) $('coachNext').focus();
  }
  function onCoachNext() {
    if (UI.levelId === 'tutorial' && UI.tutStep < 7) {
      UI.tutStep++;
      showTutorialStep();
      if (UI.tutStep === 7) { var c = $('hand').querySelector('.card:not([disabled])'); if (c) c.focus(); }
    }
  }

  // What ROVI says at the start of a normal day.
  function updateCoach() {
    var s = UI.s;
    highlight(null);
    var lines = [roviTip(s)];
    // Mars: Earth's message is about YESTERDAY, because messages are slow.
    if (s.level.commDelay) lines.push(UI.lastBars ? t('earth_msg', UI.lastBars) : t('earth_first'));
    coach(lines.join('\n'));
    var c = $('coach');
    c.classList.toggle('alert', s.nextEvent.type === 'flare' || s.nextEvent.type === 'dust');
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
      var label = I18N.lang === 'en' ? f.kid_label.replace(/!$/, '').toLowerCase() : flareLabel(f);
      return t(key, { label: label, cls: f['class'], date: f.date });
    }
    if (!I18N.strings.en[key]) key = 'fail_' + fail.bar + '_daily';
    return t(key);
  }

  function showEnd() {
    var s = UI.s, html = '';
    document.body.classList.remove('fx-night', 'fx-dust');
    if (s.level.id === 'tutorial') {
      html = '<h2>' + esc(t('tutorialDone_t')) + '</h2><p class="big-text">' + esc(t('tutorialDone')) + '</p>' +
        '<button id="goMoon" class="btn primary big-btn" type="button">' + esc(t('startMoon')) + '</button>';
    } else {
      if (s.won) {
        html = '<h2>' + esc(t('win_t')) + '</h2><p class="big-text">' + esc(t('win', { n: s.level.days, name: UI.name })) + '</p>';
      } else {
        html = '<h2>' + esc(t('lose_t', { n: s.sol })) + '</h2>' +
          '<p class="big-text">' + esc(failReason(s.fail)) + '</p>' +
          '<p class="tip-box">' + esc(t('tip_fail_' + s.fail.bar)) + '</p>';
      }
      var rank = Game.rank(s);
      html += '<p><span class="rank-badge">' + esc(t('paper_rank', { rank: t('rank_' + rank) })) + '</span></p>' +
        '<p class="note">' + esc(t('rank_info')) + '</p>' +
        '<div class="end-grid"><div class="paper-wrap">' +
        '<canvas id="paper" width="800" height="1040" role="img" aria-label="' + esc(paperHeadline(s)) + '"></canvas>' +
        '<div class="actions"><button id="downloadBtn" class="btn primary" type="button">' + esc(t('download')) + '</button></div></div>' +
        '<div class="debrief"><h3>' + esc(t('debrief_title')) + '</h3><ul>' +
        Game.debrief(s).map(function (d) { return '<li>' + esc(t('db_' + d.key)) + '</li>'; }).join('') +
        '</ul></div></div>';
    }
    $('endContent').innerHTML = html;
    show('screen-end');
    if ($('paper')) {
      var draw = function () { drawNewspaper($('paper'), s); };
      draw();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
      $('downloadBtn').addEventListener('click', downloadPaper);
    }
    var goMoon = $('goMoon');
    if (goMoon) { goMoon.addEventListener('click', function () { startLevel('moon'); }); goMoon.focus(); }
    else $('againBtn').focus();
  }

  // ---------- newspaper (drawn on a canvas so it can be saved as PNG) ----------
  function daysSurvived(s) { return s.won ? s.level.days : s.sol - 1; }
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
  function drawNewspaper(cv, s) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, M = 48;
    var ur = I18N.lang === 'ur';
    var serif = ur ? '"Noto Nastaliq Urdu", serif' : 'Georgia, "Times New Roman", serif';
    var round = ur ? '"Noto Nastaliq Urdu", serif' : '"Baloo 2", Arial, sans-serif';
    ctx.direction = ur ? 'rtl' : 'ltr';
    ctx.textAlign = 'center';
    // paper
    ctx.fillStyle = '#f3ead7'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, W - 36, H - 36);
    // masthead
    ctx.fillStyle = '#1b1b1b';
    ctx.font = 'bold 66px ' + serif; ctx.fillText(t('paper_name'), W / 2, 110);
    ctx.font = 'italic 22px ' + serif;
    ctx.fillText(t('paper_tag') + ' · ' + t('lvl_' + s.level.id) + ' · ' + t('sol', { n: s.sol, total: s.level.days }), W / 2, 148);
    ctx.fillRect(M, 166, W - 2 * M, 4); ctx.fillRect(M, 174, W - 2 * M, 1.5);
    // headline
    ctx.font = 'bold 44px ' + serif;
    var y = wrapText(ctx, paperHeadline(s), W / 2, 240, W - 2 * M, 54);
    // rank badge
    var rank = t('paper_rank', { rank: t('rank_' + Game.rank(s)) }) + ' ⭐';
    ctx.font = 'bold 30px ' + round;
    var bw = ctx.measureText(rank).width + 50;
    ctx.fillStyle = '#ffd447'; ctx.fillRect(W / 2 - bw / 2, y - 6, bw, 52);
    ctx.fillStyle = '#1b1b1b'; ctx.fillText(rank, W / 2, y + 32);
    y += 80;
    // "photo": the crew and the plant at the base
    var ph = 250;
    ctx.fillStyle = s.level.id === 'mars' ? '#8a3b22' : '#2c3150';
    ctx.fillRect(M, y, W - 2 * M, ph);
    ctx.save();
    ctx.beginPath(); ctx.rect(M, y, W - 2 * M, ph); ctx.clip();
    ctx.fillStyle = s.level.id === 'mars' ? '#c56a3f' : '#9aa0b4';
    ctx.beginPath(); ctx.ellipse(W / 2, y + ph + 60, W / 1.5, 120, 0, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1b1b1b';
    ctx.font = '84px serif';
    ctx.fillText('👩‍🚀 👨‍🔧 👩‍⚕️', W / 2 - 70, y + 160);
    var ps = { great: '🥬', ok: '🌿', weak: '🌱', dead: '🥀' }[plantState(s.plant)];
    ctx.fillText(ps, W / 2 + 250, y + 160);
    ctx.font = '44px serif'; ctx.fillText(s.level.id === 'mars' ? '🔴' : '🌙', W - M - 44, y + 60);
    y += ph + 34;
    ctx.font = 'italic 20px ' + serif; ctx.fillStyle = '#333';
    ctx.fillText(t('paper_crew'), W / 2, y); y += 54;
    // stats
    var stats = [
      [t('paper_days'), daysSurvived(s) + ' / ' + s.level.days],
      [t('paper_science'), String(s.score)],
      [t('paper_storms'), String(s.log.filter(function (r) { return r.event.type === 'flare'; }).length)],
      [t('paper_plant'), ps + ' ' + s.plant + '%']
    ];
    var colW = (W - 2 * M) / 4;
    stats.forEach(function (st, i) {
      var cx = ur ? W - M - colW * (i + 0.5) : M + colW * (i + 0.5);
      ctx.fillStyle = '#1b1b1b'; ctx.font = 'bold 34px ' + round; ctx.fillText(st[1], cx, y + 10);
      ctx.fillStyle = '#444'; ctx.font = '19px ' + round; ctx.fillText(st[0], cx, y + 44);
    });
    y += 92;
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(M, y - 20, W - 2 * M, 1.5);
    // story
    var big = biggestFlare(s);
    ctx.font = '25px ' + serif; ctx.fillStyle = '#1b1b1b';
    y = wrapText(ctx, big ? t('paper_biggest', { cls: big['class'], date: big.date }) : t('paper_nostorm'), W / 2, y + 16, W - 2 * M - 20, 34);
    y = wrapText(ctx, s.won ? t('win', { n: s.level.days, name: UI.name }) : failReason(s.fail), W / 2, y + 6, W - 2 * M - 20, 34);
    // footer
    ctx.font = '17px ' + round; ctx.fillStyle = '#555';
    ctx.fillText(t('paper_footer'), W / 2, H - 52);
    ctx.fillText('Survive the Sol · TechNest Thinkers · NASA Space Apps 2026', W / 2, H - 28);
  }
  function downloadPaper() {
    var a = document.createElement('a');
    a.download = 'sol-times-' + (UI.name || 'commander').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
    a.href = $('paper').toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();
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
    var w = Math.min(280, window.innerWidth - 24);
    bubble.style.width = w + 'px';
    var left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    bubble.style.left = left + 'px';
    bubble.style.top = (r.bottom + 8) + 'px';
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
      if (card && !card.disabled) { onCard(card.getAttribute('data-card')); return; }
      var lvl = e.target.closest('.level-btn');
      if (lvl && UI.data) startLevel(lvl.getAttribute('data-level'));
    });
    document.addEventListener('focusin', function (e) { if (e.target.classList.contains('tip')) showTip(e.target); });
    document.addEventListener('mouseover', function (e) { var tip = e.target.closest && e.target.closest('.tip'); if (tip) showTip(tip); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideTip(); return; }
      // Keyboard play: 1-4 picks a card, E ends the day (not while typing or in a pop-up).
      if ($('screen-game').hidden || $('modal').open || /INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key)) {
        var card = $('hand').querySelectorAll('.card')[Number(e.key) - 1];
        if (card && !card.disabled) { e.preventDefault(); onCard(card.getAttribute('data-card')); }
      } else if ((e.key === 'e' || e.key === 'E') && !$('endDayBtn').disabled) {
        e.preventDefault(); onEndDay();
      }
    });
    window.addEventListener('scroll', hideTip, { passive: true });

    $('endDayBtn').addEventListener('click', onEndDay);
    $('modalBtn').addEventListener('click', onModalBtn);
    $('coachNext').addEventListener('click', onCoachNext);
    // Escape must not close the day report without moving on.
    $('modal').addEventListener('cancel', function (e) { e.preventDefault(); });
    $('againBtn').addEventListener('click', function () { startLevel(UI.levelId === 'tutorial' ? 'moon' : UI.levelId); });
    $('menuBtn').addEventListener('click', function () { document.body.className = ''; $('marsCredit').hidden = true; show('screen-title'); });
    $('langBtn').addEventListener('click', function () {
      I18N.setLang(I18N.lang === 'en' ? 'ur' : 'en');
      applyStaticText();
      if (UI.s && !$('screen-game').hidden) render();
    });
  }

  function init() {
    var lang = 'en', name = '';
    try { lang = localStorage.getItem('sts-lang') || 'en'; name = localStorage.getItem('sts-name') || ''; } catch (e) { /* ignore */ }
    I18N.setLang(lang);
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
