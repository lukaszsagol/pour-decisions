import type { PackLevel } from '@pour/engine';
import type { Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { LevelEntry } from '../levels.js';
import { createPixi } from '../pixi-util.js';
import { STAGE_H, type Stage } from '../stage.js';
import { applyTheme, color } from '../theme-css.js';
import { mapLayout, scrollFor, type MapLayout } from './path.js';
import { drawMapWorld } from './world.js';

export interface MapScreenOptions {
  theme: Theme;
  /** Every level of the city, in order. */
  levels: LevelEntry[];
  progress: Progress;
  /** Bar names of the next city, for the "levels left" line on the last bar. */
  backHref: string;
  /** Extra DOM shown under the panel (tab bar). */
  footer?: string;
  /** Level to select instead of the current one. */
  focus?: number;
}

type NodeState = 'done' | 'current' | 'locked';

/**
 * City map: a winding path of level nodes (Two Dots style). Pixi draws the
 * world behind a native scrolling layer that holds a real button per level.
 */
export class MapScreen {
  readonly el = document.createElement('div');
  private disposePixi: (() => void) | null = null;
  private destroyed = false;
  private layout: MapLayout;
  private selected: number;

  constructor(
    private readonly stage: Stage,
    private readonly opts: MapScreenOptions,
  ) {
    this.el.className = 'screen map-screen';
    this.layout = mapLayout(opts.levels.length);
    const first = opts.levels[0]!.level.number;
    const last = opts.levels[opts.levels.length - 1]!.level.number;
    this.selected = opts.focus ?? Math.min(Math.max(opts.progress.data.current, first), last);
  }

  private state(n: number): NodeState {
    const current = this.opts.progress.data.current;
    if (this.opts.progress.level(n)) return n === current ? 'current' : 'done';
    return n === current ? 'current' : n < current ? 'done' : 'locked';
  }

  async mount(): Promise<void> {
    const { theme } = this.opts;
    applyTheme(this.stage.el, theme);
    this.stage.el.replaceChildren(this.el);
    this.el.innerHTML = this.html();
    const { app, dispose } = await createPixi(this.stage);
    if (this.destroyed) return dispose();
    this.disposePixi = dispose;
    const world = drawMapWorld(theme, this.layout);
    app.stage.addChild(world);
    this.el.prepend(app.canvas);
    const scroller = this.el.querySelector<HTMLElement>('.map-scroll')!;
    const sync = () => (world.y = -scroller.scrollTop);
    scroller.addEventListener('scroll', sync, { passive: true });
    this.el.querySelectorAll<HTMLButtonElement>('.map-node').forEach((b) =>
      b.addEventListener('click', () => {
        const n = Number(b.dataset.level);
        if (this.state(n) === 'locked') return;
        this.select(n);
      }),
    );
    this.renderPanel();
    const i = this.indexOf(this.selected);
    scroller.scrollTop = scrollFor(this.layout.nodes[i]!.y, STAGE_H, this.layout.height);
    sync();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.destroyed = true;
    this.disposePixi?.();
    this.el.remove();
  }

  private indexOf(n: number): number {
    return this.opts.levels.findIndex((e) => e.level.number === n);
  }

  private select(n: number): void {
    this.selected = n;
    this.el
      .querySelectorAll('.map-node')
      .forEach((b) => b.classList.toggle('is-selected', Number((b as HTMLElement).dataset.level) === n));
    this.renderPanel();
  }

  private renderPanel(): void {
    const entry = this.opts.levels[this.indexOf(this.selected)]!;
    const { level, pack } = entry;
    const stock = this.opts.progress.data.stock;
    const k = this.opts.theme.colors;
    const chip = (svg: string, n: number, label: string) =>
      `<div class="map-chip" aria-label="${n} ${label}">${svg.replace(/width="26" height="26"/, 'width="16" height="16"')}${n}</div>`;
    const lastOfBar = pack.levels[pack.levels.length - 1]!.number;
    const nextBar = this.opts.levels.find((e) => e.pack.bar === pack.bar + 1)?.pack;
    const left = lastOfBar - Math.max(this.opts.progress.data.current, level.number) + 1;
    const leftLine = nextBar
      ? `<span>${left} ${left === 1 ? 'level' : 'levels'} left to</span> <b>Bar ${nextBar.bar} · ${esc(nextBar.name)}</b>`
      : `<span>${left} ${left === 1 ? 'level' : 'levels'} left in</span> <b>${esc(this.opts.theme.name)}</b>`;
    const record = this.opts.progress.level(level.number);
    this.el.querySelector('.map-panel-body')!.innerHTML = `
      <div class="map-panel-top">
        <div>
          <h2 class="map-level">Level ${level.number}</h2>
          <div class="map-level-sub">${esc(pack.name)} · best ${level.best} moves${record ? ` · yours ${record.bestMoves}` : ''}</div>
        </div>
        <div class="map-chips">
          ${chip(icons.undo(k.starDone, 2), stock.undo, 'undo')}
          ${chip(icons.glass(k.starDone, 2), stock.extraGlass, 'extra glass')}
          ${chip(icons.hint(k.starDone, 2), stock.hint, 'hint')}
        </div>
      </div>
      <a class="btn btn-primary map-play" href="#/level/${level.number}">${record ? 'Replay' : 'Play'} level ${level.number}</a>
      <div class="map-left">${level.number >= lastOfBar && !nextBar ? '' : leftLine}</div>`;
  }

  private nodeHtml(level: PackLevel, i: number, superHardFlag: number | null): string {
    const n = level.number;
    const { x, y } = this.layout.nodes[i]!;
    const state = this.state(n);
    const stars = this.opts.progress.level(n)?.stars ?? 0;
    const kind = level.difficulty;
    const size = state === 'current' ? 52 : kind !== 'normal' && state === 'locked' ? 52 : kind !== 'normal' ? 48 : 40;
    const label = [
      `Level ${n}`,
      kind === 'hard' ? 'hard' : kind === 'superHard' ? 'super hard' : '',
      state === 'current' ? 'play now' : state === 'locked' ? 'locked' : `${stars} ${stars === 1 ? 'star' : 'stars'}`,
    ]
      .filter(Boolean)
      .join(', ');
    const starRow =
      state === 'done'
        ? `<div class="map-stars" style="left:${x - 26}px;top:${y + size / 2 + 2}px" aria-hidden="true"><span class="on">${'★'.repeat(stars)}</span><span class="off">${'★'.repeat(3 - stars)}</span></div>`
        : '';
    const ring =
      state === 'current'
        ? `<div class="map-ring" style="left:${x - 36}px;top:${y - 36}px" aria-hidden="true"></div>`
        : '';
    const flag =
      superHardFlag === n
        ? `<div class="map-flag" style="left:${x + 35}px;top:${y - 16}px" aria-hidden="true">Super hard</div>`
        : '';
    return `${ring}<button class="map-node is-${state} kind-${kind}${n === this.selected ? ' is-selected' : ''}" data-level="${n}"
      style="left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px" aria-label="${label}"
      ${state === 'locked' ? 'aria-disabled="true"' : ''}>${n}</button>${starRow}${flag}`;
  }

  private html(): string {
    const { theme, levels, progress } = this.opts;
    const k = theme.colors;
    const current = progress.data.current;
    const nextSuper =
      levels.find((e) => e.level.difficulty === 'superHard' && e.level.number >= current)?.level.number ?? null;
    const first = levels[0]!.level.number;
    const cityStars = progress.totalStars(first, levels[levels.length - 1]!.level.number);
    const here =
      levels[this.indexOf(Math.min(Math.max(current, first), levels[levels.length - 1]!.level.number))]!.pack;
    const gates = this.layout.gates
      .map(
        (y, b) =>
          `<div class="map-gate" style="top:${y - 44}px">Bar ${b + 2} · ${esc(levels[(b + 1) * 20]?.pack.name ?? '')}</div>`,
      )
      .join('');
    return `
      <div class="map-scroll">
        <div class="map-world" style="height:${this.layout.height}px">
          ${gates}
          ${levels.map((e, i) => this.nodeHtml(e.level, i, nextSuper)).join('')}
        </div>
      </div>
      <header class="map-header">
        <div class="map-title">
          <a class="icon-btn" href="${esc(this.opts.backHref)}" aria-label="Back to passport">${icons.back(k.text)}</a>
          <div>
            <h1 class="map-city">${esc(theme.name)}</h1>
            <div class="map-bar">Bar ${here.bar} · ${esc(here.name)}</div>
          </div>
        </div>
        <div class="map-total" aria-label="${cityStars} stars in ${esc(theme.name)}"><span style="color:${color(theme, 'starDone', k.accent)}">★</span>${cityStars}</div>
      </header>
      <section class="map-panel" aria-label="Selected level"><div class="map-panel-body"></div>${this.opts.footer ?? ''}</section>`;
  }
}
