import type { Bottle } from '@pour/engine';
import { drinkById, type Theme } from '@pour/themes';
import { dith, mix, PixelCanvas } from '../canvas.js';
import { liquidTones, rimTones } from '../tones.js';
import type { CityLevelArt } from './art.js';
import { releaseBadge } from './badge.js';
import { drawGlass, glassRows, UNIT, type Layer, type Rim, type Row } from './glass.js';
import { artLayout, type ArtLayout } from './layout.js';
import { rotateNearest } from './rotate.js';
import type { Bleed } from '../../stage.js';

export type Mark = 'none' | 'selected' | 'hint' | 'reject';

export interface GlassFrame {
  bottle: Bottle;
  mark: Mark;
  /** Art px above the slot (negative dips). */
  lift: number;
  /** Art px sideways (rejection shake). */
  dx: number;
  /** Rows of liquid shown (pours fill row by row). */
  filledRows?: number;
  /** Drawn elsewhere this frame (the tilted source of a pour). */
  skip?: boolean;
  /** Completion sparkle frame 0–2. */
  sparkle?: number;
  /** A lock falling away, 0–1. */
  unlock?: number;
  /** Memory training: show hidden units. */
  peek?: boolean;
}

export interface PourFrame {
  bottle: Bottle;
  filledRows: number;
  /** Tilt frame 0–2, and which way the mouth points. */
  tilt: number;
  dir: 1 | -1;
  /** Where the rim centre (the pivot) is drawn. */
  pivot: { x: number; y: number };
  stream?: { x0: number; y0: number; x1: number; y1: number; color: string };
}

export interface LevelFrame {
  glasses: GlassFrame[];
  pour?: PourFrame;
  counts: [number, number, number];
  usable: [boolean, boolean, boolean];
  boosters: boolean;
  phase: number;
}

/** Tilt angles of the three pour frames, in degrees. */
export const TILTS = [30, 65, 105] as const;

const SPARKLE = [
  ['..#..', '.###.', '#####', '.###.', '..#..'],
  ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
  ['#.....#', '.......', '...#...', '..#.#..', '...#...', '.......', '#.....#'],
];

/**
 * Composes the level screen into one art buffer: the 195×422 stage plus the
 * margins around it (`setBleed`), where the city's backdrop continues.
 */
export class PixelLevelRenderer {
  cv = new PixelCanvas(195, 422);
  layout: ArtLayout = artLayout(1);
  private readonly backdrops = new Map<number, PixelCanvas>();

  constructor(
    private readonly theme: Theme,
    private readonly art: CityLevelArt,
  ) {}

  setCount(n: number): ArtLayout {
    this.layout = artLayout(n);
    return this.layout;
  }

  /** Sizes the buffer for the stage plus `bleed` art pixels on each side. Returns true when it changed. */
  setBleed(bleed: Bleed): boolean {
    const cv = this.cv;
    if (cv.ox === bleed.l && cv.oy === bleed.t && cv.w === 195 + bleed.l + bleed.r && cv.h === 422 + bleed.t + bleed.b)
      return false;
    this.cv = new PixelCanvas(195 + bleed.l + bleed.r, 422 + bleed.t + bleed.b, null, bleed.l, bleed.t);
    this.backdrops.clear();
    return true;
  }

  private backdrop(phase: number): PixelCanvas {
    let b = this.backdrops.get(phase);
    if (!b) {
      const { w, h, ox, oy } = this.cv;
      b = new PixelCanvas(w, h, null, ox, oy);
      if (ox || oy || w > 195 || h > 422) this.art.bleed(b, phase);
      b.blit(this.art.backdrop(phase), 0, 0);
      this.backdrops.set(phase, b);
    }
    return b;
  }

  layers(bottle: Bottle, peek = false): Layer[] {
    return bottle.units.map((u, i) => {
      const hidden = u.hidden && !peek;
      return {
        hidden,
        key: hidden ? `?${i}` : u.drink,
        tones: hidden ? null : liquidTones(u.drink, drinkById(this.theme, u.drink).color),
      };
    });
  }

  rim(bottle: Bottle, mark: Mark, bright = false): Rim {
    const k = this.theme.colors;
    let rim =
      mark === 'selected'
        ? (this.art.glass.selected ?? rimTones(k.selected))
        : mark === 'hint'
          ? rimTones(k.hint)
          : mark === 'reject'
            ? rimTones(k.reject)
            : bottle.lockedUntil
              ? this.art.glass.locked
              : this.art.glass.normal;
    if (bright) rim = { rl: '#FFFFFF', rb: mix(rim.rb, '#FFFFFF', 0.5), rd: mix(rim.rd, '#FFFFFF', 0.35) };
    return rim;
  }

  /** Draws one glass at (x0, y0) with its blocker pictures. Returns its rows. */
  glass(cv: PixelCanvas, x0: number, y0: number, f: GlassFrame, noShadow = false): Row[] {
    const b = f.bottle;
    const rows = drawGlass(cv, {
      x0,
      y0,
      layers: this.layers(b, f.peek),
      ...(f.filledRows !== undefined ? { filledRows: f.filledRows } : {}),
      rim: this.rim(b, f.mark, f.sparkle !== undefined && f.sparkle < 2),
      style: this.art.glass,
      interior: this.layout.interior,
      hidden: (c, r) => this.art.hidden(c, r),
      dim: b.lockedUntil !== undefined,
      noShadow,
    });
    if (b.only) this.art.only(cv, x0, y0, drinkById(this.theme, b.only).color);
    if (b.lockedUntil) this.art.locked(cv, x0, y0);
    const release = b.lockedUntil ?? b.only;
    if (release) releaseBadge(cv, x0 + 1, y0 - 28, release, drinkById(this.theme, release).color);
    return rows;
  }

  render(frame: LevelFrame): PixelCanvas {
    const cv = this.cv;
    cv.copyFrom(this.backdrop(frame.phase));
    if (frame.boosters) this.art.boosters(cv, frame.counts, frame.usable);
    frame.glasses.forEach((f, i) => {
      const slot = this.layout.slots[i];
      if (!slot || f.skip) return;
      const x0 = slot.x + f.dx;
      const y0 = slot.y - f.lift;
      this.glass(cv, x0, y0, f);
      if (f.sparkle !== undefined) {
        const s = SPARKLE[f.sparkle]!;
        const pal = { '#': f.sparkle === 1 ? '#FFFFFF' : mix(this.theme.colors.accent, '#FFFFFF', 0.4) };
        cv.sprite(x0 + 13 - Math.floor(s[0]!.length / 2), y0 - 4 - s.length, s, pal);
        cv.sprite(x0 - 2, y0 + 8, SPARKLE[0]!, { '#': '#FFFFFF' });
        cv.sprite(x0 + 24, y0 + 20, SPARKLE[0]!, { '#': '#FFFFFF' });
      }
      if (f.unlock !== undefined) this.fallingLock(cv, x0, y0, f.unlock);
    });
    if (frame.pour) this.tilted(cv, frame.pour);
    return cv;
  }

  /** The lock drops and dithers away when its drink is completed. */
  private fallingLock(cv: PixelCanvas, x0: number, y0: number, t: number): void {
    const tmp = new PixelCanvas(60, 120);
    this.art.locked(tmp, 15, 30);
    const drop = Math.round(t * t * 28);
    for (let y = 0; y < tmp.h; y++)
      for (let x = 0; x < tmp.w; x++) {
        const p = tmp.data[y * tmp.w + x]!;
        const tx = x0 - 15 + x;
        const ty = y0 - 30 + y + drop;
        if (dith(x, y, 1 - t)) cv.setPacked(tx, ty, p);
      }
  }

  /** The source glass tilted over its target, drawn from a pre-rotated frame. */
  private tilted(cv: PixelCanvas, p: PourFrame): void {
    const tmp = new PixelCanvas(44, 100);
    const ox = 9;
    const oy = 8;
    this.glass(tmp, ox, oy, { bottle: p.bottle, mark: 'none', lift: 0, dx: 0, filledRows: p.filledRows }, true);
    const pivotX = ox + 13;
    const r = rotateNearest(tmp, TILTS[p.tilt]! * p.dir, pivotX, oy);
    cv.blit(r.cv, p.pivot.x - r.px, p.pivot.y - r.py);
    if (p.stream) {
      const { x0, y0, x1, y1, color } = p.stream;
      const t = liquidTones('', color);
      // A stream two art pixels wide: lit on the left, base colour on the right.
      cv.line(x0, y0, x1, y1, t.hi);
      cv.line(x0 + 1, y0, x1 + 1, y1, t.base);
    }
  }

  /** Interior rows of glass i at its slot (for pour streams). */
  rowsAt(i: number, lift = 0): Row[] {
    const s = this.layout.slots[i]!;
    return glassRows(s.x, s.y - lift, this.art.glass, this.layout.interior);
  }

  /** Total liquid rows for n units. */
  static rowsFor(units: number): number {
    return units * UNIT;
  }
}
