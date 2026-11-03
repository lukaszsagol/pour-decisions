import type { Theme } from '@pour/themes';
import { Container, Graphics, Text } from 'pixi.js';
import { box, dashedBox, dashedLine, roundRect } from '../pixi-util.js';
import { color } from '../theme-css.js';
import type { GlassGeometry, UnitRect } from './geometry.js';
import { SLOT_W } from './geometry.js';

/** What a skin needs to know to draw on one glass. Coordinates are slot-local. */
export interface SkinContext {
  theme: Theme;
  geo: GlassGeometry;
  /** Top-left of the glass body. */
  body: { x: number; y: number };
  /** Colour of the drink that releases (locked) or is accepted (only). */
  drinkColor: string;
}

/**
 * How a city draws its blockers. The rules are shared (`docs/spec/rules.md`);
 * only the look changes. No text labels: a picture plus a round badge in the
 * releasing drink's colour.
 */
export interface BlockerSkin {
  /** Draws one hidden unit. */
  hiddenUnit(
    g: Graphics,
    layer: Container,
    r: UnitRect,
    radii: readonly [number, number, number, number],
    theme: Theme,
  ): void;
  /** Decoration on an only-glass, drawn above the units. Empty slots are already dashed. */
  only(layer: Container, ctx: SkinContext): void;
  /** Overlay on a locked glass. Also used, fading out, for the unlock animation. */
  locked(layer: Container, ctx: SkinContext): void;
}

/** Round badge in the drink's colour above the glass, tied to it with a short line. */
export function badge(layer: Container, ctx: SkinContext, dashedTie = false): Graphics {
  const b = new Graphics();
  const cx = SLOT_W / 2;
  const cy = Math.max(15, ctx.body.y - 9);
  if (dashedTie)
    dashedLine(b, cx, cy + 14, cx, ctx.body.y + 76, 4, 3, {
      width: 2.5,
      color: color(ctx.theme, 'brass', ctx.theme.colors.accent),
    });
  else
    b.moveTo(cx, cy)
      .lineTo(cx, ctx.body.y + 2)
      .stroke({ width: 2, color: ctx.drinkColor });
  b.circle(cx, cy, 14).fill({ color: ctx.drinkColor }).stroke({ width: 2.5, color: ctx.theme.colors.text });
  // A small highlight so the badge reads as a token, not a drink unit.
  b.circle(cx - 4, cy - 4, 3).fill({ color: '#FFFFFF', alpha: 0.35 });
  layer.addChild(b);
  return b;
}

function questionMark(layer: Container, r: UnitRect, theme: Theme, fill: string): void {
  const q = new Text({ text: '?', style: { fontFamily: theme.fonts.ui, fontSize: 15, fontWeight: '700', fill } });
  q.anchor.set(0.5);
  q.position.set(r.x + r.w / 2, r.y + r.h / 2);
  layer.addChild(q);
}

/** Plain look used by cities without their own skins: dark unit with "?", badge, dimmed lock. */
export const genericSkin: BlockerSkin = {
  hiddenUnit(g, layer, r, radii, theme) {
    box(g, r.x, r.y, r.w, r.h, radii, color(theme, 'hiddenUnit', theme.colors.surface));
    if (r.h > 14) questionMark(layer, r, theme, color(theme, 'hiddenMark', theme.colors.muted));
  },
  only(layer, ctx) {
    badge(layer, ctx);
  },
  locked(layer, ctx) {
    const g = new Graphics();
    box(g, ctx.body.x, ctx.body.y, ctx.geo.bodyW, ctx.geo.bodyH, ctx.geo.radius, {
      color: ctx.theme.colors.ground,
      alpha: 0.55,
    });
    layer.addChild(g);
    badge(layer, ctx);
  },
};

/** Amsterdam: brass chains and padlock, stoneware jug covers, kruik tags. */
export const amsterdamSkin: BlockerSkin = {
  hiddenUnit(g, layer, r, radii, theme) {
    // Stoneware jug cover: glazed clay with a darker shoulder band.
    box(g, r.x, r.y, r.w, r.h, radii, color(theme, 'stoneware', '#B9A586'));
    g.rect(r.x, r.y + Math.min(6, r.h / 4), r.w, 3).fill({ color: color(theme, 'stonewareCap', '#8C7A60') });
    if (r.h > 14) questionMark(layer, r, theme, color(theme, 'stonewareCapDark', '#7A6A52'));
  },
  only(layer, ctx) {
    // Kruik tag: a small clay tag on a string, in the drink's colour.
    const g = new Graphics();
    const x = ctx.body.x + ctx.geo.bodyW - 6;
    const y = ctx.body.y + 18;
    g.moveTo(x, ctx.body.y + 4)
      .lineTo(x + 6, y)
      .stroke({ width: 1.5, color: color(ctx.theme, 'brass', ctx.theme.colors.accent) });
    roundRect(g, x - 2, y, 16, 22, [3, 3, 8, 8])
      .fill({ color: ctx.drinkColor })
      .stroke({ width: 2, color: ctx.theme.colors.text });
    g.circle(x + 6, y + 5, 2).fill({ color: ctx.theme.colors.text });
    layer.addChild(g);
    badge(layer, ctx);
  },
  locked(layer, ctx) {
    const brass = color(ctx.theme, 'brass', '#C9A24A');
    const { body, geo } = ctx;
    const g = new Graphics();
    // Crossed chains over the glass.
    const top = body.y + 24;
    const bottom = body.y + geo.bodyH - 6;
    dashedLine(g, body.x + 2, top, body.x + geo.bodyW - 2, bottom, 6, 4, { width: 3.5, color: brass, cap: 'round' });
    dashedLine(g, body.x + geo.bodyW - 2, top, body.x + 2, bottom, 6, 4, { width: 3.5, color: brass, cap: 'round' });
    // Padlock.
    const cx = SLOT_W / 2;
    const ly = body.y + 80;
    g.moveTo(cx - 8, ly)
      .lineTo(cx - 8, ly - 6)
      .arc(cx, ly - 6, 8, Math.PI, 0)
      .lineTo(cx + 8, ly)
      .stroke({ width: 3.5, color: brass });
    g.roundRect(cx - 13, ly, 26, 22, 4).fill({ color: brass });
    g.circle(cx, ly + 9, 2.6).fill({ color: ctx.theme.colors.ground });
    g.moveTo(cx, ly + 11)
      .lineTo(cx, ly + 16)
      .stroke({ width: 2.2, color: ctx.theme.colors.ground, cap: 'round' });
    layer.addChild(g);
    badge(layer, ctx, true);
  },
};

const skinsByName: Record<string, Partial<BlockerSkin>> = {
  'chains-padlock': { locked: amsterdamSkin.locked },
  'stoneware-jug': { hiddenUnit: amsterdamSkin.hiddenUnit },
  'kruik-tag': { only: amsterdamSkin.only },
};

/** Registers extra skins by the names used in `themes/*.json` (`blockers.hidden`, `.only`, `.locked`). */
export function registerSkins(skins: Record<string, Partial<BlockerSkin>>): void {
  Object.assign(skinsByName, skins);
}

/** The skin for a theme: each blocker uses its named renderer, or the generic one. */
export function skinFor(theme: Theme): BlockerSkin {
  const pick = <K extends keyof BlockerSkin>(key: K, name: string | undefined): BlockerSkin[K] =>
    ((name && skinsByName[name]?.[key]) as BlockerSkin[K] | undefined) ?? genericSkin[key];
  return {
    hiddenUnit: pick('hiddenUnit', theme.blockers.hidden),
    only: pick('only', theme.blockers.only),
    locked: pick('locked', theme.blockers.locked),
  };
}

/** Dashed empty slots of an only-glass (shared by every skin). */
export function onlySlots(
  g: Graphics,
  rects: UnitRect[],
  from: number,
  drinkColor: string,
  origin: { x: number; y: number },
): void {
  for (let i = from; i < rects.length; i++) {
    const r = rects[i]!;
    box(g, origin.x + r.x, origin.y + r.y, r.w, r.h, [4, 4, 4, 4], { color: drinkColor, alpha: 0.08 });
    dashedBox(g, origin.x + r.x, origin.y + r.y, r.w, r.h, 4, { width: 2, color: drinkColor, alpha: 0.55 });
  }
}
