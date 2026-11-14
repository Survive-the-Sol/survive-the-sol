// =====================================================================
// SCREENS – full-screen pages: menu, choose mission, how to play,
// about the data, credits, settings, card briefing, night report,
// mission end (with newspaper), pause. game.js passes in the data and
// the button actions ("handlers").
// =====================================================================
import { icon, esc, BAR_NAMES } from './hud.js';
import { CARD_MODS, cardBarEffects } from './cards.js';
import { GLOSSARY, richText } from './rovi.js';
import { RANKS, rankFor, nextRank, SUITS, ROVER_SKINS, backpackLevelFor, BACKPACK_UNLOCKS } from './save.js';
import { drawNewspaper } from './newspaper.js';

const $ = (id) => document.getElementById(id);
const el = $('screen');
let timers = [];
function clearTimers() { timers.forEach(clearInterval); timers = []; }

const BAR_ICON = { power: 'power', life: 'life', rad: 'rad' };
function chips(effects) {
  return Object.entries(effects).map(([k, v]) =>
    `<span class="chip ${v > 0 ? 'up' : 'down'}">${icon(BAR_ICON[k])}${v > 0 ? '+' : '−'}${Math.abs(v)} <span class="sr">${BAR_NAMES[k]}</span></span>`).join('');
}
function open(html, cls = '') {
  clearTimers();
  el.className = 'screen ' + cls;
  el.innerHTML = html;
  el.hidden = false;
  el.scrollTop = 0;
  const first = el.querySelector('[autofocus], .btn-primary, button');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}
export function closeScreen() { clearTimers(); el.hidden = true; el.innerHTML = ''; }
function bind(handlers) {
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
    const fn = handlers[b.dataset.act];
    if (fn) fn(b.dataset.arg, e);
  }));
}
const back = '<button class="btn btn-ghost" data-act="menu" type="button">← Back</button>';
const logo = '<div class="logo-mark"><img src="assets/logo.png" alt="Survive the Sol mission patch" onerror="this.remove()"><img class="logo-fallback" src="assets/favicon.svg" alt=""></div>';

// ---------------- MENU ----------------
export function showMenu(ctx, h) {
  const d = ctx.save;
  const rank = rankFor(d.xp), next = nextRank(d.xp);
  const pct = next ? Math.round((d.xp - rank.xp) / (next.xp - rank.xp) * 100) : 100;
  open(`
  <div class="menu">
    <div class="menu-hero">
      ${logo}
      <p class="eyebrow">NASA Space Apps Challenge 2026 · Junior Astronaut Mission Trainer</p>
      <h1>Survive the Sol<span>Storm Royale</span></h1>
      <p class="pitch">Drop onto the Moon or Mars, collect supplies, drive a rover, and race back to shelter before a <b>real NASA solar storm</b> hits. No weapons – just smart astronaut choices!</p>
      <div class="name-row"><label for="nameInput">Commander name</label>
        <input id="nameInput" maxlength="16" autocomplete="off" placeholder="Type your name" value="${esc(d.name || '')}"></div>
      <div class="menu-buttons">
        <button class="btn btn-primary btn-xl" data-act="start" type="button">${icon('rocket')} ${d.tutorialDone ? 'Start Mission' : 'Start Training Mission'}</button>
        <button class="btn" data-act="choose" type="button">${icon('planet')} Choose Mission</button>
        <button class="btn" data-act="how" type="button">${icon('book')} How to Play</button>
        <button class="btn" data-act="about" type="button">${icon('database')} About the Data</button>
        <button class="btn" data-act="credits" type="button">${icon('users')} Credits</button>
        <button class="btn" data-act="settings" type="button">${icon('settings')} Settings</button>
      </div>
    </div>
    <div class="menu-side">
      <div class="panel rank-card">
        <p class="caption">Your rank</p>
        <p class="rank-name">${icon('trophy')} ${rank.label}</p>
        <div class="xp-bar"><i style="width:${pct}%"></i></div>
        <p class="caption">${d.xp} XP${next ? ` · ${next.xp - d.xp} XP to ${next.label}` : ' · top rank!'}</p>
      </div>
      <div class="panel data-card">
        <p>${icon('database')} <b>Real NASA data inside</b></p>
        <ul>
          <li>Solar storms: NASA CCMC DONKI</li>
          <li>Radiation: NASA OSDR RadLab</li>
          <li>Space biology facts: NASA OSDR</li>
          <li>Mars imagery: NASA Mars Trek</li>
        </ul>
        <p class="caption">All archived NASA data – never live.</p>
      </div>
    </div>
  </div>`, 'menu-screen');
  $('nameInput').addEventListener('input', (e) => h.name(e.target.value));
  bind(h);
}

// ---------------- CHOOSE MISSION ----------------
export function showChoose(ctx, h) {
  const d = ctx.save, unlocked = d.moonWon || d.settings.unlockAll;
  const suitOpts = SUITS.map((s) => `<button type="button" class="swatch${d.settings.suit === s.id ? ' on' : ''}" data-act="suit" data-arg="${s.id}" ${d.xp < s.xp ? 'disabled' : ''}
     style="--c:${s.color}" aria-label="${s.label}${d.xp < s.xp ? ' (unlocks at ' + s.xp + ' XP)' : ''}">${d.xp < s.xp ? icon('lock') : ''}</button>`).join('');
  const roverOpts = ROVER_SKINS.map((s) => `<button type="button" class="swatch${d.settings.roverSkin === s.id ? ' on' : ''}" data-act="rover" data-arg="${s.id}" ${d.xp < s.xp ? 'disabled' : ''}
     style="--c:${s.color}" aria-label="${s.label}${d.xp < s.xp ? ' (unlocks at ' + s.xp + ' XP)' : ''}">${d.xp < s.xp ? icon('lock') : ''}</button>`).join('');
  open(`
  <div class="page">
    <div class="page-head">${back}<h2>Choose your mission</h2></div>
    <div class="missions">
      <button class="mission panel" data-act="mission" data-arg="moon" type="button" style="--accent:#7cf5c8">
        <span class="m-icon">${icon('moon')}</span><span class="tag">Easier</span>
        <h3>Moon Base</h3>
        <p>${d.settings.missionLength} sols on the Moon. Ice crater, old lander and research huts. Storms from real <b>2026</b> solar flares.</p>
        <p class="m-meta">${icon('database')} NASA CCMC DONKI 2026 · RadLab: ${ctx.data.radiation.game_scale.moon}× ISS radiation</p>
      </button>
      <button class="mission panel${unlocked ? '' : ' locked'}" data-act="mission" data-arg="mars" type="button" style="--accent:#ff6b6b" ${unlocked ? '' : 'aria-disabled="true"'}>
        <span class="m-icon">${icon(unlocked ? 'planet' : 'lock')}</span><span class="tag">Harder</span>
        <h3>Mars Base</h3>
        <p>${unlocked ? 'Red canyons, dust storms, the strongest <b>2024</b> flares, and a 20-minute Earth reply delay: you must decide alone!' : 'Win the Moon mission to unlock Mars.'}</p>
        <p class="m-meta">${icon('database')} DONKI 2024 · RadLab: ${ctx.data.radiation.game_scale.mars}× ISS · imagery: NASA Mars Trek</p>
      </button>
    </div>
    <div class="panel gear">
      <h3>Your gear</h3>
      <div class="gear-row"><span>Suit colour</span><div class="swatches">${suitOpts}</div></div>
      <div class="gear-row"><span>Rover skin</span><div class="swatches">${roverOpts}</div></div>
      <p class="caption">Backpack level ${backpackLevelFor(d.xp)} of 3 (${BACKPACK_UNLOCKS.slice(1).map((x, i) => `level ${i + 2} at ${x} XP`).join(', ')}). Earn XP to unlock more.</p>
    </div>
  </div>`);
  bind(h);
}

// ---------------- HOW TO PLAY ----------------
export function showHow(ctx, h) {
  open(`
  <div class="page">
    <div class="page-head">${back}<h2>How to play</h2></div>
    <div class="grid2">
      <div class="panel">
        <h3>Each sol (one round)</h3>
        <ol class="steps">
          <li><b>Plan:</b> pick 1 of 3 cards. Each helps one bar but costs another.</li>
          <li><b>Drop:</b> jump out of the lander and steer down with thrusters.</li>
          <li><b>Collect:</b> walk into glowing supplies. Your backpack has limited slots!</li>
          <li><b>Storm:</b> a REAL solar flare from NASA data starts a storm. The safe circle shrinks.</li>
          <li><b>Shelter:</b> reach the yellow beam before the storm ends. Survive ${ctx.save.settings.missionLength} sols to win.</li>
        </ol>
      </div>
      <div class="panel">
        <h3>Controls</h3>
        <ul class="keys">
          <li><kbd>W A S D</kbd> / arrows: move · drag mouse: look · wheel: zoom</li>
          <li><kbd>Shift</kbd> sprint · <kbd>Space</kbd> jump · <kbd>C</kbd> crouch</li>
          <li><kbd>E</kbd> drive / leave a rover · <kbd>Tab</kbd> backpack · <kbd>1</kbd>–<kbd>4</kbd> use quick slots</li>
          <li><kbd>F</kbd> fast-forward when safe in the shelter · <kbd>Esc</kbd> pause · <kbd>M</kbd> mute</li>
          <li>Phone: joystick on the left, buttons on the right, drag to look.</li>
        </ul>
      </div>
      <div class="panel">
        <h3>The 3 mission bars</h3>
        <ul class="plain">
          <li>${icon('power')} <b>Power</b>: suits, rovers and the base need electricity.</li>
          <li>${icon('life')} <b>Life Support</b>: air, water and food for the crew.</li>
          <li>${icon('rad')} <b>Radiation Safety</b>: protection from space radiation.</li>
        </ul>
        <p>If any bar reaches 0, the mission fails.</p>
      </div>
      <div class="panel">
        <h3>What you will learn</h3>
        <ul class="plain">
          <li>${icon('power')} <b>Power budget</b>: energy is limited, every action costs some.</li>
          <li>${icon('rad')} <b>Radiation shielding</b>: when and how to protect the crew from solar storms.</li>
          <li>${icon('life')} <b>Life support</b>: air, water and growing food in space.</li>
          <li>${icon('radio')} <b>Communication delay</b>: on Mars you must decide without waiting for Earth.</li>
        </ul>
      </div>
      <div class="panel wide">
        <h3>Hard words</h3>
        <dl class="gloss">${Object.entries(GLOSSARY).map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
      </div>
    </div>
  </div>`);
  bind(h);
}

// ---------------- ABOUT THE DATA ----------------
export function showAbout(ctx, h) {
  const D = ctx.data, R = D.radiation;
  const pl = R.places;
  open(`
  <div class="page">
    <div class="page-head">${back}<h2>About the data</h2></div>
    <p class="lead">Everything in this game that sounds like science comes from real NASA data. We saved it once (an <b>archived snapshot</b>), so it is <b>not live</b>.</p>
    <div class="grid2">
      <div class="panel">
        <h3>${icon('flame')} Solar storms – NASA CCMC DONKI</h3>
        <p>DONKI is NASA's space weather database. It lists real <b>solar flares</b>: giant bursts of energy from the Sun.</p>
        <p><b>In the game:</b> every sol's storm is one real flare. Its class (C, M or X) and date are shown on screen. X-class flares are the strongest, so the zone shrinks faster and hurts more.</p>
        <p class="caption">Moon: ${D.flareInfo.moon.count} flares from ${D.flareInfo.moon.year} · Mars: ${D.flareInfo.mars.count} flares from ${D.flareInfo.mars.year} (only strong M and X). Saved on ${esc(D.flareInfo.moon.fetched)}.</p>
        <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">ccmc.gsfc.nasa.gov/tools/DONKI ${icon('external')}</a>
      </div>
      <div class="panel">
        <h3>${icon('rad')} Radiation – NASA OSDR RadLab</h3>
        <p>RadLab collects real radiation measurements from detectors in space.</p>
        <ul class="plain">
          <li>Space Station (ISS): about <b>${pl.iss.median_uGy_per_hour}</b> µGy per hour</li>
          <li>Near the Moon (LRO): about <b>${pl.moon.median_uGy_per_hour}</b> µGy per hour</li>
          <li>Mars surface (Curiosity rover): about <b>${pl.mars_surface.median_uGy_per_hour}</b> µGy per hour</li>
        </ul>
        <p><b>In the game:</b> storm radiation is ${R.game_scale.moon}× stronger on the Moon and ${R.game_scale.mars}× on Mars than on the ISS – just like in the measurements.</p>
        <p class="caption">${esc(R.period[0])} to ${esc(R.period[1])}, saved on ${esc(R.fetched_on)}.</p>
        <a href="${esc(R.source_link)}" target="_blank" rel="noopener">visualization.osdr.nasa.gov/radlab ${icon('external')}</a>
      </div>
      <div class="panel">
        <h3>${icon('bulb')} Space biology – NASA OSDR</h3>
        <p>The Open Science Data Repository holds NASA space-biology studies, like plants grown on the ISS.</p>
        <p><b>In the game:</b> the "Did you know?" facts after each sol. Each fact was checked word by word against its study.</p>
        <ul class="plain small">${[...new Set(D.facts.map((f) => f.id))].map((id) => { const f = D.facts.find((x) => x.id === id); return `<li><a href="${esc(f.source_link)}" target="_blank" rel="noopener">${esc(id)}</a>: ${esc(f.study_title)}</li>`; }).join('')}</ul>
      </div>
      <div class="panel">
        <h3>${icon('planet')} Mars imagery – NASA Mars Trek</h3>
        <p>Mars Trek is NASA's map of Mars made from real spacecraft pictures.</p>
        <p><b>In the game:</b> the Mars ground and minimap use the Viking colour mosaic from Mars Trek.</p>
        <p class="caption">Credit: NASA/JPL-Caltech Mars Trek, Viking MDIM 2.1 colour mosaic (NASA/USGS).</p>
        <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">trek.nasa.gov/mars ${icon('external')}</a>
      </div>
      <div class="panel wide">
        <h3>${icon('card')} Plan cards</h3>
        <p>Each card has a "Real science" line about how astronauts really live and work in space (for example, the ISS recycles about 98% of its water, and astronauts grow lettuce in a chamber called Veggie).</p>
      </div>
    </div>
  </div>`);
  bind(h);
}

// ---------------- CREDITS ----------------
export function showCredits(ctx, h) {
  open(`
  <div class="page">
    <div class="page-head">${back}<h2>Credits & references</h2></div>
    <div class="grid2">
      <div class="panel">
        <h3>Team</h3>
        <p><b>TechNest Thinkers</b> – NASA Space Apps Challenge 2026, Faisalabad, Pakistan.</p>
        <p>Challenge: <i>Build a Junior Astronaut Mission Trainer</i>.</p>
      </div>
      <div class="panel">
        <h3>NASA data (archived)</h3>
        <ul class="plain small">
          <li>NASA CCMC DONKI – Space Weather Database Of Notifications, Knowledge, Information</li>
          <li>NASA OSDR RadLab – radiation dose rates</li>
          <li>NASA Open Science Data Repository – OSD-895, OSD-767, OSD-766, OSD-412, OSD-964</li>
          <li>NASA Mars Trek – Viking MDIM 2.1 colour mosaic (NASA/JPL-Caltech, USGS)</li>
        </ul>
      </div>
      <div class="panel">
        <h3>Code, fonts and sounds</h3>
        <ul class="plain small">
          <li><a href="https://threejs.org" target="_blank" rel="noopener">Three.js</a> r160 (MIT licence) – 3D graphics</li>
          <li><a href="https://fonts.google.com/specimen/Inter" target="_blank" rel="noopener">Inter</a> and <a href="https://fonts.google.com/specimen/Orbitron" target="_blank" rel="noopener">Orbitron</a> (SIL Open Font Licence) via Google Fonts</li>
          <li>All sounds are made live with the Web Audio API (no sound files)</li>
          <li>All 3D models and icons were made by the team in code</li>
        </ul>
      </div>
      <div class="panel">
        <h3>Use of AI</h3>
        <p>AI tools, including <b>Claude</b> (Anthropic), helped write code and text for this game. The team reviewed, tested and edited everything, and checked every science fact against the NASA data.</p>
      </div>
    </div>
  </div>`);
  bind(h);
}

// ---------------- SETTINGS ----------------
export function showSettings(ctx, h) {
  const s = ctx.save.settings;
  const opt = (name, value, label) => `<button type="button" class="seg${s[name] === value ? ' on' : ''}" data-act="set" data-arg="${name}:${value}">${label}</button>`;
  open(`
  <div class="page">
    <div class="page-head">${ctx.inGame ? '<button class="btn btn-ghost" data-act="pause" type="button">← Back</button>' : back}<h2>Settings</h2></div>
    <div class="panel settings">
      <div class="set-row"><span>Graphics</span><div class="segs">${opt('quality', 'low', 'Low')}${opt('quality', 'medium', 'Medium')}${opt('quality', 'high', 'High')}</div></div>
      <div class="set-row"><label for="vol">Sound volume</label><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}"></div>
      <div class="set-row"><span>Music</span><div class="segs">${opt('music', true, 'On')}${opt('music', false, 'Off')}</div></div>
      <div class="set-row"><span>Reduce motion</span><div class="segs">${opt('reduceMotion', false, 'Off')}${opt('reduceMotion', true, 'On')}</div></div>
      <div class="set-row"><label for="sens">Camera sensitivity</label><input id="sens" type="range" min="0.4" max="2" step="0.1" value="${s.sensitivity}"></div>
      <div class="set-row"><span>Phone controls</span><div class="segs">${opt('touch', 'auto', 'Auto')}${opt('touch', 'on', 'On')}${opt('touch', 'off', 'Off')}</div></div>
      <div class="set-row"><span>Mission length</span><div class="segs">${opt('missionLength', 12, '12 sols')}${opt('missionLength', 6, '6 sols')}${opt('missionLength', 3, '3 sols (demo)')}</div></div>
      <div class="set-row"><span>Teacher mode: unlock Mars</span><div class="segs">${opt('unlockAll', false, 'Off')}${opt('unlockAll', true, 'On')}</div></div>
      <p class="caption">Graphics changes apply after the page reloads. A full NASA-style mission is 12 sols.</p>
      ${ctx.inGame ? '' : '<button class="btn btn-ghost danger" data-act="resetProgress" type="button">Reset my progress</button>'}
    </div>
  </div>`);
  $('vol').addEventListener('input', (e) => h.setValue('volume', parseFloat(e.target.value)));
  $('sens').addEventListener('input', (e) => h.setValue('sensitivity', parseFloat(e.target.value)));
  bind(h);
}

// ---------------- PAUSE ----------------
export function showPause(ctx, h) {
  open(`
  <div class="center-card panel">
    <h2>Paused</h2>
    <p class="caption">Sol ${ctx.sol} of ${ctx.total} · ${esc(ctx.levelName)}</p>
    <button class="btn btn-primary btn-xl" data-act="resume" type="button">${icon('play')} Resume</button>
    <button class="btn" data-act="howInGame" type="button">${icon('book')} How to Play</button>
    <button class="btn" data-act="settingsInGame" type="button">${icon('settings')} Settings</button>
    <button class="btn btn-ghost" data-act="quit" type="button">Quit to menu</button>
  </div>`, 'dim');
  bind(h);
}
export function showHowInGame(ctx, h) {
  showHow(ctx, { ...h, menu: h.pause });
}

// ---------------- BRIEFING (PLAN CARDS) ----------------
export function showBriefing(ctx, h) {
  const { cards, sol, total, level, bars, tutorial, seconds } = ctx;
  const cardHtml = cards.map((c, i) => {
    const mod = CARD_MODS[c.id];
    return `<button class="plan-card panel" data-act="pick" data-arg="${c.id}" type="button">
      <span class="pc-key">${i + 1}</span>
      <h3>${esc(c.title)}</h3>
      <div class="chips">${chips(cardBarEffects(c))}</div>
      <p class="pc-mod"><b>This sol:</b> ${esc(mod.desc)}</p>
      <p class="pc-sci"><b>${icon('bulb')} Real science:</b> ${esc(c.science)}</p>
    </button>`;
  }).join('');
  open(`
  <div class="briefing">
    <div class="brief-head">
      <p class="eyebrow">Mission briefing · ${level === 'mars' ? 'Mars' : 'Moon'} · Sol ${sol} of ${total}</p>
      <h2>Pick one plan for this sol</h2>
      <div class="brief-bars">${['power', 'life', 'rad'].map((k) => `<span class="bb">${icon(BAR_ICON[k])} ${BAR_NAMES[k]} <b>${Math.round(bars[k])}</b></span>`).join('')}</div>
      <p class="rovi-line">${icon('bulb')} <span>${richText(tutorial
        ? 'ROVI: Each card changes your bars (green = up, red = down) AND changes this sol. Look at your lowest bar and choose a card that helps it!'
        : 'ROVI: A real solar storm will hit today. Choose the plan that fixes your weakest bar.')}</span></p>
    </div>
    <div class="plan-cards">${cardHtml}</div>
    <p class="brief-timer">Auto-pick in <b id="briefTime">${seconds}</b> s · keys <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></p>
  </div>`, 'briefing-screen');
  bind(h);
  let left = seconds;
  timers.push(setInterval(() => {
    left--;
    const t = $('briefTime'); if (t) t.textContent = Math.max(0, left);
    if (left <= 3 && left > 0) h.tick();
    if (left <= 0) { clearTimers(); h.pick(cards[0].id); }
  }, 1000));
}

// ---------------- NIGHT REPORT ----------------
export function showReport(r, h) {
  const barRow = (k) => `<div class="rbar" data-k="${k}"><span>${icon(BAR_ICON[k])} ${BAR_NAMES[k]}</span>
    <div class="rtrack"><i class="before" style="width:${r.before[k]}%"></i><i class="after" style="width:${r.before[k]}%" data-to="${r.after[k]}"></i></div>
    <b><span class="rnum" data-from="${Math.round(r.before[k])}" data-to="${Math.round(r.after[k])}">${Math.round(r.before[k])}</span></b></div>`;
  open(`
  <div class="page report">
    <div class="report-head ${r.safe ? 'good' : 'bad'}">
      <p class="eyebrow">Night report · Sol ${r.sol} of ${r.total}</p>
      <h2>${r.safe ? icon('check') + ' Safe in the shelter!' : icon('alert') + ' Caught outside the shelter'}</h2>
      <p>${esc(r.summary)}</p>
    </div>
    <div class="grid2">
      <div class="panel">
        <h3>Your bars</h3>
        ${barRow('power')}${barRow('life')}${barRow('rad')}
        <p class="caption">Overnight the base used ${r.night.power} Power and ${r.night.life} Life Support.</p>
      </div>
      <div class="panel">
        <h3>Today's storm</h3>
        <p><b>${esc(r.flare.class)} solar flare · ${esc(r.flare.date)}</b> – ${esc(r.flare.kid_label)}</p>
        <p>You took <b>${Math.round(r.stats.radTaken)}</b> radiation outside the safe zone.${r.stats.radBlocked > 0.5 ? ` Your plan blocked <b>${Math.round(r.stats.radBlocked)}</b>.` : ''}</p>
        <p class="source">${icon('database')} Source: NASA CCMC DONKI · archived NASA data ${r.flare.source_link ? `· <a href="${esc(r.flare.source_link)}" target="_blank" rel="noopener">see the record ${icon('external')}</a>` : ''}</p>
      </div>
      <div class="panel">
        <h3>${icon('card')} Your plan: ${esc(r.card.title)}</h3>
        <ul class="plain">${r.cardLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>
      <div class="panel">
        <h3>${icon('bag')} Supplies delivered to the base</h3>
        ${r.delivered.length ? `<ul class="plain">${r.delivered.map((d) => `<li><span style="color:${d.color}">●</span> ${esc(d.label)} – ${esc(d.effect)}</li>`).join('')}</ul>` : '<p>Nothing in your backpack at the end of the sol.</p>'}
        <p class="caption">Collected ${r.stats.collected} · used ${r.stats.used}</p>
      </div>
      <div class="panel">
        <h3>${icon('users')} Crew race</h3>
        <ol class="race">${r.board.map((b) => `<li class="${b.you ? 'you' : ''}"><i style="background:${b.color}"></i>${esc(b.name)} <span>${b.points} pts${b.home ? ' · safe' : ' · rescued by rover'}</span></li>`).join('')}</ol>
        <p><b>Your place: #${r.place}${r.place === 1 ? ' Survivor!' : ''}</b></p>
      </div>
      <div class="panel">
        <h3>${icon('trophy')} XP</h3>
        <ul class="plain">${r.xpLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="xp-total">+${r.xp} XP</p>
        ${r.rankUp ? `<p class="good">${icon('trophy')} New rank: <b>${esc(r.rankUp)}</b>!</p>` : ''}
        ${r.unlocks.map((u) => `<p class="good">${icon('star')} Unlocked: ${esc(u)}</p>`).join('')}
      </div>
      <div class="panel wide dyk">
        <h3>${icon('bulb')} Did you know?</h3>
        <p>${esc(r.fact.text)}</p>
        <p class="source">${icon('database')} <a href="${esc(r.fact.link)}" target="_blank" rel="noopener">${esc(r.fact.source)} ${icon('external')}</a> · archived NASA data</p>
      </div>
    </div>
    <div class="actions">
      ${r.failed ? '' : `<button class="btn btn-primary btn-xl" data-act="next" type="button">${r.last ? 'See mission results' : 'Next sol'} ${icon('arrow')}</button>`}
      ${r.failed ? `<button class="btn btn-primary btn-xl" data-act="next" type="button">See what happened ${icon('arrow')}</button>` : ''}
    </div>
  </div>`, 'report-screen');
  bind(h);
  // animate the bars from before → after
  setTimeout(() => {
    el.querySelectorAll('.rtrack .after').forEach((i) => { i.style.width = i.dataset.to + '%'; });
    el.querySelectorAll('.rnum').forEach((n) => {
      const from = +n.dataset.from, to = +n.dataset.to, t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / 1200); n.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }, 300);
}

// ---------------- MISSION END ----------------
export function showEnd(r, h) {
  open(`
  <div class="page end">
    <div class="report-head ${r.won ? 'good' : 'bad'}">
      <p class="eyebrow">${esc(r.levelName)} mission · ${r.solsDone} of ${r.total} sols</p>
      <h2>${r.won ? icon('trophy') + ' Mission complete!' : icon('alert') + ' Mission failed'}</h2>
      <p class="reason">${esc(r.reason)}</p>
      ${r.tip ? `<p class="tip-box">${icon('bulb')} ${esc(r.tip)}</p>` : ''}
      <div class="rank-badge">${icon('trophy')} ${esc(r.rank)}</div>
      <p class="caption">${r.totalXp} XP total · +${r.missionXp} XP this mission${r.marsUnlocked ? ' · <b>Mars unlocked!</b>' : ''}</p>
    </div>
    <div class="grid2">
      <div class="panel">
        <h3>What you learned</h3>
        <ul class="learn">${r.learning.map((l) => `<li class="${l.good ? 'good' : 'tip'}">${icon(l.icon)}<div><b>${esc(l.title)}</b><p>${esc(l.text)}</p></div></li>`).join('')}</ul>
      </div>
      <div class="panel">
        <h3>What would a real astronaut do?</h3>
        <ul class="learn">${r.debrief.map((d) => `<li class="${d.good ? 'good' : 'tip'}">${icon(d.good ? 'check' : 'bulb')}<div><p>${esc(d.text)}</p><p class="caption">${esc(d.source)}</p></div></li>`).join('')}</ul>
      </div>
      <div class="panel wide paper-wrap">
        <canvas id="paper" width="900" height="1240" role="img" aria-label="Newspaper front page"></canvas>
        <button class="btn btn-primary" data-act="download" type="button">${icon('download')} Download newspaper (PNG)</button>
      </div>
    </div>
    <div class="actions">
      ${r.won && r.level === 'moon' ? `<button class="btn btn-primary btn-xl" data-act="mission" data-arg="mars" type="button">${icon('planet')} Next mission: Mars</button>` : ''}
      <button class="btn ${r.won && r.level === 'moon' ? '' : 'btn-primary btn-xl'}" data-act="mission" data-arg="${r.level}" type="button">Play again</button>
      <button class="btn btn-ghost" data-act="menu" type="button">Main menu</button>
    </div>
  </div>`, 'report-screen');
  bind(h);
  const canvas = $('paper');
  const draw = () => drawNewspaper(canvas, r.paper);
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
}
