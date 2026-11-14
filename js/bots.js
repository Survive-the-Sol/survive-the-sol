// =====================================================================
// BOT CREWS – 4 friendly AI astronauts. No fighting! They race you for
// supplies and to the storm shelter. Each sol they get a random
// personality (speed, greed, how early they head home), so every sol
// plays differently. Shown on the minimap, leaderboard and event feed.
// =====================================================================
import * as THREE from 'three';
import { makeAstronaut, animateAstronaut, pushOut } from './player.js';

export const CREW = [
  { name: 'Captain Ayesha', short: 'Ayesha', color: '#7cf5c8' },
  { name: 'Engineer Bilal', short: 'Bilal', color: '#ff9f43' },
  { name: 'Dr. Zara', short: 'Zara', color: '#b06bff' },
  { name: 'Pilot Hamza', short: 'Hamza', color: '#4f7bff' },
];

export function createBots(scene, world, loot, feed) {
  const bots = CREW.map((c) => {
    const model = makeAstronaut(c.color);
    model.visible = false;
    scene.add(model);
    return { ...c, model, pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: null, targetItem: null,
      state: 'waiting', supplies: 0, points: 0, arrivedAt: null, thinkIn: 0, facing: 0, dropAt: 0, dropFrom: null, landSpot: null };
  });

  // Each sol: a new personality, and a landing spot along the lander's path.
  function reset(landSpots) {
    bots.forEach((b, i) => {
      b.speed = 5 + Math.random() * 1.8;
      b.pause = 0; b.stuckT = 0; b.ignore = new Set(); b.lastPos = null;
      b.greed = Math.random();                    // high greed = stays out longer
      b.homeAt = 0;                               // set when the storm warning comes
      b.state = 'waiting'; b.supplies = 0; b.points = 0; b.arrivedAt = null; b.targetItem = null; b.target = null;
      b.landSpot = landSpots[i];
      b.model.visible = false;
    });
  }

  // The lander passes over a bot's spot → the bot jumps out and floats down.
  function jump(b, from) {
    b.state = 'dropping';
    b.dropFrom = from.clone();
    b.dropT = 0;
    b.model.visible = true;
  }

  const tmp = new THREE.Vector3();
  function chooseLoot(b) {
    let best = null, bestScore = -1;
    for (const it of loot.items) {
      if (b.ignore.has(it)) continue;
      const d = Math.hypot(it.x - b.pos.x, it.z - b.pos.z);
      if (d > 70) continue;
      const score = (it.rarity.points + (it.airdrop ? 6 : 0)) / (d + 8);
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  function update(dt, t, storm) {
    for (const b of bots) {
      if (b.state === 'waiting') continue;
      if (b.state === 'dropping') {
        b.dropT += dt / 6;
        const k = Math.min(1, b.dropT);
        const gy = world.heightAt(b.landSpot.x, b.landSpot.z);
        b.pos.set(
          THREE.MathUtils.lerp(b.dropFrom.x, b.landSpot.x, k),
          THREE.MathUtils.lerp(b.dropFrom.y, gy, k * k),
          THREE.MathUtils.lerp(b.dropFrom.z, b.landSpot.z, k));
        if (k >= 1) { b.state = 'loot'; b.thinkIn = 0; }
      } else {
        // decide where to go
        b.thinkIn -= dt;
        const shelter = storm.shelter;
        const distHome = Math.hypot(b.pos.x - shelter.x, b.pos.z - shelter.z);
        if (b.state !== 'home' && storm.stage !== 'calm') {
          // head home earlier if the zone is close, later if greedy
          const zoneEdge = storm.r - distHome;
          if (zoneEdge < 25 + (1 - b.greed) * 40 || storm.phase >= 2) b.state = 'home';
        }
        if (b.state === 'loot' && b.thinkIn <= 0) {
          b.thinkIn = 1.2 + Math.random();
          b.targetItem = chooseLoot(b);
          b.target = b.targetItem ? new THREE.Vector3(b.targetItem.x, 0, b.targetItem.z)
            : new THREE.Vector3(b.pos.x + (Math.random() - 0.5) * 60, 0, b.pos.z + (Math.random() - 0.5) * 60);
        }
        if (b.state === 'home') {
          b.target = tmp.set(shelter.x + Math.sin(b.speed * 9) * 4, 0, shelter.z + Math.cos(b.speed * 9) * 4).clone();
          if (b.arrivedAt === null && storm.inFinal(b.pos)) {
            b.arrivedAt = t;
            feed(`${b.short} reached ${shelter.name === 'Main Base' ? 'the base' : 'the bunker'}`, 'info');
          }
        }
        // move (bots stop for a moment after each pickup to pack their bag)
        let speed = 0;
        if (b.pause > 0) { b.pause -= dt; b.vel.set(0, 0, 0); }
        else if (b.target) {
          const dx = b.target.x - b.pos.x, dz = b.target.z - b.pos.z, d = Math.hypot(dx, dz);
          if (d > (b.state === 'home' ? 2.5 : 0.6)) {
            speed = b.state === 'home' ? b.speed * 1.1 : b.speed;
            b.vel.set(dx / d * speed, 0, dz / d * speed);
          } else { b.vel.set(0, 0, 0); if (b.state === 'loot') b.thinkIn = 0; }
        }
        const bx = b.pos.x, bz = b.pos.z;
        b.pos.addScaledVector(b.vel, dt);
        pushOut(b.pos, world.colliders);
        // stuck against a wall? give up on that target and pick another one
        if (speed > 0 && Math.hypot(b.pos.x - bx, b.pos.z - bz) < speed * dt * 0.3) {
          b.stuckT += dt;
          if (b.stuckT > 1.5) {
            b.stuckT = 0;
            if (b.targetItem) b.ignore.add(b.targetItem);
            b.targetItem = null;
            b.target = new THREE.Vector3(b.pos.x + (Math.random() - 0.5) * 30, 0, b.pos.z + (Math.random() - 0.5) * 30);
            b.thinkIn = 2;
          }
        } else b.stuckT = 0;
        b.pos.y = world.heightAt(b.pos.x, b.pos.z);
        // pick up loot it walks over
        if (b.state === 'loot' && b.targetItem && loot.items.includes(b.targetItem)) {
          const it = b.targetItem;
          if (Math.hypot(it.x - b.pos.x, it.z - b.pos.z) < 1.6) {
            loot.remove(it);
            b.supplies++; b.points += it.rarity.points; b.pause = 2.2;
            if (it.airdrop) feed(`${b.short} reached an airdrop first!`, 'warn');
            else if (it.rarity.id === 'legendary') feed(`${b.short} found a legendary supply`, 'info');
            b.targetItem = null; b.thinkIn = 0;
          }
        } else if (b.state === 'loot' && b.targetItem && !loot.items.includes(b.targetItem)) { b.targetItem = null; b.thinkIn = 0; }
        if (speed > 0.1) {
          let diff = Math.atan2(b.vel.x, b.vel.z) - b.facing;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          b.facing += diff * Math.min(1, dt * 8);
        }
        animateAstronaut(b.model, speed, true, dt);
      }
      b.model.position.copy(b.pos);
      b.model.rotation.set(0, b.facing, 0);
    }
  }

  function hideAll() { bots.forEach((b) => { b.model.visible = false; b.state = 'waiting'; }); }
  function dispose() { bots.forEach((b) => scene.remove(b.model)); }

  return { bots, reset, jump, update, hideAll, dispose };
}
