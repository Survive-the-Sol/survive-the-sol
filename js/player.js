// =====================================================================
// PLAYER – the astronaut: a low-poly model + movement.
// WASD/arrows move (relative to the camera), Shift sprint (stamina),
// Space jump (floaty low gravity), C crouch.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { input } from './input.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...extra });

// Build an astronaut out of simple shapes. accent = suit stripe colour.
export function makeAstronaut(accent = '#e8f22a') {
  const g = new THREE.Group();
  const suit = mat('#f2f4fa'), dark = mat('#9aa3b8'), stripe = mat(accent);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 4, 8), suit);
  body.position.y = 1.05;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 8), stripe);
  belt.position.y = 0.86;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), suit);
  helmet.position.y = 1.72;
  // a slice of a sphere centred on the front (+z): phi centre = PI/2, theta centre = PI/2
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, Math.PI / 2 - Math.PI / 2.4, Math.PI / 1.2, Math.PI / 2 - Math.PI / 5.2, Math.PI / 2.6),
    mat('#1a2550', { metalness: 0.9, roughness: 0.15, emissive: '#c9a227', emissiveIntensity: 0.12 }));
  visor.position.set(0, 1.72, 0.08);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.32), dark);
  pack.position.set(0, 1.12, -0.42);
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: '#7cf5c8' }));
  light.position.set(0.18, 1.32, 0.42);
  g.add(body, belt, helmet, visor, pack, light);

  // limbs hang from a pivot so they can swing
  function limb(x, y, len, radius) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 3, 6), suit);
    m.position.y = -len / 2 - radius;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.08, 6), stripe);
    cuff.position.y = -len * 0.7 - radius;
    pivot.add(m, cuff);
    g.add(pivot);
    return pivot;
  }
  g.userData.legL = limb(-0.2, 0.72, 0.4, 0.14);
  g.userData.legR = limb(0.2, 0.72, 0.4, 0.14);
  g.userData.armL = limb(-0.55, 1.38, 0.38, 0.11);
  g.userData.armR = limb(0.55, 1.38, 0.38, 0.11);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createPlayer(scene, world) {
  const P = CONFIG.player;
  const model = makeAstronaut();
  scene.add(model);

  const p = {
    model,
    pos: new THREE.Vector3(0, 0, 22),
    vel: new THREE.Vector3(),
    onGround: true,
    crouch: false,
    stamina: P.staminaMax,
    exhausted: false,
    speedBoost: 0,          // seconds left of speed boots
    facing: Math.PI,
    walkPhase: 0,
    events: [],             // 'land', 'jump', 'step' – used for dust and sounds
  };
  p.pos.y = world.heightAt(p.pos.x, p.pos.z);

  p.update = function (dt, rig) {
    p.events.length = 0;
    if (input.pressed('KeyC')) p.crouch = !p.crouch;

    // ----- wanted direction from keys + camera -----
    const axis = input.moveAxis();
    const dir = rig.forward().multiplyScalar(axis.y).add(rig.right().multiplyScalar(axis.x));
    const moving = dir.lengthSq() > 0.001;

    // ----- stamina + sprint -----
    const wantSprint = input.any('ShiftLeft', 'ShiftRight') && moving && !p.crouch;
    const sprinting = wantSprint && !p.exhausted && p.stamina > 0;
    if (sprinting) p.stamina = Math.max(0, p.stamina - P.staminaDrain * dt);
    else p.stamina = Math.min(P.staminaMax, p.stamina + P.staminaRegen * dt);
    if (p.stamina <= 0) p.exhausted = true;
    if (p.exhausted && p.stamina >= P.staminaRecover) p.exhausted = false;
    p.sprinting = sprinting;

    let speed = p.crouch ? P.crouchSpeed : sprinting ? P.sprintSpeed : P.walkSpeed;
    if (p.speedBoost > 0) { speed *= 1.35; p.speedBoost -= dt; }

    // ----- horizontal movement (smooth) -----
    const control = p.onGround ? 1 : P.airControl;
    const k = 1 - Math.exp(-P.accel * control * dt);
    p.vel.x += (dir.x * speed - p.vel.x) * k;
    p.vel.z += (dir.z * speed - p.vel.z) * k;

    // ----- jump + low gravity -----
    if (input.pressed('Space') && p.onGround) {
      p.vel.y = P.jumpSpeed * (p.crouch ? 0.8 : 1);
      p.onGround = false;
      p.events.push('jump');
    }
    p.vel.y -= P.gravity * dt;

    p.pos.addScaledVector(p.vel, dt);

    // ----- stay inside the map + push out of buildings/big rocks -----
    const r = Math.hypot(p.pos.x, p.pos.z);
    if (r > CONFIG.world.playRadius) { p.pos.x *= CONFIG.world.playRadius / r; p.pos.z *= CONFIG.world.playRadius / r; }
    for (const c of world.colliders) {
      const dx = p.pos.x - c.x, dz = p.pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + 0.45;
      if (d < min && d > 0.0001) { p.pos.x = c.x + dx / d * min; p.pos.z = c.z + dz / d * min; }
    }

    // ----- ground -----
    const ground = world.heightAt(p.pos.x, p.pos.z);
    if (p.pos.y <= ground) {
      if (!p.onGround && p.vel.y < -3) p.events.push('land');
      p.pos.y = ground; p.vel.y = 0; p.onGround = true;
    } else if (p.pos.y - ground > 0.35) {
      p.onGround = false;
    } else if (p.vel.y <= 0) {
      p.pos.y = ground; p.vel.y = 0; p.onGround = true;   // walking downhill: stick to the ground
    }

    // ----- model: face movement, swing arms and legs -----
    const flatSpeed = Math.hypot(p.vel.x, p.vel.z);
    if (flatSpeed > 0.4) {
      const target = Math.atan2(p.vel.x, p.vel.z);
      let diff = target - p.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.facing += diff * (1 - Math.exp(-dt * 12));
    }
    model.position.copy(p.pos);
    model.rotation.y = p.facing;
    const squash = p.crouch ? 0.74 : 1;
    model.scale.y += (squash - model.scale.y) * (1 - Math.exp(-dt * 14));

    const swing = p.onGround ? Math.min(1, flatSpeed / 7) : 0.25;
    const prevPhase = p.walkPhase;
    p.walkPhase += dt * (4 + flatSpeed * 0.75);
    const s = Math.sin(p.walkPhase) * 0.7 * swing;
    const u = model.userData;
    u.legL.rotation.x = s; u.legR.rotation.x = -s;
    u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
    if (!p.onGround) { u.armL.rotation.z = 0.5; u.armR.rotation.z = -0.5; }   // arms out while floating
    else { u.armL.rotation.z *= 0.8; u.armR.rotation.z *= 0.8; }
    if (p.onGround && flatSpeed > 6 && Math.floor(prevPhase / Math.PI) !== Math.floor(p.walkPhase / Math.PI)) p.events.push('step');
  };

  return p;
}
