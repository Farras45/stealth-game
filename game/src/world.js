// Lamplight Courier — the world: movement, guards, vision, suspicion.
// The rules, in one place: guards patrol waypoints and sweep their lantern
// cones; a cone that catches the courier fills the suspicion meter; a full
// meter raises the alarm and the guards give chase; staying hidden drains
// it again. Hedges hide the courier outright; lamplight makes them easier
// to spot; running is fast but loud enough for nearby guards to hear.

import {
  TILE, STEP, PLAYER_WALK, PLAYER_RUN, GUARD_PATROL, GUARD_CHASE, GUARD_SEARCH,
  PLAYER_R, GUARD_R, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, LAMP_RADIUS,
  HEAR_RUN_RADIUS, CAPTURE_R, SEE_RATE_CLOSE, SEE_RATE_FAR, SEE_LIGHT_MULT,
  SEE_SHADOW_MULT, SUSPICION_DECAY, ALARM_HOLD, SEARCH_TIME,
} from './config.js';
import { parseLevel, keyOf } from './levels.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_CLEAR = 8;

const TAU = Math.PI * 2;

function normAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

function turnToward(angle, target, maxStep) {
  const diff = normAngle(target - angle);
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function createWorld(levelDef, random) {
  const parsed = parseLevel(levelDef);
  const start = tileCenter(parsed.start.x, parsed.start.y);
  const exit = tileCenter(parsed.exit.x, parsed.exit.y);

  const world = {
    levelDef,
    parsed,
    time: 0,
    suspicion: 0,
    alarm: false,
    alarmTimer: 0,
    status: 'play', // play | caught | level-clear
    lettersTaken: 0,
    player: {
      x: start.x, y: start.y, angle: -Math.PI / 2, moving: false, running: false,
      stepAcc: 0, clickX: null, clickY: null,
    },
    guards: levelDef.guards.map((def) => {
      const first = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
      return {
        def,
        x: first.x, y: first.y, angle: 0, mode: 'patrol', wpIndex: 1 % def.waypoints.length,
        pauseT: 0, alertness: 0, lastSeen: null, searchT: 0, stepAcc: 0,
        scanPhase: random() * TAU, seen: false, seeAmount: 0,
      };
    }),
    letters: parsed.letters.map((letter) => ({ ...letter })),
  };

  function tileAtPx(x, y) {
    return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
  }

  function isWallTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= parsed.width || ty >= parsed.height) return true;
    return parsed.walls.has(keyOf(tx, ty));
  }

  function isHedgeTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= parsed.width || ty >= parsed.height) return false;
    return parsed.hedges.has(keyOf(tx, ty));
  }

  function circleHitsWall(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);
    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (!isWallTile(tx, ty)) continue;
        const nearestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
        const nearestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
        const dx = x - nearestX;
        const dy = y - nearestY;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
    return false;
  }

  /** Move a circle, sliding along walls: try x, then y. */
  function moveCircle(body, dx, dy, radius) {
    if (dx !== 0 && !circleHitsWall(body.x + dx, body.y, radius)) body.x += dx;
    if (dy !== 0 && !circleHitsWall(body.x, body.y + dy, radius)) body.y += dy;
  }

  /** True when the straight line between two points crosses no wall or hedge. */
  function losClear(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const { tx, ty } = tileAtPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      if (isWallTile(tx, ty) || isHedgeTile(tx, ty)) return false;
    }
    return true;
  }

  function playerOnHedge() {
    const { tx, ty } = tileAtPx(world.player.x, world.player.y);
    return isHedgeTile(tx, ty);
  }

  function playerLit() {
    for (const lamp of parsed.lamps) {
      const c = tileCenter(lamp.x, lamp.y);
      if (Math.hypot(world.player.x - c.x, world.player.y - c.y) < LAMP_RADIUS) return true;
    }
    return false;
  }

  /** 0 when the guard cannot see the courier, else 0..1 by closeness. */
  function guardSees(guard) {
    const dx = world.player.x - guard.x;
    const dy = world.player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VIEW_RANGE) return 0;
    if (Math.abs(normAngle(Math.atan2(dy, dx) - guard.angle)) > GUARD_VIEW_HALF_ANGLE) return 0;
    if (playerOnHedge()) return 0;
    if (!losClear(guard.x, guard.y, world.player.x, world.player.y)) return 0;
    return 1 - dist / GUARD_VIEW_RANGE;
  }

  function updateGuard(guard, dt, audio) {
    const player = world.player;
    // Vision runs in every mode: a searching or chasing guard that spots
    // the courier again keeps the chase on the courier's real position.
    const amount = guardSees(guard);
    guard.seen = amount > 0;
    guard.seeAmount = amount;
    if (guard.seen) {
      guard.alertness = Math.min(1, guard.alertness + amount * dt * 0.9);
      guard.lastSeen = { x: player.x, y: player.y };
      if (guard.mode !== 'chase' && guard.alertness > 0.55) guard.mode = 'chase';
    } else {
      guard.alertness = Math.max(0, guard.alertness - dt * 0.15);
    }

    if (guard.mode === 'chase') {
      const target = guard.seen ? { x: player.x, y: player.y } : guard.lastSeen;
      if (!target) {
        guard.mode = 'search';
        guard.searchT = SEARCH_TIME;
      } else {
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          const nx = (dx / dist) * GUARD_CHASE * dt;
          const ny = (dy / dist) * GUARD_CHASE * dt;
          moveCircle(guard, nx, ny, GUARD_R);
          guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), dt * 6);
        } else if (!guard.seen) {
          guard.mode = 'search';
          guard.searchT = SEARCH_TIME;
        }
        if (guard.seen) guard.lastSeen = { x: player.x, y: player.y };
      }
    } else if (guard.mode === 'search') {
      guard.searchT -= dt;
      guard.angle += dt * 0.9;
      if (guard.searchT <= 0) {
        guard.mode = 'patrol';
        guard.wpIndex = nearestWaypoint(guard);
      }
    } else if (guard.mode === 'pause') {
      guard.pauseT -= dt;
      guard.angle += Math.sin(guard.scanPhase + world.time * 1.6) * dt * 0.9;
      if (guard.pauseT <= 0) {
        guard.mode = 'patrol';
        guard.wpIndex = (guard.wpIndex + 1) % guard.def.waypoints.length;
      }
    } else {
      const wp = guard.def.waypoints[guard.wpIndex];
      const target = tileCenter(wp[0], wp[1]);
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 7) {
        guard.mode = 'pause';
        guard.pauseT = guard.def.pause;
      } else {
        const nx = (dx / dist) * GUARD_PATROL * dt;
        const ny = (dy / dist) * GUARD_PATROL * dt;
        moveCircle(guard, nx, ny, GUARD_R);
        guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), dt * 5);
      }
    }

    // Footsteps: distance walked since the last step (only while moving).
    if (guard.mode === 'patrol' || guard.mode === 'chase') {
      guard.stepAcc += (guard.mode === 'chase' ? GUARD_CHASE : GUARD_PATROL) * dt;
    }
    if (guard.stepAcc > 30) {
      guard.stepAcc = 0;
      if (audio) {
        const pan = Math.max(-1, Math.min(1, (guard.x - player.x) / 420));
        const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
        const volume = Math.max(0, 0.3 - dist / 1400);
        if (volume > 0.02) audio.guardStep(pan, volume);
      }
    }
  }

  function nearestWaypoint(guard) {
    let best = 0;
    let bestDist = Infinity;
    guard.def.waypoints.forEach((wp, i) => {
      const c = tileCenter(wp[0], wp[1]);
      const dist = Math.hypot(c.x - guard.x, c.y - guard.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  function step(dt, input, audio) {
    if (world.status !== 'play') return EVENT_NONE;
    world.time += dt;
    let events = EVENT_NONE;
    const player = world.player;

    // --- the courier moves: keys first, else the click-to-walk target.
    let mx = 0;
    let my = 0;
    if (input.dir) {
      mx = input.dir.x;
      my = input.dir.y;
    } else if (player.clickX !== null) {
      const dx = player.clickX - player.x;
      const dy = player.clickY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 7) {
        player.clickX = null;
        player.clickY = null;
      } else {
        mx = dx / dist;
        my = dy / dist;
      }
    }
    if (input.click) {
      player.clickX = input.click.x;
      player.clickY = input.click.y;
    }
    player.moving = mx !== 0 || my !== 0;
    player.running = Boolean(input.run) && player.moving;
    const speed = player.running ? PLAYER_RUN : PLAYER_WALK;
    if (player.moving) {
      moveCircle(player, mx * speed * dt, my * speed * dt, PLAYER_R);
      player.angle = turnToward(player.angle, Math.atan2(my, mx), dt * 10);
      player.stepAcc += speed * dt;
      if (player.stepAcc > 26) {
        player.stepAcc = 0;
        if (audio) audio.playerStep(player.running);
      }
    }

    // --- running is loud: nearby guards hear it and turn to look.
    if (player.running && player.moving) {
      for (const guard of world.guards) {
        const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
        if (dist < HEAR_RUN_RADIUS && guard.mode !== 'chase') {
          guard.alertness = Math.min(1, guard.alertness + 0.3);
          guard.lastSeen = { x: player.x, y: player.y };
          guard.angle = turnToward(guard.angle, Math.atan2(player.y - guard.y, player.x - guard.x), dt * 8);
          if (guard.alertness > 0.55) guard.mode = 'chase';
        }
      }
    }

    // --- vision: the most alert guard drives the suspicion meter.
    let worst = 0;
    let anySeen = false;
    for (const guard of world.guards) {
      updateGuard(guard, dt, audio);
      if (guard.seen) {
        anySeen = true;
        worst = Math.max(worst, guard.seeAmount);
      }
    }
    if (anySeen) {
      const lit = playerLit();
      const mult = lit ? SEE_LIGHT_MULT : SEE_SHADOW_MULT;
      const rate = (SEE_RATE_FAR + (SEE_RATE_CLOSE - SEE_RATE_FAR) * worst) * mult;
      world.suspicion = Math.min(100, world.suspicion + rate * dt);
      if (world.suspicion >= 100 && !world.alarm) {
        world.alarm = true;
        world.alarmTimer = ALARM_HOLD;
        for (const guard of world.guards) {
          if (guard.mode !== 'chase') {
            guard.mode = 'chase';
            guard.lastSeen = { x: player.x, y: player.y };
          }
        }
        events |= EVENT_ALARM;
        if (audio) audio.alert();
      }
    } else {
      world.suspicion = Math.max(0, world.suspicion - SUSPICION_DECAY * dt);
    }

    if (world.alarm) {
      if (anySeen) world.alarmTimer = ALARM_HOLD;
      else world.alarmTimer -= dt;
      if (world.alarmTimer <= 0) {
        world.alarm = false;
        world.suspicion = 30;
        for (const guard of world.guards) {
          if (guard.mode === 'chase') {
            guard.mode = 'search';
            guard.searchT = SEARCH_TIME;
          }
        }
      }
    }

    // --- caught: a chasing guard that reaches the courier ends the run.
    if (world.alarm) {
      for (const guard of world.guards) {
        if (Math.hypot(guard.x - player.x, guard.y - player.y) < CAPTURE_R + PLAYER_R) {
          world.status = 'caught';
          if (audio) audio.caught();
          return events | EVENT_CAUGHT;
        }
      }
    }

    // --- letters and the exit.
    for (const letter of world.letters) {
      if (letter.taken) continue;
      const c = tileCenter(letter.x, letter.y);
      if (Math.hypot(c.x - player.x, c.y - player.y) < 24) {
        letter.taken = true;
        world.lettersTaken += 1;
        events |= EVENT_PICKUP;
        if (audio) audio.pickup();
      }
    }
    const exitTile = tileAtPx(player.x, player.y);
    if (exitTile.tx === parsed.exit.x && exitTile.ty === parsed.exit.y) {
      world.status = 'level-clear';
      if (audio) audio.levelClear();
      return events | EVENT_CLEAR;
    }

    return events;
  }

  function reset() {
    const fresh = createWorld(levelDef, () => 0.5);
    world.time = 0;
    world.suspicion = 0;
    world.alarm = false;
    world.alarmTimer = 0;
    world.status = 'play';
    world.lettersTaken = 0;
    world.player = fresh.player;
    world.guards = fresh.guards;
    world.letters = fresh.letters;
  }

  return {
    state: world,
    parsed,
    exit,
    step,
    reset,
    playerOnHedge,
    playerLit,
    tileAtPx,
    isWallTile,
    isHedgeTile,
    losClear,
  };
}

// Re-exported for the fixed-step loop in main.js.
export { STEP };
