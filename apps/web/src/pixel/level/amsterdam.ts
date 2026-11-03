import { bigDigits, bigDigitsWidth, dith, mix, PixelCanvas } from '../canvas.js';
import type { Row } from './glass.js';

/**
 * The Amsterdam level backdrop, ported from `ams_pixel3.py`: plank wall with
 * lamp glow, Delft tiles, the brass-framed header sign, the shelf of
 * stoneware jugs, the hanging lamp, and the counter with its panelled front.
 */

export const W = 195;
export const H = 422;

/** The header sign holding the move counter (art px). */
export const SIGN = { x: 121, y: 32, w: 70, h: 23 } as const;
/** The restart button, a small brass disc under the sign. */
export const RESTART = { x: 176, y: 59 } as const;

const STONE = [
  '#4E4234',
  '#C2B090',
  '#E2D4B6',
  '#F4EAD4',
  '#D6C6A6',
  '#C2B090',
  '#A8966F',
  '#8C7A60',
  '#6E604A',
  '#4E4234',
];

function wall(cv: PixelCanvas): void {
  const PW = 19;
  for (let i = 0, x = 0; x < W; i++, x += PW) {
    const base = i % 2 ? '#291910' : '#2C1B11';
    cv.rect(x, 27, PW, 292, base);
    cv.vline(x, 27, 292, '#1A0F08');
    cv.vline(x + 1, 27, 292, mix(base, '#5A3A24', 0.35));
    cv.vline(x + PW - 1, 27, 292, mix(base, '#120A05', 0.45));
    const seed = i * 7 + 3;
    for (let k = 0; k < 14; k++) {
      const gy = 34 + ((seed * 37 + k * 53) % 280);
      const gx = x + 4 + ((seed + k * 5) % 11);
      const ln = 4 + ((k * 7 + seed) % 9);
      cv.vline(gx, gy, ln, mix(base, '#120A05', 0.35));
      cv.vline(gx + 1, gy + 1, Math.max(1, ln - 3), mix(base, '#5A3A24', 0.18));
    }
    for (let k = 0; k < 3; k++) {
      const ky = 60 + ((seed * 71 + k * 97) % 240);
      const kx = x + 6 + ((seed * 3 + k * 4) % 7);
      cv.sprite(kx, ky, ['.##.', '#..#', '.##.'], { '#': mix(base, '#120A05', 0.45) });
    }
  }
  for (const y of [150, 255]) {
    cv.hline(0, y, W, '#1A0F08');
    cv.hline(0, y + 1, W, '#3A2516');
    cv.hline(0, y + 2, W, '#24160D');
  }
}

/** Warm dithered glow around the lamp. `phase` shifts the dither for a subtle flicker. */
function lampGlow(cv: PixelCanvas, phase = 0): void {
  const LX = 97;
  const LY = 80;
  for (let y = 27; y < 200; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - LX) * 0.85, (y - LY) * 1.1);
      if (d >= 70) continue;
      const t = (1 - d / 70) ** 1.4;
      const lvl = t * 4;
      const step = Math.floor(lvl) + (dith(x + phase, y + phase, lvl - Math.floor(lvl)) ? 1 : 0);
      if (step) cv.tint(x, y, '#E8A33D', 0.065 * step);
    }
  }
}

function tiles(cv: PixelCanvas): void {
  cv.rect(0, 0, W, 27, '#B9A586');
  const TB = '#2A5BA8';
  const TBD = '#1A3E80';
  const TBL = '#7AA2E6';
  for (let i = 0; i < 9; i++) {
    const tx = 1 + i * 23;
    cv.rect(tx, 1, 22, 22, '#F3E6CC');
    cv.hline(tx, 1, 22, '#FFF9EC');
    cv.vline(tx, 1, 22, '#FFF9EC');
    cv.hline(tx, 22, 22, '#D8C7A6');
    cv.vline(tx + 21, 1, 22, '#D8C7A6');
    const cx = tx + 11;
    const cy = 12;
    const PET = ['..##..', '.####.', '.####.', '..##..'];
    const SIDE = ['.##.', '####', '####', '.##.'];
    cv.sprite(cx - 3, cy - 7, PET, { '#': TB });
    cv.sprite(cx - 3, cy + 3, PET, { '#': TB });
    cv.sprite(cx - 7, cy - 2, SIDE, { '#': TB });
    cv.sprite(cx - 7, cy - 1, SIDE, { '#': TB });
    cv.sprite(cx + 3, cy - 1, SIDE, { '#': TB });
    cv.px(cx - 2, cy - 6, TBL);
    cv.px(cx - 6, cy, TBL);
    cv.px(cx - 2, cy + 4, TBL);
    cv.px(cx + 4, cy, TBL);
    cv.rect(cx - 1, cy - 1, 2, 2, TBD);
    cv.px(cx - 1, cy - 1, '#F3E6CC');
    for (const [ax, ay, sx, sy] of [
      [tx + 1, 2, 1, 1],
      [tx + 20, 2, -1, 1],
      [tx + 1, 21, 1, -1],
      [tx + 20, 21, -1, -1],
    ] as const) {
      for (let k = 0; k < 5; k++) cv.px(ax + sx * k, ay + sy * (4 - k), TB);
      cv.px(ax, ay, TBD);
    }
  }
  cv.hline(0, 24, W, '#8C7A60');
  cv.hline(0, 25, W, '#5A3A24');
  cv.hline(0, 26, W, '#3B2416');
  cv.shadowBox(0, 27, W, 3, 0.5, 0.45);
}

const ARROW = [
  '.....#',
  '....##',
  '...##.',
  '..##..',
  '.##...',
  '##....',
  '.##...',
  '..##..',
  '...##.',
  '....##',
  '.....#',
];

function header(cv: PixelCanvas): void {
  cv.sprite(9, 39, ARROW, { '#': '#120A05' });
  cv.sprite(8, 38, ARROW, { '#': '#F3E6CC' });
  brassFrame(cv, SIGN.x, SIGN.y, SIGN.w, SIGN.h);
}

/** Brass-framed dark sign, as the reference header. */
export function brassFrame(cv: PixelCanvas, sx: number, sy: number, sw: number, sh: number): void {
  cv.shadowBox(sx + 2, sy + 2, sw, sh, 0.5, 0.5);
  cv.rect(sx, sy, sw, sh, '#C9A24A');
  cv.hline(sx, sy, sw, '#F4D58A');
  cv.vline(sx, sy, sh, '#F4D58A');
  cv.hline(sx, sy + sh - 1, sw, '#8A6A1E');
  cv.vline(sx + sw - 1, sy, sh, '#8A6A1E');
  cv.rect(sx + 3, sy + 3, sw - 6, sh - 6, '#22140B');
  cv.hline(sx + 3, sy + 3, sw - 6, '#120A05');
  cv.vline(sx + 3, sy + 3, sh - 6, '#120A05');
  cv.hline(sx + 2, sy + sh - 3, sw - 4, '#A8842E');
  for (const [px, py] of [
    [sx + 1, sy + 1],
    [sx + sw - 3, sy + 1],
    [sx + 1, sy + sh - 3],
    [sx + sw - 3, sy + sh - 3],
  ] as const) {
    cv.rect(px, py, 2, 2, '#FFF0B8');
    cv.px(px + 1, py + 1, '#8A6A1E');
  }
}

/** A small brass disc with a circular arrow: the restart button. */
function restartIcon(cv: PixelCanvas): void {
  const { x, y } = RESTART;
  const DISC = [
    '...#####...',
    '.#########.',
    '.#########.',
    '###########',
    '###########',
    '###########',
    '###########',
    '###########',
    '.#########.',
    '.#########.',
    '...#####...',
  ];
  cv.sprite(x + 1, y + 1, DISC, { '#': '#120A05' });
  cv.sprite(x, y, DISC, { '#': '#C9A24A' });
  cv.hline(x + 3, y, 5, '#F4D58A');
  cv.vline(x, y + 3, 5, '#F4D58A');
  cv.hline(x + 3, y + 10, 5, '#8A6A1E');
  cv.sprite(x + 2, y + 2, ['..####.', '.#...##', '#...###', '#......', '#.....#', '.#...#.', '..###..'], {
    '#': '#22140B',
  });
}

function jug(cv: PixelCanvas, x: number, y: number, h: number): void {
  STONE.forEach((col, c) => {
    const inset = c === 0 || c === 9 ? 2 : c === 1 || c === 8 ? 1 : 0;
    cv.vline(x + c, y + inset, h - inset, col);
  });
  cv.hline(x + 2, y + h - 1, 6, '#6E604A');
  cv.hline(x + 3, y + h - 1, 2, '#8C7A60');
  cv.hline(x + 2, y - 1, 6, '#C2B090');
  cv.hline(x + 3, y - 1, 2, '#F4EAD4');
  cv.rect(x + 3, y - 5, 4, 4, '#A8966F');
  cv.vline(x + 3, y - 5, 4, '#D6C6A6');
  cv.vline(x + 6, y - 5, 4, '#7A6A50');
  cv.hline(x + 3, y - 6, 4, '#C2B090');
  cv.rect(x + 3, y - 8, 4, 2, '#6B4226');
  cv.hline(x + 3, y - 8, 4, '#8A5A36');
  cv.vline(x + 10, y + 2, 7, '#8C7A60');
  cv.vline(x + 11, y + 3, 5, '#5E5040');
  cv.px(x + 10, y + 1, '#A8966F');
  cv.px(x + 10, y + 9, '#6E604A');
  const ly = y + Math.floor(h / 2) - 3;
  cv.rect(x + 2, ly, 6, 6, '#F3E6CC');
  cv.hline(x + 2, ly + 5, 6, '#D8C7A6');
  cv.vline(x + 7, ly, 6, '#E2D2B2');
  cv.sprite(x + 3, ly + 1, ['.#..', '###.', '.#.#', '...#'], { '#': '#2A5BA8' });
}

function shelfAndLamp(cv: PixelCanvas): void {
  for (const [x, h] of [
    [10, 19],
    [26, 15],
    [42, 21],
    [130, 16],
    [146, 21],
    [162, 15],
  ] as const)
    jug(cv, x, 100 - h, h);
  cv.hline(0, 100, W, '#B4835A');
  cv.hline(0, 101, W, '#8A5A36');
  cv.rect(0, 102, W, 4, '#6B4226');
  cv.hline(0, 106, W, '#3B2416');
  cv.hline(0, 107, W, '#24160D');
  for (let x = 4; x < W; x += 13) cv.hline(x, 103 + (Math.floor(x / 13) % 2), 5, '#5A3A24');
  cv.shadowBox(0, 108, W, 6, 0.55, 0.45);
  cv.vline(97, 55, 12, '#120A05');
  cv.rect(94, 66, 7, 3, '#C9A24A');
  cv.hline(94, 66, 7, '#F4D58A');
  cv.px(100, 68, '#8A6A1E');
  const SHADE = [
    '......##########......',
    '....##############....',
    '...################...',
    '..##################..',
    '.####################.',
    '######################',
    '######################',
  ];
  SHADE.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== '#') continue;
      const t = i / 21;
      let col = t < 0.2 ? '#FFD08A' : t < 0.45 ? '#F4B04A' : t < 0.75 ? '#E8A33D' : '#B87A20';
      if (j === 0) col = mix(col, '#FFFFFF', 0.2);
      cv.px(86 + i, 69 + j, col);
    }
  });
  cv.hline(86, 75, 22, '#7A4A12');
  cv.rect(92, 76, 11, 3, '#FFF4D0');
  cv.hline(93, 79, 9, '#FFE2A8');
  cv.hline(95, 80, 5, '#FFD08A');
}

function counter(cv: PixelCanvas): void {
  cv.hline(0, 318, W, '#FFE8A8');
  cv.hline(0, 319, W, '#F4D58A');
  cv.hline(0, 320, W, '#C9A24A');
  cv.hline(0, 321, W, '#8A6A1E');
  cv.hline(0, 322, W, '#120A05');
  cv.rect(0, 323, W, 12, '#6B4226');
  cv.hline(0, 323, W, '#B4835A');
  cv.hline(0, 324, W, '#8A5A36');
  cv.hline(0, 334, W, '#3B2416');
  for (let k = 0; k < 22; k++) {
    const gx = (k * 29 + 7) % W;
    cv.hline(gx, 326 + (k % 6), 5 + (k % 5), '#5A3A24');
    cv.hline(gx + 2, 327 + (k % 6), 3, '#7A4A2C');
  }
  cv.rect(0, 335, W, H - 335, '#3B2416');
  cv.shadowBox(0, 335, W, 6, 0.6, 0.45);
  for (let px = 0; px < W; px += 39) {
    const x1 = px + 3;
    const y1 = 344;
    const w1 = 33;
    const h1 = H - 350;
    cv.rect(x1, y1, w1, h1, '#33200F');
    cv.hline(x1, y1, w1, '#1E120A');
    cv.vline(x1, y1, h1, '#1E120A');
    cv.hline(x1, y1 + h1 - 1, w1, '#4E321C');
    cv.vline(x1 + w1 - 1, y1, h1, '#4E321C');
    cv.rect(x1 + 4, y1 + 4, w1 - 8, h1 - 8, '#2E1C0E');
  }
}

/** The whole static backdrop (no glasses, no boosters). `phase` varies the lamp glow dither. */
export function amsterdamBackdrop(phase = 0, withRestart = true): PixelCanvas {
  const cv = new PixelCanvas(W, H, '#2A1A10');
  wall(cv);
  lampGlow(cv, phase);
  tiles(cv);
  header(cv);
  if (withRestart) restartIcon(cv);
  shelfAndLamp(cv);
  counter(cv);
  return cv;
}

// ---------- boosters: square beer mats ----------

export const ICONS: Record<'undo' | 'glass' | 'hint', string[]> = {
  undo: [
    '....#........',
    '...##........',
    '..###........',
    '.############',
    '..###.......#',
    '...##.......#',
    '....#.......#',
    '............#',
    '.......######',
    '.............',
    '.............',
  ],
  glass: [
    '#...........#',
    '#...........#',
    '#.....#.....#',
    '#.....#.....#',
    '#...#####...#',
    '#.....#.....#',
    '.#....#....#.',
    '.#.........#.',
    '.#.........#.',
    '..#########..',
    '.............',
  ],
  hint: [
    '....#####....',
    '..##.....##..',
    '.#.........#.',
    '#...........#',
    '#...........#',
    '.#.........#.',
    '..#.......#..',
    '...#######...',
    '...#######...',
    '....#####....',
    '.....###.....',
  ],
};

const BADGE = [
  '....#####....',
  '..#########..',
  '.###########.',
  '.###########.',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '.###########.',
  '.###########.',
  '..#########..',
  '....#####....',
];

/** Centres (x) of the three mats on the counter, and their top row. */
export const MATS = { centres: [33, 98, 163], y: 356 } as const;

export interface MatStyle {
  border: string;
  borderDark: string;
}

export const AMSTERDAM_MATS: MatStyle[] = [
  { border: '#2A5BA8', borderDark: '#163670' },
  { border: '#A8213A', borderDark: '#62101E' },
  { border: '#D06A14', borderDark: '#82400A' },
];

/** A beer-mat booster with its count badge. Unusable mats are drawn faded into the counter. */
export function mat(
  cv: PixelCanvas,
  cx: number,
  y: number,
  style: MatStyle,
  icon: keyof typeof ICONS,
  count: number,
  usable: boolean,
): void {
  const x = cx - 16;
  const fade = (c: string) => (usable ? c : mix(c, '#3B2416', 0.55));
  const { border, borderDark } = style;
  cv.shadowBox(x + 3, y + 3, 33, 33, 0.6, 0.5);
  cv.rect(x, y, 32, 32, fade(border));
  cv.hline(x, y, 32, fade(mix(border, '#FFFFFF', 0.25)));
  cv.vline(x, y, 32, fade(mix(border, '#FFFFFF', 0.25)));
  cv.hline(x, y + 31, 32, fade(borderDark));
  cv.vline(x + 31, y, 32, fade(borderDark));
  cv.rect(x + 3, y + 3, 26, 26, fade('#F3E6CC'));
  cv.hline(x + 3, y + 3, 26, fade('#FFF9EC'));
  cv.vline(x + 3, y + 3, 26, fade('#FFF9EC'));
  cv.hline(x + 3, y + 28, 26, fade('#D8C7A6'));
  cv.vline(x + 28, y + 3, 26, fade('#E2D2B2'));
  for (const [dx, dy] of [
    [0, 0],
    [31, 0],
    [0, 31],
    [31, 31],
  ] as const)
    cv.px(x + dx, y + dy, '#3B2416');
  cv.sprite(x + 10, y + 11, ICONS[icon], { '#': fade(mix(borderDark, '#F3E6CC', 0.35)) });
  cv.sprite(x + 9, y + 10, ICONS[icon], { '#': fade(border) });
  const bx = x + 24;
  const by = y - 7;
  cv.sprite(bx + 1, by + 1, BADGE, { '#': '#6E420E' });
  cv.sprite(bx, by, BADGE, { '#': '#E8A33D' });
  cv.hline(bx + 4, by + 1, 5, '#FFD27A');
  cv.hline(bx + 2, by + 2, 3, '#FFD27A');
  cv.hline(bx + 3, by + 11, 7, '#B8761E');
  const text = String(Math.min(99, count));
  // One digit sits where the reference puts it; two digits share the badge.
  bigDigits(cv, text.length === 1 ? bx + 5 : bx + Math.floor((13 - bigDigitsWidth(text)) / 2), by + 3, text, '#2A1A10');
}

export function amsterdamMats(
  cv: PixelCanvas,
  counts: [number, number, number],
  usable: [boolean, boolean, boolean],
): void {
  (['undo', 'glass', 'hint'] as const).forEach((icon, i) =>
    mat(cv, MATS.centres[i]!, MATS.y, AMSTERDAM_MATS[i]!, icon, counts[i]!, usable[i]!),
  );
}

// ---------- blockers ----------

const RING = ['.###.', '#...#', '#...#', '#...#', '.###.'];

/** Continuous chain at 45°: rings joined by short diagonal links (reference `chain45`). */
function chain45(cv: PixelCanvas, sx: number, sy: number, dirx: 1 | -1, n: number): void {
  for (let k = 0; k < n; k++) {
    const rx = sx + dirx * 6 * k;
    const ry = sy + 6 * k;
    const ox = dirx > 0 ? rx : rx - 4;
    cv.sprite(ox + 1, ry + 1, RING, { '#': '#3A2A08' });
    RING.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        cv.px(ox + i, ry + j, i + j <= 3 ? '#F4D58A' : i + j >= 6 ? '#8A6A1E' : '#C9A24A');
      }
    });
    if (k < n - 1) {
      for (let t = 0; t < 3; t++) {
        const bx = dirx > 0 ? ox + 4 + t : ox - t;
        cv.px(bx + 1, ry + 5 + t, '#3A2A08');
        cv.px(bx, ry + 4 + t, t !== 1 ? '#A8842E' : '#E6C26A');
      }
    }
  }
}

const LOCK = [
  '....########....',
  '...##......##...',
  '..##........##..',
  '..#..........#..',
  '..#..........#..',
  '..#..........#..',
  '..#..........#..',
  'oooooooooooooooo',
  'oBBBBBBBBBBBBBBo',
  'oBbbbbbbbbbbbbdo',
  'oBbbbbbKKbbbbbdo',
  'oBbbbbKKKKbbbbdo',
  'oBbbbbbKKbbbbbdo',
  'oBbbbbbKKbbbbbdo',
  'oBbbbbbKKbbbbbdo',
  'oBbbbbbbbbbbbbdo',
  'oBddddddddddddDo',
  'oooooooooooooooo',
];

/** The brass padlock with its steel shackle (16×18), with its dithered shadow. */
export function padlock(cv: PixelCanvas, lx: number, ly: number): void {
  cv.shadowBox(lx + 2, ly + 9, 16, 11, 0.6, 0.5);
  const LP: Record<string, string> = {
    '#': '#B8BCC0',
    o: '#4E3A0C',
    B: '#F4D58A',
    b: '#C9A24A',
    d: '#9A7424',
    D: '#6E5414',
    K: '#1A0F08',
  };
  LOCK.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]!;
      const col = LP[ch];
      if (!col) continue;
      cv.px(lx + i, ly + j, ch === 'b' && j >= 13 ? '#B89038' : col);
    }
  });
  cv.vline(lx + 2, ly + 3, 4, '#F2F4F6');
  cv.vline(lx + 3, ly + 2, 1, '#F2F4F6');
  cv.hline(lx + 4, ly, 4, '#F2F4F6');
  cv.vline(lx + 13, ly + 3, 4, '#7A8086');
  cv.px(lx + 12, ly + 2, '#7A8086');
  cv.rect(lx + 2, ly + 9, 2, 2, '#FFF6D8');
  cv.px(lx + 7, ly + 10, '#3A2A1A');
}

/** Brass chains crossing the glass at 45°, the drop chain, and the steel-shackle padlock. */
export function chainsAndPadlock(cv: PixelCanvas, x0: number, y0: number): void {
  const cx = x0 + 13;
  chain45(cv, x0 - 3, y0 + 10, 1, 6);
  chain45(cv, x0 + 29, y0 + 10, -1, 6);
  for (let y = y0 - 3; y < y0 + 25; y += 4) {
    if (Math.floor(y / 4) % 2) {
      cv.sprite(cx - 2, y, ['.#.', '#.#', '#.#', '.#.'], { '#': '#C9A24A' });
      cv.px(cx - 1, y, '#F4D58A');
    } else {
      cv.rect(cx - 1, y, 2, 4, '#A8842E');
      cv.px(cx - 1, y, '#E6C26A');
    }
  }
  padlock(cv, cx - 8, y0 + 22);
}

/** Hidden units: covered by a glazed stoneware sleeve with a "?" pressed into it. */
export function stonewareCover(cv: PixelCanvas, rows: Row[]): void {
  rows.forEach(({ y, il, ir }, j) => {
    const w = ir - il + 1;
    for (let x = il; x <= ir; x++) {
      const c = Math.floor(((x - il) / Math.max(1, w - 1)) * (STONE.length - 1));
      cv.px(x, y, STONE[Math.min(STONE.length - 2, Math.max(1, c))]!);
    }
    if (j === 0) cv.hline(il, y, w, '#8C7A60');
  });
  const mid = rows[Math.floor(rows.length / 2) - 3];
  if (mid) {
    const cx = Math.floor((mid.il + mid.ir) / 2);
    cv.sprite(cx - 2, mid.y, ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], { '#': '#6E604A' });
  }
}

/** Only glass: a clay kruik tag hanging from the rim on a string. */
export function kruikTag(cv: PixelCanvas, x0: number, y0: number, drinkColor: string): void {
  const tx = x0 + 21;
  const ty = y0 + 14;
  cv.line(x0 + 22, y0 + 1, tx + 3, ty, '#C9A24A');
  const TAG = ['.######.', '########', '##.##.##', '########', '########', '########', '########', '.######.'];
  cv.sprite(tx + 1, ty + 1, TAG, { '#': '#120A05' });
  cv.sprite(tx, ty, TAG, { '#': '#C2B090' });
  cv.hline(tx + 1, ty, 6, '#F4EAD4');
  cv.vline(tx, ty + 1, 6, '#E2D4B6');
  cv.rect(tx + 2, ty + 4, 4, 3, drinkColor);
  cv.hline(tx + 2, ty + 4, 4, mix(drinkColor, '#FFFFFF', 0.35));
}
