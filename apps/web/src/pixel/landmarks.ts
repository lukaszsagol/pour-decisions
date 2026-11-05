import type { CityId } from '@pour/themes';
import type { PixelCanvas } from './canvas.js';
import { loadSprite } from './sprite.js';

/**
 * Drawn night scenes of each city for the top of its map: `landmarks/<city>.png`,
 * 195×80 art pixels, standing on the map's street line.
 * Generated with Retro Diffusion (prompts in docs/design/asset-prompts.md).
 */
const art = import.meta.glob<string>('./landmarks/*.png', { eager: true, query: '?url', import: 'default' });

/** The city's landmark skyline, or undefined when it has none (the map then draws its own). */
export async function landmarkFor(city: CityId): Promise<PixelCanvas | undefined> {
  const url = art[`./landmarks/${city}.png`];
  return url ? loadSprite(url) : undefined;
}
