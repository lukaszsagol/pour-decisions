import { parseBottles, solve, type PackLevel } from '@pour/engine';

/**
 * Hand-made levels inserted at fixed numbers instead of generated ones.
 * Tokyo 327 is the level from the design canvas (also a golden test level).
 */
export const goldenLevels: Record<number, { city: string; build: () => PackLevel }> = {
  327: {
    city: 'tokyo',
    build: () => {
      const bottles = parseBottles(
        [
          'umeshu sakura melon ramune',
          'sakura ramune umeshu yuzu',
          '?melon ?yuzu sakura umeshu',
          'ramune melon yuzu yuzu',
          'umeshu sakura melon ramune',
          '',
          '',
        ],
        4,
        { 5: { only: 'yuzu' } },
      );
      const moves = solve(bottles).moves!;
      return {
        id: 'tokyo-327',
        number: 327,
        difficulty: 'normal',
        best: moves.length,
        seed: 'designed',
        bottles,
        metrics: { branching: 0, deadEndShare: 0, botWinRate: 0, optimal: 1 },
        solution: moves.map((m) => [m.from, m.to]),
      };
    },
  },
};
