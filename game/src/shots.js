// Lamplight Courier — the staged scenes behind ?shot=cover|patrol|alarm|title.
// Each one poses the real world (real levels, real guards, real renderer)
// at a fixed moment, so a screenshot is a true render of the game and the
// same seed always gives the same frame. No input is simulated: the poses
// are set directly on the world's state.

import { LEVELS } from './levels.js';
import { createWorld, tileCenter } from './world.js';
import { createRandom } from './random.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

function poseGuard(guard, tx, ty, angle, mode, alertness) {
  const c = tileCenter(tx, ty);
  guard.x = c.x;
  guard.y = c.y;
  guard.angle = angle;
  guard.mode = mode;
  guard.alertness = alertness;
  guard.lastSeen = null;
  guard.pauseT = 0;
  guard.searchT = 0;
}

/**
 * Build the world for the named scene and return the screen to draw over it.
 * Any other name stages the title scene.
 */
export function stageShot(name, seed) {
  const random = createRandom(seed);
  if (name === 'patrol') {
    const world = createWorld(LEVELS[1], random);
    const state = world.state;
    const playerAt = tileCenter(10, 9);
    state.player.x = playerAt.x;
    state.player.y = playerAt.y;
    state.player.angle = Math.PI / 2;
    poseGuard(state.guards[0], 12, 8, Math.PI / 2, 'patrol', 0.4);
    poseGuard(state.guards[1], 21, 6, Math.PI, 'patrol', 0);
    poseGuard(state.guards[2], 12, 5, 0, 'patrol', 0);
    state.suspicion = 35;
    state.time = 12.4;
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    const world = createWorld(LEVELS[0], random);
    const state = world.state;
    const playerAt = tileCenter(12, 10);
    state.player.x = playerAt.x;
    state.player.y = playerAt.y;
    state.player.angle = -Math.PI / 2;
    poseGuard(state.guards[0], 12, 7, Math.PI / 2, 'chase', 1);
    state.guards[0].lastSeen = { x: playerAt.x, y: playerAt.y };
    state.guards[0].seen = true;
    state.guards[0].seeAmount = 0.8;
    poseGuard(state.guards[1], 19, 12, Math.PI, 'chase', 0.7);
    state.guards[1].lastSeen = { x: playerAt.x, y: playerAt.y };
    state.suspicion = 88;
    state.alarm = true;
    state.alarmTimer = 4.5;
    state.time = 24.7;
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'cover') {
    const world = createWorld(LEVELS[0], random);
    const state = world.state;
    // The courier slips along the hedge line, one step past the cone's edge.
    const playerAt = tileCenter(20, 15);
    state.player.x = playerAt.x;
    state.player.y = playerAt.y;
    state.player.angle = Math.PI / 2;
    poseGuard(state.guards[0], 12, 10, 0, 'patrol', 0);
    poseGuard(state.guards[1], 21, 9, Math.PI / 2, 'patrol', 0);
    state.suspicion = 0;
    state.time = 8.2;
    return { world, screen: SCREEN_PLAY };
  }
  const world = createWorld(LEVELS[0], random);
  return { world, screen: SCREEN_TITLE };
}
