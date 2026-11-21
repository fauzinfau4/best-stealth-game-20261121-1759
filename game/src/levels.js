// Level definitions for Mothlight: three night-museum floors.
// Each level is built from rectangles of wall, crates, pillars, lamps and
// shadow patches, plus the relics to steal, the exit door, the player's
// start tile and the guards' patrol routes (tile coordinates).
// Tile size and grid size live here so every other module agrees on them.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const PLAY_TOP = 48; // HUD bar height; the tile grid starts below it
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

// A level is plain data: walls and crates block movement and sight,
// pillars block both too, lamps paint pools of light (faster detection),
// shadow patches are dark floor where guards spot you much slower.
function makeLevel(def) {
  return {
    name: def.name,
    subtitle: def.subtitle,
    objective: def.objective,
    walls: def.walls,
    crates: def.crates,
    pillars: def.pillars,
    lamps: def.lamps,
    shadows: def.shadows,
    relics: def.relics.map(([tx, ty]) => ({ tx, ty, taken: false })),
    exit: { tx: def.exit[0], ty: def.exit[1] },
    start: { tx: def.start[0], ty: def.start[1] },
    guards: def.guards,
    pebbles: def.pebbles,
    parSeconds: def.parSeconds,
  };
}

// Floor 1 — The Lantern Hall. Wide and forgiving: two slow guards, long
// patrols with generous pauses, crates everywhere to learn behind.
function buildLanternHall() {
  return makeLevel({
    name: 'Floor 1 — The Lantern Hall',
    subtitle: 'Slip past the night watch and lift both relic lanterns.',
    objective: 'Steal 2 relic lanterns, then reach the green door.',
    walls: [
      [14, 1, 1, 5], [14, 9, 1, 6], // spine wall, gap in the middle
      [6, 11, 3, 1], [20, 4, 6, 1], // low partitions
      [24, 10, 1, 5],
    ],
    crates: [
      [3, 3], [4, 3], [10, 2], [11, 5], [18, 2], [19, 2],
      [8, 8], [9, 8], [22, 8], [23, 8], [5, 13], [26, 12], [27, 12],
    ],
    pillars: [[17, 7], [17, 12], [7, 5]],
    lamps: [[8, 4], [20, 7], [12, 12], [27, 5]],
    shadows: [[2, 6, 5, 4], [16, 10, 5, 4], [25, 1, 5, 3]],
    relics: [[28, 2], [4, 14]],
    exit: [30, 7],
    start: [1, 1],
    guards: [
      { path: [[10, 7], [10, 13], [12, 13], [12, 7]], speed: 52, pause: 1.6 },
      { path: [[27, 2], [28, 6], [26, 11]], speed: 48, pause: 1.4 },
    ],
    pebbles: 4,
    parSeconds: 120,
  });
}

// Floor 2 — The Moth Gallery. Tighter corridors, a third guard, lamps
// over the relics so the prize is always in the light.
function buildMothGallery() {
  return makeLevel({
    name: 'Floor 2 — The Moth Gallery',
    subtitle: 'The gallery sleeps lightly. Mind the lamps.',
    objective: 'Steal 2 relic lanterns, then reach the green door.',
    walls: [
      [8, 1, 1, 4], [8, 11, 1, 4],
      [16, 1, 1, 4], [16, 13, 1, 2],
      [24, 1, 1, 6], [24, 9, 1, 6],
      [12, 7, 2, 1], [22, 7, 2, 1],
    ],
    crates: [
      [3, 12], [4, 12], [12, 3], [13, 12], [19, 3], [20, 12],
      [28, 3], [28, 12], [4, 7], [29, 7],
    ],
    pillars: [[12, 9], [19, 9], [5, 3], [26, 9]],
    lamps: [[4, 7], [13, 9], [22, 4], [28, 7], [17, 13]],
    shadows: [[1, 1, 5, 3], [10, 11, 4, 3], [26, 12, 4, 3], [18, 1, 4, 3]],
    relics: [[13, 1], [27, 14]],
    exit: [30, 13],
    start: [1, 14],
    guards: [
      { path: [[5, 6], [5, 10], [11, 10], [11, 6]], speed: 58, pause: 1.2 },
      { path: [[14, 6], [21, 6], [21, 11], [14, 11]], speed: 56, pause: 1.0 },
      { path: [[27, 4], [28, 8], [27, 12]], speed: 62, pause: 0.9 },
    ],
    pebbles: 4,
    parSeconds: 150,
  });
}

// Floor 3 — The Sun Lantern Vault. One great relic in the middle of the
// room, four guards crossing its light, and a long dark run to the door.
function buildSunLanternVault() {
  return makeLevel({
    name: 'Floor 3 — The Sun Lantern Vault',
    subtitle: 'One lantern left. The whole vault is watching it.',
    objective: 'Steal the Sun Lantern, then reach the green door.',
    walls: [
      [10, 1, 1, 5], [10, 10, 1, 5],
      [21, 1, 1, 5], [21, 10, 1, 5],
      [13, 7, 6, 1],
    ],
    crates: [
      [3, 3], [3, 12], [7, 7], [7, 8], [24, 7], [24, 8],
      [28, 3], [28, 12], [14, 13], [17, 13],
    ],
    pillars: [[15, 4], [16, 4], [15, 11], [16, 11]],
    lamps: [[16, 5], [6, 7], [25, 7], [12, 2], [19, 13]],
    shadows: [[1, 6, 5, 4], [26, 6, 5, 4], [12, 1, 8, 2], [12, 13, 8, 2]],
    relics: [[16, 6]],
    exit: [30, 1],
    start: [1, 7],
    guards: [
      { path: [[6, 3], [6, 12], [9, 12], [9, 3]], speed: 62, pause: 1.0 },
      { path: [[13, 9], [18, 9], [18, 10], [13, 10]], speed: 58, pause: 1.1 },
      { path: [[25, 3], [25, 12], [22, 12], [22, 3]], speed: 64, pause: 0.9 },
      { path: [[12, 2], [19, 2], [19, 12], [12, 12]], speed: 55, pause: 1.3 },
    ],
    pebbles: 5,
    parSeconds: 180,
  });
}

export const LEVELS = [buildLanternHall(), buildMothGallery(), buildSunLanternVault()];

// Tile helpers: everything is addressed in tile coordinates here.
export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: PLAY_TOP + (ty + 0.5) * TILE };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor((py - PLAY_TOP) / TILE);
  return { tx, ty };
}

function rectHas(rects, tx, ty) {
  return rects.some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
}

function pointHas(points, tx, ty) {
  return points.some(([x, y]) => x === tx && y === ty);
}

export function isWallTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return rectHas(level.walls, tx, ty);
}

export function isSolidTile(level, tx, ty) {
  if (isWallTile(level, tx, ty)) return true;
  if (pointHas(level.crates, tx, ty)) return true;
  if (pointHas(level.pillars, tx, ty)) return true;
  return false;
}

export function isShadowTile(level, tx, ty) {
  return rectHas(level.shadows, tx, ty);
}

export function lampAt(level, px, py) {
  for (const [tx, ty] of level.lamps) {
    const c = tileCenter(tx, ty);
    const d = Math.hypot(px - c.x, py - c.y);
    if (d < 110) return d;
  }
  return null;
}
