# Project context and decisions

Background for any agent or person picking up this project: how it started, what has been decided and why. The specs in `docs/spec/` are the rules; this file explains the thinking behind them.

## Origin

The owner (Łukasz) researched **Magic Sort** (Grand Games, 2024), the top-earning water-sort puzzle game, and decided to build his own game on the same core mechanic. Research and early strategy: [research doc](https://claude.ai/artifact/X8XvXcXDFvD4jXtXrQkwJ3). Visual designs: [design canvas](https://claude.ai/artifact/LPFP1rLxBKHf7pMFusK9ra) (exported into `docs/design/`). Both links are private to the owner; everything needed is copied into this repo.

Key findings that shaped the design:

- The sort mechanic is simple and well understood (solvability is NP-complete in general, but small levels solve in milliseconds). The value is in level design, fairness, polish and progression.
- Magic Sort's main weakness, per its reviews: hidden colours and "Super Hard" levels feel like luck, retries reshuffle the layout, and the game auto-fails while you still hold boosters. Fixing these is our main improvement.
- When the first big difficulty spike arrives matters more than average difficulty: hook players first (20–40 gentle levels), then raise the pressure.

## Decisions (with the owner)

| Decision | Detail |
| --- | --- |
| Audience | Friends and family, adults. Not for children. |
| Money | No ads, no purchases, no monetisation at all. |
| Feel | Keep all of Magic Sort's mechanics, difficulty and hooks: limited boosters, coins, streaks, hard levels, events, map. Everything is earned by playing. |
| Fairness | Levels are fixed and solver-verified; a retry gives the same layout; owned boosters are usable at a dead end; hidden colours never decide the outcome by luck. |
| Theme | A night out, cocktail bars across four cities: Amsterdam (brown café), London (traditional pub), New York (Art Deco speakeasy), Tokyo (neon back alley). More cities later as data. |
| Order | Amsterdam first (levels 1–100), then London, New York, Tokyo. A new player starts in Amsterdam, level 1. |
| Style | Flat graphics drawn in code, Two Dots-style level map, one look per city. No pixel art. |
| Drinks | Plain colours, no shapes or symbols on them (owner's choice). Colours must differ in lightness. |
| Blockers | Shown visually, never with text: a picture of the blocker plus a round badge in the colour of the drink that releases it. No bikes in Amsterdam. |
| Stars | Based on pours against the solver's best; undo does not refund moves; the extra glass caps at 2 stars; time never counts. |
| Brain training | Optional modes (planning score, plan-ahead, memory) later; no claims of general brain improvement. |
| Platform | Web app first (installable PWA), then iOS and Android via Capacitor. TypeScript, PixiJS. |
| Who builds it | Coding agents write all the code. The owner reviews, plays, and owns accounts and keys. |

## History

- 2026-11-02: research, design canvas, specs, backlog, rules engine and solver (T00). The solver found Tokyo level 327 needs 16 pours (the hand solution in the design used 17).
- 2026-11-03: a scheduled unattended build was set up but its runs ended immediately without building anything (most likely they could not attach the repository). The schedule is paused; work continues in an interactive remote session instead.

## Working with the owner

- He prefers short, plain updates and decisions made rather than asked, unless they are expensive to undo.
- For anything visual, show a screenshot next to the design reference.
- He reviews pull requests; do not push to `main` unless he asks.
