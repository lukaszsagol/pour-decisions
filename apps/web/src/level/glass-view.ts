import type { Bottle } from '@pour/engine';
import { drinkById, type Theme } from '@pour/themes';
import { Container, Graphics } from 'pixi.js';
import { box } from '../pixi-util.js';
import { color } from '../theme-css.js';
import { onlySlots, skinFor, type BlockerSkin, type SkinContext } from './skins.js';
import { baseHeight, glassGeometry, SLOT_H, SLOT_W, unitRects, type GlassGeometry } from './geometry.js';

export type GlassMark = 'none' | 'selected' | 'hint' | 'reject';

export interface GlassState {
  bottle: Bottle;
  mark: GlassMark;
  /**
   * Visible liquid in units (may be fractional) while a pour animates. The
   * bottle's units are drawn up to this level; the rest stay empty.
   */
  level?: number;
}

/** Top-left of the glass body inside its slot. */
export function bodyOrigin(g: GlassGeometry): { x: number; y: number } {
  return { x: (SLOT_W - g.bodyW) / 2, y: SLOT_H - baseHeight(g) - g.bodyH };
}

/**
 * One glass drawn in Pixi. Its pivot is the centre of the mouth, so pours
 * can tilt it around the rim; `mouth` gives that point in slot coordinates.
 * Redraw after every state change.
 */
export class GlassView extends Container {
  readonly geometry: GlassGeometry;
  readonly mouth: { x: number; y: number };
  private readonly glow = new Graphics();
  private readonly gfx = new Graphics();
  private readonly surface = new Graphics();
  private readonly overlay = new Container();
  /** Top edge and width of the topmost visible unit, for the surface wobble. */
  private surfaceLine: { x: number; y: number; w: number } | null = null;
  private readonly phase = Math.random() * Math.PI * 2;
  private readonly skin: BlockerSkin;

  constructor(private readonly theme: Theme) {
    super();
    this.geometry = glassGeometry(theme);
    this.skin = skinFor(theme);
    const o = bodyOrigin(this.geometry);
    this.mouth = { x: SLOT_W / 2, y: o.y };
    this.pivot.set(this.mouth.x, this.mouth.y);
    this.addChild(this.glow, this.gfx, this.surface, this.overlay);
  }

  /** Subtle idle movement of the liquid surface. Call every frame with the time in ms. */
  wobble(ms: number): void {
    const s = this.surface.clear();
    const line = this.surfaceLine;
    if (!line) return;
    const dy = Math.sin(ms / 700 + this.phase) * 0.9;
    const tilt = Math.sin(ms / 1100 + this.phase) * 0.8;
    s.moveTo(line.x + 3, line.y + 2.5 + dy - tilt)
      .lineTo(line.x + line.w - 3, line.y + 2.5 + dy + tilt)
      .stroke({ width: 1.5, color: '#FFFFFF', alpha: 0.28, cap: 'round' });
  }

  /** Completed glass: a brief glow in the theme accent and a garnish dropping in. */
  celebrate(duration: number, onFrame: (step: (t: number) => void) => Promise<void>): Promise<void> {
    const o = bodyOrigin(this.geometry);
    const garnish = new Graphics();
    const accent = this.theme.colors.accent;
    garnish.circle(0, 0, 7).fill({ color: accent }).stroke({ width: 2, color: this.theme.colors.text });
    garnish
      .moveTo(-5, 0)
      .lineTo(5, 0)
      .moveTo(0, -5)
      .lineTo(0, 5)
      .stroke({ width: 1, color: this.theme.colors.text, alpha: 0.7 });
    this.overlay.addChild(garnish);
    return onFrame((t) => {
      const g = this.glow.clear();
      const a = Math.sin(Math.PI * t) * 0.55;
      box(
        g,
        o.x - 6,
        o.y - 6,
        this.geometry.bodyW + 12,
        this.geometry.bodyH + 12,
        this.geometry.radius.map((r) => r + 6) as unknown as [number, number, number, number],
        {
          color: accent,
          alpha: a,
        },
      );
      const drop = Math.min(1, t * 1.8);
      garnish.position.set(SLOT_W / 2 + 8, o.y - 46 + drop * 50);
      garnish.rotation = drop * 1.4;
      garnish.alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    }).then(() => {
      this.glow.clear();
      garnish.destroy();
    });
  }

  draw(state: GlassState): void {
    const { theme, geometry: geo } = this;
    const { bottle, mark } = state;
    const g = this.gfx.clear();
    this.overlay.removeChildren().forEach((c) => c.destroy());
    const o = bodyOrigin(geo);
    const locked = bottle.lockedUntil !== undefined;
    const only = bottle.only !== undefined ? drinkById(theme, bottle.only).color : null;

    let rim = theme.colors.glassRim;
    let rimWidth = geo.border;
    if (locked) rim = color(theme, 'lockedRim', theme.colors.line);
    else if (only) rim = only;
    if (mark === 'selected') {
      rim = theme.colors.selected;
      rimWidth = geo.border + 0.5;
    } else if (mark === 'hint') {
      rim = theme.colors.hint;
      rimWidth = geo.border + 0.5;
    } else if (mark === 'reject') {
      rim = theme.colors.reject;
      rimWidth = geo.border + 0.5;
    }
    const fill = locked ? color(theme, 'lockedFill', theme.colors.glassFill) : theme.colors.glassFill;

    // Body.
    box(g, o.x, o.y, geo.bodyW, geo.bodyH, geo.radius, fill);

    // Units.
    const rects = unitRects(geo, bottle.capacity);
    const bottomRadius = Math.max(4, geo.radius[2] - 8);
    const level = state.level ?? bottle.units.length;
    this.surfaceLine = null;
    bottle.units.forEach((unit, i) => {
      if (i >= level) return;
      const full = rects[i]!;
      const part = Math.min(1, level - i);
      const r = { ...full, y: full.y + full.h * (1 - part), h: full.h * part };
      if (!unit.hidden) this.surfaceLine = { x: o.x + r.x, y: o.y + r.y, w: r.w };
      const radii = i === 0 ? ([4, 4, bottomRadius, bottomRadius] as const) : ([4, 4, 4, 4] as const);
      if (unit.hidden) {
        this.skin.hiddenUnit(g, this.overlay, { x: o.x + r.x, y: o.y + r.y, w: r.w, h: r.h }, radii, theme);
        return;
      }
      const drink = drinkById(theme, unit.drink);
      if (r.h < 0.5) return;
      box(g, o.x + r.x, o.y + r.y, r.w, r.h, radii, drink.color);
      // Stout gets its head on the top unit of a run.
      const above = i + 1 < level ? bottle.units[i + 1] : undefined;
      if (drink.foam && (!above || above.drink !== unit.drink))
        box(g, o.x + r.x, o.y + r.y, r.w, 5, [4, 4, 0, 0], drink.foam);
    });
    if (only) onlySlots(g, rects, bottle.units.length, only, o);
    // Locked contents stay visible but dimmed behind the lock.
    if (locked) box(g, o.x, o.y, geo.bodyW, geo.bodyH, geo.radius, { color: fill, alpha: 0.7 });

    // Rim drawn last so it sits on top of the units.
    box(g, o.x, o.y, geo.bodyW, geo.bodyH, geo.radius, null, { width: rimWidth, color: rim });

    // Stem, foot and other bases.
    const base = mark === 'none' ? (locked ? rim : theme.colors.glassRim) : rim;
    const by = o.y + geo.bodyH;
    if (geo.stem && geo.foot) {
      g.rect((SLOT_W - geo.stem.w) / 2, by, geo.stem.w, geo.stem.h).fill({ color: base });
      g.roundRect((SLOT_W - geo.foot.w) / 2, by + geo.stem.h, geo.foot.w, geo.foot.h, geo.foot.r).fill({ color: base });
    }
    if (geo.plinth) {
      g.rect((SLOT_W - 40) / 2, by, 40, 8).fill({ color: base });
      g.roundRect((SLOT_W - 50) / 2, by + 8, 50, 8, 2).fill({ color: base });
    }

    // Blocker pictures and their release badge, drawn by the city's skin.
    if (bottle.lockedUntil) this.skin.locked(this.overlay, this.skinContext(bottle.lockedUntil));
    else if (bottle.only) this.skin.only(this.overlay, this.skinContext(bottle.only));
  }

  private skinContext(drink: string): SkinContext {
    return {
      theme: this.theme,
      geo: this.geometry,
      body: bodyOrigin(this.geometry),
      drinkColor: drinkById(this.theme, drink).color,
    };
  }

  /** The lock falls away when its drink is completed. */
  playUnlock(drink: string, onFrame: (step: (t: number) => void) => Promise<void>): Promise<void> {
    const layer = new Container();
    this.skin.locked(layer, this.skinContext(drink));
    this.addChild(layer);
    return onFrame((t) => {
      layer.alpha = 1 - t;
      layer.position.y = t * t * 40;
    }).then(() => layer.destroy({ children: true }));
  }
}
