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
| Coins | Every win; more for stars, Hard levels, streaks, events | Buying boosters, the dead-end continue |
| Undo, extra glass, hint | Starting stock, chests, streak rewards, events, coins | Boosters (see `rules.md`) |
| Stars | 1–3 per level | Chests on the map, the gate to the next bar |

Starting values to tune from play data:

- New player: 5 undo, 2 extra glass, 3 hint, 300 coins.
- Win: 20 coins, +10 per star above 1, ×2 on Hard, ×3 on Super Hard.
- Booster price: 300 coins (about one per 3–5 normal levels).
- Dead-end continue: an extra glass for 300 coins when the player has none.

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
