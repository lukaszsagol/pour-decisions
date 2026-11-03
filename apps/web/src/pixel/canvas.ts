/**
 * Pixel art buffer, ported from `docs/design/pixel/reference/pixel.py` and the
 * helpers in `ams_pixel3.py`. One entry per art pixel; colours are #RRGGBB
 * strings at the API (like the reference) and packed integers inside.
 */

/** Packed colour: 0 is transparent, otherwise 0x1RRGGBB. */
type Packed = number;

const OPAQUE = 0x1000000;
const parsed = new Map<string, Packed>();

export function pack(hex: string): Packed {
  let p = parsed.get(hex);
  if (p === undefined) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`);
    p = OPAQUE | parseInt(m[1]!, 16);
    parsed.set(hex, p);
  }
  return p;
}

export function unpack(p: Packed): string | null {
  if (!p) return null;
  return `#${(p & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

const rgb = (hex: string): [number, number, number] => {
  const p = pack(hex);
  return [(p >> 16) & 255, (p >> 8) & 255, p & 255];
};

/** Python's round(): halves go to the even neighbour, so colours match the reference exactly. */
export function pyRound(v: number): number {
  const f = Math.floor(v);
  const d = v - f;
  if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(v);
}

/** Mixes two colours like the reference `mix()`: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  const c = (i: number) => pyRound(A[i]! + (B[i]! - A[i]!) * t);
  return `#${[c(0), c(1), c(2)].map((v) => v.toString(16).toUpperCase().padStart(2, '0')).join('')}`;
}

/** 4×4 ordered (Bayer) dither matrix, as in the reference. */
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** True when pixel (x, y) is "on" for coverage t (0–1). */
export function dith(x: number, y: number, t: number): boolean {
  return t * 16 > BAYER[((y % 4) + 4) % 4]![((x % 4) + 4) % 4]! + 0.5;
}

export type Palette = Record<string, string>;

export class PixelCanvas {
  readonly data: Uint32Array;

  constructor(
    readonly w: number,
    readonly h: number,
    bg: string | null = null,
  ) {
    this.data = new Uint32Array(w * h);
    if (bg) this.data.fill(pack(bg));
  }

  px(x: number, y: number, c: string | null | undefined): void {
    if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = pack(c);
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return unpack(this.data[y * this.w + x]!);
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    const p = pack(c);
    const x0 = Math.max(0, x);
    const x1 = Math.min(this.w, x + w);
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++)
      this.data.fill(p, yy * this.w + x0, yy * this.w + Math.max(x0, x1));
  }

  hline(x: number, y: number, w: number, c: string): void {
    this.rect(x, y, w, 1, c);
  }

  vline(x: number, y: number, h: number, c: string): void {
    this.rect(x, y, 1, h, c);
  }

  /** Draws rows of characters; characters not in the palette are transparent. */
  sprite(x: number, y: number, rows: readonly string[], pal: Palette): void {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]!];
        if (c) this.px(x + i, y + j, c);
      }
    });
  }

  /** Bresenham line, optionally dashed ([on, off]). */
  line(x0: number, y0: number, x1: number, y1: number, c: string, dash?: [number, number]): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let n = 0;
    for (;;) {
      if (!dash || n % (dash[0] + dash[1]) < dash[0]) this.px(x0, y0, c);
      n++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Moves an existing pixel's colour towards another (no-op on transparent pixels). */
  tint(x: number, y: number, toward: string, t: number): void {
    const c = this.get(x, y);
    if (c) this.px(x, y, mix(c, toward, t));
  }

  /** Dithered darkening, as the reference `shadow_box`. */
  shadowBox(x: number, y: number, w: number, h: number, t = 0.5, strength = 0.4): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) if (dith(xx, yy, t)) this.tint(xx, yy, '#000000', strength);
  }

  /** Copies another canvas onto this one (transparent pixels skipped). */
  blit(src: PixelCanvas, x: number, y: number): void {
    for (let j = 0; j < src.h; j++) {
      const ty = y + j;
      if (ty < 0 || ty >= this.h) continue;
      for (let i = 0; i < src.w; i++) {
        const p = src.data[j * src.w + i]!;
        const tx = x + i;
        if (p && tx >= 0 && tx < this.w) this.data[ty * this.w + tx] = p;
      }
    }
  }

  /** RGBA bytes for ImageData. */
  toRGBA(): Uint8ClampedArray<ArrayBuffer> {
    const out = new Uint8ClampedArray(new ArrayBuffer(this.w * this.h * 4));
    for (let i = 0; i < this.data.length; i++) {
      const p = this.data[i]!;
      if (!p) continue;
      out[i * 4] = (p >> 16) & 255;
      out[i * 4 + 1] = (p >> 8) & 255;
      out[i * 4 + 2] = p & 255;
      out[i * 4 + 3] = 255;
    }
    return out;
  }
}

/** 3×5 digits from `pixel.py`. */
export const DIGITS_SMALL: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

/** 4×7 digits from `ams_pixel3.py` (booster counts), completed for 6–9. */
export const DIGITS: Record<string, string[]> = {
  '0': ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  '1': ['.#..', '##..', '.#..', '.#..', '.#..', '.#..', '###.'],
  '2': ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
  '3': ['###.', '...#', '...#', '.##.', '...#', '...#', '###.'],
  '4': ['#..#', '#..#', '#..#', '####', '...#', '...#', '...#'],
  '5': ['####', '#...', '###.', '...#', '...#', '#..#', '.##.'],
  '6': ['.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.'],
  '7': ['####', '...#', '..#.', '..#.', '.#..', '.#..', '.#..'],
  '8': ['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.'],
  '9': ['.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.'],
};

/** Draws a number with the small 3×5 digits (4 px advance), as `digits()` in the reference. */
export function digits(cv: PixelCanvas, x: number, y: number, text: string, c: string): void {
  for (const ch of text) {
    const d = DIGITS_SMALL[ch];
    if (d) cv.sprite(x, y, d, { '#': c });
    x += 4;
  }
}

/** Width in art px of `text` drawn with the 4×7 digits (5 px advance). */
export function bigDigitsWidth(text: string): number {
  return text.length * 5 - 1;
}

export function bigDigits(cv: PixelCanvas, x: number, y: number, text: string, c: string): void {
  for (const ch of text) {
    const d = DIGITS[ch];
    if (d) cv.sprite(x, y, d, { '#': c });
    x += 5;
  }
}
