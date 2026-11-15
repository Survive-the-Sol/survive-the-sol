// =====================================================================
// LANDER DROP – each sol starts in a lander flying across the map.
// Press Space (or Jump) to jump out, then steer down with thrusters
// (WASD / joystick) and land wherever you like. The flight path is drawn
// on the minimap. If you wait too long you are dropped automatically.
// =====================================================================
import * as THREE from 'three';

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.5, ...extra });

export function createLander(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 7, 8).rotateX(Math.PI / 2), flat('#eef1f8', { metalness: 0.3 }));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 8).rotateX(Math.PI / 2), flat('#c9cfdd'));
  nose.position.z = 5;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 2.6), flat('#2b3a66'));
  wing.position.z = -1;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.32, 0.5), flat('#e8f22a'));
  stripe.position.set(0, 0.05, -0.2);
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.2), new THREE.MeshBasicMaterial({ color: '#7cf5c8' }));
  window_.position.set(0, 1.4, 4.2); window_.rotation.x = -0.5;
  g.add(body, nose, wing, stripe, window_);
  const flames = [];
  for (const x of [-1.2, 1.2]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85 }));
    f.position.set(x, 0, -5.2);
    g.add(f); flames.push(f);
  }
  g.visible = false;
  scene.add(g);

  const L = {
    model: g, from: new THREE.Vector3(), to: new THREE.Vector3(), progress: 0, duration: 15, active: false, altitude: 95,
    path: null,
  };

  // A random straight line across the map.
  L.start = function (heightAt) {
    const a = Math.random() * Math.PI * 2;
    const off = (Math.random() - 0.5) * 120;
    const nx = -Math.sin(a), nz = Math.cos(a);
    L.from.set(Math.cos(a) * -230 + nx * off, 0, Math.sin(a) * -230 + nz * off);
    L.to.set(Math.cos(a) * 230 + nx * off, 0, Math.sin(a) * 230 + nz * off);
    L.from.y = L.to.y = L.altitude;
    L.progress = 0; L.active = true; g.visible = true;
    g.position.copy(L.from);
    g.lookAt(L.to);
    L.path = { from: L.from.clone(), to: L.to.clone() };
  };
  L.pointAt = (k) => new THREE.Vector3().lerpVectors(L.from, L.to, k);
  L.update = function (dt, t) {
    if (!L.active) return;
    L.progress += dt / L.duration;
    g.position.lerpVectors(L.from, L.to, Math.min(1, L.progress));
    g.position.y = L.altitude + Math.sin(t * 1.3) * 0.6;
    flames.forEach((f) => { f.scale.z = 0.8 + Math.random() * 0.5; });
    if (L.progress >= 1.08) { L.active = false; g.visible = false; }
  };
  L.hide = () => { L.active = false; g.visible = false; };
  return L;
}

// The player floating down with thrusters. Returns true when landed.
export function updateDrop(player, dt, axis, rig, heightAt, effects) {
  const steer = rig.forward().multiplyScalar(axis.y).add(rig.right().multiplyScalar(axis.x));
  const k = 1 - Math.exp(-dt * 2.5);
  player.vel.x += (steer.x * 16 - player.vel.x) * k;
  player.vel.z += (steer.z * 16 - player.vel.z) * k;
  player.vel.y = -10;
  player.pos.addScaledVector(player.vel, dt);
  const r = Math.hypot(player.pos.x, player.pos.z);
  if (r > 185) { player.pos.x *= 185 / r; player.pos.z *= 185 / r; }
  const m = player.model;
  m.visible = true;
  m.position.copy(player.pos);
  if (Math.hypot(player.vel.x, player.vel.z) > 0.5) player.facing = Math.atan2(player.vel.x, player.vel.z);
  m.rotation.set(0.25, player.facing, 0);
  m.userData.armL.rotation.z = 0.9; m.userData.armR.rotation.z = -0.9;
  if (Math.random() < 0.5) effects.flame(player.pos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  const ground = heightAt(player.pos.x, player.pos.z);
  if (player.pos.y <= ground) {
    player.pos.y = ground; player.vel.set(0, 0, 0);
    m.rotation.set(0, player.facing, 0);
    return true;
  }
  return false;
}
