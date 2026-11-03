import { themes, type Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';
import { openSettings } from './settings.js';
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
          <button class="icon-btn pp-settings" aria-label="Settings">${settingsIcon(k.muted)}</button>
        </div>
      </header>
      <div class="pp-title">
        <div class="pp-title-row"><h1>Your passport</h1><button class="pp-install" hidden>${downloadIcon()}Install</button></div>
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
        <section class="pp-current" style="background:${pp.card};border-color:${k.accent};color:${k.text}" aria-label="Now visiting ${esc(t.name)}">
          <div class="pp-ornament" aria-hidden="true">${ornament(t)}</div>
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
        : `<div class="pp-lock" aria-label="Locked">${lockIcon(pp.sub)}</div>`;
    const tag = status === 'done' ? 'a' : 'div';
    const href = status === 'done' ? ` href="#/map/${t.id}"` : '';
    return `
      <${tag}${href} class="pp-city-card is-${status}" style="background:${pp.card};border-color:${pp.cardBorder};color:${pp.title}">
        <div>
          <h2 class="pp-city-name" style="${display}">${esc(t.name)}</h2>
          <div class="pp-city-sub" style="color:${pp.sub}">${sub}</div>
        </div>
        ${side}
      </${tag}>`;
  }
}

function downloadIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function settingsIcon(c: string): string {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="${c}" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

function lockIcon(c: string): string {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2.5" stroke="${c}" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="${c}" stroke-width="1.8"/></svg>`;
}

/** A small picture per city on the current-city card. */
function ornament(t: Theme): string {
  const k = t.colors;
  switch (t.id) {
    case 'tokyo':
      return `<svg width="84" height="74" viewBox="0 0 84 74"><rect x="1" y="1" width="22" height="70" rx="4" fill="none" stroke="${k.hint}" stroke-width="1.5"/><text x="12" y="30" text-anchor="middle" font-family="Zen Kaku Gothic New" font-weight="700" font-size="13" fill="${k.hint}">夜</text><text x="12" y="52" text-anchor="middle" font-family="Zen Kaku Gothic New" font-weight="700" font-size="13" fill="${k.hint}">道</text><rect x="52" y="0" width="2" height="10" fill="#3A2A2A"/><rect x="42" y="10" width="22" height="28" rx="11" fill="#E0453A"/></svg>`;
    case 'amsterdam':
      return `<svg width="70" height="74" viewBox="0 0 70 74"><path d="M8 74V30h8V20h8V8h22v12h8v10h8v44z" fill="${k.mapBuildingC ?? k.line}"/><rect x="24" y="36" width="8" height="12" fill="${k.starDone}"/><rect x="38" y="36" width="8" height="12" fill="${k.starDone}" opacity=".5"/><rect x="31" y="56" width="8" height="18" fill="${k.ground}"/></svg>`;
    case 'london':
      return `<svg width="60" height="74" viewBox="0 0 60 74"><path d="M30 0v10" stroke="${k.accent}" stroke-width="2"/><rect x="8" y="10" width="44" height="50" rx="3" fill="${k.wall ?? k.surfaceAlt}" stroke="${k.accent}" stroke-width="2"/><circle cx="30" cy="35" r="10" fill="none" stroke="${k.accent}" stroke-width="2"/></svg>`;
    default:
      return `<svg width="76" height="60" viewBox="0 0 76 60"><path d="M6 58a32 32 0 0 1 64 0" fill="none" stroke="${k.accent}" stroke-width="2"/><path d="M38 58V22M38 58 16 34M38 58l22-24M38 58 8 50M38 58l30-8" stroke="${k.accent}" stroke-width="1.2"/></svg>`;
  }
}
