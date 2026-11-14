// =====================================================================
// ROVERS – parked around the map. E to get in / out.
// Fast, but every second of driving uses POWER (a core bar) – a trade-off!
// Simple arcade driving: W/S throttle, A/D steer, follows the ground.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { pushOut } from './player.js';

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...extra });

function makeRoverModel(skin) {
  const g = new THREE.Group();
  const body = flat(skin);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 4), body);
  chassis.position.y = 1.0;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.6), flat('#c9cfdd'));
  deck.position.set(0, 1.5, -0.8);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.3), flat('#2b3a66'));
  seat.position.set(0, 1.6, 0.6);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.4), flat('#2f5bd6', { metalness: 0.4, roughness: 0.3 }));
  panel.position.set(0, 1.95, -0.9); panel.rotation.x = -0.2;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 5), flat('#9aa3b8'));
  mast.position.set(0.9, 2.1, 1.4);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.25), flat('#eef1f8'));
  head.position.set(0.9, 2.85, 1.4);
  const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), new THREE.MeshBasicMaterial({ color: '#fffbe0' }));
  lightL.position.set(-0.8, 1.05, 2.02);
  const lightR = lightL.clone(); lightR.position.x = 0.8;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.12, 4.02), flat('#e8f22a'));
  stripe.position.y = 1.1;
  g.add(chassis, deck, seat, panel, mast, head, lightL, lightR, stripe);
  const wheels = [];
  for (const sx of [-1.45, 1.45]) for (const sz of [-1.4, 0, 1.4]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10).rotateZ(Math.PI / 2), flat('#3a3f52'));
    w.position.set(sx, 0.5, sz);
    g.add(w); wheels.push(w);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { wheels, bodyMat: body };
  return g;
}

export function createRovers(scene, world, skin) {
  const R = CONFIG.rover;
  const list = [];
  const spots = world.roverSpots.slice(0, 5);
  for (const s of spots) {
    const model = makeRoverModel(skin);
    scene.add(model);
    list.push({ model, home: s, pos: new THREE.Vector3(), yaw: s.yaw, speed: 0, driven: false, pitch: 0, roll: 0 });
  }
  const sample = new THREE.Vector3();

  function settle(r, dt = 1) {
    const h = world.heightAt;
    const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw);
    const front = h(r.pos.x + fx * 1.6, r.pos.z + fz * 1.6), back = h(r.pos.x - fx * 1.6, r.pos.z - fz * 1.6);
    const left = h(r.pos.x - fz * 1.2, r.pos.z + fx * 1.2), right = h(r.pos.x + fz * 1.2, r.pos.z - fx * 1.2);
    r.pos.y = (front + back + left + right) / 4;
    const k = Math.min(1, dt * 10);
    r.pitch += (Math.atan2(back - front, 3.2) - r.pitch) * k;
    r.roll += (Math.atan2(right - left, 2.4) - r.roll) * k;
    r.model.position.copy(r.pos);
    r.model.rotation.set(r.pitch, r.yaw, r.roll, 'YXZ');
  }

  function reset() {
    for (const r of list) {
      r.pos.set(r.home.x, 0, r.home.z); r.yaw = r.home.yaw; r.speed = 0; r.driven = false;
      settle(r);
    }
  }
  reset();

  function nearest(pos, maxDist = 4) {
    let best = null, bd = maxDist;
    for (const r of list) { const d = Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z); if (d < bd) { bd = d; best = r; } }
    return best;
  }

  // Drive one rover. axis = {x, y} from input. Returns power used this frame and a bump flag.
  function drive(r, axis, dt, { canUsePower, speedMult = 1, powerMult = 1 }) {
    const max = R.maxSpeed * speedMult;
    let throttle = canUsePower ? axis.y : 0;
    if (throttle > 0) r.speed += R.accel * throttle * dt;
    else if (throttle < 0) r.speed += R.accel * 1.4 * throttle * dt;
    else r.speed *= Math.exp(-dt * 1.2);
    r.speed = THREE.MathUtils.clamp(r.speed, -max * 0.4, max);
    r.yaw -= axis.x * R.turnRate * dt * THREE.MathUtils.clamp(r.speed / 8, -1, 1);
    const before = sample.copy(r.pos);
    r.pos.x += Math.sin(r.yaw) * r.speed * dt;
    r.pos.z += Math.cos(r.yaw) * r.speed * dt;
    pushOut(r.pos, world.colliders, 2.0);
    const moved = Math.hypot(r.pos.x - before.x, r.pos.z - before.z);
    let bump = false;
    if (Math.abs(r.speed) > 6 && moved < Math.abs(r.speed) * dt * 0.5) { bump = true; r.speed *= -0.25; }
    settle(r, dt);
    r.model.userData.wheels.forEach((w) => { w.rotation.x += r.speed * dt / 0.5; });
    const used = Math.abs(throttle) > 0.05 ? R.powerPerSecond * powerMult * Math.abs(throttle) * dt : 0;
    return { used, bump, moved };
  }

  function setSkin(color) { list.forEach((r) => r.model.userData.bodyMat.color.set(color)); }
  function dispose() { list.forEach((r) => scene.remove(r.model)); }

  return { list, reset, nearest, drive, setSkin, dispose };
}
