// =====================================================================
// THIRD-PERSON CAMERA – orbits behind the astronaut (or the rover/lander).
// Drag with the mouse or a finger to look around, wheel to zoom.
// rig.shake(amount) makes the screen shake (turned off by Reduce motion).
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createCameraRig(camera, canvas) {
  const C = CONFIG.camera;
  const rig = {
    yaw: 0, pitch: C.pitch, distance: C.distance, extraDistance: 0, height: 1.7,
    target: new THREE.Vector3(), sensitivity: 1, reduceMotion: false, shakeAmount: 0, heightAt: () => 0,
    menuOrbit: false,
  };
  let dragging = false, lastX = 0, lastY = 0, dragId = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (dragId !== null) return;
    dragging = true; dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  const stop = (e) => { if (e.pointerId === dragId) { dragging = false; dragId = null; } };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dragId) return;
    rig.yaw -= (e.clientX - lastX) * 0.0055 * rig.sensitivity;
    rig.pitch = THREE.MathUtils.clamp(rig.pitch + (e.clientY - lastY) * 0.004 * rig.sensitivity, -0.15, 1.2);
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    rig.distance = THREE.MathUtils.clamp(rig.distance + Math.sign(e.deltaY) * 0.9, C.minDistance, C.maxDistance);
  }, { passive: false });

  const wanted = new THREE.Vector3(), aim = new THREE.Vector3(), shakeV = new THREE.Vector3();
  rig.shake = (amount) => { if (!rig.reduceMotion) rig.shakeAmount = Math.max(rig.shakeAmount, amount); };

  rig.update = function (focus, dt, snap = false) {
    aim.set(focus.x, focus.y + rig.height, focus.z);
    if (snap) rig.target.copy(aim); else rig.target.lerp(aim, 1 - Math.exp(-dt * 14));
    if (rig.menuOrbit) rig.yaw += dt * 0.05;
    const dist = rig.distance + rig.extraDistance;
    const cp = Math.cos(rig.pitch);
    wanted.set(
      rig.target.x + Math.sin(rig.yaw) * cp * dist,
      rig.target.y + Math.sin(rig.pitch) * dist,
      rig.target.z + Math.cos(rig.yaw) * cp * dist,
    );
    const floor = rig.heightAt(wanted.x, wanted.z) + 0.6;
    if (wanted.y < floor) wanted.y = floor;
    if (snap) camera.position.copy(wanted); else camera.position.lerp(wanted, 1 - Math.exp(-dt * 12));
    camera.lookAt(rig.target);
    if (rig.shakeAmount > 0.001) {
      shakeV.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(rig.shakeAmount);
      camera.position.add(shakeV);
      rig.shakeAmount *= Math.exp(-dt * 8);
    }
  };
  rig.forward = () => new THREE.Vector3(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw));
  rig.right = () => new THREE.Vector3(Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  rig.heading = () => (((-rig.yaw * 180 / Math.PI) % 360) + 360) % 360;   // 0 = North (-z), 90 = East (+x)
  return rig;
}
