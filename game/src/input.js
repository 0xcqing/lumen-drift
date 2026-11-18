// Keyboard and pointer input. Held keys become a movement vector; single presses are queued
// as bit flags so a quick tap between frames is never lost, and the loop takes them exactly
// once. The pointer position stays in client pixels; the renderer converts it to arena units.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_BURST = 4;
export const ACTION_MUTE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  const pointer = {
    x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 0 : window.innerHeight * 0.34,
    inside: false,
  };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });

  // A held key whose keyup lands in another window would stick down forever: let go on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
  });

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
  });

  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
    actions |= ACTION_CONFIRM | ACTION_BURST;
    event.preventDefault();
  });

  target.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** The held movement keys as a unit-length vector (or zero). */
    move() {
      let x = (right ? 1 : 0) - (left ? 1 : 0);
      let y = (down ? 1 : 0) - (up ? 1 : 0);
      const length = Math.hypot(x, y);
      if (length > 0) {
        x /= length;
        y /= length;
      }
      return { x, y };
    },
    /** Every one-shot press since the last call, as ACTION_* bits. */
    takeActions() {
      const pending = actions;
      actions = 0;
      return pending;
    },
    /** The last pointer position, in client pixels. */
    pointer,
  };
}
