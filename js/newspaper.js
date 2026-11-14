// =====================================================================
// NEWSPAPER – "The Sol Times" front page, drawn on a <canvas> so it can
// be downloaded as a PNG. Serif masthead, a drawn photo of the outpost,
// a stats box and two columns of text.
// =====================================================================

function wrap(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lineH; }
    else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}
function seeded(seed) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

function drawOutpost(ctx, x, y, w, h, p) {
  const mars = p.level === 'mars', rnd = seeded(mars ? 7 : 3);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  if (mars) { sky.addColorStop(0, '#d9a16f'); sky.addColorStop(1, '#f0c79a'); } else { sky.addColorStop(0, '#03050d'); sky.addColorStop(1, '#16203f'); }
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  if (!mars) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) ctx.fillRect(x + rnd() * w, y + rnd() * h * 0.6, rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1);
    const ex = x + w * 0.82, ey = y + h * 0.2;
    ctx.fillStyle = '#3b7bd9'; ctx.beginPath(); ctx.arc(ex, ey, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#4fbf6a'; ctx.beginPath(); ctx.ellipse(ex - 6, ey - 4, 10, 7, 0.5, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,240,210,.85)'; ctx.beginPath(); ctx.arc(x + w * 0.8, y + h * 0.18, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#b4643c'; ctx.beginPath(); ctx.moveTo(x, y + h * 0.62);
    for (let hx = 0; hx <= w; hx += 40) ctx.lineTo(x + hx, y + h * 0.56 + Math.sin(hx / 70) * 14 + rnd() * 8);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  }
  const gy = y + h * 0.66;
  ctx.fillStyle = mars ? '#a9532f' : '#8c8f9b'; ctx.fillRect(x, gy, w, h);
  ctx.fillStyle = mars ? '#8f4325' : '#757884';
  for (let c = 0; c < 12; c++) { ctx.beginPath(); ctx.ellipse(x + rnd() * w, gy + 14 + rnd() * (h * 0.3), 10 + rnd() * 26, 4 + rnd() * 6, 0, 0, 7); ctx.fill(); }
  // footprints
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse(x + 60 + i * 22, gy + 70 - i * 2 + (i % 2) * 6, 4, 6, 0.3, 0, 7); ctx.fill(); }
  for (let pnl = 0; pnl < 3; pnl++) {
    const px = x + 30 + pnl * 70, py = gy - 44;
    ctx.fillStyle = '#5b5f6b'; ctx.fillRect(px + 30, py + 30, 4, 22);
    ctx.fillStyle = '#1d3b8a'; ctx.beginPath(); ctx.moveTo(px, py + 34); ctx.lineTo(px + 64, py + 34); ctx.lineTo(px + 56, py); ctx.lineTo(px + 8, py); ctx.fill();
  }
  const dome = (cx, r, color) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, gy + 6, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#2b3a66'; ctx.fillRect(cx - r * 0.5, gy - r * 0.45, r, r * 0.16);
  };
  dome(x + w * 0.55, 62, '#eef1f8'); dome(x + w * 0.74, 40, '#dfe3ee');
  // rover
  const rx = x + w * 0.3, ry = gy + 40;
  ctx.fillStyle = p.roverColor || '#eef1f8'; ctx.fillRect(rx, ry - 16, 60, 16);
  ctx.fillStyle = '#2f5bd6'; ctx.fillRect(rx + 6, ry - 22, 40, 5);
  ctx.fillStyle = '#3a3f52'; [rx + 8, rx + 30, rx + 52].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, ry, 7, 0, 7); ctx.fill(); });
  // astronaut with suit colour
  const ax = x + w * 0.88, ay = gy + 30;
  ctx.fillStyle = '#f2f4fa'; ctx.beginPath(); ctx.arc(ax, ay - 34, 9, 0, 7); ctx.fill();
  ctx.fillRect(ax - 9, ay - 26, 18, 24);
  ctx.fillStyle = p.suitColor || '#e8f22a'; ctx.fillRect(ax - 9, ay - 14, 18, 4);
  ctx.fillStyle = '#152044'; ctx.beginPath(); ctx.arc(ax, ay - 34, 6, 0, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}

export function drawNewspaper(cv, p) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, M = 50;
  const serif = 'Georgia, "Times New Roman", serif', ink = '#1b1b1b', soft = '#4a4a4a';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.fillStyle = soft; ctx.font = '16px ' + serif;
  ctx.textAlign = 'left'; ctx.fillText(`VOL. 1 · SOL ${p.solsDone}`, M, 56);
  ctx.textAlign = 'right'; ctx.fillText(`${p.levelName.toUpperCase()} EDITION`, W - M, 56);
  ctx.textAlign = 'center';
  ctx.fillStyle = ink; ctx.font = 'bold 86px ' + serif; ctx.fillText('The Sol Times', W / 2, 140);
  ctx.fillRect(M, 160, W - 2 * M, 3); ctx.fillRect(M, 167, W - 2 * M, 1);
  ctx.font = 'italic 19px ' + serif; ctx.fillStyle = soft;
  ctx.fillText('Junior Astronaut Mission Trainer · Storm Royale', W / 2, 192);
  ctx.fillStyle = ink; ctx.fillRect(M, 204, W - 2 * M, 1);
  ctx.font = 'bold 50px ' + serif;
  let y = wrap(ctx, p.headline, W / 2, 266, W - 2 * M, 58);
  ctx.font = 'italic 24px ' + serif; ctx.fillStyle = soft;
  ctx.fillText(`Rank: ${p.rank} · ${p.solsDone} of ${p.total} sols`, W / 2, y + 4);
  y += 34; ctx.fillStyle = ink; ctx.fillRect(M, y, W - 2 * M, 1); y += 22;
  const gap = 24, photoW = Math.round((W - 2 * M) * 0.64), sideX = M + photoW + gap, sideW = W - M - sideX, photoH = 360;
  drawOutpost(ctx, M, y, photoW, photoH, p);
  ctx.font = 'italic 17px ' + serif; ctx.fillStyle = soft; ctx.textAlign = 'left';
  wrap(ctx, `The ${p.levelName} outpost after the mission. Crew: Commander ${p.name}, Captain Ayesha, Engineer Bilal, Dr. Zara and Pilot Hamza.`, M, y + photoH + 24, photoW, 22);
  ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.strokeRect(sideX, y, sideW, photoH);
  ctx.fillStyle = ink; ctx.fillRect(sideX, y, sideW, 40);
  ctx.fillStyle = '#f2ead8'; ctx.font = 'bold 18px ' + serif; ctx.textAlign = 'center';
  ctx.fillText('MISSION STATS', sideX + sideW / 2, y + 27);
  p.stats.forEach((st, i) => {
    const sy = y + 92 + i * 76;
    ctx.fillStyle = ink; ctx.font = 'bold 38px ' + serif; ctx.fillText(st[0], sideX + sideW / 2, sy);
    ctx.fillStyle = soft; ctx.font = '16px ' + serif; ctx.fillText(st[1], sideX + sideW / 2, sy + 24);
    if (i < p.stats.length - 1) { ctx.fillStyle = '#c9bfa8'; ctx.fillRect(sideX + 20, sy + 40, sideW - 40, 1); }
  });
  y += photoH + 64; ctx.fillStyle = ink; ctx.fillRect(M, y, W - 2 * M, 2); y += 36;
  const colW = (W - 2 * M - gap) / 2, c1 = M, c2 = M + colW + gap;
  ctx.fillRect(c1 + colW + gap / 2, y - 14, 1, H - y - 60);
  ctx.textAlign = 'left'; ctx.font = 'bold 22px ' + serif; ctx.fillStyle = ink;
  ctx.fillText('MISSION REPORT', c1, y); ctx.fillText('SCIENCE CORNER', c2, y);
  ctx.font = '19px ' + serif;
  let y1 = wrap(ctx, p.story, c1, y + 34, colW, 27);
  if (p.biggestFlare) wrap(ctx, `The biggest storm was a class ${p.biggestFlare.class} solar flare from ${p.biggestFlare.date}. It really happened: it comes from archived NASA DONKI data.`, c1, y1 + 8, colW, 27);
  if (p.fact) {
    const y2 = wrap(ctx, p.fact.text, c2, y + 34, colW, 27);
    ctx.font = 'italic 16px ' + serif; ctx.fillStyle = soft;
    wrap(ctx, `— ${p.fact.source} (archived NASA data)`, c2, y2 + 6, colW, 22);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = ink; ctx.fillRect(M, H - 82, W - 2 * M, 1);
  ctx.font = '16px ' + serif; ctx.fillStyle = soft;
  ctx.fillText('Data: NASA CCMC DONKI, NASA OSDR, RadLab, Mars Trek (archived NASA data)', W / 2, H - 56);
  ctx.fillText('Survive the Sol: Storm Royale · TechNest Thinkers · NASA Space Apps Challenge 2026', W / 2, H - 34);
}

export function downloadCanvas(canvas, name) {
  const a = document.createElement('a');
  a.download = `sol-times-${(name || 'commander').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a); a.click(); a.remove();
}
