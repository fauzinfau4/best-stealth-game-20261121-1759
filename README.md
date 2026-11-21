[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/fauzinfau4/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/fauzinfau4/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Mothlight — a top-down stealth game

Wren the moth-thief has one night in the Hall of Lanterns: lift the relic
lanterns, slip past the night watch, and reach the green door unseen.

A complete stealth game in plain HTML5 canvas, no libraries, no network:
three night-museum floors, patrolling guards with vision cones, crates
and pillars to hide behind, shadow patches where guards spot you slowly,
lamplight where they spot you fast, and an alarm meter that gives you a
chance to recover — suspicion builds while you are seen, decays while
you are hidden, and a full alarm only starts a short chase.

## How to play

- **WASD / arrows** — move
- **Shift** — run (fast, but loud: guards hear the footsteps)
- **C** — crouch (slow, quiet, hard to spot in shadow)
- **Mouse click** — throw a pebble; the clink pulls the nearest guard over to investigate
- **E** — pick up a relic lantern (the green door opens once all are lifted)
- **R** — restart the floor · **P** — pause · **Enter** — start / continue

Getting caught costs one life and the guards go back to their rounds —
there is no insta-fail. Three lives, three floors, one Sun Lantern.

## Run it

Serve `game/` with any static server and open `game/index.html` in a
desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every file the game loads lives
under `game/`, and all sound is synthesized live with WebAudio.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/main.js` — game state, loop, level flow, alarm, pickups
- `game/src/levels.js` — the three floors: walls, crates, lamps, shadows
- `game/src/guard.js` — patrols, suspicion, investigation, the hunt
- `game/src/vision.js` — line of sight, vision cones, detection rate
- `game/src/player.js` — movement, running noise, pebble throws
- `game/src/render.js` — all canvas drawing: floor, cones, HUD, screens
- `game/src/audio.js` — synthesized footsteps, clinks, chimes, alarms
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — staged screenshot moments (`?shot=cover|nearmiss|hunt|vault`)
- `main.ts` — the make.fun hand-in program (Node 22, stdlib only)
- `screenshots/` — real renders of the game's own code in a browser

## License

MIT — see `LICENSE`.
