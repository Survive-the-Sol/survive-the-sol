// =====================================================================
// THIRD-PERSON CAMERA – orbits behind the astronaut.
// Drag with the mouse (or a finger) to look around, wheel to zoom.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createCameraRig(camera, canvas, heightAt) {
  const C = CONFIG.camera;
  const rig = { yaw: 0, pitch: C.pitch, distance: C.distance, target: new THREE.Vector3() };
  let dragging = false, lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId); });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    rig.yaw -= (e.clientX - lastX) * 0.0055;
    rig.pitch = THREE.MathUtils.clamp(rig.pitch + (e.clientY - lastY) * 0.004, -0.15, 1.15);
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    rig.distance = THREE.MathUtils.clamp(rig.distance + Math.sign(e.deltaY) * 0.9, C.minDistance, C.maxDistance);
  }, { passive: false });

  const wanted = new THREE.Vector3();
  rig.update = function (playerPos, dt, crouching) {
    rig.target.lerp(new THREE.Vector3(playerPos.x, playerPos.y + (crouching ? 1.2 : 1.7), playerPos.z), 1 - Math.exp(-dt * 14));
    const cp = Math.cos(rig.pitch);
    wanted.set(
      rig.target.x + Math.sin(rig.yaw) * cp * rig.distance,
      rig.target.y + Math.sin(rig.pitch) * rig.distance,
      rig.target.z + Math.cos(rig.yaw) * cp * rig.distance,
    );
    // never go under the ground
    const floor = heightAt(wanted.x, wanted.z) + 0.6;
    if (wanted.y < floor) wanted.y = floor;
    camera.position.lerp(wanted, 1 - Math.exp(-dt * 12));
    camera.lookAt(rig.target);
  };
  // Directions on the ground, relative to where the camera looks.
  rig.forward = () => new THREE.Vector3(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw));
  rig.right = () => new THREE.Vector3(Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  // Compass heading in degrees (0 = North = -z, 90 = East = +x)
  rig.heading = () => (((-rig.yaw * 180 / Math.PI) % 360) + 360) % 360;
  return rig;
}
