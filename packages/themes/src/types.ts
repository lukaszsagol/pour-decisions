/** A city's look and content, loaded from `themes/<city>.json`. */

export type CityId = 'amsterdam' | 'london' | 'newyork' | 'tokyo';

export interface Drink {
  id: string;
  name: string;
  color: string;
  /** Optional head colour drawn on the top unit (stout). */
  foam?: string;
}

export type BlockerKind = 'hidden' | 'only' | 'locked' | 'frozen';

export interface ThemeColors {
  ground: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  starDone: string;
  starEmpty: string;
  hard: string;
  glassFill: string;
  glassRim: string;
  selected: string;
  hint: string;
  reject: string;
  counterTop: string;
  counterFront: string;
  boosterFace: string;
  boosterRim: string;
  /** City-specific extras (tile, canal, wall, fascia…). */
  [extra: string]: string;
}

export interface Theme {
  id: CityId;
  name: string;
  setting: string;
  order: number;
  /** First and last global level number in this city. */
  levels: [number, number];
  fonts: { ui: string; display: string; extra?: string[] };
  colors: ThemeColors;
  glass: { shape: string; radius: [number, number, number, number] };
  drinks: Drink[];
  blockers: Partial<Record<BlockerKind, string>> & { hidden: string; only: string; locked: string };
  bars: string[];
  design: string[];
  /** Booster button style on the counter. */
  booster?: { shape: 'round' | 'card'; border: number };
}
