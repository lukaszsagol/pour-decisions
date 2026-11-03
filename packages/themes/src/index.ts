import amsterdamJson from '../../../themes/amsterdam.json' with { type: 'json' };
import londonJson from '../../../themes/london.json' with { type: 'json' };
import newyorkJson from '../../../themes/newyork.json' with { type: 'json' };
import tokyoJson from '../../../themes/tokyo.json' with { type: 'json' };
import type { CityId, Drink, Theme } from './types.js';
import { parseTheme } from './validate.js';

export * from './types.js';
export * from './validate.js';
export * from './color.js';

/** All cities in play order. */
export const themes: readonly Theme[] = [amsterdamJson, londonJson, newyorkJson, tokyoJson]
  .map(parseTheme)
  .sort((a, b) => a.order - b.order);

export const cityIds: readonly CityId[] = themes.map((t) => t.id);

export function getTheme(id: CityId): Theme {
  const t = themes.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown city ${id}`);
  return t;
}

/** The city a global level number belongs to. */
export function themeForLevel(number: number): Theme {
  const t = themes.find((x) => number >= x.levels[0] && number <= x.levels[1]);
  if (!t) throw new Error(`No city has level ${number}`);
  return t;
}

export function drinkById(theme: Theme, id: string): Drink {
  const d = theme.drinks.find((x) => x.id === id);
  if (!d) throw new Error(`${theme.name} has no drink ${id}`);
  return d;
}

/** The first n drinks, used by levels with n colours. */
export function drinksFor(theme: Theme, n: number): Drink[] {
  if (n > theme.drinks.length) throw new Error(`${theme.name} has only ${theme.drinks.length} drinks`);
  return theme.drinks.slice(0, n);
}
