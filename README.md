# Lamplight Courier

[![make.fun bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/Farras45/stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/Farras45/stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down 2D stealth game, built for the [make.fun "Make the best stealth game" bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

Pip the night courier must cross three walled gardens and deliver one sealed
letter — unseen. Lantern guards patrol with vision cones; hedges hide the
courier, lamplight gives them away, and running is fast but loud enough for
nearby guards to hear. A guard that spots Pip fills the suspicion meter; a
full meter raises the alarm and the guards give chase. Break line of sight
and stay hidden to let the alarm die down, then slip on to the green exit.

## How to play

- **Move** — WASD or arrow keys; click the floor to walk there.
- **Run (loud)** — hold Shift. Faster, but guards hear footsteps.
- **Pause** — P or Escape. **Mute** — M.
- Collect the golden letters for a better run, and reach the green EXIT gate
  to clear each garden. Get caught and the garden starts over.

## The game

- `game/index.html` — the page; everything under `game/` is plain static
  files that play offline in desktop Chrome, no build step, no network.
- `game/src/config.js` — tuning numbers and palette.
- `game/src/levels.js` — the three gardens (maps, patrol routes).
- `game/src/world.js` — movement, guards, vision cones, suspicion, alarm.
- `game/src/render.js` — canvas drawing: floor, lamps, cones, HUD, screens.
- `game/src/audio.js` — footsteps, alarm, pickups — all synthesized.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — the staged screenshot scenes (`?shot=`).
- `game/src/main.js` — boot, the fixed-step loop, the six screens.
- `game/src/random.js` — a deterministic random source.
- `main.ts` — hands the game in (copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`).

Serve it locally with `node serve.ts` and open http://localhost:8080.

## License

MIT — see [LICENSE](LICENSE).
