import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cityIds, type CityId } from '@pour/themes';
import { BARS_PER_CITY } from './curve.js';
import { formatPack } from './format.js';
import { generateBar } from './generate.js';

/**
 * npm run levels -- --city tokyo --bar 2    one bar
 * npm run levels -- --city amsterdam        every bar of a city
 * npm run levels -- --all                   everything
 */
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../levels');

const cities: CityId[] = args.includes('--all') ? [...cityIds] : [flag('city') as CityId];
if (!cities[0] || !cities.every((c) => cityIds.includes(c))) {
  console.error(`Usage: npm run levels -- --city <${cityIds.join('|')}> [--bar 1-5] | --all`);
  process.exit(1);
}
const bars = flag('bar') ? [Number(flag('bar'))] : Array.from({ length: BARS_PER_CITY }, (_, i) => i + 1);

for (const city of cities) {
  for (const bar of bars) {
    const t = Date.now();
    const pack = generateBar(city, bar, (l, kind) =>
      console.log(
        `  ${l.id.padEnd(14)} ${kind.padEnd(9)} best ${String(l.best).padStart(2)} score ${l.metrics.score ?? '-'}`,
      ),
    );
    const file = path.join(root, city, `${bar}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, formatPack(pack));
    console.log(
      `${city} bar ${bar}: ${pack.levels.length} levels in ${((Date.now() - t) / 1000).toFixed(1)} s → ${path.relative(process.cwd(), file)}`,
    );
  }
}
