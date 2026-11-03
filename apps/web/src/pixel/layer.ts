import { Sprite, Texture } from 'pixi.js';
import { invalidate } from '../pixi-util.js';
import type { PixelCanvas } from './canvas.js';

/**
 * A pixel buffer shown as a Pixi sprite with nearest-neighbour filtering.
 * `draw(key, fn)` repaints only when `key` changes.
 */
export class PixelLayer {
  readonly sprite: Sprite;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: Texture;
  private key: string | null = null;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = Texture.from(this.canvas);
    this.texture.source.scaleMode = 'nearest';
    this.sprite = new Sprite(this.texture);
    this.sprite.roundPixels = true;
  }

  /** Repaints from `fn` when `key` differs from the last draw. Returns true when it repainted. */
  draw(key: string, fn: () => PixelCanvas): boolean {
    if (key === this.key) return false;
    this.key = key;
    this.put(fn());
    return true;
  }

  /** Shows a buffer now (for animation frames). */
  put(cv: PixelCanvas): void {
    if (cv.w !== this.w || cv.h !== this.h) throw new Error(`Layer is ${this.w}×${this.h}, buffer ${cv.w}×${cv.h}`);
    this.ctx.putImageData(new ImageData(cv.toRGBA(), cv.w, cv.h), 0, 0);
    this.texture.source.update();
    invalidate();
  }

  destroy(): void {
    this.sprite.destroy();
    this.texture.destroy(true);
  }
}
