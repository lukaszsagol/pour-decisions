# Nightly run protocol

How an agent works unattended (for example overnight). The owner reviews in the morning. Follow every step; do not ask questions, because nobody is there to answer.

## 1. Start

1. Read `AGENTS.md`, this file, `TASKS.md`, and the newest file in `agent-logs/`.
2. `npm ci`, then `npm run check` on `main`. If `main` is broken, your first job is the smallest fix that makes it pass.
3. Update statuses: any task marked `in-review` whose work is now merged into `main` becomes `done`.

## 2. Pick the branch

- If an **open pull request labelled `nightly`** exists from an earlier run, check out its branch and continue on it. Do not redo its work. The owner has not merged it yet.
- Otherwise create `nightly/YYYY-MM-DD` (today's date in Europe/Amsterdam) from `main`.

## 3. Work through tasks

Repeat:

1. Take the first task in `TASKS.md` with status `todo` whose dependencies are `done`, or `in-review` on this branch.
2. Set it to `in-progress` and commit.
3. Do the work. Run `npm run check` often.
4. When every acceptance criterion is met and `npm run check` passes: tick the criteria, set the status to `in-review`, commit with a message starting with the task id (`T08: render the Tokyo level screen`), and push.
5. If you cannot finish it: set `blocked`, write the reason under the task, commit what is useful (only if `npm run check` still passes), and move on.

Stop starting new tasks when any of these is true:

- It is after 06:30 Europe/Amsterdam.
- You have finished 6 tasks this run.
- You notice your context is getting long. Finish the current task cleanly instead of starting a new one.

## 4. Open or update the pull request

- One pull request per night, from the nightly branch into `main`, labelled `nightly` (create the label if it does not exist).
- Title: `Nightly YYYY-MM-DD: T02, T03, T04`.
- Body: for each task, what changed, how it was tested, screenshots for UI work (commit images to `agent-logs/assets/` and link them), open questions and anything you are unsure about. End with the run log summary.
- **Never merge**, never push to `main`, never force-push, never delete branches.

## 5. Write the run log

`agent-logs/YYYY-MM-DD.md`: start and end time, tasks attempted with outcome, decisions made and why, blockers, suggestions for the owner. Commit it to the nightly branch as the last commit.

## Never

- Weaken or delete tests to make them pass.
- Change `docs/spec/rules.md` unless a task says so.
- Add secrets, tokens or real credentials.
- Work on `needs-human` tasks beyond what their description allows.
