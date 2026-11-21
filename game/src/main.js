// Lamplight Courier — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. The game moves between six screens: title, play, paused, level
// clear, caught and victory, across three gardens.
//
// ?seed=N fixes the patrol jitter. ?shot=cover|patrol|alarm|title (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
// window.__lamplight exposes the live screen and world state for playtests.

import { STEP } from './config.js';
import { LEVELS } from './levels.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CLEAR } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, createInput } from './input.js';
import { AudioEngine } from './audio.js';
import {
  createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_LEVEL,
  SCREEN_OVER, SCREEN_VICTORY,
} from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'lamplight-courier-best-seconds';
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = new AudioEngine();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, seed);
  const world = scene.world;
  const ui = {
    levelIndex: name === 'patrol' ? 1 : 0,
    totalLevels: LEVELS.length,
    best: readBest(),
    muted: false,
    totalTime: 0,
    totalLetters: 0,
    totalLettersMax: 0,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let levelIndex = 0;
  let world = createWorld(LEVELS[levelIndex], createRandom(seed));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let muted = false;
  let totalTime = 0;
  let totalLetters = 0;
  let totalLettersMax = world.state.letters.length;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startLevel(index) {
    levelIndex = index;
    world = createWorld(LEVELS[levelIndex], createRandom(seed + index));
    totalLettersMax += world.state.letters.length;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Garden ${index + 1}: ${LEVELS[index].name}. Reach the green exit.`);
  }

  function startGame() {
    totalTime = 0;
    totalLetters = 0;
    totalLettersMax = 0;
    startLevel(0);
  }

  function endLevel() {
    totalTime += world.state.time;
    totalLetters += world.state.lettersTaken;
    if (levelIndex + 1 >= LEVELS.length) {
      screen = SCREEN_VICTORY;
      if (best === 0 || totalTime < best) {
        best = totalTime;
        saveBest(best);
      }
      audio.win();
      announce(`Delivered! Total time ${totalTime.toFixed(0)} seconds.`);
    } else {
      screen = SCREEN_LEVEL;
      announce(`Garden crossed in ${world.state.time.toFixed(0)} seconds.`);
    }
  }

  function endCaught() {
    screen = SCREEN_OVER;
    announce('Caught. Press Space to try this garden again.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions) audio.ensure();
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_LEVEL) startLevel(levelIndex + 1);
    else if (actions & ACTION_CONFIRM && screen === SCREEN_OVER) startLevel(levelIndex);
    else if (actions & ACTION_CONFIRM && screen === SCREEN_VICTORY) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the guards patrol behind the title.
      world.step(STEP, { dir: null, run: false, click: null }, null);
      return;
    }
    const click = input.takeClick();
    const events = world.step(STEP, {
      dir: input.direction(),
      run: input.running(),
      click: click && click.x < 1040 ? click : null,
    }, audio);
    if (events & EVENT_CLEAR) endLevel();
    else if (events & EVENT_CAUGHT) endCaught();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, {
      levelIndex,
      totalLevels: LEVELS.length,
      best,
      muted,
      totalTime,
      totalLetters,
      totalLettersMax,
    });
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A read-only handle for playtests: the live screen and world state.
  window.__lamplight = {
    version: 1,
    get screen() { return screen; },
    get state() { return world.state; },
    get levelIndex() { return levelIndex; },
  };

  announce('Lamplight Courier. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
