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

/** London: pewter tankards over hidden units, a reserved beer mat, a locked tap. */
const londonSkin: Partial<BlockerSkin> = {
  hiddenUnit(g, _layer, r, _radii, theme) {
    const pewter = color(theme, 'pewter', '#9BA1A8');
    const dark = color(theme, 'pewterDark', '#6E747A');
    g.rect(r.x - 4, r.y - 2, r.w + 8, r.h + 4).fill({ color: pewter });
    g.rect(r.x - 4, r.y + r.h / 2 - 1, r.w + 8, 2).fill({ color: dark, alpha: 0.6 });
    // Handle on the right.
    g.roundRect(r.x + r.w + 4, r.y + 2, 9, r.h - 4, 4).stroke({ width: 4, color: pewter });
    g.circle(r.x + r.w / 2, r.y + r.h / 2, Math.min(9, r.h / 3)).stroke({
      width: 2,
      color: color(theme, 'pewterLight', '#C3C8CC'),
    });
  },
  only(layer, ctx) {
    // Reserved beer mat leaning on the glass.
    const g = new Graphics();
    const x = ctx.body.x - 6;
    const y = ctx.body.y + ctx.geo.bodyH - 34;
    g.roundRect(x, y, 22, 22, 3).fill({ color: ctx.theme.colors.text }).stroke({ width: 2, color: ctx.drinkColor });
    g.circle(x + 11, y + 11, 6).fill({ color: ctx.drinkColor });
    g.rotation = 0;
    layer.addChild(g);
    badge(layer, ctx);
  },
  locked(layer, ctx) {
    // Locked beer tap across the glass mouth.
    const g = new Graphics();
    const brass = color(ctx.theme, 'brass', ctx.theme.colors.accent);
    const { body, geo } = ctx;
    box(g, body.x, body.y, geo.bodyW, geo.bodyH, geo.radius, { color: ctx.theme.colors.ground, alpha: 0.55 });
    g.rect(body.x - 4, body.y + 10, geo.bodyW + 8, 10).fill({ color: brass });
    g.roundRect(SLOT_W / 2 - 6, body.y + 20, 12, 22, 3).fill({ color: brass });
    g.roundRect(SLOT_W / 2 - 11, body.y + 64, 22, 20, 4).fill({ color: brass });
    g.moveTo(SLOT_W / 2 - 6, body.y + 64)
      .arc(SLOT_W / 2, body.y + 64, 6, Math.PI, 0)
      .stroke({ width: 3, color: brass });
    g.circle(SLOT_W / 2, body.y + 73, 2.4).fill({ color: ctx.theme.colors.ground });
    layer.addChild(g);
    badge(layer, ctx);
  },
};

/** New York: frosted Deco glass over hidden units, a velvet rope, an Art Deco door. */
const newYorkSkin: Partial<BlockerSkin> = {
  hiddenUnit(g, layer, r, radii, theme) {
    box(g, r.x, r.y, r.w, r.h, radii, color(theme, 'hiddenUnit', '#2A2A2A'));
    // Frosted glass: fine diagonal lines.
    for (let x = r.x + 4; x < r.x + r.w; x += 7)
      g.moveTo(x, r.y + r.h - 3).lineTo(Math.min(r.x + r.w - 2, x + 8), r.y + 3);
    g.stroke({ width: 1, color: theme.colors.text, alpha: 0.18 });
    if (r.h > 14) questionMark(layer, r, theme, color(theme, 'hiddenMark', theme.colors.muted));
  },
  only(layer, ctx) {
    const g = new Graphics();
    const brass = color(ctx.theme, 'brass', ctx.theme.colors.accent);
    const { body, geo } = ctx;
    const postY = body.y + geo.bodyH - 76;
    for (const x of [body.x - 6, body.x + geo.bodyW + 6]) {
      g.rect(x - 2, postY, 4, 64).fill({ color: brass });
      g.circle(x, postY, 5).fill({ color: brass });
      g.rect(x - 5, postY + 62, 10, 4).fill({ color: brass });
    }
    g.moveTo(body.x - 6, postY + 6)
      .quadraticCurveTo(SLOT_W / 2, postY + 46, body.x + geo.bodyW + 6, postY + 6)
      .stroke({ width: 6, color: color(ctx.theme, 'velvet', '#A8213A'), cap: 'round' });
    layer.addChild(g);
    badge(layer, ctx);
  },
  locked(layer, ctx) {
    const g = new Graphics();
    const brass = color(ctx.theme, 'brass', ctx.theme.colors.accent);
    const { body, geo } = ctx;
    const x = body.x + 6;
    const y = body.y + 6;
    const w = geo.bodyW - 12;
    const h = geo.bodyH - 12;
    roundRect(g, x, y, w, h, [w / 2, w / 2, 6, 6])
      .fill({ color: ctx.theme.colors.ground })
      .stroke({ width: 2, color: brass });
    for (let a = 25; a <= 155; a += 26) {
      const rad = (a * Math.PI) / 180;
      g.moveTo(SLOT_W / 2, y + w / 2 + 6).lineTo(
        SLOT_W / 2 - Math.cos(rad) * (w / 2 - 4),
        y + w / 2 + 6 - Math.sin(rad) * (w / 2 - 6),
      );
    }
    g.stroke({ width: 1, color: brass, alpha: 0.8 });
    g.rect(x + 8, y + h * 0.45, w - 16, h * 0.42).stroke({ width: 1.2, color: brass });
    g.circle(SLOT_W / 2, y + h * 0.6, 5).fill({ color: brass });
    g.poly([
      SLOT_W / 2 - 3,
      y + h * 0.6,
      SLOT_W / 2 + 3,
      y + h * 0.6,
      SLOT_W / 2 + 4,
      y + h * 0.6 + 14,
      SLOT_W / 2 - 4,
      y + h * 0.6 + 14,
    ]).fill({ color: brass });
    layer.addChild(g);
    badge(layer, ctx);
  },
};

/** Tokyo: unlabelled bottles keep the generic "?"; a bottle-keep tag; a shutter pulled down. */
const tokyoSkin: Partial<BlockerSkin> = {
  only(layer, ctx) {
    badge(layer, ctx);
  },
  locked(layer, ctx) {
    const g = new Graphics();
    const { body, geo, theme } = ctx;
    const slat = color(theme, 'shutter', '#3B4577');
    const line = color(theme, 'shutterLine', '#2B3466');
    box(
      g,
      body.x + 2,
      body.y + 2,
      geo.bodyW - 4,
      geo.bodyH - 4,
      geo.radius.map((r) => Math.max(0, r - 2)) as unknown as [number, number, number, number],
      slat,
    );
    for (let y = body.y + 12; y < body.y + geo.bodyH - 8; y += 10)
      g.rect(body.x + 4, y, geo.bodyW - 8, 1.5).fill({ color: line });
    g.roundRect(SLOT_W / 2 - 10, body.y + geo.bodyH - 18, 20, 6, 3).fill({ color: theme.colors.muted });
    layer.addChild(g);
    badge(layer, ctx);
  },
};

registerSkins({
  'pewter-tankard': { hiddenUnit: londonSkin.hiddenUnit! },
  'reserved-beer-mat': { only: londonSkin.only! },
  'locked-tap': { locked: londonSkin.locked! },
  'frosted-deco-glass': { hiddenUnit: newYorkSkin.hiddenUnit! },
  'velvet-rope': { only: newYorkSkin.only! },
  'deco-door': { locked: newYorkSkin.locked! },
  'bottle-keep': { only: tokyoSkin.only! },
  shutter: { locked: tokyoSkin.locked! },
});
