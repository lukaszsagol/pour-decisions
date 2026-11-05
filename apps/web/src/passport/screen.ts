import { recipesFor, themes, type CityId, type Recipe, type Theme } from '@pour/themes';
import { announceNext } from '../announce.js';
import { FEATURES, isBeginner, isOpen, OPENS_WHEN, type Feature } from '../onboarding.js';
import { recipeImage } from '../pixel/recipe-art.js';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';
import { openSettings } from './settings.js';
import { cityScene, dataUrl } from '../pixel/scenes.js';
import { stampFor } from '../pixel/stamps.js';
import { cardScenes } from '../pixel/card-scenes.js';
import type { PixelCanvas } from '../pixel/canvas.js';

export interface PassportOptions {
  progress: Progress;
  tabs: Record<Tab, string>;
  dailyHref: string;
  /** Short line under "Tonight's pour" (result or invitation). */
  dailyLine: string;
  /** Replaces the daily line once family results arrive. */
  dailyFamily?: Promise<string | null>;
  /** Link to the family screen, when the family feature is on. */
  familyHref?: string;
}

const LEVELS_PER_CITY = 100;
const BARS = 5;

type CityStatus = 'current' | 'done' | 'locked';

/** Home: city cards (current highlighted, finished stamped, later ones locked), tonight's pour, tab bar. */
export class PassportScreen {
  readonly el = document.createElement('div');

  private scenes: Partial<Record<CityId, PixelCanvas>> = {};

  constructor(
    private readonly stage: Stage,
    private readonly opts: PassportOptions,
  ) {
    this.el.className = 'screen passport-screen';
  }

  private status(t: Theme): CityStatus {
    const current = this.opts.progress.data.current;
    const lastDone = this.opts.progress.level(t.levels[1]) !== undefined;
    if (lastDone && current > t.levels[1]) return 'done';
    if (current >= t.levels[0] && current <= t.levels[1]) return 'current';
    return current > t.levels[1] ? 'done' : 'locked';
  }

  currentTheme(): Theme {
    return themes.find((t) => this.status(t) === 'current') ?? themes[themes.length - 1]!;
  }

  async mount(): Promise<void> {
    this.scenes = await cardScenes();
    const theme = this.currentTheme();
    applyTheme(this.stage.el, theme);
    this.stage.el.replaceChildren(this.el);
    this.el.innerHTML = this.html(theme);
    this.el.querySelector('.pp-settings')!.addEventListener('click', () => openSettings(this.el, this.opts.progress));
    announceNext(this.el, this.opts.progress, theme);
    void this.opts.dailyFamily?.then((html) => {
      const line = this.el.querySelector('.pp-daily-line');
      if (html && line) line.innerHTML = html;
    });
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.el.remove();
  }

  private html(current: Theme): string {
    const p = this.opts.progress;
    const k = current.colors;
    const visited = Math.min(20, Math.ceil(p.data.current / 20));
    // Current city first, then finished cities (newest first), then the ones still ahead.
    const order = [
      ...themes.filter((t) => this.status(t) === 'current'),
      ...themes.filter((t) => this.status(t) === 'done').reverse(),
      ...themes.filter((t) => this.status(t) === 'locked'),
    ];
    const beginner = isBeginner(p);
    const stars = p.totalStars();
    const stats = beginner
      ? `Bar 1 of 20 · ${stars ? `${stars} ${stars === 1 ? 'star' : 'stars'} so far` : 'your night starts here'}`
      : `${visited} of 20 bars visited · ${stars} stars · ${p.perfectCount()} perfect`;
    // A beginner sees the city they're in, the stops ahead, what they're collecting and what opens
    // later; finished-city cards, Tonight's pour and Training arrive as they open (onboarding.ts).
    const cards = beginner
      ? `${this.card(order[0]!)}${this.nextStops()}${this.bookTeaser(current)}${this.comingUp()}`
      : `${order.map((t) => this.card(t)).join('')}${this.daily()}${this.training()}`;
    return `
      <header class="pp-header">
        <div class="pp-brand">${icons.glass(k.accent).replace('width="26" height="26"', 'width="30" height="30"')}<span>Pour Decisions</span></div>
        <div class="pp-header-right">
          <button class="icon-btn pp-settings" aria-label="Settings">${icons.gear(k.muted)}</button>
        </div>
      </header>
      <div class="pp-title">
        <div class="pp-title-row"><h1>${beginner ? 'Your night out' : 'Your passport'}</h1></div>
        <p>${stats}</p>
      </div>
      <div class="pp-cards">
        ${cards}
        ${this.opts.familyHref ? `<a class="pp-training" href="${esc(this.opts.familyHref)}">Family <span>Group, daily results, weekly board</span></a>` : ''}
      </div>
      ${tabBar('passport', this.opts.tabs)}`;
  }

  private daily(): string {
    return `
        <a class="pp-daily" href="${esc(this.opts.dailyHref)}">
          <div><div class="pp-daily-title">Tonight's pour</div><div class="pp-daily-line">${esc(this.opts.dailyLine)}</div></div>
          <span class="pp-daily-play">Play</span>
        </a>`;
  }

  private training(): string {
    return `<a class="pp-training" href="#/training">Training <span>Planning, plan ahead, memory</span></a>`;
  }

  /** The cities after this one, as a small strip. */
  private nextStops(): string {
    const ahead = themes.filter((t) => this.status(t) === 'locked');
    if (!ahead.length) return '';
    const stop = (t: Theme) =>
      `<li class="pp-stop" style="--stop:${t.passport!.title}" title="${esc(t.setting)}"><b style="font-family:'${t.fonts.display}', serif">${esc(t.name)}</b></li>`;
    return `
        <section class="pp-next px-panel" aria-labelledby="pp-next-title">
          <h2 class="pp-small" id="pp-next-title">Next stops</h2>
          <ol class="pp-stops">${ahead.map(stop).join('')}</ol>
        </section>`;
  }

  /** The current city's cocktails as silhouettes: what finishing a bar earns. */
  private bookTeaser(t: Theme): string {
    const recipes = recipesFor(t.id);
    if (!recipes.length) return '';
    // A bar's recipe is earned by winning its last level (bars are 20 levels each).
    const earned = (r: Recipe) => !!this.opts.progress.level(t.levels[0] + r.bar * 20 - 1);
    const got = recipes.filter(earned).length;
    const drink = (r: Recipe) =>
      `<img class="px-img${earned(r) ? '' : ' is-locked'}" src="${recipeImage(t.id, r)}" width="35" height="75" alt="">`;
    return `
        <section class="pp-teaser px-panel" aria-labelledby="pp-teaser-title">
          <div class="pp-teaser-top"><h2 class="pp-small" id="pp-teaser-title">Your cocktail book</h2><span>${got} of ${recipes.length}</span></div>
          <div class="pp-teaser-drinks" aria-hidden="true">${recipes.map(drink).join('')}</div>
          <p>Finish a ${esc(t.passport!.barWord)} to earn its cocktail: a real recipe you can make at home.</p>
        </section>`;
  }

  /** What opens later, and when. */
  private comingUp(): string {
    const later = FEATURES.filter((f) => !isOpen(this.opts.progress, f) && f !== 'book');
    if (!later.length) return this.daily();
    const names: Record<Feature, string> = { daily: "Tonight's pour", book: 'Cocktail book', training: 'Training' };
    return `
        ${isOpen(this.opts.progress, 'daily') ? this.daily() : ''}
        <section class="pp-later px-panel" aria-labelledby="pp-later-title">
          <h2 class="pp-small" id="pp-later-title">Opens later</h2>
          <ul>${later.map((f) => `<li>${icons.lock('currentColor')}<span><b>${names[f]}</b> ${OPENS_WHEN[f]}</span></li>`).join('')}</ul>
        </section>`;
  }

  private card(t: Theme): string {
    const status = this.status(t);
    const pp = t.passport!;
    const p = this.opts.progress;
    const stars = p.totalStars(t.levels[0], t.levels[1]);
    const display = `font-family:'${t.fonts.display}', serif`;
    const plural = `${pp.barWord}s`;
    if (status === 'current') {
      const at = p.data.current - t.levels[0] + 1;
      const bar = Math.ceil(at / 20);
      const k = t.colors;
      return `
        <section class="pp-current px-scene" style="--scene:url(${dataUrl(cityScene(t, 175, 78, false, this.scenes[t.id]))});--px-edge:${k.accent};background-color:${pp.card};color:${k.text}" aria-label="Now visiting ${esc(t.name)}">
          <div>
            <div class="pp-kicker" style="color:${k.accent}">Now visiting</div>
            <h2 class="pp-city" style="${display}">${esc(t.name)}</h2>
            <div class="pp-sub" style="color:${k.muted}">${esc(t.setting)} · ${capital(pp.barWord)} ${bar} of ${BARS}</div>
          </div>
          <div class="pp-progress-row">
            <div class="pp-progress">
              <div class="pp-bar" style="background:${k.line}" role="progressbar" aria-valuemin="0" aria-valuemax="${LEVELS_PER_CITY}" aria-valuenow="${at - 1}"><div style="width:${at - 1}%;background:${k.accent}"></div></div>
              <div class="pp-level" style="color:${k.muted}">Level ${p.data.current} · ${at - 1} of ${LEVELS_PER_CITY}</div>
            </div>
            ${
              isBeginner(p)
                ? `<a class="pp-continue" href="#/level/${p.data.current}" style="background:${k.accent};color:${k.accentText}">Play level ${p.data.current}</a>`
                : `<a class="pp-continue" href="#/map/${t.id}" style="background:${k.accent};color:${k.accentText}">Continue</a>`
            }
          </div>
        </section>`;
    }
    const sub =
      status === 'done'
        ? `${esc(t.setting)} · 5 of 5 ${plural}`
        : `${esc(t.setting)} · after ${esc(themes[t.order - 2]?.name ?? '')}`;
    const side =
      status === 'done'
        ? stampFor(t.id)
          ? `<div class="pp-stamp has-art" style="background-image:url(${stampFor(t.id)});color:${pp.stamp}" aria-label="Stamped, ${stars} stars"><b>${pp.code} ★${stars}</b></div>`
          : `<div class="pp-stamp" style="border-color:${pp.stamp};color:${pp.stamp};rotate:${t.order % 2 ? -8 : 8}deg" aria-label="Stamped, ${stars} stars"><b>${pp.code}</b><span>★ ${stars}</span></div>`
        : `<div class="pp-lock" aria-label="Locked">${icons.lock(pp.sub)}</div>`;
    const tag = status === 'done' ? 'a' : 'div';
    const href = status === 'done' ? ` href="#/map/${t.id}"` : '';
    return `
      <${tag}${href} class="pp-city-card px-scene is-${status}" style="--scene:url(${dataUrl(cityScene(t, 175, 44, status === 'locked', this.scenes[t.id]))});--px-edge:${pp.cardBorder};background-color:${pp.card};color:${pp.title}">
        <div>
          <h2 class="pp-city-name" style="${display}">${esc(t.name)}</h2>
          <div class="pp-city-sub" style="color:${pp.sub}">${sub}</div>
        </div>
        ${side}
      </${tag}>`;
  }
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);
