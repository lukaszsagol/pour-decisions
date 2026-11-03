import { bigDigits, bigDigitsWidth, dith, mix, type PixelCanvas } from '../canvas.js';
import { ICONS } from './amsterdam.js';

/**
 * Shared pixel materials for the city level screens, generalised from the
 * Amsterdam reference routines so every city follows the same rules.
 */

/** A dithered glow: stepped tints that fade with distance (like the reference lamp glow). */
export function glow(
  cv: PixelCanvas,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  opts: { sx?: number; sy?: number; strength?: number; phase?: number; y0?: number; y1?: number } = {},
): void {
  const { sx = 0.85, sy = 1.1, strength = 0.065, phase = 0, y0 = 0, y1 = cv.h } = opts;
  for (let y = Math.max(y0, Math.floor(cy - radius / sy)); y < Math.min(y1, Math.ceil(cy + radius / sy)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius / sx)); x < Math.min(cv.w, Math.ceil(cx + radius / sx)); x++) {
      const d = Math.hypot((x - cx) * sx, (y - cy) * sy);
      if (d >= radius) continue;
      const lvl = (1 - d / radius) ** 1.4 * 4;
      const step = Math.floor(lvl) + (dith(x + phase, y + phase, lvl - Math.floor(lvl)) ? 1 : 0);
      if (step) cv.tint(x, y, color, strength * step);
    }
  }
}

/** Vertical boards with light left and dark right edges, grain strokes and knots (reference wall recipe). */
export function boards(
  cv: PixelCanvas,
  y: number,
  h: number,
  tones: [string, string],
  seam: string,
  width = 19,
  knots = true,
): void {
  for (let i = 0, x = 0; x < cv.w; i++, x += width) {
    const base = tones[i % 2]!;
    cv.rect(x, y, width, h, base);
    cv.vline(x, y, h, seam);
    cv.vline(x + 1, y, h, mix(base, '#FFFFFF', 0.08));
    cv.vline(x + width - 1, y, h, mix(base, '#000000', 0.35));
    const seed = i * 7 + 3;
    for (let k = 0; k < Math.floor(h / 20); k++) {
      const gy = y + 7 + ((seed * 37 + k * 53) % Math.max(1, h - 14));
      const gx = x + 4 + ((seed + k * 5) % Math.max(1, width - 8));
      const ln = 4 + ((k * 7 + seed) % 9);
      cv.vline(gx, gy, ln, mix(base, '#000000', 0.25));
      cv.vline(gx + 1, gy + 1, Math.max(1, ln - 3), mix(base, '#FFFFFF', 0.06));
    }
    if (knots)
      for (let k = 0; k < Math.floor(h / 90); k++) {
        const ky = y + 20 + ((seed * 71 + k * 97) % Math.max(1, h - 30));
        const kx = x + 6 + ((seed * 3 + k * 4) % Math.max(1, width - 12));
        cv.sprite(kx, ky, ['.##.', '#..#', '.##.'], { '#': mix(base, '#000000', 0.35) });
      }
  }
}

/** A framed sign: bevelled frame in five tones with a dark recessed panel and rivets. */
export function frame(
  cv: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  t: { hi: string; light: string; base: string; dark: string; deep: string; panel: string; panelDark: string },
): void {
  cv.shadowBox(x + 2, y + 2, w, h, 0.5, 0.5);
  cv.rect(x, y, w, h, t.base);
  cv.hline(x, y, w, t.light);
  cv.vline(x, y, h, t.light);
  cv.hline(x, y + h - 1, w, t.deep);
  cv.vline(x + w - 1, y, h, t.deep);
  cv.rect(x + 3, y + 3, w - 6, h - 6, t.panel);
  cv.hline(x + 3, y + 3, w - 6, t.panelDark);
  cv.vline(x + 3, y + 3, h - 6, t.panelDark);
  cv.hline(x + 2, y + h - 3, w - 4, t.dark);
  for (const [px, py] of [
    [x + 1, y + 1],
    [x + w - 3, y + 1],
    [x + 1, y + h - 3],
    [x + w - 3, y + h - 3],
  ] as const) {
    cv.rect(px, py, 2, 2, t.hi);
    cv.px(px + 1, py + 1, t.deep);
  }
}

export const BRASS = { hi: '#FFE8A8', light: '#F4D58A', base: '#C9A24A', dark: '#A8842E', deep: '#8A6A1E' } as const;
export const GOLD = { hi: '#FFF2B8', light: '#F2D670', base: '#D4AF37', dark: '#A8862A', deep: '#6E5414' } as const;

/** A rail of four tones across the screen, with a dark line under it. */
export function rail(cv: PixelCanvas, y: number, tones: [string, string, string, string], under: string): void {
  tones.forEach((c, i) => cv.hline(0, y + i, cv.w, c));
  cv.hline(0, y + 4, cv.w, under);
}

/** Recessed panels across the counter front. */
export function panels(
  cv: PixelCanvas,
  y: number,
  t: { fill: string; inner: string; shadow: string; light: string; line?: string },
): void {
  for (let px = 0; px < cv.w; px += 39) {
    const x1 = px + 3;
    const w1 = 33;
    const h1 = cv.h - y - 6;
    cv.rect(x1, y, w1, h1, t.fill);
    cv.hline(x1, y, w1, t.shadow);
    cv.vline(x1, y, h1, t.shadow);
    cv.hline(x1, y + h1 - 1, w1, t.light);
    cv.vline(x1 + w1 - 1, y, h1, t.light);
    cv.rect(x1 + 4, y + 4, w1 - 8, h1 - 8, t.inner);
    if (t.line) {
      cv.hline(x1 + 6, y + 6, w1 - 12, t.line);
      cv.hline(x1 + 6, y + h1 - 7, w1 - 12, t.line);
      cv.vline(x1 + 6, y + 6, h1 - 12, t.line);
      cv.vline(x1 + w1 - 7, y + 6, h1 - 12, t.line);
    }
  }
}

const COUNT_BADGE = [
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

/** The amber count badge used on every booster (as on the reference mats). */
export function countBadge(cv: PixelCanvas, bx: number, by: number, count: number): void {
  cv.sprite(bx + 1, by + 1, COUNT_BADGE, { '#': '#6E420E' });
  cv.sprite(bx, by, COUNT_BADGE, { '#': '#E8A33D' });
  cv.hline(bx + 4, by + 1, 5, '#FFD27A');
  cv.hline(bx + 2, by + 2, 3, '#FFD27A');
  cv.hline(bx + 3, by + 11, 7, '#B8761E');
  const text = String(Math.min(99, count));
  bigDigits(cv, text.length === 1 ? bx + 5 : bx + Math.floor((13 - bigDigitsWidth(text)) / 2), by + 3, text, '#2A1A10');
}

export type BoosterIcon = keyof typeof ICONS;

/** A round coaster: outer rings, a face and a centred booster icon, with its count badge. */
export function roundCoaster(
  cv: PixelCanvas,
  cx: number,
  y: number,
  t: {
    ring: string;
    ringHi: string;
    ringDk: string;
    inner?: string;
    face: string;
    faceHi: string;
    faceDk: string;
    icon: string;
  },
  icon: BoosterIcon,
  count: number,
  usable: boolean,
  ground: string,
): void {
  const R = 16;
  const cy = y + R;
  const fade = (c: string) => (usable ? c : mix(c, ground, 0.55));
  cv.shadowBox(cx - R + 3, y + 3, 2 * R + 1, 2 * R + 1, 0.6, 0.5);
  for (let j = -R; j <= R; j++)
    for (let i = -R; i <= R; i++) {
      const d = Math.hypot(i + 0.5, j + 0.5);
      if (d > R) continue;
      let c: string;
      const lit = i + j < -4;
      const dark = i + j > 6;
      if (d > R - 2.2) c = lit ? t.ringHi : dark ? t.ringDk : t.ring;
      else if (t.inner && d > R - 3.6) c = t.inner;
      else if (t.inner && d > R - 5) c = lit ? t.ringHi : t.ring;
      else c = lit && d > R - 7 ? t.faceHi : dark && d > R - 7 ? t.faceDk : t.face;
      cv.px(cx + i, cy + j, fade(c));
    }
  cv.sprite(cx - 5, cy - 4, ICONS[icon], { '#': fade(mix(t.icon, '#000000', 0.45)) });
  cv.sprite(cx - 6, cy - 5, ICONS[icon], { '#': fade(t.icon) });
  countBadge(cv, cx + 8, y - 7, count);
}

/** 5×7 capitals for painted signs. */
const LETTERS: Record<string, string[]> = {
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Draws capitals with a drop shadow and a lit top row (gold leaf lettering). */
export function letters(
  cv: PixelCanvas,
  x: number,
  y: number,
  text: string,
  t: { face: string; hi: string; shadow: string },
): number {
  for (const ch of text) {
    const g = LETTERS[ch];
    if (!g) continue;
    cv.sprite(x + 1, y + 1, g, { '#': t.shadow });
    cv.sprite(x, y, g, { '#': t.face });
    g.forEach((row, j) => {
      if (j > 1) return;
      for (let i = 0; i < row.length; i++) if (row[i] === '#') cv.px(x + i, y + j, t.hi);
    });
    x += ch === ' ' ? 4 : 7;
  }
  return x;
}

/** Width of `letters()` text. */
export function lettersWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? 4 : 7;
  return w - 2;
}

/** A dithered drop shadow under a shelf or rail. */
export function shelfShadow(cv: PixelCanvas, y: number, h = 6): void {
  cv.shadowBox(0, y, cv.w, h, 0.55, 0.45);
}

/** A disc sprite (for lanterns, sconces, dartboards): radius r, shaded from the top left. */
export function disc(
  cv: PixelCanvas,
  cx: number,
  cy: number,
  r: number,
  t: { hi: string; base: string; dk: string; outline?: string },
): void {
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j);
      if (d > r + 0.3) continue;
      const lit = i + j < -r * 0.6;
      const dark = i + j > r * 0.6;
      cv.px(cx + i, cy + j, t.outline && d > r - 0.8 ? t.outline : lit ? t.hi : dark ? t.dk : t.base);
    }
}
