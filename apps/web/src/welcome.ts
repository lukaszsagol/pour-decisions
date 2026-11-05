import { themes, type Theme } from '@pour/themes';
import type { Progress } from './economy/save.js';
import { esc, icons } from './icons.js';
import { BARTENDER_NAMES, bartenderImg } from './pixel/bartenders.js';
import { landmarkUrl } from './pixel/landmarks.js';
import type { Stage } from './stage.js';
import { applyTheme } from './theme-css.js';

/**
 * First launch: what the game is, in the first bartender's words, and one button that goes
 * straight into level 1 (see onboarding.ts).
 */
export class WelcomeScreen {
  readonly el = document.createElement('div');

  constructor(
    private readonly stage: Stage,
    private readonly theme: Theme,
    private readonly progress: Progress,
    private readonly barName: string,
  ) {
    this.el.className = 'screen welcome-screen';
  }

  async mount(): Promise<void> {
    const t = this.theme;
    const k = t.colors;
    applyTheme(this.stage.el, t);
    this.stage.el.replaceChildren(this.el);
    const scene = landmarkUrl(t.id);
    const name = BARTENDER_NAMES[t.id];
    const logo = icons.glass(k.accent).replace('width="26" height="26"', 'width="40" height="40"');
    const route = themes
      .map(
        (c, i) =>
          `<li class="wl-stop${i === 0 ? ' is-here' : ''}"><span class="wl-pin">${i + 1}</span>${esc(c.name)}</li>`,
      )
      .join('');
    this.el.innerHTML = `
      ${scene ? `<img class="wl-scene px-img" src="${scene}" width="390" height="160" alt="">` : ''}
      <div class="wl-title">
        <h1>${logo}<span>Pour Decisions</span></h1>
        <p>A night out in four cities, one drink at a time.</p>
      </div>
      <section class="wl-host px-panel" aria-label="${esc(name)} says">
        ${bartenderImg(t.id, 'neutral', 'wl-host-img')}
        <h2>Welcome to ${esc(this.barName)}!</h2>
        <p>I'm ${esc(name)}. Every glass should end up holding one drink. Sort them in as few pours as you can: fewer pours, more stars.</p>
      </section>
      <ol class="wl-route" aria-label="Your night out">${route}</ol>
      <button class="btn btn-primary wl-go">Pour your first drink</button>
      <p class="wl-note">No ads, no purchases. Everything is earned by playing.</p>`;
    this.el.querySelector('.wl-go')!.addEventListener('click', () => {
      this.progress.markIntro('welcomed');
      location.hash = '#/level/1';
    });
    this.el.querySelector<HTMLElement>('.wl-go')!.focus();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.el.remove();
  }
}
