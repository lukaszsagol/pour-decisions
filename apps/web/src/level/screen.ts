import { Game, type Bottle, type BoosterStock } from '@pour/engine';
import type { Theme } from '@pour/themes';
import { Container } from 'pixi.js';
import { esc, icons } from '../icons.js';
import { createPixi } from '../pixi-util.js';
import type { Stage } from '../stage.js';
import { applyTheme, color } from '../theme-css.js';
import { drawLevelDecor } from './decor.js';
import { GlassView, type GlassMark } from './glass-view.js';
import { layoutGlasses, type Slot } from './layout.js';

export interface LevelScreenOptions {
  theme: Theme;
  number: number;
  barName: string;
  bottles: Bottle[];
  best: number;
  stock: BoosterStock;
  /** Where the back button goes. */
  backHref: string;
}

/** Lift of a selected glass, in logical px. */
export const LIFT = 16;

/**
 * The puzzle screen: Pixi draws the backdrop and glasses, DOM provides the
 * header, the booster counter and a real button over every glass.
 */
export class LevelScreen {
  readonly game: Game;
  readonly el: HTMLElement;
  protected readonly theme: Theme;
  protected views: GlassView[] = [];
  protected slots: Slot[] = [];
  protected glassButtons: HTMLButtonElement[] = [];
  protected marks = new Map<number, GlassMark>();
  protected glassLayer = new Container();
  private disposePixi: (() => void) | null = null;
  private destroyed = false;

  constructor(
    protected readonly stage: Stage,
    protected readonly opts: LevelScreenOptions,
  ) {
    this.theme = opts.theme;
    this.game = new Game(opts.bottles, { best: opts.best, stock: opts.stock });
    this.el = document.createElement('div');
    this.el.className = 'screen level-screen';
  }

  async mount(): Promise<void> {
    applyTheme(this.stage.el, this.theme);
    this.stage.el.replaceChildren(this.el);
    const { app, dispose } = await createPixi(this.stage);
    if (this.destroyed) {
      dispose();
      return;
    }
    this.disposePixi = dispose;
    this.el.prepend(app.canvas);
    app.stage.addChild(drawLevelDecor(this.theme), this.glassLayer);
    this.el.insertAdjacentHTML('beforeend', this.chromeHtml());
    this.layout();
    this.render();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.destroyed = true;
    this.disposePixi?.();
    this.el.remove();
  }

  /** Builds glass views and buttons for the current number of bottles. */
  protected layout(): void {
    const n = this.game.bottles.length;
    this.slots = layoutGlasses(n);
    while (this.views.length < n) {
      const v = new GlassView(this.theme);
      this.views.push(v);
      this.glassLayer.addChild(v);
      const b = document.createElement('button');
      b.className = 'lv-glass';
      const index = this.glassButtons.length;
      b.addEventListener('click', () => this.onGlass(index));
      this.glassButtons.push(b);
      this.el.querySelector('.lv-glasses')!.appendChild(b);
    }
  }

  protected onGlass(_index: number): void {
    // Interaction arrives with the level interaction task.
  }

  protected markFor(i: number): GlassMark {
    if (this.marks.has(i)) return this.marks.get(i)!;
    return this.game.selected === i ? 'selected' : 'none';
  }

  /** Redraws glasses, counters and labels from the game state. */
  render(): void {
    const g = this.game;
    g.bottles.forEach((bottle, i) => {
      const view = this.views[i]!;
      const slot = this.slots[i]!;
      const mark = this.markFor(i);
      view.draw({ bottle, mark });
      const lift = g.selected === i ? LIFT * slot.scale : 0;
      view.position.set(slot.x, slot.y - lift);
      view.scale.set(slot.scale);
      const btn = this.glassButtons[i]!;
      btn.style.left = `${slot.x}px`;
      btn.style.top = `${slot.y - lift}px`;
      btn.style.transform = `scale(${slot.scale})`;
      btn.setAttribute('aria-label', this.glassLabel(i, bottle));
      btn.setAttribute('aria-pressed', String(g.selected === i));
    });
    this.text('.lv-move-count', String(g.moves));
    this.booster('undo', g.stock.undo, g.canUndo());
    this.booster('glass', g.stock.extraGlass, g.canAddGlass());
    this.booster('hint', g.stock.hint, g.canHint());
  }

  protected glassLabel(i: number, b: Bottle): string {
    const name = (id: string) => this.theme.drinks.find((d) => d.id === id)?.name.toLowerCase() ?? id;
    const parts = [`Glass ${i + 1}`];
    if (this.game.selected === i) parts.push('selected');
    if (b.lockedUntil) parts.push(`chained shut until the ${name(b.lockedUntil)} is complete`);
    if (b.only) parts.push(`only takes ${name(b.only)}`);
    if (b.units.length === 0) parts.push('empty');
    else
      parts.push(
        `top to bottom: ${[...b.units]
          .reverse()
          .map((u) => (u.hidden ? 'hidden' : name(u.drink)))
          .join(', ')}`,
      );
    return parts.join(', ');
  }

  private text(sel: string, value: string): void {
    const n = this.el.querySelector(sel);
    if (n) n.textContent = value;
  }

  private booster(kind: 'undo' | 'glass' | 'hint', count: number, usable: boolean): void {
    const b = this.el.querySelector<HTMLButtonElement>(`.booster-${kind}`);
    if (!b) return;
    b.querySelector('.booster-count')!.textContent = String(count);
    b.disabled = !usable;
    const label = { undo: 'Undo', glass: 'Add an empty glass', hint: 'Hint' }[kind];
    b.setAttribute('aria-label', `${label}, ${count} left`);
  }

  private chromeHtml(): string {
    const t = this.theme;
    const k = t.colors;
    const rim = (key: string) => color(t, key, k.boosterRim);
    const icon = (key: string, fallback: string) => color(t, key, fallback);
    const border = t.booster?.border ?? 2;
    const booster = (kind: string, label: string, rimColor: string, svg: string) => `
      <button class="booster booster-${kind}" style="--rim:${rimColor}">
        <span class="booster-face" style="border-width:${border}px">${svg}<span class="booster-count"></span></span>
        <span class="booster-label">${label}</span>
      </button>`;
    return `
      <header class="lv-header">
        <div class="lv-title">
          <a class="icon-btn lv-back" href="${esc(this.opts.backHref)}" aria-label="Back to map">${icons.back(k.text)}</a>
          <div>
            <div class="lv-bar">${esc(this.opts.barName)}</div>
            <div class="lv-sub">${esc(t.name)} · Level ${this.opts.number}</div>
          </div>
        </div>
        <div class="lv-right">
          <div class="lv-moves" role="status" aria-live="polite"><b class="lv-move-count">0</b><span>moves · best ${this.opts.best}</span></div>
          <button class="icon-btn lv-restart" aria-label="Restart level">${icons.restart(k.muted)}</button>
        </div>
      </header>
      <div class="lv-glasses"></div>
      <div class="lv-counter">
        ${booster('undo', 'Undo', rim('boosterUndo'), icons.undo(icon('boosterUndoIcon', rim('boosterUndo'))))}
        ${booster('glass', 'Extra glass', rim('boosterGlass'), icons.glass(icon('boosterGlassIcon', rim('boosterGlass'))))}
        ${booster('hint', 'Hint', rim('boosterHint'), icons.hint(icon('boosterHintIcon', rim('boosterHint'))))}
      </div>`;
  }
}
