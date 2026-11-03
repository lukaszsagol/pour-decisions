# AGENTS.md

Instructions for coding agents working in this repository. Read this file fully before you change anything. Humans: start with `README.md`.

## What we are building

**Pour Decisions** is a water-sort puzzle game for a private group of friends and family. You pour layers of coloured drinks between glasses until every glass holds one drink. The game is set over one night out in four cities (Amsterdam, London, New York, Tokyo), each with its own look, drinks and blockers. There are no ads and no in-app purchases. The game must still be properly hard and properly hooky: limited boosters, coins earned in play, win streaks, stars, Hard and Super Hard levels, a level map and family leaderboards.

It ships as a web app (PWA) first, then as iOS and Android apps wrapped with Capacitor. Everything is written by agents; one human (the owner) reviews pull requests, plays the game and owns the store accounts.

## Where things are

| Path | What it is |
| --- | --- |
| `TASKS.md` | The ordered backlog. **Your work comes from here.** |
| `docs/CONTEXT.md` | Background: how the project started, the owner's decisions and why. Read it once. |
| `docs/OVERNIGHT.md` | The protocol for unattended builds. Follow it exactly when running unattended. |
| `docs/spec/` | Specs: game rules, progression and economy, screens, cities and themes, levels. **The source of truth.** |
| `docs/design/screens/*.png` | Reference screenshots of every designed screen (390×844 logical px, rendered at 2×). Match these. |
| `docs/design/screens/*.html` | The same screens as standalone HTML. Open them in a browser for exact colours, sizes and fonts. |
| `docs/design/source/` | Original design-canvas sources. `TokyoLevel.dc.html` contains a working prototype of the level logic. |
| `themes/*.json` | Design tokens per city: colours, fonts, drinks, blocker skins. Code reads these; never hard-code city styling. |
| `packages/engine` | The rules engine and solver. Pure TypeScript, no DOM, fully tested. |
| `agent-logs/` | Run logs and screenshots from unattended runs. |

Planned (created by tasks): `tools/levelgen` (level generator CLI), `apps/web` (the game client), `levels/` (generated level packs).

## Stack and conventions

- **TypeScript everywhere**, strict mode, ES modules, Node 22. npm workspaces.
- **Engine**: `packages/engine` stays pure: no DOM, no randomness without an injected seed, no I/O. Everything else depends on it, never the reverse.
- **Client** (`apps/web`): Vite + PixiJS for the play area and maps; plain DOM/CSS for menus and overlays. No React unless a task says so.
- **Tests**: Vitest for logic, Playwright for end-to-end and screenshot tests. Every change ships with tests.
- **Determinism**: levels, the daily puzzle and the generator are seeded. The same seed always gives the same output.
- **No new runtime dependency** without saying why in the PR description. Prefer small, well-known packages.
- **Accessibility**: real buttons, labels on icon buttons, 44 px minimum touch targets, colour contrast as in the designs.
- **Copy**: sentence case, short, no exclamation marks in UI text. British English spelling in UI ("colour").
- Keep files small and focused. Name things after the game's own words (bottle, unit, drink, pour, blocker).

## Commands

```bash
npm install                 # once
npm run check               # typecheck + all tests. Must pass before every commit.
npm test                    # tests only
npm run typecheck           # tsc -b
npm run dev -w apps/web     # play the game at http://localhost:5173
npm run build -w apps/web   # production build into apps/web/dist
npm run e2e -w apps/web     # Playwright tests; saves screenshots to agent-logs/assets/
```

Playwright needs a browser once: `npx playwright install chromium`.

Dev routes: `#/level/<n>` opens a level directly, `#/fixture/<name>` shows a design reference state (see `apps/web/src/fixtures.ts`).

Tasks add more commands. Document any you add here.

## Definition of done (every task)

1. Acceptance criteria in `TASKS.md` are met, each one checked.
2. `npm run check` passes. CI is green.
3. New behaviour has tests. Golden tests in `packages/engine/test` still pass and are not weakened.
4. UI work: a Playwright screenshot of the result is attached to the PR, next to the matching design reference.
5. Docs updated: spec changes in `docs/spec/`, new commands in this file, task status in `TASKS.md`.
6. The PR description says what changed, how it was tested, and anything you were unsure about.

## Rules

- **Never weaken a test to make it pass.** If a golden value is wrong, explain why in the PR and change it in its own commit.
- **Do not change the game rules** (`docs/spec/rules.md`) unless the task says so.
- **Stay inside your task.** If you find a bug or idea outside it, add it to the "Found while working" section at the bottom of `TASKS.md`.
- **Never commit secrets.** Anything needing keys (Supabase, store accounts, signing) is marked `needs-human`. Build it behind config, but do not invent credentials.
- If you are blocked, write down what blocks you in the task and the run log, and move on to the next task you can do.
