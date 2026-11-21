// Lamplight Courier — shared tuning numbers and palette.
// One place for every magic number so levels, world and render agree.

export const TILE = 40;
export const COLS = 26;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1040 — the level area
export const HUD_W = 240; // right-hand panel
export const CANVAS_W = VIEW_W + HUD_W; // 1280
export const CANVAS_H = ROWS * TILE; // 720
export const STEP = 1 / 60;

// Movement speeds, pixels per second.
export const PLAYER_WALK = 150;
export const PLAYER_RUN = 215;
export const GUARD_PATROL = 68;
export const GUARD_CHASE = 165;
export const GUARD_SEARCH = 95;

// Radii, in pixels.
export const PLAYER_R = 13;
export const GUARD_R = 14;
export const GUARD_VIEW_RANGE = 235;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees
export const LAMP_RADIUS = 130;
export const HEAR_RUN_RADIUS = 170;
export const CAPTURE_R = 17;

// Suspicion: 0..100. A guard that sees the player fills it; hidden, it drains.
export const SEE_RATE_CLOSE = 95; // per second at point blank
export const SEE_RATE_FAR = 26; // per second at the edge of the cone
export const SEE_LIGHT_MULT = 1.6; // player standing in lamplight
export const SEE_SHADOW_MULT = 0.55; // player in darkness
export const SEE_HEDGE_MULT = 0; // a hedge hides the player outright
export const SUSPICION_DECAY = 22; // per second while unseen
export const ALARM_HOLD = 4.5; // seconds unseen before the alarm ends
export const SEARCH_TIME = 6; // seconds a guard searches the last seen spot

// Palette: a night garden, warm lamps, cold shadows.
export const COLORS = {
  floorA: '#232c3d',
  floorB: '#202835',
  floorLine: '#2b3648',
  wall: '#4a5468',
  wallTop: '#6b7a94',
  wallDark: '#333d4f',
  hedge: '#1d4a2e',
  hedgeLight: '#2f6b42',
  hedgeDark: '#143521',
  lampGlow: 'rgba(255, 196, 110, 0.20)',
  lampCore: '#ffd28a',
  exitGlow: '#39d98a',
  exitDark: '#0f5c33',
  guardBody: '#c0392b',
  guardDark: '#7e2318',
  guardHelmet: '#e8e4d8',
  coneCalm: 'rgba(255, 214, 110, 0.30)',
  coneWary: 'rgba(255, 150, 60, 0.42)',
  coneAlarm: 'rgba(255, 70, 60, 0.50)',
  playerCloak: '#2ec4b6',
  playerDark: '#17807a',
  playerHood: '#e9f5f2',
  letter: '#ffd166',
  hudBg: '#141a26',
  hudPanel: '#1b2334',
  hudText: '#e8ecf4',
  hudDim: '#9aa7bd',
  danger: '#ff5a4e',
  calm: '#39d98a',
};
