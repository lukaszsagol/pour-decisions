import type { Recipe, Theme } from '@pour/themes';
import { esc } from './icons.js';
import { recipeImage } from './pixel/recipe-art.js';

/** A recipe card: name, ingredients, the drawn drink and the method. Used after a bar and in the book. */
export function recipeCard(theme: Theme, recipe: Recipe, index: number, total: number, pill: string): string {
  const ingredients = recipe.ingredients
    .map(([amount, item]) => `<li><span class="cp-amount">${esc(amount)}</span><span>${esc(item)}</span></li>`)
    .join('');
  return `
      <article class="cp-recipe" aria-label="${esc(pill)}: ${esc(recipe.name)}">
        <div class="cp-recipe-top"><span class="cp-pill">${esc(pill)}</span><span class="cp-count">${esc(theme.name)} · ${index} of ${total}</span></div>
        <div class="cp-recipe-body">
          <div class="cp-recipe-text">
            <h2 class="cp-recipe-name">${esc(recipe.name)}</h2>
            ${recipe.local && recipe.local !== recipe.name ? `<div class="cp-recipe-local">${esc(recipe.local)}</div>` : ''}
            <ul class="cp-ingredients">${ingredients}</ul>
          </div>
          <div class="cp-recipe-glass"><img class="px-img" alt="" src="${recipeImage(theme.id, recipe)}" width="70" height="150"></div>
        </div>
        <p class="cp-method">${esc(recipe.method)}</p>
      </article>`;
}
