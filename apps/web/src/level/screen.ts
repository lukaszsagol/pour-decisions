import { Game, type Bottle, type BoosterStock, type Move } from '@pour/engine';
import type { Theme } from '@pour/themes';
import { Container, Graphics } from 'pixi.js';
import { easeInOut, linear, reducedMotion, tween, wait } from '../anim.js';
import { esc, icons } from '../icons.js';
import { sfx } from '../sound.js';
import { createPixi, invalidate } from '../pixi-util.js';
import type { Stage } from '../stage.js';
import { applyTheme, color } from '../theme-css.js';
import { drawLevelDecor } from './decor.js';
import { bodyOrigin, GlassView, type GlassMark } from './glass-view.js';
import { unitRects } from './geometry.js';
import { layoutGlasses, type Slot } from './layout.js';

export interface LevelResult {
  number: number;
  moves: number;
  best: number;
  stars: number;
  perfect: boolean;
  extraGlassUsed: boolean;
  usedBoosters: number;
  /** Attempts before this one in this visit (0 = first try). */
  restarts: number;
}

export interface LevelScreenOptions {
  theme: Theme;
  number: number;
  barName: string;
  bottles: Bottle[];
  best: number;
  stock: BoosterStock;
  /** Where the back button goes. */
  backHref: string;
  /** Line under the title; defaults to "City · Level N". */
  subtitle?: string;
  /** Show the "tap this glass, then that one" pointer for the first pour. */
  guide?: boolean;
  /** Called once when the level is won, before the win overlay shows. */
  onWin?: (result: LevelResult) => void;
  /** Called whenever booster stock changes, so the economy can save it. */
  onStock?: (stock: BoosterStock) => void;
  /** Called when the player hits a dead end (for streaks and the play log). */
  onDeadEnd?: () => void;
  /** Called after every pour, undo, booster use or restart (for the play log). */
  onEvent?: (event: { type: string; [key: string]: unknown }) => void;
  /** Dead-end continue: buy an extra glass for coins when none are left. */
  continueOffer?: { price: number; canBuy: () => boolean; buy: () => boolean };
  /** "Next" on the win overlay. */
  nextHref: string;
  nextLabel?: string;
}

/** Lift of a selected glass, in logical px. */
export const LIFT = 16;
const LIFT_MS = 160;
const REJECT_MS = 420;

/**
 * The puzzle screen: Pixi draws the backdrop and glasses, DOM provides the
 * header, the booster counter, overlays and a real button over every glass.
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
  private lifts: number[] = [];
  private liftAnims: ({ cancel: () => void } | null)[] = [];
  private shakes: number[] = [];
  private disposePixi: (() => void) | null = null;
  /** The pour being animated; its two glasses are drawn by the animation, not by render(). */
  private pouring: { from: number; to: number } | null = null;
  /** Taps that arrive during a pour animation run after it, in order. */
  private queue: number[] = [];
  private destroyed = false;
  private hint: Move | null = null;
  private restarts = 0;
  private wonReported = false;
  private deadEndReported = false;

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
    const { app, dispose, onFrame } = await createPixi(this.stage);
    if (this.destroyed) {
      dispose();
      return;
    }
    this.disposePixi = dispose;
    this.el.prepend(app.canvas);
    app.stage.addChild(drawLevelDecor(this.theme), this.glassLayer);
    if (!reducedMotion()) onFrame((ms) => this.views.forEach((v) => v.wobble(ms)));
    this.el.insertAdjacentHTML('beforeend', this.chromeHtml());
    this.bindChrome();
    this.layout();
    this.render();
    this.opts.onEvent?.({ type: 'start', level: this.opts.number });
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    if (!this.destroyed && !this.wonReported && this.game.moves > 0)
      this.opts.onEvent?.({ type: 'quit', moves: this.game.moves });
    this.destroyed = true;
    this.liftAnims.forEach((a) => a?.cancel());
    this.disposePixi?.();
    this.el.remove();
  }

  /** Builds glass views and buttons for the current number of bottles. */
  protected layout(): void {
    const n = this.game.bottles.length;
    this.slots = layoutGlasses(n);
    const holder = this.el.querySelector('.lv-glasses')!;
    while (this.views.length < n) {
      const v = new GlassView(this.theme);
      this.views.push(v);
      this.glassLayer.addChild(v);
      const index = this.glassButtons.length;
      const b = document.createElement('button');
      b.className = 'lv-glass';
      b.dataset.index = String(index);
      b.addEventListener('click', () => this.onGlass(index));
      this.glassButtons.push(b);
      this.lifts.push(0);
      this.liftAnims.push(null);
      this.shakes.push(0);
      holder.appendChild(b);
    }
    while (this.views.length > n) {
      this.views.pop()!.destroy();
      this.glassButtons.pop()!.remove();
      this.lifts.pop();
      this.liftAnims.pop()?.cancel();
      this.shakes.pop();
    }
  }

  protected onGlass(index: number): void {
    if (this.pouring) {
      this.queue.push(index);
      return;
    }
    if (this.game.status === 'won') return;
    const before = this.game.selected;
    const bottlesBefore = this.game.bottles;
    const event = this.game.tap(index);
    this.hint = null;
    this.marks.clear();
    switch (event.type) {
      case 'selected':
        sfx.play('select');
        break;
      case 'rejected':
        sfx.play('reject');
        this.reject(index);
        break;
      case 'poured':
        this.opts.onEvent?.({ type: 'pour', from: event.from, to: event.to, moves: this.game.moves });
        sfx.play('pour', event.amount);
        void this.animatePour(event.from, event.to, event.amount, bottlesBefore).then(() => {
          if (event.unlocked.length) sfx.play('unlock');
          if (event.completed) sfx.play(this.game.status === 'won' ? 'win' : 'complete');
          else sfx.play('clink');
          if (this.destroyed) return;
          for (const i of event.unlocked) {
            const drink = bottlesBefore[i]!.lockedUntil!;
            void this.views[i]!.playUnlock(
              drink,
              (step) => tween({ duration: 500, ease: linear, onUpdate: step }).done,
            );
          }
          if (event.completed)
            void this.views[event.to]!.celebrate(
              600,
              (step) => tween({ duration: 600, ease: linear, onUpdate: step }).done,
            );
          this.afterChange();
          this.render();
          const next = this.queue.shift();
          if (next !== undefined) this.onGlass(next);
        });
        this.render();
        return;
      default:
        break;
    }
    if (before !== this.game.selected || event.type !== 'rejected') this.render();
  }

  /** Flashes a glass red and shakes it. No error text. */
  protected reject(index: number): void {
    this.marks.set(index, 'reject');
    this.render();
    const slot = this.slots[index]!;
    tween({
      duration: REJECT_MS,
      onUpdate: (t) => {
        this.shakes[index] = Math.sin(t * Math.PI * 5) * 6 * (1 - t) * slot.scale;
        this.place(index);
      },
    }).done.then(() => {
      if (this.destroyed) return;
      this.shakes[index] = 0;
      if (this.marks.get(index) === 'reject') this.marks.delete(index);
      this.render();
    });
  }

  /** Checks for win and dead end after the position changes. */
  protected afterChange(): void {
    const status = this.game.status;
    if (status === 'deadEnd' && !this.deadEndReported) {
      this.deadEndReported = true;
      this.opts.onDeadEnd?.();
      this.opts.onEvent?.({ type: 'deadEnd', moves: this.game.moves });
    }
    if (status !== 'deadEnd') this.deadEndReported = false;
    if (status === 'won' && !this.wonReported) {
      this.wonReported = true;
      const g = this.game;
      const result: LevelResult = {
        number: this.opts.number,
        moves: g.moves,
        best: g.best,
        stars: g.stars(),
        perfect: g.perfect,
        extraGlassUsed: g.extraGlassUsed,
        usedBoosters: g.usedBoosters,
        restarts: this.restarts,
      };
      this.opts.onEvent?.({ type: 'win', moves: g.moves, stars: result.stars });
      this.opts.onWin?.(result);
      void wait(350).then(() => !this.destroyed && this.showWin(result));
    }
  }

  undo(): void {
    if (this.pouring) return;
    if (!this.game.undo()) return;
    this.afterBooster('undo');
  }

  addGlass(): void {
    if (this.pouring) return;
    if (!this.game.addGlass()) return;
    this.layout();
    this.afterBooster('extraGlass');
  }

  useHint(): void {
    if (this.pouring) return;
    const move = this.game.hint();
    if (!move) return;
    this.hint = move;
    this.marks.clear();
    this.marks.set(move.from, 'hint');
    this.marks.set(move.to, 'hint');
    this.opts.onStock?.({ ...this.game.stock });
    this.opts.onEvent?.({ type: 'booster', booster: 'hint' });
    this.render();
  }

  restart(): void {
    if (this.pouring) return;
    this.game.restart();
    this.restarts++;
    this.hint = null;
    this.marks.clear();
    this.wonReported = false;
    this.deadEndReported = false;
    this.layout();
    this.hideOverlay();
    this.opts.onEvent?.({ type: 'restart' });
    this.render();
  }

  private afterBooster(kind: string): void {
    this.hint = null;
    this.marks.clear();
    this.opts.onStock?.({ ...this.game.stock });
    this.opts.onEvent?.({ type: 'booster', booster: kind });
    this.afterChange();
    this.render();
  }

  protected markFor(i: number): GlassMark {
    if (this.marks.has(i)) return this.marks.get(i)!;
    return this.game.selected === i ? 'selected' : 'none';
  }

  /** Positions one glass view and its button from slot, lift and shake. */
  /**
   * Pour animation (about 450 ms): the source tilts over the target, a stream
   * arcs across while the target fills, then the source settles back.
   */
  private async animatePour(from: number, to: number, amount: number, before: readonly Bottle[]): Promise<void> {
    if (reducedMotion()) return;
    this.pouring = { from, to };
    const src = this.views[from]!;
    const dst = this.views[to]!;
    const ss = this.slots[from]!;
    const ds = this.slots[to]!;
    const scale = ss.scale;
    const geo = dst.geometry;
    const srcBottle = before[from]!;
    const dstBottle = this.game.bottles[to]!;
    const srcStart = srcBottle.units.length;
    const dstStart = before[to]!.units.length;
    const drink = this.theme.drinks.find((d) => d.id === srcBottle.units[srcStart - 1]!.drink)!.color;
    const dir = ds.x >= ss.x ? 1 : -1;
    const home = { x: src.position.x, y: src.position.y };
    const tm = { x: ds.x + dst.mouth.x * ds.scale, y: ds.y + dst.mouth.y * ds.scale };
    // Tilt past horizontal so the mouth points down, with the lower lip just above the target's mouth.
    const angle = dir * 2.05;
    const half = (src.geometry.bodyW / 2) * scale;
    const lip = { x: Math.cos(angle) * dir * half, y: Math.sin(angle) * dir * half };
    const over = { x: tm.x - dir * 6 * scale - lip.x, y: tm.y - 12 * scale - lip.y };
    const rest = { x: ss.x + src.mouth.x * scale, y: ss.y + src.mouth.y * scale };
    const stream = new Graphics();
    this.glassLayer.addChild(src, stream);
    const inset = geo.border + geo.padding;
    const surfaceAt = (level: number) => {
      const rects = unitRects(geo, dstBottle.capacity);
      const o = bodyOrigin(geo);
      const i = Math.min(Math.floor(level), dstBottle.capacity - 1);
      const r = rects[i]!;
      const y = level >= dstBottle.capacity ? o.y + inset : r.y + r.h * (1 - (level - Math.floor(level)));
      return ds.y + y * ds.scale;
    };
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    await tween({
      duration: 450,
      ease: linear,
      onUpdate: (t) => {
        stream.clear();
        if (t <= 0.33) {
          const k = easeInOut(t / 0.33);
          src.position.set(lerp(home.x, over.x, k), lerp(home.y, over.y, k));
          src.rotation = angle * k;
        } else if (t <= 0.78) {
          const k = (t - 0.33) / 0.45;
          src.position.set(over.x, over.y);
          src.rotation = angle;
          src.draw({ bottle: srcBottle, mark: 'none', level: srcStart - amount * k });
          const level = dstStart + amount * k;
          dst.draw({ bottle: dstBottle, mark: 'none', level });
          const lipX = over.x + lip.x;
          const lipY = over.y + lip.y;
          const width = 5 * scale * Math.min(1, Math.sin(Math.PI * k) * 3);
          stream
            .moveTo(lipX, lipY)
            .quadraticCurveTo(lerp(lipX, tm.x, 0.7), lipY - 4 * scale, tm.x, surfaceAt(level))
            .stroke({ width, color: drink, cap: 'round' });
        } else {
          const k = easeInOut((t - 0.78) / 0.22);
          src.draw({ bottle: this.game.bottles[from]!, mark: 'none' });
          dst.draw({ bottle: dstBottle, mark: 'none' });
          src.position.set(lerp(over.x, rest.x, k), lerp(over.y, rest.y, k));
          src.rotation = angle * (1 - k);
        }
      },
    }).done;
    stream.destroy();
    src.rotation = 0;
    this.lifts[from] = 0;
    this.liftAnims[from]?.cancel();
    this.pouring = null;
  }

  protected place(i: number): void {
    invalidate();
    const slot = this.slots[i]!;
    const view = this.views[i]!;
    const lift = this.lifts[i]! * slot.scale;
    const x = slot.x + this.shakes[i]!;
    view.position.set(x + view.mouth.x * slot.scale, slot.y + view.mouth.y * slot.scale - lift);
    view.scale.set(slot.scale);
    const btn = this.glassButtons[i]!;
    btn.style.left = `${x}px`;
    btn.style.top = `${slot.y - lift}px`;
    btn.style.transform = `scale(${slot.scale})`;
  }

  private animateLift(i: number, target: number): void {
    if (this.lifts[i] === target) return;
    this.liftAnims[i]?.cancel();
    const from = this.lifts[i]!;
    this.liftAnims[i] = tween({
      duration: LIFT_MS,
      onUpdate: (t) => {
        this.lifts[i] = from + (target - from) * t;
        this.place(i);
      },
    });
  }

  /** Redraws glasses, counters, overlays and labels from the game state. */
  render(): void {
    invalidate();
    const g = this.game;
    g.bottles.forEach((bottle, i) => {
      const btn = this.glassButtons[i]!;
      btn.setAttribute('aria-label', this.glassLabel(i, bottle));
      btn.setAttribute('aria-pressed', String(g.selected === i));
      if (this.pouring && (this.pouring.from === i || this.pouring.to === i)) return;
      this.views[i]!.draw({ bottle, mark: this.markFor(i) });
      this.animateLift(i, g.selected === i ? LIFT : 0);
      this.place(i);
    });
    this.text('.lv-move-count', String(g.moves));
    this.booster('undo', g.stock.undo, g.canUndo());
    this.booster('glass', g.stock.extraGlass, g.canAddGlass());
    this.booster('hint', g.stock.hint, g.canHint());
    this.renderDeadEnd();
    this.renderGuide();
  }

  protected glassLabel(i: number, b: Bottle): string {
    const name = (id: string) => this.theme.drinks.find((d) => d.id === id)?.name.toLowerCase() ?? id;
    const parts = [`Glass ${i + 1}`];
    if (this.game.selected === i) parts.push('selected');
    if (this.hint && (this.hint.from === i || this.hint.to === i))
      parts.push(this.hint.from === i ? 'hint: pour from here' : 'hint: pour here');
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

  private renderDeadEnd(): void {
    const panel = this.el.querySelector<HTMLElement>('.lv-deadend')!;
    const show = this.game.status === 'deadEnd';
    panel.hidden = !show;
    if (!show) return;
    panel.querySelector<HTMLButtonElement>('.de-undo')!.disabled = !this.game.canUndo();
    const glass = panel.querySelector<HTMLButtonElement>('.de-glass')!;
    const offer = this.opts.continueOffer;
    const canBuy = !this.game.extraGlassUsed && this.game.stock.extraGlass === 0 && !!offer?.canBuy();
    glass.textContent = canBuy ? `Add glass · ${offer!.price}` : 'Add glass';
    glass.dataset.buy = String(canBuy);
    glass.disabled = !this.game.canAddGlass() && !canBuy;
  }

  /** Level 1 pointer: points at the source glass, then at the target, until the first pour. */
  private renderGuide(): void {
    const pointer = this.el.querySelector<HTMLElement>('.lv-guide');
    if (!pointer) return;
    if (!this.opts.guide || this.game.moves > 0 || this.game.status !== 'playing') {
      pointer.hidden = true;
      return;
    }
    const move = this.guideMove ?? (this.guideMove = this.game.suggest());
    if (!move) return;
    const target = this.game.selected === move.from ? move.to : move.from;
    const slot = this.slots[target]!;
    pointer.hidden = false;
    pointer.style.left = `${slot.x + 30 * slot.scale - 22}px`;
    pointer.style.top = `${slot.y - 52}px`;
    pointer.dataset.target = String(target);
  }
  private guideMove: Move | null = null;

  private showWin(r: LevelResult): void {
    const k = this.theme.colors;
    const verdict = r.perfect ? 'Perfect pour' : r.stars === 3 ? 'Great pour' : r.stars === 2 ? 'Nice pour' : 'Cleared';
    const stars = [1, 2, 3].map((i) => icons.star(i <= r.stars ? k.starDone : k.starEmpty, 44)).join('');
    const overlay = this.el.querySelector<HTMLElement>('.lv-overlay')!;
    overlay.innerHTML = `
      <div class="win-card" role="dialog" aria-modal="true" aria-labelledby="win-verdict">
        <div class="win-kicker">${esc(this.opts.subtitle ? "Tonight's pour cleared" : `Level ${r.number} cleared`)}</div>
        <div class="win-stars" aria-label="${r.stars} of 3 stars">${stars}</div>
        <div class="win-verdict" id="win-verdict">${verdict}</div>
        <div class="win-moves">${r.moves} moves · best ${r.best}</div>
        <a class="btn btn-primary win-next" href="${esc(this.opts.nextHref)}">${esc(this.opts.nextLabel ?? 'Next level')}</a>
        <button class="btn btn-ghost win-again">Play again</button>
      </div>`;
    overlay.hidden = false;
    overlay.querySelector('.win-again')!.addEventListener('click', () => this.restart());
    overlay.querySelector<HTMLElement>('.win-next')!.focus();
  }

  private hideOverlay(): void {
    const overlay = this.el.querySelector<HTMLElement>('.lv-overlay')!;
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  private bindChrome(): void {
    const on = (sel: string, fn: () => void) => this.el.querySelector(sel)!.addEventListener('click', fn);
    on('.booster-undo', () => this.undo());
    on('.booster-glass', () => this.addGlass());
    on('.booster-hint', () => this.useHint());
    on('.lv-restart', () => this.restart());
    on('.de-undo', () => this.undo());
    on('.de-glass', () => {
      const offer = this.opts.continueOffer;
      if (this.game.stock.extraGlass === 0 && offer?.buy()) {
        this.game.stock.extraGlass++;
        this.opts.onEvent?.({ type: 'continue', price: offer.price });
      }
      this.addGlass();
    });
    on('.de-restart', () => this.restart());
  }

  private chromeHtml(): string {
    const t = this.theme;
    const k = t.colors;
    const rim = (key: string) => color(t, key, k.boosterRim);
    const icon = (key: string, fallback: string) => color(t, key, fallback);
    const border = t.booster?.border ?? 2;
    const booster = (kind: string, label: string, rimColor: string, svg: string) => `
      <button class="booster booster-${kind}" style="--rim:${rimColor}">
        <span class="booster-face${t.booster?.shape === 'card' ? ' is-card' : ''}" style="border-width:${border}px">${svg}<span class="booster-count"></span></span>
        <span class="booster-label">${label}</span>
      </button>`;
    return `
      <header class="lv-header">
        <div class="lv-title">
          <a class="icon-btn lv-back" href="${esc(this.opts.backHref)}" aria-label="Back to map">${icons.back(k.text)}</a>
          <div>
            <h1 class="lv-bar">${esc(this.opts.barName)}</h1>
            <div class="lv-sub">${esc(this.opts.subtitle ?? `${t.name} · Level ${this.opts.number}`)}</div>
          </div>
        </div>
        <div class="lv-right">
          <div class="lv-moves" role="status" aria-live="polite"><b class="lv-move-count">0</b><span>moves · best ${this.opts.best}</span></div>
          <button class="icon-btn lv-restart" aria-label="Restart level">${icons.restart(k.muted)}</button>
        </div>
      </header>
      <div class="lv-glasses"></div>
      <div class="lv-guide" hidden aria-hidden="true"><span class="lv-guide-dot"></span></div>
      <div class="lv-counter">
        ${booster('undo', 'Undo', rim('boosterUndo'), icons.undo(icon('boosterUndoIcon', rim('boosterUndo'))))}
        ${booster('glass', 'Extra glass', rim('boosterGlass'), icons.glass(icon('boosterGlassIcon', rim('boosterGlass'))))}
        ${booster('hint', 'Hint', rim('boosterHint'), icons.hint(icon('boosterHintIcon', rim('boosterHint'))))}
      </div>
      <section class="lv-deadend" hidden aria-labelledby="de-title" role="alertdialog">
        <div>
          <h2 class="de-title" id="de-title">No pours left</h2>
          <p class="de-sub">Undo a move, add a glass, or start the round again.</p>
        </div>
        <div class="de-actions">
          <button class="btn btn-outline de-undo">Undo</button>
          <button class="btn btn-primary de-glass">Add glass</button>
          <button class="btn btn-ghost de-restart">Restart</button>
        </div>
      </section>
      <div class="lv-overlay" hidden></div>`;
  }
}
