import { Application, Graphics } from 'pixi.js';
import { STAGE_H, STAGE_W, type Stage } from './stage.js';

let dirty = true;

/** Asks for one redraw on the next frame. Pixi only renders when something changed. */
export function invalidate(): void {
  dirty = true;
}

export interface PixiHandle {
  app: Application;
  dispose: () => void;
  /** Runs `fn` every frame and keeps rendering while it is registered (idle animations). */
  onFrame: (fn: (ms: number) => void) => () => void;
}

/**
 * Creates a Pixi app covering the stage, rendered at device resolution.
 * It renders on demand rather than every frame: slow devices (and CI's
 * software WebGL) stay responsive while nothing moves.
 */
export async function createPixi(stage: Stage, height = STAGE_H): Promise<PixiHandle> {
  const app = new Application();
  const resolution = () => Math.min(4, (window.devicePixelRatio || 1) * stage.scale);
  await app.init({
    width: STAGE_W,
    height,
    backgroundAlpha: 0,
    antialias: true,
    resolution: resolution(),
    autoDensity: true,
    preference: 'webgl',
    autoStart: false,
  });
  app.ticker.stop();
  app.canvas.classList.add('stage-canvas');
  app.canvas.setAttribute('aria-hidden', 'true');
  const continuous = new Set<(ms: number) => void>();
  let raf = 0;
  let alive = true;
  let lastIdle = 0;
  dirty = true;
  const loop = (ms: number) => {
    if (!alive) return;
    // Idle animations run at about 30 frames a second; real changes render at once.
    const idleFrame = continuous.size > 0 && ms - lastIdle >= 32;
    if (idleFrame) {
      lastIdle = ms;
      continuous.forEach((fn) => fn(ms));
    }
    if (dirty || idleFrame) {
      dirty = false;
      app.render();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const off = stage.onResize(() => {
    app.renderer.resolution = resolution();
    app.renderer.resize(STAGE_W, height);
    invalidate();
  });
  return {
    app,
    onFrame: (fn) => {
      continuous.add(fn);
      return () => continuous.delete(fn);
    },
    dispose: () => {
      alive = false;
      cancelAnimationFrame(raf);
      off();
      app.destroy(true, { children: true });
    },
  };
}

export type Radii = readonly [number, number, number, number];

/** Rounded rectangle path with separate corner radii (top-left, top-right, bottom-right, bottom-left). */
export function roundRect(g: Graphics, x: number, y: number, w: number, h: number, radii: Radii): Graphics {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((r) => Math.max(0, Math.min(r, max))) as unknown as Radii;
  g.moveTo(x + tl, y);
  g.lineTo(x + w - tr, y);
  if (tr) g.arcTo(x + w, y, x + w, y + tr, tr);
  g.lineTo(x + w, y + h - br);
  if (br) g.arcTo(x + w, y + h, x + w - br, y + h, br);
  g.lineTo(x + bl, y + h);
  if (bl) g.arcTo(x, y + h, x, y + h - bl, bl);
  g.lineTo(x, y + tl);
  if (tl) g.arcTo(x, y, x + tl, y, tl);
  g.closePath();
  return g;
}

/** Filled rounded rectangle with an inside border, like a CSS box with `box-sizing: border-box`. */
export function box(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: Radii,
  fill: string | { color: string; alpha: number } | null,
  border?: { width: number; color: string; alpha?: number },
): Graphics {
  if (fill) roundRect(g, x, y, w, h, radii).fill(typeof fill === 'string' ? { color: fill } : fill);
  if (border && border.width > 0) {
    const b = border.width / 2;
    roundRect(
      g,
      x + b,
      y + b,
      w - border.width,
      h - border.width,
      radii.map((r) => Math.max(0, r - b)) as unknown as Radii,
    ).stroke({
      width: border.width,
      color: border.color,
      alpha: border.alpha ?? 1,
    });
  }
  return g;
}

/** Dashed straight line. Pixi has no dash support, so segments are drawn one by one. */
export function dashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
  style: { width: number; color: string; cap?: 'round' | 'butt'; alpha?: number },
): Graphics {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  for (let d = 0; d < len; d += dash + gap) {
    const e = Math.min(len, d + dash);
    g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
  }
  return g.stroke({ width: style.width, color: style.color, cap: style.cap ?? 'butt', alpha: style.alpha ?? 1 });
}

/** Dashed rounded-rectangle outline (approximated by dashed sides, corners left open). */
export function dashedBox(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: { width: number; color: string; alpha?: number },
): Graphics {
  const b = style.width / 2;
  dashedLine(g, x + r, y + b, x + w - r, y + b, 5, 3, style);
  dashedLine(g, x + r, y + h - b, x + w - r, y + h - b, 5, 3, style);
  dashedLine(g, x + b, y + r, x + b, y + h - r, 5, 3, style);
  dashedLine(g, x + w - b, y + r, x + w - b, y + h - r, 5, 3, style);
  return g;
}
