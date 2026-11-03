import type { Theme } from '@pour/themes';

/** Size of one glass slot (the tap target) in logical px. */
export const SLOT_W = 60;
export const SLOT_H = 200;

export interface GlassGeometry {
  bodyW: number;
  bodyH: number;
  radius: readonly [number, number, number, number];
  border: number;
  padding: number;
  unitGap: number;
  /** Stem and foot under the body (tulip glass). */
  stem?: { w: number; h: number };
  foot?: { w: number; h: number; r: number };
  /** Stepped Art Deco plinth. */
  plinth?: boolean;
  /** Nonic bulge near the rim (pint glass). */
  nonic?: boolean;
}

/** Glass shapes by `theme.glass.shape`. Unknown shapes fall back to a highball. */
export function glassGeometry(theme: Theme): GlassGeometry {
  const radius = theme.glass.radius;
  switch (theme.glass.shape) {
    case 'tulip-stemmed':
      return { bodyW: 58, bodyH: 162, radius, border: 2, padding: 5, unitGap: 3, stem: { w: 6, h: 10 }, foot: { w: 34, h: 4, r: 2 } };
    case 'nonic-pint':
      return { bodyW: 58, bodyH: 160, radius, border: 2, padding: 5, unitGap: 3, nonic: true };
    case 'deco-tall':
      return { bodyW: 60, bodyH: 156, radius, border: 2, padding: 5, unitGap: 3, plinth: true };
    default:
      return { bodyW: 54, bodyH: 156, radius, border: 2, padding: 5, unitGap: 3 };
  }
}

/** Height of everything under the body (stem, foot, plinth). */
export function baseHeight(g: GlassGeometry): number {
  if (g.stem && g.foot) return g.stem.h + g.foot.h;
  if (g.plinth) return 16;
  return 0;
}

export interface UnitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rectangles for unit slots, bottom to top, relative to the body's top-left. */
export function unitRects(g: GlassGeometry, capacity: number): UnitRect[] {
  const inset = g.border + g.padding;
  const w = g.bodyW - inset * 2;
  const inner = g.bodyH - inset * 2;
  const h = Math.floor((inner - g.unitGap * (capacity - 1)) / capacity);
  const bottom = g.bodyH - inset;
  return Array.from({ length: capacity }, (_, i) => ({ x: inset, y: bottom - (i + 1) * h - i * g.unitGap, w, h }));
}
