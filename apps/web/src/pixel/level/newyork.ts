import { dith, mix, PixelCanvas } from '../canvas.js';
import type { CityLevelArt } from './art.js';
import { disc, frame, glow, GOLD, panels, rail, roundCoaster, shelfShadow } from './common.js';
import { ceiling } from './bleed.js';
import type { GlassStyle, Row } from './glass.js';

/** New York: an Art Deco speakeasy. Black lacquer, gold sunburst and frieze, marble bar. */

const W = 195;
const mod = (v: number, m: number) => ((v % m) + m) % m;
const H = 422;
const SIGN = { x: 121, y: 32, w: 70, h: 23 } as const;
const RESTART = { x: 176, y: 59 } as const;
const MATS = { centres: [33, 98, 163], y: 356 } as const;
const LACQUER = ['#141414', '#101010'] as [string, string];

function frieze(cv: PixelCanvas): void {
  cv.rect(cv.minX, 0, cv.w, 27, '#0B0B0B');
  // Stepped zigzag in gold, lit on its upper edges.
  for (let x = cv.minX; x < cv.maxX; x++) {
    const p = mod(x, 16);
    const y = 6 + (p < 8 ? p : 16 - p);
    cv.px(x, y, GOLD.light);
    cv.px(x, y + 1, GOLD.base);
    cv.px(x, y + 2, GOLD.deep);
  }
  for (let x = 4 + 16 * Math.floor((cv.minX - 4) / 16); x < cv.maxX; x += 16)
    cv.sprite(x + 1, 18, ['.#.', '###', '.#.'], { '#': GOLD.dark });
  cv.hline(cv.minX, 1, cv.w, GOLD.dark);
  cv.hline(cv.minX, 22, cv.w, GOLD.dark);
  cv.hline(cv.minX, 24, cv.w, GOLD.light);
  cv.hline(cv.minX, 25, cv.w, GOLD.base);
  cv.hline(cv.minX, 26, cv.w, '#000000');
  cv.shadowBox(cv.minX, 27, cv.w, 3, 0.5, 0.5);
}

function wall(cv: PixelCanvas): void {
  // Black lacquer panels with cool vertical highlights.
  for (let i = Math.floor(cv.minX / 39), x = i * 39; x < cv.maxX; i++, x += 39) {
    const base = LACQUER[mod(i, 2)]!;
    cv.rect(x, 27, 39, 291, base);
    cv.vline(x, 27, 291, '#050505');
    cv.vline(x + 1, 27, 291, '#1E1E1E');
    for (let y = 27; y < 318; y++) if (dith(x + 30, y, 0.25)) cv.px(x + 30, y, '#1C2026');
    cv.vline(x + 31, 27, 291, '#181C22');
  }
  // A gold line separating the frieze band from the lower wall.
  cv.hline(cv.minX, 206, cv.w, GOLD.deep);
  cv.hline(cv.minX, 207, cv.w, GOLD.base);
  cv.hline(cv.minX, 208, cv.w, '#050505');
}

function sunburst(cv: PixelCanvas): void {
  const cx = 97;
  const cy = 100;
  // Rays fanning up from the shelf.
  for (let a = 12; a <= 168; a += 12) {
    const r = (a * Math.PI) / 180;
    cv.line(
      cx,
      cy,
      Math.round(cx - Math.cos(r) * 78),
      Math.round(cy - Math.sin(r) * 50),
      a % 24 === 0 ? GOLD.dark : '#5A4818',
    );
  }
  // Two arcs and a stepped semicircle.
  for (const [R, c] of [
    [34, GOLD.base],
    [22, GOLD.dark],
  ] as const) {
    for (let deg = 180; deg <= 360; deg += 1) {
      const t = (deg * Math.PI) / 180;
      cv.px(Math.round(cx + Math.cos(t) * R), Math.round(cy + Math.sin(t) * R * 0.9), c);
    }
  }
  for (let deg = 180; deg <= 360; deg += 1) {
    const t = (deg * Math.PI) / 180;
    cv.px(Math.round(cx + Math.cos(t) * 35), Math.round(cy + Math.sin(t) * 35 * 0.9), GOLD.light);
  }
  cv.rect(cx - 12, cy - 8, 25, 8, '#0B0B0B');
  for (let s = 0; s < 3; s++) cv.hline(cx - 12 + s * 3, cy - 8 - s * 3, 25 - s * 6, s === 2 ? GOLD.light : GOLD.base);
}

function bottle(cv: PixelCanvas, x: number, h: number, glass: string): void {
  const y = 100 - h;
  const tones = [
    mix(glass, '#000000', 0.5),
    mix(glass, '#FFFFFF', 0.25),
    glass,
    glass,
    mix(glass, '#000000', 0.3),
    mix(glass, '#000000', 0.5),
  ];
  tones.forEach((c, i) => cv.vline(x + i, y + 6, h - 6, c));
  cv.rect(x + 1, y + 2, 4, 4, tones[2]!);
  cv.vline(x + 1, y + 2, 4, tones[1]!);
  cv.rect(x + 1, y - 2, 4, 4, GOLD.base);
  cv.hline(x + 1, y - 2, 4, GOLD.light);
  cv.px(x + 4, y + 1, GOLD.deep);
  cv.rect(x + 1, y + h - 14, 4, 5, '#EDE3C8');
  cv.hline(x + 1, y + h - 14, 4, GOLD.base);
}

function sconce(cv: PixelCanvas, cx: number, y: number): void {
  // A gold fan sconce.
  cv.sprite(
    cx - 6,
    y,
    ['.##.##.##.##.', '#############', '.###########.', '..#########..', '...#######...', '.....###.....'],
    { '#': GOLD.base },
  );
  cv.sprite(cx - 6, y, ['.##.##.##.##.', '#............'], { '#': GOLD.hi });
  cv.hline(cx - 2, y + 6, 5, GOLD.deep);
  cv.hline(cx - 4, y - 1, 9, '#FFF8E0');
}

function counter(cv: PixelCanvas): void {
  rail(cv, 318, [GOLD.hi, GOLD.light, GOLD.base, GOLD.deep], '#000000');
  // White marble with grey veins, edged in black.
  for (let y = 323; y < 333; y++)
    for (let x = cv.minX; x < cv.maxX; x++)
      cv.px(x, y, dith(x, y, 0.12) ? '#D8D4CA' : mod(x + y, 17) === 0 ? '#ECE8E0' : '#E8E6E0');
  for (let n = Math.floor(cv.minX / W); n * W < cv.maxX; n++)
    for (let k = 0; k < 12; k++) {
      const x0 = n * W + ((k * 41 + 3) % W);
      cv.line(x0, 323, x0 + 6 + (k % 3) * 3, 332, k % 2 ? '#9A968C' : '#B4B0A6');
      cv.line(x0 + 6 + (k % 3) * 3, 332, x0 + 10, 327, '#C4C0B6');
    }
  cv.hline(cv.minX, 333, cv.w, '#1C1C1C');
  cv.hline(cv.minX, 323, cv.w, '#F8F6F0');
  cv.hline(cv.minX, 334, cv.w, '#000000');
  cv.rect(cv.minX, 335, cv.w, cv.maxY - 335, '#0B0B0B');
  cv.shadowBox(cv.minX, 335, cv.w, 6, 0.6, 0.5);
  panels(cv, 344, { fill: '#121212', inner: '#0E0E0E', shadow: '#050505', light: '#262626' });
}

function shelf(cv: PixelCanvas): void {
  cv.hline(cv.minX, 100, cv.w, GOLD.light);
  cv.hline(cv.minX, 101, cv.w, GOLD.base);
  cv.rect(cv.minX, 102, cv.w, 3, '#1A1A1A');
  cv.hline(cv.minX, 105, cv.w, '#000000');
  shelfShadow(cv, 106);
}

function lights(cv: PixelCanvas, phase: number): void {
  // Gold sconce light, with a cool sheen on the lacquer.
  glow(cv, 50, 76, 70, '#D4AF37', { phase, strength: 0.05, y1: 318 });
  glow(cv, 145, 76, 70, '#D4AF37', { phase, strength: 0.05, y1: 318 });
  glow(cv, 97, 80, 70, '#8A9AB0', { phase, strength: 0.03, y1: 206 });
}

/** The margins around the stage: lacquer, frieze and marble without the props, a black coffered ceiling. */
export function newYorkBleed(cv: PixelCanvas, phase = 0): void {
  cv.rect(cv.minX, cv.minY, cv.w, cv.h, '#0B0B0B');
  wall(cv);
  lights(cv, phase);
  frieze(cv);
  shelf(cv);
  counter(cv);
  ceiling(cv, { base: '#0B0B0B', light: GOLD.deep, seam: '#000000' });
}

export function newYorkBackdrop(phase = 0): PixelCanvas {
  const cv = new PixelCanvas(W, H, '#0B0B0B');
  wall(cv);
  sunburst(cv);
  lights(cv, phase);
  frieze(cv);
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
  cv.sprite(8, 38, ARROW, { '#': '#F1E3C2' });
  frame(cv, SIGN.x, SIGN.y, SIGN.w, SIGN.h, { ...GOLD, panel: '#0B0B0B', panelDark: '#000000' });
  for (const [x, h, c] of [
    [12, 30, '#2E4A2A'],
    [21, 24, '#5A2A18'],
    [30, 34, '#1E2A3A'],
    [150, 32, '#3A1E10'],
    [159, 26, '#2E4A2A'],
    [168, 30, '#4A1E2A'],
  ] as const)
    bottle(cv, x, h, c);
  shelf(cv);
  sconce(cv, 50, 66);
  sconce(cv, 145, 66);
  counter(cv);
  return cv;
}

/** A tall Deco glass: straight, a slight flare at the rim, a stepped two-level foot. */
export const DECO: GlassStyle = {
  profile: [22, 22, 21, 21, 20, 20, ...Array(54).fill(20), 20, 20, 20, 19, 19, 18],
  normal: { rl: '#F4F0E4', rb: '#C8C0A8', rd: '#7A705A' },
  locked: { rl: '#8C7A4E', rb: '#5E5234', rd: '#3A321E' },
  interior: { fill: '#0B0B0B', left: '#161616', right: '#050505' },
  shadowAt: 74,
  base(cv, cx, y, { rl, rb, rd }) {
    cv.hline(cx - 7, y, 15, rb);
    cv.hline(cx - 7, y, 6, rl);
    cv.hline(cx - 7, y + 1, 15, rd);
    cv.hline(cx - 10, y + 2, 21, rb);
    cv.hline(cx - 10, y + 2, 8, rl);
    cv.hline(cx - 10, y + 3, 21, rd);
    cv.hline(cx - 9, y + 4, 19, mix(rd, '#000000', 0.4));
  },
};

/** Locked: an Art Deco door panel with a keyhole. */
function decoDoor(cv: PixelCanvas, x0: number, y0: number): void {
  const x = x0 + 2;
  const y = y0 + 3;
  const w = 22;
  const h = 64;
  cv.shadowBox(x + 2, y + 2, w, h, 0.5, 0.5);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const arch = j < 11 && Math.hypot(i - 10.5, j - 11) > 11.2;
      if (arch) continue;
      cv.px(x + i, y + j, '#141414');
    }
  // Gold frame, arch and sunburst.
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const inArch = j < 11 && Math.hypot(i - 10.5, j - 11) > 11.2;
      const edge = !inArch && (i === 0 || i === w - 1 || j === h - 1 || (j < 11 && Math.hypot(i - 10.5, j - 11) > 10));
      if (edge) cv.px(x + i, y + j, i < 3 || j < 6 ? GOLD.light : GOLD.base);
    }
  for (let a = 25; a <= 155; a += 26) {
    const r = (a * Math.PI) / 180;
    cv.line(x + 11, y + 12, Math.round(x + 11 - Math.cos(r) * 8), Math.round(y + 12 - Math.sin(r) * 8), GOLD.dark);
  }
  cv.rect(x + 4, y + 26, w - 8, 30, '#0B0B0B');
  cv.hline(x + 4, y + 26, w - 8, GOLD.dark);
  cv.vline(x + 4, y + 26, 30, GOLD.dark);
  cv.hline(x + 4, y + 55, w - 8, GOLD.deep);
  cv.vline(x + w - 5, y + 26, 30, GOLD.deep);
  cv.sprite(x + 9, y + 36, ['.##.', '####', '####', '.##.', '.##.', '####', '####'], { '#': GOLD.light });
  cv.sprite(x + 10, y + 38, ['##', '..', '..', '##', '##'], { '#': '#000000' });
}

/** Hidden units: frosted Deco glass with a sunburst etched into it. */
function frostedDeco(cv: PixelCanvas, rows: Row[]): void {
  rows.forEach(({ y, il, ir }) => {
    for (let x = il; x <= ir; x++) {
      const c = x - il;
      let col = dith(x, y, 0.5) ? '#C8D0D8' : '#AEB8C2';
      if (c === 0) col = '#E4EAF0';
      if (c >= ir - il - 1) col = '#7E8894';
      cv.px(x, y, col);
    }
  });
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  if (!top || !bottom) return;
  const cx = Math.floor((top.il + top.ir) / 2);
  const by = bottom.y;
  for (let a = 20; a <= 160; a += 20) {
    const r = (a * Math.PI) / 180;
    cv.line(cx, by, Math.round(cx - Math.cos(r) * 10), Math.round(Math.max(top.y, by - Math.sin(r) * 18)), GOLD.base);
  }
  cv.hline(top.il, top.y, top.ir - top.il + 1, '#F4F8FC');
  const mid = rows[Math.floor(rows.length / 2) - 6];
  if (mid) cv.sprite(cx - 2, mid.y, ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], { '#': '#4A5560' });
}

/** Only glass: a velvet rope on brass posts in front of it. */
function velvetRope(cv: PixelCanvas, x0: number, y0: number, drinkColor: string): void {
  for (const px of [x0 - 3, x0 + 27]) {
    cv.shadowBox(px + 1, y0 + 72, 5, 3, 0.5, 0.5);
    cv.rect(px, y0 + 44, 3, 30, GOLD.base);
    cv.vline(px, y0 + 44, 30, GOLD.light);
    cv.vline(px + 2, y0 + 44, 30, GOLD.deep);
    disc(cv, px + 1, y0 + 42, 2, { hi: GOLD.hi, base: GOLD.base, dk: GOLD.deep });
    cv.rect(px - 2, y0 + 73, 7, 2, GOLD.dark);
  }
  for (let i = 0; i <= 28; i++) {
    const x = x0 - 1 + i;
    const sag = Math.round(Math.sin((i / 28) * Math.PI) * 7);
    cv.px(x, y0 + 45 + sag, '#D0405A');
    cv.px(x, y0 + 46 + sag, '#A8213A');
    cv.px(x, y0 + 47 + sag, '#6A0E1E');
  }
  cv.rect(x0 + 11, y0 + 51, 5, 4, drinkColor);
  cv.hline(x0 + 11, y0 + 51, 5, mix(drinkColor, '#FFFFFF', 0.4));
}

const COASTER = {
  ring: GOLD.base,
  ringHi: GOLD.light,
  ringDk: GOLD.deep,
  inner: '#0B0B0B',
  face: '#151515',
  faceHi: '#222222',
  faceDk: '#0A0A0A',
  icon: GOLD.light,
};

function coasters(cv: PixelCanvas, counts: [number, number, number], usable: [boolean, boolean, boolean]): void {
  (['undo', 'glass', 'hint'] as const).forEach((icon, i) =>
    roundCoaster(cv, MATS.centres[i]!, MATS.y, COASTER, icon, counts[i]!, usable[i]!, '#0B0B0B'),
  );
}

export const newYorkArt: CityLevelArt = {
  backdrop: newYorkBackdrop,
  bleed: newYorkBleed,
  boosters: coasters,
  glass: DECO,
  locked: decoDoor,
  hidden: frostedDeco,
  only: velvetRope,
  sign: SIGN,
  restart: RESTART,
  mats: MATS,
  text: { title: '#F1E3C2', sub: '#CBBF9F' },
};
