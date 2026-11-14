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
    $('hand').innerHTML = s.hand.map(function (card) {
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
      html += '<h3>' + esc(t('ev_flare_t', { label: f.kid_label })) + ' ' + tipButton('tip_flare') + '</h3>';
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
      '<div class="report-event ev-' + rep.event.type + '">' + eventHtml(rep) + '</div>';

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
    if (s.level.commDelay) {
      // Mars: Earth's message is about YESTERDAY, because messages are slow.
      coach(UI.lastBars ? t('earth_msg', UI.lastBars) : t('earth_first'));
    } else {
      coach(null);
    }
  }

  // ---------- end screen ----------
  function failReason(fail) {
    var key = 'fail_' + fail.bar + '_' + fail.cause;
    if (fail.cause === 'flare') {
      var f = fail.event.flare;
      return t(key, { label: f.kid_label.replace(/!$/, '').toLowerCase(), cls: f['class'], date: f.date });
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
    } else if (s.won) {
      html = '<h2>' + esc(t('win_t')) + '</h2><p class="big-text">' + esc(t('win', { n: s.level.days, name: UI.name })) + '</p>';
    } else {
      html = '<h2>' + esc(t('lose_t', { n: s.sol })) + '</h2>' +
        '<p class="big-text">' + esc(failReason(s.fail)) + '</p>' +
        '<p class="tip-box">' + esc(t('tip_fail_' + s.fail.bar)) + '</p>';
    }
    $('endContent').innerHTML = html;
    show('screen-end');
    var goMoon = $('goMoon');
    if (goMoon) { goMoon.addEventListener('click', function () { startLevel('moon'); }); goMoon.focus(); }
    else $('againBtn').focus();
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
    window.addEventListener('scroll', hideTip, { passive: true });

    $('endDayBtn').addEventListener('click', onEndDay);
    $('modalBtn').addEventListener('click', onModalBtn);
    $('coachNext').addEventListener('click', onCoachNext);
    // Escape must not close the day report without moving on.
    $('modal').addEventListener('cancel', function (e) { e.preventDefault(); });
    $('againBtn').addEventListener('click', function () { startLevel(UI.levelId === 'tutorial' ? 'moon' : UI.levelId); });
    $('menuBtn').addEventListener('click', function () { document.body.className = ''; show('screen-title'); });
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
