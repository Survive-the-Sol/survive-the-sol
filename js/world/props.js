// =====================================================================
// PROPS – everything that stands on the Moon map:
// main base dome, research huts, old lander, crashed satellite,
// ice crystals, rocks, plus the sky (stars and Earth).
// Returns colliders (round "no-walk" zones) and landmarks for the minimap.
// =====================================================================
import * as THREE from 'three';

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });

export function buildProps(scene, terrain, quality) {
  const { heightAt, rng } = terrain;
  const colliders = [];   // { x, z, r }
  const landmarks = [];   // { name, type, x, z }
  const hutSpots = [];    // places next to huts where good loot spawns
  const blinkers = [];    // lights that blink

  const groundY = (x, z) => heightAt(x, z);
  function place(obj, x, z, sink = 0) { obj.position.set(x, groundY(x, z) - sink, z); scene.add(obj); return obj; }

  // ---------- MAIN BASE (centre) ----------
  {
    const base = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), flat('#eef1f8'));
    dome.castShadow = true; dome.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.8, 1.2, 20), flat('#9aa3b8'));
    ring.position.y = 0.6;
    const band = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.35, 6, 24), flat('#2b3a66'));
    band.rotation.x = Math.PI / 2; band.position.y = 3.6;
    const tunnel = new THREE.Mesh(new THREE.BoxGeometry(4, 3.4, 5), flat('#dfe3ee'));
    tunnel.position.set(0, 1.7, 11.5);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.2), flat('#e8f22a', { emissive: '#e8f22a', emissiveIntensity: 0.35 }));
    door.position.set(0, 1.4, 14.05);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), flat('#c9cfdd'));
    mast.position.set(0, 12.5, 0);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8f22a' }));
    beacon.position.set(0, 15.7, 0);
    blinkers.push(beacon);
    base.add(dome, ring, band, tunnel, door, mast, beacon);
    place(base, 0, 0);
    colliders.push({ x: 0, z: 0, r: 10.8 }, { x: 0, z: 11.5, r: 2.8 });
    landmarks.push({ name: 'Main Base', type: 'base', x: 0, z: 0 });
  }

  // ---------- RESEARCH HUTS ----------
  const hutNames = ['Hut A', 'Hut B', 'Hut C', 'Hut D', 'Hut E', 'Hut F'];
  for (let i = 0; i < hutNames.length; i++) {
    const ang = (i / hutNames.length) * Math.PI * 2 + rng() * 0.6;
    const dist = 62 + rng() * 85;
    const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
    const hut = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 3, 10), flat('#d7dce8'));
    body.position.y = 1.5; body.castShadow = true;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), flat('#b9c2d6'));
    cap.position.y = 3;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.4, 10), flat('#4f7bff'));
    stripe.position.y = 2.3;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 0.3), flat('#2b3a66'));
    door.position.set(0, 1, 3.05);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), new THREE.MeshBasicMaterial({ color: '#7cf5c8' }));
    lamp.position.set(0, 2.6, 3.2);
    blinkers.push(lamp);
    hut.add(body, cap, stripe, door, lamp);
    hut.rotation.y = Math.atan2(-x, -z);           // door faces the main base
    place(hut, x, z, 0.3);
    colliders.push({ x, z, r: 3.4 });
    landmarks.push({ name: hutNames[i], type: 'hut', x, z });
    // loot spots just outside the door
    const dx = -x / dist, dz = -z / dist;
    hutSpots.push({ x: x + dx * 5, z: z + dz * 5 }, { x: x + dx * 4.5 + dz * 2.5, z: z + dz * 4.5 - dx * 2.5 });
  }

  // ---------- OLD LANDER ----------
  {
    const x = 92, z = -64;
    const lander = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2, 8), flat('#d9a441', { metalness: 0.5, roughness: 0.5 }));
    body.position.y = 2.6; body.castShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2, 1.6, 8), flat('#c9cfdd'));
    top.position.y = 4.4;
    lander.add(body, top);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 5), flat('#9aa3b8'));
      leg.position.set(Math.cos(a) * 2.6, 1.3, Math.sin(a) * 2.6);
      leg.rotation.z = Math.cos(a) * 0.5; leg.rotation.x = -Math.sin(a) * 0.5;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 8), flat('#9aa3b8'));
      foot.position.set(Math.cos(a) * 3.4, 0.05, Math.sin(a) * 3.4);
      lander.add(leg, foot);
    }
    lander.rotation.z = 0.06;
    place(lander, x, z, 0.2);
    colliders.push({ x, z, r: 3 });
    landmarks.push({ name: 'Old Lander', type: 'lander', x, z });
    hutSpots.push({ x: x + 5, z: z + 2 }, { x: x - 4, z: z + 4 });
  }

  // ---------- CRASHED SATELLITE ----------
  {
    const x = -74, z = -118;
    const sat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2.2), flat('#c9cfdd', { metalness: 0.4 }));
    body.castShadow = true;
    const dish = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.8, 10, 1, true), flat('#eef1f8', { side: THREE.DoubleSide }));
    dish.position.set(0, 1.5, 0); dish.rotation.z = 0.6;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 1.8), flat('#2f5bd6', { metalness: 0.3, roughness: 0.4 }));
    p1.position.set(4, 0.3, 0); p1.rotation.z = 0.35;
    const p2 = p1.clone(); p2.position.set(-4, -0.4, 0); p2.rotation.z = -0.5;
    sat.add(body, dish, p1, p2);
    sat.rotation.set(0.25, 0.7, 0.3);
    place(sat, x, z, -0.6);
    colliders.push({ x, z, r: 4.2 });
    landmarks.push({ name: 'Crashed Satellite', type: 'satellite', x, z });
    hutSpots.push({ x: x + 6, z: z + 3 }, { x: x - 2, z: z + 6 });
  }

  // ---------- ICE CRATER crystals ----------
  {
    const ice = terrain.craters.find(c => c.ice);
    landmarks.push({ name: 'Ice Crater', type: 'ice', x: ice.x, z: ice.z });
    const n = 46;
    const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0),
      flat('#bfe9ff', { emissive: '#4fb6ff', emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.1 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = rng() * ice.r * 0.8;
      const x = ice.x + Math.cos(a) * d, z = ice.z + Math.sin(a) * d;
      e.set(rng() * 0.6, rng() * 3, rng() * 0.6); q.setFromEuler(e);
      const k = 0.4 + rng() * 1.1; s.set(k * 0.7, k * 1.6, k * 0.7);
      m.compose(new THREE.Vector3(x, heightAt(x, z) + k * 0.6, z), q, s);
      crystals.setMatrixAt(i, m);
    }
    scene.add(crystals);
  }

  // ---------- ROCKS (one instanced mesh = fast) ----------
  {
    const n = quality.rocks;
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), flat('#7d808b'), n);
    rocks.castShadow = true; rocks.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), color = new THREE.Color();
    let placed = 0, tries = 0;
    while (placed < n && tries < n * 10) {
      tries++;
      const x = (rng() - 0.5) * 380, z = (rng() - 0.5) * 380;
      const d = Math.hypot(x, z);
      if (d < 34 || d > 186) continue;
      if (colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 3)) continue;
      const big = rng() < 0.12;
      const k = big ? 2.2 + rng() * 2.2 : 0.35 + rng() * 1.1;
      e.set(rng() * 3, rng() * 3, rng() * 3); q.setFromEuler(e);
      s.set(k * (0.8 + rng() * 0.5), k * (0.6 + rng() * 0.4), k * (0.8 + rng() * 0.5));
      m.compose(new THREE.Vector3(x, heightAt(x, z) - k * 0.25, z), q, s);
      rocks.setMatrixAt(placed, m);
      const g = 0.75 + rng() * 0.35; rocks.setColorAt(placed, color.setRGB(g, g, g * 1.04));
      if (big) colliders.push({ x, z, r: k * 0.9 });
      placed++;
    }
    rocks.count = placed;
    scene.add(rocks);
  }

  // ---------- SKY: stars + Earth ----------
  {
    const n = quality.stars, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rng() * 2 - 1, a = rng() * Math.PI * 2, r = 900;
      const s = Math.sqrt(1 - u * u);
      p.set([Math.cos(a) * s * r, Math.abs(u) * r * 0.9 + 40, Math.sin(a) * s * r], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false })));
    const earth = new THREE.Mesh(new THREE.SphereGeometry(42, 24, 16), new THREE.MeshStandardMaterial({ color: '#3b7bd9', emissive: '#14306b', emissiveIntensity: 0.6, fog: false }));
    earth.position.set(-420, 300, -620);
    const land = new THREE.Mesh(new THREE.SphereGeometry(42.4, 12, 8, 0.4, 1.2, 0.6, 1.0), new THREE.MeshStandardMaterial({ color: '#4fbf6a', fog: false, flatShading: true }));
    land.position.copy(earth.position);
    scene.add(earth, land);
  }

  function update(t) {
    const on = Math.sin(t * 3) > 0;
    blinkers.forEach((b, i) => { b.visible = i === 0 ? on : Math.sin(t * 2 + i) > -0.3; });
  }

  return { colliders, landmarks, hutSpots, update };
}
