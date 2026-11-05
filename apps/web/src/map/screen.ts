import type { PackLevel } from '@pour/engine';
import type { Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { LevelEntry } from '../levels.js';
import { Container } from 'pixi.js';
import { reducedMotion } from '../anim.js';
import { PixelCanvas } from '../pixel/canvas.js';
import { PixelLayer } from '../pixel/layer.js';
import { coinRadius, drawMap, pulseRing, type MapNode, type MapScene } from '../pixel/map.js';
import { landmarkFor } from '../pixel/landmarks.js';
import { createPixi, invalidate } from '../pixi-util.js';
import { ART, STAGE_H, type Stage } from '../stage.js';
import { applyTheme, color } from '../theme-css.js';
import { mapLayout, pathX, scrollFor, type MapLayout } from './path.js';

export interface MapScreenOptions {
  theme: Theme;
  /** Every level of the city, in order. */
  levels: LevelEntry[];
  progress: Progress;
  /** Bar names of the next city, for the "levels left" line on the last bar. */
  backHref: string;
  /** Extra DOM shown under the panel (tab bar). */
  footer?: string;
  /** Family members to place on their current levels (family feature). */
  members?: Promise<{ name: string; color: string; current: number; me: boolean }[]>;
  /** Level to select instead of the current one. */
  focus?: number;
}

type NodeState = 'done' | 'current' | 'locked';

/**
 * City map: a winding path of level nodes (Two Dots style), drawn as a pixel
 * scene. The world sits behind a native scrolling layer that holds a real
 * button per level; it moves in whole art pixels.
 */
export class MapScreen {
  readonly el = document.createElement('div');
  private disposePixi: (() => void) | null = null;
  private offResize: (() => void) | null = null;
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
    const { app, dispose, onFrame } = await createPixi(this.stage, STAGE_H, 'x');
    if (this.destroyed) return dispose();
    this.disposePixi = dispose;
    const scene = this.scene();
    const landmark = await landmarkFor(theme.id);
    if (this.destroyed) return;
    const world = new Container();
    world.scale.set(ART);
    // The world is drawn wider than the stage on wide screens: more city either side.
    let built = '';
    const build = () => {
      const { l, r } = this.stage.bleed;
      if (built === `${l},${r}`) return;
      built = `${l},${r}`;
      world
        .removeChildren()
        .filter((c) => c !== pulse?.sprite)
        .forEach((c) => c.destroy({ texture: true, textureSource: true }));
      const art = drawMap(theme, scene, { l, r }, landmark);
      // Chunks keep each texture within every GPU's size limit.
      const CHUNK = 1024;
      for (let y0 = 0; y0 < art.h; y0 += CHUNK) {
        const h = Math.min(CHUNK, art.h - y0);
        const part = new PixelCanvas(art.w, h);
        part.data.set(art.data.subarray(y0 * art.w, (y0 + h) * art.w));
        const layer = new PixelLayer(art.w, h);
        layer.put(part);
        layer.sprite.position.set(-l, y0);
        world.addChild(layer.sprite);
      }
      if (pulse) world.addChild(pulse.sprite);
      invalidate();
    };
    // The current level's ring pulses in whole-pixel steps.
    const current = scene.nodes.find((n) => n.state === 'current');
    let pulse: PixelLayer | null = null;
    if (current) {
      const r = coinRadius(current);
      const ring = new PixelLayer((r + 7) * 2 + 1, (r + 7) * 2 + 1);
      pulse = ring;
      ring.put(pulseRing(theme, r, 0));
      ring.sprite.position.set(current.x - r - 7, current.y - r - 7);
      if (!reducedMotion()) {
        let last = 0;
        let frame = 0;
        onFrame((ms) => {
          if (ms - last < 260) return;
          last = ms;
          frame = (frame + 1) % 3;
          ring.put(pulseRing(theme, r, frame));
        });
      }
    }
    build();
    this.offResize = this.stage.onResize(build);
    app.stage.addChild(world);
    this.el.prepend(app.canvas);
    const scroller = this.el.querySelector<HTMLElement>('.map-scroll')!;
    const sync = () => {
      world.y = -ART * Math.round(scroller.scrollTop / ART);
      invalidate();
    };
    scroller.addEventListener('scroll', sync, { passive: true });
    this.el.querySelectorAll<HTMLButtonElement>('.map-node').forEach((b) =>
      b.addEventListener('click', () => {
        const n = Number(b.dataset.level);
        if (this.state(n) === 'locked') return;
        this.select(n);
      }),
    );
    this.renderPanel();
    void this.opts.members?.then((ms) => this.placeMembers(ms));
    const i = this.indexOf(this.selected);
    scroller.scrollTop = scrollFor(this.layout.nodes[i]!.y, STAGE_H, this.layout.height, this.opts.footer ? 280 : 196);
    sync();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.destroyed = true;
    this.offResize?.();
    this.disposePixi?.();
    this.el.remove();
  }

  private placeMembers(members: { name: string; color: string; current: number; me: boolean }[]): void {
    const world = this.el.querySelector('.map-world');
    if (!world) return;
    const perLevel = new Map<number, number>();
    for (const m of members) {
      const i = this.indexOf(m.current);
      if (m.me || i < 0) continue;
      const k = perLevel.get(m.current) ?? 0;
      perLevel.set(m.current, k + 1);
      const { x, y } = this.layout.nodes[i]!;
      const left = x < 195 ? x - 58 - k * 18 : x + 32 + k * 18;
      world.insertAdjacentHTML(
        'beforeend',
        `<span class="map-avatar" style="left:${left}px;top:${y - 40}px" aria-label="${esc(m.name)} is here" role="img"><span class="fam-avatar" style="background:${m.color};width:26px;height:26px">${esc(m.name[0]!.toUpperCase())}</span></span>`,
      );
    }
  }

  /** The map in art pixels: path, gates and node coins. */
  private scene(): MapScene {
    const { levels, progress } = this.opts;
    const current = progress.data.current;
    const nextSuper = levels.find((e) => e.level.difficulty === 'superHard' && e.level.number >= current)?.level.number;
    const h = this.layout.height;
    const nodes: MapNode[] = levels.map((e, i) => {
      const n = e.level.number;
      const p = this.layout.nodes[i]!;
      return {
        x: Math.round(p.x / ART),
        y: Math.round(p.y / ART),
        state: this.state(n),
        kind: e.level.difficulty,
        stars: progress.level(n)?.stars ?? 0,
        flagged: n === nextSuper && this.state(n) === 'locked',
      };
    });
    return {
      height: Math.ceil(h / ART),
      pathX: (y) => pathX(y * ART, h) / ART,
      gates: this.layout.gates.map((g) => Math.round(g / ART)),
      nodes,
    };
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
    const barWord = capital(this.opts.theme.passport?.barWord ?? 'bar');
    const nextBar = this.opts.levels.find((e) => e.pack.bar === pack.bar + 1)?.pack;
    const left = lastOfBar - Math.max(this.opts.progress.data.current, level.number) + 1;
    const leftLine = nextBar
      ? `<span>${left} ${left === 1 ? 'level' : 'levels'} left to</span> <b>${barWord} ${nextBar.bar} · ${esc(nextBar.name)}</b>`
      : `<span>${left} ${left === 1 ? 'level' : 'levels'} left in</span> <b>${esc(this.opts.theme.name)}</b>`;
    const record = this.opts.progress.level(level.number);
    this.el.querySelector('.map-panel-body')!.innerHTML = `
      <div class="map-panel-top">
        <div>
          <h2 class="map-level">Level ${level.number}</h2>
          <div class="map-level-sub">${esc(pack.name)} · par ${level.best} pours${record ? ` · yours ${record.bestMoves}` : ''}</div>
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
    // Touch target at least 44 px, centred on the pixel coin.
    const size = Math.max(44, (coinRadius({ state, kind }) * 2 + 1) * ART);
    const label = [
      `Level ${n}`,
      kind === 'hard' ? 'hard' : kind === 'superHard' ? 'super hard' : '',
      state === 'current' ? 'play now' : state === 'locked' ? 'locked' : `${stars} ${stars === 1 ? 'star' : 'stars'}`,
    ]
      .filter(Boolean)
      .join(', ');
    const flag =
      superHardFlag === n
        ? `<div class="map-flag px-tag" style="left:${x + 32}px;top:${y - 15}px" aria-hidden="true">Super hard</div>`
        : '';
    return `<button class="map-node is-${state} kind-${kind}${n === this.selected ? ' is-selected' : ''}" data-level="${n}"
      style="left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px" aria-label="${label}"
      ${state === 'locked' ? 'aria-disabled="true"' : ''}>${n}</button>${flag}`;
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
          `<div class="map-gate" style="top:${y - 44}px">${capital(theme.passport?.barWord ?? 'bar')} ${b + 2} · ${esc(levels[(b + 1) * 20]?.pack.name ?? '')}</div>`,
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
          <a data-up class="icon-btn" href="${esc(this.opts.backHref)}" aria-label="Back to passport">${icons.back(k.text)}</a>
          <div>
            <h1 class="map-city">${esc(theme.name)}</h1>
            <div class="map-bar">${capital(theme.passport?.barWord ?? 'bar')} ${here.bar} · ${esc(here.name)}</div>
          </div>
        </div>
        <div class="map-total" aria-label="${cityStars} stars in ${esc(theme.name)}"><span style="color:${color(theme, 'starDone', k.accent)}">★</span>${cityStars}</div>
      </header>
      <section class="map-panel" aria-label="Selected level"><div class="map-panel-body"></div>${this.opts.footer ?? ''}</section>`;
  }
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);
