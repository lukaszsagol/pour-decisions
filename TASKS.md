# Tasks

The ordered backlog. Agents take the first task whose status is `todo` and whose dependencies are `done` (or `in-review` on the branch they are working on). See `docs/OVERNIGHT.md`.

**Statuses**: `todo` · `in-progress` · `in-review` (finished, in the open pull request) · `done` (merged to main) · `blocked` (reason written under the task) · `needs-human` (an agent can prepare it, but a person must finish it).

**Sizes** are rough: S ≈ under 1 hour of agent time, M ≈ 1–3 hours, L ≈ more.

---

## Phase 1: foundations

### T00 · Seed rules engine and solver · `done` · M
Pure TypeScript engine (`packages/engine`): bottles, pour rule, hidden units, only and locked bottles, win and dead-end detection, state key, validation, breadth-first solver with node budget, golden tests including Tokyo level 327 (best 16).

### T01 · CI and code style · `in-review` · S
Depends on: T00
- [x] `.github/workflows/ci.yml` runs `npm ci` and `npm run check` on every push and pull request (Node 22). (A starter file exists; make sure it passes.)
- [x] ESLint (typescript-eslint, recommended) and Prettier configured; `npm run lint` added to `npm run check`.
- [x] Whole repo formatted; check passes.

### T02 · Game session API · `in-review` · M
Depends on: T00
A `Game` class in `packages/engine/src/game.ts` that the client drives.
- [x] Holds the current bottles, move count, history, booster stock and the level's `best`.
- [x] `select`/`tap(index)` semantics as in `docs/spec/rules.md`: first tap selects, second tap pours or re-selects; returns an event (`selected`, `poured`, `rejected`, `deselected`).
- [x] `undo()` restores the previous position; the move count is **not** reduced; consumes one undo.
- [x] `addGlass()` adds an empty bottle once per level; consumes one extra glass; caps stars at 2.
- [x] `hint()` returns a useful pour from the current position using the solver (falls back to any legal pour); consumes one hint.
- [x] `status`: `playing`, `won`, `deadEnd`. `stars()` and `perfect` per the rules in `docs/spec/rules.md`.
- [x] Serialisable to and from JSON (to resume a level).
- [x] Tests cover every bullet, including playing Tokyo 327's solver solution to a 3-star "perfect" win.

### T03 · Seeded random numbers and the dealer · `in-review` · S
Depends on: T00
- [x] Seeded RNG (for example mulberry32) in `packages/engine/src/random.ts`; same seed gives the same sequence.
- [x] `deal({ drinks, capacity, empties, seed, constraints })` returns bottles per `docs/spec/levels.md` step 1 (no complete bottle at start, capped same-drink runs).
- [x] Tests: determinism, every drink appears `capacity` times, constraints hold over 1 000 seeds.

### T04 · Solver metrics and larger levels · `in-review` · M
Depends on: T00
- [x] `analyse(bottles)` returns `best`, branching factor, share of first moves that lead to a dead end, number of winning first moves.
- [x] A faster search for big levels (A* or iterative deepening with a heuristic such as colour breaks) used when breadth-first exceeds its budget; still returns verified solutions.
- [x] A 10-drink, 12-bottle level solves in under 3 seconds on CI. Add it as a golden test.

### T05 · Bot player and difficulty score · `in-review` · M
Depends on: T02, T04
- [x] Bot that plays like a casual human: prefers same-drink pours, sometimes makes random legal pours (mistake rate parameter), uses no boosters.
- [x] `difficulty(level)` combines bot win rate over N runs with the solver metrics into a 0–100 score and a band (`easy`, `normal`, `hard`, `superHard`).
- [x] Tests: easy golden levels score lower than Tokyo 327; results are deterministic for a given seed.

### T06 · Level generator CLI and first packs · `in-review` · L
Depends on: T03, T04, T05
- [x] `tools/levelgen` workspace with `npm run levels -- --city tokyo --bar 2` writing `levels/<city>/<bar>.json` in the format in `docs/spec/levels.md`.
- [x] Each bar: 20 levels following the curve in `docs/spec/progression.md` (sawtooth, Hard every 5–10, one Super Hard, relief after each).
- [x] Generates Amsterdam bars 1–2 first (levels 1–40, the start of the game), then Tokyo bar 2. Tokyo level 327 must be the designed golden level (it is hand-made; insert it at its number).
- [x] The first levels teach the game: level 1 has 2 drinks and an obvious solution, drinks are added gradually, no blockers before Amsterdam bar 2, and the locked glass (Amsterdam's blocker) is introduced with an easy teaching level.
- [x] Every generated level is solver-verified; a test re-verifies all committed packs.
- [x] Re-running with the same seeds reproduces identical files.

### T07 · Theme loading and drink palettes · `in-review` · M
Depends on: T00
- [x] Typed loader and validator for `themes/*.json` (no new dependency needed; a small hand-written validator is fine).
- [x] Extend each city to at least 10 drinks with real names, keeping the existing first five.
- [x] Test: every pair of drinks within a city differs enough to tell apart (CIEDE2000 ΔE ≥ 20, and at least 8 points of L* between neighbours in the list). Adjust colours until it passes.

## Phase 2: the game client

### T08 · Web app scaffold and static level screen · `in-review` · L
Depends on: T02, T07
The game starts in Amsterdam (levels 1–100), so the first city built is Amsterdam. Build the screen theme-driven from the start, so other cities are a theme swap plus skins.
- [x] `apps/web` with Vite + TypeScript + PixiJS. `npm run dev -w apps/web` serves it; `npm run build -w apps/web` builds it.
- [x] Renders the Amsterdam level screen matching `docs/design/screens/AmsterdamLevel.png`: Delft tile band, header with bar name and moves, back-bar shelf with stoneware bottles and lamp, tulip glasses in rows of 4, counter with three beer-mat boosters. Theme values come from `themes/amsterdam.json`.
- [x] Until T06 exists, use a small hand-made starter pack for Amsterdam levels 1–5 (2–3 drinks), committed in `levels/amsterdam/starter.json` and solver-verified by a test.
- [x] Scales to fit any phone width from 360 px; centred with a max width on larger screens.
- [x] Playwright set up (`npm run e2e -w apps/web`); a test loads the level and saves a screenshot to `agent-logs/assets/` for the PR.

### T09 · Level interaction · `in-review` · L
Depends on: T08
- [x] Tap to select (glass lifts 16 px), tap to pour, illegal tap flashes the target red and shakes, no error text.
- [x] Undo, extra glass and hint buttons work with counts, using the `Game` API.
- [x] Dead-end panel (Undo, Add glass, Restart) and win overlay (stars, verdict, moves vs best).
- [x] First-level guidance for a new player: on level 1, a pointer shows "tap this glass, then that one" for the first pour (no text walls).
- [x] Playwright e2e test plays the solver's solution for Amsterdam level 1 by tapping and reaches a 3-star win. A second test loads golden Tokyo level 327 with the Tokyo theme and wins it the same way.

### T10 · Pour animation and feel · `in-review` · M
Depends on: T09
- [x] Pour animation per `docs/spec/screens.md` (tilt, arcing stream, fill, settle, about 450 ms); taps during animation are queued.
- [x] Completed-glass celebration; subtle idle wobble of liquid surfaces.
- [x] Respects `prefers-reduced-motion` (instant pours).

### T11 · Blocker rendering · `in-review` · M
Depends on: T09
- [x] Generic skin interface: each theme maps `hidden`, `only` and `locked` to a renderer.
- [x] Amsterdam skins first (see `AmsterdamLevel.png`): locked glass with brass chains, padlock and a release badge; stoneware-jug cover for hidden units; kruik tag for only-glasses. Badge colour = the releasing drink. No text labels.
- [x] Locked bottles visibly unlock when their drink is completed (short animation).

### T12 · Level complete screen · `in-review` · M
Depends on: T09
- [x] Layout matches `docs/design/screens/TokyoComplete.png`, drawn with the current city's theme (Amsterdam first): stars, verdict, moves vs best, rewards row, recipe card when a bar is finished (recipes come from a `recipes` file per city; add Amsterdam's five, real recipes).
- [x] Next level and Share (copies a text result to the clipboard) buttons.

### T13 · City map screen · `in-review` · L
Depends on: T06, T12
- [x] Amsterdam canal map matching `docs/design/screens/AmsterdamMap.png` (layout shared with `TokyoMap.png`), driven by the level packs and saved progress: path, nodes with stars, Hard ring, Super Hard flag, current node with ring, bottom panel with Play. A new player starts at level 1.
- [x] Scrolls through all 100 levels of the city; bars separated by a landmark (gate).

### T14 · Passport screen and navigation · `in-review` · M
Depends on: T13
- [x] Passport matching `docs/design/screens/Main.png`; city cards from themes and progress; locked cities shown greyed. A new player sees Amsterdam as the current city and the other three locked (the design shows a late-game player).
- [x] Navigation Passport → Map → Level → Complete → Map, tab bar on Passport and Map.

### T15 · Saved progress and economy · `in-review` · M
Depends on: T09
- [x] Versioned local save (localStorage with a migration hook): per-level stars and best moves, coins, booster stock, streak, current level. (Coins removed later by the owner; save version 2.)
- [x] Rewards and prices from `docs/spec/progression.md`, all in one config file.
- [x] Win streak rewards at 3, 5 and 10; fail resets.

### T16 · London, New York and Tokyo skins · `in-review` · L
Depends on: T11, T13
- [x] Level and map screens for each city matching their design references, including glass shapes and blocker skins in `docs/spec/cities.md`.
- [x] One test per city loads a level and saves a screenshot.

### T17 · Installable web app and deploy · `in-review` · M
Depends on: T14
- [x] Web app manifest, icons (generated simple placeholder art is fine), service worker for offline play.
- [x] GitHub Actions workflow deploying `apps/web` to GitHub Pages on pushes to main. **needs-human**: the owner enables Pages in repo settings; note this in the PR.
  Workflow added (`.github/workflows/pages.yml`). Owner: Settings → Pages → Source: GitHub Actions, then merge to main or run the workflow by hand.

### T18 · Daily pour · `in-review` · M
Depends on: T06, T15
- [x] Level of the day generated on the device from the date as seed (same for everyone), medium difficulty.
- [x] Share text like "Pour Decisions · 3 Nov · ★★★ 14 moves (best 13)".

### T19 · Play log · `in-review` · S
Depends on: T15
- [x] Local event log (level start, pour, undo, booster use, dead end, win, quit) with an export button in a hidden debug menu.
- [x] Documented format in `docs/spec/levels.md` so a later task can tune difficulty from it.

### T24 · Visual polish pass, Amsterdam · `in-review` · M
Requested by the owner after review.
- [x] Liquid fills the glass wall to wall; runs of the same drink merge into one block.
- [x] Glass shading: cylinder shading on the liquid, a bright surface band, gloss streaks, rim highlight, contact shadow; selected, hint and reject glasses glow.
- [x] Amsterdam lighting: lamp glow and light cone, shelf and counter shadows, lit stoneware, board seams, darker sides.
- [x] Motion: lift with a little overshoot, a dip when a pour lands, sparkles and garnish on a completed glass (now on their own layer, so they are not wiped by the redraw), boosters that press down.

## Phase 3: needs a person

### T20 · Family backend · `needs-human` · L
Depends on: T15
Supabase project for family groups (invite codes), synced progress, daily results and leaderboards. An agent can build the client side behind a feature flag with a fake backend; the owner creates the project and adds keys.

Agent part done (2026-11-03): the client behind the `family` feature flag (`?flags=family`, or the hidden debug menu), against a fake on-device backend (`apps/web/src/family/fake.ts`) with three pretend relatives. Covers create or join a group by invite code, members and where they are, the weekly stars board, tonight's results, avatars on the map, "N of M have played" on the passport, and the family-best row on the complete screen. **Owner**: create the Supabase project and keys, then an agent implements `FamilyBackend` (`apps/web/src/family/backend.ts`) for Supabase and switches `family/index.ts` to it when keys are configured.

### T21 · iOS and Android apps · `needs-human` · L
Depends on: T17
Capacitor wrapper, app icons, splash screens; TestFlight and Google Play closed testing. Needs a Mac with Xcode, an Apple Developer account and a Google Play developer account.

### T22 · Sound · `in-review` · S
Depends on: T10
Pour, clink, completion and win sounds synthesised with Web Audio (no audio files needed yet); per-city ambience hooks; mute setting.

### T23 · Brain-training modes · `in-review` · L
Depends on: T15
Planning score, plan-ahead mode, memory mode, adaptive difficulty and progress charts, per `docs/spec/progression.md`.

---

## Phase 4: pixel art

The art style changes to pixel art. Read `docs/spec/pixel-art.md` and look at everything in `docs/design/pixel/` before starting any task in this phase. Game logic, levels, saves and tests stay as they are; only drawing and styling change. Keep the game playable after every task.

### T25 · Pixel rendering foundation · `in-review` · M
Depends on: T24
- [x] A small pixel-drawing module in `apps/web/src/pixel/` ported from `docs/design/pixel/reference/pixel.py` and the helpers in `ams_pixel3.py`: pixel buffer, `px`, `rect`, `hline`, `vline`, `sprite`, `line`, `mix`, ordered dither, `shadowBox`, digit sprites. Unit-tested.
- [x] Buffers become Pixi textures with nearest-neighbour filtering. A helper redraws a buffer only when its content changes.
- [x] The stage scales the 195×422 art grid by the largest whole number of device pixels that fits, centred, with the city ground colour around it. Text overlays stay aligned.
- [x] Pixelify Sans loaded and used as the game font; offline fallback via the service worker cache.

### T26 · Amsterdam level in pixel art · `in-review` · L
Depends on: T25
- [x] The Amsterdam level screen matches `docs/design/pixel/amsterdam-level-screen.png`: backdrop, tulip glasses, liquids with full shading, reflection strip, locked glass with chain rings, padlock and cherry badge, counter and beer mats with counts.
- [x] A test renders the static backdrop buffer and compares it with `docs/design/pixel/amsterdam-level-1x.png` (allow small differences where the layout had to change, and list them in the pull request).
- [x] Selection lift, rejection shake, pour (tilt frames, 2 px stream, row-by-row fill), completion sparkle and unlock animations all move in whole art pixels.
- [x] Glass sizes and positions still fit 7–9 glasses; layouts with more glasses use a second row the same way.

### T27 · London, New York and Tokyo levels in pixel art · `in-review` · L
Depends on: T26
- [x] Each city's level screen redrawn per the city table in `docs/spec/pixel-art.md`, with its own glass shape and all three blocker skins (locked, hidden, only).
- [x] Badge icons drawn for every drink in every city that can release a lock or own an only-glass.
- [x] A screenshot per city attached to the pull request; quality at least that of the Amsterdam reference (multi-tone shading, dithered light, outlines, no flat fills on large areas).

### T28 · City maps in pixel art · `todo` · L
Depends on: T25
- [ ] All four maps redrawn as pixel scenes (see the style guide), keeping the layout and behaviour of the current map screen: path, nodes, stars, hard and super hard markers, family avatars, bottom panel.
- [ ] Pixel coin nodes and avatars; the current node pulses in whole-pixel steps.

### T29 · Menus and overlays in pixel art · `todo` · L
Depends on: T25
- [ ] Passport (with pixel city scenes on the cards), level complete (pixel stars, pixel recipe card), daily pour, family, training, settings, dead-end panel and win overlay restyled with the pixel UI kit: stepped borders, bevelled buttons, pixel icons, Pixelify Sans.
- [ ] A shared set of CSS classes or components for panels, buttons and icons so screens stay consistent.
- [ ] Accessibility unchanged: real buttons and labels, 44 px targets, contrast.

### T30 · Pixel art screenshots and review · `todo` · S
Depends on: T26, T27, T28, T29
- [ ] Playwright screenshots of every screen in every city committed to `agent-logs/assets/pixel/`.
- [ ] A reviewer pass (sub-agent if available) compares each against the style guide and fixes anything that falls short: blurry scaling, flat fills, missing shading, misaligned text.

## Found while working

Agents add bugs and ideas here instead of fixing things outside their task.

- **Lives flag**: `progression.md` describes a `lives` feature flag (5 lives, 30-minute refill). No task builds it; `economy.lives` config and the `lives` flag name exist, the behaviour does not.
- **Frozen layer** (Tokyo's planned blocker) is not in the engine yet, so Tokyo uses the earlier blockers. Needs its own engine task, then a skin (`ice-ball` in `themes/tokyo.json`).
- **Release badges** are plain discs in the drink's colour. The designs show an icon in the badge (a cherry); that would need an icon per drink.
- **Bundle size**: all 400 levels are bundled eagerly (about 1.1 MB of JS, 170 KB gzipped). Lazy-load packs per city if start-up gets slow on old phones.
- **Map header** sits over the top of the path, as in the designs; on very short screens a node can hide under it until scrolled.
