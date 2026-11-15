// =====================================================================
// Survive the Sol: Storm Royale – MAIN
// Sets up the 3D scene, builds the Moon map, and runs the game loop.
// Step 1 build: explore, sprint, jump, collect supplies.
// =====================================================================
import * as THREE from 'three';
import { CONFIG, QUALITY } from './config.js';
import { input } from './input.js';
import { createTerrain } from './world/terrain.js';
import { buildProps } from './world/props.js';
import { createPlayer } from './player.js';
import { createCameraRig } from './camera.js';
import { createLoot, LOOT_TYPES } from './loot.js';
import { createHud } from './hud.js';
import { createEffects } from './effects.js';

const $ = (id) => document.getElementById(id);
const quality = QUALITY[CONFIG.graphics.quality];

// ---------- renderer, scene, lights ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.pixelRatio > 1 });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = quality.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05071a');
scene.fog = new THREE.Fog('#070b22', 70, quality.fogFar);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);

scene.add(new THREE.HemisphereLight('#aab8ff', '#1c1c26', 0.55));
const sun = new THREE.DirectionalLight('#fff4e0', 1.7);   // harsh sunlight – no air on the Moon
sun.position.set(60, 90, 40);
sun.castShadow = quality.shadows;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 260 });
scene.add(sun, sun.target);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- world ----------
const terrain = createTerrain(quality.terrainSegments);
scene.add(terrain.mesh);
const props = buildProps(scene, terrain, quality);
const world = { ...terrain, ...props };
const player = createPlayer(scene, world);
const rig = createCameraRig(camera, canvas, world.heightAt);
rig.yaw = 0;   // start looking north, the base behind you
const loot = createLoot(scene, world);
const hud = createHud(world);
const fx = createEffects(scene);

// ---------- mission state: the 3 core bars ----------
const state = {
  bars: { ...CONFIG.bars.start },
  buffs: { speed: 0, scanner: 0 },
  combo: 0, lastPickup: -99,
  collected: 0,
  paused: true,
  started: false,
};
const clamp = (v) => Math.max(0, Math.min(100, v));

function onPickup(it, t) {
  const type = LOOT_TYPES[it.type];
  const pos = new THREE.Vector3(it.x, it.y + 1.4, it.z);
  fx.sparkle(pos, it.rarity.color);
  state.collected++;
  // combo: pick things up quickly one after another
  state.combo = t - state.lastPickup < CONFIG.loot.comboWindow ? state.combo + 1 : 1;
  state.lastPickup = t;
  hud.combo(state.combo);
  const rarityTag = it.rarity.id === 'common' ? '' : ` <b style="color:${it.rarity.color}">${it.rarity.label}</b>`;
  if (type.effect) {
    let offset = 0;
    for (const bar in type.effect) {
      const amount = Math.round(type.effect[bar] * it.rarity.mult);
      state.bars[bar] = clamp(state.bars[bar] + amount);
      hud.popup(`+${amount} ${hud.BAR_NAMES[bar]}`, it.rarity.color, pos.clone().add(new THREE.Vector3(0, offset, 0)), camera);
      offset += 0.7;
    }
    hud.toast(`Picked up ${type.label}${rarityTag}`, 'good');
  } else if (type.buff) {
    state.buffs[type.buff] = type.seconds * it.rarity.mult;
    if (type.buff === 'speed') player.speedBoost = state.buffs.speed;
    hud.popup(type.label + '!', it.rarity.color, pos, camera);
    hud.toast(`${type.label}${rarityTag}: ${type.buff === 'speed' ? 'run faster' : 'all supplies show on the map'} for ${Math.round(state.buffs[type.buff])}s`, 'good');
  }
}

// ---------- pause ----------
function setPaused(p) {
  state.paused = p;
  $('pauseScreen').hidden = !p || !state.started;
}
input.onKey((code) => {
  if (!state.started) return;
  if (code === 'Escape' || code === 'KeyP') setPaused(!state.paused);
  if (code === 'KeyH') $('controlsCard').hidden = !$('controlsCard').hidden;
});
$('pauseBtn').addEventListener('click', () => setPaused(true));
$('resumeBtn').addEventListener('click', () => setPaused(false));
$('helpBtn').addEventListener('click', () => { $('controlsCard').hidden = !$('controlsCard').hidden; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) setPaused(true); });

// ---------- start ----------
$('playBtn').disabled = false;
$('playBtn').textContent = 'Start exploring';
$('playBtn').addEventListener('click', () => {
  $('startScreen').hidden = true;
  $('hud').hidden = false;
  state.started = true;
  setPaused(false);
  hud.toast('Welcome to the Moon! Walk into glowing supplies to collect them.', 'info', 4);
  canvas.focus();
});

// ---------- game loop ----------
const clock = new THREE.Clock();
let time = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);   // avoid huge jumps after a lag spike

  if (!state.paused) {
    time += dt;
    player.update(dt, rig);

    // dust when landing and sprinting
    if (player.events.includes('land')) fx.dust(player.pos, 12, 1.2);
    if (player.events.includes('step')) fx.dust(player.pos, 2, 0.5);

    // supplies
    for (const it of loot.collect(player.pos)) onPickup(it, time);

    // slow drain of the core bars + buffs counting down
    for (const k in state.bars) state.bars[k] = clamp(state.bars[k] - CONFIG.bars.drainPerSecond[k] * dt);
    for (const k in state.buffs) state.buffs[k] = Math.max(0, state.buffs[k] - dt);

    loot.update(time);
    props.update(time);
    fx.update(dt);
    hud.updateBars(state.bars, player);
    hud.updateBuffs(state.buffs);
    hud.updateCompass(rig);
    hud.drawMinimap(time, player, rig, loot, state.buffs.scanner > 0);
  }
  rig.update(player.pos, dt, player.crouch);

  // the sun's shadow box follows the player
  sun.position.set(player.pos.x + 60, player.pos.y + 90, player.pos.z + 40);
  sun.target.position.copy(player.pos);

  renderer.render(scene, camera);
  input.endFrame();
}
// first camera placement, then start the loop
rig.target.set(player.pos.x, player.pos.y + 1.7, player.pos.z);
rig.update(player.pos, 1, false);
frame();

window.game = { state, player, world, loot, rig };   // handy for testing in the console
