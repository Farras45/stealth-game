// Lamplight Courier — keyboard and mouse input.
// WASD or arrows move; Shift runs (loud); Space or Enter confirms; P or
// Escape pauses; M mutes. A mouse click sets a walk-to target on the floor.

export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = ACTION_NONE;
  let clickTarget = null;

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code] || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    clickTarget = { x, y };
    actions |= ACTION_CONFIRM;
  }

  function onBlur() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** The movement direction from held keys, normalised, or null. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** Actions since the last call; reading them clears them. */
    takeActions() {
      const out = actions;
      actions = ACTION_NONE;
      return out;
    },
    /** The click-to-walk target, if one was set since the last call. */
    takeClick() {
      const out = clickTarget;
      clickTarget = null;
      return out;
    },
  };
}
