// =====================================================================
// HUD – everything drawn on top of the 3D view:
// core bars, stamina, buffs, compass, minimap, toasts, "+12" popups.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);

// Small line icons (inline SVG paths, 24x24).
export const ICONS = {
  power: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  life: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  rad: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  speed: '<path d="M13 4v6h6M11 20v-6H5"/><path d="M20 4 13 11M4 20l7-7"/>',
  scanner: '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
};
export function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}
const BAR_NAMES = { power: 'Power', life: 'Life Support', rad: 'Radiation Safety' };

export function createHud(world) {
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

  // ----- compass: letters every 45° -----
  const PX_PER_DEG = 3;
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const strip = $('compassStrip');
  let html = '';
  for (let rep = -1; rep <= 1; rep++) {
    for (let i = 0; i < 360; i += 15) {
      const x = (i + rep * 360) * PX_PER_DEG;
      const main = i % 45 === 0;
      html += `<span class="tick${main ? ' main' : ''}" style="left:${x}px">${main ? labels[i / 45] : '·'}</span>`;
    }
  }
  strip.innerHTML = html;

  // ----- minimap: draw the terrain once into an image -----
  const mm = $('minimap'), ctx = mm.getContext('2d');
  const S = mm.width, worldSize = CONFIG.world.size;
  const toMap = (x, z) => [(x / worldSize + 0.5) * S, (z / worldSize + 0.5) * S];
  const bg = document.createElement('canvas'); bg.width = bg.height = S;
  {
    const b = bg.getContext('2d'), img = b.createImageData(S, S);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = (px / S - 0.5) * worldSize, z = (py / S - 0.5) * worldSize;
      const h = world.heightAt(x, z), hx = world.heightAt(x + 2, z);
      const crater = world.craterAt(x, z);
      let v = 70 + h * 2.2 + (hx - h) * 14;
      v = Math.max(25, Math.min(200, v));
      const i = (py * S + px) * 4;
      if (crater && crater.ice) { img.data[i] = v * 0.75; img.data[i + 1] = v * 0.95; img.data[i + 2] = Math.min(255, v * 1.3); }
      else { img.data[i] = v * 0.92; img.data[i + 1] = v * 0.95; img.data[i + 2] = v * 1.05; }
      img.data[i + 3] = 255;
    }
    b.putImageData(img, 0, 0);
  }

  let lastMap = 0;
  function drawMinimap(t, player, rig, loot, scannerOn) {
    if (t - lastMap < 0.1) return;          // 10 times a second is enough
    lastMap = t;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(bg, 0, 0);
    // landmarks
    for (const l of world.landmarks) {
      const [x, y] = toMap(l.x, l.z);
      if (l.type === 'base') { ctx.fillStyle = '#e8f22a'; ctx.fillRect(x - 5, y - 5, 10, 10); }
      else if (l.type === 'hut') { ctx.fillStyle = '#9db4ff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      else if (l.type === 'ice') { ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    // loot pings: nearby only, or everything with the scanner
    const range = scannerOn ? 9999 : 45;
    for (const it of loot.items) {
      if (!it.active) continue;
      if (Math.hypot(it.x - player.pos.x, it.z - player.pos.z) > range) continue;
      const [x, y] = toMap(it.x, it.z);
      ctx.fillStyle = it.rarity.color;
      ctx.beginPath(); ctx.arc(x, y, it.rarity.id === 'common' ? 1.6 : 2.4, 0, Math.PI * 2); ctx.fill();
    }
    // view cone + player arrow
    const [px, py] = toMap(player.pos.x, player.pos.z);
    const f = rig.forward();
    const ang = Math.atan2(f.z, f.x);
    ctx.fillStyle = 'rgba(232,242,42,0.14)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 30, ang - 0.5, ang + 0.5); ctx.closePath(); ctx.fill();
    ctx.translate(px, py); ctx.rotate(Math.atan2(Math.sin(player.facing), Math.cos(player.facing)) * -1 + Math.PI);
    ctx.fillStyle = '#e8f22a'; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // north marker
    ctx.fillStyle = '#e8f22a'; ctx.font = '700 14px Orbitron, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N', S / 2, 16);
  }

  // ----- bars -----
  const barEls = {};
  document.querySelectorAll('.bar[data-bar]').forEach(el => {
    barEls[el.dataset.bar] = { el, num: el.querySelector('.bar-num'), fill: el.querySelector('.bar-track i') };
  });
  const staminaFill = document.querySelector('.stamina .bar-track i');
  function updateBars(bars, player) {
    for (const k in barEls) {
      const v = Math.round(bars[k]);
      const b = barEls[k];
      b.num.textContent = v;
      b.fill.style.width = bars[k] + '%';
      b.el.classList.toggle('warn', v <= 50 && v > 25);
      b.el.classList.toggle('danger', v <= 25);
    }
    staminaFill.style.width = (player.stamina / CONFIG.player.staminaMax * 100) + '%';
    staminaFill.parentElement.classList.toggle('exhausted', player.exhausted);
  }

  function updateBuffs(buffs) {
    $('buffs').innerHTML = Object.entries(buffs).filter(([, s]) => s > 0)
      .map(([id, s]) => `<span class="buff">${icon(id)}${id === 'speed' ? 'Speed boots' : 'Scanner'} ${Math.ceil(s)}s</span>`).join('');
  }

  function updateCompass(rig) {
    strip.style.transform = `translateX(${-rig.heading() * PX_PER_DEG}px)`;
  }

  // ----- toasts (short messages) -----
  function toast(text, kind = 'info', seconds = 2.6) {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = text;
    $('toasts').prepend(el);
    setTimeout(() => el.classList.add('out'), seconds * 1000);
    setTimeout(() => el.remove(), seconds * 1000 + 400);
    while ($('toasts').children.length > 4) $('toasts').lastChild.remove();
  }

  // ----- "+12 Power" popups that float up from the item -----
  const v = new THREE.Vector3();
  function popup(text, color, worldPos, camera) {
    v.copy(worldPos).project(camera);
    if (v.z > 1) return;
    const el = document.createElement('div');
    el.className = 'popup';
    el.style.color = color;
    el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px';
    el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    el.textContent = text;
    $('popups').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  let comboTimer = 0;
  function combo(n) {
    const el = $('combo');
    if (n < 2) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = `Combo ×${n}!`;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { el.hidden = true; }, CONFIG.loot.comboWindow * 1000);
  }

  return { drawMinimap, updateBars, updateBuffs, updateCompass, toast, popup, combo, BAR_NAMES };
}
