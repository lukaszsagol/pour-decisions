import type { LevelPack } from '@pour/engine';

/**
 * Pack JSON that stays readable and diffable: one line per bottle and per
 * solution, everything else indented.
 */
export function formatPack(pack: LevelPack): string {
  const levels = pack.levels.map((l) => {
    const bottles = l.bottles.map((b) => `        ${JSON.stringify(b)}`).join(',\n');
    return [
      '    {',
      `      "id": ${JSON.stringify(l.id)},`,
      `      "number": ${l.number},`,
      `      "difficulty": ${JSON.stringify(l.difficulty)},`,
      `      "best": ${l.best},`,
      `      "seed": ${JSON.stringify(l.seed)},`,
      `      "bottles": [\n${bottles}\n      ],`,
      `      "metrics": ${JSON.stringify(l.metrics)},`,
      `      "solution": ${JSON.stringify(l.solution ?? [])}`,
      '    }',
    ].join('\n');
  });
  return [
    '{',
    `  "city": ${JSON.stringify(pack.city)},`,
    `  "bar": ${pack.bar},`,
    `  "name": ${JSON.stringify(pack.name)},`,
    `  "levels": [\n${levels.join(',\n')}\n  ]`,
    '}',
    '',
  ].join('\n');
}
