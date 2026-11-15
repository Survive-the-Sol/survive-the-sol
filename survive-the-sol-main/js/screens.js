// =====================================================================
// SCREENS – full-screen pages, built to match the approved designs
// (design/*.dc.html). Each page sits on a 1280×720 "stage" that is
// scaled to fill the window (see css: .stage and --s), or flows as a
// column on phones.
//   Main (name) · Lobby · Cards · Night · Win · Lose
//   + How to play · About the NASA data · Credits · Settings · Pause
// game.js passes the data (ctx) and the button actions (h).
// =====================================================================
import { icon, pathIcon, starIcon, esc, fmtTime, BAR_NAMES } from './hud.js';
import { GLOSSARY, richText } from './rovi.js';

const $ = (id) => document.getElementById(id);
const el = $('screen');
let timers = [];
function clearTimers() { timers.forEach(clearInterval); timers = []; }

function open(html, cls) {
  clearTimers();
  el.className = 'screen ' + cls;
  el.innerHTML = `<div class="stage">${html}</div>`;
  el.hidden = false;
  el.scrollTop = 0;
  const first = el.querySelector('[autofocus]') || el.querySelector('.btn-yellow, button, input');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
}
export function closeScreen() { clearTimers(); el.hidden = true; el.innerHTML = ''; }
function bind(h) {
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const fn = h[b.dataset.act];
    if (fn) fn(b.dataset.arg, e);
  }));
}
// Make glossary words in a sentence clickable.
function glossify(text) {
  let out = text;
  for (const word of Object.keys(GLOSSARY)) {
    const re = new RegExp('\\b(' + word + ')\\b', 'i');
    if (re.test(out)) out = out.replace(re, '[[' + word + ']]');
  }
  return richText(out);
}
const ROVI_SMALL = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="7" width="16" height="11" rx="4" fill="#eef0f6"/><circle cx="9.5" cy="12.5" r="1.8" fill="#1a2150"/><circle cx="14.5" cy="12.5" r="1.8" fill="#1a2150"/></svg>`;
const LOGO = `<svg width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden="true"><circle cx="30" cy="30" r="14" fill="#ff8a5c"/><ellipse cx="30" cy="30" rx="26" ry="9" stroke="#7cf5c8" stroke-width="3" transform="rotate(-20 30 30)"/></svg>`;

// ---------------- 1. NAME PAGE (Main.dc.html) ----------------
export function showName(ctx, h) {
  open(`
  <div class="m-star" style="left:140px;top:90px;width:3px;height:3px;opacity:.8"></div>
  <div class="m-star" style="left:420px;top:60px;width:2px;height:2px;opacity:.6"></div>
  <div class="m-star" style="left:980px;top:120px;width:3px;height:3px;opacity:.7"></div>
  <div class="m-star" style="left:1150px;top:300px;width:2px;height:2px;opacity:.6"></div>
  <div class="m-star" style="left:230px;top:420px;width:2px;height:2px;opacity:.5"></div>
  <div class="m-earth"></div>
  <div class="m-moon"></div>
  <div class="m-center">
    <div class="logo-ring">${LOGO}</div>
    <div class="eyebrow">NASA SPACE APPS 2026 · JUNIOR ASTRONAUT MISSION TRAINER</div>
    <h1 class="m-title">SURVIVE THE SOL</h1>
    <p class="m-sub">Survive 12 days on the Moon. Use the right card when a real NASA solar storm hits.</p>
    ${ctx.returning ? `<p class="m-welcome">Welcome back, ${esc(ctx.name)}!</p>` : ''}
    <form class="name-form panel" id="nameForm">
      <label for="cmdname">Your commander name</label>
      <div class="name-row">
        <input id="cmdname" type="text" maxlength="20" autocomplete="off" placeholder="e.g. Commander Ayesha" value="${esc(ctx.name || '')}" ${ctx.returning ? '' : 'autofocus'}>
        <button type="button" class="dice-btn" data-act="random" aria-label="Random name">${icon('dice', 22)}</button>
      </div>
      <button type="submit" class="btn-yellow big" ${ctx.returning ? 'autofocus' : ''}>START</button>
    </form>
    <div class="m-note">No login needed · Your name stays on this device</div>
  </div>`, 's-main');
  bind(h);
  $('nameForm').addEventListener('submit', (e) => { e.preventDefault(); h.start($('cmdname').value.trim()); });
}
export function setNameInput(v) { const i = $('cmdname'); if (i) i.value = v; }

// ---------------- 2. LOBBY (Lobby.dc.html) – 3D astronaut drawn by game.js behind this ----------------
export function showLobby(ctx, h) {
  const pct = Math.round(Math.min(1, ctx.xpInRank / Math.max(1, ctx.xpRankSize)) * 100);
  const marsOpen = ctx.marsUnlocked;
  open(`
  <div class="l-top">
    <div class="l-profile panel">
      <div class="l-avatar">${esc((ctx.name || 'C').replace(/^Commander\s+/i, '').charAt(0).toUpperCase() || 'C')}</div>
      <div class="l-pinfo">
        <div class="l-name">${esc(ctx.displayName)}</div>
        <div class="l-rankrow"><span class="l-rank">${esc(ctx.rank.toUpperCase())}</span>
          <div class="l-xpbar"><i style="width:${pct}%"></i></div>
          <span class="l-xp">${ctx.next ? `${ctx.xp} / ${ctx.next} XP` : `${ctx.xp} XP · top rank`}</span></div>
      </div>
    </div>
    <div class="l-topright">
      <div class="l-stars panel" aria-label="${ctx.stars} stars">${starIcon(true, 18)}<span>${ctx.stars}</span></div>
      <button type="button" class="sq-btn panel" data-act="settings" aria-label="Settings">${icon('gear', 22)}</button>
    </div>
  </div>
  <div class="l-missions">
    <div class="l-label">MISSIONS</div>
    <button type="button" class="l-mission ${ctx.selected === 'moon' ? 'on' : ''}" data-act="select" data-arg="moon">
      <span class="lm-name">MOON BASE</span><span class="lm-sub">${ctx.inProgress && ctx.inProgress.level === 'moon' ? `Continue day ${ctx.inProgress.day} / ${ctx.total}` : `${ctx.total} days · Easy`}</span></button>
    <button type="button" class="l-mission mars ${ctx.selected === 'mars' ? 'on' : ''} ${marsOpen ? '' : 'locked'}" data-act="select" data-arg="mars" ${marsOpen ? '' : 'aria-disabled="true"'}>
      <span><span class="lm-name">MARS BASE</span><span class="lm-sub">${marsOpen ? (ctx.inProgress && ctx.inProgress.level === 'mars' ? `Continue day ${ctx.inProgress.day} / ${ctx.total}` : `${ctx.total} days · Hard`) : 'Win the Moon to unlock'}</span></span>
      ${marsOpen ? '' : icon('lock', 20, '#8f97c2')}</button>
  </div>
  <div class="l-links">
    <button type="button" class="l-link panel" data-act="how">How to play</button>
    <button type="button" class="l-link panel" data-act="about">About the NASA data</button>
    <button type="button" class="l-link panel" data-act="credits">Credits</button>
  </div>
  <div class="l-start"><button type="button" class="btn-yellow huge glow" data-act="start" autofocus>START MISSION</button></div>`, 's-lobby');
  bind(h);
}

// ---------------- 3. CARDS (Cards.dc.html): pick 3 of 5 ----------------
export function showCards(ctx, h) {
  const picked = [];
  const render = () => {
    el.querySelectorAll('.ec').forEach((c) => {
      const on = picked.includes(c.dataset.id);
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', on);
    });
    $('pickCount').textContent = `${picked.length} of 3 picked`;
    $('landBtn').disabled = picked.length < 3;
  };
  const cardHtml = ctx.offer.map((c, i) => `
    <div class="ec" role="button" tabindex="0" data-id="${c.id}" aria-pressed="false" ${i === 0 ? 'autofocus' : ''} aria-label="${esc(c.title)}: best for ${esc(ctx.dangerLabel(c))}">
      <div class="ec-head"><div class="ec-icon">${pathIcon(c.icon, 28)}</div><div class="ec-check">${icon('check', 18, '#0b1026')}</div></div>
      <div class="ec-title">${esc(c.title)}</div>
      <div class="ec-best">BEST FOR: ${esc(ctx.dangerLabel(c))}</div>
      <div class="ec-good">+ ${esc(c.effect.text)}</div>
      <div class="ec-cost">− ${esc(c.cost.text)}</div>
      <div class="ec-sci"><span>Real science: </span>${glossify(c.science)}</div>
    </div>`).join('');
  open(`
  <div class="c-top"><div class="c-day">DAY ${ctx.day} / ${ctx.total} · ${esc(ctx.levelName)}</div>
    <div class="c-timer">${icon('clock', 16)}<span id="cardTime">${fmtTime(ctx.seconds)}</span></div></div>
  <h1 class="c-title">PICK 3 EMERGENCY CARDS</h1>
  <p class="c-sub">These cards can save your crew when danger hits today.</p>
  <div class="ec-grid">${cardHtml}</div>
  <div class="c-bottom"><div id="pickCount" class="c-count">0 of 3 picked</div>
    <button type="button" id="landBtn" class="btn-yellow wide" disabled>${esc(ctx.landLabel)}</button></div>`, 's-cards');
  const openedAt = performance.now();
  const toggle = (id) => {
    if (performance.now() - openedAt < 350) return;   // ignore a click that carried over from the last screen
    const i = picked.indexOf(id);
    if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(id);
    h.tick && h.tick('select');
    render();
  };
  el.querySelectorAll('.ec').forEach((c) => {
    c.addEventListener('click', (e) => { if (e.target.closest('.word')) return; toggle(c.dataset.id); });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.dataset.id); } });
  });
  const finish = () => {
    clearTimers();
    for (const c of ctx.offer) if (picked.length < 3 && !picked.includes(c.id)) picked.push(c.id);   // time up: fill the hand
    h.done(picked.slice(0, 3));
  };
  $('landBtn').addEventListener('click', finish);
  let left = ctx.seconds;
  timers.push(setInterval(() => {
    left--;
    const t = $('cardTime'); if (t) t.textContent = fmtTime(left);
    if (left <= 3 && left > 0 && h.tick) h.tick('beep');
    if (left <= 0) finish();
  }, 1000));
  render();
}

// ---------------- 6. NIGHT REPORT (Night.dc.html) ----------------
export function showNight(r, h) {
  const row = (k) => {
    const b = Math.round(r.before[k]), a = Math.round(r.after[k]);
    return `<div class="n-row"><span>${BAR_NAMES[k]}</span><span class="n-val">${b} → <span class="${a >= b ? 'up' : 'down'}">${a}</span></span></div>`;
  };
  open(`
  <div class="n-eyebrow">NIGHT REPORT · DAY ${r.day} / ${r.total}</div>
  <h1 class="n-title">${esc(r.title)}</h1>
  <div class="n-stars" role="img" aria-label="${r.stars} of 3 stars">${starIcon(r.stars >= 1)}${starIcon(r.stars >= 2)}${starIcon(r.stars >= 3)}</div>
  <p class="n-why">${esc(r.starsWhy)}</p>
  <div class="n-grid">
    <div class="panel n-card"><div class="n-label">YOUR BARS</div>${row('power')}${row('life')}${row('rad')}</div>
    <div class="panel n-card used"><div class="n-label">CARD USED</div>
      <div class="n-cardname">${esc(r.card.title)}</div>
      <div class="n-saved">${r.card.html}</div>
      <div class="n-verdict ${r.card.good ? 'good' : 'bad'}">${esc(r.card.verdict)}</div>
      ${r.card.extra ? `<div class="n-extra">${esc(r.card.extra)}</div>` : ''}</div>
    <div class="panel n-card"><div class="n-label yellow">DID YOU KNOW?</div>
      <div class="n-fact">${esc(r.fact.text)}</div>
      <div class="n-src">Source: <a href="${esc(r.fact.link)}" target="_blank" rel="noopener">${esc(r.fact.source)}</a> · archived NASA data</div></div>
  </div>
  <div class="n-actions">
    <button type="button" class="btn-ghost" data-act="saveQuit">Save &amp; quit</button>
    <button type="button" class="btn-yellow wide" data-act="next" autofocus>${r.last ? 'FINISH MISSION' : 'NEXT DAY'}</button>
  </div>`, 's-night');
  bind(h);
}

// ---------------- 7. WIN (Win.dc.html) ----------------
export function showWin(r, h) {
  const conf = [[160, 80, '#e8f22a', 30], [320, 160, '#7cf5c8', -20], [980, 110, '#ff6b6b', 50], [1100, 240, '#8fb0ff', -35], [240, 300, '#8fb0ff', 10], [860, 60, '#e8f22a', -60]]
    .map(([x, y, c, a]) => `<div class="confetti" style="left:${x}px;top:${y}px;background:${c};transform:rotate(${a}deg)"></div>`).join('');
  open(`${conf}
  <div class="w-wrap">
    <div class="w-left">
      <div class="w-eyebrow">${r.total} DAYS SURVIVED</div>
      <h1 class="w-title">MISSION<br>SUCCESS!</h1>
      <div class="w-rank panel"><div class="w-rankic"><svg width="36" height="36" viewBox="0 0 24 24" fill="#0b1026" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z"/></svg></div>
        <div><div class="w-ranklabel">${r.rankUp ? 'NEW RANK' : 'YOUR RANK'}</div><div class="w-rankname">${esc(r.rank.toUpperCase())}</div></div></div>
      <div class="w-learn panel"><div class="n-label">WHAT YOU LEARNED</div>
        <div class="w-goals">
          <div><span style="background:#e8f22a"></span>Power is limited</div>
          <div><span style="background:#8fb0ff"></span>Shield from solar storms</div>
          <div><span style="background:#7cf5c8"></span>Air, water and food matter</div>
          <div><span style="background:#ff9b9b"></span>On Mars, you decide alone</div>
        </div></div>
      <div class="w-actions">
        <button type="button" class="btn-yellow" data-act="next" autofocus>${r.level === 'moon' ? 'PLAY MARS' : 'BACK TO LOBBY'}</button>
        <button type="button" class="btn-ghost" data-act="download">Download newspaper</button>
      </div>
    </div>
    <div class="w-paper"><canvas id="paper" width="860" height="1120" role="img" aria-label="${esc(r.paperTitle)} front page"></canvas></div>
  </div>`, 's-win');
  bind(h);
}

// ---------------- 8. LOSE (Lose.dc.html) ----------------
export function showLose(r, h) {
  open(`
  <div class="lo-wrap">
    <div class="lo-day">DAY ${r.day} / ${r.total}</div>
    <h1 class="lo-title">MISSION FAILED</h1>
    <div class="lo-grid">
      <div class="lo-card bad"><div class="n-label coral">WHAT HAPPENED</div><div class="lo-text">${r.happenedHtml}</div>
        ${r.source ? `<div class="lo-src">${esc(r.source)}</div>` : ''}</div>
      <div class="lo-card good"><div class="n-label teal">WHAT WOULD SAVE YOU</div><div class="lo-text">${r.saveHtml}</div></div>
    </div>
    <div class="lo-rovi panel">${ROVI_SMALL}<span><b>ROVI:</b> Every astronaut learns from mistakes. Let's try again!</span></div>
    <div class="lo-actions">
      <button type="button" class="btn-ghost" data-act="lobby">Back to lobby</button>
      <button type="button" class="btn-yellow wide" data-act="retry" autofocus>TRY AGAIN</button>
    </div>
  </div>`, 's-lose');
  bind(h);
}

// ---------------- info pages (same style tokens) ----------------
function page(title, body, cls = '') {
  return `<div class="i-page ${cls}">
    <div class="i-head"><button type="button" class="sq-btn panel" data-act="back" aria-label="Back">${icon('back', 22)}</button><h1 class="i-title">${title}</h1></div>
    <div class="i-body">${body}</div></div>`;
}

export function showHow(ctx, h) {
  open(page('HOW TO PLAY', `
  <div class="i-grid">
    <div class="panel i-card"><div class="n-label yellow">EACH DAY</div><ol class="i-list">
      <li><b>Pick 3 of 5 emergency cards.</b> Each card helps against a danger, but costs something.</li>
      <li><b>Land and explore.</b> Grab glowing supplies: ice and oxygen (Life Support), batteries and solar panels (Power), shield plates (Radiation Safety).</li>
      <li><b>Danger!</b> A real NASA solar storm comes every day. Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to use a card within 5 seconds.</li>
      <li><b>Run back</b> into the safe zone around the base while the storm lasts.</li>
      <li>Survive ${ctx.total} days to win. Any bar at 0 = mission failed.</li></ol></div>
    <div class="panel i-card"><div class="n-label yellow">USING CARDS</div><ul class="i-list plain">
      <li><span class="dot" style="background:#7cf5c8"></span><b>Right card</b> for the danger: full effect.</li>
      <li><span class="dot" style="background:#e8f22a"></span><b>Wrong card:</b> only half the effect.</li>
      <li><span class="dot" style="background:#ff6b6b"></span><b>No card:</b> full damage.</li>
      <li>Each card works once per day.</li></ul>
      <div class="n-label yellow" style="margin-top:12px">CONTROLS</div><ul class="i-list plain">
      <li><kbd>W A S D</kbd> move · drag the mouse to look · <kbd>Shift</kbd> sprint · <kbd>Space</kbd> jump</li>
      <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> use a card · <kbd>E</kbd> drive a rover (uses Power) · <kbd>Esc</kbd> pause</li>
      <li>Phone: joystick on the left, buttons on the right, tap a card.</li></ul></div>
    <div class="panel i-card wide"><div class="n-label yellow">HARD WORDS</div>
      <dl class="i-gloss">${Object.entries(GLOSSARY).map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></div>
  </div>`), 's-info');
  bind(h);
}

export function showAbout(ctx, h) {
  const D = ctx.data, R = D.radiation, pl = R.places;
  const studies = [...new Set(D.facts.map((f) => f.id))].map((id) => D.facts.find((x) => x.id === id));
  open(page('ABOUT THE NASA DATA', `
  <p class="i-lead">Everything in this game that sounds like science comes from real NASA data. We saved it once, so it is <b>archived NASA data</b>, not live.</p>
  <div class="i-grid">
    <div class="panel i-card"><div class="n-label coral">SOLAR STORMS · NASA CCMC DONKI</div>
      <p>DONKI is NASA's space weather database. It lists real <b>solar flares</b>: giant bursts of energy from the Sun.</p>
      <p>Every day's storm is one real flare. Its class and date are shown on screen. Days 1–3 get small C-class flares, days 4–8 strong M-class, days 9–12 the strongest, X-class.</p>
      <p class="i-small">Moon: ${D.flareInfo.moon.count} flares from 2026 · Mars: ${D.flareInfo.mars.count} flares from 2024 · saved ${esc(D.flareInfo.moon.fetched)} · <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">ccmc.gsfc.nasa.gov/tools/DONKI</a></p></div>
    <div class="panel i-card"><div class="n-label blue">RADIATION · NASA OSDR RADLAB</div>
      <p>RadLab collects real radiation measurements from detectors in space:</p>
      <ul class="i-list plain"><li>Space Station: about <b>${pl.iss.median_uGy_per_hour}</b> µGy per hour</li>
        <li>Near the Moon (LRO): about <b>${pl.moon.median_uGy_per_hour}</b> µGy per hour</li>
        <li>Mars surface (Curiosity): about <b>${pl.mars_surface.median_uGy_per_hour}</b> µGy per hour</li></ul>
      <p>So storm radiation is <b>${R.game_scale.moon}×</b> stronger on the Moon and <b>${R.game_scale.mars}×</b> on Mars than on the Space Station.</p>
      <p class="i-small">${esc(R.period[0])} to ${esc(R.period[1])} · <a href="${esc(R.source_link)}" target="_blank" rel="noopener">visualization.osdr.nasa.gov/radlab</a></p></div>
    <div class="panel i-card"><div class="n-label teal">SPACE BIOLOGY · NASA OSDR</div>
      <p>The "Did you know?" facts come from real NASA studies. Each fact was checked word by word against its study.</p>
      <ul class="i-list plain i-small">${studies.map((f) => `<li><a href="${esc(f.source_link)}" target="_blank" rel="noopener">${esc(f.id)}</a> – ${esc(f.study_title)}</li>`).join('')}</ul></div>
    <div class="panel i-card"><div class="n-label mars">MARS IMAGERY · NASA MARS TREK</div>
      <p>The Mars ground and minimap use the real Viking colour mosaic from NASA Mars Trek.</p>
      <p class="i-small">Credit: NASA/JPL-Caltech Mars Trek, Viking MDIM 2.1 colour mosaic (NASA/USGS) · <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">trek.nasa.gov/mars</a></p>
      <div class="n-label yellow" style="margin-top:10px">EMERGENCY CARDS</div>
      <p>Each card has a "Real science" line about how astronauts really stay safe.</p></div>
  </div>`), 's-info');
  bind(h);
}

export function showCredits(ctx, h) {
  open(page('CREDITS', `
  <div class="i-grid">
    <div class="panel i-card"><div class="n-label yellow">TEAM</div>
      <p><b>TechNest Thinkers</b> – NASA Space Apps Challenge 2026, Faisalabad, Pakistan.</p>
      <p>Challenge: <i>Build a Junior Astronaut Mission Trainer</i>.</p></div>
    <div class="panel i-card"><div class="n-label yellow">NASA DATA (ARCHIVED)</div><ul class="i-list plain i-small">
      <li>NASA CCMC DONKI – solar flares</li><li>NASA OSDR RadLab – radiation dose rates</li>
      <li>NASA Open Science Data Repository – OSD-895, OSD-767, OSD-766, OSD-412, OSD-964</li>
      <li>NASA Mars Trek – Viking MDIM 2.1 colour mosaic (NASA/JPL-Caltech, USGS)</li></ul></div>
    <div class="panel i-card"><div class="n-label yellow">CODE, FONTS, SOUNDS</div><ul class="i-list plain i-small">
      <li><a href="https://threejs.org" target="_blank" rel="noopener">Three.js</a> r160 – MIT licence</li>
      <li><a href="https://fonts.google.com/specimen/Orbitron" target="_blank" rel="noopener">Orbitron</a> and <a href="https://fonts.google.com/specimen/Inter" target="_blank" rel="noopener">Inter</a> – SIL Open Font Licence (Google Fonts)</li>
      <li>Sounds: made live with the Web Audio API (no sound files)</li>
      <li>3D models, icons and the mission patch: made by the team in code</li></ul></div>
    <div class="panel i-card"><div class="n-label yellow">USE OF AI</div>
      <p>AI tools, including <b>Claude</b> (Anthropic), helped write code and text. The team reviewed, tested and edited everything, and checked every science fact against the NASA data.</p></div>
  </div>`), 's-info');
  bind(h);
}

export function showSettings(ctx, h) {
  const s = ctx.settings;
  const seg = (name, value, label) => `<button type="button" class="seg${String(s[name]) === String(value) ? ' on' : ''}" data-act="set" data-arg="${name}:${value}">${label}</button>`;
  open(page('SETTINGS', `
  <div class="panel i-card set-card">
    <div class="set-row"><span>Theme</span><div class="segs">${seg('theme', 'navy', 'Navy')}${seg('theme', 'midnight', 'Midnight')}${seg('theme', 'contrast', 'High contrast')}</div></div>
    <div class="set-row"><span>Graphics</span><div class="segs">${seg('quality', 'low', 'Low')}${seg('quality', 'medium', 'Medium')}${seg('quality', 'high', 'High')}</div></div>
    <div class="set-row"><label for="vol">Sound volume</label><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}"></div>
    <div class="set-row"><span>Music</span><div class="segs">${seg('music', true, 'On')}${seg('music', false, 'Off')}</div></div>
    <div class="set-row"><span>Reduce motion</span><div class="segs">${seg('reduceMotion', false, 'Off')}${seg('reduceMotion', true, 'On')}</div></div>
    <div class="set-row"><label for="sens">Camera sensitivity</label><input id="sens" type="range" min="0.4" max="2" step="0.1" value="${s.sensitivity}"></div>
    <div class="set-row"><span>Mission length</span><div class="segs">${seg('missionLength', 12, '12 days')}${seg('missionLength', 3, '3 days (demo)')}</div></div>
    <div class="set-row"><span>Teacher mode: unlock Mars</span><div class="segs">${seg('unlockAll', false, 'Off')}${seg('unlockAll', true, 'On')}</div></div>
    <p class="i-small">Graphics changes apply after the game reloads.</p>
    ${ctx.inGame ? '' : '<button type="button" class="btn-ghost small danger" data-act="reset">Reset my progress</button>'}
  </div>`), 's-info');
  $('vol').addEventListener('input', (e) => h.setValue('volume', parseFloat(e.target.value)));
  $('sens').addEventListener('input', (e) => h.setValue('sensitivity', parseFloat(e.target.value)));
  bind(h);
}

export function showPause(ctx, h) {
  open(`<div class="p-card panel">
    <h1 class="i-title">PAUSED</h1>
    <p class="i-small">Day ${ctx.day} / ${ctx.total} · ${esc(ctx.levelName)}</p>
    <button type="button" class="btn-yellow wide" data-act="resume" autofocus>RESUME</button>
    <button type="button" class="btn-ghost" data-act="how">How to play</button>
    <button type="button" class="btn-ghost" data-act="settings">Settings</button>
    <button type="button" class="btn-ghost" data-act="quit">Save &amp; quit to lobby</button>
  </div>`, 's-pause');
  bind(h);
}
