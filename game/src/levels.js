// Lamplight Courier — the three levels.
// Legend: '#' wall, '.' floor, 'H' hedge (cover: blocks sight, hides the
// player standing in it), 'L' lamp (warm light, no collision), 'o' a letter
// to collect, 'P' the courier's start, 'E' the exit gate.
// Guards walk the waypoint lists in tile coordinates, pausing at each stop
// to look around; facing follows their movement.
// A row is '#' + four 6-tile chunks + '#': 26 tiles wide, 18 rows tall.
// Wall pillars leave gaps so every floor tile is reachable from the start
// (checked by /tmp/validate-levels.mjs).

const row = (a, b, c, d) => `#${a}${b}${c}${d}#`;
const WALL = '##########################';

export const LEVELS = [
  {
    name: 'The Garden Gate',
    hint: 'Slip past the two lantern guards. Hedges hide you; lamplight gives you away.',
    map: [
      WALL,
      row('P..H..', '.....L', '......', '..o...'),
      row('......', '.#....', 'H...#.', '......'),
      row('..H...', '.#....', '.H..#.', '...H..'),
      row('......', '.#....', '....#.', '......'),
      row('..L...', '..H...', '.H....', '....L.'),
      row('......', '.#...H', '....#.', '....H.'),
      row('..H...', '.#....', '....#.', '......'),
      row('......', '.#....', 'H...#.', '......'),
      row('..L...', '..H...', '.o....', '.o....'),
      row('......', '.#....', '....#.', '...H..'),
      row('..H...', '.#...H', '....#.', '......'),
      row('......', '.#....', '....#.', '....H.'),
      row('..L...', '..H...', '.H....', '.....L'),
      row('......', '.#....', 'H...#.', '......'),
      row('..H...', '.#....', '....#.', '...H..'),
      row('......', '.#....', '....#.', '.o...E'),
      WALL,
    ],
    guards: [
      { waypoints: [[12, 2], [12, 8], [12, 14]], pause: 1.4 },
      { waypoints: [[21, 15], [21, 9], [21, 3]], pause: 1.2 },
    ],
  },
  {
    name: 'The Long Gallery',
    hint: 'Three guards, longer patrols. Wait for a cone to sweep past, then move.',
    map: [
      WALL,
      row('P.....', '......', '.L....', '.....o'),
      row('..H...', '.#....', '....#.', '....H.'),
      row('......', '.#...H', '....#.', '......'),
      row('..o...', '.#....', '....#.', '...H..'),
      row('..L...', 'H.....', '.H....', '....L.'),
      row('......', '.#....', 'H...#.', '....H.'),
      row('..H...', '.#....', '....#.', '......'),
      row('......', '.#...o', '....#.', '...H..'),
      row('..L...', '......', '.H....', '.....o'),
      row('......', '.#....', '....#.', '....H.'),
      row('..H...', '.#...H', '....#.', '......'),
      row('......', '.#....', '....#.', '...H..'),
      row('....H.', '......', '.L....', '...o..'),
      row('..L...', '.#....', 'H...#.', '......'),
      row('......', '.#....', '....#.', '...H..'),
      row('..o...', '.#....', '....#.', '.....E'),
      WALL,
    ],
    guards: [
      { waypoints: [[12, 2], [12, 8], [12, 14]], pause: 1.1 },
      { waypoints: [[21, 15], [21, 9], [21, 3]], pause: 1.3 },
      { waypoints: [[4, 5], [12, 5], [20, 5]], pause: 1.0 },
    ],
  },
  {
    name: 'The Vault Court',
    hint: 'Four guards and little cover. Run only when no cone is near — they hear footsteps.',
    map: [
      WALL,
      row('P..H..', '......', '..L...', '#..o..'),
      row('.....#', '......', 'H.....', '#..H..'),
      row('..H..#', '......', '....H.', '......'),
      row('.....#', '..o..H', '......', '#...H.'),
      row('..L...', '......', '..H...', '#....L'),
      row('.....#', '......', 'H.....', '#..H..'),
      row('..H..#', '......', '....L.', '......'),
      row('.....#', '.....o', '......', '#...H.'),
      row('..L..H', '......', '..H...', '#....o'),
      row('.....#', '......', 'H.....', '#..H..'),
      row('..H..#', '......', '....H.', '......'),
      row('.....#', '..H...', '..L...', '#...H.'),
      row('....H.', '......', 'H.....', '#....L'),
      row('..L..#', '......', '......', '#..H..'),
      row('.....#', '.....H', '......', '...o..'),
      row('..o..#', '......', '..H...', '#....E'),
      WALL,
    ],
    guards: [
      { waypoints: [[10, 2], [10, 8], [10, 14]], pause: 0.9 },
      { waypoints: [[14, 15], [14, 9], [14, 3]], pause: 1.0 },
      { waypoints: [[22, 3], [22, 9], [22, 15]], pause: 0.9 },
      { waypoints: [[9, 13], [14, 13]], pause: 1.2 },
    ],
  },
];

/** Parse one level's map into tiles, lamps, letters, start and exit. */
export function parseLevel(level) {
  const rows = level.map;
  const height = rows.length;
  const width = rows[0].length;
  const walls = new Set();
  const hedges = new Set();
  const lamps = [];
  const letters = [];
  let start = null;
  let exit = null;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ch = rows[y][x];
      const key = `${x},${y}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'H') hedges.add(key);
      else if (ch === 'L') lamps.push({ x, y });
      else if (ch === 'o') letters.push({ x, y, taken: false });
      else if (ch === 'P') start = { x, y };
      else if (ch === 'E') exit = { x, y };
    }
  }
  return { width, height, walls, hedges, lamps, letters, start, exit };
}

export const keyOf = (x, y) => `${x},${y}`;
