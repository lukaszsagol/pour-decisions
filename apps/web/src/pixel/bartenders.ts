import type { CityId } from '@pour/themes';

/**
 * Each city's bartender: `bartenders/<city>-<pose>.png`, 48×64 art pixels,
 * transparent background. "cheer" stands on the win card, "think" leans over
 * the dead-end panel. Generated with Retro Diffusion (prompts in
 * docs/design/asset-prompts.md).
 */
const art = import.meta.glob<string>('./bartenders/*.png', { eager: true, query: '?url', import: 'default' });

export type Pose = 'cheer' | 'think';

export function bartender(city: CityId, pose: Pose): string | undefined {
  return art[`./bartenders/${city}-${pose}.png`];
}

/** An <img> of the bartender at 2× (whole art pixels), or nothing when the city has none. */
export function bartenderImg(city: CityId, pose: Pose, className: string): string {
  const src = bartender(city, pose);
  return src ? `<img class="${className} px-img" src="${src}" width="96" height="128" alt="" aria-hidden="true">` : '';
}
