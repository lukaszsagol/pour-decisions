# Pour Decisions

A water-sort puzzle game for friends and family: pour drinks between glasses until each glass holds one drink, on a night out across Amsterdam, London, New York and Tokyo. No ads, no purchases, properly hard.

The code is written by coding agents. Instructions for them are in `AGENTS.md`; the backlog is `TASKS.md`; unattended runs follow `docs/NIGHTLY.md`.

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

Each morning:

1. Open the pull request labelled `nightly`. Read the summary and run log, look at the screenshots.
2. Play anything playable (`npm run dev -w apps/web`, or the deployed site once T17 is done).
3. Leave review comments, or merge. The next run continues from the open pull request if you have not merged it.
4. Add new ideas or corrections to `TASKS.md` (new tasks, or under "Found while working").

Tasks marked `needs-human` need you: enabling GitHub Pages (T17), the backend project and keys (T20), and Apple and Google accounts with a Mac for the app builds (T21).
