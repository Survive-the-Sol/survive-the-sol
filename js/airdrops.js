// =====================================================================
// AIRDROPS – supply pods fall from orbit inside the safe zone, slowed by
// a rocket flame, leaving a smoke trail. When they land they open and
// leave epic / legendary supplies. First come, first served!
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { RARITY } from './loot.js';

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.5, ...extra });

export function createAirdrops(scene, world, loot, fx) {
  const pods = [];
  let schedule = [];

  function makePod() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.3, 2.2, 8), flat('#eef1f8', { metalness: 0.3 }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.35, 8), flat('#ffc94a', { emissive: '#ffc94a', emissiveIntensity: 0.6 }));
    band.position.y = -0.4;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1, 0.9, 8), flat('#c9cfdd'));
    cap.position.y = 1.55;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 8), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85 }));
    flame.position.y = -2.3; flame.rotation.x = Math.PI;
    g.add(body, band, cap, flame);
    g.userData.flame = flame;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  // Plan this sol's drops. times = seconds after landing.
  function plan(extra = 0) {
    clear();
    schedule = CONFIG.airdrops.times.slice();
    for (let i = 0; i < extra; i++) schedule.push(55 + i * 20);
    schedule.sort((a, b) => a - b);
  }

  function clear() {
    pods.forEach((p) => scene.remove(p.model));
    pods.length = 0;
    schedule = [];
  }

  // Pick a landing spot inside the current safe zone.
  function spot(storm) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * Math.min(storm.r * 0.7, 140);
      const x = storm.shelter.x + Math.cos(a) * d, z = storm.shelter.z + Math.sin(a) * d;
      if (Math.hypot(x, z) > CONFIG.world.playRadius - 10) continue;
      if (world.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 3)) continue;
      return { x, z };
    }
    return { x: storm.shelter.x + 20, z: storm.shelter.z };
  }

  // returns events: [{type:'incoming'|'landed', pod}]
  function update(dt, t, storm) {
    const events = [];
    while (schedule.length && t >= schedule[0]) {
      schedule.shift();
      const s = spot(storm);
      const model = makePod();
      const y0 = world.heightAt(s.x, s.z) + 170;
      model.position.set(s.x, y0, s.z);
      scene.add(model);
      const pod = { model, x: s.x, z: s.z, landed: false, smokeT: 0 };
      pods.push(pod);
      events.push({ type: 'incoming', pod });
    }
    for (const p of pods) {
      if (p.landed) continue;
      const ground = world.heightAt(p.x, p.z) + 1.1;
      p.model.position.y = Math.max(ground, p.model.position.y - 34 * dt);
      p.model.rotation.y += dt;
      p.smokeT -= dt;
      if (p.smokeT <= 0) { p.smokeT = 0.06; fx.smoke(p.model.position.clone().add(new THREE.Vector3(0, 1.5, 0))); fx.flame(p.model.position.clone().add(new THREE.Vector3(0, -2, 0))); }
      p.model.userData.flame.scale.y = 0.8 + Math.random() * 0.4;
      if (p.model.position.y <= ground) {
        p.landed = true;
        p.model.userData.flame.visible = false;
        fx.dust(p.model.position, 20, 2);
        // open: 3 great supplies around the pod
        const types = ['shield', 'oxygen', 'solar', 'medkit', 'battery', 'ice', 'bag', 'boots'];
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const rarity = Math.random() < 0.5 ? RARITY[3] : RARITY[2];
          loot.spawn(types[Math.floor(Math.random() * types.length)], rarity, p.x + Math.cos(a) * 2.6, p.z + Math.sin(a) * 2.6, { airdrop: true });
        }
        events.push({ type: 'landed', pod: p });
      }
    }
    return events;
  }

  return { pods, plan, clear, update, upcoming: () => schedule };
}
