import type { CityId } from '@pour/themes';

/**
 * Passport stamps for finished cities: `stamps/<city>.png`, 32×32 art pixels in
 * one ink colour with an empty band across the lower third for the city code.
 * Generated with Retro Diffusion (prompts in docs/design/asset-prompts.md).
 */
const art = import.meta.glob<string>('./stamps/*.png', { eager: true, query: '?url', import: 'default' });

export function stampFor(city: CityId): string | undefined {
  return art[`./stamps/${city}.png`];
}
