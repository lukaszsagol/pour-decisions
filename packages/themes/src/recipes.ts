import amsterdam from '../../../themes/recipes/amsterdam.json' with { type: 'json' };
import type { CityId } from './types.js';

/** A real recipe, unlocked by finishing a bar. Comes from `themes/recipes/<city>.json`. */
export interface Recipe {
  bar: number;
  name: string;
  /** Name in the city's language, when it differs. */
  local?: string;
  /** Colour of the finished drink, for the card's glass drawing. */
  color: string;
  glass: 'tulip' | 'rocks' | 'highball' | 'coupe' | 'pint' | 'martini';
  ingredients: [string, string][];
  method: string;
}

export interface RecipeFile {
  city: string;
  recipes: Recipe[];
}

const files: Partial<Record<CityId, RecipeFile>> = { amsterdam: amsterdam as RecipeFile };

/** Adds a city's recipe file (used for cities added after Amsterdam). */
export function addRecipes(city: CityId, file: RecipeFile): void {
  files[city] = file;
}

export function recipesFor(city: CityId): Recipe[] {
  return files[city]?.recipes ?? [];
}

export function recipeFor(city: CityId, bar: number): Recipe | undefined {
  return recipesFor(city).find((r) => r.bar === bar);
}

export function validateRecipes(file: RecipeFile): string[] {
  const errors: string[] = [];
  const bars = new Set<number>();
  for (const r of file.recipes) {
    if (bars.has(r.bar)) errors.push(`Two recipes for bar ${r.bar}`);
    bars.add(r.bar);
    if (!r.name || !r.method) errors.push(`Recipe for bar ${r.bar} needs a name and a method`);
    if (!/^#[0-9a-f]{6}$/i.test(r.color)) errors.push(`Recipe ${r.name} colour must be #rrggbb`);
    if (r.ingredients.length === 0) errors.push(`Recipe ${r.name} has no ingredients`);
  }
  return errors;
}
