import { recipesFor, themes, type Recipe, type Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc } from '../icons.js';
import { packsInCity } from '../levels.js';
import { recipeImage } from '../pixel/recipe-art.js';
import { recipeCard } from '../recipe-card.js';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';

/** Where long words in drink names may break across lines on the narrow tiles. */
const BREAKS: Record<string, string> = { Bessenjenever: 'Bessen\u00ADjenever', Cosmopolitan: 'Cosmo\u00ADpolitan' };
const breakable = (name: string) => name.replace(/[A-Za-z]{11,}/g, (w) => BREAKS[w] ?? w);

/** One bar's recipe and how the player has done there. */
interface Entry {
  theme: Theme;
  recipe: Recipe;
  barName: string;
  levels: [number, number];
  unlocked: boolean;
}

/**
 * Cocktail book: every recipe in the game, the ones not yet earned as silhouettes (so players
 * see what there is to collect), and the player's achievements at the top.
 */
export class BookScreen {
  readonly el = document.createElement('div');
  private entries: Entry[] = [];

  constructor(
    private readonly stage: Stage,
    private readonly theme: Theme,
    private readonly progress: Progress,
    private readonly tabs: Record<Tab, string>,
  ) {
    this.el.className = 'screen book-screen';
  }

  async mount(): Promise<void> {
    applyTheme(this.stage.el, this.theme);
    this.stage.el.replaceChildren(this.el);
    this.entries = themes.flatMap((theme) =>
      packsInCity(theme.id).flatMap((pack) => {
        const recipe = recipesFor(theme.id).find((r) => r.bar === pack.bar);
        if (!recipe) return [];
        const numbers = pack.levels.map((l) => l.number);
        const levels: [number, number] = [Math.min(...numbers), Math.max(...numbers)];
        return [{ theme, recipe, barName: pack.name, levels, unlocked: !!this.progress.level(levels[1]) }];
      }),
    );
    this.el.innerHTML = `<div class="bk-body">${this.html()}</div>${tabBar('book', this.tabs)}`;
    this.el
      .querySelectorAll<HTMLButtonElement>('.bk-drink')
      .forEach((b) => b.addEventListener('click', () => this.open(this.entries[Number(b.dataset.i)]!)));
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.el.remove();
  }

  private html(): string {
    const p = this.progress;
    const k = this.theme.colors;
    const got = this.entries.filter((e) => e.unlocked).length;
    const stamped = themes.filter((t) => p.level(t.levels[1])).length;
    const nights = Object.keys(p.data.daily).length;
    const stat = (value: string | number, label: string) =>
      `<div class="bk-stat"><b>${esc(String(value))}</b><span>${esc(label)}</span></div>`;
    return `
      <div class="pp-title">
        <h1>Cocktail book</h1>
        <p>Finish a bar to add its drink to your book.</p>
      </div>
      <section class="bk-stats" aria-label="Your achievements">
        ${stat(`${got}/${this.entries.length}`, 'Recipes')}
        ${stat(p.totalStars(), 'Stars')}
        ${stat(p.perfectCount(), 'Perfect pours')}
        ${stat(`${stamped}/${themes.length}`, 'Cities stamped')}
        ${stat(p.data.streak, 'Win streak')}
        ${stat(nights, nights === 1 ? 'Night poured' : 'Nights poured')}
      </section>
      ${themes.map((t) => this.city(t, k.muted)).join('')}`;
  }

  private city(t: Theme, muted: string): string {
    const pp = t.passport!;
    const list = this.entries.map((e, i) => [e, i] as const).filter(([e]) => e.theme.id === t.id);
    const got = list.filter(([e]) => e.unlocked).length;
    return `
      <section class="bk-city" style="--bk-face:${pp.card};--px-edge:${pp.cardBorder}" aria-labelledby="bk-${t.id}">
        <div class="bk-city-top">
          <h2 id="bk-${t.id}" style="font-family:'${t.fonts.display}', serif;color:${pp.title}">${esc(t.name)}</h2>
          <span style="color:${pp.sub}">${got} of ${list.length}</span>
        </div>
        <div class="bk-drinks">${list.map(([e, i]) => this.drink(e, i, muted)).join('')}</div>
      </section>`;
  }

  private drink(e: Entry, i: number, muted: string): string {
    const pp = e.theme.passport!;
    if (!e.unlocked)
      return `
        <button class="bk-drink is-locked" data-i="${i}" aria-label="Locked recipe: finish ${esc(e.barName)} in ${esc(e.theme.name)}">
          <img class="px-img" alt="" src="${recipeImage(e.theme.id, e.recipe)}" width="35" height="75">
          <span class="bk-name" style="color:${muted}">?</span>
        </button>`;
    const stars = this.progress.totalStars(e.levels[0], e.levels[1]);
    return `
      <button class="bk-drink" data-i="${i}" aria-label="${esc(e.recipe.name)}, ${stars} stars">
        <img class="px-img" alt="" src="${recipeImage(e.theme.id, e.recipe)}" width="35" height="75">
        <span class="bk-name" style="color:${pp.title}">${esc(breakable(e.recipe.name))}</span>
        <span class="bk-stars" style="color:${pp.sub}">★${stars}</span>
      </button>`;
  }

  /** The full recipe card, or for a locked one, its silhouette and where to earn it. */
  private open(e: Entry): void {
    const list = this.entries.filter((x) => x.theme.id === e.theme.id);
    const index = list.indexOf(e) + 1;
    const sheet = document.createElement('div');
    sheet.className = 'sheet-backdrop bk-sheet';
    const body = e.unlocked
      ? recipeCard(e.theme, e.recipe, index, list.length, 'Recipe card')
      : `<article class="cp-recipe bk-locked-card" aria-label="Locked recipe">
          <div class="cp-recipe-top"><span class="cp-pill">Not yet earned</span><span class="cp-count">${esc(e.theme.name)} · ${index} of ${list.length}</span></div>
          <div class="cp-recipe-body">
            <div class="cp-recipe-text">
              <h2 class="cp-recipe-name">A mystery drink</h2>
              <p class="bk-hint">Finish <b>${esc(e.barName)}</b>, ${esc(e.theme.passport!.barWord)} ${index} in ${esc(e.theme.name)}, to add its recipe to your book.</p>
            </div>
            <div class="cp-recipe-glass"><img class="px-img" alt="" src="${recipeImage(e.theme.id, e.recipe)}" width="70" height="150"></div>
          </div>
        </article>`;
    sheet.innerHTML = `
      <div class="bk-sheet-inner" role="dialog" aria-modal="true" aria-label="${e.unlocked ? esc(e.recipe.name) : 'Locked recipe'}">
        ${body}
        <button class="btn btn-primary bk-close">Close</button>
      </div>`;
    this.el.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.addEventListener('click', (ev) => ev.target === sheet && close());
    sheet.querySelector('.bk-close')!.addEventListener('click', close);
    sheet.querySelector<HTMLElement>('.bk-close')!.focus();
  }
}
