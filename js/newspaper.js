// =====================================================================
// NEWSPAPER – "The Moon Times" / "The Mars Times" front page, drawn on a
// <canvas> (860×1120 = 2× the 430×560 design size) so it can be
// downloaded as a PNG. Matches design/Win.dc.html.
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
// Split text into lines that fit (for the two columns).
function lines(ctx, text, maxW) {
  const out = []; let line = '';
  for (const w of String(text).split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function drawPhoto(ctx, x, y, w, h, p) {
  const mars = p.level === 'mars';
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (mars) { g.addColorStop(0, '#6b3424'); g.addColorStop(1, '#c0805a'); } else { g.addColorStop(0, '#23263a'); g.addColorStop(1, '#6d7186'); }
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  // stars / Earth
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 30; i++) ctx.fillRect(x + ((i * 97) % w), y + ((i * 53) % (h * 0.45)), 2, 2);
  if (!mars) { ctx.fillStyle = '#3b7bd9'; ctx.beginPath(); ctx.arc(x + w * 0.82, y + 60, 26, 0, 7); ctx.fill(); }
  // ground + dome (like the design)
  ctx.fillStyle = mars ? '#a9532f' : '#8c8f9b'; ctx.fillRect(x, y + h - 50, w, 50);
  ctx.fillStyle = '#dfe3ee';
  ctx.beginPath(); ctx.arc(x + w / 2, y + h - 50, 120, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#2b3a66'; ctx.fillRect(x + w / 2 - 60, y + h - 130, 120, 16);
  // astronaut with suit colour
  const ax = x + w * 0.82, ay = y + h - 50;
  ctx.fillStyle = '#f2f4fa'; ctx.beginPath(); ctx.arc(ax, ay - 70, 16, 0, 7); ctx.fill(); ctx.fillRect(ax - 16, ay - 56, 32, 50);
  ctx.fillStyle = p.suitColor || '#e8f22a'; ctx.fillRect(ax - 16, ay - 30, 32, 6);
  ctx.fillStyle = '#152044'; ctx.beginPath(); ctx.arc(ax, ay - 70, 10, 0, 7); ctx.fill();
}

export function drawNewspaper(cv, p) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, M = 52;
  const serif = 'Georgia, "Times New Roman", serif', ink = '#1b1b1b';
  ctx.fillStyle = '#f4efe3'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ink; ctx.textAlign = 'center';
  ctx.font = `bold 68px ${serif}`;
  ctx.fillText(p.title, W / 2, M + 60);
  ctx.fillRect(M, M + 84, W - 2 * M, 3); ctx.fillRect(M, M + 91, W - 2 * M, 3);
  ctx.font = `22px ${serif}`; ctx.textAlign = 'left';
  ctx.fillText(p.edition, M, M + 124);
  ctx.textAlign = 'right'; ctx.fillText(`DAY ${p.day}`, W - M, M + 124);
  ctx.fillRect(M, M + 138, W - 2 * M, 2);
  ctx.textAlign = 'left'; ctx.font = `bold 58px ${serif}`;
  let y = wrap(ctx, p.headline, M, M + 206, W - 2 * M, 64);
  y += 6;
  const photoH = 300;
  drawPhoto(ctx, M, y, W - 2 * M, photoH, p);
  y += photoH + 40;
  // two columns of story
  ctx.font = `26px ${serif}`; ctx.fillStyle = ink;
  const colW = (W - 2 * M - 32) / 2, lh = 39;
  const all = lines(ctx, p.story, colW);
  const perCol = Math.max(1, Math.floor((H - M - y) / lh));
  all.slice(0, perCol).forEach((l, i) => ctx.fillText(l, M, y + i * lh));
  all.slice(perCol, perCol * 2).forEach((l, i) => ctx.fillText(l, M + colW + 32, y + i * lh));
}

export function downloadCanvas(canvas, name, title) {
  const a = document.createElement('a');
  a.download = `${(title || 'the-moon-times').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(name || 'commander').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a); a.click(); a.remove();
}
