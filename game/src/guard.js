// Guards: patrol routes, suspicion, investigation and the hunt.
// A guard never insta-fails the player: suspicion builds while you are
// seen, decays while you are hidden, and a full alarm only starts a
// short chase — break line of sight and the guard gives up and goes back
// to patrol. That recovery window is the heart of the stealth.

import { TILE, PLAY_TOP, tileCenter, isSolidTile, tileAt } from './levels.js';
import { detectionRate, hearsNoise, HUNT_RANGE } from './vision.js';

const TWO_PI = Math.PI * 2;

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TWO_PI;
  while (d < -Math.PI) d += TWO_PI;
  return d;
}

function moveToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Slide along walls: try the full step, then each axis alone.
  if (!collides(level, nx, ny, guard.radius)) {
    guard.x = nx;
    guard.y = ny;
  } else if (!collides(level, nx, guard.y, guard.radius)) {
    guard.x = nx;
  } else if (!collides(level, guard.x, ny, guard.radius)) {
    guard.y = ny;
  } else {
    return true; // stuck: treat the waypoint as reached
  }
  guard.facing = Math.atan2(dy, dx);
  return Math.hypot(tx - guard.x, ty - guard.y) < 3;
}

export function collides(level, x, y, r) {
  const { tx, ty } = tileAt(level, x, y);
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (!isSolidTile(level, tx + ox, ty + oy)) continue;
      const bx = (tx + ox) * TILE;
      const by = PLAY_TOP + (ty + oy) * TILE;
      const cx = Math.max(bx, Math.min(x, bx + TILE));
      const cy = Math.max(by, Math.min(y, by + TILE));
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
  }
  return false;
}

export function createGuard(def) {
  const first = tileCenter(def.path[0][0], def.path[0][1]);
  const second = tileCenter(def.path[1][0], def.path[1][1]);
  return {
    path: def.path.map(([tx, ty]) => tileCenter(tx, ty)),
    speed: def.speed,
    pause: def.pause,
    x: first.x,
    y: first.y,
    facing: Math.atan2(second.y - first.y, second.x - first.x),
    waypoint: 1,
    pauseLeft: 0,
    scanAngle: 0,
    suspicion: 0,
    mode: 'patrol', // patrol | suspicious | investigate | hunt
    investigateX: 0,
    investigateY: 0,
    huntLeft: 0,
    radius: 13,
    bob: 0,
  };
}

export function resetGuard(guard, def) {
  const fresh = createGuard(def);
  Object.assign(guard, fresh);
}

export function updateGuard(level, guard, player, dt, events) {
  guard.bob += dt;

  // --- Seeing the player -----------------------------------------------
  const rate = detectionRate(level, guard, player);
  if (rate > 0) {
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - 0.22 * dt);
  }

  if (guard.suspicion >= 1 && guard.mode !== 'hunt') {
    guard.mode = 'hunt';
    guard.huntLeft = 4.5;
    events.push({ type: 'alarm', x: guard.x, y: guard.y });
  } else if (guard.suspicion >= 0.55 && guard.mode === 'patrol') {
    guard.mode = 'suspicious';
  } else if (guard.suspicion < 0.25 && guard.mode === 'suspicious') {
    guard.mode = 'patrol';
  }

  // --- Hearing a noise --------------------------------------------------
  for (const noise of events) {
    if (noise.type !== 'noise') continue;
    if (guard.mode === 'hunt') continue;
    if (hearsNoise(guard, noise.x, noise.y, noise.radius)) {
      guard.mode = 'investigate';
      guard.investigateX = noise.x;
      guard.investigateY = noise.y;
    }
  }

  // --- Movement by mode -------------------------------------------------
  if (guard.mode === 'hunt') {
    guard.huntLeft -= dt;
    const targetX = guard.lastSeenX ?? player.x;
    const targetY = guard.lastSeenY ?? player.y;
    const seenNow = detectionRate(level, guard, player) > 0;
    const tx = seenNow ? player.x : targetX;
    const ty = seenNow ? player.y : targetY;
    const arrived = moveToward(guard, tx, ty, guard.speed * 1.55, dt, level);
    if (arrived || guard.huntLeft <= 0) {
      guard.mode = 'patrol';
      guard.suspicion = 0.45; // stays wary, but lets you recover
      guard.huntLeft = 0;
    }
    return;
  }

  if (guard.mode === 'investigate') {
    const arrived = moveToward(guard, guard.investigateX, guard.investigateY, guard.speed * 1.25, dt, level);
    if (arrived) {
      guard.mode = 'patrol';
      guard.pauseLeft = 1.4; // look around, then resume the route
    }
    return;
  }

  if (guard.mode === 'suspicious') {
    // Creep toward where you were last seen, facing the player.
    const tx = guard.lastSeenX ?? guard.x;
    const ty = guard.lastSeenY ?? guard.y;
    guard.facing += angleDifference(Math.atan2(ty - guard.y, tx - guard.x), guard.facing) * Math.min(1, dt * 4);
    moveToward(guard, tx, ty, guard.speed * 0.6, dt, level);
    return;
  }

  // patrol
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    // Sweep the lantern back and forth while waiting: a patrol you can learn.
    guard.scanAngle += dt * 1.4;
    guard.facing += Math.sin(guard.scanAngle) * dt * 0.9;
    return;
  }
  const target = guard.path[guard.waypoint];
  if (moveToward(guard, target.x, target.y, guard.speed, dt, level)) {
    guard.waypoint = (guard.waypoint + 1) % guard.path.length;
    guard.pauseLeft = guard.pause;
    guard.scanAngle = 0;
  }
}

// Touching a hunting guard is the only way to get caught.
export function guardCatchesPlayer(guard, player) {
  return guard.mode === 'hunt' && Math.hypot(guard.x - player.x, guard.y - player.y) < guard.radius + player.radius + 2;
}

export { HUNT_RANGE };
