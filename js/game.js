// =====================================================================
// Survive the Sol – GAME (main controller)
// Flow (matches design/*.dc.html):
//   Name page → Lobby → each day: Cards (pick 3 of 5) → land + explore
//   → dangers (a REAL DONKI solar storm every day, plus other dangers)
//   → use a card (1/2/3) → Night report → … 12 days → Win (or Lose)
// NASA rules kept here: only 3 core bars (Power, Life Support, Radiation
// Safety); storms are real archived DONKI flares; damage is scaled by
// NASA OSDR RadLab data; every card has a real cost.
// =====================================================================
import * as THREE from 'three';
import { CONFIG, QUALITY } from './config.js';
import { loadData, pickFlare, flareStrength } from './data.js';
import { save, rankFor, nextRank, SUITS, ROVER_SKINS } from './save.js';
import { audio } from './audio.js';
import { input, setupTouch } from './input.js';
import { createTerrain } from './world/terrain.js';
import { buildProps } from './world/props.js';
import { createPlayer, makeAstronaut, pushOut } from './player.js';
import { createCameraRig } from './camera.js';
import { createLoot, LOOT_TYPES, RARITY } from './loot.js';
import { dealCards, blockShare, isRight, handTags, bestCardsFor } from './cards.js';
import { createRovers } from './rover.js';
import { createAirdrops } from './airdrops.js';
import { createHazards } from './hazards.js';
import { updateDrop } from './lander.js';
import { createEffects } from './effects.js';
import { createHud, BAR_NAMES, esc, icon } from './hud.js';
import { createRovi, createTutorial, GLOSSARY } from './rovi.js';
import * as screens from './screens.js';
import { drawNewspaper, downloadCanvas } from './newspaper.js';

const $ = (id) => document.getElementById(id);
const clamp = (v) => Math.max(0, Math.min(100, v));
save.load();
const S = save.data.settings;
const quality = QUALITY[S.quality] || QUALITY.medium;

// Timing of a day (seconds)
const T = { explore: 45, exploreTutorial: 60, warn: 5, zone: 18, zoneFrom: 70, zoneTo: 22 };
const DANGER_DAMAGE = { meteor: { life: 16 }, power_failure: { power: 20 }, dust_storm: { power: 14, life: 8 } };
const LOOT_MAP_COLOR = { ice: '#7cf5c8', oxygen: '#7cf5c8', medkit: '#7cf5c8', battery: '#e8f22a', solar: '#e8f22a', shield: '#8fb0ff', boots: '#ffffff', scanner: '#ffffff' };

// ---------------- renderer ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.pixelRatio > 1, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = quality.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------------- the whole window, at any size ----------------
// --s scales the 1280×720 screen designs; --hs scales the HUD corners.
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  lobbyCam.aspect = w / h; lobbyCam.updateProjectionMatrix();
  const mobile = w < 760;
  const s = mobile ? 1 : Math.min(2, Math.max(0.6, Math.min(w / 1280, h / 720)));
  const hs = mobile ? 0.8 : Math.min(1.7, Math.max(0.72, Math.min(w / 1280, h / 720)));
  document.documentElement.style.setProperty('--s', s);
  document.documentElement.style.setProperty('--hs', hs);
  document.body.classList.toggle('mobile', mobile);
  // phones: pull the lobby camera back so the astronaut stands below the menu panels
  if (mobile) { lobbyCam.position.set(0, 2.4, 17); lobbyCam.lookAt(0, 3.7, 0); }
  else { lobbyCam.position.set(0, 2.6, 10.5); lobbyCam.lookAt(0, 1.2, 0); }
}

// ---------------- game world scene ----------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
const hemi = new THREE.HemisphereLight('#aab8ff', '#1c1c26', 0.55);
const sun = new THREE.DirectionalLight('#fff4e0', 1.7);
sun.castShadow = quality.shadows;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 260 });
scene.add(hemi, sun, sun.target);

// ---------------- lobby scene: astronaut on a Moon platform + Earth ----------------
const lobbyScene = new THREE.Scene();
const lobbyCam = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
lobbyCam.position.set(0, 2.6, 10.5); lobbyCam.lookAt(0, 1.2, 0);
let lobbyAstro = null;
(function buildLobby() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(310, 150, 10, 300, 200, 420);
  grad.addColorStop(0, '#1d2560'); grad.addColorStop(0.6, '#0b1026'); grad.addColorStop(1, '#070a1a');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  lobbyScene.background = new THREE.CanvasTexture(c);
  lobbyScene.background.colorSpace = THREE.SRGBColorSpace;
  lobbyScene.add(new THREE.HemisphereLight('#c9d4ff', '#2a2a40', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(4, 6, 6); lobbyScene.add(key);
  const pts = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) pts.set([(Math.random() - 0.5) * 120, Math.random() * 50 + 2, -30 - Math.random() * 40], i * 3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  lobbyScene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false })));
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), new THREE.MeshStandardMaterial({ color: '#3f78e0', emissive: '#14306b', emissiveIntensity: 0.5, roughness: 0.6 }));
  earth.position.set(4.3, 3.7, -3); lobbyScene.add(earth);
  const land = new THREE.Mesh(new THREE.SphereGeometry(0.865, 14, 10, 0.3, 1.3, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: '#4fbf6a', flatShading: true }));
  land.position.copy(earth.position); lobbyScene.add(land);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 40), new THREE.MeshStandardMaterial({ color: '#8d92a8', flatShading: true, roughness: 0.9 }));
  plat.position.y = -0.15; lobbyScene.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.035, 8, 80), new THREE.MeshBasicMaterial({ color: '#e8f22a', transparent: true, opacity: 0.7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; lobbyScene.add(ring);
  for (let i = 0; i < 8; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 0), new THREE.MeshStandardMaterial({ color: '#6d7186', flatShading: true }));
    const a = Math.random() * Math.PI * 2; rock.position.set(Math.cos(a) * 3.2, 0.05, Math.sin(a) * 3.2); lobbyScene.add(rock);
  }
  lobbyAstro = makeAstronaut((SUITS.find((s) => s.id === S.suit) || SUITS[0]).color);
  lobbyAstro.scale.setScalar(1.3);
  lobbyScene.add(lobbyAstro);
})();
function animateLobby(t) {
  const u = lobbyAstro.userData;
  lobbyAstro.position.y = Math.sin(t * 1.6) * 0.04;                 // breathing bob
  lobbyAstro.rotation.y = Math.sin(t * 0.5) * 0.35;                  // looks around
  const wave = Math.max(0, Math.sin(t * 0.7)) ** 6;                  // waves now and then
  u.armR.rotation.z = -0.2 - wave * 2.2; u.armR.rotation.x = -wave * 0.3;
  u.armL.rotation.z = 0.15 + Math.sin(t * 1.6) * 0.04;
  u.legL.rotation.x = 0; u.legR.rotation.x = 0;
}

// ---------------- persistent game pieces ----------------
const world = {};
const fx = createEffects(scene, quality.particles);
const player = createPlayer(scene, world);
player.mode = 'hidden';
const rig = createCameraRig(camera, canvas);
rig.sensitivity = S.sensitivity; rig.reduceMotion = S.reduceMotion;
const hud = createHud();
const rovi = createRovi($('roviBubble'), $('roviText'));
const tutorial = createTutorial(rovi);
let data = null, marsTexture = null, marsImage = null;
let terrain = null, props = null, loot = null, rovers = null, airdrops = null, hazards = null;

// storm visuals: dashed safe-zone ring around the base + shield bubble around you
const zoneRing = new THREE.Group();
for (let i = 0; i < 40; i++) {
  const dash = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.015, 6, 1, (i / 40) * Math.PI * 2, (Math.PI * 2 / 40) * 0.55),
    new THREE.MeshBasicMaterial({ color: '#7cf5c8', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  dash.rotation.x = -Math.PI / 2;
  zoneRing.add(dash);
}
const zoneWall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 60, 1, true).translate(0, 0.5, 0),
  new THREE.MeshBasicMaterial({ color: '#7cf5c8', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
zoneRing.add(zoneWall);
zoneRing.visible = false;
scene.add(zoneRing);
const bubble = new THREE.Group();
bubble.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 28, 18), new THREE.MeshBasicMaterial({ color: '#8fb0ff', transparent: true, opacity: 0.22, depthWrite: false })));
bubble.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.75, 2), new THREE.MeshBasicMaterial({ color: '#8fb0ff', wireframe: true, transparent: true, opacity: 0.45 })));
bubble.visible = false;
scene.add(bubble);

const G = {
  phase: 'loading', paused: false, level: null, selected: 'moon', M: null, D: null, time: 0,
  inRover: null, lastHit: null, prompt: null, promptUntil: 0, infoBack: null,
};
window.game = { G, world, player, rig, save, get loot() { return loot; } };

const suitColor = () => (SUITS.find((s) => s.id === S.suit) || SUITS[0]).color;
const roverColor = () => (ROVER_SKINS.find((s) => s.id === S.roverSkin) || ROVER_SKINS[0]).color;
const displayName = () => { const n = (save.data.name || '').trim() || 'Commander'; return /^commander\b/i.test(n) ? n : 'Commander ' + n; };
const levelName = (lvl) => (lvl === 'mars' ? 'MARS BASE' : 'MOON BASE');

// ---------------- building a level ----------------
const SKY = { moon: { bg: '#05071a', fog: '#070b22', near: 70 }, mars: { bg: '#c58f66', fog: '#c98d63', near: 60 } };
function buildLevel(level) {
  if (G.level === level) return;
  if (terrain) { scene.remove(terrain.mesh); terrain.mesh.geometry.dispose(); props.dispose(); loot.dispose(); rovers.dispose(); airdrops.clear(); hazards.clear(); }
  for (const k of Object.keys(world)) delete world[k];
  terrain = createTerrain(level, quality.terrainSegments, level === 'mars' ? marsTexture : null);
  scene.add(terrain.mesh);
  Object.assign(world, terrain);
  props = buildProps(scene, terrain, quality);
  Object.assign(world, props);
  world.setShelter(0, 16);           // the base's yellow beacon beam shows the way home
  loot = createLoot(scene, world);
  rovers = createRovers(scene, world, roverColor());
  airdrops = createAirdrops(scene, world, loot, fx);
  hazards = createHazards(scene, world, fx);
  hud.setWorld(world, marsImage);
  rig.heightAt = world.heightAt;
  G.level = level;
  const sky = SKY[level];
  scene.background = new THREE.Color(sky.bg);
  scene.fog = new THREE.Fog(sky.fog, sky.near, quality.fogFar);
  hemi.color.set(level === 'mars' ? '#f2c39a' : '#aab8ff'); hemi.groundColor.set(level === 'mars' ? '#4a2416' : '#1c1c26');
  sun.color.set(level === 'mars' ? '#ffe2c0' : '#fff4e0'); sun.intensity = level === 'mars' ? 1.5 : 1.7;
  fx.setFootprintColor(level === 'mars' ? '#3a1408' : '#000000');
}
// storm look: red sky + fog (Storm design)
function setStormSky(k) {
  const sky = SKY[G.level];
  scene.background.set(sky.bg).lerp(new THREE.Color('#3b1020'), k);
  scene.fog.color.set(sky.fog).lerp(new THREE.Color('#4a1a24'), k);
}

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
  const top = r.bottom + 10;
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
function change(bar, amount, cause) {
  const M = G.M; if (!M) return;
  M.bars[bar] = clamp(M.bars[bar] + amount);
  if (amount < 0) M.lastCause[bar] = cause;
}
const emptyBar = () => ['rad', 'power', 'life'].find((k) => G.M.bars[k] <= 0) || null;

// ================= 1. NAME PAGE =================
const RANDOM_NAMES = ['Commander Ayesha', 'Commander Bilal', 'Commander Zara', 'Commander Hamza', 'Commander Noor', 'Commander Ali', 'Commander Sara', 'Commander Omar', 'Commander Fatima', 'Commander Yusuf', 'Commander Maya', 'Commander Leo'];
function goName() {
  G.phase = 'name';
  $('hud').hidden = true;
  screens.showName({ name: save.data.name, returning: !!save.data.name }, {
    random: () => screens.setNameInput(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]),
    start: (name) => {
      audio.unlock(); audio.sfx('select');
      save.data.name = (name || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]).slice(0, 20);
      save.write();
      goLobby();
    },
  });
}

// ================= 2. LOBBY =================
function goLobby(select) {
  endLoops(); hideDanger();
  G.phase = 'lobby'; G.paused = false; G.M = null; G.D = null;
  $('hud').hidden = true; hud.vignette(0);
  player.mode = 'hidden'; player.model.visible = false;
  const marsUnlocked = save.data.moonWon || S.unlockAll;
  if (select) G.selected = select;
  if (G.selected === 'mars' && !marsUnlocked) G.selected = 'moon';
  lobbyAstro.userData.stripeMat.color.set(suitColor());
  const xp = save.data.xp, rank = rankFor(xp), next = nextRank(xp);
  screens.showLobby({
    name: save.data.name, displayName: displayName(), rank: rank.label, xp, next: next ? next.xp : null,
    xpInRank: xp - rank.xp, xpRankSize: next ? next.xp - rank.xp : 1, stars: save.data.stars,
    marsUnlocked, selected: G.selected, inProgress: save.data.inProgress, total: S.missionLength,
  }, {
    select: (lvl) => { if (lvl === 'mars' && !marsUnlocked) { audio.sfx('full'); return; } audio.sfx('click'); goLobby(lvl); },
    start: () => { audio.unlock(); startMission(G.selected); },
    how: () => info('how'), about: () => info('about'), credits: () => info('credits'), settings: () => info('settings'),
  });
  audio.music(S.music);
}
function info(which, back = goLobby) {
  G.infoBack = back;
  const h = { back: () => { audio.sfx('click'); back(); } };
  if (which === 'how') screens.showHow({ total: S.missionLength }, h);
  else if (which === 'about') screens.showAbout({ data }, h);
  else if (which === 'credits') screens.showCredits({}, h);
  else showSettings(back !== goLobby);
}
function showSettings(inGame) {
  screens.showSettings({ settings: S, inGame }, {
    back: () => G.infoBack(),
    set: (arg) => {
      const [name, raw] = arg.split(':');
      const v = raw === 'true' ? true : raw === 'false' ? false : isNaN(+raw) ? raw : +raw;
      S[name] = v; save.write(); applySettings();
      if (name === 'quality' && !inGame) { location.reload(); return; }
      showSettings(inGame);
    },
    setValue: (name, v) => { S[name] = v; save.write(); applySettings(); },
    reset: () => { if (confirm('Reset all XP, stars, unlocks and settings?')) { save.reset(); location.reload(); } },
  });
}
function applySettings() {
  audio.setVolume(S.volume);
  audio.music(S.music && G.phase !== 'loading');
  rig.sensitivity = S.sensitivity; rig.reduceMotion = S.reduceMotion;
  document.body.classList.toggle('reduce-motion', !!S.reduceMotion);
  document.body.dataset.theme = S.theme || 'navy';
  updateTouch();
}
// Phone controls only on touch devices (or if forced on in the save file).
let touchReady = false;
function updateTouch() {
  let touchDevice = false;
  try { touchDevice = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0; } catch (e) { /* ignore */ }
  const on = S.touch === 'on' || (S.touch !== 'off' && touchDevice);
  $('touch').hidden = !on;
  document.body.classList.toggle('touch-on', on);
  if (on && !touchReady) { setupTouch($('joystick'), $('knob'), [...document.querySelectorAll('.tbtn')]); touchReady = true; }
}

// ================= MISSION =================
function startMission(level) {
  if (level === 'mars' && !(save.data.moonWon || S.unlockAll)) level = 'moon';
  buildLevel(level);
  const ip = save.data.inProgress && save.data.inProgress.level === level ? save.data.inProgress : null;
  G.M = {
    level, day: ip ? ip.day - 1 : 0, total: S.missionLength,
    bars: ip ? { ...ip.bars } : { ...CONFIG.bars.start },
    usedFlares: new Set(ip ? ip.usedFlares : []), usedFacts: new Set(),
    xp: ip ? ip.xp : 0, startRank: rankFor(save.data.xp).id,
    lastCause: { power: 'drain', life: 'drain', rad: 'drain' },
    cardsUsed: ip ? ip.cardsUsed : {}, storms: ip ? ip.storms : [],
    tutorial: level === 'moon' && !save.data.tutorialDone,
  };
  save.data.inProgress = null; save.write();
  player.setAccent(suitColor());
  rovers.setSkin(roverColor());
  nextDay();
}

// Plan a day: one real solar storm (always) + sometimes other dangers.
function planDay() {
  const M = G.M, day = M.day;
  const flare = pickFlare(data, M.level, day, M.usedFlares);
  const types = [];
  const extraChance = day <= 3 ? 0 : day <= 8 ? 0.4 : 0.6;
  if (M.level === 'mars' && Math.random() < 0.55) types.push('dust_storm');
  if (Math.random() < extraChance * (types.length ? 0.5 : 1)) types.push(Math.random() < 0.5 ? 'meteor' : 'power_failure');
  const tutorialDay = M.tutorial && day === 1;
  const explore = tutorialDay ? T.exploreTutorial : T.explore;
  const dangers = types.map((type, i) => ({ type, at: 14 + i * 13 + Math.random() * 5 }));
  dangers.push({ type: 'solar_storm', at: explore, flare });
  return { flare, dangers, explore, tutorialDay };
}

function nextDay() {
  const M = G.M;
  M.day++;
  endLoops(); hideDanger();
  const plan = planDay();
  G.D = {
    ...plan, day: M.day, t: 0, hand: [], used: new Set(), active: null, zoneT: 0, zoneR: 0, over: false,
    startBars: { ...M.bars }, log: [], collected: 0, points: 0, freezeT: 0, slowT: 0, bubbleT: 0, stuckT: 0, dustT: 0,
    snapshots: [], snapT: 0, earthT: 20,
  };
  G.phase = 'cards';
  $('hud').hidden = true;
  const offer = dealCards(data.cards, M.level, plan.dangers.map((d) => d.type));
  screens.showCards({
    day: M.day, total: M.total, levelName: levelName(M.level), offer, seconds: 15,
    landLabel: M.level === 'mars' ? 'LAND ON MARS' : 'LAND ON MOON',
    dangerLabel: (c) => data.dangers[c.dangerTypes[0]].label,
  }, {
    tick: (s) => audio.sfx(s),
    done: (ids) => { G.D.hand = ids.map((id) => offer.find((c) => c.id === id)); audio.sfx('select'); startLanding(); },
  });
}

// ---------------- landing: a short thruster descent near the base ----------------
function startLanding() {
  const D = G.D;
  screens.closeScreen();
  G.phase = 'land';
  $('hud').hidden = false;
  $('earthChip').hidden = G.level !== 'mars';
  loot.respawn({ loot: { bag: 0 }, lootCountMult: 0.85 });
  loot.items.forEach((it) => { it.mapColor = LOOT_MAP_COLOR[it.type]; });
  airdrops.clear(); airdrops.plan(0);
  hazards.clear(); rovers.reset(); fx.clearFootprints();
  world.greenhouse.visible = false;
  // land somewhere around the base, not on top of a parked rover
  let a = 0;
  for (let i = 0; i < 20; i++) {
    a = Math.random() * Math.PI * 2;
    if (!rovers.list.some((r) => Math.hypot(r.pos.x - Math.cos(a) * 30, r.pos.z - Math.sin(a) * 30) < 12)) break;
  }
  player.mods = {};
  player.placeAt(Math.cos(a) * 30, Math.sin(a) * 30, world.heightAt(Math.cos(a) * 30, Math.sin(a) * 30) + 32);
  player.mode = 'drop'; player.stamina = 100; player.exhausted = false;
  player.facing = Math.atan2(-player.pos.x, -player.pos.z) + Math.PI;
  rig.yaw = player.facing + Math.PI; rig.pitch = 0.35; rig.extraDistance = 4; rig.menuOrbit = false;
  rig.update(player.pos, 1, true);
  hud.hand(D.hand, D.used, null, false);
  hud.stormLook(false); setStormSky(0); zoneRing.visible = false; bubble.visible = false;
  audio.loop('thruster', true, 0.8);
  if (D.tutorialDay) tutorial.start();
  else rovi.say(`Day ${D.day}! Grab glowing supplies. A storm is coming soon.`, { force: true, seconds: 6 });
}

// ================= the game loop for a day =================
function updateDay(dt) {
  const M = G.M, D = G.D;
  // ----- landing -----
  if (G.phase === 'land') {
    if (updateDrop(player, dt, input.moveAxis(), rig, world.heightAt, fx)) {
      player.mode = 'walk'; player.onGround = true; player.vel.set(0, 0, 0);
      fx.dust(player.pos, 18, 1.5); audio.loop('thruster', false); audio.sfx('land');
      rig.extraDistance = 0; rig.shake(0.25);
      G.phase = 'explore';
    }
    return;
  }
  D.t += dt;

  // ----- moving (frozen / stuck by a card, on foot, or in a rover) -----
  D.freezeT = Math.max(0, D.freezeT - dt); D.stuckT = Math.max(0, D.stuckT - dt); D.slowT = Math.max(0, D.slowT - dt);
  player.mods = D.slowT > 0 ? { speedMult: 0.55 } : {};
  if (G.inRover) driveRover(dt);
  else if (D.freezeT <= 0 && D.stuckT <= 0) {
    player.update(dt, rig);
    if (player.events.includes('step')) fx.footprint(player.pos, player.facing);
    if (player.events.includes('land')) { fx.dust(player.pos, 10, 1.1); audio.sfx('land'); }
    if (player.events.includes('jump')) audio.sfx('jump');
  }
  collectNearby();

  // ----- slow drain: breathing + suit power -----
  const dr = CONFIG.bars.drainPerSecond;
  change('power', -(dr.power + (D.dustT > 0 ? 0.06 : 0)) * dt, 'drain');
  change('life', -dr.life * dt, 'drain');

  // ----- dangers -----
  if (!D.active) {
    const next = D.dangers.find((d) => !d.done && D.t >= d.at);
    if (next) startDanger(next);
  } else updateDanger(dt);

  // ----- storm safe zone around the base -----
  if (D.zoneT > 0) {
    D.zoneT -= dt;
    const k = 1 - D.zoneT / T.zone;
    D.zoneR = THREE.MathUtils.lerp(T.zoneFrom, T.zoneTo, Math.min(1, k * 1.3));
    zoneRing.visible = true;
    zoneRing.position.set(0, world.heightAt(0, 0) + 0.3, 0);
    zoneRing.scale.set(D.zoneR, 14, D.zoneR);
    const inside = Math.hypot(player.pos.x, player.pos.z) <= D.zoneR;
    const storm = D.dangers.find((d) => d.type === 'solar_storm');
    if (!inside && D.stuckT <= 0) {
      const share = blockShare(storm.card, 'solar_storm');
      const dps = flareStrength(storm.flare).zone * data.radiation.game_scale[M.level] * (1 - share);
      change('rad', -dps * dt, 'zone');
      storm.zoneDamage = (storm.zoneDamage || 0) + dps * dt;
      hud.vignette(0.85 + Math.sin(G.time * 6) * 0.15);
      rig.shake(0.05);
      rovi.say('Radiation! Run back into the dashed safe zone around the base!', { key: 'zone', cooldown: 8, mood: 'alert' });
    } else hud.vignette(0.55);
    hud.dangerBanner(stormBannerData(storm, `Stay inside the safe zone · storm ends in ${Math.ceil(D.zoneT)}s`));
    if (D.zoneT <= 0) { zoneRing.visible = false; hud.dangerBanner(null); hud.stormLook(false); setStormSky(0); hud.vignette(0); endDay(); return; }
  }

  // ----- shield bubble -----
  D.bubbleT = Math.max(0, D.bubbleT - dt);
  bubble.visible = D.bubbleT > 0;
  if (bubble.visible) { bubble.position.copy(player.pos).add(new THREE.Vector3(0, 1, 0)); bubble.rotation.y += dt * 0.6; bubble.children[0].material.opacity = 0.18 + Math.sin(G.time * 4) * 0.05; }

  // ----- dust storm look (Mars) -----
  if (D.dustT > 0) {
    D.dustT -= dt;
    const k = Math.min(1, D.dustT / 3, (25 - D.dustT) / 3);
    scene.fog.near = THREE.MathUtils.lerp(SKY.mars.near, 10, k); scene.fog.far = THREE.MathUtils.lerp(quality.fogFar, 75, k);
    $('dustOverlay').style.opacity = 0.55 * k;
  }

  // ----- airdrops, meteors visuals -----
  for (const ev of airdrops.update(dt, D.t, { shelter: { x: 0, z: 0 }, r: 120 })) {
    if (ev.type === 'incoming' && !D.active) { rovi.say('A supply pod is falling! Gold supplies inside!', { key: 'pod', cooldown: 30 }); audio.sfx('whoosh'); }
    if (ev.type === 'landed' && Math.hypot(ev.pod.x - player.pos.x, ev.pod.z - player.pos.z) < 40) { audio.sfx('impact'); rig.shake(0.25); }
  }
  hazards.update(dt, D.t, player);

  // ----- Mars: Earth's messages arrive ~20 minutes late -----
  if (M.level === 'mars') updateEarth(dt);

  // ----- HUD -----
  if (!D.active && D.zoneT <= 0) {
    const storm = D.dangers.find((d) => d.type === 'solar_storm');
    hud.day(`DAY ${D.day} / ${M.total}`, 'Storm in', Math.max(0, storm.at - D.t), storm.at - D.t < 10);
  }
  updatePrompt();
  tutorial.update(dt, { phase: 'explore', moved: player.moved, collected: D.collected, stormStage: D.dangers.some((d) => d.type === 'solar_storm' && (d.active || d.done)) ? 'storm' : 'calm',
    cardUsed: D.log.some((l) => l.card), inZone: D.zoneT > 0 && Math.hypot(player.pos.x, player.pos.z) <= D.zoneR });

  const empty = emptyBar();
  if (empty) lose(empty);
}

// ---------------- dangers + emergency cards ----------------
function stormBannerData(d, extra) {
  const f = d.flare;
  return { type: 'solar_storm', title: 'SOLAR STORM!', sub: `${f.class} solar flare · ${f.date.replace(/^0/, '')}${extra ? ' · ' + extra : ''}`, source: 'Source: NASA CCMC DONKI · archived NASA data' };
}
function bannerFor(d) {
  if (d.type === 'solar_storm') return stormBannerData(d);
  const L = data.dangers[d.type].label;
  const sub = { meteor: 'Tiny space rocks (micrometeoroids) are falling!', power_failure: 'A power unit is failing!', dust_storm: 'Red dust blocks the Sun and clogs the air filters!' }[d.type];
  return { type: d.type, title: L + '!', sub, source: '' };
}
function startDanger(d) {
  const D = G.D;
  d.active = true; D.active = d; d.warnT = T.warn;
  if (G.inRover) toggleRover();
  hud.dangerBanner(bannerFor(d));
  hud.useCard(T.warn);
  $('dayPillWrap') && 0;
  document.body.classList.add('danger-on');
  const tags = handTags(D.hand, D.used, d.type);
  hud.hand(D.hand, D.used, tags, true);
  audio.sfx('alarm'); rig.shake(0.3);
  if (d.type === 'solar_storm') { hud.stormLook(true); setStormSky(1); hud.vignette(0.8); G.M.storms.push(d.flare); }
  else hud.vignette(0.5);
  const bestIdx = tags.indexOf('best');
  const best = bestCardsFor(data.cards, G.M.level, d.type)[0];
  const msg = bestIdx >= 0
    ? `${d.type === 'solar_storm' ? 'Big storm!' : data.dangers[d.type].label.charAt(0) + data.dangers[d.type].label.slice(1).toLowerCase() + '!'} Press ${bestIdx + 1} for your ${D.hand[bestIdx].title}!`
    : `${data.dangers[d.type].label.toLowerCase().replace(/^./, (c) => c.toUpperCase())}! You have no ${best.title} card. Use any card for half the help!`;
  if (!tutorial.active || d.type !== 'solar_storm') rovi.say(msg, { force: true, seconds: 6, mood: 'alert' });
}
function updateDanger(dt) {
  const d = G.D.active;
  d.warnT -= dt;
  hud.useCard(d.warnT);
  if (d.warnT <= 0) resolveDanger(d, null);
}
function useCard(i) {
  const D = G.D;
  if (!D || !D.active || !D.hand[i] || D.used.has(D.hand[i].id)) return;
  resolveDanger(D.active, D.hand[i]);
}
function resolveDanger(d, card) {
  const D = G.D, M = G.M;
  d.active = false; d.done = true; D.active = null;
  hud.useCard(null);
  document.body.classList.remove('danger-on');
  // the card's cost
  if (card) {
    D.used.add(card.id);
    M.cardsUsed[card.id] = (M.cardsUsed[card.id] || 0) + 1;
    const c = card.cost;
    for (const k of ['power', 'life', 'rad']) if (c[k]) { change(k, -c[k], 'card'); hud.screenPopup(`−${c[k]} ${k === 'rad' ? 'Shield' : k === 'life' ? 'Life' : 'Power'}`, k, 40); }
    if (c.stamina) { player.stamina = 0; player.exhausted = true; }
    if (c.freeze) D.freezeT = c.freeze;
    if (c.slow) D.slowT = c.slow;
    if (c.stuck) { D.stuckT = c.stuck; if (G.inRover) toggleRover(); player.placeAt(0, 16.5); }
    audio.sfx('use');
  }
  // the damage (right card = full block, wrong = half, none = full damage)
  let dmg;
  if (d.type === 'solar_storm') dmg = { rad: flareStrength(d.flare).hit * data.radiation.game_scale[M.level] };
  else dmg = { ...DANGER_DAMAGE[d.type] };
  const share = blockShare(card, d.type);
  const right = card ? isRight(card, d.type) : false;
  let saved = 0, taken = 0;
  for (const k in dmg) {
    const s = dmg[k] * share, t = dmg[k] - s;
    saved += s; taken += t;
    change(k, -t, d.type);
    if (t >= 1) hud.screenPopup(`−${Math.round(t)} ${k === 'rad' ? 'Shield' : k === 'life' ? 'Life' : 'Power'}`, 'hit-' + k);
  }
  d.card = card; d.saved = saved; d.taken = taken; d.right = right;
  D.log.push({ type: d.type, card, right, saved, taken, flare: d.flare, bars: Object.keys(dmg) });
  G.lastHit = { type: d.type, flare: d.flare, card, right };
  // feedback + effects
  const best = bestCardsFor(data.cards, M.level, d.type)[0];
  if (!card) rovi.say(`Ouch, no card! Next time press 1, 2 or 3. ${best.title} works best for this.`, { force: true, seconds: 6, mood: 'alert' });
  else if (right) rovi.say(`Great choice! ${card.title} blocked ${Math.round(saved)} damage.`, { force: true, seconds: 5 });
  else rovi.say(`${card.title} only helped a little. For a ${data.dangers[d.type].name}, ${best.title} works best!`, { force: true, seconds: 7, mood: 'alert' });
  if (right) audio.sfx('safe'); else audio.sfx('impact');
  rig.shake(card && right ? 0.2 : 0.6);
  if (card && ['radiation_shield', 'water_wall', 'storm_shelter'].includes(card.id)) D.bubbleT = d.type === 'solar_storm' ? T.zone : 3;
  if (card && card.id === 'duck_cover') D.bubbleT = card.cost.freeze;
  if (d.type === 'meteor') hazards.shower(player.pos);
  if (d.type === 'dust_storm') D.dustT = 25;
  if (d.type === 'solar_storm') {
    D.zoneT = T.zone;
    hud.vignette(0.6);
  } else {
    setTimeout(() => { if (G.D === D && !D.active && D.zoneT <= 0) { hud.dangerBanner(null); hud.vignette(0); } }, 1800);
  }
  hud.hand(D.hand, D.used, null, false);
}
function hideDanger() { hud.dangerBanner(null); hud.useCard(null); hud.vignette(0); hud.stormLook(false); zoneRing.visible = false; bubble.visible = false; document.body.classList.remove('danger-on'); $('dustOverlay').style.opacity = 0; }

// ---------------- Mars: late Earth messages ----------------
function updateEarth(dt) {
  const D = G.D, M = G.M;
  D.snapT -= dt;
  if (D.snapT <= 0) { D.snapT = 1; D.snapshots.push({ ...M.bars }); if (D.snapshots.length > 30) D.snapshots.shift(); }
  D.earthT -= dt;
  if (D.earthT <= 0 && D.snapshots.length >= 20 && !D.active) {
    D.earthT = 30;
    const old = D.snapshots[D.snapshots.length - 20];
    rovi.say(`Earth (sent ~20 min ago): "Your Power was ${Math.round(old.power)}. Good luck!" Old news – check your own bars!`, { key: 'earth', cooldown: 25, seconds: 7 });
  }
}

// ---------------- loot: instant effect + floating "+10 Life" ----------------
function collectNearby() {
  const D = G.D;
  for (const it of loot.near(player.pos, G.inRover ? 2.8 : CONFIG.loot.pickupRadius)) {
    const T2 = LOOT_TYPES[it.type];
    loot.remove(it);
    const pos = new THREE.Vector3(it.x, it.y + 2.2, it.z);
    fx.sparkle(pos, it.rarity.color);
    audio.sfx('pickup', RARITY.indexOf(it.rarity));
    D.collected++; D.points += it.rarity.points;
    if (T2.effect) {
      let off = 0;
      for (const k in T2.effect) {
        const amt = Math.round(T2.effect[k] * it.rarity.mult);
        change(k, amt, 'loot');
        hud.popup(`+${amt} ${k === 'rad' ? 'Shield' : k === 'life' ? 'Life' : 'Power'}`, k, pos.clone().add(new THREE.Vector3(0, off, 0)), camera);
        off += 0.8;
      }
    } else if (T2.buff === 'speed') { player.speedBoost = T2.seconds * it.rarity.mult; hud.popup('Speed boots!', 'power', pos, camera); }
    else if (T2.buff === 'scanner') { D.scannerT = T2.seconds * it.rarity.mult; hud.popup('Scanner!', 'life', pos, camera); }
  }
  if (D.scannerT) D.scannerT = Math.max(0, D.scannerT - 1 / 60);
}

// ---------------- rover ----------------
function toggleRover() {
  if (G.inRover) {
    const r = G.inRover; r.driven = false; G.inRover = null;
    player.placeAt(r.pos.x + Math.cos(r.yaw) * 2.8, r.pos.z - Math.sin(r.yaw) * 2.8);
    pushOut(player.pos, world.colliders); player.pos.y = world.heightAt(player.pos.x, player.pos.z);
    player.mode = 'walk'; rig.extraDistance = 0;
    audio.loop('rover', false); audio.sfx('enter');
    return;
  }
  if (G.D.active || G.D.stuckT > 0 || G.D.freezeT > 0) return;
  const r = rovers.nearest(player.pos, 4);
  if (!r) return;
  if (G.M.bars.power < 3) { rovi.say('Not enough Power to drive!', { force: true, mood: 'alert' }); return; }
  G.inRover = r; r.driven = true; player.mode = 'rover'; rig.extraDistance = 5;
  audio.loop('rover', true, 0.6); audio.sfx('enter');
  rovi.say('Rovers are fast, but driving uses Power. Watch your Power bar!', { key: 'roverhint', cooldown: 120 });
}
function driveRover(dt) {
  const r = G.inRover;
  const res = rovers.drive(r, input.moveAxis(), dt, { canUsePower: G.M.bars.power > 0.5, speedMult: 1, powerMult: 1 });
  change('power', -res.used, 'rover');
  player.pos.copy(r.pos); player.facing = r.yaw;
  audio.roverSpeed(Math.min(1, Math.abs(r.speed) / CONFIG.rover.maxSpeed));
  if (res.bump) { rig.shake(0.45); audio.sfx('impact'); }
}

function updatePrompt() {
  let text = null;
  if (G.D.stuckT > 0) text = `Safe inside the storm shelter · ${Math.ceil(G.D.stuckT)}s`;
  else if (G.D.freezeT > 0) text = `Ducking for cover · ${Math.ceil(G.D.freezeT)}s`;
  else if (G.inRover) text = '<kbd>E</kbd> Get out of the rover · driving uses Power';
  else if (rovers.nearest(player.pos, 4) && !G.D.active) text = '<kbd>E</kbd> Drive the rover (uses Power)';
  hud.prompt(text);
}

// ================= NIGHT REPORT =================
function endDay() {
  const M = G.M, D = G.D;
  if (D.over) return;
  D.over = true;
  if (G.inRover) toggleRover();
  endLoops(); tutorial.stop(); hideDanger();
  const night = CONFIG.bars.night;
  change('power', -night.power, 'night'); change('life', -night.life, 'night');
  const empty = emptyBar();
  if (empty) { lose(empty); return; }
  if (D.tutorialDay) { save.data.tutorialDone = true; M.tutorial = false; }
  const after = { ...M.bars };
  // stars: survived · right card for every danger · all bars at 50+
  const allRight = D.log.every((l) => l.right);
  const healthy = Object.values(after).every((v) => v >= 50);
  const stars = 1 + (allRight ? 1 : 0) + (healthy ? 1 : 0);
  const why = ['Survived the day', allRight ? 'Right card for every danger' : null, healthy ? 'All bars at 50 or more' : null].filter(Boolean).join(' · ');
  const xp = 40 + stars * 20 + D.points * 5;
  M.xp += xp; save.data.xp += xp; save.data.stars += stars; save.write();
  // card panel: the storm's card
  const storm = D.log.find((l) => l.type === 'solar_storm');
  const others = D.log.filter((l) => l !== storm);
  const best = bestCardsFor(data.cards, M.level, 'solar_storm')[0];
  const card = storm.card
    ? { title: storm.card.title, good: storm.right,
        html: `Saved <span class="num">${Math.round(storm.saved)}</span> Radiation Safety from the ${esc(storm.flare.class)} storm.`,
        verdict: storm.right ? 'Right card for this danger!' : `Half effect – ${best.title} is better for storms.` }
    : { title: 'No card', good: false, html: `You took the full ${esc(storm.flare.class)} storm (−${Math.round(storm.taken)} Radiation Safety).`, verdict: 'Next time, use a shield card!' };
  card.extra = others.map((l) => l.card ? `Also: ${l.card.title} saved ${Math.round(l.saved)} from the ${data.dangers[l.type].name}.` : `Also: the ${data.dangers[l.type].name} hit with no card (−${Math.round(l.taken)}).`).join(' ');
  G.phase = 'night';
  $('hud').hidden = true;
  player.mode = 'hidden';
  audio.sfx('safe');
  const last = M.day >= M.total;
  screens.showNight({
    day: M.day, total: M.total, title: stars === 3 ? 'PERFECT DAY!' : 'YOUR CREW IS SAFE!', stars, starsWhy: why,
    before: D.startBars, after, card, fact: nextFact(), last,
  }, {
    next: () => { audio.sfx('click'); last ? win() : nextDay(); },
    saveQuit: () => {
      save.data.inProgress = { level: M.level, day: M.day + 1, bars: { ...M.bars }, usedFlares: [...M.usedFlares], xp: M.xp, cardsUsed: M.cardsUsed, storms: M.storms };
      save.write();
      goLobby(M.level);
    },
  });
}

function nextFact() {
  const M = G.M;
  const pool = data.facts.map((f) => ({ text: f.text, source: f.source, link: f.source_link }));
  const R = data.radiation, iss = R.places.iss.median_uGy_per_hour;
  const ratio = (k) => (R.places[k].median_uGy_per_hour / iss).toFixed(1);
  pool.push({ text: `NASA detectors measured radiation near the Moon (LRO spacecraft) and on the Space Station. Near the Moon it was about ${ratio('moon')} times more!`, source: 'NASA OSDR RadLab', link: R.source_link });
  pool.push({ text: `NASA's Curiosity rover measures radiation on Mars. It was about ${ratio('mars_surface')} times more than on the Space Station.`, source: 'NASA OSDR RadLab', link: R.source_link });
  let options = pool.filter((p) => !M.usedFacts.has(p.text));
  if (!options.length) { M.usedFacts.clear(); options = pool; }
  const f = options[Math.floor(Math.random() * options.length)];
  M.usedFacts.add(f.text);
  return f;
}

// ================= WIN =================
function win() {
  const M = G.M;
  M.xp += 200; save.data.xp += 200;
  if (M.level === 'moon') save.data.moonWon = true; else save.data.marsWon = true;
  save.data.missions++; save.write();
  G.phase = 'win';
  const rank = rankFor(save.data.xp);
  const used = Object.entries(M.cardsUsed).sort((a, b) => b[1] - a[1]).map(([id]) => (data.cards.find((c) => c.id === id) || {}).title).filter(Boolean);
  const big = M.storms.slice().sort((a, b) => strength(b.class) - strength(a.class))[0];
  const title = M.level === 'mars' ? 'The Mars Times' : 'The Moon Times';
  const paper = {
    title, level: M.level, edition: M.level === 'mars' ? 'MARS BASE EDITION' : 'MOON BASE EDITION', day: M.total,
    headline: `${displayName()} keeps the crew safe for ${M.total} day${M.total === 1 ? '' : 's'}!`, suitColor: suitColor(),
    story: `The young commander used ${used.length ? listWords(used.slice(0, 3).map((u) => u.toLowerCase() + 's')) : 'smart choices'} to protect the crew from real solar storms recorded by NASA.${big ? ` The biggest was a class ${big.class} flare from ${big.date.replace(/^0/, '')}.` : ''} All ${M.total} days, the power stayed on and the crew stayed healthy. Storm data: NASA CCMC DONKI (archived NASA data).`,
  };
  audio.sfx('win');
  screens.showWin({ total: M.total, rank: rank.label, rankUp: rank.id !== M.startRank, level: M.level, paperTitle: title }, {
    next: () => goLobby(M.level === 'moon' ? 'mars' : M.level),
    download: () => downloadCanvas($('paper'), save.data.name, title),
  });
  const cv = $('paper');
  const draw = () => drawNewspaper(cv, paper);
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
}
const strength = (c) => ({ X: 3, M: 2, C: 1 }[c.charAt(0)] || 0) * 100 + (parseFloat(c.slice(1)) || 0);
const listWords = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

// ================= LOSE =================
function lose(bar) {
  const M = G.M, D = G.D;
  if (G.phase === 'lose') return;
  if (G.inRover) toggleRover();
  endLoops(); tutorial.stop(); hideDanger();
  G.phase = 'lose';
  $('hud').hidden = true; player.mode = 'hidden';
  save.data.inProgress = null; save.write();
  const cause = M.lastCause[bar];
  const hit = G.lastHit;
  let happened, saveHtml, source = '';
  const names = (type) => bestCardsFor(data.cards, M.level, type).slice(0, 2).map((c) => `<b>${esc(c.title)}</b>`).join(' or ');
  if (bar === 'rad' && (cause === 'solar_storm' || cause === 'zone') && hit && hit.flare) {
    const f = hit.flare, sizeWord = f.class.charAt(0) === 'X' ? 'huge' : f.class.charAt(0) === 'M' ? 'big' : 'small';
    if (cause === 'zone') happened = `You stayed outside the safe zone during the <b>${esc(f.class)} solar storm</b>. Radiation Safety reached 0.`;
    else if (!hit.card) happened = `A ${sizeWord} <b>${esc(f.class)} solar storm</b> hit and you had no shield card. Radiation Safety reached 0.`;
    else if (!hit.right) happened = `A ${sizeWord} <b>${esc(f.class)} solar storm</b> hit and your ${esc(hit.card.title)} only helped a little. Radiation Safety reached 0.`;
    else happened = `A ${sizeWord} <b>${esc(f.class)} solar storm</b> hit even with your ${esc(hit.card.title)}. Radiation Safety reached 0.`;
    saveHtml = `Pick a ${names('solar_storm')} card, or run back to the base before the storm hits.`;
    source = 'Storm data: NASA CCMC DONKI · archived';
  } else if (['meteor', 'power_failure', 'dust_storm'].includes(cause)) {
    happened = `A <b>${esc(data.dangers[cause].name)}</b> hit${hit && hit.card ? ` and your ${esc(hit.card.title)} was not enough` : ' and you had no card for it'}. ${BAR_NAMES[bar]} reached 0.`;
    saveHtml = `Pick a ${names(cause)} card for this danger, and keep your ${BAR_NAMES[bar]} high with supplies.`;
  } else if (bar === 'power') {
    happened = cause === 'rover' ? 'Driving the rover used up all your <b>Power</b>.' : 'Your <b>Power</b> ran out: the suit and cards used more than you collected.';
    saveHtml = 'Grab glowing <b>batteries</b> and <b>solar panels</b>, drive less, and choose cards that cost less Power.';
  } else if (bar === 'life') {
    happened = 'Your <b>Life Support</b> ran out: the crew needs air, water and food every second.';
    saveHtml = 'Grab glowing <b>ice</b> and <b>oxygen tanks</b>. They refill Life Support.';
  } else {
    happened = 'Your <b>Radiation Safety</b> ran out.';
    saveHtml = `Grab <b>shield plates</b> and pick a ${names('solar_storm')} card.`;
  }
  audio.sfx('lose');
  screens.showLose({ day: D ? D.day : 1, total: M.total, happenedHtml: happened, saveHtml, source }, {
    retry: () => { audio.sfx('click'); startMission(M.level); },
    lobby: () => goLobby(M.level),
  });
}

// ================= PAUSE =================
function openPause() {
  if (!['land', 'explore'].includes(G.phase) || G.paused) return;
  G.paused = true; endLoops();
  const M = G.M;
  const show = () => screens.showPause({ day: M.day, total: M.total, levelName: levelName(M.level) }, {
    resume: () => { screens.closeScreen(); G.paused = false; clock.getDelta(); },
    how: () => info('how', show), settings: () => info('settings', show),
    quit: () => {
      save.data.inProgress = { level: M.level, day: M.day, bars: { ...G.D.startBars }, usedFlares: [...M.usedFlares], xp: M.xp, cardsUsed: M.cardsUsed, storms: M.storms };
      save.write(); goLobby(M.level);
    },
  });
  show();
}
function endLoops() { audio.loop('thruster', false); audio.loop('rover', false); }

// ================= keys + buttons =================
input.onKey((code) => {
  if (code === 'KeyM') { audio.setMuted(!audio.isMuted()); renderMute(); return; }
  if (code === 'Escape' || code === 'KeyP') {
    if (!$('tipBubble').hidden) { hideTip(); return; }
    if (G.paused) { screens.closeScreen(); G.paused = false; clock.getDelta(); return; }
    openPause(); return;
  }
  if (G.paused || G.phase !== 'explore') return;
  if (/^Digit[1-3]$/.test(code)) useCard(+code.slice(5) - 1);
  else if (code === 'KeyE') toggleRover();
});
$('hand').addEventListener('click', (e) => { const b = e.target.closest('[data-card]'); if (b && G.phase === 'explore') useCard(+b.dataset.card); });
function renderMute() {
  const m = audio.isMuted();
  $('muteBtn').innerHTML = icon(m ? 'soundOff' : 'soundOn', 20);
  $('muteBtn').setAttribute('aria-label', m ? 'Sound off – turn on' : 'Sound on – turn off');
}
$('muteBtn').addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.isMuted()); renderMute(); });
$('pauseBtn').addEventListener('click', openPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) openPause(); });
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
document.addEventListener('keydown', () => audio.unlock(), { once: true });
addEventListener('resize', resize);

// ================= frame loop =================
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05) * (G.timeScale || 1);   // timeScale: developer testing only
  G.time += dt;
  const playing = G.phase === 'land' || G.phase === 'explore';
  if (playing) {
    if (!G.paused) {
      updateDay(dt);
      if (G.M && G.D && (G.phase === 'land' || G.phase === 'explore')) {
        hud.updateBars(G.M.bars, player, G.D.zoneT > 0 || (G.D.active && G.D.active.type === 'solar_storm'));
        hud.drawMinimap(G.time, { loot: loot.items, rovers: rovers.list, player: player.pos, facing: player.facing, scanner: G.D.scannerT > 0, zoneR: G.D.zoneT > 0 ? G.D.zoneR : 0 });
      }
    }
    loot.update(G.time); props.update(G.time, player.pos); fx.update(dt);
    rig.update(player.pos, dt);
    sun.position.set(player.pos.x + 60, player.pos.y + 90, player.pos.z + 40); sun.target.position.copy(player.pos);
    renderer.render(scene, camera);
  } else if (G.phase === 'lobby' || (G.phase === 'info' && false)) {
    animateLobby(G.time);
    renderer.render(lobbyScene, lobbyCam);
  }
  input.endFrame();
}

// ================= start-up =================
async function boot() {
  resize(); applySettings(); renderMute();
  try {
    $('loadBar').style.width = '25%';
    data = await loadData();
    $('loadBar').style.width = '60%'; $('loadText').textContent = 'Loading NASA Mars Trek imagery…';
    await new Promise((resolve) => {
      new THREE.TextureLoader().load('assets/mars_trek_viking.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(0.3, 1); tex.offset.set(0.18, 0); tex.wrapS = THREE.RepeatWrapping;
        marsTexture = tex; marsImage = tex.image; resolve();
      }, undefined, () => resolve());
    });
    $('loadBar').style.width = '90%'; $('loadText').textContent = 'Building the Moon…';
    await new Promise((r) => setTimeout(r, 30));
    buildLevel('moon');
    $('loading').hidden = true;
    goName();
  } catch (err) {
    console.error(err);
    $('loadText').innerHTML = 'Could not load the game data. Please run a small web server:<br><code>python -m http.server 8000</code> then open <code>http://localhost:8000</code>';
  }
}
frame();
boot();
