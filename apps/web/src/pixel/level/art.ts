import type { Theme } from '@pour/themes';
import type { PixelCanvas } from '../canvas.js';
import {
  amsterdamBackdrop,
  amsterdamBleed,
  amsterdamMats,
  chainsAndPadlock,
  kruikTag,
  MATS,
  RESTART,
  SIGN,
  stonewareCover,
} from './amsterdam.js';
import { TULIP, type GlassStyle, type Row } from './glass.js';
import { londonArt } from './london.js';
import { newYorkArt } from './newyork.js';
import { tokyoArt } from './tokyo.js';

/** Everything a city draws on its level screen. All coordinates are art pixels. */
export interface CityLevelArt {
  /** Static backdrop (no glasses, no boosters). Two phases for the light flicker. */
  backdrop(phase: number): PixelCanvas;
  /**
   * The margins on screens wider or taller than the stage, painted on a canvas
   * whose origin is the stage's: the backdrop's materials continued, without props.
   */
  bleed(cv: PixelCanvas, phase: number): void;
  /** Booster mats with their counts. */
  boosters(cv: PixelCanvas, counts: [number, number, number], usable: [boolean, boolean, boolean]): void;
  glass: GlassStyle;
  /** Picture over a locked glass (the badge is drawn separately). */
  locked(cv: PixelCanvas, x0: number, y0: number): void;
  /** Cover for hidden units. */
  hidden(cv: PixelCanvas, rows: Row[]): void;
  /** Picture on an only-glass. */
  only(cv: PixelCanvas, x0: number, y0: number, drinkColor: string): void;
  /** Where the header sign, restart button and booster mats sit. */
  sign: { x: number; y: number; w: number; h: number };
  restart: { x: number; y: number };
  mats: { centres: readonly number[]; y: number };
  /** Text colours for the HTML overlays. */
  text: { title: string; sub: string };
}

export const amsterdamArt: CityLevelArt = {
  backdrop: (phase) => amsterdamBackdrop(phase),
  bleed: amsterdamBleed,
  boosters: amsterdamMats,
  glass: TULIP,
  locked: chainsAndPadlock,
  hidden: stonewareCover,
  only: kruikTag,
  sign: SIGN,
  restart: RESTART,
  mats: MATS,
  text: { title: '#F3E6CC', sub: '#D8C3A0' },
};

const byCity: Record<string, CityLevelArt> = {
  amsterdam: amsterdamArt,
  london: londonArt,
  newyork: newYorkArt,
  tokyo: tokyoArt,
};

/** Registers a city's art (London, New York and Tokyo add theirs). */
export function registerCityArt(city: string, art: CityLevelArt): void {
  byCity[city] = art;
}

/** The art for a theme's city (Amsterdam's for any city without its own). */
export function cityArt(theme: Theme): CityLevelArt {
  return byCity[theme.id] ?? amsterdamArt;
}
