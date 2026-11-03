import { SLOT_H, SLOT_W } from './geometry.js';

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Slot {
  /** Top-left of the slot in stage px. */
  x: number;
  y: number;
  scale: number;
}

/** The glasses area of the level screen, from the design (below the shelf, above the counter). */
export const GLASS_AREA: Area = { x: 25, y: 216, w: 340, h: 418 };
const GAP_X = 20;
const GAP_Y = 18;

/** How many glasses go on each row: rows of up to 4, balanced (7 → 4+3, 5 → 3+2, 9 → 3+3+3). */
export function rowSizes(n: number, perRow = 4): number[] {
  if (n <= 0) return [];
  const rows = Math.ceil(n / perRow);
  const base = Math.floor(n / rows);
  const extra = n % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Positions for n glass slots, centred in the area and scaled down when they don't fit. */
export function layoutGlasses(n: number, area: Area = GLASS_AREA): Slot[] {
  const rows = rowSizes(n);
  const widest = Math.max(0, ...rows);
  const needW = widest * SLOT_W + (widest - 1) * GAP_X;
  const needH = rows.length * SLOT_H + (rows.length - 1) * GAP_Y;
  const scale = Math.min(1, area.w / needW, area.h / needH);
  const top = area.y + (area.h - needH * scale) / 2;
  const slots: Slot[] = [];
  rows.forEach((count, r) => {
    const rowW = (count * SLOT_W + (count - 1) * GAP_X) * scale;
    const left = area.x + (area.w - rowW) / 2;
    for (let i = 0; i < count; i++) {
      slots.push({ x: left + i * (SLOT_W + GAP_X) * scale, y: top + r * (SLOT_H + GAP_Y) * scale, scale });
    }
  });
  return slots;
}
