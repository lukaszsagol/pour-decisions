/** Small animation helpers. Everything respects `prefers-reduced-motion`. */

export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const easeOut = (t: number): number => 1 - (1 - t) ** 3;
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const linear = (t: number): number => t;

export interface TweenOptions {
  duration: number;
  ease?: (t: number) => number;
  onUpdate: (t: number) => void;
}

/** Runs `onUpdate` with eased progress 0→1 on animation frames. Resolves when done. With reduced motion it jumps to the end. */
export function tween({ duration, ease = easeOut, onUpdate }: TweenOptions): {
  done: Promise<void>;
  cancel: () => void;
} {
  let raf = 0;
  let cancelled = false;
  const done = new Promise<void>((resolve) => {
    if (duration <= 0 || reducedMotion()) {
      onUpdate(1);
      resolve();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      if (cancelled) return resolve();
      const t = Math.min(1, (now - start) / duration);
      onUpdate(ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else resolve();
    };
    raf = requestAnimationFrame(step);
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
