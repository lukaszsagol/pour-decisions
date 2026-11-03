import type { Difficulty } from '@pour/engine';
import type { Recipe, Theme } from '@pour/themes';
import { Graphics } from 'pixi.js';
import type { Rewards } from '../economy/rewards.js';
import { esc, icons } from '../icons.js';
import { drawLevelDecor } from '../level/decor.js';
import type { LevelResult } from '../level/screen.js';
import { createPixi } from '../pixi-util.js';
import { STAGE_W, type Stage } from '../stage.js';
import { applyTheme } from '../theme-css.js';

export interface CompleteData {
  theme: Theme;
  result: LevelResult;
  difficulty: Difficulty;
  rewards: Rewards;
  /** Shown when this win finished a bar. */
  recipe?: { recipe: Recipe; index: number; total: number };
  nextHref: string;
  nextLabel: string;
}

const boosterNames = { undo: 'Streak undo', extraGlass: 'Streak glass', hint: 'Streak hint' } as const;

/** Text copied by Share: "Pour Decisions · Level 64 · ★★★ 14 moves (best 13)". */
export function shareText(r: LevelResult): string {
  const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  return `Pour Decisions · Level ${r.number} · ${stars} ${r.moves} moves (best ${r.best})`;
}

export function verdictFor(r: LevelResult): string {
  if (r.perfect) return 'Perfect pour';
  if (r.moves < r.best) return 'You beat the computer';
  return r.stars === 3 ? 'Great pour' : r.stars === 2 ? 'Nice pour' : 'Cleared';
}

function recipeGlass(recipe: Recipe): string {
  const c = recipe.color;
  const ink = '#1B1A2E';
  switch (recipe.glass) {
    case 'tulip':
      return `<svg width="70" height="150" viewBox="0 0 70 150" aria-hidden="true"><path d="M15 20 Q11 70 22 92 Q35 104 48 92 Q59 70 55 20Z" fill="${c}" opacity=".9"/><path d="M15 20 Q11 70 22 92 Q35 104 48 92 Q59 70 55 20" fill="none" stroke="${ink}" stroke-width="2.5"/><path d="M35 100v30M22 132h26" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    case 'coupe':
      return `<svg width="70" height="150" viewBox="0 0 70 150" aria-hidden="true"><path d="M8 40 Q35 78 62 40Z" fill="${c}" opacity=".9"/><path d="M6 36 Q35 84 64 36" fill="none" stroke="${ink}" stroke-width="2.5"/><path d="M35 62v58M20 122h30" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    case 'rocks':
      return `<svg width="70" height="150" viewBox="0 0 70 150" aria-hidden="true"><rect x="10" y="72" width="50" height="58" rx="6" fill="${c}" opacity=".9"/><rect x="20" y="80" width="22" height="22" rx="4" fill="#fff" opacity=".6"/><path d="M8 58v68a8 8 0 0 0 8 8h38a8 8 0 0 0 8-8V58" fill="none" stroke="${ink}" stroke-width="2.5"/></svg>`;
    default:
      return `<svg width="70" height="150" viewBox="0 0 70 150" aria-hidden="true"><rect x="40" y="2" width="26" height="9" rx="5" fill="#F5D547" transform="rotate(-24 53 6)"/><rect x="8" y="44" width="54" height="102" rx="8" fill="${c}" opacity=".9"/><rect x="14" y="52" width="22" height="22" rx="4" fill="#fff" opacity=".6"/><rect x="30" y="76" width="22" height="22" rx="4" fill="#fff" opacity=".55"/><path d="M6 12v126a8 8 0 0 0 8 8h42a8 8 0 0 0 8-8V12" fill="none" stroke="${ink}" stroke-width="2.5"/></svg>`;
  }
}

/** Level complete: stars, verdict, rewards, the recipe card after a bar, Next and Share. */
export class CompleteScreen {
  readonly el = document.createElement('div');
  private disposePixi: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly stage: Stage,
    private readonly data: CompleteData,
  ) {
    this.el.className = 'screen complete-screen';
  }

  async mount(): Promise<void> {
    const { theme } = this.data;
    applyTheme(this.stage.el, theme);
    this.stage.el.replaceChildren(this.el);
    this.el.innerHTML = this.html();
    const { app, dispose } = await createPixi(this.stage, 64);
    if (this.destroyed) return dispose();
    this.disposePixi = dispose;
    // The city's top band, cut from the level backdrop.
    const decor = drawLevelDecor(theme);
    const mask = new Graphics().rect(0, 0, STAGE_W, 58).fill({ color: '#FFFFFF' });
    decor.mask = mask;
    app.stage.addChild(decor, mask);
    this.el.prepend(app.canvas);
    this.el.querySelector('.cp-share')!.addEventListener('click', () => void this.share());
    this.el.querySelector<HTMLElement>('.cp-next')!.focus();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.destroyed = true;
    this.disposePixi?.();
    this.el.remove();
  }

  private async share(): Promise<void> {
    const text = shareText(this.data.result);
    const toast = this.el.querySelector<HTMLElement>('.toast')!;
    try {
      await navigator.clipboard.writeText(text);
      toast.textContent = 'Result copied';
    } catch {
      toast.textContent = text;
    }
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 2400);
  }

  private html(): string {
    const { theme, result: r, rewards, recipe } = this.data;
    const k = theme.colors;
    const star = (i: number) => icons.star(i <= r.stars ? k.starDone : k.starEmpty, 58);
    const sub = r.perfect
      ? `${r.moves} moves · matched the best solution`
      : r.moves < r.best
        ? `${r.moves} moves · ${r.best - r.moves} fewer than the computer`
        : `${r.moves} moves · best ${r.best}`;
    const third = rewards.streakBooster
      ? { icon: this.boosterIcon(rewards.streakBooster), value: '+1', label: boosterNames[rewards.streakBooster] }
      : { icon: icons.star(k.accent, 18), value: String(rewards.streak), label: 'Win streak' };
    const card = (icon: string, value: string, label: string) =>
      `<div class="cp-card"><div class="cp-card-value">${icon}<span>${esc(value)}</span></div><div class="cp-card-label">${esc(label)}</div></div>`;
    return `
      <div class="cp-head">
        <div class="cp-kicker">Level ${r.number} cleared</div>
        <div class="cp-stars" role="img" aria-label="${r.stars} of 3 stars"><span>${star(1)}</span><span>${star(2)}</span><span>${star(3)}</span></div>
        <h1 class="cp-verdict">${esc(verdictFor(r))}</h1>
        <div class="cp-sub">${esc(sub)}</div>
      </div>
      <div class="cp-rewards">
        ${card(icons.coin(k.starDone).replace('width="22" height="22"', 'width="18" height="18"'), `+${rewards.coins}`, 'Coins')}
        ${card(icons.star(k.starDone, 18), `+${rewards.stars}`, 'Stars')}
        ${card(third.icon, third.value, third.label)}
      </div>
      ${recipe ? this.recipeHtml(recipe.recipe, recipe.index, recipe.total) : ''}
      <div class="cp-actions">
        <button class="cp-share" aria-label="Share result">${icons.share(k.text)}</button>
        <a class="btn btn-primary cp-next" href="${esc(this.data.nextHref)}">${esc(this.data.nextLabel)}</a>
      </div>
      <div class="toast" role="status" hidden></div>`;
  }

  private boosterIcon(kind: keyof typeof boosterNames): string {
    const c = this.data.theme.colors.hint;
    const svg = kind === 'undo' ? icons.undo(c) : kind === 'extraGlass' ? icons.glass(c) : icons.hint(c);
    return svg.replace('width="26" height="26"', 'width="18" height="18"');
  }

  private recipeHtml(recipe: Recipe, index: number, total: number): string {
    const ingredients = recipe.ingredients
      .map(([amount, item]) => `<li><span class="cp-amount">${esc(amount)}</span><span>${esc(item)}</span></li>`)
      .join('');
    return `
      <article class="cp-recipe" aria-label="New recipe card: ${esc(recipe.name)}">
        <div class="cp-recipe-top"><span class="cp-pill">New recipe card</span><span class="cp-count">${esc(this.data.theme.name)} · ${index} of ${total}</span></div>
        <div class="cp-recipe-body">
          <div class="cp-recipe-text">
            <h2 class="cp-recipe-name">${esc(recipe.name)}</h2>
            ${recipe.local && recipe.local !== recipe.name ? `<div class="cp-recipe-local">${esc(recipe.local)}</div>` : ''}
            <ul class="cp-ingredients">${ingredients}</ul>
          </div>
          <div class="cp-recipe-glass">${recipeGlass(recipe)}</div>
        </div>
        <p class="cp-method">${esc(recipe.method)}</p>
      </article>`;
  }
}
