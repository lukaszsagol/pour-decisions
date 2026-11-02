# Game rules

The rules engine in `packages/engine` implements this document. If they disagree, this document wins and the engine has a bug.

## Board

- A level is a set of **bottles** (shown as glasses). Each bottle holds a stack of **units**, bottom to top.
- Every bottle in a level has the same **capacity**. The default is 4.
- Each unit is one **drink** (a colour). Every drink in a level appears exactly `capacity` times.
- A level normally has 1–2 empty bottles at the start.

## Pouring

The player taps a bottle (it lifts), then taps a target bottle.

A pour from A to B is legal when all of these hold:

1. A and B are different bottles, and neither is locked.
2. A is not empty.
3. B is not full.
4. B is empty, or B's top unit is the same drink as A's top unit.
5. If B has an **only** rule, A's top drink is that drink.

A pour moves A's whole top run (the contiguous same-drink units at the top), or as many as fit in B.

Pouring out of a complete bottle is legal but pointless; the solver and hint system ignore it.

An illegal tap gives visual feedback only: the target flashes red and shakes. No error text.

## Winning and losing

- **Complete bottle**: full, one drink, nothing hidden.
- **Won**: every bottle is empty or complete, and no bottle is still locked.
- **Dead end**: not won, and no legal pour exists (ignoring pours out of complete bottles). The game then offers: undo, add an extra glass, or restart. It never ends the level on its own while the player still owns a usable booster.

## Blockers

Blockers are rule changes on a single bottle. Each city draws them in its own style (see `cities.md`), but the rules are shared.

| Blocker | Rule | Engine field |
| --- | --- | --- |
| Hidden units | A hidden unit shows as "?" until it becomes the top unit of its bottle, then stays revealed. | `Unit.hidden` |
| Only bottle | Accepts only one drink. Shown with a badge in that drink's colour and dashed slots. | `Bottle.only` |
| Locked bottle | Cannot be poured into or out of until a bottle of a given drink is completed. Shown with a badge in that drink's colour on the lock. | `Bottle.lockedUntil` |

Planned, not yet in the engine (add with their own task): **frozen layer** (a unit that cannot move until the unit next to it is cleared), **short glass** (lower capacity).

Visual rule for all blockers: **no text labels**. A blocker is explained by its picture plus a round badge in the colour of the drink that releases it.

## Boosters

| Booster | Effect | Rules |
| --- | --- | --- |
| Undo | Reverts the last pour. | The move counter is **not** reduced. |
| Extra glass | Adds one empty bottle. | Once per level. Caps the result at 2 stars. |
| Hint | Highlights a useful pour (source and target outlined). | Uses the solver from the current position. |

Boosters are limited and earned in play (see `progression.md`). There are no real-money purchases.

## Moves and stars

A **move** is one pour. Undo does not give moves back.

Each level stores `best`: the fewest pours that solve it, found by the solver when the level is generated.

| Stars | Rule |
| --- | --- |
| 3 | moves ≤ max(best + 1, floor(best × 1.1)) |
| 2 | moves ≤ floor(best × 1.35) |
| 1 | any solve |

- Using the extra glass caps the result at 2 stars.
- Matching `best` exactly also earns a "Perfect" badge.
- On levels generated on the device (daily, endless) `best` may not be optimal; beating it earns a "You beat the computer" badge.
- Time never affects stars.

## Determinism

A level is fixed data. Retrying shows exactly the same layout. Nothing about a level changes silently because the player failed or paid.
