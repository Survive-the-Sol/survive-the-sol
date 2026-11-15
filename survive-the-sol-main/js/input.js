// =====================================================================
// INPUT – keyboard + phone touch controls in one place.
// input.down('KeyW') → is it held now?   input.pressed('Space') → pressed this frame?
// Touch buttons call input.virtualDown/virtualUp with the same key codes,
// and the touch joystick sets input.stick, so the game code is the same.
// =====================================================================

const held = new Set();
const virtual = new Set();
const justPressed = new Set();
const listeners = [];

window.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (!held.has(e.code)) { justPressed.add(e.code); listeners.forEach((fn) => fn(e.code, e)); }
  held.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => { held.clear(); virtual.clear(); });

export const input = {
  enabled: true,
  stick: { x: 0, y: 0 },     // touch joystick (-1..1)
  down(code) { return this.enabled && (held.has(code) || virtual.has(code)); },
  pressed(code) { return this.enabled && justPressed.has(code); },
  any(...codes) { return codes.some((c) => this.down(c)); },
  onKey(fn) { listeners.push(fn); },
  virtualDown(code) { if (!virtual.has(code)) { justPressed.add(code); listeners.forEach((fn) => fn(code, null)); } virtual.add(code); },
  virtualUp(code) { virtual.delete(code); },
  endFrame() { justPressed.clear(); },
  // x = right(+)/left(-), y = forward(+)/back(-)
  moveAxis() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.stick.x, y = this.stick.y;
    if (held.has('KeyW') || held.has('ArrowUp')) y += 1;
    if (held.has('KeyS') || held.has('ArrowDown')) y -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  },
};

// ---------- phone controls ----------
// joystickEl: the round pad (left). buttons: elements with data-key="Space" etc.
export function setupTouch(joystickEl, knobEl, buttons) {
  let id = null, cx = 0, cy = 0;
  const R = 55;
  joystickEl.addEventListener('pointerdown', (e) => {
    id = e.pointerId; const r = joystickEl.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    joystickEl.setPointerCapture(id); move(e);
  });
  function move(e) {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    input.stick.x = dx / R; input.stick.y = -dy / R;
  }
  function end(e) {
    if (e.pointerId !== id) return;
    id = null; input.stick.x = 0; input.stick.y = 0; knobEl.style.transform = '';
  }
  joystickEl.addEventListener('pointermove', move);
  joystickEl.addEventListener('pointerup', end);
  joystickEl.addEventListener('pointercancel', end);

  buttons.forEach((b) => {
    const code = b.dataset.key;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); input.virtualDown(code); b.classList.add('on'); });
    const up = () => { input.virtualUp(code); b.classList.remove('on'); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });
}
