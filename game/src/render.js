// Lamplight Courier — everything the player sees, drawn on one canvas.
// Night garden: cold floor, warm lamp pools, pale vision cones, the courier
// in teal against it all. The HUD panel on the right carries the level,
// the suspicion meter, the letters and the controls.

import {
  TILE, VIEW_W, HUD_W, CANVAS_W, CANVAS_H, PLAYER_R, GUARD_R, GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE, LAMP_RADIUS, COLORS,
} from './config.js';
import { tileCenter } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  // Two floor tiles, speckled once with a fixed seed so every run matches.
  const speckles = createRandom(1234);
  const tileA = document.createElement('canvas');
  tileA.width = TILE;
  tileA.height = TILE;
  const ta = tileA.getContext('2d');
  ta.fillStyle = COLORS.floorA;
  ta.fillRect(0, 0, TILE, TILE);
  const tileB = document.createElement('canvas');
  tileB.width = TILE;
  tileB.height = TILE;
  const tb = tileB.getContext('2d');
  tb.fillStyle = COLORS.floorB;
  tb.fillRect(0, 0, TILE, TILE);
  for (const t of [ta, tb]) {
    for (let i = 0; i < 14; i += 1) {
      t.fillStyle = speckles() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.10)';
      t.fillRect(Math.floor(speckles() * (TILE - 3)), Math.floor(speckles() * (TILE - 3)), 3, 3);
    }
  }
  const patternA = ctx.createPattern(tileA, 'repeat');
  const patternB = ctx.createPattern(tileB, 'repeat');

  function drawFloor(state) {
    for (let ty = 0; ty < state.parsed.height; ty += 1) {
      for (let tx = 0; tx < state.parsed.width; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? patternA : patternB;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, VIEW_W - 1, CANVAS_H - 1);
  }

  function drawLampGlow(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const lamp of state.parsed.lamps) {
      const c = tileCenter(lamp.x, lamp.y);
      const g = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, LAMP_RADIUS);
      g.addColorStop(0, 'rgba(255, 200, 120, 0.28)');
      g.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, LAMP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawExit(state) {
    const c = tileCenter(state.parsed.exit.x, state.parsed.exit.y);
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 52);
    g.addColorStop(0, `rgba(57, 217, 138, ${0.5 * pulse})`);
    g.addColorStop(1, 'rgba(57, 217, 138, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.exitDark;
    ctx.strokeStyle = COLORS.exitGlow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.exitGlow;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', c.x, c.y - 30);
    // Chevrons pointing out of the garden.
    ctx.beginPath();
    ctx.moveTo(c.x - 8, c.y - 6);
    ctx.lineTo(c.x + 2, c.y);
    ctx.lineTo(c.x - 8, c.y + 6);
    ctx.moveTo(c.x + 2, c.y - 6);
    ctx.lineTo(c.x + 12, c.y);
    ctx.lineTo(c.x + 2, c.y + 6);
    ctx.strokeStyle = COLORS.exitGlow;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawLetters(state) {
    for (const letter of state.letters) {
      if (letter.taken) continue;
      const c = tileCenter(letter.x, letter.y);
      const bob = Math.sin(state.time * 2.5 + letter.x) * 2;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.letter;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = '#8a6d1f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(0, 0);
      ctx.lineTo(7, -7);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHedge(tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = COLORS.hedgeDark;
    roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.hedge;
    roundRect(x + 4, y + 4, TILE - 8, TILE - 8, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.hedgeLight;
    const dots = [[12, 12], [26, 10], [20, 22], [30, 28], [10, 28]];
    for (const [dx, dy] of dots) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWall(tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = COLORS.wallDark;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(x + 2, y + 2, TILE - 4, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
  }

  function drawLampPost(lamp) {
    const c = tileCenter(lamp.x, lamp.y);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(c.x - 2, c.y - 2, 4, 16);
    ctx.fillStyle = COLORS.lampCore;
    ctx.beginPath();
    ctx.arc(c.x, c.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(c.x, c.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function coneColor(guard, state) {
    if (state.alarm) return COLORS.coneAlarm;
    if (guard.alertness > 0.3 || guard.seen) return COLORS.coneWary;
    return COLORS.coneCalm;
  }

  function drawCone(guard, state) {
    const color = coneColor(guard, state);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, GUARD_VIEW_RANGE, guard.angle - GUARD_VIEW_HALF_ANGLE, guard.angle + GUARD_VIEW_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.55)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle - GUARD_VIEW_HALF_ANGLE) * GUARD_VIEW_RANGE, guard.y + Math.sin(guard.angle - GUARD_VIEW_HALF_ANGLE) * GUARD_VIEW_RANGE);
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle + GUARD_VIEW_HALF_ANGLE) * GUARD_VIEW_RANGE, guard.y + Math.sin(guard.angle + GUARD_VIEW_HALF_ANGLE) * GUARD_VIEW_RANGE);
    ctx.stroke();
    ctx.restore();
  }

  function drawGuard(guard, state) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_R + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardBody;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_R, 0, Math.PI * 2);
    ctx.fill();
    // Helmet brim and the direction the guard faces.
    ctx.fillStyle = COLORS.guardHelmet;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 3, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(guard.x - 7, guard.y - 4, 14, 3);
    ctx.strokeStyle = '#2b0f0a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 17, guard.y + Math.sin(guard.angle) * 17);
    ctx.stroke();
    // Lantern dot at the guard's belt.
    ctx.fillStyle = COLORS.lampCore;
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle + 1.2) * 9, guard.y + Math.sin(guard.angle + 1.2) * 9, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion mark above the head.
    if (guard.seen || guard.alertness > 0.3) {
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = state.alarm ? COLORS.danger : '#ffb347';
      ctx.fillText(state.alarm ? '!' : '?', guard.x, guard.y - 26);
    }
    ctx.restore();
  }

  function drawPlayer(state, onHedge) {
    const p = state.player;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = onHedge ? 0.85 : 1;
    ctx.fillStyle = COLORS.playerDark;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    // Hood and the satchel with the sealed letter.
    ctx.fillStyle = COLORS.playerHood;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 3, p.y + Math.sin(p.angle) * 3 - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6d1f';
    ctx.beginPath();
    ctx.arc(p.x - Math.cos(p.angle) * 8, p.y - Math.sin(p.angle) * 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (onHedge) {
      // Fronds over the courier: half-hidden in the hedge.
      ctx.fillStyle = COLORS.hedgeLight;
      for (const [dx, dy] of [[-8, 6], [0, 9], [8, 5], [-3, -6], [6, -7]]) {
        ctx.beginPath();
        ctx.arc(p.x + dx, p.y + dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state.suspicion > 4) {
      ctx.save();
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = state.alarm ? COLORS.danger : '#ffb347';
      ctx.fillText('!', p.x, p.y - 26);
      ctx.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(
      VIEW_W / 2, CANVAS_H / 2, CANVAS_H * 0.42,
      VIEW_W / 2, CANVAS_H / 2, CANVAS_H * 0.85,
    );
    g.addColorStop(0, 'rgba(4, 8, 18, 0)');
    g.addColorStop(1, 'rgba(4, 8, 18, 0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, CANVAS_H);
  }

  function drawHud(state, ui) {
    const x0 = VIEW_W;
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(x0, 0, HUD_W, CANVAS_H);
    ctx.fillStyle = COLORS.hudPanel;
    ctx.fillRect(x0 + 10, 10, HUD_W - 20, CANVAS_H - 20);
    const x = x0 + 24;
    let y = 44;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`GARDEN ${ui.levelIndex + 1} / ${ui.totalLevels}`, x, y);
    y += 26;
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(state.levelDef.name, x, y, HUD_W - 48);
    y += 34;
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    wrapText(state.levelDef.hint, x, y, HUD_W - 48, 16);
    y += 52;
    // Suspicion meter.
    ctx.fillStyle = state.alarm ? COLORS.danger : COLORS.hudText;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(state.alarm ? 'ALARM — HIDE!' : 'SPOTTED', x, y);
    y += 10;
    const barW = HUD_W - 48;
    ctx.fillStyle = '#0d1320';
    roundRect(x, y, barW, 14, 7);
    ctx.fill();
    const frac = state.suspicion / 100;
    ctx.fillStyle = state.alarm ? COLORS.danger : frac > 0.55 ? '#ffb347' : COLORS.calm;
    if (frac > 0.01) {
      roundRect(x, y, Math.max(14, barW * frac), 14, 7);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    roundRect(x, y, barW, 14, 7);
    ctx.stroke();
    y += 44;
    // Letters, time, best.
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Letters  ${state.lettersTaken} / ${state.letters.length}`, x, y);
    y += 24;
    ctx.fillText(`Time  ${formatTime(state.time)}`, x, y);
    y += 24;
    if (ui.best > 0) ctx.fillText(`Best  ${formatTime(ui.best)}`, x, y);
    y += 40;
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Move  WASD / arrows', x, y);
    y += 20;
    ctx.fillText('Run (loud)  Shift', x, y);
    y += 20;
    ctx.fillText('Click  walk there', x, y);
    y += 20;
    ctx.fillText('Pause  P   Mute  M', x, y);
    y += 36;
    ctx.fillStyle = ui.muted ? COLORS.danger : COLORS.hudDim;
    ctx.fillText(ui.muted ? 'Sound: OFF  (M)' : 'Sound: ON  (M)', x, y);
    y += 30;
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Hedges hide you.', x, y);
    y += 17;
    ctx.fillText('Lamplight gives you away.', x, y);
    y += 17;
    ctx.fillText('Running is loud.', x, y);
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(6, 10, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent || COLORS.hudText;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, VIEW_W / 2, CANVAS_H / 2 - 70);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '16px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW_W / 2, CANVAS_H / 2 - 18 + i * 28);
    });
  }

  function draw(state, screen, ui) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawFloor(state);
    drawLampGlow(state);
    drawExit(state);
    drawLetters(state);
    for (const key of state.parsed.hedges) {
      const [tx, ty] = key.split(',').map(Number);
      drawHedge(tx, ty);
    }
    for (const key of state.parsed.walls) {
      const [tx, ty] = key.split(',').map(Number);
      drawWall(tx, ty);
    }
    for (const lamp of state.parsed.lamps) drawLampPost(lamp);
    for (const guard of state.guards) drawCone(guard, state);
    for (const guard of state.guards) drawGuard(guard, state);
    const { tx, ty } = (() => {
      const px = Math.floor(state.player.x / TILE);
      const py = Math.floor(state.player.y / TILE);
      return { tx: px, ty: py };
    })();
    drawPlayer(state, state.parsed.hedges.has(`${tx},${ty}`));
    drawVignette();
    drawHud(state, ui);

    if (screen === SCREEN_TITLE) {
      overlay('LAMPLIGHT COURIER', [
        'Pip the night courier must cross three walled gardens',
        'and deliver one sealed letter — unseen.',
        '',
        'Sneak past the lantern guards. Hide in the hedges.',
        'Reach the green EXIT gate.',
        '',
        'Press SPACE or click to begin',
      ]);
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Press P to keep sneaking.']);
    } else if (screen === SCREEN_LEVEL) {
      overlay('GARDEN CROSSED', [
        `Letters found: ${state.lettersTaken} / ${state.letters.length}`,
        `Time: ${formatTime(state.time)}`,
        '',
        'Press SPACE for the next garden',
      ], COLORS.calm);
    } else if (screen === SCREEN_OVER) {
      overlay('CAUGHT!', [
        'A lantern guard caught Pip in the open.',
        '',
        'Press SPACE to try this garden again',
      ], COLORS.danger);
    } else if (screen === SCREEN_VICTORY) {
      overlay('DELIVERED!', [
        'The sealed letter reached the far gate — unseen.',
        `Total time: ${formatTime(ui.totalTime)}   Letters: ${ui.totalLetters} / ${ui.totalLettersMax}`,
        '',
        'Press SPACE to play again',
      ], COLORS.calm);
    }
  }

  return { draw };
}
