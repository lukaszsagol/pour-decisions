# Progression, economy and social

The goal: keep everything that makes Magic Sort compelling (scarcity, streaks, hard levels, a journey) but earn everything in play. No ads, no real money.

## Structure

- **4 cities**, played in this order: Amsterdam → London → New York → Tokyo. Calm to intense.
- Each city has **5 bars** (in London, pubs) of **20 levels** each: 100 levels per city, 400 in total. Global level numbers run 1–400 (Amsterdam 1–100, London 101–200, New York 201–300, Tokyo 301–400).
- Each city introduces one new blocker. Blockers stay in later cities, drawn in that city's style.
- Finishing a bar unlocks a real **recipe card**. Finishing a city stamps the **passport**.
- More cities can be added later as data (theme file + level packs), with no engine change.

## Difficulty curve

- First 20–40 levels of the game: gentle, no fail states in practice.
- Within a bar: a sawtooth. Mostly normal levels, a **Hard** level every 5–10 levels, one **Super Hard** per bar, each followed by an easier level.
- Hard and Super Hard levels are marked on the map before you reach them.
- See `levels.md` for how difficulty is measured.

## Economy (earned only)

| Item | How you get it | What it is for |
| --- | --- | --- |
| Undo, extra glass, hint | Starting stock, win-streak rewards, finishing a bar, the daily pour, events | Boosters (see `rules.md`) |
| Stars | 1–3 per level | Progress shown on the map and passport, the gate to the next bar |

There is no currency (coins were dropped by the owner on 2026-11-03): boosters stay scarce and are only earned.

Starting values to tune from play data:

- New player: 5 undo, 2 extra glass, 3 hint.
- Win streak of 3, 5 and 10 first-try wins: an undo, an extra glass, a hint.
- Finishing a bar for the first time: one of each booster.
- The first finish of the daily pour each day: a hint.
- At a dead end the player can undo, use an extra glass they own, or restart.

Implementation notes: all numbers live in `apps/web/src/economy/config.ts`. The save is `localStorage["pour-decisions:save"]`, versioned (version 2 dropped coins), with a migration in `apps/web/src/economy/save.ts`. A "first try" is a win without restarting the level; a restart, or leaving a level unfinished, resets the streak. A dead end alone does not.

## Hooks

- **Win streak**: consecutive first-try wins. Rewards at 3, 5 and 10 (an undo, an extra glass, a hint). A fail resets it.
- **Lives**: off by default. Feature flag `lives` (5 lives, 30-minute refill) to test with the family.
- **Daily pour**: one seeded level per day, the same for everyone. Results shareable as text.
- **Events** (later): race against family members, collection events, a weekly tournament on the daily levels.

## Family

- Players join a **family group** with an invite code. No social logins.
- Shared: progress on the map (avatars), daily results, stars per level, weekly board.
- Everything works offline; social data syncs when online.

## Brain-training modes (later)

Optional modes beside the main map: planning score (moves against the optimum, thinking time), plan-ahead mode (plan the whole sequence, no undo), memory mode (colours shown, then covered), adaptive difficulty, progress charts. Undo stays available in normal play.
