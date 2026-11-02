# Screens

Every screen is designed for a 390×844 logical-pixel phone and must also work from 360 px wide up to tablet width (centre the play area, scale up to a max width). Reference images: `docs/design/screens/<Name>.png`. Exact styles: the matching `.html` file.

| Screen | Reference | Purpose |
| --- | --- | --- |
| Passport | `Main` | Home. City cards (current city highlighted, finished cities stamped), tonight's daily pour, bottom tab bar (Map, Daily, Passport, Family). |
| City map | `TokyoMap`, `AmsterdamMap`, `LondonMap`, `NewYorkMap` | Winding path of level nodes through the city. Finished levels show stars, Hard levels have a ring, the next Super Hard is flagged, family avatars sit on their levels. Bottom panel: current level, booster counts, Play button, levels left to the next bar. |
| Level | `AmsterdamLevel`, `LondonLevel`, `NewYorkLevel`, `TokyoLevel` | The puzzle. Header (back, bar name, move counter with best, restart), back-bar decoration, glasses in rows of up to 4, counter with three booster buttons (undo, extra glass, hint) showing counts. |
| Level complete | `TokyoComplete` | Stars, verdict ("Perfect pour"), moves vs best, rewards, family comparison, recipe card when a bar is finished, Next level and Share. |

## Level screen details

- Glasses lift 16 px when selected, with a 160 ms ease-out.
- A pour animates: the source tilts over the target, a stream arcs across, the target fills, the source settles back. Target duration about 450 ms. Taps during an animation are queued, not dropped.
- Completed glass: a small celebration (garnish drops in, glass glows briefly with the theme accent).
- Dead end: a panel over the counter with Undo, Add glass, Restart (see `TokyoLevel` source for the prototype).
- Win: overlay with stars, then the Level complete screen.
- Hidden unit: dark unit with "?".
- No shapes or symbols on drinks; colours only (decided by the owner). Keep the colours distinct in lightness.

## Navigation

Passport → City map → Level → Level complete → City map. Back from a level goes to its city map. The tab bar shows on Passport and City map only.

## Prototype

`docs/design/source/TokyoLevel.dc.html` contains a working prototype of the level screen's logic (pour, undo, extra glass, hint, dead end, stars). Use it to understand intended behaviour; the real implementation uses `packages/engine`.
