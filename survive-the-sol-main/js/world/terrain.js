// =====================================================================
// TERRAIN – the ground. One function, heightAt(x, z), gives the ground
// height anywhere; the 3D mesh AND every walker use it, so feet match.
// level 'moon': grey regolith, many craters, an ice crater.
// level 'mars': red ground textured with the real NASA Mars Trek
//               Viking colour mosaic, fewer craters and a canyon.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';

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
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < 4; i++) { sum += amp * noise(x * freq, z * freq); norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}
export function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// The Mars canyon follows this wavy line (x → z).
const canyonZ = (x) => 70 + Math.sin(x / 38) * 22;

export function createTerrain(level, segments, marsTexture = null) {
  const mars = level === 'mars';
  const rng = makeRng(mars ? 4242 : 2026);
  const W = CONFIG.world;

  const craters = [{ x: -118, z: 104, r: 26, depth: 8, rim: 2.5, ice: true, name: mars ? 'Ice Deposit' : 'Ice Crater' }];
  const wanted = mars ? 12 : 30;
  let tries = 0;
  while (craters.length < wanted && tries++ < 2000) {
    const x = (rng() - 0.5) * 360, z = (rng() - 0.5) * 360;
    const r = rng() < 0.25 ? 14 + rng() * 12 : 4 + rng() * 9;   // a few big, many small
    const d = Math.hypot(x, z);
    if (d < W.baseRadius + 30 || d > 175) continue;
    if (mars && Math.abs(z - canyonZ(x)) < 22) continue;
    if (craters.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r + 5)) continue;
    craters.push({ x, z, r, depth: r * (0.22 + rng() * 0.12), rim: r * 0.09, ice: false });
  }

  function heightAt(x, z) {
    let h = (fbm(x * 0.011 + 10, z * 0.011 + 10) - 0.5) * (mars ? 24 : 18) + (fbm(x * 0.05, z * 0.05) - 0.5) * 2.6;
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i], dx = x - c.x, dz = z - c.z;
      const d2 = (dx * dx + dz * dz) / (c.r * c.r);
      if (d2 > 2.8) continue;
      const d = Math.sqrt(d2);
      if (d < 1) h += c.depth * (d2 - 1);
      const rimT = (d - 1) / 0.24;
      h += c.rim * Math.exp(-rimT * rimT);
    }
    if (mars) {   // a winding canyon
      const dz = z - canyonZ(x);
      const k = Math.exp(-(dz * dz) / (11 * 11));
      h -= 13 * k * smoothstep(40, 70, Math.hypot(x, z));
    }
    const fromCentre = Math.hypot(x, z);
    h = THREE.MathUtils.lerp(0, h, smoothstep(W.baseRadius, W.baseRadius + 26, fromCentre));
    const edge = smoothstep(168, 212, fromCentre);
    return h + edge * edge * 46;
  }

  function craterAt(x, z) {
    for (const c of craters) if (Math.hypot(x - c.x, z - c.z) < c.r) return c;
    return null;
  }
  function inCanyon(x, z) { return mars && Math.abs(z - canyonZ(x)) < 12 && Math.hypot(x, z) > 60; }

  // ----- mesh -----
  let geo = new THREE.PlaneGeometry(W.size, W.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo = geo.toNonIndexed();
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    let cx = 0, cz = 0;
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k), z = pos.getZ(i + k);
      pos.setY(i + k, heightAt(x, z));
      cx += x / 3; cz += z / 3;
    }
    const c = craterAt(cx, cz);
    const n = fbm(cx * 0.08, cz * 0.08);
    if (mars) {
      // with the Mars Trek texture the colours act as light/dark shading
      const s = 0.75 + n * 0.35;
      if (c && c.ice && Math.hypot(cx - c.x, cz - c.z) < c.r * 0.7) col.setRGB(1.15, 1.15, 1.2);
      else if (inCanyon(cx, cz)) col.setRGB(s * 0.75, s * 0.68, s * 0.65);
      else col.setRGB(s, s * 0.96, s * 0.92);
    } else {
      const shade = 0.34 + n * 0.24;
      if (c && c.ice && Math.hypot(cx - c.x, cz - c.z) < c.r * 0.82) col.setRGB(0.70, 0.84, 0.95);
      else if (c) col.setRGB(shade * 0.78, shade * 0.79, shade * 0.84);
      else col.setRGB(shade, shade * 1.01, shade * 1.06);
    }
    for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const matOpts = { vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 };
  if (mars && marsTexture) matOpts.map = marsTexture;     // real Mars imagery on the ground
  else if (mars) matOpts.color = '#c1643a';
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(matOpts));
  mesh.receiveShadow = true;

  return { level, mesh, heightAt, craterAt, inCanyon, craters, rng, canyonZ };
}
