// Vision: line of sight, vision-cone tests and the detection rate that
// turns "a guard can see you" into a suspicion number. Sight is blocked
// by walls, crates and pillars; darkness and crouching slow it down,
// lamplight and running speed it up.

import { TILE, isSolidTile, isShadowTile, lampAt, tileAt } from './levels.js';

export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CONE_RANGE = 215;
export const HUNT_RANGE = 260;

// Step along the segment in small hops; any solid tile blocks the view.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const { tx, ty } = tileAt(level, ax + dx * t, ay + dy * t);
    if (isSolidTile(level, tx, ty)) return false;
  }
  return true;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Is the player inside this guard's cone (ignoring walls)?
export function insideCone(guard, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return { seen: false, dist };
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleTo, guard.facing)) > CONE_HALF_ANGLE) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}

// How fast this guard's suspicion should rise while the player is visible:
// 0 means invisible, ~1 is a full second to full alarm.
export function detectionRate(level, guard, player) {
  const { seen, dist } = insideCone(guard, player.x, player.y);
  if (!seen) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  const { tx, ty } = tileAt(level, player.x, player.y);
  let rate = 1.15 - (dist / CONE_RANGE) * 0.75; // closer = faster
  if (isShadowTile(level, tx, ty)) rate *= 0.42; // darkness hides you
  if (lampAt(level, player.x, player.y) !== null) rate *= 1.55; // lamps expose you
  if (player.crouching) rate *= 0.55;
  if (player.running) rate *= 1.6;
  if (player.moving) rate *= 1.15;
  return Math.max(0.08, rate);
}

// Can a guard hear a noise at (nx, ny)? Running and pebbles ring out.
export function hearsNoise(guard, nx, ny, radius) {
  return Math.hypot(guard.x - nx, guard.y - ny) <= radius;
}
