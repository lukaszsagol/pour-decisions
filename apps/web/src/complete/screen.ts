import type { Difficulty } from '@pour/engine';
import type { Recipe, Theme } from '@pour/themes';
import { recipeCard } from '../recipe-card.js';
import type { Rewards } from '../economy/rewards.js';
import { esc, icons } from '../icons.js';
import { cityBand } from '../pixel/scenes.js';
import { PixelLayer } from '../pixel/layer.js';
import type { LevelResult } from '../level/screen.js';
import { createPixi } from '../pixi-util.js';
import { ART, type Stage } from '../stage.js';
import { applyTheme } from '../theme-css.js';
import { isOn } from '../flags.js';

export interface CompleteData {
  theme: Theme;
  result: LevelResult;
  difficulty: Difficulty;
  /** Hidden for modes that pay nothing (training). */
  rewards?: Rewards;
  /** Shown when this win finished a bar. */
  recipe?: { recipe: Recipe; index: number; total: number };
  nextHref: string;
  nextLabel: string;
  /** Family comparison row (family feature): resolves to HTML or null. */
  family?: Promise<string | null>;
  /** Overrides for the daily pour and training. */
  kicker?: string;
  verdict?: string;
  subline?: string;
  share?: string;
}

/** Labels for an earned booster: [from a streak, from the daily pour]. */
const boosterNames = {
  undo: ['Streak undo', 'Daily undo'],
  extraGlass: ['Streak glass', 'Daily glass'],
  hint: ['Streak hint', 'Daily hint'],
} as const;

/** Text copied by Share: "Pour Decisions · Level 64 · ★★★ 14 pours (par 13)". */
export function shareText(r: LevelResult): string {
  const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  return `Pour Decisions · Level ${r.number} · ${stars} ${r.moves} pours (par ${r.best})`;
}

export function verdictFor(r: LevelResult): string {
  if (r.perfect) return 'Perfect pour';
  if (r.moves < r.best) return 'You beat the computer';
  return r.stars === 3 ? 'Great pour' : r.stars === 2 ? 'Nice pour' : 'Cleared';
}

/** Level complete: stars, verdict, rewards, the recipe card after a bar, Next and Share. */
export class CompleteScreen {
  readonly el = document.createElement('div');
  private offResize: (() => void) | null = null;
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
    const { app, dispose } = await createPixi(this.stage, 64, 'xt');
    if (this.destroyed) return dispose();
    this.disposePixi = dispose;
    // The city's band of tiles, curtains or frieze, cut from its level art,
    // running on to the screen's edges.
    let band: PixelLayer | null = null;
    const fit = () => {
      const art = cityBand(theme, this.stage.bleed);
      band?.destroy();
      band = new PixelLayer(art.w, art.h);
      band.put(art);
      band.sprite.scale.set(ART);
      band.sprite.position.set(-ART * art.ox, -ART * art.oy);
      app.stage.addChild(band.sprite);
    };
    fit();
    this.offResize = this.stage.onResize(fit);
    this.el.prepend(app.canvas);
    void this.data.family?.then(
      (html) =>
        html &&
        this.el.querySelector('.cp-rewards')?.insertAdjacentHTML('afterend', `<div class="cp-family">${html}</div>`),
    );
    this.el.querySelector('.cp-share')?.addEventListener('click', () => void this.share());
    this.el.querySelector<HTMLElement>('.cp-next')!.focus();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.destroyed = true;
    this.offResize?.();
    this.disposePixi?.();
    this.el.remove();
  }

  private async share(): Promise<void> {
    const text = this.data.share ?? shareText(this.data.result);
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
      ? `${r.moves} pours · right on par`
      : r.moves < r.best
        ? `${r.moves} pours · ${r.best - r.moves} under par`
        : `${r.moves} pours · ${r.moves - r.best} over par (${r.best})`;
    const earned = rewards?.earned ?? [];
    const third =
      earned.length === 0
        ? null
        : earned.some((e) => e.reason === 'bar')
          ? { icon: this.boosterIcon('extraGlass'), value: `+${earned.length}`, label: 'Bar boosters' }
          : {
              icon: this.boosterIcon(earned[0]!.kind),
              value: '+1',
              label: boosterNames[earned[0]!.kind][earned[0]!.reason === 'daily' ? 1 : 0],
            };
    const card = (icon: string, value: string, label: string) =>
      `<div class="cp-card"><div class="cp-card-value">${icon}<span>${esc(value)}</span></div><div class="cp-card-label">${esc(label)}</div></div>`;
    return `
      <div class="cp-head">
        <div class="cp-kicker">${esc(this.data.kicker ?? `Level ${r.number} cleared`)}</div>
        <div class="cp-stars" role="img" aria-label="${r.stars} of 3 stars"><span>${star(1)}</span><span>${star(2)}</span><span>${star(3)}</span></div>
        <h1 class="cp-verdict">${esc(this.data.verdict ?? verdictFor(r))}</h1>
        <div class="cp-sub">${esc(this.data.subline ?? sub)}</div>
      </div>
      ${
        rewards
          ? `<div class="cp-rewards">
        ${card(icons.star(k.starDone, 18), `+${rewards.stars}`, 'Stars')}
        ${card(icons.star(k.accent, 18), String(rewards.streak), 'Win streak')}
        ${third ? card(third.icon, third.value, third.label) : ''}
      </div>`
          : ''
      }
      ${recipe ? recipeCard(theme, recipe.recipe, recipe.index, recipe.total, 'New recipe card') : ''}
      <div class="cp-actions">
        ${isOn('share') ? `<button class="cp-share" aria-label="Share result">${icons.share(k.text)}</button>` : ''}
        <a class="btn btn-primary cp-next" href="${esc(this.data.nextHref)}">${esc(this.data.nextLabel)}</a>
      </div>
      <div class="toast" role="status" hidden></div>`;
  }

  private boosterIcon(kind: keyof typeof boosterNames): string {
    const c = this.data.theme.colors.hint;
    const svg = kind === 'undo' ? icons.undo(c) : kind === 'extraGlass' ? icons.glass(c) : icons.hint(c);
    return svg.replace('width="26" height="26"', 'width="18" height="18"');
  }
}
