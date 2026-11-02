# Pour Decisions

A water-sort puzzle game for friends and family: pour drinks between glasses until each glass holds one drink, on a night out across Amsterdam, London, New York and Tokyo. No ads, no purchases, properly hard.

The code is written by coding agents. Instructions for them are in `AGENTS.md`; the backlog is `TASKS.md`; unattended builds follow `docs/OVERNIGHT.md`.

## Run it

```bash
npm install
npm run check   # typecheck and tests
```

Once the web client exists (task T08): `npm run dev -w apps/web`.

## Design

- Screens: `docs/design/screens/` (images and standalone HTML), taken from the design canvas.
- Specs: `docs/spec/` (rules, progression, screens, cities, levels).
- Themes: `themes/*.json`.

## For the owner

During and after the unattended build:

1. Open the pull request `Unattended build` (label `overnight`). Its description lists every finished task; the run logs are in `agent-logs/`.
2. Play it: check out the branch, `npm install`, `npm run dev -w apps/web`.
3. Leave review comments or merge. For more work, add tasks to `TASKS.md` and start another run.

Tasks marked `needs-human` need you: enabling GitHub Pages (T17), the backend project and keys (T20), and Apple and Google accounts with a Mac for the app builds (T21).
