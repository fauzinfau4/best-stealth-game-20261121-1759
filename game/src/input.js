// Input: keyboard and mouse, read by the game loop each frame.
// WASD or arrows move, Shift runs, C crouches, E picks up / opens,
// R restarts the floor, P pauses, Enter / click starts from a menu.

export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    run: false,
    crouch: false,
    interact: false,
    restart: false,
    pause: false,
    confirm: false,
    clicked: false,
    mouseX: 0,
    mouseY: 0,
  };

  const downKeys = new Set();

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  function refresh() {
    input.up = downKeys.has('w') || downKeys.has('ArrowUp');
    input.down = downKeys.has('s') || downKeys.has('ArrowDown');
    input.left = downKeys.has('a') || downKeys.has('ArrowLeft');
    input.right = downKeys.has('d') || downKeys.has('ArrowRight');
    input.run = downKeys.has('Shift');
    input.crouch = downKeys.has('c');
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    downKeys.add(k);
    if (k === 'e') input.interact = true;
    if (k === 'r') input.restart = true;
    if (k === 'p') input.pause = true;
    if (k === 'Enter' || k === ' ') input.confirm = true;
    refresh();
  });

  window.addEventListener('keyup', (e) => {
    downKeys.delete(keyName(e));
    refresh();
  });

  window.addEventListener('blur', () => {
    downKeys.clear();
    refresh();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    input.clicked = true;
  });

  return input;
}

// One-shot flags are consumed by the loop so a single press acts once.
export function consumePresses(input) {
  const pressed = {
    interact: input.interact,
    restart: input.restart,
    pause: input.pause,
    confirm: input.confirm || input.clicked,
    clicked: input.clicked,
  };
  input.interact = false;
  input.restart = false;
  input.pause = false;
  input.confirm = false;
  input.clicked = false;
  return pressed;
}
