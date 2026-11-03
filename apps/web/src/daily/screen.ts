import type { Bottle } from '@pour/engine';
import { drinkById, type Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';
import { mix, PixelCanvas } from '../pixel/canvas.js';
import { dataUrl } from '../pixel/scenes.js';
import { liquidTones } from '../pixel/tones.js';
import { dailyShareText, dateKey, type DailyLevel } from './generate.js';

/** Consecutive nights played, counting back from today (or from yesterday if tonight is not played yet). */
export function nightsInARow(played: Record<string, unknown>, today: Date = new Date()): number {
  const d = new Date(today);
  if (!played[dateKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (played[dateKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** "5 h 12 min" until local midnight. */
export function untilMidnight(now: Date = new Date()): string {
  const m = new Date(now);
  m.setHours(24, 0, 0, 0);
  const mins = Math.max(1, Math.ceil((m.getTime() - now.getTime()) / 60_000));
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
}

/** A small pixel picture of tonight's glasses, for the preview card. */
function preview(theme: Theme, bottles: Bottle[]): string {
  const n = bottles.length;
  const cv = new PixelCanvas(n * 13 + 1, 40);
  const k = theme.colors;
  bottles.forEach((b, i) => {
    const x = i * 13 + 1;
    cv.rect(x, 2, 11, 36, k.glassFill);
    cv.vline(x - 1, 2, 36, mix(k.glassRim, '#FFFFFF', 0.35));
    cv.vline(x + 11, 2, 36, mix(k.glassRim, '#000000', 0.35));
    cv.hline(x - 1, 38, 13, k.glassRim);
    cv.hline(x - 2, 1, 15, mix(k.glassRim, '#FFFFFF', 0.45));
    b.units.forEach((u, j) => {
      const t = liquidTones(u.drink, drinkById(theme, u.drink).color);
      const y = 38 - (j + 1) * 8;
      cv.rect(x, y, 11, 8, t.base);
      cv.hline(x, y, 11, t.hi);
      cv.vline(x, y, 8, mix(t.base, t.hi, 0.6));
      cv.vline(x + 10, y, 8, t.dk);
    });
  });
  return `<div class="dy-preview" aria-hidden="true"><img class="px-img" alt="" src="${dataUrl(cv)}" width="${cv.w * 2}" height="${cv.h * 2}"></div>`;
}

/** The Daily tab: tonight's level, your result, and your run of nights. */
export class DailyScreen {
  readonly el = document.createElement('div');
  private timer = 0;

  constructor(
    private readonly stage: Stage,
    private readonly level: DailyLevel,
    private readonly progress: Progress,
    private readonly tabs: Record<Tab, string>,
  ) {
    this.el.className = 'screen daily-screen';
  }

  async mount(): Promise<void> {
    const { theme } = this.level;
    applyTheme(this.stage.el, theme);
    this.stage.el.replaceChildren(this.el);
    this.el.innerHTML = this.html();
    this.el.querySelector('.dy-share')?.addEventListener('click', () => void this.share());
    this.timer = window.setInterval(() => {
      const t = this.el.querySelector('.dy-next');
      if (t) t.textContent = `Next pour in ${untilMidnight()}`;
    }, 30_000);
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    clearInterval(this.timer);
    this.el.remove();
  }

  private async share(): Promise<void> {
    const r = this.progress.data.daily[this.level.date]!;
    const text = dailyShareText(this.level.date, r.stars, r.moves, r.best);
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
    const { theme, date, bottles, best } = this.level;
    const k = theme.colors;
    const pp = theme.passport!;
    const played = this.progress.data.daily;
    const result = played[date];
    const drinks = new Set(bottles.flatMap((b) => b.units.map((u) => u.drink))).size;
    const nights = nightsInARow(played);
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const r = played[dateKey(d)];
      const day = d.toLocaleDateString('en-GB', { weekday: 'narrow' });
      const label = `${d.toLocaleDateString('en-GB', { weekday: 'long' })}: ${r ? `${r.stars} stars` : 'not played'}`;
      return `<li class="dy-day${r ? ' is-played' : ''}${i === 6 ? ' is-today' : ''}" aria-label="${label}"><span class="dy-dot">${r ? '★'.repeat(r.stars) : ''}</span><span>${day}</span></li>`;
    }).join('');
    const stars = (n: number) => `${'★'.repeat(n)}<span class="dy-off">${'★'.repeat(3 - n)}</span>`;
    const action = result
      ? `
        <div class="dy-result" aria-label="Tonight: ${result.stars} of 3 stars, ${result.moves} moves">
          <div class="dy-stars">${stars(result.stars)}</div>
          <div class="dy-moves">${result.moves} moves · best ${result.best}</div>
        </div>
        <div class="dy-actions">
          <button class="btn btn-primary dy-share">${icons.share(k.accentText).replace('width="24" height="24"', 'width="18" height="18"')} Share result</button>
          <a class="btn btn-ghost" href="#/daily/play">Play again</a>
        </div>
        <p class="dy-next" role="status">Next pour in ${untilMidnight()}</p>`
      : `<a class="btn btn-primary dy-play" href="#/daily/play">Play tonight's pour</a>
         <p class="dy-note">Your first finish counts, and earns a hint.</p>`;
    // Months in the date key run 1–12; Date wants 0–11.
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    const longDate = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return `
      <div class="pp-title" style="padding-top:28px">
        <h1>Tonight's pour</h1>
        <p>${esc(longDate)} · the same level for everyone</p>
      </div>
      <section class="dy-card" style="background:${pp.card};border-color:${k.accent}" aria-labelledby="dy-city">
        <div class="pp-kicker" style="color:${k.accent}">Tonight in</div>
        <h2 id="dy-city" class="dy-city" style="font-family:'${theme.fonts.display}', serif;color:${pp.title}">${esc(theme.name)}</h2>
        <div class="dy-facts" style="color:${pp.sub}">${drinks} drinks · ${bottles.length} glasses · best known ${best} pours</div>
        ${preview(theme, bottles)}
        ${action}
      </section>
      <section class="dy-week" aria-labelledby="dy-week-title">
        <h2 id="dy-week-title">${nights === 0 ? 'Start a run tonight' : `${nights} ${nights === 1 ? 'night' : 'nights'} in a row`}</h2>
        <ol class="dy-days">${week}</ol>
      </section>
      <div class="toast" role="status" hidden></div>
      ${tabBar('daily', this.tabs)}`;
  }
}
