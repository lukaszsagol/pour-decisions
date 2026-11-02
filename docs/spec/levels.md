# Levels: generation, difficulty, packs

Levels are generated offline, verified by the solver, scored, then ordered into a curve and shipped as fixed data. The game never invents campaign levels at runtime. (Exceptions: the daily pour and endless mode, which generate on the device from a seed using the same code.)

## Pipeline (`tools/levelgen`)

1. **Deal**: for a target (drinks, capacity, empty bottles, blockers), shuffle units into bottles with a seeded RNG. Constraints: no bottle starts complete; limit same-drink runs; target fragmentation.
2. **Validate**: `validateLevel`, then `solve` within a node budget. Unsolvable or over budget → discard.
3. **Score**: record `best` (fewest pours), branching factor, number of distinct first moves that still lead to a win, share of first moves that lead to a dead end, pours that need an empty bottle.
4. **Simulate**: a bot player (greedy with random mistakes) plays each level 200+ times; its win rate is a proxy for human difficulty.
5. **Blockers**: add hidden units or only/locked bottles, re-solve. For hidden units, the level must be solvable for every reveal order (information never decides the outcome).
6. **Curate**: bucket by difficulty and lay out per `progression.md`.

## Level pack format

`levels/<city>/<bar>.json`:

```json
{
  "city": "tokyo",
  "bar": 2,
  "name": "Golden alley",
  "levels": [
    {
      "id": "tokyo-327",
      "number": 327,
      "difficulty": "normal",
      "best": 16,
      "seed": "…",
      "bottles": [{ "capacity": 4, "units": [{ "drink": "umeshu", "hidden": false }] }],
      "metrics": { "branching": 0, "deadEndShare": 0, "botWinRate": 0 }
    }
  ]
}
```

`difficulty` is one of `normal`, `hard`, `superHard`. Pack files are generated; never edit them by hand. Regenerate from the command and seeds.

## Golden levels

`packages/engine/test/fixtures.ts` holds hand-checked levels with known answers, including the designed Tokyo level 327 (best: 16 pours). They must always pass.
