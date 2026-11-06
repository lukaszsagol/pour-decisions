import { Game, twoStarPours, type Bottle, type BoosterStock, type Move } from '@pour/engine';
import type { Theme } from '@pour/themes';
import { easeInOut, easeOut, linear, reducedMotion, tween, wait } from '../anim.js';
import { esc, icons, pixelSvg } from '../icons.js';
import { cityArt, type CityLevelArt } from '../pixel/level/art.js';
import { GLASS_H, SLOT_W } from '../pixel/level/layout.js';
import { PixelLevelRenderer, TILTS, type GlassFrame, type Mark, type PourFrame } from '../pixel/level/renderer.js';
import { UNIT } from '../pixel/level/glass.js';
import { PixelLayer } from '../pixel/layer.js';
import { bartenderImg } from '../pixel/bartenders.js';
import { createPixi } from '../pixi-util.js';
import { sfx } from '../sound.js';
import { ART, STAGE_H, STAGE_W, type Stage } from '../stage.js';
import { applyTheme } from '../theme-css.js';
import { pourSign, pourSignLabel, starLossMessage, urgency, type PourSign } from './pour-sign.js';

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
  /** Boosters allowed in this level (training: plan ahead turns them off). Default true. */
  boosters?: boolean;
  /** Memory training: show every hidden unit for this long, then cover them. */
  peekMs?: number;
  /** Line under the title; defaults to "City · Level N". */
  subtitle?: string;
  /** Show the "tap this glass, then that one" pointer for the first pour. */
  guide?: boolean;
  /** Show the par card before the first pour (the first levels after level 1). */
  parCard?: boolean;
  /** Called once when the level is won, before the win overlay shows. */
  onWin?: (result: LevelResult) => void;
  /** Called whenever booster stock changes, so the economy can save it. */
  onStock?: (stock: BoosterStock) => void;
  /** Called when the player hits a dead end (for streaks and the play log). */
  onDeadEnd?: () => void;
  /** Called after every pour, undo, booster use or restart (for the play log). */
  onEvent?: (event: { type: string; [key: string]: unknown }) => void;
  /** "Next" on the win overlay. */
  nextHref: string;
  nextLabel?: string;
}

/** A small star for the header sign, 5×5 art pixels. */
const MINI_STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.'];

/** The level 1 pointer: a shaded pixel arrow pointing down. */
const GUIDE_ARROW = [
  '.ooooo.',
  '.ohhdo.',
  '.oh#do.',
  '.oh#do.',
  'oooh#doo',
  'oh###ddo',
  '.oh##do.',
  '..oh#o..',
  '...oo...',
];

/** Lift of a selected glass, in art px (the style guide's 7). */
export const LIFT = 7;
const LIFT_MS = 120;
/** Rejection shake, one art-pixel offset per step. */
const SHAKE = [0, -2, 2, -2, 2, -1, 1, 0];
const POUR_MS = 520;
/** Art px above a glass taken by a release badge. */
const BADGE_SPACE = 28;

/**
 * The puzzle screen in pixel art. The renderer composes one 195×422 art
 * buffer per frame; HTML on top holds the header text, a real button over
 * every glass and booster, the dead-end panel and the win overlay.
 */
export class LevelScreen {
  readonly game: Game;
  readonly el: HTMLElement;
  protected readonly theme: Theme;
  protected readonly art: CityLevelArt;
  protected readonly renderer: PixelLevelRenderer;
  protected glassButtons: HTMLButtonElement[] = [];
  protected marks = new Map<number, Mark>();
  private layer: PixelLayer | null = null;
  private offResize: (() => void) | null = null;
  private lifts: number[] = [];
  private liftAnims: ({ cancel: () => void } | null)[] = [];
  private shakes: number[] = [];
  private sparkles = new Map<number, number>();
  private unlocks = new Map<number, number>();
  private pourFrame: PourFrame | null = null;
  /** Rows shown in the target glass while a pour fills it. */
  private targetRows: { index: number; rows: number } | null = null;
  private phase = 0;
  private disposePixi: (() => void) | null = null;
  private frameRequested = false;
  /** The pour being animated. */
  private pouring: { from: number; to: number } | null = null;
  /** Taps that arrive during a pour animation run after it, in order. */
  private queue: number[] = [];
  private destroyed = false;
  private hint: Move | null = null;
  private restarts = 0;
  private wonReported = false;
  private deadEndReported = false;
  private peeking = false;
  private guideMove: Move | null = null;

  constructor(
    protected readonly stage: Stage,
    protected readonly opts: LevelScreenOptions,
  ) {
    this.theme = opts.theme;
    this.art = cityArt(opts.theme);
    this.renderer = new PixelLevelRenderer(opts.theme, this.art);
    this.game = new Game(opts.bottles, { best: opts.best, stock: opts.stock });
    this.el = document.createElement('div');
    this.el.className = 'screen level-screen px-level';
  }

  async mount(): Promise<void> {
    applyTheme(this.stage.el, this.theme);
    this.stage.el.replaceChildren(this.el);
    const { app, dispose, onFrame } = await createPixi(this.stage, STAGE_H, 'xy');
    if (this.destroyed) {
      dispose();
      return;
    }
    this.disposePixi = dispose;
    this.el.prepend(app.canvas);
    // The buffer covers the whole screen: the bar continues past the stage's edges.
    const fit = () => {
      if (!this.renderer.setBleed(this.stage.bleed) && this.layer) return;
      this.layer?.destroy();
      const { w, h, ox, oy } = this.renderer.cv;
      this.layer = new PixelLayer(w, h);
      this.layer.sprite.scale.set(ART);
      this.layer.sprite.position.set(-ART * ox, -ART * oy);
      app.stage.addChild(this.layer.sprite);
      this.draw();
    };
    fit();
    this.offResize = this.stage.onResize(fit);
    // The lamp light flickers between two dither patterns (off with reduced motion).
    if (!reducedMotion()) {
      let last = 0;
      onFrame((ms) => {
        if (ms - last < 1600) return;
        last = ms;
        this.phase = 1 - this.phase;
        this.draw();
      });
    }
    this.el.insertAdjacentHTML('beforeend', this.chromeHtml());
    this.bindChrome();
    this.layout();
    this.render();
    this.opts.onEvent?.({ type: 'start', level: this.opts.number });
    if (this.opts.peekMs) this.startPeek(this.opts.peekMs);
    if (this.opts.parCard) this.showPar();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    if (!this.destroyed && !this.wonReported && this.game.moves > 0)
      this.opts.onEvent?.({ type: 'quit', moves: this.game.moves });
    this.destroyed = true;
    this.liftAnims.forEach((a) => a?.cancel());
    this.offResize?.();
    this.layer?.destroy();
    this.disposePixi?.();
    this.el.remove();
  }

  /** Builds buttons for the current number of bottles and lays the glasses out. */
  protected layout(): void {
    const n = this.game.bottles.length;
    this.renderer.setCount(n);
    const holder = this.el.querySelector('.lv-glasses')!;
    while (this.glassButtons.length < n) {
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
    while (this.glassButtons.length > n) {
      this.glassButtons.pop()!.remove();
      this.lifts.pop();
      this.liftAnims.pop()?.cancel();
      this.shakes.pop();
    }
  }

  protected onGlass(index: number): void {
    if (this.peeking) return;
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
        this.countPour(event.to);
        sfx.play('pour', event.amount);
        void this.animatePour(event.from, event.to, event.amount, bottlesBefore).then(() => {
          if (event.unlocked.length) sfx.play('unlock');
          if (event.completed) sfx.play(this.game.status === 'won' ? 'win' : 'complete');
          else sfx.play('clink');
          if (this.destroyed) return;
          for (const i of event.unlocked) this.playUnlock(i);
          if (event.completed) this.playSparkle(event.to);
          this.afterChange();
          this.render();
          if (!reducedMotion()) this.dip(event.to);
          // Replay queued taps until one starts the next pour (select + target can both be waiting).
          while (this.queue.length > 0 && !this.pouring) this.onGlass(this.queue.shift()!);
        });
        this.render();
        return;
      default:
        break;
    }
    if (before !== this.game.selected || event.type !== 'rejected') this.render();
  }

  /** Flashes a glass red and shakes it in whole art pixels. No error text. */
  protected reject(index: number): void {
    this.marks.set(index, 'reject');
    this.render();
    tween({
      duration: 320,
      ease: linear,
      onUpdate: (t) => {
        this.shakes[index] = SHAKE[Math.min(SHAKE.length - 1, Math.floor(t * SHAKE.length))]!;
        this.draw();
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
      void wait(reducedMotion() ? 0 : 900).then(() => !this.destroyed && this.showWin(result));
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
    this.el.querySelector('.lv-lost')?.remove();
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

  protected markFor(i: number): Mark {
    if (this.marks.has(i)) return this.marks.get(i)!;
    return this.game.selected === i ? 'selected' : 'none';
  }

  /**
   * Pour: the source glass rises to its first tilt frame, swings through
   * three pre-drawn frames until its mouth points into the target, a 2 px
   * stream runs while both glasses change one row at a time, then it swings
   * back. Everything lands on whole art pixels.
   */
  private async animatePour(from: number, to: number, amount: number, before: readonly Bottle[]): Promise<void> {
    if (reducedMotion()) return;
    this.pouring = { from, to };
    const src = this.renderer.layout.slots[from]!;
    const dst = this.renderer.layout.slots[to]!;
    const srcBottle = before[from]!;
    const startRows = srcBottle.units.length * UNIT;
    const pourRows = amount * UNIT;
    const dstStart = before[to]!.units.length * UNIT;
    const drink = this.theme.drinks.find((d) => d.id === srcBottle.units[srcBottle.units.length - 1]!.drink)!.color;
    const dir: 1 | -1 = dst.x >= src.x ? 1 : -1;
    const home = { x: src.x + 13, y: src.y - this.lifts[from]! };
    // At full tilt the lower lip sits just above the target's rim.
    const angle = (TILTS[2] * Math.PI) / 180;
    const lip = { x: Math.round(Math.cos(angle) * 13) * dir, y: Math.round(Math.sin(angle) * 13) };
    const tcx = dst.x + 13;
    const over = { x: tcx - dir * 3 - lip.x, y: dst.y - 9 - lip.y };
    const dstRows = this.renderer.rowsAt(to);
    const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
    const frame = (tilt: number, k: number, srcRows: number, stream?: PourFrame['stream']): PourFrame => ({
      bottle: srcBottle,
      filledRows: srcRows,
      tilt,
      dir,
      pivot: { x: lerp(home.x, over.x, k), y: lerp(home.y, over.y, k) },
      ...(stream ? { stream } : {}),
    });
    await tween({
      duration: POUR_MS,
      ease: linear,
      onUpdate: (t) => {
        if (t <= 0.3) {
          const k = easeInOut(t / 0.3);
          this.pourFrame = frame(k < 0.34 ? 0 : k < 0.67 ? 1 : 2, k, startRows);
          this.targetRows = { index: to, rows: dstStart };
        } else if (t <= 0.75) {
          const k = (t - 0.3) / 0.45;
          const moved = Math.round(pourRows * k);
          const level = dstStart + moved;
          const surface = dstRows[Math.max(0, dstRows.length - 1 - level)]!.y;
          const lipX = over.x + lip.x;
          const lipY = over.y + lip.y;
          this.pourFrame = frame(2, 1, startRows - moved, {
            x0: lipX,
            y0: lipY,
            x1: tcx - 1,
            y1: surface,
            color: drink,
          });
          this.targetRows = { index: to, rows: level };
        } else {
          const k = easeOut((t - 0.75) / 0.25);
          this.pourFrame = frame(k < 0.34 ? 2 : k < 0.67 ? 1 : 0, 1 - k, startRows - pourRows);
          this.targetRows = null;
        }
        this.draw();
      },
    }).done;
    this.pourFrame = null;
    this.targetRows = null;
    this.lifts[from] = 0;
    this.liftAnims[from]?.cancel();
    this.pouring = null;
  }

  private animateLift(i: number, target: number): void {
    if (this.lifts[i] === target) return;
    this.liftAnims[i]?.cancel();
    const from = this.lifts[i]!;
    this.liftAnims[i] = tween({
      duration: LIFT_MS,
      ease: easeOut,
      onUpdate: (t) => {
        this.lifts[i] = Math.round(from + (target - from) * t);
        this.placeButton(i);
        this.draw();
      },
    });
  }

  /** The target glass dips a pixel or two as the pour lands in it. */
  private dip(i: number): void {
    this.liftAnims[i]?.cancel();
    this.liftAnims[i] = tween({
      duration: 180,
      ease: linear,
      onUpdate: (t) => {
        this.lifts[i] = t < 0.33 ? -1 : t < 0.66 ? -2 : t < 1 ? -1 : 0;
        this.draw();
      },
    });
  }

  /** Three sparkle frames over a completed glass, with its rim lit. */
  private playSparkle(i: number): void {
    tween({
      duration: reducedMotion() ? 0 : 420,
      ease: linear,
      onUpdate: (t) => {
        if (t >= 1) this.sparkles.delete(i);
        else this.sparkles.set(i, Math.min(2, Math.floor(t * 3)));
        this.draw();
      },
    });
  }

  /** The chains and padlock drop and dither away. */
  private playUnlock(i: number): void {
    tween({
      duration: reducedMotion() ? 0 : 520,
      ease: linear,
      onUpdate: (t) => {
        if (t >= 1) this.unlocks.delete(i);
        else this.unlocks.set(i, t);
        this.draw();
      },
    });
  }

  /** Asks for one composed frame on the next animation frame. */
  private draw(): void {
    if (this.frameRequested || !this.layer) return;
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      if (this.destroyed || !this.layer) return;
      this.layer.put(this.renderer.render(this.frame()));
    });
  }

  private frame() {
    const g = this.game;
    const glasses: GlassFrame[] = g.bottles.map((bottle, i) => ({
      bottle: this.pouring?.to === i || this.pouring?.from === i ? this.pourBottle(i) : bottle,
      mark: this.markFor(i),
      lift: this.lifts[i] ?? 0,
      dx: this.shakes[i] ?? 0,
      ...(this.targetRows?.index === i ? { filledRows: this.targetRows.rows } : {}),
      ...(this.pourFrame && this.pouring?.from === i ? { skip: true } : {}),
      ...(this.sparkles.has(i) ? { sparkle: this.sparkles.get(i)! } : {}),
      ...(this.unlocks.has(i) ? { unlock: this.unlocks.get(i)! } : {}),
      ...(this.peeking ? { peek: true } : {}),
    }));
    return {
      glasses,
      ...(this.pourFrame ? { pour: this.pourFrame } : {}),
      counts: [g.stock.undo, g.stock.extraGlass, g.stock.hint] as [number, number, number],
      usable: [g.canUndo(), g.canAddGlass(), g.canHint()] as [boolean, boolean, boolean],
      boosters: this.opts.boosters !== false,
      phase: this.phase,
    };
  }

  /** During a pour the target shows its new contents (filled row by row). */
  private pourBottle(i: number): Bottle {
    return this.game.bottles[i]!;
  }

  /** Puts glass i's button over the glass (and its badge, if any). */
  private placeButton(i: number): void {
    const slot = this.renderer.layout.slots[i]!;
    const b = this.game.bottles[i]!;
    const badge = b.lockedUntil || b.only ? BADGE_SPACE : 0;
    const btn = this.glassButtons[i]!;
    const w = Math.min(this.renderer.layout.spacing, 34);
    btn.style.left = `${(slot.x + SLOT_W / 2 - w / 2) * ART}px`;
    btn.style.top = `${(slot.y - (this.lifts[i] ?? 0) - badge) * ART}px`;
    btn.style.width = `${w * ART}px`;
    btn.style.height = `${(GLASS_H + badge) * ART}px`;
  }

  /** Redraws the art and updates every label, button and panel from the game state. */
  render(): void {
    const g = this.game;
    g.bottles.forEach((bottle, i) => {
      const btn = this.glassButtons[i]!;
      btn.setAttribute('aria-label', this.glassLabel(i, bottle));
      btn.setAttribute('aria-pressed', String(g.selected === i));
      if (!this.pouring || (this.pouring.from !== i && this.pouring.to !== i))
        this.animateLift(i, g.selected === i ? LIFT : 0);
      this.placeButton(i);
    });
    this.renderSign();
    this.booster('undo', g.stock.undo, g.canUndo());
    this.booster('glass', g.stock.extraGlass, g.canAddGlass());
    this.booster('hint', g.stock.hint, g.canHint());
    this.renderDeadEnd();
    this.renderGuide();
    this.draw();
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
          .map((u) => (u.hidden && !this.peeking ? 'hidden' : name(u.drink)))
          .join(', ')}`,
      );
    return parts.join(', ');
  }

  private text(sel: string, value: string): void {
    const n = this.el.querySelector(sel);
    if (n) n.textContent = value;
  }

  /** Memory training: everything visible for a while, with a countdown, then covered. */
  private startPeek(ms: number): void {
    this.peeking = true;
    const banner = document.createElement('div');
    banner.className = 'lv-peek px-panel';
    banner.setAttribute('role', 'status');
    this.el.appendChild(banner);
    const end = Date.now() + ms;
    const tick = () => {
      if (this.destroyed) return;
      const left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        this.peeking = false;
        banner.remove();
        this.render();
        return;
      }
      banner.textContent = `Remember the glasses · ${left}`;
      setTimeout(tick, 200);
    };
    tick();
    this.render();
  }

  private booster(kind: 'undo' | 'glass' | 'hint', count: number, usable: boolean): void {
    const b = this.el.querySelector<HTMLButtonElement>(`.booster-${kind}`);
    if (!b) return;
    b.disabled = !usable || this.opts.boosters === false;
    b.hidden = this.opts.boosters === false;
    const label = { undo: 'Undo', glass: 'Add an empty glass', hint: 'Hint' }[kind];
    b.setAttribute('aria-label', `${label}, ${count} left`);
  }

  private renderDeadEnd(): void {
    const panel = this.el.querySelector<HTMLElement>('.lv-deadend')!;
    const show = this.game.status === 'deadEnd';
    const wasShown = !panel.hidden;
    panel.hidden = !show;
    this.el.querySelector<HTMLElement>('.lv-dim')!.hidden = !show;
    if (!show) return;
    panel.querySelector<HTMLButtonElement>('.de-undo')!.disabled = !this.game.canUndo() || this.opts.boosters === false;
    const glass = panel.querySelector<HTMLButtonElement>('.de-glass')!;
    glass.disabled = !this.game.canAddGlass() || this.opts.boosters === false;
    if (!wasShown) panel.querySelector<HTMLButtonElement>('.de-actions button:not(:disabled)')?.focus();
  }

  /** Level 1 pointer: points at the source glass, then at the target, until the first pour. */
  private renderGuide(): void {
    const pointer = this.el.querySelector<HTMLElement>('.lv-guide');
    if (!pointer) return;
    // The bartender talks the first pours through, then leaves the player to it.
    const host = this.el.querySelector<HTMLElement>('.lv-host');
    if (host) {
      const best = this.game.best;
      const say =
        !this.opts.guide || this.game.status !== 'playing'
          ? ''
          : this.game.moves > 0
            ? `Every pour counts: sort it in ${best} ${best === 1 ? 'pour' : 'pours'} for three stars. The sign up top counts them down.`
            : this.game.selected === null
              ? 'Tap a glass to pick it up.'
              : 'Now tap the glass to pour into.';
      host.hidden = !say;
      host.querySelector('.lv-host-say')!.textContent = say;
      // While the bartender talks about the count, the sign lights up.
      this.el.querySelector('.lv-moves')!.classList.toggle('is-taught', !!say && this.game.moves > 0);
    }
    if (!this.opts.guide || this.game.moves > 0 || this.game.status !== 'playing') {
      pointer.hidden = true;
      return;
    }
    const move = this.guideMove ?? (this.guideMove = this.game.suggest());
    if (!move) return;
    const target = this.game.selected === move.from ? move.to : move.from;
    const slot = this.renderer.layout.slots[target]!;
    pointer.hidden = false;
    pointer.style.left = `${(slot.x + SLOT_W / 2) * ART - 22}px`;
    pointer.style.top = `${(slot.y - (this.lifts[target] ?? 0)) * ART - 56}px`;
    pointer.dataset.target = String(target);
  }

  /** The header sign: a countdown to the best result still possible (see pour-sign.ts). */
  private renderSign(): void {
    const g = this.game;
    const sign = pourSign(g.moves, g.best, g.extraGlassUsed, g.status === 'won');
    const el = this.el.querySelector<HTMLElement>('.lv-moves');
    if (!el) return;
    const star = pixelSvg(MINI_STAR, { '#': this.theme.colors.starDone }, 2);
    this.text('.lv-move-count', String(sign.count));
    const unit = sign.total ? 'pours' : sign.count === 1 ? 'pour left' : 'pours left';
    el.querySelector('.lv-move-label')!.innerHTML =
      `${unit}<br>for <span class="lv-move-stars">${star.repeat(sign.stars)}</span>`;
    el.dataset.stars = String(sign.stars);
    // The last three pours of a countdown get louder (see the CSS for [data-left]).
    const left = urgency(sign);
    if (left) el.dataset.left = String(left);
    else delete el.dataset.left;
    let label = pourSignLabel(g.moves, g.best, sign);
    const before = this.lastSign;
    this.lastSign = sign;
    if (before && sign.stars < before.stars) {
      this.lossNote = { moves: g.moves, text: starLossMessage(before, sign, g.extraGlassUsed) };
      this.starLost(el, this.lossNote.text);
    }
    // The sign is redrawn after the pour animation too; keep the news for the pour that lost it.
    if (this.lossNote?.moves === g.moves) label = `${this.lossNote.text}. ${label}`;
    el.setAttribute('aria-label', `${label}. Show par`);
    this.text('.lv-moves-status', label);
  }

  private lastSign: PourSign | null = null;
  private lossNote: { moves: number; text: string } | null = null;

  /** Losing a star is a moment: the sign shakes red and a banner under it says what's left. */
  private starLost(sign: HTMLElement, message: string): void {
    this.flash(sign, 'is-drop');
    this.el.querySelector('.lv-lost')?.remove();
    const { sign: at } = this.art;
    const banner = document.createElement('div');
    banner.className = 'lv-lost';
    banner.setAttribute('aria-hidden', 'true');
    banner.style.right = `${STAGE_W - (at.x + at.w) * ART}px`;
    banner.style.top = `${(at.y + at.h) * ART + 8}px`;
    banner.innerHTML = `<span class="lv-lost-star">${icons.star(this.theme.colors.starDone, 26)}</span><span>${esc(message)}</span>`;
    this.el.appendChild(banner);
    setTimeout(() => banner.remove(), 3200);
  }

  /** Restarts a CSS animation by removing and re-adding its class. */
  private flash(el: HTMLElement, cls: string): void {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  /** Every pour is counted where the player is looking: "+1" over the glass, and the sign pulses. */
  private countPour(to: number): void {
    const sign = this.el.querySelector<HTMLElement>('.lv-moves');
    if (sign) this.flash(sign, 'is-bump');
    if (reducedMotion()) return;
    const slot = this.renderer.layout.slots[to];
    if (!slot) return;
    const plus = document.createElement('div');
    plus.className = 'lv-plus';
    plus.setAttribute('aria-hidden', 'true');
    plus.textContent = '+1';
    plus.style.left = `${(slot.x + SLOT_W / 2) * ART - 20}px`;
    plus.style.top = `${(slot.y - (this.lifts[to] ?? 0)) * ART - 40}px`;
    this.el.appendChild(plus);
    setTimeout(() => plus.remove(), 900);
  }

  /** The par card: this level's par and star bands, with the bartender. Opened by the sign. */
  private showPar(): void {
    if (this.el.querySelector('.lv-par') || this.game.status === 'won') return;
    const best = this.game.best;
    const two = twoStarPours(best);
    const star = pixelSvg(MINI_STAR, { '#': '#C08A1A' }, 2);
    const kicker = this.opts.subtitle ? 'Par' : `Level ${this.opts.number} · par`;
    const sheet = document.createElement('div');
    sheet.className = 'sheet-backdrop lv-par';
    sheet.innerHTML = `
      <section class="lv-par-card" role="dialog" aria-modal="true" aria-labelledby="par-title">
        ${bartenderImg(this.theme.id, 'neutral', 'par-barkeep')}
        <div class="par-kicker">${esc(kicker)}</div>
        <div class="par-num" id="par-title" aria-label="Par ${best} pours">${best}</div>
        <div class="par-unit">pours</div>
        <p>Sort every drink in ${best} pours or fewer for three stars. Every pour counts, and undo doesn't give it back.</p>
        <div class="par-bands">
          <span>${star.repeat(3)} ${best} or fewer</span>
          <span>${star.repeat(2)} up to ${two}</span>
          <span>${star} more</span>
        </div>
        <button class="btn btn-primary par-go">Let's pour</button>
      </section>`;
    this.el.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.addEventListener('click', (e) => e.target === sheet && close());
    sheet.querySelector('.par-go')!.addEventListener('click', close);
    sheet.querySelector<HTMLElement>('.par-go')!.focus();
  }

  /** The header's restart asks first once there are pours to lose. */
  private askRestart(): void {
    const moves = this.game.moves;
    if (moves === 0 || this.game.status === 'won') return this.restart();
    if (this.el.querySelector('.lv-confirm')) return;
    const sheet = document.createElement('div');
    sheet.className = 'sheet-backdrop lv-confirm';
    sheet.innerHTML = `
      <section class="lv-confirm-card px-panel" role="alertdialog" aria-modal="true" aria-labelledby="rs-title" aria-describedby="rs-sub">
        <h2 class="de-title" id="rs-title">Start this level again?</h2>
        <p class="de-sub" id="rs-sub">Your ${moves} ${moves === 1 ? 'pour' : 'pours'} so far won't count.</p>
        <div class="de-actions">
          <button class="btn btn-outline rs-keep">Keep pouring</button>
          <button class="btn btn-primary rs-go">Restart</button>
        </div>
      </section>`;
    this.el.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.addEventListener('click', (e) => e.target === sheet && close());
    sheet.querySelector('.rs-keep')!.addEventListener('click', close);
    sheet.querySelector('.rs-go')!.addEventListener('click', () => {
      close();
      this.restart();
    });
    sheet.querySelector<HTMLElement>('.rs-keep')!.focus();
  }

  private showWin(r: LevelResult): void {
    const k = this.theme.colors;
    const verdict = r.perfect
      ? 'Perfect pour'
      : r.moves < r.best
        ? 'You beat the computer'
        : r.stars === 2
          ? 'Nice pour'
          : 'Cleared';
    const stars = [1, 2, 3].map((i) => icons.star(i <= r.stars ? k.starDone : k.starEmpty, 44)).join('');
    const overlay = this.el.querySelector<HTMLElement>('.lv-overlay')!;
    overlay.innerHTML = `
      <div class="win-card px-panel" role="dialog" aria-modal="true" aria-labelledby="win-verdict">
        ${bartenderImg(this.theme.id, 'cheer', 'win-barkeep')}
        <div class="win-kicker">${esc(this.opts.subtitle ? "Tonight's pour cleared" : `Level ${r.number} cleared`)}</div>
        <div class="win-stars" aria-label="${r.stars} of 3 stars">${stars}</div>
        <div class="win-verdict" id="win-verdict">${verdict}</div>
        <div class="win-moves">${r.moves} pours · par ${r.best}</div>
        ${this.opts.guide ? '<p class="win-tip">The fewer pours, the more stars.</p>' : ''}
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
    on('.lv-restart', () => this.askRestart());
    on('.lv-moves', () => this.showPar());
    on('.de-undo', () => this.undo());
    on('.de-glass', () => this.addGlass());
    on('.de-restart', () => this.restart());
  }

  /** HTML over the art. Positions are art pixels × 2 (logical px). */
  private chromeHtml(): string {
    const t = this.theme;
    const { sign, mats, text } = this.art;
    const a = (v: number) => v * ART;
    const booster = (kind: string, label: string, i: number) => `
      <button class="booster booster-${kind}" style="left:${a(mats.centres[i]! - 22)}px;top:${a(mats.y - 8)}px;width:${a(44)}px">
        <span class="booster-label">${label}</span>
      </button>`;
    return `
      <a data-up class="lv-back" href="${esc(this.opts.backHref)}" aria-label="Back to map"></a>
      <div class="lv-title" style="color:${text.title}">
        <h1 class="lv-bar">${esc(this.opts.barName)}</h1>
        <div class="lv-sub" style="color:${text.sub}">${esc(this.opts.subtitle ?? `${t.name} · Level ${this.opts.number}`)}</div>
      </div>
      <button class="lv-moves" style="left:${a(sign.x)}px;top:${a(sign.y)}px;width:${a(sign.w)}px;height:${a(sign.h)}px;color:${text.title}">
        <b class="lv-move-count"></b><span class="lv-move-label" style="color:${text.sub}"></span>
      </button>
      <span class="sr-only lv-moves-status" role="status" aria-live="polite"></span>
      <button class="lv-restart" aria-label="Restart level" style="right:${STAGE_W - a(sign.x + sign.w)}px;top:${a(sign.y + sign.h) + 8}px">${icons.restart('#2A1A10')}<span>Restart</span></button>
      <div class="lv-glasses"></div>
      <div class="lv-host" hidden>${bartenderImg(this.theme.id, 'neutral', 'lv-host-img')}<p class="lv-host-say px-panel" aria-live="polite"></p></div>
      <div class="lv-guide" hidden aria-hidden="true">${pixelSvg(GUIDE_ARROW, { o: '#1A0F08', '#': '#F3E6CC', h: '#FFFFFF', d: '#B8A888' }, 4)}</div>
      <div class="lv-counter" style="color:${text.title}">
        ${booster('undo', 'Undo', 0)}
        ${booster('glass', 'Extra glass', 1)}
        ${booster('hint', 'Hint', 2)}
      </div>
      <div class="lv-dim" hidden></div>
      <section class="lv-deadend px-panel" hidden aria-labelledby="de-title" role="alertdialog">
        ${bartenderImg(this.theme.id, 'think', 'de-barkeep')}
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
