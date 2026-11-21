// Mothlight — a top-down stealth game. Wren the moth-thief has one
// night in the Hall of Lanterns: lift the relic lanterns, slip past the
// night watch, and reach the green door unseen.
//
// This file owns the game state and the loop: menus, level flow, the
// alarm meter, pickups, pebble throws, getting caught, and the win.
// Movement lives in player.js, patrols in guard.js, sight in vision.js,
// drawing in render.js, sound in audio.js.

import { LEVELS, tileCenter } from './levels.js';
import { createPlayer, resetPlayer, updatePlayer } from './player.js';
import { createGuard, resetGuard, updateGuard, guardCatchesPlayer } from './guard.js';
import { createInput, consumePresses } from './input.js';
import { drawGame, CANVAS_W, CANVAS_H } from './render.js';
import {
  unlockAudio,
  playFootstep,
  playPebbleClink,
  playRelicChime,
  playAlarmSting,
  playCaughtThud,
  playDoorCreak,
  playWinMelody,
} from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const state = {
  mode: 'title', // title | play | paused | caught | levelclear | win | gameover
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  time: 0,
  levelTime: 0,
  alerts: 0,
  lives: 3,
  exitOpen: false,
  alarm: 0,
  pebbleFlights: [],
  rings: [],
  statusText: '',
  frozen: false,
};

function loadLevel(index) {
  state.levelIndex = index;
  // Fresh copy of the level data so a replay starts clean.
  const def = LEVELS[index];
  state.level = {
    ...def,
    relics: def.relics.map((r) => ({ ...r, taken: false })),
    guards: def.guards,
  };
  state.player = createPlayer(state.level);
  state.guards = def.guards.map((g) => createGuard(g));
  state.exitOpen = false;
  state.levelTime = 0;
  state.pebbleFlights = [];
  state.rings = [];
  state.statusText = '';
}
state.loadLevel = loadLevel;

function resetRun() {
  state.lives = 3;
  state.alerts = 0;
  state.time = 0;
  loadLevel(0);
}

function nearestRelicInReach() {
  for (const relic of state.level.relics) {
    if (relic.taken) continue;
    const c = tileCenter(relic.tx, relic.ty);
    if (Math.hypot(state.player.x - c.x, state.player.y - c.y) < 36) return relic;
  }
  return null;
}

function updateAlarm() {
  state.alarm = state.guards.reduce((m, g) => Math.max(m, g.suspicion), 0) * 100;
}

function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'footstep') {
      playFootstep(e.loud);
      if (e.loud) {
        state.rings.push({ x: e.x, y: e.y, r: 12, maxR: 150, alpha: 0.55 });
      }
    } else if (e.type === 'pebble') {
      state.pebbleFlights.push({ fromX: e.fromX, fromY: e.fromY, toX: e.toX, toY: e.toY, t: 0 });
    } else if (e.type === 'alarm') {
      state.alerts += 1;
      playAlarmSting();
      state.statusText = 'HUNT! Break line of sight!';
    } else if (e.type === 'noise') {
      // Guards read noise events directly in updateGuard.
    }
  }
}

function updatePebbles(dt) {
  for (const flight of state.pebbleFlights) {
    flight.t += dt * 2.2;
  }
  const landed = state.pebbleFlights.filter((f) => f.t >= 1);
  for (const f of landed) {
    playPebbleClink();
    state.rings.push({ x: f.toX, y: f.toY, r: 8, maxR: 150, alpha: 0.8 });
    // The clink is a noise event the guards investigate next frame.
    state.pendingNoise = { x: f.toX, y: f.toY, radius: 150 };
  }
  state.pebbleFlights = state.pebbleFlights.filter((f) => f.t < 1);
}

function updateRings(dt) {
  for (const ring of state.rings) {
    ring.r += 130 * dt;
    ring.alpha -= 0.55 * dt;
  }
  state.rings = state.rings.filter((r) => r.alpha > 0 && r.r < r.maxR);
}

function updatePlay(dt, input, pressed) {
  state.time += dt;
  state.levelTime += dt;

  const events = [];
  updatePlayer(state.level, state.player, input, dt, events, pressed.clicked);
  if (state.pendingNoise) {
    events.push({ type: 'noise', ...state.pendingNoise });
    state.pendingNoise = null;
  }
  for (const guard of state.guards) {
    updateGuard(state.level, guard, state.player, dt, events);
  }
  handleEvents(events);
  updatePebbles(dt);
  updateRings(dt);
  updateAlarm();

  // Pick up a relic with E.
  if (pressed.interact) {
    const relic = nearestRelicInReach();
    if (relic) {
      relic.taken = true;
      playRelicChime();
      state.statusText = 'Relic lantern lifted!';
      if (state.level.relics.every((r) => r.taken)) {
        state.exitOpen = true;
        playDoorCreak();
        state.statusText = 'The green door is open — go!';
      }
    }
  }

  // Reach the open exit.
  if (state.exitOpen) {
    const exit = tileCenter(state.level.exit.tx, state.level.exit.ty);
    if (Math.hypot(state.player.x - exit.x, state.player.y - exit.y) < 28) {
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.mode = 'win';
        playWinMelody();
      } else {
        state.mode = 'levelclear';
        playDoorCreak();
      }
      return;
    }
  }

  // Caught: a hunting guard touched Wren.
  for (const guard of state.guards) {
    if (guardCatchesPlayer(guard, state.player)) {
      state.lives -= 1;
      playCaughtThud();
      if (state.lives <= 0) {
        state.mode = 'gameover';
      } else {
        state.mode = 'caught';
      }
      return;
    }
  }

  if (pressed.restart) {
    loadLevel(state.levelIndex);
    state.mode = 'play';
  }
  if (pressed.pause) state.mode = 'paused';
}

function update(dt, input, pressed) {
  if (state.mode === 'title') {
    state.time += dt; // lamps keep flickering behind the title
    if (pressed.confirm) {
      unlockAudio();
      state.mode = 'play';
    }
    return;
  }
  if (state.mode === 'paused') {
    if (pressed.pause || pressed.confirm) state.mode = 'play';
    if (pressed.restart) {
      loadLevel(state.levelIndex);
      state.mode = 'play';
    }
    return;
  }
  if (state.mode === 'caught') {
    if (pressed.confirm) {
      loadLevel(state.levelIndex); // guards reset, alarm clears: a real recovery
      state.mode = 'play';
    }
    return;
  }
  if (state.mode === 'levelclear') {
    if (pressed.confirm) {
      loadLevel(state.levelIndex + 1);
      state.mode = 'play';
    }
    return;
  }
  if (state.mode === 'win' || state.mode === 'gameover') {
    if (pressed.confirm) {
      resetRun();
      state.mode = 'play';
    }
    return;
  }
  updatePlay(dt, input, pressed);
}

const input = createInput(canvas);
resetRun();

// Screenshot staging: ?shot=cover|nearmiss|hunt|vault freezes the game
// in a chosen moment. Real gameplay, no title screen, no input needed.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  if (stageShot(state, shot)) {
    document.title = `Mothlight — ${shot}`;
  } else {
    state.mode = 'title';
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const pressed = consumePresses(input);
  if (!state.frozen) update(dt, input, pressed);
  drawGame(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for play-testing and screenshot checks in the console.
window.__mothlight = state;
