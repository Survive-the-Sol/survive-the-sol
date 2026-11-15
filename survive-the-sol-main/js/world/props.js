// =====================================================================
// PROPS – everything standing on the map:
// main base dome + greenhouse, walk-in research huts, shield bunkers,
// old lander, crashed satellite, antennas, solar-farm ruins, ice crystals,
// rocks, Mars dust devils, the sky (stars, Earth), and the shelter beacon.
// Returns colliders (round "no-walk" spots), landmarks for the minimap,
// loot spots, rover parking spots and bunkers (possible storm shelters).
// =====================================================================
import * as THREE from 'three';

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });

export function buildProps(scene, terrain, quality) {
  const { heightAt, rng, level } = terrain;
  const mars = level === 'mars';
  const group = new THREE.Group();     // everything goes in here (easy to remove when the level changes)
  scene.add(group);
  const colliders = [], landmarks = [], lootSpots = [], indoorSpots = [], roverSpots = [], bunkers = [];
  const blinkers = [], roofs = [], spinners = [];
  const place = (obj, x, z, sink = 0) => { obj.position.set(x, heightAt(x, z) - sink, z); group.add(obj); return obj; };
  const clearOf = (x, z, r) => !colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r);

  // ---------- MAIN BASE ----------
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

  // ---------- GREENHOUSE (only shown when the "Grow vegetables" card is active) ----------
  const greenhouse = new THREE.Group();
  {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 7, 12, 1, false, 0, Math.PI),
      flat('#bfe9ff', { transparent: true, opacity: 0.45, roughness: 0.1 }));
    glass.rotation.z = Math.PI / 2; glass.rotation.y = Math.PI / 2; glass.position.y = 0;
    greenhouse.add(glass);
    for (let i = 0; i < 6; i++) {
      const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), flat('#3fbf6f'));
      plant.position.set(-2.2 + i * 0.9, 0.5, (i % 2) * 0.9 - 0.45);
      greenhouse.add(plant);
    }
    place(greenhouse, 17, -12);
    greenhouse.visible = false;
  }

  // ---------- WALK-IN RESEARCH HUTS ----------
  const hutCount = 6;
  for (let i = 0; i < hutCount; i++) {
    const ang = (i / hutCount) * Math.PI * 2 + rng() * 0.6;
    const dist = 60 + rng() * 85;
    let x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
    if (mars && Math.abs(z - terrain.canyonZ(x)) < 20) z -= 30;
    const R = 4.4, segs = 14, doorSegs = [0, 1];   // two missing wall pieces = the door
    const hut = new THREE.Group();
    const wallMat = flat(mars ? '#e9d8c8' : '#d7dce8');
    const segLen = 2 * Math.PI * R / segs + 0.15;
    const facing = Math.atan2(-x, -z);   // door faces the base
    for (let s = 0; s < segs; s++) {
      if (doorSegs.includes(s)) continue;
      const a = (s + 0.5) / segs * Math.PI * 2 - Math.PI / segs * 2;
      const w = new THREE.Mesh(new THREE.BoxGeometry(segLen, 3, 0.3), wallMat);
      w.position.set(Math.sin(a) * R, 1.5, Math.cos(a) * R);
      w.rotation.y = a;
      w.castShadow = true; w.receiveShadow = true;
      hut.add(w);
      // collider for this wall piece (in world space)
      const wa = a + facing;
      colliders.push({ x: x + Math.sin(wa) * R, z: z + Math.cos(wa) * R, r: 1.05, wall: true });
    }
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 4, 28, Math.PI * 2 * (segs - 2) / segs), flat('#4f7bff'));
    stripe.rotation.x = Math.PI / 2; stripe.rotation.z = -Math.PI / 2 + Math.PI * 2 / segs * 0; stripe.position.y = 2.4;
    const roofMat = new THREE.MeshStandardMaterial({ color: '#b9c2d6', flatShading: true, roughness: 0.8, transparent: true, opacity: 1 });
    const roof = new THREE.Mesh(new THREE.SphereGeometry(R + 0.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), roofMat);
    roof.position.y = 3; roof.scale.y = 0.55; roof.castShadow = true;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 14), flat('#5a6178'));
    floor.position.y = 0.1;
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1), flat('#9aa3b8'));
    table.position.set(0, 0.9, -2.4);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.08), new THREE.MeshBasicMaterial({ color: '#7cf5c8' }));
    screen.position.set(0, 1.5, -2.8);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), new THREE.MeshBasicMaterial({ color: '#7cf5c8' }));
    lamp.position.set(0, 3.1, R + 0.1);
    blinkers.push(lamp);
    hut.add(stripe, roof, floor, table, screen, lamp);
    hut.rotation.y = facing;
    place(hut, x, z, 0.15);
    roofs.push({ roof, roofMat, x, z, r: R });
    landmarks.push({ name: 'Hut ' + 'ABCDEF'[i], type: 'hut', x, z });
    indoorSpots.push({ x, z }, { x: x + Math.sin(facing + 0.6) * 2, z: z + Math.cos(facing + 0.6) * 2 });
    const dx = Math.sin(facing), dz = Math.cos(facing);
    lootSpots.push({ x: x + dx * 7, z: z + dz * 7 });
    if (i % 2 === 0) roverSpots.push({ x: x + dx * 9 + dz * 5, z: z + dz * 9 - dx * 5, yaw: facing });
  }

  // ---------- SHIELD BUNKERS (possible storm shelters) ----------
  const bunkerNames = ['Bunker North', 'Bunker South-East', 'Bunker West'];
  const bunkerAngles = [-Math.PI / 2 + 0.3, Math.PI / 4, Math.PI + 0.2];
  bunkerAngles.forEach((ang, i) => {
    let x = Math.cos(ang) * 118, z = Math.sin(ang) * 118;
    if (mars && Math.abs(z - terrain.canyonZ(x)) < 22) z -= 35;
    const b = new THREE.Group();
    const mound = new THREE.Mesh(new THREE.SphereGeometry(5.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat(mars ? '#a9532f' : '#8c8f9b'));
    mound.scale.set(1.3, 0.6, 1); mound.castShadow = true;
    const front = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 1.2), flat('#c9cfdd'));
    front.position.set(0, 1.4, 5.2);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 0.2), flat('#2b3a66'));
    door.position.set(0, 1.1, 5.85);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.1), flat('#e8f22a', { emissive: '#e8f22a', emissiveIntensity: 0.4 }));
    sign.position.set(0, 2.6, 5.85);
    b.add(mound, front, door, sign);
    b.rotation.y = Math.atan2(-x, -z);
    place(b, x, z, 0.3);
    colliders.push({ x, z, r: 6 });
    landmarks.push({ name: bunkerNames[i], type: 'bunker', x, z });
    const fx = x - Math.sin(Math.atan2(x, z)) * 9, fz = z - Math.cos(Math.atan2(x, z)) * 9;   // in front of the door
    bunkers.push({ name: bunkerNames[i], x: fx, z: fz });
  });

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
    lootSpots.push({ x: x + 5, z: z + 2 }, { x: x - 4, z: z + 4 });
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
    lootSpots.push({ x: x + 6, z: z + 3 }, { x: x - 2, z: z + 6 });
  }

  // ---------- SOLAR FARM RUINS ----------
  {
    const fx = 128, fz = 92;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      const x = fx + c * 4.5 - 9, z = fz + r * 5 - 5;
      const broken = rng() < 0.35;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 5), flat('#8b92a6'));
      post.position.y = 0.7;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 2.2), flat(broken ? '#283a6e' : '#2f5bd6', { metalness: 0.4, roughness: 0.35 }));
      panel.position.y = broken ? 0.3 : 1.45;
      panel.rotation.x = broken ? 0.9 + rng() * 0.4 : -0.5;
      panel.rotation.z = broken ? (rng() - 0.5) : 0;
      const unit = new THREE.Group(); unit.add(post, panel);
      unit.traverse((o) => { o.castShadow = true; });
      place(unit, x, z);
    }
    landmarks.push({ name: 'Solar Farm Ruins', type: 'farm', x: fx, z: fz });
    lootSpots.push({ x: fx + 14, z: fz }, { x: fx - 14, z: fz + 4 }, { x: fx, z: fz + 12 });
  }

  // ---------- ANTENNAS ----------
  for (let i = 0; i < 3; i++) {
    let x, z, n = 0;
    do { x = (rng() - 0.5) * 300; z = (rng() - 0.5) * 300; n++; } while ((Math.hypot(x, z) < 45 || !clearOf(x, z, 8)) && n < 50);
    const a = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 14, 4), flat('#c9cfdd'));
    mast.position.y = 7;
    for (let k = 0; k < 5; k++) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(1.4 - k * 0.2, 0.08, 0.08), flat('#9aa3b8'));
      brace.position.y = 2 + k * 2.4; brace.rotation.y = k;
      a.add(brace);
    }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3), flat('#eef1f8', { side: THREE.DoubleSide }));
    dish.position.y = 14; dish.rotation.x = -1.1;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff6b6b' }));
    light.position.y = 14.4;
    blinkers.push(light);
    a.add(mast, dish, light);
    place(a, x, z);
    colliders.push({ x, z, r: 0.9 });
    landmarks.push({ name: 'Antenna', type: 'antenna', x, z });
    lootSpots.push({ x: x + 3, z: z + 3 });
  }

  // ---------- ICE crystals ----------
  {
    const ice = terrain.craters.find((c) => c.ice);
    landmarks.push({ name: ice.name, type: 'ice', x: ice.x, z: ice.z });
    const n = mars ? 24 : 46;
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
    group.add(crystals);
  }

  // ---------- ROVER parking near the base ----------
  roverSpots.unshift({ x: 16, z: 18, yaw: 0.6 }, { x: -18, z: 14, yaw: -0.5 });

  // ---------- ROCKS (one instanced mesh) ----------
  {
    const n = quality.rocks;
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), flat(mars ? '#8a4a32' : '#7d808b'), n);
    rocks.castShadow = true; rocks.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), color = new THREE.Color();
    let placed = 0, tries = 0;
    while (placed < n && tries < n * 12) {
      tries++;
      const x = (rng() - 0.5) * 380, z = (rng() - 0.5) * 380;
      const d = Math.hypot(x, z);
      if (d < 36 || d > 186 || !clearOf(x, z, 4)) continue;
      if (roverSpots.some((r) => Math.hypot(r.x - x, r.z - z) < 6)) continue;
      const big = rng() < 0.12;
      const k = big ? 2.2 + rng() * 2.2 : 0.35 + rng() * 1.1;
      e.set(rng() * 3, rng() * 3, rng() * 3); q.setFromEuler(e);
      s.set(k * (0.8 + rng() * 0.5), k * (0.6 + rng() * 0.4), k * (0.8 + rng() * 0.5));
      m.compose(new THREE.Vector3(x, heightAt(x, z) - k * 0.25, z), q, s);
      rocks.setMatrixAt(placed, m);
      const g = 0.75 + rng() * 0.35; rocks.setColorAt(placed, color.setRGB(g, g, g * 1.04));
      if (big) colliders.push({ x, z, r: k * 0.9 });
      else if (k >= 1.3) colliders.push({ x, z, r: k * 0.65 });
      placed++;
    }
    rocks.count = placed;
    group.add(rocks);
  }

  // ---------- MARS dust devils ----------
  if (mars) {
    for (let i = 0; i < 4; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 22, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: '#d9a070', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      cone.rotation.x = Math.PI;
      const dd = { mesh: cone, a: rng() * 6.28, r: 60 + rng() * 100, speed: 0.03 + rng() * 0.03 };
      group.add(cone);
      spinners.push(dd);
    }
  }

  // ---------- SKY ----------
  {
    const n = mars ? Math.floor(quality.stars / 4) : quality.stars, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rng() * 2 - 1, a = rng() * Math.PI * 2, r = 900, s = Math.sqrt(1 - u * u);
      p.set([Math.cos(a) * s * r, Math.abs(u) * r * 0.9 + 40, Math.sin(a) * s * r], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    group.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: mars ? 0.5 : 1 })));
    if (!mars) {
      const earth = new THREE.Mesh(new THREE.SphereGeometry(42, 24, 16), new THREE.MeshStandardMaterial({ color: '#3b7bd9', emissive: '#14306b', emissiveIntensity: 0.6, fog: false }));
      earth.position.set(-420, 300, -620);
      const land = new THREE.Mesh(new THREE.SphereGeometry(42.4, 12, 8, 0.4, 1.2, 0.6, 1.0), new THREE.MeshStandardMaterial({ color: '#4fbf6a', fog: false, flatShading: true }));
      land.position.copy(earth.position);
      group.add(earth, land);
    } else {
      const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3d6', fog: false }));
      sunDisc.position.set(500, 420, 300);
      group.add(sunDisc);
    }
  }

  // ---------- SHELTER BEACON (moved to this sol's shelter) ----------
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 160, 12, 1, true).translate(0, 80, 0),
    new THREE.MeshBasicMaterial({ color: '#e8f22a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  group.add(beam);
  function setShelter(x, z) { beam.position.set(x, heightAt(x, z), z); }
  setShelter(0, 0);

  function update(t, playerPos) {
    const on = Math.sin(t * 3) > 0;
    blinkers.forEach((b, i) => { b.visible = i === 0 ? on : Math.sin(t * 2 + i) > -0.3; });
    beam.material.opacity = 0.18 + Math.sin(t * 2.5) * 0.06;
    // fade hut roof to glass-like when player is inside, back to opaque when outside
    for (const r of roofs) {
      const inside = Math.hypot(playerPos.x - r.x, playerPos.z - r.z) <= r.r + 1.5;
      r.roofMat.opacity += (inside ? 0.18 - r.roofMat.opacity : 1 - r.roofMat.opacity) * 0.08;
      r.roof.visible = true;
    }
    for (const d of spinners) {
      d.a += d.speed * 0.016;
      const x = Math.cos(d.a) * d.r, z = Math.sin(d.a * 1.3) * d.r;
      d.mesh.position.set(x, heightAt(x, z) + 11, z);
      d.mesh.rotation.y += 0.08;
    }
  }

  function dispose() {
    scene.remove(group);
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  return { group, colliders, landmarks, lootSpots, indoorSpots, roverSpots, bunkers, greenhouse, setShelter, update, dispose };
}
