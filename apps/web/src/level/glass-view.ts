import type { Bottle } from '@pour/engine';
import { drinkById, type Theme } from '@pour/themes';
import { BlurFilter, Container, FillGradient, Graphics } from 'pixi.js';
import { lighten } from '../colour.js';
import { box, roundRect, type Radii } from '../pixi-util.js';
import { color } from '../theme-css.js';
import { onlySlots, skinFor, type BlockerSkin, type SkinContext } from './skins.js';
import { baseHeight, glassGeometry, SLOT_H, SLOT_W, unitRects, type GlassGeometry, type UnitRect } from './geometry.js';

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

export interface LiquidSegment {
  drink: string;
  hidden: boolean;
  /** Includes the bottom unit (for rounded corners). */
  first: boolean;
  top: number;
  bottom: number;
}

/**
 * Groups the visible liquid into runs: consecutive units of the same drink
 * become one block. Hidden units stay separate (each keeps its cover).
 * `level` may be fractional while a pour animates. Coordinates are slot-local.
 */
export function liquidSegments(bottle: Bottle, level: number, rects: UnitRect[], bodyY: number): LiquidSegment[] {
  const out: LiquidSegment[] = [];
  for (let i = 0; i < bottle.units.length && i < level; i++) {
    const u = bottle.units[i]!;
    const r = rects[i]!;
    const part = Math.min(1, level - i);
    const top = bodyY + r.y + r.h * (1 - part);
    const bottom = bodyY + r.y + r.h;
    const last = out[out.length - 1];
    if (last && !u.hidden && !last.hidden && last.drink === u.drink) last.top = top;
    else out.push({ drink: u.drink, hidden: u.hidden, first: i === 0, top, bottom });
  }
  return out;
}

let shades: { interior: FillGradient; cylinder: FillGradient; contact: FillGradient } | null = null;

/** Shared gradients (made once): glass depth, round liquid, contact shadow. */
function gradients() {
  shades ??= {
    interior: new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: 'rgba(0,0,0,0.35)' },
        { offset: 0.35, color: 'rgba(255,255,255,0.04)' },
        { offset: 0.7, color: 'rgba(0,0,0,0)' },
        { offset: 1, color: 'rgba(0,0,0,0.4)' },
      ],
      textureSpace: 'local',
    }),
    cylinder: new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: 'rgba(0,0,0,0.30)' },
        { offset: 0.18, color: 'rgba(255,255,255,0.10)' },
        { offset: 0.32, color: 'rgba(255,255,255,0.16)' },
        { offset: 0.55, color: 'rgba(255,255,255,0)' },
        { offset: 0.85, color: 'rgba(0,0,0,0.12)' },
        { offset: 1, color: 'rgba(0,0,0,0.38)' },
      ],
      textureSpace: 'local',
    }),
    contact: new FillGradient({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: 'rgba(0,0,0,0.55)' },
        { offset: 1, color: 'rgba(0,0,0,0)' },
      ],
      textureSpace: 'local',
    }),
  };
  return shades;
}
const interiorShade = () => gradients().interior;
const cylinderShade = () => gradients().cylinder;
const contactShadow = () => gradients().contact;

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
  private readonly shadow = new Graphics();
  private readonly halo = new Graphics();
  private readonly glow = new Graphics();
  private readonly gfx = new Graphics();
  private readonly liquid = new Graphics();
  private readonly surface = new Graphics();
  private readonly front = new Graphics();
  private readonly haloBlur: BlurFilter;
  private readonly overlay = new Container();
  /** Celebration effects; draw() leaves this layer alone. */
  private readonly fx = new Container();
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
    this.haloBlur = new BlurFilter({ strength: 6, quality: 2 });
    this.addChild(
      this.shadow,
      this.halo,
      this.glow,
      this.gfx,
      this.liquid,
      this.surface,
      this.front,
      this.overlay,
      this.fx,
    );
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
    this.fx.addChild(garnish);
    // A burst of sparkles from the mouth of the glass.
    const sparks = Array.from({ length: 14 }, (_, i) => {
      const angle = -Math.PI / 2 + ((i / 13) * 2 - 1) * 1.25;
      const speed = 34 + ((i * 37) % 26);
      const g = new Graphics();
      const r = 2.5 + (i % 3);
      g.poly([
        0,
        -r * 1.8,
        r * 0.5,
        -r * 0.5,
        r * 1.8,
        0,
        r * 0.5,
        r * 0.5,
        0,
        r * 1.8,
        -r * 0.5,
        r * 0.5,
        -r * 1.8,
        0,
        -r * 0.5,
        -r * 0.5,
      ]).fill({
        color: i % 2 ? '#FFFFFF' : accent,
      });
      this.fx.addChild(g);
      return { g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    });
    return onFrame((t) => {
      for (const s of sparks) {
        s.g.position.set(SLOT_W / 2 + s.vx * t, o.y + s.vy * t + 60 * t * t);
        s.g.alpha = 1 - t;
        s.g.rotation = t * 3;
        s.g.scale.set(1 - t * 0.5);
      }
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
      sparks.forEach((s) => s.g.destroy());
    });
  }

  draw(state: GlassState): void {
    const { theme, geometry: geo } = this;
    const { bottle, mark } = state;
    const back = this.gfx.clear();
    const liquid = this.liquid.clear();
    const front = this.front.clear();
    const shadow = this.shadow.clear();
    this.overlay.removeChildren().forEach((c) => c.destroy());
    const o = bodyOrigin(geo);
    const locked = bottle.lockedUntil !== undefined;
    const only = bottle.only !== undefined ? drinkById(theme, bottle.only).color : null;
    const inset = geo.border;
    const inner = { x: o.x + inset, y: o.y + inset, w: geo.bodyW - inset * 2, h: geo.bodyH - inset * 2 };
    const innerRadii = geo.radius.map((r) => Math.max(0, r - inset)) as unknown as Radii;

    let rim = theme.colors.glassRim;
    if (locked) rim = color(theme, 'lockedRim', theme.colors.line);
    else if (only) rim = only;
    const markColour = {
      none: null,
      selected: theme.colors.selected,
      hint: theme.colors.hint,
      reject: theme.colors.reject,
    }[mark];
    if (markColour) rim = markColour;
    const fill = locked ? color(theme, 'lockedFill', theme.colors.glassFill) : theme.colors.glassFill;

    // Soft contact shadow where the glass stands.
    const footY = SLOT_H - 1;
    shadow.ellipse(SLOT_W / 2, footY, (geo.foot?.w ?? geo.bodyW) / 2 + 8, 6).fill(contactShadow());

    // Selection, hint or reject glow behind the glass.
    this.halo.clear();
    // The blur only runs while a glass glows: filters cost a render pass each frame.
    this.halo.filters = markColour ? [this.haloBlur] : [];
    if (markColour) {
      roundRect(
        this.halo,
        o.x - 3,
        o.y - 3,
        geo.bodyW + 6,
        geo.bodyH + 6,
        geo.radius.map((r) => r + 3) as unknown as Radii,
      ).stroke({
        width: 6,
        color: markColour,
        alpha: 0.75,
      });
    }

    // Dark glass interior, slightly lighter towards the rim.
    box(back, o.x, o.y, geo.bodyW, geo.bodyH, geo.radius, fill);
    roundRect(liquid, inner.x, inner.y, inner.w, inner.h, innerRadii).fill({ fill: interiorShade(), alpha: 1 });
    // Liquid touching the bottom takes the glass's rounded corners (no mask needed: masks cost a pass per frame).
    const innerBottom = inner.y + inner.h;
    const inside = (y: number, h: number) =>
      y + h >= innerBottom - 0.01
        ? roundRect(liquid, inner.x, y, inner.w, h, [0, 0, innerRadii[2], innerRadii[3]])
        : liquid.rect(inner.x, y, inner.w, h);

    // Liquid: same-drink runs merge into one block, wall to wall.
    const rects = unitRects(geo, bottle.capacity);
    const level = Math.min(state.level ?? bottle.units.length, bottle.units.length);
    const segments = liquidSegments(bottle, level, rects, o.y);
    this.surfaceLine = null;
    let liquidTop = Infinity;
    const bottomRadius = Math.max(0, geo.radius[2] - inset);
    for (const seg of segments) {
      if (seg.bottom - seg.top < 0.5) continue;
      liquidTop = Math.min(liquidTop, seg.top);
      if (seg.hidden) {
        // Hidden units keep their own cover, drawn by the city's skin.
        const radii: Radii = seg.first ? [0, 0, bottomRadius, bottomRadius] : [0, 0, 0, 0];
        this.skin.hiddenUnit(
          front,
          this.overlay,
          { x: inner.x, y: seg.top, w: inner.w, h: seg.bottom - seg.top },
          radii,
          theme,
        );
        continue;
      }
      const drink = drinkById(theme, seg.drink);
      const h = seg.bottom - seg.top;
      inside(seg.top, h).fill({ color: drink.color });
      // A brighter surface band on top of every run (skipped where it would cut into the rounded bottom).
      const roomForBand = seg.bottom < innerBottom - 0.01 || h > innerRadii[2] + 4;
      if (roomForBand)
        liquid.rect(inner.x, seg.top, inner.w, Math.min(3, h)).fill({ color: lighten(drink.color, 0.35), alpha: 0.9 });
      if (drink.foam && roomForBand) liquid.rect(inner.x, seg.top, inner.w, Math.min(6, h)).fill({ color: drink.foam });
      if (seg.top <= liquidTop) this.surfaceLine = { x: inner.x, y: seg.top, w: inner.w };
    }
    // Round, glassy shading across the whole liquid column.
    if (liquidTop < Infinity) inside(liquidTop, innerBottom - liquidTop).fill({ fill: cylinderShade() });
    if (only) onlySlots(back, rects, bottle.units.length, only, o);
    // Locked contents stay visible but dimmed behind the lock.
    if (locked) box(front, o.x, o.y, geo.bodyW, geo.bodyH, geo.radius, { color: fill, alpha: 0.7 });

    // Glass in front of the liquid: gloss streaks, then the rim.
    front
      .roundRect(inner.x + 4, inner.y + 10, 4, inner.h - Math.max(26, geo.radius[2]))
      .fill({ color: '#ffffff', alpha: 0.2 });
    front.roundRect(inner.x + 10, inner.y + 10, 1.5, inner.h * 0.45, 1).fill({ color: '#ffffff', alpha: 0.12 });
    front.roundRect(inner.x + inner.w - 5, inner.y + 16, 2, inner.h * 0.55, 1).fill({ color: '#ffffff', alpha: 0.08 });
    box(front, o.x, o.y, geo.bodyW, geo.bodyH, geo.radius, null, {
      width: geo.border + (markColour ? 0.5 : 0),
      color: rim,
    });
    front
      .moveTo(o.x + geo.radius[0], o.y + 1)
      .lineTo(o.x + geo.bodyW - geo.radius[1], o.y + 1)
      .stroke({ width: 1.5, color: lighten(rim, 0.45) });

    // Stem, foot and other bases.
    const base = mark === 'none' ? (locked ? rim : theme.colors.glassRim) : rim;
    const by = o.y + geo.bodyH;
    if (geo.stem && geo.foot) {
      back.rect((SLOT_W - geo.stem.w) / 2, by, geo.stem.w, geo.stem.h).fill({ color: base });
      back.rect((SLOT_W - geo.stem.w) / 2, by, 2, geo.stem.h).fill({ color: lighten(base, 0.35) });
      back
        .roundRect((SLOT_W - geo.foot.w) / 2, by + geo.stem.h, geo.foot.w, geo.foot.h, geo.foot.r)
        .fill({ color: base });
      back.rect((SLOT_W - geo.foot.w) / 2 + 2, by + geo.stem.h, geo.foot.w - 4, 1).fill({ color: lighten(base, 0.4) });
    }
    if (geo.nonic) {
      // The nonic bulge just under the rim.
      front.rect(o.x - 3, o.y + 12, 4, 10).fill({ color: rim });
      front.rect(o.x + geo.bodyW - 1, o.y + 12, 4, 10).fill({ color: rim });
    }
    if (geo.plinth) {
      back.rect((SLOT_W - 40) / 2, by, 40, 8).fill({ color: base });
      back.roundRect((SLOT_W - 50) / 2, by + 8, 50, 8, 2).fill({ color: base });
      back.rect((SLOT_W - 50) / 2 + 2, by + 8, 46, 1).fill({ color: lighten(base, 0.4) });
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
