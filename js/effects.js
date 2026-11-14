// =====================================================================
// EFFECTS – dust puffs, pickup sparkles, smoke trails and footprints.
// Pools of reusable objects: nothing new is created every frame.
// =====================================================================
import * as THREE from 'three';

export function createEffects(scene, amount = 1) {
  const POOL = Math.round(140 * amount);
  const geo = new THREE.IcosahedronGeometry(0.18, 0);
  const parts = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#c9cdd8', transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.frustumCulled = false;
    scene.add(m);
    parts.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1, grow: 1, gravity: 2.5 });
  }
  let next = 0;
  function spawn(pos, vel, color, life, size, grow, gravity = 2.5) {
    if (!POOL) return;
    const p = parts[next]; next = (next + 1) % POOL;
    p.mesh.position.copy(pos);
    p.mesh.material.color.set(color);
    p.mesh.scale.setScalar(size);
    p.mesh.visible = true;
    p.vel.copy(vel); p.life = life; p.max = life; p.grow = grow; p.gravity = gravity;
  }

  // ----- footprints: flat dark ovals that stay in the dust and slowly fade -----
  const FP = 220;
  const prints = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 8).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }), FP);
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < FP; i++) prints.setMatrixAt(i, hide);
  prints.frustumCulled = false;
  scene.add(prints);
  let fpNext = 0, fpSide = 1;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1.8);

  const v = new THREE.Vector3(), tmp = new THREE.Vector3();
  return {
    dust(pos, count = 8, strength = 1, color = '#c9cdd8') {
      for (let i = 0; i < count * amount; i++) {
        const a = Math.random() * Math.PI * 2;
        v.set(Math.cos(a) * 2.2 * strength, 0.6 + Math.random() * 0.8, Math.sin(a) * 2.2 * strength);
        spawn(tmp.copy(pos).setY(pos.y + 0.15), v, color, 0.9 + Math.random() * 0.5, 0.8 + Math.random() * 0.8, 2.2);
      }
    },
    sparkle(pos, color) {
      for (let i = 0; i < 12 * amount; i++) {
        v.set((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5);
        spawn(pos, v, color, 0.7, 0.9, 0.2);
      }
    },
    smoke(pos, color = '#9aa3b8') {
      v.set((Math.random() - 0.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.6);
      spawn(pos, v, color, 2.2, 1.2 + Math.random() * 0.6, 3, -0.2);
    },
    flame(pos) {
      v.set((Math.random() - 0.5) * 0.8, -6, (Math.random() - 0.5) * 0.8);
      spawn(pos, v, Math.random() < 0.5 ? '#ffc94a' : '#ff6b3d', 0.3, 0.9, 0.5, 0);
    },
    footprint(pos, facing) {
      fpSide = -fpSide;
      e.set(0, facing, 0); q.setFromEuler(e);
      tmp.set(Math.cos(facing) * 0.18 * fpSide, 0.04, -Math.sin(facing) * 0.18 * fpSide).add(pos);
      m4.compose(tmp, q, sc);
      prints.setMatrixAt(fpNext, m4);
      fpNext = (fpNext + 1) % FP;
      prints.instanceMatrix.needsUpdate = true;
    },
    clearFootprints() { for (let i = 0; i < FP; i++) prints.setMatrixAt(i, hide); prints.instanceMatrix.needsUpdate = true; },
    setFootprintColor(c) { prints.material.color.set(c); },
    update(dt) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vel.y -= p.gravity * dt;
        p.vel.multiplyScalar(1 - dt * 1.8);
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.material.opacity = Math.max(0, (p.life / p.max) * 0.7);
        p.mesh.scale.multiplyScalar(1 + (p.grow - 1) * dt * 0.8);
        if (p.life <= 0) p.mesh.visible = false;
      }
    },
  };
}
