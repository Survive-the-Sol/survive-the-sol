// =====================================================================
// TERRAIN – the ground of the Moon map.
// One function, heightAt(x, z), gives the ground height anywhere.
// The 3D mesh AND the astronaut's feet both use it, so they always match.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// ---------- small random + noise helpers ----------
// A seeded random generator: the same seed always makes the same map.
export function makeRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, z) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// Smooth "value noise": gentle random bumps.
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { // layers of noise = natural-looking hills
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < 4; i++) { sum += amp * noise(x * freq, z * freq); norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}
export function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// ---------- the map ----------
export function createTerrain(segments, seed = 2026) {
  const rng = makeRng(seed);
  const W = CONFIG.world;

  // Craters: a bowl with a raised rim. The ice crater is a special one.
  const craters = [{ x: -118, z: 104, r: 26, depth: 8, rim: 2.5, ice: true, name: 'Ice Crater' }];
  while (craters.length < 24) {
    const x = (rng() - 0.5) * 360, z = (rng() - 0.5) * 360, r = 6 + rng() * 17;
    const d = Math.hypot(x, z);
    if (d < W.baseRadius + 30 || d > 175) continue;                      // keep the base area clear
    if (craters.some(c => Math.hypot(c.x - x, c.z - z) < c.r + r + 6)) continue; // no overlaps
    craters.push({ x, z, r, depth: r * (0.22 + rng() * 0.12), rim: r * 0.09, ice: false });
  }

  function heightAt(x, z) {
    let h = (fbm(x * 0.011 + 10, z * 0.011 + 10) - 0.5) * 18 + (fbm(x * 0.05, z * 0.05) - 0.5) * 2.6;
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i], dx = x - c.x, dz = z - c.z;
      const d2 = (dx * dx + dz * dz) / (c.r * c.r);
      if (d2 > 2.8) continue;
      const d = Math.sqrt(d2);
      if (d < 1) h += c.depth * (d2 - 1);                       // the bowl
      const rimT = (d - 1) / 0.24;
      h += c.rim * Math.exp(-rimT * rimT);                      // the rim
    }
    const fromCentre = Math.hypot(x, z);
    h = THREE.MathUtils.lerp(0, h, smoothstep(W.baseRadius, W.baseRadius + 26, fromCentre)); // flat base area
    const edge = smoothstep(168, 212, fromCentre);
    return h + edge * edge * 46;                                 // mountains around the edge
  }

  // Which crater (if any) is this point inside? Used for colours and loot.
  function craterAt(x, z) {
    for (const c of craters) if (Math.hypot(x - c.x, z - c.z) < c.r) return c;
    return null;
  }

  // ----- build the 3D mesh -----
  let geo = new THREE.PlaneGeometry(W.size, W.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo = geo.toNonIndexed();               // separate triangles → faceted low-poly look
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    // colour each triangle by its centre (flat colour per face)
    let cx = 0, cz = 0;
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k), z = pos.getZ(i + k);
      pos.setY(i + k, heightAt(x, z));
      cx += x / 3; cz += z / 3;
    }
    const c = craterAt(cx, cz);
    const shade = 0.34 + fbm(cx * 0.08, cz * 0.08) * 0.24;
    if (c && c.ice && Math.hypot(cx - c.x, cz - c.z) < c.r * 0.82) col.setRGB(0.70, 0.84, 0.95);  // icy floor
    else if (c) col.setRGB(shade * 0.78, shade * 0.79, shade * 0.84);                              // darker crater
    else col.setRGB(shade, shade * 1.01, shade * 1.06);                                           // grey regolith
    for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
  mesh.receiveShadow = true;

  return { mesh, heightAt, craterAt, craters, rng };
}
