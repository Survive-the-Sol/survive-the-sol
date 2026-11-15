// =====================================================================
// STORM ZONE – driven by a REAL solar flare from NASA CCMC DONKI.
// Each sol picks a real archived flare (class + date). A bigger class
// (C < M < X) makes the safe zone shrink faster and hurt more.
// Damage outside the zone is scaled by NASA OSDR RadLab measurements:
// game_scale.moon / game_scale.mars = how much stronger radiation is
// there than on the ISS (from data/radiation.json).
// The safe zone shrinks in 3 phases toward this sol's shelter.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { flarePower } from './data.js';

const SEVERITY_WEIGHTS = {
  moon: { mild: 40, strong: 45, extreme: 15 },
  mars: { strong: 40, extreme: 60 },
};

function makeWallTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

export function createStorm(scene, world, data, level) {
  const S = CONFIG.sol;
  const radScale = (data.radiation.game_scale && data.radiation.game_scale[level]) || 1;
  const usedFlares = new Set();

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 72, 1, true).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ color: '#ff5f8a', map: makeWallTexture(), transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  wall.frustumCulled = false;
  const finalRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#e8f22a', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(wall, finalRing);

  const st = {
    flare: null, power: null, shelter: null, radScale,
    schedule: null, r: S.startRadius, nextR: S.startRadius, finalR: S.finalRadius, phase: 0, stage: 'calm',
    mods: {},
  };

  function pickFlare() {
    const list = data.flares[level];
    const weights = SEVERITY_WEIGHTS[level];
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total, sev = 'strong';
    for (const k in weights) { r -= weights[k]; if (r < 0) { sev = k; break; } }
    let pool = list.filter((f) => f.severity === sev && !usedFlares.has(f.id));
    if (!pool.length) pool = list.filter((f) => !usedFlares.has(f.id));
    if (!pool.length) pool = list;
    const f = pool[Math.floor(Math.random() * pool.length)];
    usedFlares.add(f.id);
    return f;
  }

  st.begin = function ({ mods = {}, tutorial = false, shelterChoice = null }) {
    st.mods = mods;
    st.flare = pickFlare();
    st.power = flarePower(st.flare);
    // shelter: main base or a shield bunker
    const options = [{ name: 'Main Base', x: 0, z: 18 }, ...world.bunkers];
    st.shelter = shelterChoice || (tutorial ? options[0] : options[Math.random() < 0.45 ? 0 : 1 + Math.floor(Math.random() * world.bunkers.length)]);
    world.setShelter(st.shelter.x, st.shelter.z);
    st.finalR = S.finalRadius + (mods.zoneBonus || 0);
    const sf = st.power.speed;
    const off = tutorial ? S.tutorialExtra : 0;
    const at = (t) => off + S.warnAt + (t - S.warnAt) * sf;
    let from = S.startRadius;
    st.schedule = {
      warnAt: off + S.warnAt - (mods.warnEarly || 0),
      phases: S.phases.map((p) => { const ph = { start: at(p.start), end: at(p.end), from, to: p.to === null ? st.finalR : p.to }; from = ph.to; return ph; }),
      endAt: at(S.endAt),
    };
    st.r = S.startRadius; st.nextR = st.schedule.phases[0].to; st.phase = 0; st.stage = 'calm';
    finalRing.position.set(st.shelter.x, world.heightAt(st.shelter.x, st.shelter.z) + 0.15, st.shelter.z);
    finalRing.scale.set(st.finalR, 1, st.finalR);
    finalRing.visible = false;
  };

  // Radiation damage per second outside the safe zone right now.
  st.dps = function () {
    if (st.phase === 0) return 0;
    const phaseBoost = [1, 1, 1.25, 1.6, 2][Math.min(4, st.phase)];
    return S.baseDps * st.power.damage * radScale * phaseBoost;
  };
  st.inside = (pos) => Math.hypot(pos.x - st.shelter.x, pos.z - st.shelter.z) <= st.r;
  st.inFinal = (pos) => Math.hypot(pos.x - st.shelter.x, pos.z - st.shelter.z) <= st.finalR;

  // Returns what the HUD should say: { stage, label, seconds }
  st.update = function (t, timeOfDay) {
    const sc = st.schedule;
    let info;
    st.phase = 0;
    st.r = S.startRadius;
    for (let i = 0; i < sc.phases.length; i++) {
      const p = sc.phases[i];
      if (t >= p.start) {
        st.phase = i + 1;
        const k = Math.min(1, (t - p.start) / (p.end - p.start));
        st.r = THREE.MathUtils.lerp(p.from, p.to, k);
        st.nextR = p.to;
      }
    }
    const nextPhase = sc.phases[st.phase];
    if (t < sc.warnAt) {
      st.stage = 'calm';
      info = { stage: 'calm', label: 'Explore & collect', seconds: sc.warnAt - t };
    } else if (t >= sc.endAt) {
      st.stage = 'over';
      info = { stage: 'over', label: 'Storm passing', seconds: 0 };
    } else if (nextPhase && t < nextPhase.start) {
      st.stage = st.phase === 0 ? 'warning' : 'holding';
      st.nextR = nextPhase.to;
      info = { stage: st.stage, label: st.phase === 0 ? 'Storm hits in' : 'Zone shrinks in', seconds: nextPhase.start - t };
    } else if (st.phase > 0 && t < sc.phases[st.phase - 1].end) {
      st.stage = 'shrinking';
      info = { stage: 'shrinking', label: 'Zone shrinking', seconds: sc.phases[st.phase - 1].end - t };
    } else {
      st.stage = 'final';
      info = { stage: 'final', label: 'Storm ends in', seconds: sc.endAt - t };
    }
    // the glowing wall
    const y = world.heightAt(st.shelter.x, st.shelter.z) - 30;
    wall.position.set(st.shelter.x, y, st.shelter.z);
    wall.scale.set(Math.max(1, st.r), 90, Math.max(1, st.r));
    wall.material.opacity = t < sc.warnAt ? 0.25 : 0.55 + Math.sin(timeOfDay * 3) * 0.12;
    finalRing.visible = t >= sc.warnAt;
    return info;
  };

  st.dispose = () => { scene.remove(wall, finalRing); };
  return st;
}
