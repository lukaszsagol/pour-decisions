import { mix, PixelCanvas } from '../canvas.js';
import { ICONS, padlock, type MatStyle } from './amsterdam.js';
import type { CityLevelArt } from './art.js';
import {
  BRASS,
  boards,
  countBadge,
  disc,
  frame,
  glow,
  letters,
  lettersWidth,
  panels,
  rail,
  shelfShadow,
} from './common.js';
import { ceiling } from './bleed.js';
import type { GlassStyle, Row } from './glass.js';

/** London: a traditional pub. Green "Free house" fascia, red flock wallpaper, dark wainscot, mahogany bar. */

const W = 195;
const mod = (v: number, m: number) => ((v % m) + m) % m;
const H = 422;
const SIGN = { x: 121, y: 32, w: 70, h: 23 } as const;
const RESTART = { x: 176, y: 59 } as const;
const MATS = { centres: [33, 98, 163], y: 356 } as const;

const FASCIA = { base: '#16382B', hi: '#2C5A46', dk: '#0C2219' };
const FLOCK = { base: '#4A1418', pattern: '#5E1A22', hi: '#74242C', dk: '#330C10' };
const MAHOGANY = { hi: '#8A4A30', light: '#6E3420', base: '#4E2216', dark: '#36160E', deep: '#200C06' };

function fascia(cv: PixelCanvas, plain = false): void {
  cv.rect(cv.minX, 0, cv.w, 27, FASCIA.base);
  cv.hline(cv.minX, 0, cv.w, FASCIA.hi);
  cv.hline(cv.minX, 1, cv.w, mix(FASCIA.base, FASCIA.hi, 0.5));
  for (let x = 2 * Math.floor(cv.minX / 2); x < cv.maxX; x += 2) cv.px(x, 21, FASCIA.dk);
  if (!plain) {
    const text = 'FREE HOUSE';
    const tw = lettersWidth(text);
    const tx = Math.floor((W - tw) / 2);
    letters(cv, tx, 8, text, { face: '#C9A24A', hi: '#F4D58A', shadow: '#0A1A12' });
    cv.hline(16, 11, tx - 26, '#C9A24A');
    cv.hline(16, 12, tx - 26, '#8A6A1E');
    cv.hline(tx + tw + 10, 11, W - 16 - (tx + tw + 10), '#C9A24A');
    cv.hline(tx + tw + 10, 12, W - 16 - (tx + tw + 10), '#8A6A1E');
  }
  cv.hline(cv.minX, 24, cv.w, '#F4D58A');
  cv.hline(cv.minX, 25, cv.w, '#C9A24A');
  cv.hline(cv.minX, 26, cv.w, '#120A05');
  cv.shadowBox(cv.minX, 27, cv.w, 3, 0.5, 0.45);
}

function wallpaper(cv: PixelCanvas): void {
  cv.rect(cv.minX, 27, cv.w, 181, FLOCK.base);
  // Flock diamonds on a dithered ground.
  for (let y = 30; y < 208; y += 12) {
    const off = Math.floor((y - 30) / 12) % 2 ? 6 : 0;
    for (let x = off - 6 + 12 * Math.floor((cv.minX - off + 6) / 12); x < cv.maxX; x += 12) {
      cv.sprite(x + 3, y, ['..#..', '.###.', '##.##', '.###.', '..#..'], { '#': FLOCK.pattern });
      cv.px(x + 5, y + 1, FLOCK.hi);
      cv.px(x + 5, y + 2, FLOCK.dk);
    }
  }
  for (let y = 27; y < 208; y++)
    for (let x = cv.minX; x < cv.maxX; x++)
      if (mod(x + y, 7) === 0 && mod(x * 3 + y, 5) === 0) cv.tint(x, y, '#000000', 0.18);
}

function wainscot(cv: PixelCanvas): void {
  // Chair rail and dark panelled wood up to the bar.
  cv.hline(cv.minX, 206, cv.w, MAHOGANY.hi);
  cv.hline(cv.minX, 207, cv.w, MAHOGANY.light);
  cv.rect(cv.minX, 208, cv.w, 3, MAHOGANY.base);
  cv.hline(cv.minX, 211, cv.w, MAHOGANY.deep);
  cv.shadowBox(cv.minX, 212, cv.w, 4, 0.5, 0.45);
  boards(cv, 216, 102, ['#2B140C', '#27110A'], '#160804', 39, false);
  for (let x = 39 * Math.floor(cv.minX / 39); x < cv.maxX; x += 39) {
    cv.rect(x + 6, 226, 27, 82, '#22100A');
    cv.hline(x + 6, 226, 27, '#160804');
    cv.vline(x + 6, 226, 82, '#160804');
    cv.hline(x + 6, 307, 27, '#3A1C10');
    cv.vline(x + 32, 226, 82, '#3A1C10');
  }
}

function dartboard(cv: PixelCanvas, cx: number, cy: number): void {
  cv.shadowBox(cx - 12, cy - 11, 27, 27, 0.6, 0.5);
  disc(cv, cx, cy, 13, { hi: '#2A2A2A', base: '#1A1A1A', dk: '#0E0E0E', outline: '#000000' });
  for (let j = -11; j <= 11; j++)
    for (let i = -11; i <= 11; i++) {
      const d = Math.hypot(i, j);
      if (d > 11) continue;
      const seg = Math.floor(((Math.atan2(j, i) + Math.PI) / (2 * Math.PI)) * 20) % 2;
      let c = seg ? '#E8DCC2' : '#1E1E1E';
      if (d > 9.5) c = seg ? '#C8242E' : '#1F7A50';
      else if (d > 5 && d < 6.3) c = seg ? '#C8242E' : '#1F7A50';
      if (d < 2.4) c = '#1F7A50';
      if (d < 1.2) c = '#C8242E';
      cv.px(cx + i, cy + j, c);
    }
  cv.px(cx - 6, cy - 7, '#FFFFFF');
}

function foxPicture(cv: PixelCanvas, x: number, y: number): void {
  const w = 34;
  const h = 32;
  frame(cv, x, y, w, h, {
    hi: BRASS.hi,
    light: BRASS.light,
    base: BRASS.base,
    dark: BRASS.dark,
    deep: BRASS.deep,
    panel: '#1C3A2C',
    panelDark: '#10261C',
  });
  // A fox in profile, running over a hill.
  cv.rect(x + 4, y + 22, w - 8, 6, '#2C5A3A');
  cv.hline(x + 4, y + 22, w - 8, '#3E7A4E');
  cv.sprite(
    x + 7,
    y + 10,
    [
      '......##.......',
      '.....####......',
      '..#########....',
      '.###########...',
      '#############..',
      '...#####.####..',
      '...#..#...#.#..',
    ],
    {
      '#': '#C9752E',
    },
  );
  cv.sprite(x + 7, y + 10, ['......#........', '.....#.........', '..#............'], { '#': '#F0A050' });
  cv.px(x + 9, y + 13, '#F4EAD4');
  cv.px(x + 8, y + 12, '#1A1A1A');
}

function pump(cv: PixelCanvas, x: number, clip: string): void {
  // Tall wooden handle with a brass collar, a pump clip in the drink's colour.
  cv.rect(x + 1, 63, 5, 22, '#2B1D16');
  cv.vline(x + 1, 63, 22, '#4A3428');
  cv.vline(x + 5, 63, 22, '#160E0A');
  cv.rect(x, 60, 7, 3, '#3A2A1E');
  cv.rect(x - 2, 66, 11, 9, BRASS.base);
  cv.hline(x - 2, 66, 11, BRASS.light);
  cv.vline(x - 2, 66, 9, BRASS.light);
  cv.hline(x - 2, 74, 11, BRASS.deep);
  cv.rect(x, 68, 7, 5, clip);
  cv.hline(x, 68, 7, mix(clip, '#FFFFFF', 0.4));
  cv.rect(x + 1, 85, 5, 4, BRASS.base);
  cv.hline(x + 1, 85, 5, BRASS.light);
  cv.rect(x + 2, 89, 3, 11, BRASS.dark);
  cv.vline(x + 2, 89, 11, BRASS.light);
}

function counter(cv: PixelCanvas): void {
  rail(cv, 318, [BRASS.hi, BRASS.light, BRASS.base, BRASS.deep], '#120A05');
  cv.rect(cv.minX, 323, cv.w, 12, MAHOGANY.base);
  cv.hline(cv.minX, 323, cv.w, MAHOGANY.hi);
  cv.hline(cv.minX, 324, cv.w, MAHOGANY.light);
  cv.hline(cv.minX, 334, cv.w, MAHOGANY.deep);
  for (let n = Math.floor(cv.minX / W); n * W < cv.maxX; n++)
    for (let k = 0; k < 22; k++) {
      const gx = n * W + ((k * 29 + 7) % W);
      cv.hline(gx, 326 + (k % 6), 5 + (k % 5), MAHOGANY.dark);
      cv.hline(gx + 2, 327 + (k % 6), 3, MAHOGANY.light);
    }
  cv.rect(cv.minX, 335, cv.w, cv.maxY - 335, '#2A1410');
  cv.shadowBox(cv.minX, 335, cv.w, 6, 0.6, 0.45);
  panels(cv, 344, { fill: '#24100C', inner: '#1E0C08', shadow: '#140604', light: '#3A1C12' });
}

function shelf(cv: PixelCanvas): void {
  cv.hline(cv.minX, 100, cv.w, MAHOGANY.hi);
  cv.hline(cv.minX, 101, cv.w, MAHOGANY.light);
  cv.rect(cv.minX, 102, cv.w, 4, MAHOGANY.base);
  cv.hline(cv.minX, 106, cv.w, MAHOGANY.dark);
  cv.hline(cv.minX, 107, cv.w, MAHOGANY.deep);
  shelfShadow(cv, 108);
}

function lights(cv: PixelCanvas, phase: number): void {
  // Warm, low pub light from two lamps either side of the sign.
  glow(cv, 40, 70, 70, '#F2B860', { phase, y1: 210 });
  glow(cv, 155, 70, 70, '#F2B860', { phase, y1: 210 });
  glow(cv, 97, 260, 90, '#E8A33D', { phase, strength: 0.04, y0: 212, y1: 318 });
}

/** The margins around the stage: the pub's walls without the props, a mahogany ceiling, more bar front. */
export function londonBleed(cv: PixelCanvas, phase = 0): void {
  cv.rect(cv.minX, cv.minY, cv.w, cv.h, '#2A1410');
  wallpaper(cv);
  wainscot(cv);
  lights(cv, phase);
  fascia(cv, true);
  shelf(cv);
  counter(cv);
  ceiling(cv, { base: MAHOGANY.dark, light: MAHOGANY.base, seam: MAHOGANY.deep });
}

export function londonBackdrop(phase = 0): PixelCanvas {
  const cv = new PixelCanvas(W, H, '#2A1410');
  wallpaper(cv);
  wainscot(cv);
  lights(cv, phase);
  fascia(cv);
  // Back arrow (as Amsterdam's).
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
  cv.sprite(9, 39, ARROW, { '#': '#120A05' });
  cv.sprite(8, 38, ARROW, { '#': '#EFE6D2' });
  frame(cv, SIGN.x, SIGN.y, SIGN.w, SIGN.h, { ...BRASS, panel: '#0E2A1F', panelDark: '#071810' });
  // Restart: a brass disc.
  disc(cv, RESTART.x + 6, RESTART.y + 6, 5, { hi: BRASS.light, base: BRASS.base, dk: BRASS.deep, outline: '#120A05' });
  cv.sprite(
    RESTART.x + 3,
    RESTART.y + 3,
    ['..####.', '.#...##', '#...###', '#......', '#.....#', '.#...#.', '..###..'],
    { '#': '#22140B' },
  );
  // Back bar: dartboard, beer pumps, the fox picture, a mahogany shelf.
  dartboard(cv, 24, 76);
  pump(cv, 58, '#F1C84B');
  pump(cv, 76, '#B5651D');
  pump(cv, 94, '#E8DCC2');
  pump(cv, 112, '#A9DCE6');
  foxPicture(cv, 140, 60);
  shelf(cv);
  // Brass picture lights over the dartboard and the fox, the pub's warm lamps.
  for (const [lx, w] of [
    [12, 24],
    [145, 24],
  ] as const) {
    cv.rect(lx + w / 2 - 1, 54, 2, 3, BRASS.deep);
    cv.rect(lx, 56, w, 3, BRASS.base);
    cv.hline(lx, 56, w, BRASS.light);
    cv.hline(lx, 58, w, BRASS.deep);
    cv.hline(lx + 2, 59, w - 4, '#FFF4D0');
  }
  counter(cv);
  return cv;
}

/** The nonic pint: straight sides, the bulge 6 px under the rim, a thick base, no stem. */
export const NONIC: GlassStyle = {
  profile: [20, 20, 20, 20, 20, 21, 22, 22, 22, 21, ...Array(50).fill(20), 20, 20, 19, 19, 18, 18],
  normal: { rl: '#F4F4EC', rb: '#C9C9BE', rd: '#7E8278' },
  locked: { rl: '#9A9A90', rb: '#6E6E66', rd: '#44443E' },
  interior: { fill: '#1A1210', left: '#24180F', right: '#100A08' },
  shadowAt: 72,
  base(cv, cx, y, { rl, rb, rd }) {
    // A thick glass base: four rows, lit on the left.
    for (let r = 0; r < 4; r++) {
      const half = 10 - (r === 3 ? 1 : 0);
      cv.hline(cx - half, y + r, half * 2 + 1, r === 3 ? rd : mix(rb, '#2A1410', 0.25));
      cv.px(cx - half, y + r, rl);
      cv.px(cx + half, y + r, rd);
    }
    cv.hline(cx - 8, y, 6, rl);
  },
  detail(cv, rows, { rl, rd }) {
    // The bulge catches the light on the left and shades on the right.
    for (const r of [6, 7, 8]) {
      const row = rows[r];
      if (!row) continue;
      cv.px(row.il - 2, row.y, rl);
      cv.px(row.ir + 2, row.y, rd);
    }
  },
};

/** Locked: the beer tap is locked over the glass. */
function lockedTap(cv: PixelCanvas, x0: number, y0: number): void {
  const cx = x0 + 13;
  cv.shadowBox(x0, y0 + 2, 30, 8, 0.5, 0.45);
  // Brass tap block across the rim, its spout dipping into the glass.
  cv.rect(x0 - 2, y0 - 3, 30, 7, BRASS.base);
  cv.hline(x0 - 2, y0 - 3, 30, BRASS.hi);
  cv.hline(x0 - 2, y0 - 2, 30, BRASS.light);
  cv.hline(x0 - 2, y0 + 3, 30, BRASS.deep);
  cv.vline(x0 - 2, y0 - 3, 7, BRASS.light);
  cv.rect(cx - 2, y0 + 4, 5, 12, BRASS.dark);
  cv.vline(cx - 2, y0 + 4, 12, BRASS.light);
  cv.vline(cx + 2, y0 + 4, 12, BRASS.deep);
  cv.hline(cx - 3, y0 + 15, 7, BRASS.base);
  // The tap lever, turned off.
  cv.rect(cx + 6, y0 - 12, 4, 10, '#2B1D16');
  cv.vline(cx + 6, y0 - 12, 10, '#4A3428');
  cv.rect(cx + 5, y0 - 13, 6, 2, BRASS.base);
  padlock(cv, cx - 8, y0 + 20);
}

const PEWTER = [
  '#3E4246',
  '#8C9298',
  '#B4BAC0',
  '#D8DCE0',
  '#C4C9CE',
  '#A8AEB4',
  '#8C9298',
  '#70767C',
  '#565C62',
  '#3E4246',
];

/** Hidden units: a pewter tankard covers them, with bands and a handle. */
function pewterTankard(cv: PixelCanvas, rows: Row[]): void {
  rows.forEach(({ y, il, ir }, j) => {
    const w = ir - il + 1;
    for (let x = il - 1; x <= ir + 1; x++) {
      const c = Math.round(((x - il + 1) / (w + 1)) * (PEWTER.length - 1));
      cv.px(x, y, PEWTER[Math.max(0, Math.min(PEWTER.length - 1, c))]!);
    }
    if (j === 0 || j === rows.length - 1 || j === 3 || j === rows.length - 4)
      cv.hline(il - 1, y, w + 2, j < 4 ? '#E8ECEF' : '#4E545A');
  });
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  if (!top || !bottom) return;
  // The handle on the right.
  const hx = top.ir + 2;
  const hy = top.y + 3;
  const hh = Math.max(6, bottom.y - top.y - 6);
  cv.rect(hx, hy, 5, 2, '#B4BAC0');
  cv.rect(hx + 3, hy, 2, hh, '#8C9298');
  cv.vline(hx + 4, hy, hh, '#565C62');
  cv.rect(hx, hy + hh - 2, 5, 2, '#70767C');
  const mid = rows[Math.floor(rows.length / 2) - 3];
  if (mid) {
    const cx = Math.floor((mid.il + mid.ir) / 2);
    cv.sprite(cx - 2, mid.y, ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], { '#': '#3E4246' });
  }
}

/** Only glass: a reserved beer mat resting on the rim. */
function reservedMat(cv: PixelCanvas, x0: number, y0: number, drinkColor: string): void {
  cv.shadowBox(x0, y0 + 2, 30, 4, 0.5, 0.45);
  cv.rect(x0 - 2, y0 - 4, 30, 5, '#1F5C44');
  cv.hline(x0 - 2, y0 - 4, 30, '#3E8A66');
  cv.hline(x0 - 2, y0, 30, '#0E3324');
  cv.rect(x0, y0 - 3, 26, 3, '#EFE6D2');
  cv.hline(x0, y0 - 3, 26, '#FFFAF0');
  cv.rect(x0 + 10, y0 - 3, 6, 3, drinkColor);
}

const LONDON_MAT: MatStyle = { border: '#1F5C44', borderDark: '#0E3324' };
const ICON_TONES = ['#1F5C44', '#8E2A3E', '#B5892A'];

/** Beer mats with green borders, set down at slight angles. */
function tiltedMats(cv: PixelCanvas, counts: [number, number, number], usable: [boolean, boolean, boolean]): void {
  (['undo', 'glass', 'hint'] as const).forEach((icon, i) => {
    const fade = (c: string) => (usable[i] ? c : mix(c, '#2A1410', 0.55));
    const m = new PixelCanvas(34, 34);
    const { border, borderDark } = LONDON_MAT;
    m.rect(1, 1, 32, 32, fade(border));
    m.hline(1, 1, 32, fade(mix(border, '#FFFFFF', 0.3)));
    m.vline(1, 1, 32, fade(mix(border, '#FFFFFF', 0.3)));
    m.hline(1, 32, 32, fade(borderDark));
    m.vline(32, 1, 32, fade(borderDark));
    m.rect(4, 4, 26, 26, fade('#EFE6D2'));
    m.hline(4, 4, 26, fade('#FFFAF0'));
    m.hline(4, 29, 26, fade('#D2C8B0'));
    m.vline(29, 4, 26, fade('#DDD3BC'));
    m.sprite(11, 12, ICONS[icon], { '#': fade(mix(ICON_TONES[i]!, '#EFE6D2', 0.45)) });
    m.sprite(10, 11, ICONS[icon], { '#': fade(ICON_TONES[i]!) });
    // Tilt by shearing whole rows a pixel at a time, so edges stay even.
    const dir = [-1, 1, -1][i]!;
    const cx = MATS.centres[i]!;
    cv.shadowBox(cx - 14, MATS.y + 3, 33, 33, 0.6, 0.5);
    for (let j = 0; j < m.h; j++) {
      const dx = Math.floor((j - 17) / 9) * dir;
      for (let x = 0; x < m.w; x++) {
        const p = m.data[j * m.w + x]!;
        cv.setPacked(cx - 17 + x + dx, MATS.y - 1 + j, p);
      }
    }
    countBadge(cv, cx + 8, MATS.y - 7, counts[i]!);
  });
}

export const londonArt: CityLevelArt = {
  backdrop: londonBackdrop,
  bleed: londonBleed,
  boosters: tiltedMats,
  glass: NONIC,
  locked: lockedTap,
  hidden: pewterTankard,
  only: reservedMat,
  sign: SIGN,
  restart: RESTART,
  mats: MATS,
  text: { title: '#EFE6D2', sub: '#D8C3A0' },
};
