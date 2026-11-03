import type { Theme } from './types.js';

const HEX = /^#[0-9a-f]{6}$/i;
const REQUIRED_COLORS = [
  'ground',
  'surface',
  'surfaceAlt',
  'line',
  'text',
  'muted',
  'accent',
  'accentText',
  'starDone',
  'starEmpty',
  'hard',
  'glassFill',
  'glassRim',
  'selected',
  'hint',
  'reject',
  'counterTop',
  'counterFront',
  'boosterFace',
  'boosterRim',
] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Checks the shape of a theme file. Returns a list of problems, empty when valid. */
export function validateTheme(data: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(data)) return ['Theme must be an object'];
  for (const key of ['id', 'name', 'setting'] as const) if (!isStr(data[key])) errors.push(`Missing ${key}`);
  if (typeof data.order !== 'number') errors.push('Missing order');
  const levels = data.levels;
  if (!Array.isArray(levels) || levels.length !== 2 || !levels.every((n) => Number.isInteger(n)))
    errors.push('levels must be [first, last]');
  if (!isObj(data.fonts) || !isStr(data.fonts.ui) || !isStr(data.fonts.display))
    errors.push('fonts need ui and display');
  if (!isObj(data.colors)) errors.push('Missing colors');
  else {
    for (const key of REQUIRED_COLORS) if (!isStr(data.colors[key])) errors.push(`Missing colour ${key}`);
    for (const [key, value] of Object.entries(data.colors))
      if (!isStr(value) || !HEX.test(value)) errors.push(`Colour ${key} must be #rrggbb`);
  }
  if (!isObj(data.glass) || !isStr(data.glass.shape)) errors.push('glass needs a shape');
  else if (!Array.isArray(data.glass.radius) || data.glass.radius.length !== 4)
    errors.push('glass.radius needs 4 numbers');
  if (!Array.isArray(data.drinks) || data.drinks.length === 0) errors.push('drinks must be a non-empty list');
  else {
    const ids = new Set<string>();
    data.drinks.forEach((d: unknown, i) => {
      if (!isObj(d) || !isStr(d.id) || !isStr(d.name) || !isStr(d.color) || !HEX.test(d.color)) {
        errors.push(`Drink ${i} needs id, name and a #rrggbb color`);
        return;
      }
      if (ids.has(d.id)) errors.push(`Duplicate drink ${d.id}`);
      ids.add(d.id);
      if (d.foam !== undefined && (!isStr(d.foam) || !HEX.test(d.foam)))
        errors.push(`Drink ${d.id} foam must be #rrggbb`);
    });
  }
  if (!isObj(data.blockers) || !['hidden', 'only', 'locked'].every((k) => isStr((data.blockers as Obj)[k])))
    errors.push('blockers need hidden, only and locked skins');
  if (!Array.isArray(data.bars) || !data.bars.every(isStr)) errors.push('bars must be a list of names');
  if (!Array.isArray(data.design)) errors.push('design must be a list');
  return errors;
}

/** Validates and returns a typed theme, or throws with every problem listed. */
export function parseTheme(data: unknown): Theme {
  const errors = validateTheme(data);
  if (errors.length > 0) throw new Error(`Invalid theme: ${errors.join('; ')}`);
  return data as Theme;
}
