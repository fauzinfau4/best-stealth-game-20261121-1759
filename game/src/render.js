// Rendering: everything the player sees, drawn on one canvas.
// Night-museum look — dark blue floor, warm amber lamp pools, teal exit
// door, red watchmen with pale vision cones — so the stealth reads at
// a glance even when the screenshot is shrunk to a contact sheet.

import { TILE, COLS, ROWS, PLAY_TOP, WORLD_W, WORLD_H, tileCenter, tileAt, isShadowTile } from './levels.js';
import { CONE_HALF_ANGLE, CONE_RANGE, hasLineOfSight } from './vision.js';
import { exposure } from './player.js';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = '#10101f';
  ctx.fillRect(0, PLAY_TOP, WORLD_W, WORLD_H);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const x = tx * TILE;
      const y = PLAY_TOP + ty * TILE;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#171830' : '#15152b';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(120,120,180,0.06)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
    }
  }
  // Shadow patches: dark floor where the eye — and the guard — struggles.
  for (const [x, y, w, h] of level.shadows) {
    const px = x * TILE;
    const py = PLAY_TOP + y * TILE;
    ctx.fillStyle = 'rgba(2,2,10,0.55)';
    roundRect(ctx, px + 2, py + 2, w * TILE - 4, h * TILE - 4, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,160,255,0.10)';
    ctx.setLineDash([6, 6]);
    roundRect(ctx, px + 2, py + 2, w * TILE - 4, h * TILE - 4, 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawLampPools(ctx, level, time) {
  for (const [tx, ty] of level.lamps) {
    const c = tileCenter(tx, ty);
    const flicker = 0.16 + Math.sin(time * 2.1 + tx * 1.7 + ty) * 0.02;
    const grad = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, 112);
    grad.addColorStop(0, `rgba(255,196,100,${flicker + 0.08})`);
    grad.addColorStop(0.6, `rgba(255,180,80,${flicker * 0.55})`);
    grad.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 112, 0, Math.PI * 2);
    ctx.fill();
    // The lamp post itself.
    ctx.fillStyle = '#3a2f22';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWalls(ctx, level) {
  for (const [x, y, w, h] of level.walls) {
    const px = x * TILE;
    const py = PLAY_TOP + y * TILE;
    ctx.fillStyle = '#23264a';
    ctx.fillRect(px, py, w * TILE, h * TILE);
    ctx.fillStyle = '#3d4170';
    ctx.fillRect(px, py, w * TILE, 4);
    ctx.fillStyle = '#191b36';
    ctx.fillRect(px, py + h * TILE - 4, w * TILE, 4);
    ctx.strokeStyle = 'rgba(160,170,255,0.25)';
    ctx.strokeRect(px + 0.5, py + 0.5, w * TILE - 1, h * TILE - 1);
  }
  // Outer border.
  ctx.strokeStyle = '#3d4170';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, PLAY_TOP + 3, WORLD_W - 6, WORLD_H - 6);
  ctx.lineWidth = 1;
}

function drawCratesAndPillars(ctx, level) {
  for (const [tx, ty] of level.crates) {
    const x = tx * TILE;
    const y = PLAY_TOP + ty * TILE;
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.fillStyle = '#7d5a3a';
    ctx.fillRect(x + 3, y + 3, TILE - 6, 8);
    ctx.strokeStyle = '#3d2a18';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + TILE - 3, y + TILE - 3);
    ctx.moveTo(x + TILE - 3, y + 3);
    ctx.lineTo(x + 3, y + TILE - 3);
    ctx.strokeStyle = 'rgba(61,42,24,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const [tx, ty] of level.pillars) {
    const c = tileCenter(tx, ty);
    ctx.fillStyle = '#2c2f55';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4e85';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#3d4170';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
  }
}

function drawRelics(ctx, level, time) {
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const c = tileCenter(relic.tx, relic.ty);
    const pulse = 0.75 + Math.sin(time * 3 + relic.tx) * 0.25;
    const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 46);
    grad.addColorStop(0, `rgba(255,220,120,${0.55 * pulse})`);
    grad.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 46, 0, Math.PI * 2);
    ctx.fill();
    // A little hanging lantern.
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(c.x - 2, c.y - 14, 4, 6);
    ctx.fillStyle = '#ffcf4d';
    roundRect(ctx, c.x - 9, c.y - 8, 18, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(c.x - 5, c.y - 4, 10, 12);
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 2;
    roundRect(ctx, c.x - 9, c.y - 8, 18, 20, 4);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawExit(ctx, level, exitOpen, time) {
  const c = tileCenter(level.exit.tx, level.exit.ty);
  const glow = exitOpen ? 0.5 + Math.sin(time * 3) * 0.15 : 0.12;
  const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 60);
  grad.addColorStop(0, exitOpen ? `rgba(80,255,180,${glow})` : 'rgba(90,160,140,0.25)');
  grad.addColorStop(1, 'rgba(80,255,180,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = exitOpen ? '#123524' : '#1d2b28';
  roundRect(ctx, c.x - 14, c.y - 17, 28, 34, 4);
  ctx.fill();
  ctx.strokeStyle = exitOpen ? '#4dffa9' : '#3f6b5c';
  ctx.lineWidth = 2;
  roundRect(ctx, c.x - 14, c.y - 17, 28, 34, 4);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = exitOpen ? '#4dffa9' : '#7fa89a';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', c.x, c.y - 24);
}

function drawVisionCone(ctx, level, guard) {
  const alert = guard.mode === 'hunt' ? 1 : guard.suspicion;
  const base = alert > 0.55
    ? [255, 90, 70]
    : alert > 0.25
      ? [255, 170, 60]
      : [255, 214, 110];
  const alpha = 0.16 + alert * 0.16;
  const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, CONE_RANGE);
  grad.addColorStop(0, `rgba(${base[0]},${base[1]},${base[2]},${alpha})`);
  grad.addColorStop(1, `rgba(${base[0]},${base[1]},${base[2]},0.02)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  // Dashed range arc, like a lantern's edge.
  ctx.strokeStyle = `rgba(${base[0]},${base[1]},${base[2]},0.35)`;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGuard(ctx, guard, time) {
  const bob = Math.sin(guard.bob * 6) * 1.5;
  // Body: a watchman in a dark red coat, lantern in hand.
  ctx.fillStyle = '#a93226';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.4, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5e1a12';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1;
  // Facing tick.
  ctx.strokeStyle = '#ffe9c4';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 19, guard.y + Math.sin(guard.facing) * 19);
  ctx.stroke();
  ctx.lineWidth = 1;
  // Suspicion bubble: ? when wary, ! when hunting.
  if (guard.mode === 'hunt') {
    drawBubble(ctx, guard.x, guard.y - 26, '!', '#ff3b30');
  } else if (guard.mode === 'suspicious' || guard.mode === 'investigate') {
    drawBubble(ctx, guard.x, guard.y - 26, '?', '#ffb03a');
  } else if (guard.suspicion > 0.3) {
    drawBubble(ctx, guard.x, guard.y - 26, '…', '#ffd76e');
  }
}

function drawBubble(ctx, x, y, text, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10101f';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}

function drawPlayer(ctx, player, time) {
  const r = player.crouching ? 10 : 12;
  // Soft shadow under Wren.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 8, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded cloak, moth-green.
  ctx.fillStyle = '#1f9d6c';
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d5c3d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#d8fff0';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1;
  // Facing tick.
  ctx.strokeStyle = '#d8fff0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.facing) * (r + 6), player.y + Math.sin(player.facing) * (r + 6));
  ctx.stroke();
  ctx.lineWidth = 1;
  if (player.crouching) {
    ctx.strokeStyle = 'rgba(216,255,240,0.7)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPebblesAndRings(ctx, state) {
  for (const flight of state.pebbleFlights) {
    const t = flight.t;
    const x = flight.fromX + (flight.toX - flight.fromX) * t;
    const y = flight.fromY + (flight.toY - flight.fromY) * t - Math.sin(t * Math.PI) * 26;
    ctx.fillStyle = '#cfd6e4';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const ring of state.rings) {
    ctx.strokeStyle = `rgba(255,255,255,${ring.alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawHud(ctx, state) {
  const level = state.level;
  const alarm = state.alarm;
  ctx.fillStyle = 'rgba(8,8,20,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, PLAY_TOP);
  ctx.fillStyle = '#2a2c4a';
  ctx.fillRect(0, PLAY_TOP - 2, CANVAS_W, 2);

  // Left: floor name + objective.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd76e';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(level.name, 14, 20);
  ctx.fillStyle = '#9aa0c8';
  ctx.font = '11px monospace';
  ctx.fillText(level.objective, 14, 37);

  // Centre: the alarm meter.
  const meterX = 470;
  const meterW = 300;
  ctx.fillStyle = alarm > 60 ? '#ff5a4d' : '#ffd76e';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', meterX, 20);
  ctx.fillStyle = '#23264a';
  roundRect(ctx, meterX + 56, 10, meterW, 14, 7);
  ctx.fill();
  const fill = alarm > 60 ? '#ff5a4d' : alarm > 25 ? '#ffb03a' : '#4dffa9';
  ctx.fillStyle = fill;
  if (alarm > 0.5) {
    roundRect(ctx, meterX + 56, 10, (meterW * alarm) / 100, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#c8ccf0';
  ctx.font = '11px monospace';
  ctx.fillText(`${Math.round(alarm)}% ${alarm > 60 ? 'HUNT!' : alarm > 25 ? 'seen' : 'quiet'}`, meterX + 56, 38);

  // Right: timer, alerts, lanterns, lives, pebbles.
  const mm = String(Math.floor(state.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(state.time % 60)).padStart(2, '0');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8eafc';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${mm}:${ss}`, 1266, 20);
  const taken = level.relics.filter((r) => r.taken).length;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ffd76e';
  ctx.fillText(`◉ ${taken}/${level.relics.length}`, 1266, 37);
  ctx.fillStyle = '#ff8a7a';
  ctx.fillText(`Alerts ${state.alerts}`, 1150, 37);
  ctx.fillStyle = '#ff6b81';
  ctx.fillText('♥'.repeat(Math.max(0, state.lives)), 1150, 20);
  ctx.fillStyle = '#cfd6e4';
  ctx.fillText(`● pebbles ${state.player.pebbles}`, 1010, 37);
}

function drawBottomBar(ctx, state) {
  ctx.fillStyle = 'rgba(8,8,20,0.92)';
  ctx.fillRect(0, CANVAS_H - 32, CANVAS_W, 32);
  ctx.fillStyle = '#2a2c4a';
  ctx.fillRect(0, CANVAS_H - 32, CANVAS_W, 2);
  const exp = exposure(state.level, state.player);
  const status = state.mode === 'play'
    ? state.alarm > 60
      ? 'SEEN — break line of sight!'
      : state.alarm > 25
        ? 'A guard is getting suspicious…'
        : exp === 'shadow'
          ? 'HIDDEN — in shadow, guards see you slowly'
          : exp === 'lamplight'
            ? 'IN LAMPLIGHT — you are easy to spot'
            : 'Unseen — move quietly'
    : state.statusText || '';
  ctx.textAlign = 'left';
  ctx.fillStyle = state.alarm > 60 ? '#ff5a4d' : state.alarm > 25 ? '#ffb03a' : '#4dffa9';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(status, 14, CANVAS_H - 11);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9aa0c8';
  ctx.font = '11px monospace';
  ctx.fillText('WASD move · Shift run (loud) · C crouch · click throw pebble · E pick up · R restart · P pause', 1266, CANVAS_H - 11);
}

function drawAlarmVignette(ctx, alarm, time) {
  if (alarm <= 55) return;
  const pulse = 0.25 + Math.sin(time * 6) * 0.12;
  const grad = ctx.createRadialGradient(640, 360, 260, 640, 360, 720);
  grad.addColorStop(0, 'rgba(255,40,30,0)');
  grad.addColorStop(1, `rgba(255,40,30,${pulse})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(5,5,14,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawTitle(ctx, state) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76e';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('MOTHLIGHT', 640, 210);
  ctx.fillStyle = '#c8ccf0';
  ctx.font = '18px monospace';
  ctx.fillText('a top-down stealth game — steal the lanterns, vanish unseen', 640, 252);
  ctx.fillStyle = '#e8eafc';
  ctx.font = '15px monospace';
  ctx.fillText('Wren the moth-thief has one night in the Hall of Lanterns.', 640, 310);
  ctx.fillText('Guards patrol with vision cones — hide behind crates,', 640, 336);
  ctx.fillText('stay in shadow, throw pebbles to mislead them.', 640, 362);
  ctx.fillStyle = '#4dffa9';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('WASD / arrows: move      Shift: run (loud)      C: crouch', 640, 420);
  ctx.fillText('Mouse click: throw pebble      E: pick up lantern      R: restart', 640, 446);
  ctx.fillStyle = '#ffd76e';
  ctx.font = 'bold 20px monospace';
  const blink = Math.sin(state.time * 4) > -0.4;
  if (blink) ctx.fillText('Press ENTER or click to begin', 640, 510);
  ctx.fillStyle = '#9aa0c8';
  ctx.font = '12px monospace';
  ctx.fillText('3 floors · relic lanterns · one alarm meter · no insta-fail', 640, 556);
}

function drawCenterMessage(ctx, title, lines, accent) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px monospace';
  ctx.fillText(title, 640, 300);
  ctx.fillStyle = '#e8eafc';
  ctx.font = '16px monospace';
  lines.forEach((line, i) => ctx.fillText(line, 640, 350 + i * 28));
}

export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const level = state.level;
  drawFloor(ctx, level);
  drawLampPools(ctx, level, state.time);
  drawRelics(ctx, level, state.time);
  drawExit(ctx, level, state.exitOpen, state.time);
  drawCratesAndPillars(ctx, level);
  drawWalls(ctx, level);
  for (const guard of state.guards) drawVisionCone(ctx, level, guard);
  for (const guard of state.guards) drawGuard(ctx, guard, state.time);
  drawPebblesAndRings(ctx, state);
  if (state.mode !== 'title') drawPlayer(ctx, state.player, state.time);
  drawHud(ctx, state);
  drawBottomBar(ctx, state);
  drawAlarmVignette(ctx, state.alarm, state.time);

  if (state.mode === 'title') drawTitle(ctx, state);
  if (state.mode === 'paused') {
    drawCenterMessage(ctx, 'PAUSED', ['P — resume', 'R — restart this floor'], '#ffd76e');
  }
  if (state.mode === 'caught') {
    drawCenterMessage(
      ctx,
      'CAUGHT!',
      [
        `The watch grabbed Wren — ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.`,
        'The guards go back to their rounds. Try a darker route.',
        'Press ENTER to slip back in.',
      ],
      '#ff5a4d',
    );
  }
  if (state.mode === 'levelclear') {
    drawCenterMessage(
      ctx,
      'FLOOR CLEAR',
      [
        `All lanterns lifted in ${Math.floor(state.levelTime / 60)}:${String(Math.floor(state.levelTime % 60)).padStart(2, '0')} — ${state.alerts} alerts raised.`,
        'Press ENTER for the next floor.',
      ],
      '#4dffa9',
    );
  }
  if (state.mode === 'win') {
    drawCenterMessage(
      ctx,
      'THE SUN LANTERN IS YOURS',
      [
        'Wren slips out into the moth-light dawn, pockets glowing.',
        `Three floors · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} · ${state.alerts} alerts · ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} to spare.`,
        'Press ENTER to play again.',
      ],
      '#ffd76e',
    );
  }
  if (state.mode === 'gameover') {
    drawCenterMessage(
      ctx,
      'THE WATCH WINS TONIGHT',
      ['Wren is out of lives — the hall keeps its lanterns.', 'Press ENTER to try the night again.'],
      '#ff5a4d',
    );
  }
}

export { CANVAS_W, CANVAS_H };
