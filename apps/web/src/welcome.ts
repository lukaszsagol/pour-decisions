import { themes, type Theme } from '@pour/themes';
import type { Progress } from './economy/save.js';
import { esc, icons } from './icons.js';
import { BARTENDER_NAMES, bartenderImg } from './pixel/bartenders.js';
import { PixelCanvas } from './pixel/canvas.js';
import { landmarkFor } from './pixel/landmarks.js';
import { dataUrl } from './pixel/scenes.js';
import { ART, type Stage } from './stage.js';
import { applyTheme } from './theme-css.js';

/** Art pixels between the top of the stage and the top of the city scene. */
const SKY_TOP = 30;

/**
 * First launch: what the game is, in the first bartender's words, and one button that goes
 * straight into level 1 (see onboarding.ts).
 */
export class WelcomeScreen {
  readonly el = document.createElement('div');
  private offResize: (() => void) | null = null;

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
    const scene = await landmarkFor(t.id);
    const name = BARTENDER_NAMES[t.id];
    const logo = icons.glass(k.accent).replace('width="26" height="26"', 'width="40" height="40"');
    const route = themes
      .map(
        (c, i) =>
          `<li class="wl-stop${i === 0 ? ' is-here' : ''}"><span class="wl-pin">${i + 1}</span>${esc(c.name)}</li>`,
      )
      .join('');
    this.el.innerHTML = `
      <div class="wl-sky" aria-hidden="true"></div>
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
    if (scene) {
      const draw = () => this.drawSky(scene);
      draw();
      this.offResize = this.stage.onResize(draw);
    }
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.offResize?.();
    this.el.remove();
  }

  /**
   * The city at night, reaching the screen's top and sides: mirrored past its left and right
   * edges (as on the map), and its sky continued up to the top of the screen.
   */
  private drawSky(scene: PixelCanvas): void {
    const { l, r, t } = this.stage.bleed;
    const above = t + SKY_TOP;
    const w = scene.w + l + r;
    const cv = new PixelCanvas(w, above + scene.h);
    // The sky above is the scene's commonest top-row colour (a spire touching the top would
    // otherwise be stretched up the screen).
    const counts = new Map<string, number>();
    for (let x = 0; x < scene.w; x++) {
      const c = scene.get(x, 0);
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const sky = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (sky) cv.rect(0, 0, w, above, sky);
    for (let x = 0; x < w; x++) {
      let sx = x - l;
      if (sx < 0) sx = -sx - 1;
      if (sx >= scene.w) sx = 2 * scene.w - sx - 1;
      sx = Math.max(0, Math.min(scene.w - 1, sx));
      for (let y = 0; y < scene.h; y++) cv.px(x, above + y, scene.get(sx, y));
    }
    this.el.querySelector<HTMLElement>('.wl-sky')!.innerHTML =
      `<img class="px-img" src="${dataUrl(cv)}" width="${w * ART}" height="${cv.h * ART}" alt="">`;
  }
}
