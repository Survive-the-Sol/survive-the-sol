// =====================================================================
// HUD – drawn on top of the 3D view (matches design/Explore + Storm):
// bars top-left, day + storm timer top-centre, minimap top-right,
// ROVI bottom-left, card hand bottom-centre, sound/pause bottom-right,
// danger banner + "USE A CARD!" prompt, floating "+10 Life" pills.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// Simple stroke icons (24x24), as in the design files. No emoji.
const P = {
  power: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  life: '<path d="M12 21s-8-5-8-11a5 5 0 0 1 8-3 5 5 0 0 1 8 3c0 6-8 11-8 11z"/>',
  rad: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
  radio: '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  soundOn: '<path d="M11 5L6 9H3v6h3l5 4z M15.5 8.5a5 5 0 0 1 0 7"/>',
  soundOff: '<path d="M11 5L6 9H3v6h3l5 4z M22 9l-6 6M16 9l6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  meteor: '<circle cx="15" cy="15" r="4"/><path d="M3 3l8 8M7 3l6 6M3 7l6 6"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/><path d="M2 2l20 20"/>',
  dust: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9"/>',
  star: '<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="16" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
};
export function icon(name, size = 20, color = 'currentColor', extra = '') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${P[name] || ''}</svg>`;
}
export function pathIcon(d, size = 28, color = 'currentColor') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}
export function starIcon(on, size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${on ? '#e8f22a' : '#2a3166'}" aria-hidden="true">${P.star}</svg>`;
}
export const BAR_NAMES = { power: 'Power', life: 'Life Support', rad: 'Radiation Safety' };
const BAR_COLOR = { power: '#e8f22a', life: '#7cf5c8', rad: '#8fb0ff' };

export function createHud() {
  document.querySelectorAll('.bar[data-bar]').forEach((el) => {
    const k = el.dataset.bar;
    el.querySelector('.bar-ic').innerHTML = icon(k, 20, BAR_COLOR[k]);
  });
  document.querySelectorAll('[data-icon]').forEach((el) => { if (!el.innerHTML) el.innerHTML = icon(el.dataset.icon, 20); });

  // ----- minimap (round, like the design) -----
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
      const v = Math.max(30, Math.min(150, 72 + h * 1.6 + (hx - h) * 12));
      const i = (py * S + px) * 4;
      if (mars) { img.data[i] = Math.min(255, v * 1.45); img.data[i + 1] = v * 0.75; img.data[i + 2] = v * 0.55; }
      else { img.data[i] = v * 0.98; img.data[i + 1] = v; img.data[i + 2] = v * 1.25; }
      img.data[i + 3] = 255;
    }
    b.putImageData(img, 0, 0);
    if (mars && marsImage) {
      b.globalAlpha = 0.5; b.globalCompositeOperation = 'overlay';
      b.drawImage(marsImage, marsImage.width * 0.18, 0, marsImage.width * 0.3, marsImage.height, 0, 0, S, S);
      b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
    }
  }

  let lastMap = 0;
  function drawMinimap(t, s) {
    if (t - lastMap < 0.08 || !world) return;
    lastMap = t;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(bg, 0, 0);
    const k = S / WS;
    const [bx, by] = toMap(0, 0);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(bx, by, 26, 0, Math.PI * 2); ctx.stroke();
    if (s.zoneR) { ctx.setLineDash([8, 6]); ctx.strokeStyle = '#7cf5c8'; ctx.beginPath(); ctx.arc(bx, by, s.zoneR * k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    for (const it of s.loot) {
      if (!s.scanner && !it.airdrop && Math.hypot(it.x - s.player.x, it.z - s.player.z) > 60) continue;
      const [x, y] = toMap(it.x, it.z);
      ctx.fillStyle = it.airdrop ? '#ffc94a' : (it.mapColor || '#7cf5c8');
      ctx.beginPath(); ctx.arc(x, y, it.airdrop ? 9 : 6, 0, Math.PI * 2); ctx.fill();
    }
    for (const r of s.rovers || []) { const [x, y] = toMap(r.pos.x, r.pos.z); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 6, 12, 12); }
    const [px, py] = toMap(s.player.x, s.player.z);
    ctx.strokeStyle = '#e8f22a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(s.facing) * 30, py + Math.cos(s.facing) * 30); ctx.stroke();
    ctx.fillStyle = '#e8f22a'; ctx.strokeStyle = '#0b1026'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#e8f22a'; ctx.font = '700 24px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N', S / 2, 30);
  }

  // ----- bars -----
  const barEls = {};
  document.querySelectorAll('.bar[data-bar]').forEach((el) => {
    barEls[el.dataset.bar] = { el, num: el.querySelector('.bar-num'), fill: el.querySelector('.bar-track i') };
  });
  const stamina = document.querySelector('.stamina i');
  function updateBars(bars, player, stormy) {
    for (const k in barEls) {
      const v = Math.round(bars[k]), b = barEls[k];
      if (b.num.textContent !== String(v)) b.num.textContent = v;
      b.fill.style.width = bars[k] + '%';
      b.el.classList.toggle('low', v <= 25);
    }
    barEls.rad.el.classList.toggle('storm', !!stormy);
    stamina.style.width = Math.min(100, player.stamina / (player.staminaMax || 100) * 100) + '%';
    stamina.classList.toggle('tired', !!player.exhausted);
  }

  function day(text, label, seconds, urgent) {
    $('dayText').textContent = text;
    $('timerLabel').textContent = label;
    $('timerText').textContent = seconds === null ? '' : fmtTime(seconds);
    $('timerText').classList.toggle('urgent', !!urgent);
  }

  // ----- the card hand -----
  function hand(cards, used, tags, danger) {
    $('hand').innerHTML = cards.map((c, i) => {
      const tag = tags ? tags[i] : (used.has(c.id) ? 'used' : '');
      const label = tag === 'best' ? 'BEST' : tag === 'good' ? 'GOOD' : tag === 'used' ? 'USED' : 'CARD';
      return `<button type="button" class="hcard ${tag}${danger ? ' danger' : ''}" data-card="${i}" ${tag === 'used' ? 'disabled' : ''} aria-label="Card ${i + 1}: ${esc(c.title)}">
        <span class="hc-top"><span class="hc-tag">${label}</span><span class="hc-key">${i + 1}</span></span>
        <span class="hc-title">${esc(c.title)}</span>
        ${danger && tag !== 'used' ? `<span class="hc-cost">−${esc(c.cost.text)}</span>` : ''}
      </button>`;
    }).join('');
  }

  // ----- danger banner (Storm design) -----
  const DANGER_ICON = { solar_storm: 'sun', meteor: 'meteor', power_failure: 'bolt', dust_storm: 'dust' };
  function dangerBanner(d) {
    const el = $('dangerBanner');
    if (!d) { el.hidden = true; return; }
    el.hidden = false;
    el.dataset.type = d.type;
    el.innerHTML = `<div class="db-title">${icon(DANGER_ICON[d.type], 30, '#ffb347')}${esc(d.title)}</div>
      <div class="db-sub">${esc(d.sub)}</div>${d.source ? `<div class="db-src">${esc(d.source)}</div>` : ''}`;
  }
  function useCard(seconds) {
    const el = $('useCard');
    if (seconds === null) { el.hidden = true; return; }
    el.hidden = false;
    $('useCardTime').textContent = fmtTime(seconds);
  }

  function prompt(html) { const el = $('prompt'); el.hidden = !html; if (html) el.innerHTML = html; }
  function vignette(level) { $('vignette').style.opacity = level; }
  function stormLook(on) {
    $('minimapWrap').hidden = on; $('zoneChip').hidden = !on;
    document.body.classList.toggle('in-storm', on);
  }

  const v = new THREE.Vector3();
  function popup(text, bar, worldPos, camera) {
    v.copy(worldPos).project(camera);
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return;
    const el = document.createElement('div');
    el.className = 'popup p-' + bar;
    el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px';
    el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    el.textContent = text;
    $('popups').appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
  function screenPopup(text, bar, offset = 0) {
    const el = document.createElement('div');
    el.className = 'popup p-' + bar;
    el.style.left = '50%'; el.style.top = `calc(40% + ${offset}px)`;
    el.textContent = text;
    $('popups').appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  return { setWorld, drawMinimap, updateBars, day, hand, dangerBanner, useCard, prompt, vignette, stormLook, popup, screenPopup };
}
