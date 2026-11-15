// =====================================================================
// PLAYER – the astronaut model + movement.
// WASD/arrows move (relative to the camera), Shift sprint (stamina),
// Space jump (floaty low gravity), C crouch.
// makeAstronaut + animateAstronaut are also used by the bot crews.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { input } from './input.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...extra });

export function makeAstronaut(accent = '#e8f22a') {
  const g = new THREE.Group();
  const suit = mat('#f2f4fa'), dark = mat('#9aa3b8'), stripe = mat(accent);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 4, 8), suit);
  body.position.y = 1.05;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 8), stripe);
  belt.position.y = 0.86;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), suit);
  helmet.position.y = 1.72;
  // visor: a slice of a sphere centred on the front (+z)
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, Math.PI / 2 - Math.PI / 2.4, Math.PI / 1.2, Math.PI / 2 - Math.PI / 5.2, Math.PI / 2.6),
    mat('#4a2f86', { metalness: 0.5, roughness: 0.2, emissive: '#e8a24a', emissiveIntensity: 0.22 }));
  visor.position.set(0, 1.72, 0.08);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.32), dark);
  pack.position.set(0, 1.12, -0.42);
  const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.1, 0.34), stripe);
  packStripe.position.set(0, 1.3, -0.42);
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: '#7cf5c8' }));
  light.position.set(0.18, 1.32, 0.42);
  g.add(body, belt, helmet, visor, pack, packStripe, light);
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
  g.userData = {
    legL: limb(-0.2, 0.72, 0.4, 0.14), legR: limb(0.2, 0.72, 0.4, 0.14),
    armL: limb(-0.55, 1.38, 0.38, 0.11), armR: limb(0.55, 1.38, 0.38, 0.11),
    stripeMat: stripe, phase: 0,
  };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Swing arms and legs. Returns true when a foot touches the ground (for footprints).
export function animateAstronaut(model, flatSpeed, onGround, dt) {
  const u = model.userData;
  const swing = onGround ? Math.min(1, flatSpeed / 7) : 0.25;
  const prev = u.phase;
  u.phase += dt * (4 + flatSpeed * 0.75);
  const s = Math.sin(u.phase) * 0.7 * swing;
  u.legL.rotation.x = s; u.legR.rotation.x = -s;
  u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
  const out = onGround ? 0 : 0.5;
  u.armL.rotation.z += (out - u.armL.rotation.z) * Math.min(1, dt * 8);
  u.armR.rotation.z += (-out - u.armR.rotation.z) * Math.min(1, dt * 8);
  return onGround && flatSpeed > 2 && Math.floor(prev / Math.PI) !== Math.floor(u.phase / Math.PI);
}

// Push a walker out of buildings, big rocks and the map edge.
export function pushOut(pos, colliders, radius = 0.45) {
  const r = Math.hypot(pos.x, pos.z), max = CONFIG.world.playRadius;
  if (r > max) { pos.x *= max / r; pos.z *= max / r; }
  for (const c of colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z, min = c.r + radius;
    if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
    const d = Math.hypot(dx, dz);
    if (d < min && d > 0.0001) { pos.x = c.x + dx / d * min; pos.z = c.z + dz / d * min; }
  }
}

export function createPlayer(scene, world) {
  const P = CONFIG.player;
  const model = makeAstronaut();
  scene.add(model);

  const p = {
    model,
    pos: new THREE.Vector3(0, 0, 22),
    vel: new THREE.Vector3(),
    onGround: true, crouch: false,
    stamina: P.staminaMax, exhausted: false,
    speedBoost: 0, facing: Math.PI,
    mode: 'walk',              // 'walk' | 'drop' | 'rover' | 'hidden'
    mods: {},                  // card effects (sprintMult, staminaMult, staminaRegenMult)
    moved: 0,                  // metres walked (for the tutorial)
    events: [],
  };

  p.setAccent = (color) => model.userData.stripeMat.color.set(color);
  p.placeAt = (x, z, y = null) => {
    p.pos.set(x, y === null ? world.heightAt(x, z) : y, z);
    p.vel.set(0, 0, 0);
    model.position.copy(p.pos);
  };

  p.update = function (dt, rig) {
    p.events.length = 0;
    model.visible = p.mode !== 'rover' && p.mode !== 'hidden';
    if (p.mode !== 'walk') return;
    const mods = p.mods;
    const staminaMax = P.staminaMax * (mods.staminaMult || 1);
    if (input.pressed('KeyC')) p.crouch = !p.crouch;

    const axis = input.moveAxis();
    const dir = rig.forward().multiplyScalar(axis.y).add(rig.right().multiplyScalar(axis.x));
    const moving = dir.lengthSq() > 0.001;

    const wantSprint = input.any('ShiftLeft', 'ShiftRight') && moving && !p.crouch;
    const sprinting = wantSprint && !p.exhausted && p.stamina > 0;
    if (sprinting) p.stamina = Math.max(0, p.stamina - P.staminaDrain * dt);
    else p.stamina = Math.min(staminaMax, p.stamina + P.staminaRegen * (mods.staminaRegenMult || 1) * dt);
    if (p.stamina <= 0) p.exhausted = true;
    if (p.exhausted && p.stamina >= P.staminaRecover) p.exhausted = false;
    p.sprinting = sprinting;
    p.staminaMax = staminaMax;

    let speed = p.crouch ? P.crouchSpeed : sprinting ? P.sprintSpeed * (mods.sprintMult || 1) : P.walkSpeed;
    if (p.speedBoost > 0) { speed *= 1.35; p.speedBoost -= dt; }
    speed *= (mods.speedMult || 1);   // e.g. the Power Save card: slow walking

    const control = p.onGround ? 1 : P.airControl;
    const k = 1 - Math.exp(-P.accel * control * dt);
    p.vel.x += (dir.x * speed - p.vel.x) * k;
    p.vel.z += (dir.z * speed - p.vel.z) * k;

    if (input.pressed('Space') && p.onGround) {
      p.vel.y = P.jumpSpeed * (p.crouch ? 0.8 : 1);
      p.onGround = false;
      p.events.push('jump');
    }
    p.vel.y -= P.gravity * dt;
    const before = p.pos.clone();
    p.pos.addScaledVector(p.vel, dt);
    pushOut(p.pos, world.colliders);
    p.moved += Math.hypot(p.pos.x - before.x, p.pos.z - before.z);

    const ground = world.heightAt(p.pos.x, p.pos.z);
    if (p.pos.y <= ground) {
      if (!p.onGround && p.vel.y < -3) p.events.push('land');
      p.pos.y = ground; p.vel.y = 0; p.onGround = true;
    } else if (p.pos.y - ground > 0.35) {
      p.onGround = false;
    } else if (p.vel.y <= 0) {
      p.pos.y = ground; p.vel.y = 0; p.onGround = true;
    }

    const flatSpeed = Math.hypot(p.vel.x, p.vel.z);
    if (flatSpeed > 0.4) {
      let diff = Math.atan2(p.vel.x, p.vel.z) - p.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.facing += diff * (1 - Math.exp(-dt * 12));
    }
    model.position.copy(p.pos);
    model.rotation.set(0, p.facing, 0);
    model.scale.y += ((p.crouch ? 0.74 : 1) - model.scale.y) * (1 - Math.exp(-dt * 14));
    if (animateAstronaut(model, flatSpeed, p.onGround, dt)) p.events.push('step');
  };

  return p;
}
