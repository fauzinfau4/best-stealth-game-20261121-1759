// The player: Wren, a moth-thief. WASD / arrows to move, Shift to run
// (fast, loud, and the guards hear it), C to crouch (slow, quiet, hard
// to spot in shadow), mouse click to throw a pebble that clinks and
// pulls the nearest guard over to investigate.

import { tileCenter, tileAt, isShadowTile, lampAt } from './levels.js';
import { collides } from './guard.js';

const WALK_SPEED = 150;
const RUN_SPEED = 235;
const CROUCH_SPEED = 82;

export function createPlayer(level) {
  const start = tileCenter(level.start.tx, level.start.ty);
  return {
    x: start.x,
    y: start.y,
    radius: 12,
    facing: 0,
    moving: false,
    running: false,
    crouching: false,
    stepTimer: 0,
    pebbles: level.pebbles,
    throwCooldown: 0,
  };
}

export function resetPlayer(player, level) {
  const fresh = createPlayer(level);
  Object.assign(player, fresh);
  player.pebbles = level.pebbles;
}

// Move with axis-separated collision so the player slides along walls.
export function updatePlayer(level, player, input, dt, events, clicked) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  player.crouching = input.crouch;
  player.running = input.run && !input.crouch && (dx !== 0 || dy !== 0);
  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = player.crouching ? CROUCH_SPEED : player.running ? RUN_SPEED : WALK_SPEED;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    if (!collides(level, nx, player.y, player.radius)) player.x = nx;
    if (!collides(level, player.x, ny, player.radius)) player.y = ny;
    player.facing = Math.atan2(dy, dx);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.running ? 0.26 : player.crouching ? 0.62 : 0.42;
      events.push({
        type: 'footstep',
        x: player.x,
        y: player.y,
        loud: player.running,
      });
      if (player.running) {
        events.push({ type: 'noise', x: player.x, y: player.y, radius: 150 });
      }
    }
  }

  if (player.throwCooldown > 0) player.throwCooldown -= dt;
  if (clicked && player.pebbles > 0 && player.throwCooldown <= 0) {
    player.pebbles -= 1;
    player.throwCooldown = 0.35;
    events.push({
      type: 'pebble',
      fromX: player.x,
      fromY: player.y,
      toX: input.mouseX,
      toY: input.mouseY,
    });
  }
}

// Where the player stands decides how exposed they are: shadow hides,
// lamplight exposes. The HUD reads this every frame.
export function exposure(level, player) {
  const { tx, ty } = tileAt(level, player.x, player.y);
  if (isShadowTile(level, tx, ty)) return 'shadow';
  if (lampAt(level, player.x, player.y) !== null) return 'lamplight';
  return 'open';
}
