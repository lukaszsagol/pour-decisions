import { themes, type Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';
import { openSettings } from './settings.js';
import { cityScene, dataUrl } from '../pixel/scenes.js';
import { installMode, onInstallChange, startInstall } from '../install.js';

export interface PassportOptions {
  progress: Progress;
  tabs: Record<Tab, string>;
  dailyHref: string;
  /** Short line under "Tonight's pour" (result or invitation). */
  dailyLine: string;
  /** Replaces the daily line once family results arrive. */
  dailyFamily?: Promise<string | null>;
}

const LEVELS_PER_CITY = 100;
const BARS = 5;

type CityStatus = 'current' | 'done' | 'locked';

/** Home: city cards (current highlighted, finished stamped, later ones locked), tonight's pour, tab bar. */
export class PassportScreen {
  readonly el = document.createElement('div');

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
    const theme = this.currentTheme();
    applyTheme(this.stage.el, theme);
    this.stage.el.replaceChildren(this.el);
    this.el.innerHTML = this.html(theme);
    this.el.querySelector('.pp-settings')!.addEventListener('click', () => openSettings(this.el, this.opts.progress));
    const install = this.el.querySelector<HTMLButtonElement>('.pp-install')!;
    const showInstall = () => (install.hidden = installMode() === null);
    install.addEventListener('click', () => startInstall(this.el));
    this.offInstall = onInstallChange(showInstall);
    showInstall();
    void this.opts.dailyFamily?.then((html) => {
      const line = this.el.querySelector('.pp-daily-line');
      if (html && line) line.innerHTML = html;
    });
    this.el.dataset.ready = 'true';
  }

  private offInstall: (() => void) | null = null;

  destroy(): void {
    this.offInstall?.();
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
    return `
      <header class="pp-header">
        <div class="pp-brand">${icons.glass(k.accent).replace('width="26" height="26"', 'width="30" height="30"')}<span>Pour Decisions</span></div>
        <div class="pp-header-right">
          <button class="icon-btn pp-settings" aria-label="Settings">${icons.gear(k.muted)}</button>
        </div>
      </header>
      <div class="pp-title">
        <div class="pp-title-row"><h1>Your passport</h1><button class="pp-install" hidden>${icons.download(k.accent)}Install</button></div>
        <p>${visited} of 20 bars visited · ${p.totalStars()} stars</p>
      </div>
      <div class="pp-cards">
        ${order.map((t) => this.card(t)).join('')}
        <a class="pp-daily" href="${esc(this.opts.dailyHref)}">
          <div><div class="pp-daily-title">Tonight's pour</div><div class="pp-daily-line">${esc(this.opts.dailyLine)}</div></div>
          <span class="pp-daily-play">Play</span>
        </a>
        <a class="pp-training" href="#/training">Training <span>Planning, plan ahead, memory</span></a>
      </div>
      ${tabBar('passport', this.opts.tabs)}`;
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
        <section class="pp-current px-scene" style="--scene:url(${dataUrl(cityScene(t, 175, 78))});--px-edge:${k.accent};background-color:${pp.card};color:${k.text}" aria-label="Now visiting ${esc(t.name)}">
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
            <a class="pp-continue" href="#/map/${t.id}" style="background:${k.accent};color:${k.accentText}">Continue</a>
          </div>
        </section>`;
    }
    const sub =
      status === 'done'
        ? `${esc(t.setting)} · 5 of 5 ${plural}`
        : `${esc(t.setting)} · after ${esc(themes[t.order - 2]?.name ?? '')}`;
    const side =
      status === 'done'
        ? `<div class="pp-stamp" style="border-color:${pp.stamp};color:${pp.stamp};rotate:${t.order % 2 ? -8 : 8}deg" aria-label="Stamped, ${stars} stars"><b>${pp.code}</b><span>★ ${stars}</span></div>`
        : `<div class="pp-lock" aria-label="Locked">${icons.lock(pp.sub)}</div>`;
    const tag = status === 'done' ? 'a' : 'div';
    const href = status === 'done' ? ` href="#/map/${t.id}"` : '';
    return `
      <${tag}${href} class="pp-city-card px-scene is-${status}" style="--scene:url(${dataUrl(cityScene(t, 175, 44, status === 'locked'))});--px-edge:${pp.cardBorder};background-color:${pp.card};color:${pp.title}">
        <div>
          <h2 class="pp-city-name" style="${display}">${esc(t.name)}</h2>
          <div class="pp-city-sub" style="color:${pp.sub}">${sub}</div>
        </div>
        ${side}
      </${tag}>`;
  }
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);
