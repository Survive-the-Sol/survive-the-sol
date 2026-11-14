// =====================================================================
// EFFECTS – little puffs of moon dust when you land or sprint,
// and a sparkle burst when you pick something up.
// A small pool of particles is reused (no new objects every frame).
// =====================================================================
import * as THREE from 'three';

export function createEffects(scene) {
  const POOL = 60;
  const geo = new THREE.IcosahedronGeometry(0.18, 0);
  const parts = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#c9cdd8', transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    parts.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1, grow: 1 });
  }
  let next = 0;

  function spawn(pos, vel, color, life, size, grow) {
    const p = parts[next]; next = (next + 1) % POOL;
    p.mesh.position.copy(pos);
    p.mesh.material.color.set(color);
    p.mesh.scale.setScalar(size);
    p.mesh.visible = true;
    p.vel.copy(vel); p.life = life; p.max = life; p.grow = grow;
  }

  const tmp = new THREE.Vector3(), vtmp = new THREE.Vector3();
  return {
    dust(pos, count = 8, strength = 1, color = '#c9cdd8') {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        vtmp.set(Math.cos(a) * 2.2 * strength, 0.6 + Math.random() * 0.8, Math.sin(a) * 2.2 * strength);
        spawn(tmp.copy(pos).add(new THREE.Vector3(0, 0.15, 0)), vtmp, color, 0.9 + Math.random() * 0.5, 0.8 + Math.random() * 0.8, 2.2);
      }
    },
    sparkle(pos, color) {
      for (let i = 0; i < 12; i++) {
        vtmp.set((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5);
        spawn(pos, vtmp, color, 0.7, 0.9, 0.2);
      }
    },
    update(dt) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vel.y -= 2.5 * dt;
        p.vel.multiplyScalar(1 - dt * 1.8);
        p.mesh.position.addScaledVector(p.vel, dt);
        const k = p.life / p.max;
        p.mesh.material.opacity = Math.max(0, k * 0.7);
        p.mesh.scale.multiplyScalar(1 + (p.grow - 1) * dt * 0.8);
        if (p.life <= 0) p.mesh.visible = false;
      }
    },
  };
}
