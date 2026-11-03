/** Where glasses go on the 195×422 art grid. Positions are whole art pixels. */

export interface ArtSlot {
  /** Left of the glass slot (26 px wide) and its rim row. */
  x: number;
  y: number;
}

export interface ArtLayout {
  slots: ArtSlot[];
  /** Interior width of every glass (22 in the reference, narrower when 7 share a row). */
  interior: number;
  /** Distance between slot lefts on a row, for tap targets. */
  spacing: number;
}

/** Rim rows from the reference: two rows of glasses. A single row sits between them. */
export const ROW_Y = [117, 228] as const;
export const SINGLE_ROW_Y = 172;
export const SLOT_W = 26;
/** From rim to the bottom of the foot shadow. */
export const GLASS_H = 81;

/** Glasses per row, row spacing and interior width for n glasses. */
export function rowPlan(n: number): { perRow: number; spacing: number; interior: number } {
  if (n <= 8) return { perRow: 4, spacing: 39, interior: 22 };
  if (n <= 10) return { perRow: 5, spacing: 36, interior: 22 };
  if (n <= 12) return { perRow: 6, spacing: 31, interior: 22 };
  return { perRow: 7, spacing: 27, interior: 18 };
}

/**
 * Two rows (the first one fuller), each centred; matches the reference
 * positions for seven glasses: 26, 65, 104, 143 and 46, 85, 124.
 */
export function artLayout(n: number, width = 195): ArtLayout {
  const plan = rowPlan(n);
  const rows = n <= plan.perRow ? [n] : [Math.ceil(n / 2) > plan.perRow ? plan.perRow : Math.ceil(n / 2), 0];
  if (rows.length === 2) rows[1] = n - rows[0]!;
  const slots: ArtSlot[] = [];
  rows.forEach((count, r) => {
    const total = (count - 1) * plan.spacing + SLOT_W;
    const left = Math.round((width - total) / 2 + 1e-9);
    const y = rows.length === 1 ? SINGLE_ROW_Y : ROW_Y[r]!;
    for (let i = 0; i < count; i++) slots.push({ x: left + i * plan.spacing, y });
  });
  return { slots, interior: plan.interior, spacing: plan.spacing };
}
