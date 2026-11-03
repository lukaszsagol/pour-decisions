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

Each level also stores `solution`: a list of `[from, to]` pours of length `best`, so tests can re-verify every pack quickly. `metrics` holds the generator's numbers: `score` (0–100), `botWinRate`, `branching`, `deadEndShare`, `firstMoves`, `winningFirstMoves`, `emptyPours` and `optimal` (1 when `best` is proven shortest by breadth-first search; big levels may only have a best-known solution).

`difficulty` is one of `normal`, `hard`, `superHard`. Pack files are generated; never edit them by hand. Regenerate from the command and seeds.

## Golden levels

`packages/engine/test/fixtures.ts` holds hand-checked levels with known answers, including the designed Tokyo level 327 (best: 16 pours). They must always pass.

## Play log

The client keeps a local log of play events (`localStorage["pour-decisions:log"]`, newest 5 000 kept) so a later task can tune difficulty from real play. It never leaves the device unless exported: Settings → tap the version line five times → Export play log.

The export is a JSON file:

```json
{
  "version": 1,
  "exportedAt": "2026-11-03T21:14:05.120Z",
  "events": [
    { "t": 1762204445120, "level": 21, "type": "start" },
    { "t": 1762204447310, "level": 21, "type": "pour", "from": 0, "to": 4, "moves": 1 },
    { "t": 1762204449002, "level": 21, "type": "undo" },
    { "t": 1762204451876, "level": 21, "type": "booster", "booster": "hint" },
    { "t": 1762204460000, "level": 21, "type": "deadEnd", "moves": 9 },
    { "t": 1762204499000, "level": 21, "type": "win", "moves": 14, "stars": 3 }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `t` | Milliseconds since the epoch, device clock. |
| `level` | Global level number, or `"daily-YYYY-MM-DD"` for the daily pour. |
| `type` | `start` (level opened), `pour`, `undo`, `booster` (`booster`: `extraGlass` or `hint`), `deadEnd` (no pours left), `restart`, `win` (`moves`, `stars`), `quit` (left unfinished, `moves`). |

Time to solve is `win.t − start.t`; thinking time per pour is the gap between `pour` events. Bump `version` if fields change meaning.
