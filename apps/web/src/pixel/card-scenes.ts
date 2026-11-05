import type { CityId } from '@pour/themes';
import type { PixelCanvas } from './canvas.js';
import { loadSprite } from './sprite.js';

/**
 * Drawn night vignettes for the passport cards: `card-scenes/<city>.png`,
 * 64×80 art pixels, shown on the right of each city's card. Generated with
 * Retro Diffusion (prompts in docs/design/asset-prompts.md).
 */
const art = import.meta.glob<string>('./card-scenes/*.png', { eager: true, query: '?url', import: 'default' });
let loaded: Promise<Partial<Record<CityId, PixelCanvas>>> | null = null;

/** Every city's card scene, loaded once. */
export function cardScenes(): Promise<Partial<Record<CityId, PixelCanvas>>> {
  loaded ??= Promise.all(
    Object.entries(art).map(
      async ([file, url]) => [file.replace(/^.*\/(.*)\.png$/, '$1'), await loadSprite(url)] as const,
    ),
  ).then((entries) => Object.fromEntries(entries));
  return loaded;
}
