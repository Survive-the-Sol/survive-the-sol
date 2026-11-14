// =====================================================================
// LOOT – glowing supplies on the map.
// Each type has a job (which bar it helps) and a rarity
// (common gray, rare blue, epic purple, legendary gold = bigger effect).
// Drawn with instanced meshes (one draw call per type) to stay fast.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

export const RARITY = [
  { id: 'common',    label: 'Common',    color: '#b8c0cc', mult: 1.0, weight: 58, beam: 2.5 },
  { id: 'rare',      label: 'Rare',      color: '#4f7bff', mult: 1.4, weight: 26, beam: 4 },
  { id: 'epic',      label: 'Epic',      color: '#b06bff', mult: 1.8, weight: 12, beam: 6 },
  { id: 'legendary', label: 'Legendary', color: '#ffc94a', mult: 2.5, weight: 4,  beam: 9 },
];

// effect = how much each core bar goes up. buff = a special power for some seconds.
export const LOOT_TYPES = {
  ice:     { label: 'Ice chunk',    effect: { life: 10 },          weight: 16, color: '#bfe9ff', geo: () => new THREE.IcosahedronGeometry(0.5, 0) },
  battery: { label: 'Battery',      effect: { power: 10 },         weight: 16, color: '#ffd447', geo: () => new THREE.BoxGeometry(0.45, 0.75, 0.45) },
  solar:   { label: 'Solar panel',  effect: { power: 16 },         weight: 10, color: '#3d6bff', geo: () => new THREE.BoxGeometry(1.1, 0.08, 0.75) },
  shield:  { label: 'Shield plate', effect: { rad: 14 },           weight: 16, color: '#9db4ff', geo: () => new THREE.CylinderGeometry(0.62, 0.62, 0.14, 6).rotateX(Math.PI / 2) },
  oxygen:  { label: 'Oxygen tank',  effect: { life: 16 },          weight: 12, color: '#7cf5c8', geo: () => new THREE.CapsuleGeometry(0.24, 0.55, 3, 8) },
  medkit:  { label: 'Med kit',      effect: { life: 6, rad: 6 },   weight: 8,  color: '#ff6b6b', geo: () => new THREE.BoxGeometry(0.7, 0.45, 0.45) },
  boots:   { label: 'Speed boots',  buff: 'speed', seconds: 20,    weight: 5,  color: '#ff9f43', geo: () => new THREE.BoxGeometry(0.55, 0.35, 0.8) },
  scanner: { label: 'Scanner',      buff: 'scanner', seconds: 30,  weight: 5,  color: '#7cf5c8', geo: () => new THREE.TorusGeometry(0.34, 0.1, 6, 14) },
};

function pickWeighted(list, rng, key = 'weight') {
  const total = list.reduce((s, x) => s + x[key], 0);
  let r = rng() * total;
  for (const x of list) { r -= x[key]; if (r < 0) return x; }
  return list[list.length - 1];
}

export function createLoot(scene, world) {
  const { rng, heightAt } = world;
  const typeIds = Object.keys(LOOT_TYPES);
  const items = [];

  // ----- choose where supplies go -----
  const ice = world.craters.find(c => c.ice);
  function addItem(x, z, typeId) {
    if (Math.hypot(x, z) > CONFIG.world.playRadius - 4) return;
    if (world.colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 0.8)) return;
    const rarity = pickWeighted(RARITY, rng);
    items.push({ type: typeId, rarity, x, z, y: heightAt(x, z), active: true, phase: rng() * 6.28 });
  }
  const typeList = typeIds.map(id => ({ id, weight: LOOT_TYPES[id].weight }));
  // near huts and landmarks (good loot)
  world.hutSpots.forEach(s => { for (let i = 0; i < 3; i++) addItem(s.x + (rng() - 0.5) * 4, s.z + (rng() - 0.5) * 4, pickWeighted(typeList, rng).id); });
  // ice crater: lots of ice
  for (let i = 0; i < 10; i++) { const a = rng() * 6.28, d = rng() * ice.r * 0.75; addItem(ice.x + Math.cos(a) * d, ice.z + Math.sin(a) * d, 'ice'); }
  // the rest, scattered
  while (items.length < CONFIG.loot.count) {
    const x = (rng() - 0.5) * 370, z = (rng() - 0.5) * 370;
    if (Math.hypot(x, z) < 16) continue;
    addItem(x, z, pickWeighted(typeList, rng).id);
  }

  // ----- instanced meshes -----
  const meshes = {};
  for (const id of typeIds) {
    const t = LOOT_TYPES[id];
    const list = items.filter(i => i.type === id);
    const mesh = new THREE.InstancedMesh(t.geo(),
      new THREE.MeshStandardMaterial({ color: t.color, emissive: t.color, emissiveIntensity: 0.45, flatShading: true, roughness: 0.4 }),
      Math.max(1, list.length));
    mesh.count = list.length;
    mesh.castShadow = true;
    list.forEach((it, i) => { it.mesh = mesh; it.index = i; });
    meshes[id] = mesh;
    scene.add(mesh);
  }
  // glowing beam + ground ring in the rarity colour (one mesh each for all items)
  const beamGeo = new THREE.CylinderGeometry(0.28, 0.28, 1, 8, 1, true).translate(0, 0.5, 0);
  const beams = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), items.length);
  const rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.55, 0.8, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }), items.length);
  const c = new THREE.Color();
  items.forEach((it, i) => { it.fx = i; beams.setColorAt(i, c.set(it.rarity.color)); rings.setColorAt(i, c.set(it.rarity.color)); });
  scene.add(beams, rings);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  function update(t) {
    for (const it of items) {
      if (!it.active) continue;
      const bob = Math.sin(t * 2 + it.phase) * 0.18;
      e.set(0.3, t * 1.4 + it.phase, 0); q.setFromEuler(e);
      const k = it.rarity.id === 'legendary' ? 1.25 : 1;
      m.compose(v.set(it.x, it.y + 1 + bob, it.z), q, s.set(k, k, k));
      it.mesh.setMatrixAt(it.index, m);
      e.set(0, 0, 0); q.setFromEuler(e);
      m.compose(v.set(it.x, it.y + 0.05, it.z), q, s.set(1, it.rarity.beam, 1));
      beams.setMatrixAt(it.fx, m);
      const pulse = 1 + Math.sin(t * 3 + it.phase) * 0.12;
      m.compose(v.set(it.x, it.y + 0.06, it.z), q, s.set(pulse, 1, pulse));
      rings.setMatrixAt(it.fx, m);
    }
    for (const id in meshes) meshes[id].instanceMatrix.needsUpdate = true;
    beams.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
  }

  // Returns the items the player touches this frame (and removes them).
  function collect(pos) {
    const got = [];
    const R = CONFIG.loot.pickupRadius;
    for (const it of items) {
      if (!it.active) continue;
      const dx = it.x - pos.x, dz = it.z - pos.z;
      if (dx * dx + dz * dz < R * R && Math.abs(it.y + 1 - (pos.y + 0.9)) < 2.6) {
        it.active = false;
        it.mesh.setMatrixAt(it.index, hidden);
        beams.setMatrixAt(it.fx, hidden);
        rings.setMatrixAt(it.fx, hidden);
        got.push(it);
      }
    }
    return got;
  }

  return { items, update, collect };
}
