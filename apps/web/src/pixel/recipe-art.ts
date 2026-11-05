import type { CityId, Recipe } from '@pour/themes';
import { dataUrl, recipeGlass } from './scenes.js';

/**
 * Drawn recipe drinks: `recipes/<city>-<bar>.png`, 35×75 art pixels with a
 * transparent background, bundled so they work offline. Generated with Retro
 * Diffusion (prompts in docs/design/asset-prompts.md, raw options in
 * docs/design/generated/recipes/) and trimmed by scripts/sprite-art.mjs.
 */
const art = import.meta.glob<string>('./recipes/*.png', { eager: true, query: '?url', import: 'default' });

/** The picture for a recipe card: the drawing when there is one, the code-drawn glass otherwise. */
export function recipeImage(city: CityId, recipe: Recipe): string {
  return art[`./recipes/${city}-${recipe.bar}.png`] ?? dataUrl(recipeGlass(recipe));
}
