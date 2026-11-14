// =====================================================================
// HUD – everything drawn on top of the 3D view: core bars, stamina,
// card badge, compass, storm timer, real-flare chip/banner, minimap,
// leaderboard, event feed, quick slots, backpack screen, popups.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { LOOT_TYPES, describeItem } from './loot.js';

const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Line icons (24x24 SVG paths, drawn in the style of Lucide icons – original paths).
const P = {
  power: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  life: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  rad: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  radio: '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  volumeOn: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  volumeOff: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="m22 9-6 6M16 9l6 6"/>',
  speed: '<path d="M13 4v6h6M11 20v-6H5"/><path d="M20 4 13 11M4 20l7-7"/>',
  scanner: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18 6"/>',
  ice: '<path d="m12 2 7 6-2 10-5 4-5-4-2-10z"/><path d="M12 2v20"/>',
  battery: '<rect x="7" y="4" width="10" height="17" rx="2"/><path d="M10 2h4M12 9l-2 4h4l-2 4"/>',
  solar: '<rect x="3" y="6" width="18" height="10" rx="1"/><path d="M3 11h18M9 6v10M15 6v10M12 16v4M8 20h8"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  oxygen: '<rect x="8" y="5" width="8" height="16" rx="4"/><path d="M10 2h4v3h-4zM12 10v6"/>',
  medkit: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M12 10v7M8.5 13.5h7"/>',
  boots: '<path d="M7 3v10l-3 3v3h16v-2c0-2-2-3-4-3l-3-1V3z"/>',
  card: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  star: '<polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 15v2c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 15v2c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M15 14c.2-1 .7-1.7 1.5-2.5A4.6 4.6 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  planet: '<circle cx="12" cy="12" r="6"/><path d="M4.9 15.4C2.4 17.2 1.3 19 2 19.9c1.2 1.6 7.4-1 13.6-5.9 6.2-4.8 9.5-9.3 8.3-10.9-.6-.9-2.5-.6-5 .6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  rover: '<path d="M3 15h18v-4l-3-4H8L5 11H3z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.info}</svg>`;
}
export const BAR_NAMES = { power: 'Power', life: 'Life Support', rad: 'Radiation Safety' };
export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export function createHud() {
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

  // ----- compass -----
  const PX_PER_DEG = 3, labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  let html = '';
  for (let rep = -1; rep <= 1; rep++) for (let i = 0; i < 360; i += 15) {
    const main = i % 45 === 0;
    html += `<span class="tick${main ? ' main' : ''}" style="left:${(i + rep * 360) * PX_PER_DEG}px">${main ? labels[i / 45] : '·'}</span>`;
  }
  $('compassStrip').innerHTML = html;

  // ----- minimap -----
  const mm = $('minimap'), ctx = mm.getContext('2d');
  const S = mm.width, WS = CONFIG.world.size;
  const toMap = (x, z) => [(x / WS + 0.5) * S, (z / WS + 0.5) * S];
  const bg = document.createElement('canvas'); bg.width = bg.height = S;
  let world = null;

  function setWorld(w, marsImage) {
    world = w;
    const b = bg.getContext('2d'), img = b.createImageData(S, S);
    const mars = w.level === 'mars';
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = (px / S - 0.5) * WS, z = (py / S - 0.5) * WS;
      const h = w.heightAt(x, z), hx = w.heightAt(x + 2, z);
      const cr = w.craterAt(x, z);
      let v = Math.max(25, Math.min(200, 70 + h * 2.2 + (hx - h) * 14));
      const i = (py * S + px) * 4;
      if (cr && cr.ice) { img.data[i] = v * 0.75; img.data[i + 1] = v * 0.95; img.data[i + 2] = Math.min(255, v * 1.3); }
      else if (mars) { img.data[i] = Math.min(255, v * 1.35); img.data[i + 1] = v * 0.72; img.data[i + 2] = v * 0.5; }
      else { img.data[i] = v * 0.92; img.data[i + 1] = v * 0.95; img.data[i + 2] = v * 1.05; }
      img.data[i + 3] = 255;
    }
    b.putImageData(img, 0, 0);
    if (mars && marsImage) {   // blend in the real Mars Trek imagery (same crop as the ground texture)
      b.globalAlpha = 0.55; b.globalCompositeOperation = 'overlay';
      const iw = marsImage.width, ih = marsImage.height;
      b.drawImage(marsImage, iw * 0.18, 0, iw * 0.3, ih, 0, 0, S, S);
      b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
    }
    $('minimapLabel').textContent = mars ? 'Mars · imagery: NASA Mars Trek' : 'Moon';
  }

  let lastMap = 0;
  function drawMinimap(t, s) {
    if (t - lastMap < 0.08 || !world) return;
    lastMap = t;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(bg, 0, 0);
    const k = S / WS;
    // storm zone: red outside, white next circle, yellow final
    if (s.storm && s.storm.shelter) {
      const [cx, cy] = toMap(s.storm.shelter.x, s.storm.shelter.z);
      if (s.storm.stage !== 'calm' || s.showZoneEarly) {
        ctx.fillStyle = 'rgba(255,60,110,0.28)';
        ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(cx, cy, s.storm.r * k, 0, Math.PI * 2, true); ctx.fill('evenodd');
        ctx.strokeStyle = '#ff6b8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, s.storm.r * k, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, s.storm.nextR * k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = '#e8f22a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, s.storm.finalR * k), 0, Math.PI * 2); ctx.stroke();
      drawStar(cx, cy, 7, '#e8f22a');
    }
    // landmarks
    for (const l of world.landmarks) {
      const [x, y] = toMap(l.x, l.z);
      if (l.type === 'base') { ctx.fillStyle = '#e8f22a'; ctx.fillRect(x - 4, y - 4, 8, 8); }
      else if (l.type === 'hut') { ctx.fillStyle = '#9db4ff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      else if (l.type === 'bunker') { ctx.fillStyle = '#ffc94a'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      else if (l.type === 'ice') { ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // flight path
    if (s.flightPath) {
      const [x1, y1] = toMap(s.flightPath.from.x, s.flightPath.from.z), [x2, y2] = toMap(s.flightPath.to.x, s.flightPath.to.z);
      ctx.strokeStyle = 'rgba(232,242,42,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      if (s.landerPos) { const [lx, ly] = toMap(s.landerPos.x, s.landerPos.z); drawStar(lx, ly, 5, '#ffffff'); }
    }
    // loot pings
    const range = s.scanner ? 9999 : 40;
    for (const it of s.loot) {
      if (Math.hypot(it.x - s.player.x, it.z - s.player.z) > range && !it.airdrop) continue;
      const [x, y] = toMap(it.x, it.z);
      ctx.fillStyle = it.rarity.color;
      ctx.beginPath(); ctx.arc(x, y, it.rarity.points >= 3 ? 2.6 : 1.7, 0, Math.PI * 2); ctx.fill();
    }
    // airdrops
    for (const p of s.pods || []) {
      const [x, y] = toMap(p.x, p.z);
      const pulse = 4 + Math.sin(t * 6) * 2;
      ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y - pulse - 2); ctx.lineTo(x + pulse, y); ctx.lineTo(x, y + pulse + 2); ctx.lineTo(x - pulse, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // rovers
    for (const r of s.rovers || []) {
      const [x, y] = toMap(r.pos.x, r.pos.z);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 1;
      ctx.fillRect(x - 3.5, y - 3.5, 7, 7); ctx.strokeRect(x - 3.5, y - 3.5, 7, 7);
    }
    // bots
    for (const b of s.bots || []) {
      if (b.state === 'waiting') continue;
      const [x, y] = toMap(b.pos.x, b.pos.z);
      ctx.fillStyle = b.color; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // player
    const [px, py] = toMap(s.player.x, s.player.z);
    const ang = Math.atan2(s.forward.z, s.forward.x);
    ctx.fillStyle = 'rgba(232,242,42,0.16)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 28, ang - 0.5, ang + 0.5); ctx.closePath(); ctx.fill();
    ctx.translate(px, py); ctx.rotate(Math.PI - s.facing);
    ctx.fillStyle = '#e8f22a'; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 5.5); ctx.lineTo(0, 2.5); ctx.lineTo(-5.5, 5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#e8f22a'; ctx.font = '700 15px Orbitron, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N', S / 2, 17);
  }
  function drawStar(x, y, r, color) {
    ctx.fillStyle = color; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // ----- bars -----
  const barEls = {};
  document.querySelectorAll('.bar[data-bar]').forEach((el) => {
    barEls[el.dataset.bar] = { el, num: el.querySelector('.bar-num'), fill: el.querySelector('.bar-track i'), flash: el.querySelector('.bar-track em') };
  });
  const staminaFill = document.querySelector('.stamina .bar-track i');
  function updateBars(bars, player) {
    for (const k in barEls) {
      const v = Math.round(bars[k]), b = barEls[k];
      if (b.num.textContent !== String(v)) b.num.textContent = v;
      b.fill.style.width = bars[k] + '%';
      b.el.classList.toggle('warn', v <= 50 && v > 25);
      b.el.classList.toggle('danger', v <= 25);
    }
    staminaFill.style.width = Math.min(100, player.stamina / (player.staminaMax || 100) * 100) + '%';
    staminaFill.parentElement.classList.toggle('exhausted', player.exhausted);
  }
  // "+12" / "−8" floating next to a bar
  function barDelta(bar, amount) {
    if (!barEls[bar] || Math.abs(amount) < 0.5) return;
    const el = document.createElement('span');
    el.className = 'bar-delta ' + (amount > 0 ? 'up' : 'down');
    el.textContent = (amount > 0 ? '+' : '−') + Math.round(Math.abs(amount));
    barEls[bar].el.appendChild(el);
    barEls[bar].el.classList.remove('hit-up', 'hit-down'); void barEls[bar].el.offsetWidth;
    barEls[bar].el.classList.add(amount > 0 ? 'hit-up' : 'hit-down');
    setTimeout(() => el.remove(), 1300);
  }

  function cardBadge(card, mod) {
    const el = $('cardBadge');
    if (!card) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `${icon('card')}<span><b>${esc(card.title)}</b><small>${esc(mod.desc)}</small></span>`;
  }
  function buffs(b) {
    $('buffs').innerHTML = Object.entries(b).filter(([, s]) => s > 0)
      .map(([id, s]) => `<span class="buff">${icon(id)}${id === 'speed' ? 'Speed boots' : 'Scanner'} ${Math.ceil(s)}s</span>`).join('');
  }
  function compass(rig) { $('compassStrip').style.transform = `translateX(${-rig.heading() * PX_PER_DEG}px)`; }

  function zone(info) {
    $('zoneLabel').textContent = info.label;
    $('zoneTime').textContent = fmtTime(info.seconds);
    $('zoneChip').dataset.stage = info.stage;
  }
  function flareChip(flare) {
    const el = $('flareChip');
    if (!flare) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `${icon('flame')}<b>${esc(flare.class)} solar flare</b> · ${esc(flare.date)} <span>Source: NASA CCMC DONKI · archived NASA data</span>`;
  }
  function stormBanner(flare, power, show) {
    const el = $('stormBanner');
    if (!show) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<p class="sb-kicker">${icon('alert')} Solar storm warning</p>
      <h2>${esc(flare.class)} solar flare · ${esc(flare.date)}</h2>
      <p class="sb-label">${esc(flare.kid_label.replace(/!$/, ''))} · ${esc(power.label)}. Get inside the safe zone and reach the shelter!</p>
      <p class="sb-source">${icon('database')} Source: NASA CCMC DONKI · archived NASA data (not live)</p>`;
  }

  function leaderboard(rows) {
    $('leaderboard').innerHTML = `<p class="lb-title">${icon('users')} Crew race</p>` + rows.map((r, i) =>
      `<p class="lb-row${r.you ? ' you' : ''}"><span class="lb-pos">${i + 1}</span><i style="background:${r.color}"></i><span class="lb-name">${esc(r.name)}</span>
       <span class="lb-pts">${r.points}</span>${r.home ? `<span class="lb-home" title="In the shelter">${icon('check')}</span>` : ''}</p>`).join('');
  }

  function feed(text, kind = 'info') {
    const el = document.createElement('p');
    el.className = 'feed-item ' + kind;
    el.innerHTML = text;
    const f = $('feed');
    f.prepend(el);
    while (f.children.length > 5) f.lastChild.remove();
    setTimeout(() => el.classList.add('old'), 6000);
    setTimeout(() => el.remove(), 9000);
  }

  function quickslots(bp) {
    let h = '';
    for (let i = 0; i < 4; i++) {
      const it = bp.slots[i];
      h += `<button type="button" class="qslot${it ? '' : ' empty'}" data-slot="${i}" ${it ? `style="--rc:${it.rarity.color}"` : ''} aria-label="${it ? 'Use ' + LOOT_TYPES[it.type].label : 'Empty slot ' + (i + 1)}">
        <span class="qkey">${i + 1}</span>${it ? icon(LOOT_TYPES[it.type].icon) : ''}</button>`;
    }
    h += `<span class="qcount">${bp.count()}/${bp.size}</span>`;
    $('quickslots').innerHTML = h;
  }

  function renderBag(bp, selected) {
    $('bagLevel').textContent = `Level ${bp.level}${bp.bonus ? ' +' + bp.bonus : ''} · ${bp.count()}/${bp.size} slots`;
    $('bagGrid').innerHTML = bp.slots.map((it, i) => `<button type="button" class="bslot${it ? '' : ' empty'}${selected === i ? ' sel' : ''}" data-bslot="${i}" ${it ? `style="--rc:${it.rarity.color}"` : ''}>
      ${i < 4 ? `<span class="qkey">${i + 1}</span>` : ''}${it ? icon(LOOT_TYPES[it.type].icon) + `<small>${esc(LOOT_TYPES[it.type].label)}</small>` : '<small>empty</small>'}</button>`).join('');
    const it = selected !== null ? bp.slots[selected] : null;
    $('bagDetail').innerHTML = it
      ? `<p><b style="color:${it.rarity.color}">${it.rarity.label}</b> <b>${esc(LOOT_TYPES[it.type].label)}</b>: ${esc(describeItem(it.type, it.rarity))}</p>
         <div class="row"><button type="button" class="btn btn-primary" data-bag="use">Use</button><button type="button" class="btn" data-bag="drop">Drop</button></div>`
      : '<p class="caption">Supplies you still carry when the sol ends are delivered to the base for the night.</p>';
  }

  function prompt(text) { const el = $('prompt'); el.hidden = !text; if (text) el.innerHTML = text; }
  function vignette(level) { $('vignette').style.opacity = level; }

  const v = new THREE.Vector3();
  function popup(text, color, worldPos, camera) {
    v.copy(worldPos).project(camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return;
    const el = document.createElement('div');
    el.className = 'popup'; el.style.color = color;
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
    el.hidden = false; el.textContent = `Combo ×${n}!`;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { el.hidden = true; }, CONFIG.loot.comboWindow * 1000);
  }

  return { setWorld, drawMinimap, updateBars, barDelta, cardBadge, buffs, compass, zone, flareChip, stormBanner,
    leaderboard, feed, quickslots, renderBag, prompt, vignette, popup, combo };
}
