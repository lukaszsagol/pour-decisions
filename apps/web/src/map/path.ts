/** Geometry of a city map: a winding path running up the screen, level 1 at the bottom. */

export const MAP_SPACING = 112;
/** Space above the last level (skyline, header). */
export const MAP_TOP = 250;
/** Space below the first level (bottom panel). */
export const MAP_BOTTOM = 330;
const AMPLITUDE = 64;
const WAVELENGTH = 470;

export interface MapLayout {
  height: number;
  /** Centre of each level node, in world px, index 0 = first level of the city. */
  nodes: { x: number; y: number }[];
  /** y of the landmark between bar b and b+1 (index b-1). */
  gates: number[];
}

/** x of the path centre at world height y. */
export function pathX(y: number, height: number): number {
  return 195 + AMPLITUDE * Math.sin(((height - y) / WAVELENGTH) * Math.PI * 2 + 0.3);
}

export function mapLayout(levels: number, perBar = 20): MapLayout {
  const height = MAP_TOP + MAP_BOTTOM + (levels - 1) * MAP_SPACING;
  const yOf = (i: number) => height - MAP_BOTTOM - i * MAP_SPACING;
  const nodes = Array.from({ length: levels }, (_, i) => ({ x: pathX(yOf(i), height), y: yOf(i) }));
  const gates: number[] = [];
  for (let b = perBar; b < levels; b += perBar) gates.push(yOf(b - 1) - MAP_SPACING / 2);
  return { height, nodes, gates };
}

/** Scroll position that puts world y in the middle of the visible map (between header and panel). */
export function scrollFor(y: number, viewport: number, height: number, panel = 196): number {
  const visibleMiddle = 80 + (viewport - 80 - panel) / 2;
  return Math.max(0, Math.min(height - viewport, y - visibleMiddle));
}
