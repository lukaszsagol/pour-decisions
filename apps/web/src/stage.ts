/**
 * Every screen is laid out on the design's 390×844 logical canvas (195×422
 * art pixels) and scaled to fit the viewport by a whole number of device
 * pixels per art pixel, centred. Screens continue their art into the margins
 * around it (see `Bleed`); what they leave shows the screen's ground colour.
 */
export const STAGE_W = 390;
export const STAGE_H = 844;
/** The pixel art grid: one art pixel is 2 logical px. */
export const ART_W = 195;
export const ART_H = 422;
export const ART = 2;

/** Art pixels of screen beyond each edge of the stage, which screens fill by continuing their art. */
export interface Bleed {
  l: number;
  r: number;
  t: number;
  b: number;
}

/**
 * Fits the 195×422 art grid into a viewport: k whole device pixels per art
 * pixel (the largest that fits), the stage's CSS scale, its offsets snapped
 * to device pixels so the art grid lines up with the screen's, and how many
 * whole art pixels it takes to reach each edge of the screen from the stage.
 */
export function artFit(
  vw: number,
  vh: number,
  dpr: number,
): { k: number; scale: number; left: number; top: number; bleed: Bleed } {
  const k = Math.max(1, Math.floor(Math.min((vw * dpr) / ART_W, (vh * dpr) / ART_H)));
  const scale = k / (ART * dpr);
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const left = snap((vw - STAGE_W * scale) / 2);
  const top = snap(Math.max(0, (vh - STAGE_H * scale) / 2));
  const reach = (px: number) => Math.max(0, Math.ceil(px / k - 1e-6));
  const bleed = {
    l: reach(left * dpr),
    r: reach(vw * dpr - left * dpr - ART_W * k),
    t: reach(top * dpr),
    b: reach(vh * dpr - top * dpr - ART_H * k),
  };
  return { k, scale, left, top, bleed };
}

export interface Stage {
  root: HTMLElement;
  el: HTMLElement;
  scale: number;
  /** Device pixels per art pixel (a whole number). */
  artScale: number;
  /** The screen beyond the stage, in art pixels. */
  bleed: Bleed;
  onResize(fn: () => void): () => void;
}

export function createStage(root: HTMLElement): Stage {
  const el = document.createElement('div');
  el.className = 'stage';
  root.appendChild(el);
  const listeners = new Set<() => void>();
  const stage: Stage = {
    root,
    el,
    scale: 1,
    artScale: 2,
    bleed: { l: 0, r: 0, t: 0, b: 0 },
    onResize(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const fit = () => {
    const f = artFit(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    stage.scale = f.scale;
    stage.artScale = f.k;
    stage.bleed = f.bleed;
    el.style.transform = `translate(${f.left}px, ${f.top}px) scale(${f.scale})`;
    listeners.forEach((fn) => fn());
  };
  window.addEventListener('resize', fit);
  fit();
  return stage;
}
