// =====================================================================
// Survive the Sol: Storm Royale – GAME (the main controller)
// Connects every module and runs the mission:
//   menu → briefing (pick a card) → drop (lander) → explore + REAL solar
//   storm → night report → next sol … → mission end (+ newspaper)
// Rules that matter for the NASA challenge live here:
//   • only 3 core bars (Power, Life Support, Radiation Safety)
//   • storms come from real archived DONKI flares, scaled by RadLab data
//   • every action costs something (cards, rover power, backpack slots)
// =====================================================================
import * as THREE from 'three';
import { CONFIG, QUALITY } from './config.js';
import { loadData } from './data.js';
import { save, rankFor, SUITS, ROVER_SKINS, backpackLevelFor, BACKPACK_UNLOCKS } from './save.js';
import { audio } from './audio.js';
import { input, setupTouch } from './input.js';
import { createTerrain } from './world/terrain.js';
import { buildProps } from './world/props.js';
import { createPlayer, pushOut } from './player.js';
import { createCameraRig } from './camera.js';
import { createLoot, LOOT_TYPES, RARITY, rarityById, describeItem } from './loot.js';
import { createBackpack } from './backpack.js';
import { CARD_MODS, cardBarEffects, dealCards, cardReport } from './cards.js';
import { createRovers } from './rover.js';
import { createBots, CREW } from './bots.js';
import { createStorm } from './storm.js';
import { createAirdrops } from './airdrops.js';
import { createHazards } from './hazards.js';
import { createLander, updateDrop } from './lander.js';
import { createEffects } from './effects.js';
import { createHud, BAR_NAMES } from './hud.js';
import { createRovi, createTutorial, GLOSSARY } from './rovi.js';
import * as screens from './screens.js';
import { downloadCanvas } from './newspaper.js';

const $ = (id) => document.getElementById(id);
const clamp = (v) => Math.max(0, Math.min(100, v));
save.load();
const S = save.data.settings;
const quality = QUALITY[S.quality] || QUALITY.medium;

// ---------------- renderer, scene, lights ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.pixelRatio > 1, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = quality.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
const hemi = new THREE.HemisphereLight('#aab8ff', '#1c1c26', 0.55);
const sun = new THREE.DirectionalLight('#fff4e0', 1.7);
sun.castShadow = quality.shadows;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 260 });
scene.add(hemi, sun, sun.target);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------- persistent pieces ----------------
const world = {};                         // filled by buildLevel (terrain + props)
const fx = createEffects(scene, quality.particles);
const player = createPlayer(scene, world);
player.mode = 'hidden';
const rig = createCameraRig(camera, canvas);
rig.sensitivity = S.sensitivity; rig.reduceMotion = S.reduceMotion;
const lander = createLander(scene);
const hud = createHud();
const rovi = createRovi($('roviBubble'), $('roviText'));
const tutorial = createTutorial(rovi);
const backpack = createBackpack(1);
let data = null, marsTexture = null, marsImage = null;
let terrain = null, props = null, loot = null, rovers = null, bots = null, storm = null, airdrops = null, hazards = null;

const G = {
  phase: 'loading', paused: false, level: null, mission: null, sol: null, time: 0,
  bagOpen: false, bagSel: null, inRover: null, inLander: false,
  buffs: { speed: 0, scanner: 0 }, combo: 0, lastPickup: -99, promptMsg: null, promptUntil: 0,
  lastCause: { power: 'drain', life: 'drain', rad: 'storm' },
};
window.game = { G, world, player, rig, get loot() { return loot; }, get storm() { return storm; }, get bots() { return bots; }, get rovers() { return rovers; }, backpack, save };

const suitColor = () => (SUITS.find((s) => s.id === S.suit) || SUITS[0]).color;
const roverColor = () => (ROVER_SKINS.find((s) => s.id === S.roverSkin) || ROVER_SKINS[0]).color;
const feed = (text, kind) => hud.feed(text, kind);

// ---------------- building a level (Moon or Mars) ----------------
function buildLevel(level) {
  if (G.level === level) return;
  if (terrain) {
    scene.remove(terrain.mesh); terrain.mesh.geometry.dispose();
    props.dispose(); loot.dispose(); rovers.dispose(); bots.dispose(); storm.dispose(); airdrops.clear(); hazards.clear();
  }
  for (const k of Object.keys(world)) delete world[k];
  terrain = createTerrain(level, quality.terrainSegments, level === 'mars' ? marsTexture : null);
  scene.add(terrain.mesh);
  Object.assign(world, terrain);
  props = buildProps(scene, terrain, quality);
  Object.assign(world, props);
  loot = createLoot(scene, world);
  rovers = createRovers(scene, world, roverColor());
  bots = createBots(scene, world, loot, feed);
  storm = createStorm(scene, world, data, level);
  airdrops = createAirdrops(scene, world, loot, fx);
  hazards = createHazards(scene, world, fx);
  hud.setWorld(world, marsImage);
  rig.heightAt = world.heightAt;
  G.level = level;
  const mars = level === 'mars';
  scene.background = new THREE.Color(mars ? '#c58f66' : '#05071a');
  scene.fog = new THREE.Fog(mars ? '#c98d63' : '#070b22', mars ? 60 : 70, quality.fogFar);
  hemi.color.set(mars ? '#f2c39a' : '#aab8ff'); hemi.groundColor.set(mars ? '#4a2416' : '#1c1c26');
  sun.color.set(mars ? '#ffe2c0' : '#fff4e0'); sun.intensity = mars ? 1.5 : 1.7;
  fx.setFootprintColor(mars ? '#3a1408' : '#000000');
}
function setFog(near, far) { scene.fog.near = near; scene.fog.far = far; }

// ---------------- tooltips for hard words ----------------
const TIP_TEXT = {
  power: 'Power = electricity for suits, rovers and the base. Batteries and solar panels give Power. Every action uses some!',
  life: 'Life Support = air to breathe, water to drink and food to eat. Ice and oxygen tanks help.',
  ...GLOSSARY,
};
let tipOwner = null;
function showTip(el, key) {
  const b = $('tipBubble');
  b.textContent = TIP_TEXT[key] || key;
  b.hidden = false;
  const r = el.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
  b.style.width = w + 'px';
  b.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
  let top = r.bottom + 10;
  b.style.top = top + 'px';
  if (top + b.offsetHeight > innerHeight - 8) b.style.top = Math.max(8, r.top - b.offsetHeight - 10) + 'px';
  tipOwner = el;
}
function hideTip() { $('tipBubble').hidden = true; tipOwner = null; }
document.addEventListener('click', (e) => {
  const t = e.target.closest('.tip, .word');
  if (t) { e.preventDefault(); e.stopPropagation(); if (tipOwner === t) hideTip(); else showTip(t, t.dataset.tip || t.dataset.word); return; }
  hideTip();
}, true);

// ---------------- bars ----------------
function change(bar, amount, cause, popup = false) {
  const M = G.mission; if (!M) return;
  M.bars[bar] = clamp(M.bars[bar] + amount);
  if (amount < 0) G.lastCause[bar] = cause;
  if (popup) hud.barDelta(bar, amount);
  const L = M.learn;
  L.minPower = Math.min(L.minPower, M.bars.power); L.minLife = Math.min(L.minLife, M.bars.life); L.minRad = Math.min(L.minRad, M.bars.rad);
}
function firstEmptyBar() { return ['rad', 'power', 'life'].find((k) => G.mission.bars[k] <= 0) || null; }

// ---------------- MENU ----------------
function menuCtx() { return { save: save.data, data }; }
const menuHandlers = {
  name: (v) => { save.data.name = v.trim(); save.write(); },
  start: () => startMission(save.data.moonWon && !save.data.marsWon ? 'mars' : 'moon'),
  choose: () => showChoose(),
  how: () => screens.showHow(menuCtx(), { menu: goMenu }),
  about: () => screens.showAbout(menuCtx(), { menu: goMenu }),
  credits: () => screens.showCredits(menuCtx(), { menu: goMenu }),
  settings: () => showSettings(false),
};
function goMenu() {
  endLoops();
  G.phase = 'menu'; G.paused = false; G.mission = null;
  closeBag(); tutorial.stop(); hideTip();
  $('hud').hidden = true; $('vignette').style.opacity = 0; $('dustOverlay').style.opacity = 0;
  player.mode = 'hidden'; player.model.visible = false; lander.hide();
  if (bots) bots.hideAll();
  if (!G.level) buildLevel('moon');
  rig.menuOrbit = true; rig.extraDistance = 48; rig.pitch = 0.3;
  screens.showMenu(menuCtx(), menuHandlers);
  audio.music(S.music);
}
function showChoose() {
  screens.showChoose(menuCtx(), {
    menu: goMenu,
    mission: (lvl) => { if (lvl === 'mars' && !(save.data.moonWon || S.unlockAll)) return; startMission(lvl); },
    suit: (id) => { S.suit = id; save.write(); player.setAccent(suitColor()); showChoose(); },
    rover: (id) => { S.roverSkin = id; save.write(); if (rovers) rovers.setSkin(roverColor()); showChoose(); },
  });
}
function showSettings(inGame) {
  const h = {
    menu: goMenu, pause: openPause,
    set: (arg) => {
      const [name, raw] = arg.split(':');
      const v = raw === 'true' ? true : raw === 'false' ? false : isNaN(+raw) ? raw : +raw;
      S[name] = v; save.write(); applySettings();
      if (name === 'quality' && !inGame) { location.reload(); return; }
      showSettings(inGame);
    },
    setValue: (name, v) => { S[name] = v; save.write(); applySettings(); },
    resetProgress: () => { if (confirm('Reset all XP, unlocks and settings?')) { save.reset(); location.reload(); } },
  };
  screens.showSettings({ save: save.data, inGame }, h);
}
function applySettings() {
  audio.setVolume(S.volume);
  audio.music(S.music && G.phase !== 'loading');
  rig.sensitivity = S.sensitivity;
  rig.reduceMotion = S.reduceMotion;
  document.body.classList.toggle('reduce-motion', !!S.reduceMotion);
  updateTouch();
}
let touchReady = false;
function updateTouch() {
  let coarse = false;
  try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
  const on = S.touch === 'on' || (S.touch === 'auto' && coarse);
  $('touch').hidden = !on;
  document.body.classList.toggle('touch-on', on);
  if (on && !touchReady) { setupTouch($('joystick'), $('knob'), [...document.querySelectorAll('.tbtn')]); touchReady = true; }
}

// ---------------- PAUSE ----------------
function openPause() {
  if (!['drop', 'explore'].includes(G.phase)) return;
  G.paused = true; closeBag();
  endLoops();
  screens.showPause({ sol: G.mission.sol, total: G.mission.total, levelName: G.level === 'mars' ? 'Mars' : 'Moon' }, {
    resume: resume,
    howInGame: () => screens.showHowInGame({ save: save.data }, { pause: openPause }),
    settingsInGame: () => showSettings(true),
    quit: () => { if (confirm('Quit this mission? Progress in this mission will be lost.')) goMenu(); },
  });
}
function resume() { screens.closeScreen(); G.paused = false; clock.getDelta(); }

// ---------------- MISSION ----------------
function startMission(level) {
  audio.unlock(); audio.music(S.music);
  if (level === 'mars' && !(save.data.moonWon || S.unlockAll)) level = 'moon';
  buildLevel(level);
  const tutorialMode = level === 'moon' && !save.data.tutorialDone;
  G.mission = {
    level, sol: 0, total: S.missionLength, bars: { ...CONFIG.bars.start }, xp: 0, history: [], tutorial: tutorialMode,
    usedFacts: new Set(), startXp: save.data.xp,
    learn: { roverPower: 0, powerItems: 0, lifeItems: 0, shieldUsed: 0, safeCount: 0, foodCards: 0, powerCards: 0, shieldCards: 0,
      minPower: 100, minLife: 100, minRad: 100, delayMsgs: 0, supplies: 0, bestPlace: 9, storms: [] },
  };
  G.lastCause = { power: 'drain', life: 'drain', rad: 'storm' };
  player.setAccent(suitColor());
  rovers.setSkin(roverColor());
  nextSol();
}

function nextSol() {
  const M = G.mission;
  M.sol++;
  endLoops();
  G.sol = {
    card: null, mod: {}, t: 0, startBars: { ...M.bars }, warned: false, dust: 0, bannerT: 0, beepAt: -1,
    snapshots: [], snapT: 0, earthT: 18, earthQueue: [], radAccum: 0, radWarnT: 0, ended: false, drove: false, bagOpened: false,
    tutorialSol: M.tutorial && M.sol === 1, announcedDrop: -1,
    stats: { radTaken: 0, radBlocked: 0, cardPower: 0, cardLife: 0, cardPowerCost: 0, drainSaved: 0, roverMeters: 0, collected: 0, used: 0, points: 0 },
  };
  G.buffs = { speed: 0, scanner: 0 };
  // reset the world for a fresh sol
  loot.clear(); airdrops.clear(); hazards.clear(); bots.hideAll(); rovers.reset(); fx.clearFootprints();
  G.inRover = null; G.inLander = false; player.mode = 'hidden'; player.model.visible = false; player.speedBoost = 0;
  closeBag(); $('hud').hidden = true; hud.stormBanner(null, null, false);
  setFog(G.level === 'mars' ? 60 : 70, quality.fogFar); $('dustOverlay').style.opacity = 0; $('vignette').style.opacity = 0;
  rig.menuOrbit = true; rig.extraDistance = 48; rig.pitch = 0.3;
  G.phase = 'briefing';
  G.offer = dealCards(data.cards, G.level, 3);
  screens.showBriefing({ cards: G.offer, sol: M.sol, total: M.total, level: G.level, bars: M.bars, tutorial: G.sol.tutorialSol, seconds: G.sol.tutorialSol ? 40 : 15 },
    { pick: pickCard, tick: () => audio.sfx('beep') });
}

const SHIELD_CARDS = ['shield_wall', 'water_wall', 'storm_shelter', 'dosimeter'];
const FOOD_CARDS = ['veg', 'recycle_water', 'oxygen', 'fix_air', 'ice_mining', 'moxie'];
const POWER_CARDS = ['fix_solar', 'clean_dust', 'nuclear', 'power_save'];

function pickCard(id) {
  if (G.phase !== 'briefing') return;
  audio.unlock(); audio.sfx('select');
  const M = G.mission, s = G.sol;
  const card = G.offer.find((c) => c.id === id) || G.offer[0];
  const mod = CARD_MODS[card.id] || {};
  s.card = card; s.mod = mod;
  const fxBars = cardBarEffects(card);
  for (const k in fxBars) change(k, fxBars[k], 'card');
  if (SHIELD_CARDS.includes(card.id)) M.learn.shieldCards++;
  if (FOOD_CARDS.includes(card.id)) M.learn.foodCards++;
  if (POWER_CARDS.includes(card.id)) M.learn.powerCards++;
  player.mods = mod;
  world.greenhouse.visible = !!mod.greenhouse;
  loot.respawn(mod);
  storm.begin({ mods: mod, tutorial: s.tutorialSol });
  airdrops.plan(mod.airdropExtra || 0);
  if (!s.tutorialSol) hazards.schedule(G.level, M.sol);
  backpack.reset(backpackLevelFor(save.data.xp));
  (mod.startItems || []).forEach(([type, r]) => backpack.add({ type, rarity: rarityById(r) }));
  screens.closeScreen();
  $('hud').hidden = false;
  $('commPanel').hidden = G.level !== 'mars';
  $('commMsg').textContent = 'Waiting for Earth… messages take about 20 minutes to arrive.';
  hud.cardBadge(card, mod);
  hud.flareChip(null);
  hud.quickslots(backpack);
  hud.zone({ stage: 'calm', label: 'Drop', seconds: 0 });
  for (const k in fxBars) hud.barDelta(k, fxBars[k]);
  if (firstEmptyBar()) { failMission(firstEmptyBar(), 'card'); return; }
  startDrop();
  if (s.tutorialSol) tutorial.start();
}

// ---------------- DROP ----------------
function startDrop() {
  G.phase = 'drop';
  rig.menuOrbit = false; rig.extraDistance = 16; rig.pitch = 0.35;
  lander.start(world.heightAt);
  G.inLander = true;
  player.mode = 'hidden';
  player.pos.copy(lander.model.position);
  // each bot jumps out somewhere along the flight path
  const spots = bots.bots.map(() => {
    const k = 0.15 + Math.random() * 0.7;
    const p = lander.pointAt(k);
    const spot = new THREE.Vector3(p.x + (Math.random() - 0.5) * 50, 0, p.z + (Math.random() - 0.5) * 50);
    const r = Math.hypot(spot.x, spot.z);
    if (r > 165) spot.multiplyScalar(165 / r);
    pushOut(spot, world.colliders);
    spot.k = k;
    return spot;
  });
  bots.reset(spots);
  bots.bots.forEach((b, i) => { b.dropK = spots[i].k; });
  audio.loop('thruster', true, 0.4);
  if (!G.sol.tutorialSol) rovi.say('Press [Space] to jump out of the lander! The dashed line on the map is the flight path.', { force: true, seconds: 7 });
  feed('Lander on approach. Jump when you are over a good spot!', 'info');
}

function eject() {
  G.inLander = false;
  player.mode = 'drop';
  player.pos.copy(lander.model.position); player.pos.y -= 3;
  player.vel.set(0, 0, 0);
  player.facing = Math.atan2(lander.to.x - lander.from.x, lander.to.z - lander.from.z);
  rig.extraDistance = 6;
  audio.sfx('jump');
}

function updateDropPhase(dt) {
  lander.update(dt, G.time);
  if (G.inLander) {
    player.pos.copy(lander.model.position);
    if (input.pressed('Space') || lander.progress >= 1) eject();
  } else if (player.mode === 'drop') {
    audio.loop('thruster', true, 1);
    if (updateDrop(player, dt, input.moveAxis(), rig, world.heightAt, fx)) land();
  }
  for (const b of bots.bots) if (b.state === 'waiting' && lander.progress >= b.dropK) bots.jump(b, lander.model.position);
  bots.update(dt, 0, storm);
  tutorial.update(dt, { phase: G.phase, playerMode: G.inLander ? 'lander' : player.mode, moved: 0, collected: 0, bagOpened: false, used: 0, droveRover: false, inFinal: false, stormStage: 'calm' });
}

function land() {
  player.mode = 'walk'; player.onGround = true; player.vel.set(0, 0, 0);
  G.phase = 'explore'; G.sol.t = 0;
  fx.dust(player.pos, 18, 1.5);
  audio.sfx('land'); audio.loop('thruster', false);
  rig.extraDistance = 0; rig.shake(0.3);
  // any bots still in the lander jump now
  for (const b of bots.bots) if (b.state === 'waiting') bots.jump(b, lander.model.position);
  feed('Touchdown! Collect supplies before the storm.', 'good');
  if (!G.sol.tutorialSol) rovi.say('Collect supplies! A REAL [[solar flare]] storm will come soon. Watch the timer at the top.', { force: true });
}

// ---------------- EXPLORE + STORM ----------------
function updateExplore(dt) {
  const M = G.mission, s = G.sol, mod = s.mod;
  s.t += dt;
  const info = storm.update(s.t, G.time);
  hud.zone(info);

  // ----- storm warning (real DONKI flare) -----
  if (!s.warned && s.t >= storm.schedule.warnAt) {
    s.warned = true; s.bannerT = 7;
    const f = storm.flare;
    hud.stormBanner(f, storm.power, true);
    hud.flareChip(f);
    audio.sfx('alarm'); rig.shake(0.35);
    M.learn.storms.push(f);
    feed(`Storm warning: real <b>${f.class}</b> solar flare (${f.date}) · NASA DONKI`, 'warn');
    if (!tutorial.active) rovi.say(`A real [[solar flare]] (class ${f.class}) is coming! Get inside the glowing circle and go to the yellow beam: ${storm.shelter.name}.`, { force: true, seconds: 8, mood: 'alert' });
    if (G.level === 'mars') s.earthQueue.push({ at: s.t + 20, text: `Earth (sent ~20 min ago): "We see a ${f.class} solar flare. Take shelter!" – You already had to decide on your own.` });
  }
  if (s.bannerT > 0) { s.bannerT -= dt; if (s.bannerT <= 0) hud.stormBanner(null, null, false); }
  // countdown beeps before the zone moves
  if ((info.stage === 'warning' || info.stage === 'holding') && info.seconds <= 5) {
    const sec = Math.ceil(info.seconds);
    if (sec !== s.beepAt) { s.beepAt = sec; audio.sfx(sec <= 1 ? 'bigBeep' : 'beep'); }
  }

  // ----- moving: on foot or in a rover -----
  if (G.inRover) driveRover(dt);
  else {
    player.update(dt, rig);
    if (player.events.includes('step')) { fx.footprint(player.pos, player.facing); if (player.sprinting) fx.dust(player.pos, 1, 0.4); }
    if (player.events.includes('land')) { fx.dust(player.pos, 10, 1.1); audio.sfx('land'); }
    if (player.events.includes('jump')) audio.sfx('jump');
  }

  collectNearby();
  updateBarsTick(dt);

  // ----- radiation outside the safe zone -----
  const outside = !storm.inside(player.pos) && storm.phase > 0;
  if (outside) {
    const full = storm.dps() * dt, dmg = full * (mod.stormDamageMult || 1);
    s.stats.radBlocked += full - dmg; s.stats.radTaken += dmg;
    change('rad', -dmg, 'storm');
    s.radAccum += dmg;
    if (s.radAccum >= 3) { hud.barDelta('rad', -s.radAccum); s.radAccum = 0; }
    hud.vignette(0.55 + Math.sin(G.time * 6) * 0.25);
    rig.shake(0.06);
    s.radWarnT -= dt;
    if (s.radWarnT <= 0) { s.radWarnT = 3; audio.sfx('beep'); rovi.say('Radiation! You are outside the safe zone. Get back inside the glowing circle!', { key: 'outside', cooldown: 12, mood: 'alert' }); }
  } else hud.vignette(0);

  // ----- bots, airdrops, hazards -----
  bots.update(dt, s.t, storm);
  for (const ev of airdrops.update(dt, s.t, storm)) {
    if (ev.type === 'incoming') {
      feed(`Airdrop incoming ${direction(ev.pod.x, ev.pod.z)}! Gold supplies inside.`, 'warn');
      audio.sfx('whoosh');
      rovi.say('A supply pod is falling! Great supplies inside – but is the trip worth the time?', { key: 'airdrop', cooldown: 40 });
    } else if (ev.type === 'landed') {
      feed('Airdrop landed! Look for the gold diamond on the map.', 'info');
      if (Math.hypot(ev.pod.x - player.pos.x, ev.pod.z - player.pos.z) < 40) { audio.sfx('impact'); rig.shake(0.25); }
    }
  }
  const next = airdrops.upcoming()[0];
  if (mod.airdropEarly && next !== undefined && next - s.t <= 10 && s.announcedDrop !== next) { s.announcedDrop = next; feed('Earth tip: an airdrop comes down in 10 seconds!', 'info'); }
  for (const ev of hazards.update(dt, s.t, player)) handleHazard(ev);
  if (s.dust > 0) {
    s.dust -= dt;
    const k = Math.min(1, s.dust / 3, (30 - s.dust) / 3);
    setFog(THREE.MathUtils.lerp(60, 10, k), THREE.MathUtils.lerp(quality.fogFar, 75, k));
    $('dustOverlay').style.opacity = 0.55 * k;
  }

  // ----- buffs -----
  for (const k in G.buffs) G.buffs[k] = Math.max(0, G.buffs[k] - dt);

  // ----- Mars: messages from Earth arrive ~20 minutes late -----
  if (G.level === 'mars') updateComm(dt);

  // ----- prompts + ROVI tips -----
  updatePrompt();
  roviTips(info);

  // ----- tutorial -----
  tutorial.update(dt, {
    phase: G.phase, playerMode: G.inLander ? 'lander' : player.mode, moved: player.moved, collected: s.stats.collected,
    bagOpened: s.bagOpened, used: s.stats.used, droveRover: s.drove, inFinal: storm.inFinal(player.pos), stormStage: storm.stage,
  });

  // ----- end of the mission or the sol -----
  const empty = firstEmptyBar();
  if (empty) { failMission(empty, G.lastCause[empty]); return; }
  if (s.t >= storm.schedule.endAt) endSol();
}

function updateBarsTick(dt) {
  const s = G.sol, mod = s.mod, D = CONFIG.bars.drainPerSecond;
  const pDrain = D.power * (mod.powerDrainMult || 1) + (mod.powerDrainAdd || 0) + (s.dust > 0 && !mod.dustProof ? 0.08 : 0);
  const lDrain = D.life * (mod.lifeDrainMult || 1);
  s.stats.drainSaved += ((D.power - D.power * (mod.powerDrainMult || 1)) + (D.life - lDrain)) * dt;
  s.stats.cardPowerCost += (mod.powerDrainAdd || 0) * dt;
  const pRegen = mod.powerRegen || 0;
  let lRegen = mod.lifeRegen || 0;
  if (mod.greenhouse && Math.hypot(player.pos.x - 17, player.pos.z + 12) < 35) lRegen += 0.25;   // near the greenhouse
  s.stats.cardPower += pRegen * dt; s.stats.cardLife += lRegen * dt;
  change('power', (pRegen - pDrain) * dt, s.dust > 0 ? 'dust' : 'drain');
  change('life', (lRegen - lDrain) * dt, 'drain');
}

function direction(x, z) {
  const dx = x - player.pos.x, dz = z - player.pos.z;
  const deg = ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
  const name = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
  return `${Math.round(Math.hypot(dx, dz))} m ${name}`;
}

function handleHazard(ev) {
  if (ev.type === 'meteorWarn') {
    audio.sfx('alarm');
    rovi.say('Tiny space rocks (micrometeoroids) are falling! Step out of the red rings!', { force: !tutorial.active, mood: 'alert' });
    feed('Micrometeoroid shower near you – avoid the red rings!', 'warn');
  } else if (ev.type === 'impact') {
    audio.sfx('impact');
    if (ev.near) { change('life', -5, 'meteor', true); rig.shake(0.7); feed('A micrometeoroid hit near you! Suit patched: −5 Life Support', 'bad'); }
    else if (ev.dist < 18) rig.shake(0.2);
  } else if (ev.type === 'glitch') {
    const amt = ev.bar === 'power' ? 6 : 5;
    change(ev.bar, -amt, 'glitch', true);
    feed(`Equipment glitch: ${ev.bar === 'power' ? 'a suit battery' : 'a water filter'} lost ${amt} ${BAR_NAMES[ev.bar]}.`, 'bad');
    audio.sfx('full');
  } else if (ev.type === 'dustStart') {
    G.sol.dust = 30;
    feed('Dust storm! Hard to see, and solar power is weaker.', 'warn');
    rovi.say('Dust storm! It is hard to see, and dust drains your Power. Use your map to find the way.', { force: !tutorial.active, mood: 'alert' });
  }
}

function updateComm(dt) {
  const s = G.sol, M = G.mission;
  s.snapT -= dt;
  if (s.snapT <= 0) { s.snapT = 1; s.snapshots.push({ ...M.bars }); if (s.snapshots.length > 30) s.snapshots.shift(); }
  s.earthT -= dt;
  if (s.earthT <= 0 && s.snapshots.length >= 20) {
    s.earthT = 28;
    const old = s.snapshots[s.snapshots.length - 20];
    s.earthQueue.push({ at: s.t, text: `Earth (sent ~20 min ago): "Last we saw, your Power was ${Math.round(old.power)}, Life Support ${Math.round(old.life)}, Radiation Safety ${Math.round(old.rad)}. Good luck!" – Old news! Check your own bars.` });
  }
  while (s.earthQueue.length && s.earthQueue[0].at <= s.t) {
    const m = s.earthQueue.shift();
    $('commMsg').textContent = m.text;
    feed('Message from Earth arrived (~20 min late).', 'info');
    M.learn.delayMsgs++;
  }
}

function updatePrompt() {
  let text = null;
  if (G.promptMsg && G.time < G.promptUntil) text = G.promptMsg;
  else if (G.inRover) text = '<kbd>E</kbd> Get out of the rover · driving uses Power';
  else {
    const r = rovers.nearest(player.pos, 4);
    if (r) text = '<kbd>E</kbd> Drive the rover (fast, but uses Power)';
  }
  const safe = storm.stage !== 'calm' && storm.inFinal(player.pos);
  if (safe && !text) text = 'You are in the shelter zone! <kbd>F</kbd> Fast-forward the storm';
  $('ffBtn').hidden = !safe;
  hud.prompt(text);
}

function roviTips(info) {
  if (tutorial.active) return;
  const M = G.mission;
  for (const k of ['power', 'life', 'rad']) {
    if (M.bars[k] < 25) {
      const hint = { power: 'Use a battery or solar panel, and drive less.', life: 'Use an ice chunk or an oxygen tank.', rad: 'Use a shield plate and stay inside the safe zone.' }[k];
      rovi.say(`Your ${BAR_NAMES[k]} is low! ${hint}`, { key: 'low' + k, cooldown: 30, mood: 'alert' });
    }
  }
  if (info.stage === 'holding' && info.seconds < 10 && Math.hypot(player.pos.x - storm.shelter.x, player.pos.z - storm.shelter.z) > storm.nextR) {
    rovi.say('The safe zone will shrink soon – move toward the shelter!', { key: 'shrink', cooldown: 25 });
  }
  if (G.inRover && M.bars.power < 30) rovi.say('Careful: driving is using your Power. Park the rover if Power gets low!', { key: 'roverpower', cooldown: 30 });
}

// ---------------- rover ----------------
function toggleRover() {
  if (G.inRover) {
    const r = G.inRover;
    r.driven = false; G.inRover = null;
    const side = new THREE.Vector3(Math.cos(r.yaw) * 2.8, 0, -Math.sin(r.yaw) * 2.8);
    player.placeAt(r.pos.x + side.x, r.pos.z + side.z);
    pushOut(player.pos, world.colliders);
    player.pos.y = world.heightAt(player.pos.x, player.pos.z);
    player.mode = 'walk';
    rig.extraDistance = 0;
    audio.loop('rover', false); audio.sfx('enter');
    return;
  }
  const r = rovers.nearest(player.pos, 4);
  if (!r) return;
  if (G.mission.bars.power < 3) { rovi.say('Not enough Power to drive! Find a battery first.', { force: true, mood: 'alert' }); return; }
  G.inRover = r; r.driven = true; player.mode = 'rover'; G.sol.drove = true;
  rig.extraDistance = 5;
  audio.loop('rover', true, 0.6); audio.sfx('enter');
  rovi.say('Rovers are fast, but driving uses Power. Watch your Power bar!', { key: 'roverhint', cooldown: 120 });
}
function driveRover(dt) {
  const r = G.inRover, s = G.sol, mod = s.mod;
  const res = rovers.drive(r, input.moveAxis(), dt, { canUsePower: G.mission.bars.power > 0.5, speedMult: mod.roverSpeed || 1, powerMult: mod.roverPowerMult || 1 });
  change('power', -res.used, 'rover');
  G.mission.learn.roverPower += res.used;
  s.stats.roverMeters += res.moved;
  player.pos.copy(r.pos); player.facing = r.yaw;
  audio.roverSpeed(Math.min(1, Math.abs(r.speed) / CONFIG.rover.maxSpeed));
  if (res.bump) { rig.shake(0.45); audio.sfx('impact'); }
  if (Math.abs(r.speed) > 10 && Math.random() < 0.3) fx.dust(r.pos, 1, 0.6);
}

// ---------------- loot + backpack ----------------
function collectNearby() {
  const s = G.sol;
  for (const it of loot.near(player.pos, G.inRover ? 2.8 : CONFIG.loot.pickupRadius)) {
    const T = LOOT_TYPES[it.type];
    const pos = new THREE.Vector3(it.x, it.y + 1.5, it.z);
    if (T.bag) {
      loot.remove(it); backpack.bonus += 2; backpack.resize();
      hud.popup('+2 backpack slots!', it.rarity.color, pos, camera);
      feed('Backpack upgrade: +2 slots for this sol', 'good');
      audio.sfx('pickup', 2); fx.sparkle(pos, it.rarity.color);
      hud.quickslots(backpack); if (G.bagOpen) renderBag();
      continue;
    }
    if (backpack.add({ type: it.type, rarity: it.rarity }) < 0) {
      if (G.time - (s.fullT || -9) > 3) {
        s.fullT = G.time; audio.sfx('full');
        G.promptMsg = 'Backpack full! <kbd>Tab</kbd> to use or drop something'; G.promptUntil = G.time + 2.5;
        rovi.say('Your backpack is full! Use or drop something – you can\'t carry everything.', { key: 'full', cooldown: 30 });
      }
      continue;
    }
    loot.remove(it);
    s.stats.collected++; s.stats.points += it.rarity.points; G.mission.learn.supplies++;
    G.combo = G.time - G.lastPickup < CONFIG.loot.comboWindow ? G.combo + 1 : 1;
    G.lastPickup = G.time;
    hud.combo(G.combo);
    if (G.combo >= 3) s.stats.points += 1;   // small combo bonus
    fx.sparkle(pos, it.rarity.color);
    audio.sfx('pickup', RARITY.indexOf(it.rarity));
    hud.popup(T.label, it.rarity.color, pos, camera);
    if (it.airdrop) feed(`You got an airdrop supply: ${it.rarity.label} ${T.label}!`, 'good');
    else if (it.rarity.points >= 3) feed(`You found a <b style="color:${it.rarity.color}">${it.rarity.label}</b> ${T.label}!`, 'good');
    hud.quickslots(backpack);
    if (G.bagOpen) renderBag();
  }
}

function useSlot(i) {
  if (G.phase !== 'explore' || G.paused) return;
  const it = backpack.slots[i];
  if (!it) return;
  const T = LOOT_TYPES[it.type], L = G.mission.learn;
  backpack.take(i);
  if (T.effect) {
    for (const k in T.effect) {
      const amt = Math.round(T.effect[k] * it.rarity.mult);
      change(k, amt, 'item', true);
      if (k === 'power') L.powerItems++;
      if (k === 'life') L.lifeItems++;
    }
    if (it.type === 'shield') L.shieldUsed++;
  }
  if (T.buff) {
    G.buffs[T.buff] = T.seconds * it.rarity.mult;
    if (T.buff === 'speed') player.speedBoost = G.buffs.speed;
    feed(`${T.label} on for ${Math.round(G.buffs[T.buff])} s`, 'good');
  }
  G.sol.stats.used++;
  audio.sfx('use');
  hud.quickslots(backpack);
  if (G.bagOpen) { G.bagSel = null; renderBag(); }
}

function renderBag() { hud.renderBag(backpack, G.bagSel); }
function toggleBag() {
  if (G.phase !== 'explore' || G.paused) return;
  G.bagOpen = !G.bagOpen; G.bagSel = null;
  $('bagScreen').hidden = !G.bagOpen;
  if (G.bagOpen) { G.sol.bagOpened = true; renderBag(); audio.sfx('click'); }
}
function closeBag() { G.bagOpen = false; G.bagSel = null; $('bagScreen').hidden = true; }
$('bagGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bslot]'); if (!b) return;
  const i = +b.dataset.bslot;
  if (G.bagSel === null) { if (backpack.slots[i]) G.bagSel = i; }
  else if (G.bagSel === i) G.bagSel = null;
  else { backpack.swap(G.bagSel, i); G.bagSel = null; audio.sfx('click'); hud.quickslots(backpack); }
  renderBag();
});
$('bagDetail').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bag]'); if (!b || G.bagSel === null) return;
  if (b.dataset.bag === 'use') useSlot(G.bagSel);
  else {
    const it = backpack.take(G.bagSel);
    const f = rig.forward();
    loot.spawn(it.type, it.rarity, player.pos.x + f.x * 3, player.pos.z + f.z * 3);
    audio.sfx('drop');
    G.bagSel = null; hud.quickslots(backpack); renderBag();
  }
});
$('bagClose').addEventListener('click', closeBag);
$('bagBtn').addEventListener('click', toggleBag);
$('quickslots').addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) useSlot(+b.dataset.slot); });

// ---------------- fast-forward when safe ----------------
function fastForward() {
  const s = G.sol;
  if (G.phase !== 'explore' || storm.stage === 'calm' || !storm.inFinal(player.pos)) return;
  if (G.inRover) toggleRover();
  audio.sfx('safe');
  while (s.t < storm.schedule.endAt) {
    const step = 0.5;
    s.t += step;
    storm.update(s.t, G.time);
    bots.update(step, s.t, storm);
    updateBarsTick(step);
  }
}

// ---------------- END OF SOL: night report ----------------
function endSol() {
  const M = G.mission, s = G.sol, mod = s.mod;
  if (s.ended) return;
  s.ended = true;
  if (G.inRover) toggleRover();
  endLoops(); closeBag(); tutorial.stop();
  G.phase = 'report';
  const before = { ...s.startBars };
  const safe = storm.inFinal(player.pos);
  let penalty = 0;
  if (safe) M.learn.safeCount++;
  else {
    penalty = Math.round(10 * storm.power.damage * storm.radScale * (mod.stormDamageMult || 1));
    change('rad', -penalty, 'caught');
    s.stats.radTaken += penalty;
  }
  // supplies still in the backpack are delivered to the base
  const delivered = [];
  for (const it of backpack.items()) {
    const T = LOOT_TYPES[it.type];
    if (T.effect) for (const k in T.effect) change(k, Math.round(T.effect[k] * it.rarity.mult), 'item');
    delivered.push({ color: it.rarity.color, label: `${it.rarity.label} ${T.label}`, effect: T.effect ? describeItem(it.type, it.rarity) : 'kept for science (+XP)' });
    s.stats.points += T.effect ? 0 : 1;
  }
  backpack.clearAll();
  const night = CONFIG.bars.night;
  change('power', -night.power, 'night'); change('life', -night.life, 'night');
  const after = { ...M.bars };

  // crew race
  const board = [{ name: `You (${save.data.name || 'Commander'})`, color: suitColor(), points: s.stats.points, home: safe, you: true },
    ...bots.bots.map((b) => ({ name: b.name, color: b.color, points: b.points, home: b.arrivedAt !== null }))]
    .sort((a, b) => (b.home - a.home) || (b.points - a.points));
  const place = board.findIndex((b) => b.you) + 1;
  M.learn.bestPlace = Math.min(M.learn.bestPlace, place);

  // XP
  const xpLines = [`Supplies: ${s.stats.points} points × 10 = ${s.stats.points * 10}`];
  let xp = s.stats.points * 10;
  if (safe) { xp += 100; xpLines.push('Reached the shelter: +100'); }
  const placeXp = (5 - place) * 25; if (placeXp > 0) { xp += placeXp; xpLines.push(`Crew race place #${place}: +${placeXp}`); }
  if (s.card.effects.score > 0) { xp += s.card.effects.score * 5; xpLines.push(`Science from your card: +${s.card.effects.score * 5}`); }
  if (mod.xpMult) { xp = Math.round(xp * mod.xpMult); xpLines.push(`Card bonus: ×${mod.xpMult}`); }
  const { rankUp, unlocks } = addXp(xp);
  M.xp += xp;
  if (s.tutorialSol) { save.data.tutorialDone = true; save.write(); }
  M.history.push({ sol: M.sol, card: s.card.title, flare: storm.flare, safe, place });

  const empty = firstEmptyBar();
  const f = storm.flare;
  const r = {
    sol: M.sol, total: M.total, safe, before, after, night, flare: f, stats: s.stats, card: s.card, cardLines: cardReport(s.card, s.stats),
    delivered, board, place, xp, xpLines, rankUp, unlocks, fact: nextFact(), failed: !!empty, last: M.sol >= M.total,
    summary: safe ? `You reached ${storm.shelter.name} before the ${f.class} solar storm peaked. The crew is safe for the night.`
      : `The ${f.class} storm caught you outside the shelter. The rover team brought you back, but you took ${penalty} radiation.`,
  };
  $('hud').hidden = true; hud.vignette(0);
  player.mode = 'hidden'; player.model.visible = false;
  rig.menuOrbit = true; rig.extraDistance = 48; rig.pitch = 0.3;
  audio.sfx(safe ? 'safe' : 'lose');
  screens.showReport(r, { next: () => (empty ? endMission(false, { bar: empty, cause: G.lastCause[empty] }) : r.last ? endMission(true) : nextSol()) });
}

function addXp(xp) {
  const d = save.data, oldXp = d.xp;
  const oldRank = rankFor(oldXp);
  d.xp += xp; save.write();
  const newRank = rankFor(d.xp);
  const unlocks = [];
  SUITS.forEach((s) => { if (oldXp < s.xp && d.xp >= s.xp) unlocks.push(`${s.label} suit colour`); });
  ROVER_SKINS.forEach((s) => { if (oldXp < s.xp && d.xp >= s.xp) unlocks.push(`${s.label} rover skin`); });
  BACKPACK_UNLOCKS.forEach((x, i) => { if (i > 0 && oldXp < x && d.xp >= x) unlocks.push(`Backpack level ${i + 1}`); });
  if (newRank.id !== oldRank.id) audio.sfx('levelup');
  return { rankUp: newRank.id !== oldRank.id ? newRank.label : null, unlocks };
}

function nextFact() {
  const M = G.mission;
  const pool = data.facts.map((f) => ({ text: f.text, source: f.source, link: f.source_link }));
  const R = data.radiation, iss = R.places.iss.median_uGy_per_hour;
  const ratio = (k) => (R.places[k].median_uGy_per_hour / iss).toFixed(1);
  pool.push({ text: `NASA detectors measured radiation near the Moon (LRO spacecraft) and on the Space Station. Near the Moon it was about ${ratio('moon')} times more!`, source: 'NASA OSDR RadLab', link: R.source_link });
  pool.push({ text: `NASA's Curiosity rover measures radiation on Mars. It was about ${ratio('mars_surface')} times more than on the Space Station.`, source: 'NASA OSDR RadLab', link: R.source_link });
  pool.push({ text: `Far out in deep space, NASA's BioSentinel measured about ${ratio('deep_space')} times more radiation than the Space Station.`, source: 'NASA OSDR RadLab', link: R.source_link });
  let options = pool.filter((p) => !M.usedFacts.has(p.text));
  if (!options.length) { M.usedFacts.clear(); options = pool; }
  const f = options[Math.floor(Math.random() * options.length)];
  M.usedFacts.add(f.text);
  return f;
}

// ---------------- MISSION FAILED / COMPLETE ----------------
function failMission(bar, cause) {
  if (G.phase === 'end') return;
  if (G.inRover) toggleRover();
  endLoops(); closeBag(); tutorial.stop();
  G.phase = 'end';
  endMission(false, { bar, cause });
}

function reasonFor(fail) {
  const f = storm && storm.flare;
  const { bar, cause } = fail;
  if (bar === 'rad') {
    if (cause === 'caught' && f) return `You were caught outside the shelter when the real ${f.class} solar storm of ${f.date} peaked.`;
    if (f) return `Your Radiation Safety ran out outside the safe zone during a real ${f.class} solar flare (${f.date}).`;
    return 'Your Radiation Safety ran out.';
  }
  if (bar === 'power') {
    if (cause === 'rover') return 'Your Power ran out – driving the rover used a lot of it.';
    if (cause === 'card') return 'Your Power ran out because the plan card cost more Power than you had left.';
    return 'Your Power ran out: the suits and the base used more than you collected.';
  }
  if (cause === 'meteor') return 'Your Life Support ran out after a micrometeoroid hit your suit.';
  if (cause === 'card') return 'Your Life Support ran out because the plan card cost more than you had left.';
  return 'Your Life Support ran out: the crew needs air, water and food every second.';
}
const TIPS = {
  power: 'Tip: pick up batteries and solar panels, drive less, or choose a Power card like "Fix the solar panels".',
  life: 'Tip: collect ice and oxygen tanks, and try cards like "Grow vegetables" or "Recycle water".',
  rad: 'Tip: watch the storm timer and head to the shelter early. Shield plates and shield cards help!',
};
function flareStrength(c) { const o = { X: 3, M: 2, C: 1 }; return (o[c.charAt(0)] || 0) * 100 + (parseFloat(c.slice(1)) || 0); }
const sci = (id) => (data.cards.find((c) => c.id === id) || {}).science || '';

function endMission(won, fail = null) {
  const M = G.mission, L = M.learn;
  G.phase = 'end';
  endLoops(); $('hud').hidden = true;
  player.mode = 'hidden'; player.model.visible = false;
  rig.menuOrbit = true; rig.extraDistance = 48; rig.pitch = 0.3;
  const solsDone = won ? M.total : M.sol;
  const solsSurvived = won ? M.total : M.sol - 1;
  let marsUnlocked = false;
  if (won) {
    const bonus = 300; M.xp += bonus; addXp(bonus);
    if (M.level === 'moon') { marsUnlocked = !save.data.moonWon; save.data.moonWon = true; } else save.data.marsWon = true;
  }
  save.data.missions++; save.write();
  const levelName = M.level === 'mars' ? 'Mars' : 'Moon';
  const reason = won ? `You kept the crew safe for all ${M.total} sols on the ${levelName}!` : reasonFor(fail);
  const mars = M.level === 'mars';
  const learning = [
    { icon: 'power', title: 'Power budget', good: L.minPower > 25,
      text: `Lowest Power: ${Math.round(L.minPower)}. You used ${Math.round(L.roverPower)} Power driving rovers and picked ${L.powerCards} Power card(s). ${L.minPower > 25 ? 'Great energy planning!' : 'Every action costs Power – collect batteries before you drive far.'}` },
    { icon: 'rad', title: 'Radiation shielding', good: L.safeCount >= Math.max(1, solsDone - 1) * 0.75,
      text: `You reached the shelter in ${L.safeCount} of ${L.storms.length} real solar storms and used ${L.shieldUsed} shield plate(s). You picked ${L.shieldCards} shielding card(s).` },
    { icon: 'life', title: 'Life support & food', good: L.minLife > 25,
      text: `Lowest Life Support: ${Math.round(L.minLife)}. You chose ${L.foodCards} food/water/air card(s) and used ${L.lifeItems} life-support supplies.` },
    mars
      ? { icon: 'radio', title: 'Communication delay', good: true, text: `Earth's messages arrived about 20 minutes late ${L.delayMsgs} time(s), so you made your own decisions – just like a real Mars crew.` }
      : { icon: 'radio', title: 'Communication delay', good: false, text: 'On the Moon, radio signals take only about 1.3 seconds. On Mars a message takes 3 to 22 minutes one way – win the Moon and try Mars to practise deciding alone!' },
  ];
  const src = (card) => `Real science from the plan card "${(data.cards.find((c) => c.id === card) || {}).title}" (data/cards.json)`;
  const debrief = [
    { good: L.safeCount === L.storms.length && L.storms.length > 0, text: (L.safeCount === L.storms.length ? 'You reached shelter in every storm. ' : 'Get to shelter early when a flare is coming. ') + sci('storm_shelter'), source: src('storm_shelter') },
    { good: L.shieldUsed >= 2, text: (L.shieldUsed >= 2 ? 'You used shield plates. ' : 'Use more shielding. ') + sci('shield_wall'), source: src('shield_wall') },
    { good: L.minLife > 30, text: sci('recycle_water') + ' ' + sci('veg'), source: src('recycle_water') },
    { good: L.minPower > 30, text: sci('fix_solar') + ' ' + sci('nuclear'), source: src('nuclear') },
    mars ? { good: true, text: sci('send_video'), source: src('send_video') } : { good: true, text: sci('call_earth'), source: src('call_earth') },
  ];
  const big = L.storms.slice().sort((a, b) => flareStrength(b.class) - flareStrength(a.class))[0] || null;
  const name = (save.data.name || 'Commander').toUpperCase();
  const fact = nextFact();
  const r = {
    level: M.level, levelName, solsDone, total: M.total, won, reason, tip: won ? null : TIPS[fail.bar],
    rank: rankFor(save.data.xp).label, totalXp: save.data.xp, missionXp: M.xp, marsUnlocked, learning, debrief,
    paper: {
      level: M.level, levelName, solsDone, total: M.total, name: save.data.name || 'Commander', rank: rankFor(save.data.xp).label,
      headline: won ? `COMMANDER ${name} KEEPS ${levelName.toUpperCase()} CREW SAFE FOR ${M.total} SOLS!` : `${name}'S ${levelName.toUpperCase()} CREW HOLDS ON FOR ${solsSurvived} SOLS`,
      stats: [[`${solsSurvived}/${M.total}`, 'Sols survived'], [String(L.supplies), 'Supplies collected'], [String(L.storms.length), 'Real storms faced'], [L.bestPlace < 9 ? `#${L.bestPlace}` : '–', 'Best crew place']],
      story: reason, biggestFlare: big, fact, suitColor: suitColor(), roverColor: roverColor(),
    },
  };
  audio.sfx(won ? 'win' : 'lose');
  screens.showEnd(r, {
    mission: (lvl) => startMission(lvl),
    menu: goMenu,
    download: () => downloadCanvas($('paper'), save.data.name),
  });
}

function endLoops() { audio.loop('thruster', false); audio.loop('rover', false); }

// ---------------- keys ----------------
input.onKey((code) => {
  if (G.phase === 'briefing' && /^Digit[1-3]$/.test(code)) { const c = G.offer[+code.slice(5) - 1]; if (c) pickCard(c.id); return; }
  if (code === 'KeyM') { audio.setMuted(!audio.isMuted()); renderMute(); return; }
  if (code === 'Escape' || code === 'KeyP') {
    if (!$('tipBubble').hidden) { hideTip(); return; }
    if (G.bagOpen) { closeBag(); return; }
    if (G.paused && ['drop', 'explore'].includes(G.phase)) { resume(); return; }
    openPause(); return;
  }
  if (G.paused || G.phase !== 'explore') return;
  if (code === 'Tab' || code === 'KeyI') toggleBag();
  else if (code === 'KeyE') toggleRover();
  else if (code === 'KeyF') fastForward();
  else if (/^Digit[1-4]$/.test(code)) useSlot(+code.slice(5) - 1);
});
function renderMute() {
  const m = audio.isMuted();
  $('muteBtn').innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m
    ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="m22 9-6 6M16 9l6 6"/>'
    : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>'}</svg>`;
  $('muteBtn').setAttribute('aria-label', m ? 'Unmute sound (M)' : 'Mute sound (M)');
}
$('muteBtn').addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.isMuted()); renderMute(); });
$('pauseBtn').addEventListener('click', openPause);
document.addEventListener('visibilitychange', () => { if (document.hidden && ['drop', 'explore'].includes(G.phase) && !G.paused) openPause(); });
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
document.addEventListener('keydown', () => audio.unlock(), { once: true });

// ---------------- game loop ----------------
const clock = new THREE.Clock();
let lbT = 0;
const ORIGIN = new THREE.Vector3(0, 0, 0);
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (G.phase === 'loading') { renderer.render(scene, camera); return; }
  G.time += dt;
  const playing = G.phase === 'drop' || G.phase === 'explore';
  if (playing && !G.paused) {
    if (G.phase === 'drop') updateDropPhase(dt);
    else updateExplore(dt);
    if (G.phase === 'drop' || G.phase === 'explore') {
      lbT -= dt;
      if (lbT <= 0) {
        lbT = 0.4;
        const rows = [{ name: 'You', color: suitColor(), points: G.sol.stats.points, home: storm.stage !== 'calm' && storm.inFinal(player.pos), you: true },
          ...bots.bots.map((b) => ({ name: b.short, color: b.color, points: b.points, home: b.arrivedAt !== null }))]
          .sort((a, b) => (b.home - a.home) || (b.points - a.points));
        hud.leaderboard(rows);
        hud.buffs(G.buffs);
      }
      hud.updateBars(G.mission.bars, player);
      hud.compass(rig);
      hud.drawMinimap(G.time, {
        storm, showZoneEarly: !!G.sol.mod.showNextZone, flightPath: G.phase === 'drop' ? lander.path : null,
        landerPos: G.inLander ? lander.model.position : null, loot: loot.items, scanner: G.buffs.scanner > 0,
        pods: airdrops.pods, rovers: rovers.list, bots: bots.bots, player: player.pos, forward: rig.forward(), facing: player.facing,
      });
    }
  }
  if (loot) loot.update(G.time);
  if (props) props.update(G.time, player.pos);
  fx.update(dt);
  // camera focus
  let focus = ORIGIN;
  if (playing) focus = G.inLander ? lander.model.position : player.pos;
  rig.update(focus, dt);
  sun.position.set(focus.x + 60, focus.y + 90, focus.z + 40);
  sun.target.position.copy(focus);
  renderer.render(scene, camera);
  input.endFrame();
}

// ---------------- start-up ----------------
async function boot() {
  applySettings();
  renderMute();
  try {
    $('loadText').textContent = 'Loading archived NASA data…'; $('loadBar').style.width = '20%';
    data = await loadData();
    $('loadBar').style.width = '55%'; $('loadText').textContent = 'Loading NASA Mars Trek imagery…';
    await new Promise((resolve) => {
      new THREE.TextureLoader().load('assets/mars_trek_viking.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(0.3, 1); tex.offset.set(0.18, 0);   // a square-ish crop of the global mosaic
        tex.wrapS = THREE.RepeatWrapping;
        marsTexture = tex; marsImage = tex.image; resolve();
      }, undefined, () => resolve());
    });
    $('loadBar').style.width = '85%'; $('loadText').textContent = 'Building the Moon…';
    await new Promise((r) => setTimeout(r, 30));
    buildLevel('moon');
    $('loadBar').style.width = '100%';
    $('loading').hidden = true;
    goMenu();
  } catch (err) {
    console.error(err);
    $('loadText').innerHTML = 'Could not load the game data. If you opened the file directly, please run a small web server instead:<br><code>python -m http.server 8000</code> then open <code>http://localhost:8000</code>';
  }
}
frame();
boot();
