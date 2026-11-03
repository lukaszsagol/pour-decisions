import type { Recipe, Theme } from '@pour/themes';
import { dith, mix, PixelCanvas } from './canvas.js';
import { cityArt } from './level/art.js';
import { disc, glow, GOLD, letters, lettersWidth } from './level/common.js';

/** Small pixel scenes for menus: passport city cards, the complete screen's band, recipe glasses. */

/** A PNG data URL of a buffer (shown with `image-rendering: pixelated`). */
export function dataUrl(cv: PixelCanvas): string {
  const c = document.createElement('canvas');
  c.width = cv.w;
  c.height = cv.h;
  c.getContext('2d')!.putImageData(new ImageData(cv.toRGBA(), cv.w, cv.h), 0, 0);
  return c.toDataURL();
}

const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  return ((Math.imul(x, 0xc2b2ae35) >>> 0) % 1000) / 1000;
};

function windows(
  cv: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  lit: string,
  seed: number,
): void {
  for (let wy = y + 4; wy < y + h - 6; wy += 8)
    for (let wx = x + 3; wx < x + w - 4; wx += 6) {
      const on = hash(seed + wx * 7 + wy * 13) < 0.5;
      cv.rect(wx, wy, 3, 4, on ? lit : mix(base, '#000000', 0.45));
      if (on) cv.hline(wx, wy, 3, mix(lit, '#FFFFFF', 0.35));
    }
}

function amsterdamScene(cv: PixelCanvas): void {
  const { w, h } = cv;
  cv.rect(0, 0, w, h, '#1E140C');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dith(x, y, 0.15) && y < h * 0.5) cv.px(x, y, '#2A1E16');
  disc(cv, w - 22, 9, 4, { hi: '#FFF9EC', base: '#F3E6CC', dk: '#D8C7A6' });
  const water = h - Math.max(10, Math.round(h * 0.28));
  for (let i = 0, x = Math.round(w * 0.6); x < w; i++) {
    const hw = 13 + (i % 3) * 3;
    const top = water - 18 - Math.round(hash(i + 3) * Math.min(18, h * 0.35));
    const c = ['#5A2A1C', '#3B2A20', '#6E4A2E', '#2E3A4A'][i % 4]!;
    if (i % 2 === 0) for (let j = 0; j < 5; j++) cv.hline(x + Math.floor(hw / 2) - 1 - j, top - 5 + j, 2 + j * 2, c);
    cv.rect(x, top, hw, water - top, c);
    cv.vline(x, top, water - top, mix(c, '#FFFFFF', 0.12));
    cv.vline(x + hw - 1, top, water - top, mix(c, '#000000', 0.35));
    windows(cv, x, top, hw, water - top, c, '#E8A33D', i * 31);
    x += hw + 1;
  }
  cv.hline(0, water, w, '#8C7A60');
  for (let y = water + 1; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c = (y + Math.floor(x / 4)) % 6 === 0 && dith(x, y, 0.4) ? '#4C76A6' : '#23476E';
      if (y > h - 3) c = '#1A3656';
      // Reflections of the lit windows.
      if (x > w * 0.6 && (x % 6 === 4 || x % 6 === 5) && dith(x, y, 0.25)) c = '#8A6A3A';
      cv.px(x, y, c);
    }
}

function londonScene(cv: PixelCanvas): void {
  const { w, h } = cv;
  cv.rect(0, 0, w, h, '#0E1814');
  // The pub front: green facade, gold-lettered fascia, warm bay windows, a door.
  const x0 = Math.round(w * 0.6);
  const fw = w - x0 - 6;
  cv.rect(x0, 4, fw, h - 8, '#16382B');
  cv.vline(x0, 4, h - 8, '#2C5A46');
  cv.vline(x0 + fw - 1, 4, h - 8, '#0C2219');
  cv.rect(x0 + 2, 6, fw - 4, 11, '#0C2219');
  cv.hline(x0 + 2, 6, fw - 4, '#C9A24A');
  cv.hline(x0 + 2, 16, fw - 4, '#8A6A1E');
  const text = 'FREE HOUSE';
  if (lettersWidth(text) < fw - 6)
    letters(cv, x0 + Math.floor((fw - lettersWidth(text)) / 2), 8, text, {
      face: '#C9A24A',
      hi: '#F4D58A',
      shadow: '#050E0A',
    });
  const winTop = 20;
  const winH = Math.max(8, h - 32);
  for (const wx of [x0 + 5, x0 + fw - 31]) {
    cv.rect(wx, winTop, 26, winH, '#F2B860');
    for (let i = 0; i < 26; i += 6) cv.vline(wx + i, winTop, winH, '#3A2A1E');
    cv.hline(wx, winTop + Math.floor(winH / 2), 26, '#3A2A1E');
    cv.rect(wx, winTop, 26, 2, '#FFE2A8');
  }
  const dx = x0 + Math.floor(fw / 2) - 6;
  cv.rect(dx, h - 4 - Math.max(12, winH), 12, Math.max(12, winH), '#4A1418');
  cv.vline(dx, h - 4 - Math.max(12, winH), Math.max(12, winH), '#74242C');
  cv.px(dx + 9, h - 10, '#C9A24A');
  cv.hline(0, h - 4, w, '#3E4C45');
  for (let x = 0; x < w; x += 4) cv.px(x + ((x / 4) % 2) * 2, h - 2, '#2C3832');
  glow(cv, x0 + fw / 2, h / 2, Math.max(30, h * 0.8), '#F2B860', { strength: 0.06 });
  // Fog on the left.
  for (let y = 0; y < h; y++) for (let x = 0; x < x0; x++) if (dith(x + y, y, 0.18)) cv.tint(x, y, '#B9C4BE', 0.18);
}

function newYorkScene(cv: PixelCanvas): void {
  const { w, h } = cv;
  cv.rect(0, 0, w, h, '#0B0B0B');
  // A gold sunburst behind the skyline.
  const cx = Math.round(w * 0.72);
  for (let a = 15; a <= 165; a += 15) {
    const r = (a * Math.PI) / 180;
    cv.line(cx, h, Math.round(cx - Math.cos(r) * 60), Math.round(h - Math.sin(r) * h), '#3A3010');
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.round(w * 0.6) + i * 17;
    const th = Math.round(h * (0.45 + hash(i + 11) * 0.45));
    const top = h - th;
    cv.rect(x, top, 15, th, '#161616');
    cv.rect(x + 3, top - 4, 9, 4, '#161616');
    cv.rect(x + 6, top - 8, 3, 4, '#161616');
    cv.vline(x + 7, top - 13, 5, GOLD.base);
    cv.vline(x, top, th, '#222222');
    for (let y = top + 3; y < h - 2; y += 5)
      for (const dx of [3, 7, 11]) if (hash(i * 97 + y * 3 + dx) < 0.45) cv.rect(x + dx, y, 2, 3, '#B8962E');
  }
  cv.hline(0, h - 1, w, GOLD.base);
}

function tokyoScene(cv: PixelCanvas): void {
  const { w, h } = cv;
  cv.rect(0, 0, w, h, '#070B1F');
  const x0 = Math.round(w * 0.6);
  // Buildings with neon signs and a row of lanterns over a wet alley.
  for (let i = 0, x = x0; x < w; i++, x += 22) cv.rect(x, 2, 20, h - 8, i % 2 ? '#0D1330' : '#101634');
  const neon = ['#FF5C8A', '#5EC3F0', '#F4B860'];
  for (let i = 0, x = x0 + 4; x < w - 10; i++, x += 22) {
    const c = neon[i % 3]!;
    glow(cv, x + 4, h * 0.4, 18, c, { strength: 0.08 });
    const sh = Math.max(10, Math.round(h * 0.5));
    cv.rect(x, 6, 9, sh, '#05081A');
    cv.hline(x, 6, 9, c);
    cv.hline(x, 6 + sh - 1, 9, c);
    cv.vline(x, 6, sh, c);
    cv.vline(x + 8, 6, sh, c);
    for (let y = 10; y < 6 + sh - 4; y += 6)
      cv.sprite(x + 2, y, ['#.#', '.#.', '###'], { '#': mix(c, '#FFFFFF', 0.3) });
  }
  for (let x = x0 - 6; x < w; x += 16) {
    cv.vline(x, 0, 3, '#3A2A2A');
    for (let j = 0; j < 7; j++)
      cv.hline(
        x - 2 - (j > 0 && j < 6 ? 1 : 0),
        3 + j,
        5 + (j > 0 && j < 6 ? 2 : 0),
        j % 3 === 1 ? '#A82A22' : '#E0453A',
      );
  }
  for (let y = h - 6; y < h; y++)
    for (let x = 0; x < w; x++) cv.px(x, y, dith(x, y, 0.2) ? (x % 3 ? '#5A2A5A' : '#1E4A6A') : '#1A2358');
}

const SCENES: Record<string, (cv: PixelCanvas) => void> = {
  amsterdam: amsterdamScene,
  london: londonScene,
  newyork: newYorkScene,
  tokyo: tokyoScene,
};

/**
 * A passport card scene, w×h art px. The left part is darkened with a dither
 * so the card's text stays readable; a locked city is drawn dim and cold.
 */
export function cityScene(theme: Theme, w: number, h: number, locked = false): PixelCanvas {
  const cv = new PixelCanvas(w, h);
  (SCENES[theme.id] ?? amsterdamScene)(cv);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = Math.max(0, 1 - x / (w * 0.7));
      if (t > 0 && dith(x, y, t)) cv.tint(x, y, '#000000', 0.55);
    }
  if (locked)
    for (let i = 0; i < cv.data.length; i++) {
      const p = cv.data[i]!;
      if (!p) continue;
      const r = (p >> 16) & 255;
      const g = (p >> 8) & 255;
      const b = p & 255;
      const l = Math.round((r * 0.3 + g * 0.59 + b * 0.11) * 0.6);
      cv.data[i] = 0x1000000 | (l << 16) | (l << 8) | l;
    }
  return cv;
}

/** The city's top band, cut from its level backdrop (for the complete screen). */
export function cityBand(theme: Theme): PixelCanvas {
  const full = cityArt(theme).backdrop(0);
  const h = 30;
  const cv = new PixelCanvas(full.w, h);
  cv.data.set(full.data.subarray(0, full.w * h));
  return cv;
}

/** A pixel drawing of a recipe's glass, filled with the drink (35×75 art px). */
export function recipeGlass(recipe: Recipe): PixelCanvas {
  const cv = new PixelCanvas(35, 75);
  const c = recipe.color;
  const hi = mix(c, '#FFFFFF', 0.4);
  const dk = mix(c, '#000000', 0.35);
  const ink = '#1B1A2E';
  const fill = (x: number, y: number, w: number) => {
    cv.hline(x, y, w, c);
    cv.px(x, y, hi);
    cv.px(x + 1, y, hi);
    cv.px(x + w - 1, y, dk);
  };
  switch (recipe.glass) {
    case 'coupe': {
      for (let j = 0; j < 14; j++) {
        const half = Math.round(15 - j * j * 0.07);
        if (j > 1) fill(17 - half + 1, 18 + j, half * 2 - 1);
        cv.px(17 - half, 18 + j, ink);
        cv.px(17 + half, 18 + j, ink);
      }
      cv.hline(2, 18, 31, ink);
      cv.rect(16, 32, 2, 32, ink);
      cv.hline(9, 64, 17, ink);
      cv.hline(10, 65, 15, ink);
      break;
    }
    case 'rocks': {
      for (let y = 30; y < 68; y++) {
        cv.px(4, y, ink);
        cv.px(30, y, ink);
        if (y > 38) fill(5, y, 25);
      }
      cv.hline(4, 68, 27, ink);
      cv.hline(4, 69, 27, ink);
      cv.rect(9, 44, 8, 8, '#F4F0E4');
      cv.rect(16, 52, 8, 8, '#E8E4D8');
      break;
    }
    case 'tulip': {
      for (let j = 0; j < 40; j++) {
        const half = j < 30 ? 9 + Math.round(Math.sin((j / 30) * Math.PI) * 3) : 9 - (j - 30);
        if (j > 6) fill(17 - half + 1, 14 + j, Math.max(1, half * 2 - 1));
        cv.px(17 - half, 14 + j, ink);
        cv.px(17 + half, 14 + j, ink);
      }
      cv.rect(16, 54, 3, 12, ink);
      cv.hline(9, 66, 17, ink);
      cv.hline(10, 67, 15, ink);
      break;
    }
    default: {
      for (let y = 6; y < 70; y++) {
        cv.px(5, y, ink);
        cv.px(29, y, ink);
        if (y > 20) fill(6, y, 23);
      }
      cv.hline(5, 70, 25, ink);
      cv.hline(5, 71, 25, ink);
      cv.rect(9, 26, 7, 7, '#F4F0E4');
      cv.rect(17, 36, 7, 7, '#E8E4D8');
      cv.rect(10, 48, 7, 7, '#F4F0E4');
      cv.rect(20, 2, 9, 3, '#F5D547');
      cv.hline(20, 2, 9, '#FFF2A0');
    }
  }
  return cv;
}
