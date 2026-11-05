import type { Theme } from '@pour/themes';
import { color } from '../theme-css.js';
import { dith, mix, PixelCanvas } from './canvas.js';
import { disc, glow, GOLD } from './level/common.js';

/**
 * City maps as pixel scenes. The world is drawn at art resolution (half the
 * logical map height) and shown in chunks; nodes are pixel coins.
 */

export const MAP_W = 195;

export type NodeState = 'done' | 'current' | 'locked';

export interface MapNode {
  /** Centre in art px. */
  x: number;
  y: number;
  state: NodeState;
  kind: 'normal' | 'hard' | 'superHard';
  stars: number;
  /** The next Super Hard: drawn with a dashed ring. */
  flagged: boolean;
}

export interface MapScene {
  height: number;
  /** Path centre x for an art row. */
  pathX: (y: number) => number;
  /** Rows of the landmarks between bars. */
  gates: number[];
  nodes: MapNode[];
}

/** Radius of a node coin, in art px. */
export function coinRadius(n: Pick<MapNode, 'state' | 'kind'>): number {
  return n.state === 'current' || (n.state === 'locked' && n.kind !== 'normal') ? 12 : 10;
}

interface CityMap {
  ground: string;
  /** The side buildings, either side of the path. */
  sides(cv: PixelCanvas, scene: MapScene, theme: Theme): void;
  /** The path itself, row by row. */
  path(cv: PixelCanvas, scene: MapScene, theme: Theme): void;
  /** A landmark across the path between bars. */
  gate(cv: PixelCanvas, y: number, scene: MapScene, theme: Theme): void;
  /** Lamps, signs and weather along the way. */
  details(cv: PixelCanvas, scene: MapScene, theme: Theme): void;
  /** The skyline at the top of the city. */
  skyline(cv: PixelCanvas, theme: Theme): void;
  /** Texture for the open ground between the buildings and the path. */
  texture?(x: number, y: number): string;
  /** Width of the side buildings (art px), repeated outwards on wide screens. */
  sideW?: number;
}

const mod = (v: number, m: number) => ((v % m) + m) % m;

/**
 * Past the stage's sides (wide screens), more of the city: the side buildings
 * repeat outwards, each copy a storey lower so its windows differ.
 */
function moreBuildings(cv: PixelCanvas, sideW: number, storey = 34): void {
  const top = 70;
  const span = Math.floor((cv.maxY - top) / storey) * storey;
  const src = new PixelCanvas(cv.w, cv.h, null, cv.ox, cv.oy);
  src.data.set(cv.data);
  for (let x = cv.minX; x < cv.maxX; x++) {
    if (x >= 0 && x < MAP_W) continue;
    const left = x < 0;
    const n = left ? Math.ceil(-x / sideW) : Math.floor((x - MAP_W) / sideW) + 1;
    const sx = left ? mod(x, sideW) : MAP_W - sideW + mod(x - MAP_W, sideW);
    for (let y = top; y < cv.maxY; y++) {
      const sy = y - top < span ? top + mod(y - top + n * storey, span) : y;
      const i = src.index(sx, sy);
      if (i >= 0) cv.setPacked(x, y, src.data[i]!);
    }
  }
}

/** Fills the open ground between the side buildings with the city's texture. */
function openGround(cv: PixelCanvas, scene: MapScene, fn: (x: number, y: number) => string): void {
  for (let y = 78; y < scene.height; y++) for (let x = 32; x < MAP_W - 32; x++) cv.px(x, y, fn(x, y));
}

/** Stepped gables on the path side of each house (Amsterdam). */
function gables(cv: PixelCanvas, height: number, tones: string[], storey = 34): void {
  for (const side of [0, 1]) {
    for (let y = 70, k = 0; y < height; y += storey, k++) {
      const base = tones[(k + side * 2) % tones.length]!;
      const dir = side ? -1 : 1;
      const edge = side ? MAP_W - 33 : 32;
      for (let step = 0; step < 3; step++) {
        const len = storey - 8 - step * 8;
        const y0 = y + 4 + step * 4;
        const x0 = edge + dir * step * 2;
        cv.rect(side ? x0 - 1 : x0, y0, 2, len, step === 2 ? mix(base, '#FFFFFF', 0.1) : base);
        cv.hline(side ? x0 - 1 : x0, y0, 2, mix(base, '#FFFFFF', 0.22));
        cv.hline(side ? x0 - 1 : x0, y0 + len - 1, 2, mix(base, '#000000', 0.35));
      }
    }
  }
}

const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** Draws the path band row by row: banks, then the surface, then an edge treatment. */
function band(
  cv: PixelCanvas,
  scene: MapScene,
  half: number,
  fn: (x: number, y: number, d: number) => string | null,
): void {
  for (let y = 0; y < scene.height; y++) {
    const cx = scene.pathX(y);
    for (let x = Math.max(0, Math.floor(cx - half)); x <= Math.min(MAP_W - 1, Math.ceil(cx + half)); x++) {
      const d = x - cx;
      if (Math.abs(d) > half) continue;
      const c = fn(x, y, d);
      if (c) cv.px(x, y, c);
    }
  }
}

/** Facades down both sides of the map with lit and dark windows. */
function facades(
  cv: PixelCanvas,
  height: number,
  tones: string[],
  win: string,
  opts: { w?: number; storey?: number; seed?: number } = {},
): void {
  const w = opts.w ?? 32;
  const storey = opts.storey ?? 34;
  for (const side of [0, 1]) {
    const x0 = side ? MAP_W - w : 0;
    for (let y = 70, k = 0; y < height; y += storey, k++) {
      const base = tones[(k + side * 2) % tones.length]!;
      cv.rect(x0, y, w, storey, base);
      cv.hline(x0, y, w, mix(base, '#000000', 0.45));
      cv.vline(side ? x0 : x0 + w - 1, y, storey, mix(base, '#000000', 0.35));
      cv.vline(side ? x0 + 1 : x0 + w - 2, y, storey, mix(base, '#FFFFFF', 0.1));
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 3; c++) {
          const lit = hash((opts.seed ?? 1) * 1000 + k * 13 + r * 5 + c + side * 101) < 0.45;
          const wx = x0 + 4 + c * 9;
          const wy = y + 6 + r * 14;
          cv.rect(wx, wy, 5, 7, lit ? win : mix(base, '#000000', 0.5));
          if (lit) {
            cv.hline(wx, wy, 5, mix(win, '#FFFFFF', 0.35));
            cv.px(wx + 2, wy + 3, mix(win, '#000000', 0.3));
          }
          cv.hline(wx - 1, wy + 7, 7, mix(base, '#FFFFFF', 0.15));
        }
    }
  }
}

function lampPost(cv: PixelCanvas, x: number, y: number, light: string, pole: string): void {
  glow(cv, x + 2, y + 2, 16, light, { strength: 0.06 });
  cv.rect(x + 1, y + 5, 2, 18, pole);
  cv.vline(x + 1, y + 5, 18, mix(pole, '#FFFFFF', 0.2));
  cv.rect(x - 1, y + 22, 6, 2, pole);
  cv.rect(x, y, 4, 5, light);
  cv.hline(x, y, 4, mix(light, '#FFFFFF', 0.5));
  cv.vline(x + 3, y + 1, 4, mix(light, '#000000', 0.3));
}

const amsterdam: CityMap = {
  ground: '#2A1A10',
  sides(cv, s) {
    facades(cv, s.height, ['#5A2A1C', '#3B2A20', '#6E4A2E', '#4A3A2A'], '#E8A33D', { seed: 1 });
    gables(cv, s.height, ['#5A2A1C', '#3B2A20', '#6E4A2E', '#4A3A2A']);
  },
  texture: (x, y) => {
    // A brick street: running bond, with the odd darker brick.
    const row = Math.floor(y / 3);
    const off = row % 2 ? 3 : 0;
    if (y % 3 === 2 || (x + off) % 6 === 0) return '#24160D';
    return hash(Math.floor((x + off) / 6) * 17 + row * 5) < 0.2 ? '#2E1D12' : '#33211A';
  },
  path(cv, s) {
    // Brick quays, then the canal with dithered ripples.
    band(cv, s, 20, (x, y, d) => {
      const ad = Math.abs(d);
      if (ad > 15)
        return (x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 || y % 4 === 0 ? '#3A281C' : ad > 18 ? '#4A3628' : '#5A4232';
      if (ad > 14) return '#8C7A60';
      const ripple = dith(x, y, 0.18) && (y + Math.floor(x / 3)) % 7 === 0;
      if (ripple) return '#4C76A6';
      if (d < -10) return '#2E5A8A';
      if (d > 10) return '#1A3656';
      return '#23476E';
    });
  },
  gate(cv, y, s) {
    const cx = Math.round(s.pathX(y));
    cv.shadowBox(cx - 22, y + 4, 46, 5, 0.6, 0.5);
    cv.rect(cx - 24, y - 4, 48, 9, '#6B3A26');
    cv.hline(cx - 24, y - 4, 48, '#8A5A3A');
    for (let x = cx - 24; x < cx + 24; x += 4) cv.vline(x, y - 3, 8, '#5A2A1C');
    for (let x = cx - 23; x < cx + 24; x += 7) cv.rect(x, y - 8, 2, 4, '#8A5A3A');
    cv.hline(cx - 24, y - 8, 48, '#A87A50');
    for (let i = -9; i <= 9; i++) {
      const h = Math.round(Math.sqrt(81 - i * i) * 0.5);
      cv.vline(cx + i, y + 5 - h, h, '#23476E');
    }
  },
  details(cv, s) {
    for (let y = s.height - 120, left = true; y > 140; y -= 150, left = !left) {
      const x = Math.round(s.pathX(y)) + (left ? -30 : 26);
      lampPost(cv, x, y, '#E8A33D', '#1A1A1A');
    }
  },
  skyline(cv) {
    disc(cv, 160, 40, 6, { hi: '#FFF9EC', base: '#F3E6CC', dk: '#D8C7A6' });
    for (let i = Math.floor(cv.minX / 28); i * 28 < cv.maxX; i++) {
      const x = i * 28;
      const h = 30 + Math.round(hash(i + 7) * 10);
      const top = 76 - h;
      const c = ['#5A2A1C', '#3B2A20', '#6E4A2E', '#2E3A4A'][mod(i, 4)]!;
      if (mod(i, 3) === 0)
        cv.sprite(x, top, ['....####....', '....####....', '..########..', '..########..', '############'], { '#': c });
      else if (mod(i, 3) === 1) for (let j = 0; j < 6; j++) cv.hline(x + 6 - j, top + j, 2 + j * 2, c);
      cv.rect(x, top + 5, 26, h - 5, c);
      cv.rect(x + 7, top + 14, 5, 7, '#E8A33D');
      cv.rect(x + 15, top + 14, 5, 7, mix('#E8A33D', c, 0.6));
    }
  },
};

const london: CityMap = {
  ground: '#14201C',
  sides: (cv, s) => facades(cv, s.height, ['#1E3A30', '#17302A', '#13261F', '#22402F'], '#C9B77A', { seed: 2 }),
  texture: (x, y) => {
    const row = Math.floor(y / 3);
    const off = row % 2 ? 2 : 0;
    if (y % 3 === 2 || (x + off) % 5 === 0) return '#0E1814';
    return hash(Math.floor((x + off) / 5) * 31 + row * 7) < 0.4 ? '#1C2A24' : '#18241F';
  },
  path(cv, s) {
    // A cobbled lane with kerbs.
    band(cv, s, 19, (x, y, d) => {
      const ad = Math.abs(d);
      if (ad > 16) return '#25332C';
      if (ad > 15) return '#7A8C82';
      const row = Math.floor(y / 3);
      const off = row % 2 ? 2 : 0;
      const seam = y % 3 === 2 || (x + off) % 5 === 0;
      if (seam) return '#2C3832';
      const t = hash(Math.floor((x + off) / 5) * 31 + row * 7);
      return t < 0.33 ? '#4A5A52' : t < 0.66 ? '#3E4C45' : '#56685E';
    });
  },
  gate(cv, y, s) {
    // An iron arch over the lane.
    const cx = Math.round(s.pathX(y));
    for (let i = -20; i <= 20; i++) {
      const h = Math.round(Math.sqrt(400 - i * i) * 0.45);
      cv.px(cx + i, y - h, '#3A3A3A');
      cv.px(cx + i, y - h + 1, '#1A1A1A');
    }
    for (const px of [cx - 21, cx + 20]) {
      cv.rect(px, y - 2, 3, 12, '#2A2A2A');
      cv.vline(px, y - 2, 12, '#4A4A4A');
    }
  },
  details(cv, s) {
    // Gas lamps, fog bands and the odd red phone box.
    for (let y = s.height - 120, left = true; y > 140; y -= 150, left = !left) {
      const x = Math.round(s.pathX(y)) + (left ? -30 : 26);
      lampPost(cv, x, y, '#F6D58A', '#111111');
    }
    for (let y = s.height - 220; y > 120; y -= 170) {
      // A bank of fog drifting over the lane and the open ground, not the houses.
      for (let yy = y; yy < y + 18; yy++)
        for (let x = 34; x < MAP_W - 34; x++) {
          const t = 0.4 - Math.abs(yy - y - 9) * 0.04 - Math.abs(x - MAP_W / 2) * 0.003;
          if (t > 0 && dith(x + yy * 3, yy, t)) cv.tint(x, yy, '#B9C4BE', 0.2);
        }
    }
    for (let y = s.height - 260; y > 200; y -= 460) {
      const x = MAP_W - 22;
      cv.shadowBox(x + 2, y + 2, 12, 26, 0.6, 0.5);
      cv.rect(x, y, 12, 26, '#C8242E');
      cv.hline(x, y, 12, '#E8505A');
      for (const [dx, dy] of [
        [2, 5],
        [7, 5],
        [2, 12],
        [7, 12],
      ] as const)
        cv.rect(x + dx, y + dy, 3, 5, '#E8A07A');
    }
  },
  skyline(cv) {
    for (let i = Math.floor(cv.minX / 22); i * 22 < cv.maxX; i++) {
      const x = i * 22;
      const h = 20 + Math.round(hash(i + 40) * 14);
      cv.rect(x, 76 - h, 20, h, '#0E1814');
      cv.rect(x + 4, 76 - h - 4, 3, 4, '#0E1814');
    }
    cv.rect(118, 18, 8, 58, '#0E1814');
    cv.rect(116, 14, 12, 6, '#0E1814');
    disc(cv, 122, 30, 3, { hi: '#E8E2C8', base: '#C9C2A8', dk: '#8C8670' });
  },
};

const newyork: CityMap = {
  ground: '#121212',
  texture: (x, y) => (x % 10 === 0 || y % 10 === 0 ? '#0E0E0E' : dith(x, y, 0.1) ? '#171717' : '#141414'),
  sideW: 34,
  sides(cv, s) {
    // Stepped Deco towers with gold pinstripes.
    for (const side of [0, 1]) {
      const x0 = side ? MAP_W - 34 : 0;
      cv.rect(x0, 70, 34, s.height - 70, side ? '#151515' : '#1A1A1A');
      for (const dx of [6, 14, 22, 30]) {
        const x = side ? x0 + 34 - dx : x0 + dx;
        cv.vline(x, 70, s.height - 70, mix(GOLD.base, '#1A1A1A', 0.55));
      }
      // Setbacks on the avenue side: the towers step back with gold trim.
      for (let y = 100, k = 0; y < s.height; y += 60, k++) {
        const depth = (k % 3) * 2 + 2;
        const ex = side ? x0 - depth : x0 + 34;
        cv.rect(ex, y, depth, 40, side ? '#151515' : '#1A1A1A');
        cv.hline(ex, y, depth, GOLD.base);
        cv.vline(side ? ex : ex + depth - 1, y, 40, mix(GOLD.base, '#1A1A1A', 0.4));
      }
      for (let y = 90; y < s.height; y += 22)
        for (const dx of [3, 10, 18, 26]) {
          if (hash(y * 3 + dx + side * 77) < 0.5) continue;
          const x = side ? x0 + 34 - dx - 4 : x0 + dx;
          cv.rect(x, y, 3, 5, '#B8962E');
          cv.px(x, y, '#E8C860');
        }
    }
  },
  path(cv, s) {
    band(cv, s, 18, (x, y, d) => {
      const ad = Math.abs(d);
      if (ad > 16) return '#5C4B22';
      if (ad > 15) return GOLD.base;
      if (Math.abs(d) < 1 && Math.floor(y / 6) % 2 === 0) return mix(GOLD.base, '#1F1F1F', 0.35);
      return dith(x, y, 0.1) ? '#262626' : '#1F1F1F';
    });
  },
  gate(cv, y, s) {
    // A gold stepped arch.
    const cx = Math.round(s.pathX(y));
    for (let step = 0; step < 3; step++) {
      const half = 22 - step * 5;
      cv.hline(cx - half, y - 6 - step * 3, half * 2, step === 2 ? GOLD.light : GOLD.base);
      cv.hline(cx - half, y - 5 - step * 3, half * 2, GOLD.deep);
    }
    for (const px of [cx - 22, cx + 20]) {
      cv.rect(px, y - 6, 3, 14, GOLD.base);
      cv.vline(px, y - 6, 14, GOLD.light);
    }
  },
  details(cv, s) {
    for (let y = s.height - 120, left = true; y > 140; y -= 150, left = !left) {
      const x = Math.round(s.pathX(y)) + (left ? -30 : 26);
      lampPost(cv, x, y, GOLD.light, '#2A2A2A');
    }
    // A jazz club sign every so often.
    for (let y = s.height - 330; y > 200; y -= 560) {
      const x = MAP_W - 30;
      cv.rect(x, y, 24, 30, '#0B0B0B');
      for (let i = 0; i < 24; i += 3) {
        cv.px(x + i + 1, y + 1, GOLD.light);
        cv.px(x + i + 1, y + 28, GOLD.light);
      }
      cv.hline(x, y, 24, GOLD.base);
      cv.hline(x, y + 29, 24, GOLD.base);
      cv.vline(x, y, 30, GOLD.base);
      cv.vline(x + 23, y, 30, GOLD.base);
      cv.sprite(
        x + 4,
        y + 10,
        ['..#.###.###.###', '..#.#.#...#...#', '..#.###..#...#.', '#.#.#.#.#...#..', '###.#.#.###.###'],
        { '#': '#E8578A' },
      );
    }
  },
  skyline(cv) {
    for (let i = Math.floor(cv.minX / 25); i * 25 < cv.maxX; i++) {
      const x = i * 25;
      const h = 34 + Math.round(hash(i + 90) * 26);
      const top = 76 - h;
      cv.rect(x + 2, top, 21, h, '#161616');
      cv.rect(x + 6, top - 6, 13, 6, '#161616');
      cv.rect(x + 10, top - 12, 5, 6, '#161616');
      cv.vline(x + 12, top - 18, 6, GOLD.base);
      for (let y = top + 4; y < 74; y += 7) if (hash(y + i * 9) > 0.5) cv.rect(x + 8, y, 3, 3, '#B8962E');
    }
  },
};

const tokyo: CityMap = {
  ground: '#0A0F2A',
  texture: (x, y) => {
    // Wet asphalt with puddles catching the neon.
    const puddle = hash(Math.floor(x / 9) * 13 + Math.floor(y / 7) * 29) < 0.12;
    if (puddle) return dith(x, y, 0.5) ? (Math.floor(y / 7) % 2 ? '#3A1E4A' : '#123A54') : '#0D1430';
    return dith(x, y, 0.06) ? '#121A3E' : '#0A0F2A';
  },
  sides(cv, s) {
    facades(cv, s.height, ['#101634', '#0D1330', '#141B40'], '#8A7350', { seed: 4 });
    // Vertical neon signs on the buildings.
    const neon = ['#FF5C8A', '#F4B860', '#5EC3F0'];
    for (let y = s.height - 400, k = 0; y > 150; y -= 300, k++) {
      const left = k % 2 === 0;
      const x = left ? 6 : MAP_W - 20;
      const c = neon[k % 3]!;
      glow(cv, x + 7, y + 22, 20, c, { strength: 0.07 });
      cv.rect(x, y, 14, 44, '#05081A');
      for (const [a, b] of [
        [0, 0],
        [13, 0],
      ] as const)
        cv.vline(x + a, y + b, 44, c);
      cv.hline(x, y, 14, c);
      cv.hline(x, y + 43, 14, c);
      for (let j = 0; j < 3; j++)
        cv.sprite(x + 4, y + 6 + j * 12, ['.###.', '#.#.#', '.###.', '#...#'], { '#': mix(c, '#FFFFFF', 0.3) });
    }
  },
  path(cv, s) {
    // A wet alley that reflects the neon.
    band(cv, s, 19, (x, y, d) => {
      const ad = Math.abs(d);
      if (ad > 16) return '#121A45';
      if (ad > 15) return '#3B4A8E';
      if (dith(x, y, 0.08) && (y * 3 + x) % 9 === 0) return d < 0 ? '#5A2A5A' : '#1E4A6A';
      return d < -9 ? '#202A62' : '#1A2358';
    });
  },
  gate(cv, y, s) {
    // A red torii across the alley.
    const cx = Math.round(s.pathX(y));
    cv.rect(cx - 24, y - 8, 48, 3, '#C8242E');
    cv.hline(cx - 24, y - 8, 48, '#E8505A');
    cv.hline(cx - 26, y - 9, 52, '#1A1A1A');
    cv.rect(cx - 20, y - 3, 40, 2, '#A81E26');
    for (const px of [cx - 18, cx + 15]) {
      cv.rect(px, y - 5, 3, 16, '#C8242E');
      cv.vline(px, y - 5, 16, '#E8505A');
    }
  },
  details(cv, s) {
    // Paper lanterns and rain.
    for (let y = s.height - 130, left = true; y > 140; y -= 115, left = !left) {
      const x = Math.round(s.pathX(y)) + (left ? -30 : 28);
      glow(cv, x, y + 6, 14, '#E0453A', { strength: 0.08 });
      cv.vline(x, y - 6, 4, '#3A2A2A');
      for (let j = 0; j < 12; j++) {
        const w = Math.round(Math.sin(((j + 1) / 13) * Math.PI) * 5);
        cv.hline(x - w, y - 2 + j, w * 2 + 1, j % 4 === 1 ? '#A82A22' : '#E0453A');
        cv.px(x - w, y - 2 + j, '#FF7A6A');
      }
    }
    for (let k = 0; k < s.height / 6; k++) {
      const x = Math.floor(hash(k * 7) * MAP_W);
      const y = Math.floor(hash(k * 7 + 3) * s.height);
      cv.tint(x, y, '#5EC3F0', 0.35);
      cv.tint(x - 1, y + 2, '#5EC3F0', 0.25);
      cv.tint(x - 1, y + 3, '#5EC3F0', 0.18);
    }
  },
  skyline(cv) {
    for (let i = Math.floor(cv.minX / 28); i * 28 < cv.maxX; i++) {
      const x = i * 28;
      const h = 26 + Math.round(hash(i + 60) * 20);
      cv.rect(x, 76 - h, 26, h, '#0D1330');
      for (let y = 80 - h; y < 72; y += 6) if (hash(y + i) > 0.6) cv.rect(x + 6, y, 3, 2, '#8A7350');
    }
    disc(cv, 160, 40, 5, { hi: '#FFFFFF', base: '#F4ECDD', dk: '#C8C0B4' });
  },
};

const maps: Record<string, CityMap> = { amsterdam, london, newyork, tokyo };

/** A 7 px star with an outline (o), face (#) and highlight (h). */
const STAR = ['...o...', '..o#o..', 'oo#h#oo', 'o#h###o', '.o###o.', '.o#o#o.', '.oo.oo.'];

/** A coin node with shading, a ring for Hard levels, a dashed ring for the next Super Hard, stars underneath. */
export function drawCoin(cv: PixelCanvas, n: MapNode, theme: Theme): void {
  const k = theme.colors;
  const r = coinRadius(n);
  const face =
    n.state === 'current'
      ? color(theme, 'mapCurrent', k.accent)
      : n.state === 'done'
        ? k.starDone
        : mix(k.surface, k.glassRim, 0.3);
  const outline = mix(face, '#000000', 0.6);
  cv.shadowBox(n.x - r + 2, n.y - r + 2, 2 * r + 1, 2 * r + 1, 0.55, 0.5);
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j);
      if (d > r + 0.3) continue;
      let c = face;
      if (d > r - 0.9) c = outline;
      else if (d > r - 2.6 && d < r - 1.6) c = mix(face, '#000000', 0.22);
      else if (i + j < -r * 0.7 && d > r - 4) c = mix(face, '#FFFFFF', 0.4);
      else if (i + j > r * 0.7 && d > r - 4) c = mix(face, '#000000', 0.25);
      cv.px(n.x + i, n.y + j, c);
    }
  if (n.state !== 'locked') cv.hline(n.x - Math.floor(r / 2), n.y - r + 3, 3, mix(face, '#FFFFFF', 0.65));
  if (n.kind === 'hard' || (n.kind === 'superHard' && !n.flagged)) {
    for (let a = 0; a < 360; a += 2) {
      const t = (a * Math.PI) / 180;
      cv.px(Math.round(n.x + Math.cos(t) * (r + 2)), Math.round(n.y + Math.sin(t) * (r + 2)), k.hard);
      cv.px(
        Math.round(n.x + Math.cos(t) * (r + 3)),
        Math.round(n.y + Math.sin(t) * (r + 3)),
        mix(k.hard, '#000000', 0.4),
      );
    }
  }
  if (n.flagged) {
    for (let a = 0; a < 360; a += 3) {
      if (Math.floor(a / 15) % 2) continue;
      const t = (a * Math.PI) / 180;
      cv.px(Math.round(n.x + Math.cos(t) * (r + 2)), Math.round(n.y + Math.sin(t) * (r + 2)), k.hard);
    }
  }
  if (n.state === 'done') {
    const ink = mix(color(theme, 'mapGround', k.ground), '#000000', 0.5);
    for (let s = 0; s < 3; s++) {
      const on = s < n.stars;
      const face = on ? k.starDone : k.starEmpty;
      cv.sprite(n.x - 11 + s * 8, n.y + r + 2, STAR, { o: ink, '#': face, h: on ? mix(face, '#FFFFFF', 0.5) : face });
    }
  }
}

/**
 * A drawn night scene of the city across the top of the map, just under the
 * header (art row 40), so it shows whole when the map is scrolled to the top;
 * the path runs in under it. Past the stage's sides (wide screens) it
 * continues mirrored.
 */
function landmarkBand(cv: PixelCanvas, scene: PixelCanvas): void {
  const top = 40;
  const x0 = Math.floor((MAP_W - scene.w) / 2);
  for (let x = cv.minX; x < cv.maxX; x++) {
    let sx = x - x0;
    if (sx < 0) sx = -sx - 1;
    if (sx >= scene.w) sx = 2 * scene.w - sx - 1;
    sx = Math.max(0, Math.min(scene.w - 1, sx));
    for (let y = 0; y < scene.h; y++) cv.setPacked(x, top + y, scene.data[y * scene.w + sx]!);
  }
}

/**
 * The whole map world for a city, at art resolution, with `l`/`r` extra art
 * pixels of city either side for screens wider than the stage, and the city's
 * drawn landmark skyline across the top when there is one.
 */
export function drawMap(
  theme: Theme,
  scene: MapScene,
  bleed: { l: number; r: number } = { l: 0, r: 0 },
  landmark?: PixelCanvas,
): PixelCanvas {
  const m = maps[theme.id] ?? amsterdam;
  const cv = new PixelCanvas(MAP_W + bleed.l + bleed.r, scene.height, m.ground, bleed.l, 0);
  if (m.texture) openGround(cv, scene, m.texture);
  m.sides(cv, scene, theme);
  m.skyline(cv, theme);
  m.path(cv, scene, theme);
  for (const y of scene.gates) m.gate(cv, y, scene, theme);
  m.details(cv, scene, theme);
  if (bleed.l || bleed.r) moreBuildings(cv, m.sideW ?? 32);
  if (landmark) landmarkBand(cv, landmark);
  for (const n of scene.nodes) drawCoin(cv, n, theme);
  return cv;
}

/** The pulsing ring around the current node: frame 0–2, drawn on its own layer. */
export function pulseRing(theme: Theme, r: number, frame: number): PixelCanvas {
  const size = (r + 7) * 2 + 1;
  const cv = new PixelCanvas(size, size);
  const c = color(theme, 'mapCurrent', theme.colors.accent);
  const rr = r + 3 + frame;
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    cv.px(
      Math.round(r + 7 + Math.cos(t) * rr),
      Math.round(r + 7 + Math.sin(t) * rr),
      frame === 2 ? mix(c, '#000000', 0.35) : c,
    );
  }
  return cv;
}
