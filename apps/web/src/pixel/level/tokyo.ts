import { dith, mix, PixelCanvas } from '../canvas.js';
import type { CityLevelArt } from './art.js';
import { disc, frame, glow, panels, rail, roundCoaster, shelfShadow } from './common.js';
import type { GlassStyle, Row } from './glass.js';

/** Tokyo: a neon back-alley bar. Indigo noren, a navy wall lit pink and cyan, kept bottles, a paper lantern. */

const W = 195;
const H = 422;
const SIGN = { x: 121, y: 32, w: 70, h: 23 } as const;
const RESTART = { x: 176, y: 59 } as const;
const MATS = { centres: [33, 98, 163], y: 356 } as const;
const NAVY = { base: '#0B1030', hi: '#141C48', dk: '#060920' };
const NEON = { pink: '#FF5C8A', pinkHi: '#FFC2D4', cyan: '#5EC3F0', cyanHi: '#D2F0FF' };
const HINOKI = { hi: '#F2DCB4', light: '#E6C99A', base: '#D9B98A', dark: '#B8946A', deep: '#7A5A3A' };

function noren(cv: PixelCanvas): void {
  cv.rect(0, 0, W, 27, '#05081A');
  cv.rect(0, 0, W, 3, '#3A2A1E');
  cv.hline(0, 0, W, '#5A4430');
  // Three indigo panels with folds, a white crest on the middle one.
  for (let p = 0; p < 3; p++) {
    const x = 3 + p * 64;
    const w = 61;
    for (let i = 0; i < w; i++) {
      const fold = Math.floor(i / 6) % 2;
      const c = fold ? '#1E2A6E' : '#23306E';
      cv.vline(x + i, 3, 22, c);
      if (i % 6 === 0) cv.vline(x + i, 3, 22, '#2E3C86');
      if (i % 6 === 5) cv.vline(x + i, 3, 22, '#161F52');
    }
    cv.hline(x, 24, w, '#121A44');
    cv.hline(x, 25, w, '#0B1030');
  }
  disc(cv, 97, 13, 7, { hi: '#FFFFFF', base: '#F4ECDD', dk: '#C8C0B4' });
  disc(cv, 97, 13, 5, { hi: '#2E3C86', base: '#23306E', dk: '#1A245A' });
  cv.sprite(94, 10, ['.#.#.', '#####', '.#.#.', '.###.', '.#.#.'], { '#': '#F4ECDD' });
  cv.hline(0, 26, W, '#000000');
  cv.shadowBox(0, 27, W, 3, 0.5, 0.5);
}

function wall(cv: PixelCanvas): void {
  cv.rect(0, 27, W, 291, NAVY.base);
  // Vertical boards, barely visible in the dark.
  for (let x = 0; x < W; x += 13) {
    cv.vline(x, 27, 291, NAVY.dk);
    cv.vline(x + 1, 27, 291, NAVY.hi);
  }
  for (let y = 27; y < 318; y++)
    for (let x = 0; x < W; x++) if (dith(x, y, 0.08) && (x * 7 + y * 3) % 11 === 0) cv.px(x, y, NAVY.hi);
}

/** A neon tube drawn as a lit core with a soft dithered halo. */
function neon(cv: PixelCanvas, points: [number, number][], core: string, hi: string): void {
  for (let i = 0; i + 1 < points.length; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    cv.line(x0, y0, x1, y1, core);
    cv.line(x0 + 1, y0, x1 + 1, y1, hi);
  }
}

function signs(cv: PixelCanvas): void {
  // Left: a pink sign box with a sake cup; right: a cyan wave.
  cv.rect(14, 128, 20, 52, '#05081A');
  neon(
    cv,
    [
      [16, 130],
      [32, 130],
      [32, 178],
      [16, 178],
      [16, 130],
    ],
    NEON.pink,
    NEON.pinkHi,
  );
  neon(
    cv,
    [
      [20, 140],
      [28, 140],
      [27, 150],
      [21, 150],
      [20, 140],
    ],
    NEON.pink,
    NEON.pinkHi,
  );
  neon(
    cv,
    [
      [19, 158],
      [29, 158],
    ],
    NEON.pink,
    NEON.pinkHi,
  );
  neon(
    cv,
    [
      [24, 158],
      [24, 172],
    ],
    NEON.pink,
    NEON.pinkHi,
  );
  cv.rect(160, 132, 22, 44, '#05081A');
  for (let k = 0; k < 3; k++) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 16; i += 2) pts.push([163 + i, 140 + k * 12 + (Math.floor(i / 4) % 2 ? 3 : 0)]);
    neon(cv, pts, NEON.cyan, NEON.cyanHi);
  }
  neon(
    cv,
    [
      [161, 133],
      [181, 133],
      [181, 175],
      [161, 175],
      [161, 133],
    ],
    NEON.cyan,
    NEON.cyanHi,
  );
}

function keptBottle(cv: PixelCanvas, x: number, h: number, glass: string, name: number): void {
  const y = 100 - h;
  const tones = [
    mix(glass, '#000000', 0.55),
    mix(glass, '#FFFFFF', 0.2),
    glass,
    glass,
    mix(glass, '#000000', 0.25),
    mix(glass, '#000000', 0.5),
    mix(glass, '#000000', 0.6),
  ];
  tones.forEach((c, i) => cv.vline(x + i, y + 6, h - 6, c));
  cv.rect(x + 2, y + 1, 3, 5, tones[2]!);
  cv.rect(x + 2, y - 1, 3, 2, '#1A1A1A');
  // The white keep tag with a name in brush strokes.
  cv.rect(x + 1, y + 10, 5, 8, '#F4ECDD');
  cv.vline(x + 5, y + 10, 8, '#C8C0B4');
  cv.vline(x + 3, y + 11, 2 + (name % 3), '#2A2A2A');
  cv.px(x + 2, y + 15, '#2A2A2A');
  cv.line(x + 3, y + 8, x + 4, y + 10, '#E0453A');
}

function lantern(cv: PixelCanvas, cx: number, top: number): void {
  cv.vline(cx, 55, top - 55, '#3A2A2A');
  cv.rect(cx - 4, top, 9, 3, '#1A1A1A');
  for (let j = 0; j < 26; j++) {
    const w = Math.round(Math.sin(((j + 1) / 27) * Math.PI) * 11);
    for (let i = -w; i <= w; i++) {
      const lit = i < -w / 3;
      let c = lit ? '#FF7A6A' : i > w / 2 ? '#A82A22' : '#E0453A';
      if (j % 5 === 2) c = mix(c, '#000000', 0.25);
      cv.px(cx + i, top + 3 + j, c);
    }
  }
  cv.rect(cx - 4, top + 29, 9, 3, '#1A1A1A');
  cv.vline(cx, top + 32, 4, '#E8A33D');
  cv.sprite(cx - 2, top + 11, ['.#.', '###', '.#.', '#.#'], { '#': '#1A1A1A' });
}

function counter(cv: PixelCanvas): void {
  rail(cv, 318, [HINOKI.hi, HINOKI.light, HINOKI.base, HINOKI.deep], '#1A1008');
  cv.rect(0, 323, W, 12, HINOKI.base);
  cv.hline(0, 323, W, HINOKI.hi);
  cv.hline(0, 334, W, HINOKI.deep);
  for (let k = 0; k < 26; k++) {
    const gx = (k * 23 + 5) % W;
    cv.hline(gx, 325 + (k % 8), 9 + (k % 6), HINOKI.dark);
    cv.hline(gx + 3, 326 + (k % 8), 4, HINOKI.light);
  }
  cv.rect(0, 335, W, H - 335, '#2E2118');
  cv.shadowBox(0, 335, W, 6, 0.6, 0.5);
  panels(cv, 344, { fill: '#261A12', inner: '#22170F', shadow: '#140C06', light: '#3E2C1E' });
  for (let x = 6; x < W; x += 6) cv.vline(x, 350, H - 362, '#1E140C');
}

export function tokyoBackdrop(phase = 0): PixelCanvas {
  const cv = new PixelCanvas(W, H, '#070B1F');
  wall(cv);
  glow(cv, 24, 155, 75, NEON.pink, { phase, strength: 0.07, y1: 318 });
  glow(cv, 171, 155, 75, NEON.cyan, { phase, strength: 0.07, y1: 318 });
  glow(cv, 97, 80, 55, '#FF7A4A', { phase, strength: 0.05, y1: 200 });
  signs(cv);
  noren(cv);
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
  cv.sprite(9, 39, ARROW, { '#': '#000000' });
  cv.sprite(8, 38, ARROW, { '#': '#F4ECDD' });
  frame(cv, SIGN.x, SIGN.y, SIGN.w, SIGN.h, {
    hi: '#FFE0EA',
    light: '#3A2A1E',
    base: '#2A1E14',
    dark: '#1A120C',
    deep: '#0E0904',
    panel: '#0B1030',
    panelDark: '#060920',
  });
  cv.hline(SIGN.x + 4, SIGN.y + SIGN.h - 4, SIGN.w - 8, NEON.pink);
  disc(cv, RESTART.x + 6, RESTART.y + 6, 5, { hi: '#FFC2D4', base: NEON.pink, dk: '#A8325A', outline: '#05081A' });
  cv.sprite(RESTART.x + 3, RESTART.y + 3, ['.###.', '#...#', '#....', '#..#.', '.####'], { '#': '#1A0710' });
  for (const [x, h, c, n] of [
    [10, 26, '#2E4A2A', 1],
    [19, 30, '#4A2A10', 2],
    [28, 22, '#1E2A4A', 3],
    [38, 28, '#3A1E2E', 4],
    [148, 28, '#2E3A1E', 5],
    [157, 22, '#4A2A10', 6],
    [166, 30, '#1E2A4A', 7],
    [176, 26, '#3A1E2E', 8],
  ] as const)
    keptBottle(cv, x, h, c, n);
  cv.hline(0, 100, W, '#4A5A9A');
  cv.hline(0, 101, W, '#2B3466');
  cv.rect(0, 102, W, 3, '#1A2148');
  cv.hline(0, 105, W, '#05081A');
  shelfShadow(cv, 106);
  lantern(cv, 97, 64);
  counter(cv);
  return cv;
}

/** A tall highball: straight sides, a thick base, ice in the empty part. */
export const HIGHBALL: GlassStyle = {
  profile: Array(66).fill(21),
  normal: { rl: '#E8ECFA', rb: '#8C96CC', rd: '#4A5590' },
  locked: { rl: '#5B66A6', rb: '#3A4378', rd: '#232A54' },
  interior: { fill: '#0F1538', left: '#161E4A', right: '#090D26' },
  shadowAt: 71,
  base(cv, cx, y, { rl, rb, rd }) {
    for (let r = 0; r < 3; r++) {
      cv.hline(cx - 11, y + r, 23, r === 2 ? rd : mix(rb, '#0F1538', 0.3));
      cv.px(cx - 11, y + r, rl);
      cv.px(cx + 11, y + r, rd);
    }
    cv.hline(cx - 9, y, 7, rl);
  },
  emptyDetail(cv, rows, liquidTop) {
    // Faint outlines of ice cubes in whatever part of the glass is empty.
    const cubes = [
      [3, 6],
      [10, 20],
      [4, 34],
      [11, 48],
    ];
    for (const [dx, dr] of cubes) {
      if (dr! + 7 >= liquidTop) continue;
      const row = rows[dr!];
      if (!row) continue;
      const x = row.il + dx!;
      cv.hline(x, row.y, 6, '#2A3670');
      cv.hline(x, row.y + 5, 6, '#1E2858');
      cv.vline(x, row.y, 6, '#2A3670');
      cv.vline(x + 5, row.y, 6, '#1E2858');
      cv.px(x + 1, row.y + 1, '#3E4C90');
    }
  },
};

/** Locked: a metal shutter pulled down over the glass. */
function shutter(cv: PixelCanvas, x0: number, y0: number): void {
  const x = x0;
  const w = 27;
  const top = y0 - 4;
  const h = 72;
  cv.shadowBox(x + 2, top + 2, w, h, 0.5, 0.5);
  cv.rect(x - 1, top, w + 2, 5, '#5B66A6');
  cv.hline(x - 1, top, w + 2, '#A9B0DA');
  cv.hline(x - 1, top + 4, w + 2, '#232A54');
  for (let y = top + 5; y < top + h; y += 4) {
    cv.hline(x, y, w, '#8C96CC');
    cv.hline(x, y + 1, w, '#6E78B0');
    cv.hline(x, y + 2, w, '#5B66A6');
    cv.hline(x, y + 3, w, '#2B3466');
  }
  cv.rect(x - 1, top + h - 3, w + 2, 3, '#3A4378');
  cv.rect(x + 10, top + h - 7, 7, 3, '#C8D0E8');
  cv.hline(x + 10, top + h - 7, 7, '#FFFFFF');
}

/** Hidden units: unlabelled dark bottles with a "?". */
function unlabelled(cv: PixelCanvas, rows: Row[]): void {
  rows.forEach(({ y, il, ir }, j) => {
    for (let x = il; x <= ir; x++) {
      const c = x - il;
      cv.px(x, y, c === 0 ? '#2E3A7A' : c >= ir - il - 1 ? '#121842' : j % 15 === 0 ? '#2B3466' : '#1E2652');
    }
  });
  for (let k = 0; k * 15 + 4 < rows.length; k++) {
    const row = rows[k * 15 + 4]!;
    const cx = Math.floor((row.il + row.ir) / 2);
    cv.sprite(cx - 2, row.y, ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], { '#': '#8A93C8' });
  }
}

/** Only glass: a bottle-keep tag on a red cord. */
function keepTag(cv: PixelCanvas, x0: number, y0: number, drinkColor: string): void {
  const tx = x0 + 19;
  const ty = y0 + 12;
  cv.line(x0 + 22, y0 + 1, tx + 3, ty, '#E0453A');
  const TAG = ['######', '######', '######', '######', '######', '######', '######', '######', '######', '.####.'];
  cv.sprite(tx + 1, ty + 1, TAG, { '#': '#05081A' });
  cv.sprite(tx, ty, TAG, { '#': '#F4ECDD' });
  cv.vline(tx + 5, ty, 9, '#C8C0B4');
  cv.rect(tx + 1, ty + 2, 4, 3, drinkColor);
  cv.vline(tx + 2, ty + 6, 3, '#2A2A2A');
}

const COASTER = {
  ring: '#F4B860',
  ringHi: '#FFE0A0',
  ringDk: '#A8761E',
  face: '#121836',
  faceHi: '#1E2652',
  faceDk: '#0B1030',
  icon: '#F4B860',
};

function coasters(cv: PixelCanvas, counts: [number, number, number], usable: [boolean, boolean, boolean]): void {
  (['undo', 'glass', 'hint'] as const).forEach((icon, i) =>
    roundCoaster(cv, MATS.centres[i]!, MATS.y, COASTER, icon, counts[i]!, usable[i]!, '#2E2118'),
  );
}

export const tokyoArt: CityLevelArt = {
  backdrop: tokyoBackdrop,
  boosters: coasters,
  glass: HIGHBALL,
  locked: shutter,
  hidden: unlabelled,
  only: keepTag,
  sign: SIGN,
  restart: RESTART,
  mats: MATS,
  text: { title: '#F4ECDD', sub: '#A9B0DA' },
};
