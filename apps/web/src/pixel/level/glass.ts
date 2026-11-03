import { dith, mix, type PixelCanvas } from '../canvas.js';
import type { LiquidTones } from '../tones.js';

/** Rim tones: light, base and dark (left wall, right wall). */
export interface Rim {
  rl: string;
  rb: string;
  rd: string;
}

/** Art pixels per liquid layer. */
export const UNIT = 15;

/** One interior row: y and the interior's left and right columns. */
export interface Row {
  y: number;
  il: number;
  ir: number;
}

export interface GlassStyle {
  /** Interior width per row, rim to bottom, for a 22 px wide interior. */
  profile: readonly number[];
  normal: Rim;
  locked: Rim;
  /** Rim of the selected glass (defaults to tones of the theme's selection colour). */
  selected?: Rim;
  /** Interior colours: dark fill, a slightly lighter column by the left wall, the darkest at the right. */
  interior: { fill: string; left: string; right: string };
  /** Draws what stands under the bowl (stem and foot, a thick base, a stepped foot). */
  base(cv: PixelCanvas, cx: number, y: number, rim: Rim, x0: number): void;
  /** Rows from the rim to the floor shadow. */
  shadowAt: number;
  /** Optional details in the empty part of the glass (ice in a highball). */
  emptyDetail?(cv: PixelCanvas, rows: Row[], liquidTopRow: number): void;
  /** Optional shape details drawn last (a nonic bulge). */
  detail?(cv: PixelCanvas, rows: Row[], rim: Rim): void;
}

/** A layer as drawn: a liquid of some drink, or a hidden unit. */
export interface Layer {
  tones: LiquidTones | null;
  hidden: boolean;
  /** Id used to merge runs of the same drink. */
  key: string;
}

export interface GlassDraw {
  x0: number;
  /** Rim row (already lifted when selected). */
  y0: number;
  layers: Layer[];
  /** Filled rows from the bottom (default: all layers). Lets pours fill one row at a time. */
  filledRows?: number;
  rim: Rim;
  style: GlassStyle;
  /** Interior width (22, or narrower when glasses are crowded). */
  interior: number;
  /** Draws a hidden unit over these rows (the city's skin). */
  hidden?(cv: PixelCanvas, rows: Row[]): void;
  /** Darken the contents (locked glass). */
  dim?: boolean;
  /** Skip the floor shadow (tilted copies). */
  noShadow?: boolean;
}

/** Rows of the interior for a glass at (x0, y0). */
export function glassRows(x0: number, y0: number, style: GlassStyle, interior: number): Row[] {
  const cx = x0 + 13;
  const shrink = 22 - interior;
  return style.profile.map((w0, r) => {
    const w = Math.max(4, w0 - shrink);
    const il = cx - Math.floor(w / 2);
    return { y: y0 + 1 + r, il, ir: il + w - 1 };
  });
}

/**
 * Port of `glass()` in `ams_pixel3.py`: dark interior, liquid layers with
 * full shading, the reflection sheen, walls, rim lip and base. Runs of the
 * same drink merge into one block. Returns the interior rows.
 */
export function drawGlass(cv: PixelCanvas, g: GlassDraw): Row[] {
  const { x0, y0, rim, style } = g;
  const { rl, rb, rd } = rim;
  const cx = x0 + 13;
  if (!g.noShadow) cv.shadowBox(x0 + 4, y0 + style.shadowAt, 20, 5, 0.5, 0.4);
  const rows = glassRows(x0, y0, style, g.interior);
  const n = rows.length;
  for (const { y, il, ir } of rows) {
    cv.hline(il, y, ir - il + 1, style.interior.fill);
    cv.px(il + 1, y, style.interior.left);
    cv.px(ir, y, style.interior.right);
  }

  // Liquids, bottom up, merged into runs.
  const total = g.layers.length * UNIT;
  const filled = Math.max(0, Math.min(total, g.filledRows ?? total));
  let liquidTop = n;
  let k = 0;
  while (k < g.layers.length && k * UNIT < filled) {
    const layer = g.layers[k]!;
    let end = k + 1;
    if (!layer.hidden)
      while (end < g.layers.length && !g.layers[end]!.hidden && g.layers[end]!.key === layer.key) end++;
    const segBottom = n - 1 - k * UNIT;
    const segRows = Math.min((end - k) * UNIT, filled - k * UNIT);
    const segTop = segBottom - segRows + 1;
    liquidTop = segTop;
    if (layer.hidden) {
      g.hidden?.(cv, rows.slice(segTop, segBottom + 1));
    } else {
      const { base, hi, dk, spec } = layer.tones!;
      for (let r = segTop; r <= segBottom; r++) {
        const { y, il, ir } = rows[r]!;
        const fromTop = r - segTop;
        const fromBottom = segBottom - r;
        const wdt = ir - il;
        for (let x = il; x <= ir; x++) {
          const c = x - il;
          let col = base;
          if (fromTop === 0) col = hi;
          else if (fromTop === 1 && dith(x, y, 0.5)) col = hi;
          else if (fromBottom <= 1 && dith(x, y, fromBottom === 1 ? 0.35 : 0.7)) col = mix(base, dk, 0.5);
          if (c === 0) col = mix(col, hi, 0.65);
          else if (c === 1) col = mix(col, hi, 0.3);
          else if (c === wdt) col = dk;
          else if (c === wdt - 1) col = mix(col, dk, 0.6);
          else if (c === wdt - 2 && dith(x, y, 0.5)) col = mix(col, dk, 0.4);
          if (g.dim) col = mix(col, '#140C06', 0.45);
          cv.px(x, y, col);
        }
      }
      const top = rows[segTop]!;
      cv.hline(top.il + 2, top.y, 3, g.dim ? mix(spec, '#140C06', 0.45) : spec);
    }
    k = end;
  }
  style.emptyDetail?.(cv, rows, liquidTop);

  // Reflection sheen down the left of the glass.
  for (let r = 2; r < Math.min(52, n); r++) {
    const { y, il } = rows[r]!;
    if (r % 9 !== 7 && r % 9 !== 8) cv.tint(il + 3, y, '#FFFFFF', r < 30 ? 0.38 : 0.2);
    if (r >= 3 && r <= 16) cv.tint(il + 4, y, '#FFFFFF', 0.18);
  }

  // Walls.
  for (const { y, il, ir } of rows) {
    cv.px(il - 1, y, rb);
    cv.px(ir + 1, y, rd);
    cv.px(il, y, mix(cv.get(il, y) ?? style.interior.fill, rl, 0.25));
  }
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    if (b.il > a.il) {
      cv.hline(a.il - 1, b.y, b.il - a.il + 1, rb);
      cv.hline(b.ir + 1, b.y, a.ir - b.ir + 1, rd);
    }
    if (b.il < a.il) {
      cv.hline(b.il - 1, a.y, a.il - b.il + 1, rb);
      cv.hline(a.ir + 1, a.y, b.ir - a.ir + 1, rd);
    }
  }

  // Rim lip.
  const first = rows[0]!;
  cv.hline(first.il - 2, y0, first.ir - first.il + 5, rl);
  cv.px(first.il - 2, y0 + 1, rb);
  cv.px(first.ir + 2, y0 + 1, rd);
  cv.px(first.ir + 2, y0, rb);

  // Base of the bowl, then whatever stands under it.
  const last = rows[n - 1]!;
  cv.hline(last.il, last.y + 1, last.ir - last.il + 1, rd);
  cv.hline(last.il, last.y + 1, Math.floor((last.ir - last.il) / 2), rb);
  style.base(cv, cx, last.y + 2, rim, x0);
  style.detail?.(cv, rows, rim);
  return rows;
}

/** The reference tulip glass: profile, rims and stem with foot. */
export const TULIP: GlassStyle = {
  profile: [...Array(6).fill(20), ...Array(4).fill(21), ...Array(48).fill(22), 22, 21, 21, 20, 19, 17, 15, 12],
  normal: { rl: '#FFF6E2', rb: '#D8C7A6', rd: '#8C7A60' },
  locked: { rl: '#A8966F', rb: '#7A6A50', rd: '#4E4232' },
  selected: { rl: '#FFC27A', rb: '#F28C28', rd: '#B05408' },
  interior: { fill: '#1A0F08', left: '#24160D', right: '#120A05' },
  shadowAt: 76,
  base(cv, cx, sy0, { rl, rb, rd }) {
    cv.vline(cx - 1, sy0, 7, rl);
    cv.vline(cx, sy0, 7, rb);
    cv.vline(cx + 1, sy0, 7, rd);
    cv.hline(cx - 2, sy0, 5, rb);
    cv.hline(cx - 8, sy0 + 7, 17, rb);
    cv.hline(cx - 7, sy0 + 7, 7, rl);
    cv.hline(cx - 7, sy0 + 8, 15, rd);
    cv.hline(cx - 6, sy0 + 9, 13, mix(rd, '#000000', 0.3));
  },
};
