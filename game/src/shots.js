// Screenshot staging: puts the live game into a chosen moment so the
// screenshots show the stealth at its best — cones sweeping, a guard
// turning suspicious, a hunt in full cry, the vault's Sun Lantern.
// Every staged frame is still the game's own code rendering its own
// state; nothing is drawn for the camera that the game cannot do.
// Usage: index.html?shot=cover | nearmiss | hunt | vault

import { tileCenter } from './levels.js';

function placeGuard(state, i, tx, ty, facingDeg, suspicion, mode) {
  const guard = state.guards[i];
  if (!guard) return;
  const c = tileCenter(tx, ty);
  guard.x = c.x;
  guard.y = c.y;
  guard.facing = (facingDeg * Math.PI) / 180;
  guard.suspicion = suspicion;
  guard.mode = mode;
  guard.pauseLeft = 0;
  if (mode === 'hunt') guard.huntLeft = 4.5;
}

function placePlayer(state, tx, ty, facingDeg, crouching) {
  const c = tileCenter(tx, ty);
  state.player.x = c.x;
  state.player.y = c.y;
  state.player.facing = (facingDeg * Math.PI) / 180;
  state.player.crouching = crouching;
  state.player.running = false;
  state.player.moving = false;
}

export function stageShot(state, name) {
  if (name === 'cover') {
    // Floor 1, mid-heist: Wren behind the crates, two cones in view,
    // a relic glowing ahead, the green door waiting on the right.
    state.loadLevel(0);
    placePlayer(state, 7, 10, 20, false);
    placeGuard(state, 0, 11, 10, 155, 0.18, 'patrol');
    placeGuard(state, 1, 24, 5, -35, 0, 'patrol');
    state.alarm = 18;
    state.alerts = 0;
    state.time = 62;
  } else if (name === 'nearmiss') {
    // Floor 2: Wren crouched in shadow at the very edge of a cone,
    // the guard turning, suspicion halfway up the meter.
    state.loadLevel(1);
    placePlayer(state, 3, 2, 55, true);
    placeGuard(state, 0, 5, 6, -115, 0.48, 'suspicious');
    placeGuard(state, 1, 14, 4, 90, 0.12, 'patrol');
    placeGuard(state, 2, 26, 7, 180, 0, 'patrol');
    state.alarm = 48;
    state.alerts = 1;
    state.time = 148;
  } else if (name === 'hunt') {
    // Floor 1, full alarm: both relics lifted, the door open, Wren
    // sprinting for it with a guard in pursuit and one cutting across.
    state.loadLevel(0);
    for (const relic of state.level.relics) relic.taken = true;
    state.exitOpen = true;
    placePlayer(state, 25, 7, 0, false);
    state.player.running = true;
    placeGuard(state, 0, 23, 9, 10, 1, 'hunt');
    placeGuard(state, 1, 27, 4, 120, 0.82, 'suspicious');
    state.rings.push({ x: state.player.x, y: state.player.y, r: 20, maxR: 150, alpha: 0.7 });
    state.alarm = 100;
    state.alerts = 2;
    state.time = 96;
  } else if (name === 'vault') {
    // Floor 3: the Sun Lantern glowing in the middle of the vault,
    // four patrols crossing its light, Wren waiting in the dark.
    state.loadLevel(2);
    placePlayer(state, 3, 7, 0, true);
    placeGuard(state, 0, 6, 5, 60, 0, 'patrol');
    placeGuard(state, 1, 12, 8, 0, 0.2, 'patrol');
    placeGuard(state, 2, 25, 9, -90, 0, 'patrol');
    placeGuard(state, 3, 15, 2, 90, 0.1, 'patrol');
    state.alarm = 20;
    state.alerts = 1;
    state.time = 201;
  } else {
    return false;
  }
  state.mode = 'play';
  state.frozen = true; // hold the moment still for the camera
  return true;
}
