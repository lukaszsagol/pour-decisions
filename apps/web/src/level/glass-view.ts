import type { Bottle } from '@pour/engine';
import { drinkById, type Theme } from '@pour/themes';
import { Container, Graphics, Text } from 'pixi.js';
import { box, dashedBox } from '../pixi-util.js';
import { color } from '../theme-css.js';
import { baseHeight, glassGeometry, SLOT_H, SLOT_W, unitRects, type GlassGeometry } from './geometry.js';

export type GlassMark = 'none' | 'selected' | 'hint' | 'reject';

export interface GlassState {
  bottle: Bottle;
  mark: GlassMark;
}

/** Top-left of the glass body inside its slot. */
export function bodyOrigin(g: GlassGeometry): { x: number; y: number } {
  return { x: (SLOT_W - g.bodyW) / 2, y: SLOT_H - baseHeight(g) - g.bodyH };
}

/**
 * One glass drawn in Pixi. The container's origin is the slot's top-left; the
 * screen positions and lifts it. Redraw after every state change.
 */
export class GlassView extends Container {
  readonly geometry: GlassGeometry;
  private readonly gfx = new Graphics();
  private readonly overlay = new Container();

  constructor(private readonly theme: Theme) {
    super();
    this.geometry = glassGeometry(theme);
    this.addChild(this.gfx, this.overlay);
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
    bottle.units.forEach((unit, i) => {
      const r = rects[i]!;
      const radii = i === 0 ? ([4, 4, bottomRadius, bottomRadius] as const) : ([4, 4, 4, 4] as const);
      if (unit.hidden) {
        box(g, o.x + r.x, o.y + r.y, r.w, r.h, radii, color(theme, 'hiddenUnit', theme.colors.surface));
        const q = new Text({
          text: '?',
          style: { fontFamily: theme.fonts.ui, fontSize: 15, fontWeight: '700', fill: color(theme, 'hiddenMark', theme.colors.muted) },
        });
        q.anchor.set(0.5);
        q.position.set(o.x + r.x + r.w / 2, o.y + r.y + r.h / 2);
        this.overlay.addChild(q);
        return;
      }
      const drink = drinkById(theme, unit.drink);
      box(g, o.x + r.x, o.y + r.y, r.w, r.h, radii, drink.color);
      // Stout gets its head on the top unit of a run.
      const above = bottle.units[i + 1];
      if (drink.foam && (!above || above.drink !== unit.drink)) box(g, o.x + r.x, o.y + r.y, r.w, 5, [4, 4, 0, 0], drink.foam);
    });
    if (only) {
      for (let i = bottle.units.length; i < bottle.capacity; i++) {
        const r = rects[i]!;
        box(g, o.x + r.x, o.y + r.y, r.w, r.h, [4, 4, 4, 4], { color: only, alpha: 0.08 });
        dashedBox(g, o.x + r.x, o.y + r.y, r.w, r.h, 4, { width: 2, color: only, alpha: 0.55 });
      }
    }
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

    // Release badge for only and locked glasses: a round badge in the drink's colour.
    const badgeDrink = bottle.lockedUntil ?? bottle.only;
    if (badgeDrink) this.drawBadge(drinkById(theme, badgeDrink).color, o.y);
  }

  private drawBadge(drinkColor: string, bodyTop: number): void {
    const b = new Graphics();
    const cy = Math.max(15, bodyTop - 9);
    b.moveTo(SLOT_W / 2, cy).lineTo(SLOT_W / 2, bodyTop + 2).stroke({ width: 2, color: drinkColor });
    b.circle(SLOT_W / 2, cy, 14).fill({ color: drinkColor }).stroke({ width: 2.5, color: this.theme.colors.text });
    this.overlay.addChild(b);
  }
}
