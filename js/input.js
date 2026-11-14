// =====================================================================
// INPUT – keyboard and mouse.
// input.down('KeyW') → is the key held now?
// input.pressed('Space') → was it pressed since the last frame?
// Mouse drag on the game view rotates the camera (see camera.js).
// =====================================================================

const held = new Set();
const justPressed = new Set();
const listeners = [];

window.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (!held.has(e.code)) justPressed.add(e.code);
  held.add(e.code);
  // stop the page from scrolling with arrows / space
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  listeners.forEach(fn => fn(e.code));
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());   // no "stuck" keys when the window loses focus

export const input = {
  down: (code) => held.has(code),
  pressed: (code) => justPressed.has(code),
  any: (...codes) => codes.some(c => held.has(c)),
  onKey: (fn) => listeners.push(fn),
  endFrame: () => justPressed.clear(),
  // Movement as numbers: x = right(+)/left(-), y = forward(+)/back(-)
  moveAxis() {
    let x = 0, y = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) y += 1;
    if (held.has('KeyS') || held.has('ArrowDown')) y -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  },
};
