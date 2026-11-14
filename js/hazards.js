// =====================================================================
// HAZARDS – random events that keep you on your toes (no violence):
//  • micrometeoroid shower: a red shadow ring warns you, then tiny space
//    rocks hit the ground. Step out of the ring! (suit patch costs Life Support)
//  • equipment glitch: a sudden small loss of Power or Life Support
//  • Mars only: dust storm – it gets hard to see, solar power is weaker
// =====================================================================
import * as THREE from 'three';

export function createHazards(scene, world, fx) {
  const group = new THREE.Group(); scene.add(group);
  const warnGeo = new THREE.RingGeometry(0.75, 1, 24).rotateX(-Math.PI / 2);
  const fillGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const strikes = [];
  const rockGeo = new THREE.IcosahedronGeometry(0.35, 0);
  const rockMat = new THREE.MeshBasicMaterial({ color: '#ffd8a8' });
  let plan = [];

  function schedule(level, sol) {
    clear();
    plan = [];
    // 1–2 meteor showers per sol, later sols have more
    const showers = sol >= 4 ? 2 : 1;
    for (let i = 0; i < showers; i++) plan.push({ t: 20 + Math.random() * 100, type: 'meteor' });
    if (Math.random() < 0.5) plan.push({ t: 15 + Math.random() * 100, type: 'glitch' });
    if (level === 'mars' && Math.random() < 0.55) plan.push({ t: 25 + Math.random() * 60, type: 'dust' });
    plan.sort((a, b) => a.t - b.t);
  }

  function clear() {
    strikes.forEach((s) => { group.remove(s.ring, s.fill, s.rock); });
    strikes.length = 0;
  }

  function startShower(playerPos) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 12;
      const x = playerPos.x + Math.cos(a) * d * (i === 0 ? 0.2 : 1), z = playerPos.z + Math.sin(a) * d * (i === 0 ? 0.2 : 1);
      const y = world.heightAt(x, z) + 0.12;
      const ring = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: 0.9, depthWrite: false }));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: 0.25, depthWrite: false }));
      const rock = new THREE.Mesh(rockGeo, rockMat);
      ring.position.set(x, y, z); fill.position.set(x, y, z); ring.scale.setScalar(2.6);
      rock.position.set(x + 20, y + 60, z - 10); rock.visible = false;
      group.add(ring, fill, rock);
      strikes.push({ x, y, z, ring, fill, rock, t: -i * 0.45, warn: 2.2 });
    }
  }

  // Returns events for the game: [{type:'meteorHit', near}, {type:'glitch'}, {type:'dustStart'}]
  function update(dt, t, player) {
    const events = [];
    while (plan.length && t >= plan[0].t) {
      const h = plan.shift();
      if (h.type === 'meteor') { startShower(player.pos); events.push({ type: 'meteorWarn' }); }
      else if (h.type === 'glitch') events.push({ type: 'glitch', bar: Math.random() < 0.5 ? 'power' : 'life' });
      else if (h.type === 'dust') events.push({ type: 'dustStart' });
    }
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.t += dt;
      if (s.t < 0) { s.ring.visible = s.fill.visible = false; continue; }
      s.ring.visible = s.fill.visible = true;
      const k = Math.min(1, s.t / s.warn);
      s.fill.scale.setScalar(2.6 * k);
      s.ring.material.opacity = 0.5 + Math.sin(s.t * 18) * 0.4;
      // the falling rock
      s.rock.visible = s.t > s.warn - 0.5;
      if (s.rock.visible) {
        const f = (s.t - (s.warn - 0.5)) / 0.5;
        s.rock.position.set(s.x + 20 * (1 - f), s.y + 60 * (1 - f), s.z - 10 * (1 - f));
      }
      if (s.t >= s.warn) {
        const p = new THREE.Vector3(s.x, s.y, s.z);
        fx.dust(p, 14, 1.8, '#e0c9a8');
        const dist = Math.hypot(player.pos.x - s.x, player.pos.z - s.z);
        events.push({ type: 'impact', near: dist < 2.7 && player.mode === 'walk', dist });
        group.remove(s.ring, s.fill, s.rock);
        strikes.splice(i, 1);
      }
    }
    return events;
  }

  // shower(pos): only the visual shower (the Emergency-card system applies the damage)
  return { schedule, update, clear, shower: startShower };
}
