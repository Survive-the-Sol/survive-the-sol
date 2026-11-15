// =====================================================================
// LOOT – glowing supplies. Rarity: common gray, rare blue, epic purple,
// legendary gold (bigger effect). Each type has its own instanced mesh
// (one draw call per type), with a pool of reusable slots so supplies can
// respawn every sol, fall from airdrops and be taken by bots.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

export const RARITY = [
  { id: 'common',    label: 'Common',    color: '#b8c0cc', mult: 1.0, weight: 58, beam: 2.5, points: 1 },
  { id: 'rare',      label: 'Rare',      color: '#4f7bff', mult: 1.4, weight: 26, beam: 4,   points: 2 },
  { id: 'epic',      label: 'Epic',      color: '#b06bff', mult: 1.8, weight: 12, beam: 6,   points: 3 },
  { id: 'legendary', label: 'Legendary', color: '#ffc94a', mult: 2.5, weight: 4,  beam: 9,   points: 5 },
];
export const rarityById = (id) => RARITY.find((r) => r.id === id);

// effect = how much each core bar goes up when you USE it from the backpack.
// buff   = a special power for some seconds. bag = backpack upgrade (instant).
export const LOOT_TYPES = {
  ice:     { label: 'Ice chunk',        effect: { life: 10 },        weight: 15, color: '#bfe9ff', icon: 'ice',     geo: () => new THREE.IcosahedronGeometry(0.55, 0) },
  battery: { label: 'Battery',          effect: { power: 10 },       weight: 14, color: '#ffd447', icon: 'battery', geo: () => new THREE.BoxGeometry(0.5, 0.8, 0.5) },
  solar:   { label: 'Solar panel',      effect: { power: 15 },       weight: 9,  color: '#3d6bff', icon: 'solar',   geo: () => new THREE.BoxGeometry(1.2, 0.1, 0.8) },
  shield:  { label: 'Shield plate',     effect: { rad: 14 },         weight: 15, color: '#9db4ff', icon: 'shield',  geo: () => new THREE.CylinderGeometry(0.66, 0.66, 0.16, 6).rotateX(Math.PI / 2) },
  oxygen:  { label: 'Oxygen tank',      effect: { life: 15 },        weight: 11, color: '#7cf5c8', icon: 'oxygen',  geo: () => new THREE.CapsuleGeometry(0.26, 0.6, 3, 8) },
  medkit:  { label: 'Med kit',          effect: { life: 7, rad: 7 }, weight: 8,  color: '#ff6b6b', icon: 'medkit',  geo: () => new THREE.BoxGeometry(0.75, 0.5, 0.5) },
  boots:   { label: 'Speed boots',      buff: 'speed', seconds: 20,  weight: 5,  color: '#ff9f43', icon: 'boots',   geo: () => new THREE.BoxGeometry(0.6, 0.38, 0.85) },
  scanner: { label: 'Scanner',          buff: 'scanner', seconds: 30, weight: 5, color: '#7cf5c8', icon: 'scanner', geo: () => new THREE.TorusGeometry(0.36, 0.11, 6, 14) },
  bag:     { label: 'Backpack upgrade', bag: true,                    weight: 3,  color: '#e8f22a', icon: 'bag',     geo: () => new THREE.BoxGeometry(0.7, 0.8, 0.45) },
};

export function describeItem(typeId, rarity) {
  const t = LOOT_TYPES[typeId];
  if (t.effect) return Object.entries(t.effect).map(([k, v]) => `+${Math.round(v * rarity.mult)} ${{ power: 'Power', life: 'Life Support', rad: 'Radiation Safety' }[k]}`).join(', ');
  if (t.buff === 'speed') return `Run faster for ${Math.round(t.seconds * rarity.mult)} s`;
  if (t.buff === 'scanner') return `Show all supplies on the map for ${Math.round(t.seconds * rarity.mult)} s`;
  if (t.bag) return '+2 backpack slots for this sol';
  return '';
}

function pickWeighted(list, rng) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of list) { r -= x.weight; if (r < 0) return x; }
  return list[list.length - 1];
}

const CAPACITY = 90;   // max of each type on the map at once

export function createLoot(scene, world) {
  const { heightAt } = world;
  const rng = Math.random;     // different loot every sol (replayable)
  const typeIds = Object.keys(LOOT_TYPES);
  const items = [];            // active items only
  const group = new THREE.Group(); scene.add(group);

  // ----- one instanced mesh per type, plus pools of free slots -----
  const pools = {};
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const id of typeIds) {
    const t = LOOT_TYPES[id];
    const mesh = new THREE.InstancedMesh(t.geo(),
      new THREE.MeshStandardMaterial({ color: t.color, emissive: t.color, emissiveIntensity: 0.5, flatShading: true, roughness: 0.4 }), CAPACITY);
    for (let i = 0; i < CAPACITY; i++) mesh.setMatrixAt(i, hidden);
    mesh.frustumCulled = false;
    group.add(mesh);
    pools[id] = { mesh, free: Array.from({ length: CAPACITY }, (_, i) => CAPACITY - 1 - i) };
  }
  const FX_CAP = CAPACITY * 3;
  const beams = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 8, 1, true).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), FX_CAP);
  const rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.6, 0.9, 18).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }), FX_CAP);
  const fxFree = Array.from({ length: FX_CAP }, (_, i) => FX_CAP - 1 - i);
  for (let i = 0; i < FX_CAP; i++) { beams.setMatrixAt(i, hidden); rings.setMatrixAt(i, hidden); }
  beams.frustumCulled = false; rings.frustumCulled = false;
  group.add(beams, rings);
  const col = new THREE.Color();

  function spawn(typeId, rarity, x, z, extra = {}) {
    const pool = pools[typeId];
    if (!pool.free.length || !fxFree.length) return null;
    const it = { type: typeId, rarity, x, z, y: heightAt(x, z), phase: Math.random() * 6.28, index: pool.free.pop(), fx: fxFree.pop(), ...extra };
    beams.setColorAt(it.fx, col.set(rarity.color)); rings.setColorAt(it.fx, col.set(rarity.color));
    beams.instanceColor.needsUpdate = true; rings.instanceColor.needsUpdate = true;
    items.push(it);
    return it;
  }
  function remove(it) {
    const i = items.indexOf(it);
    if (i < 0) return;
    items.splice(i, 1);
    pools[it.type].mesh.setMatrixAt(it.index, hidden);
    beams.setMatrixAt(it.fx, hidden); rings.setMatrixAt(it.fx, hidden);
    pools[it.type].free.push(it.index); fxFree.push(it.fx);
  }
  function clear() { while (items.length) remove(items[items.length - 1]); }

  const okSpot = (x, z) => Math.hypot(x, z) < CONFIG.world.playRadius - 4 && !world.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.9);

  // New supplies for a sol. mods.loot = { shield: 2 } makes shield plates twice as common.
  function respawn(mods = {}) {
    clear();
    const weights = typeIds.map((id) => ({ id, weight: LOOT_TYPES[id].weight * ((mods.loot && mods.loot[id]) || 1) }));
    const count = Math.round(CONFIG.loot.count * (mods.lootCountMult || 1));
    const rarityBoost = (r) => r;   // hook for future events
    const add = (x, z, typeId, rarity) => { if (okSpot(x, z)) spawn(typeId || pickWeighted(weights, rng).id, rarity || rarityBoost(pickWeighted(RARITY, rng)), x, z); };
    // inside huts: better loot
    world.indoorSpots.forEach((s) => add(s.x + (rng() - 0.5), s.z + (rng() - 0.5), null, rng() < 0.5 ? RARITY[1] : RARITY[2]));
    world.lootSpots.forEach((s) => { for (let i = 0; i < 2; i++) add(s.x + (rng() - 0.5) * 5, s.z + (rng() - 0.5) * 5); });
    const ice = world.craters.find((c) => c.ice);
    const iceCount = Math.round(8 * ((mods.loot && mods.loot.ice) || 1));
    for (let i = 0; i < iceCount; i++) { const a = rng() * 6.28, d = rng() * ice.r * 0.75; add(ice.x + Math.cos(a) * d, ice.z + Math.sin(a) * d, 'ice'); }
    let guard = 0;
    while (items.length < count && guard++ < count * 6) {
      const x = (rng() - 0.5) * 370, z = (rng() - 0.5) * 370;
      if (Math.hypot(x, z) < 16) continue;
      add(x, z);
    }
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const qFlat = new THREE.Quaternion();
  function update(t) {
    for (const it of items) {
      const bob = Math.sin(t * 2 + it.phase) * 0.18;
      e.set(0.3, t * 1.4 + it.phase, 0); q.setFromEuler(e);
      const k = it.rarity.id === 'legendary' ? 1.3 : it.rarity.id === 'epic' ? 1.15 : 1;
      m.compose(v.set(it.x, it.y + 1.05 + bob, it.z), q, s.set(k, k, k));
      pools[it.type].mesh.setMatrixAt(it.index, m);
      m.compose(v.set(it.x, it.y + 0.05, it.z), qFlat, s.set(1, it.rarity.beam, 1));
      beams.setMatrixAt(it.fx, m);
      const pulse = 1 + Math.sin(t * 3 + it.phase) * 0.12;
      m.compose(v.set(it.x, it.y + 0.07, it.z), qFlat, s.set(pulse, 1, pulse));
      rings.setMatrixAt(it.fx, m);
    }
    for (const id in pools) pools[id].mesh.instanceMatrix.needsUpdate = true;
    beams.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
  }

  // Items within reach of a position (the caller decides to take them).
  function near(pos, radius = CONFIG.loot.pickupRadius) {
    const out = [];
    for (const it of items) {
      const dx = it.x - pos.x, dz = it.z - pos.z;
      if (dx * dx + dz * dz < radius * radius && Math.abs(it.y + 1 - (pos.y + 0.9)) < 3) out.push(it);
    }
    return out;
  }

  function dispose() { clear(); scene.remove(group); }

  return { items, spawn, remove, respawn, update, near, clear, dispose };
}
