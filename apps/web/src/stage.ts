/**
 * Every screen is laid out on the design's 390×844 logical canvas and scaled
 * to fit the viewport, centred. Bars around it take the screen's ground colour.
 */
export const STAGE_W = 390;
export const STAGE_H = 844;

export interface Stage {
  root: HTMLElement;
  el: HTMLElement;
  scale: number;
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
    onResize(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const fit = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    stage.scale = Math.min(vw / STAGE_W, vh / STAGE_H);
    el.style.transform = `translate(${(vw - STAGE_W * stage.scale) / 2}px, ${Math.max(0, (vh - STAGE_H * stage.scale) / 2)}px) scale(${stage.scale})`;
    listeners.forEach((fn) => fn());
  };
  window.addEventListener('resize', fit);
  fit();
  return stage;
}
