# Overnight build protocol

How an agent builds the game in one unattended run. The owner is asleep and reviews in the morning. Follow every step; do not ask questions, because nobody is there to answer. Make reasonable decisions and write them down.

**The goal of the run: by morning the owner can play the game from the start, as a new player: Amsterdam, level 1 onwards.** Build as much of `TASKS.md` as you can, in order, and keep the game runnable after every task.

## 1. Start

1. Read `AGENTS.md`, this file, `TASKS.md`, the specs in `docs/spec/`, and the newest file in `agent-logs/`.
2. `npm ci`, then `npm run check` on `main`. It should pass; if not, your first job is the smallest fix that makes it pass.
3. Create the branch `overnight/YYYY-MM-DD` (today's date in Europe/Amsterdam) from `main`. All work goes on this one branch.
4. Push the branch and open a **draft pull request** into `main` straight away, titled `Overnight build YYYY-MM-DD`, so progress is visible and nothing is lost if the run stops early.

## 2. Work through the backlog

Repeat until a stop condition is met:

1. Take the first task in `TASKS.md` with status `todo` whose dependencies are `done` or `in-review`. Skip `needs-human` tasks except for the parts their description says an agent may do.
2. Set it to `in-progress`.
3. Do the work. Run `npm run check` often. For UI tasks, compare your result with the reference image in `docs/design/screens/` by taking a Playwright screenshot and looking at both.
4. When every acceptance criterion is met and `npm run check` passes: tick the criteria, set the status to `in-review`, commit with a message starting with the task id (`T08: render the Tokyo level screen`), and **push**. Push after every task.
5. If you cannot finish a task: set it to `blocked`, write the reason under it, commit what is useful (only if `npm run check` still passes), and move on to the next task you can do.

Use sub-agents if you have them: for example a reviewer that checks a finished task against its acceptance criteria and the design reference before you mark it `in-review`. Do not run two tasks that touch the same files in parallel.

**Priority if time runs short**: playable Amsterdam levels from level 1 (T02, T08, T09) matter more than anything after it. If T08–T09 are not done by 04:00 Europe/Amsterdam, skip ahead to them once their dependencies are met.

Stop starting new tasks when:

- every task that is not `needs-human` is `in-review` or `blocked`, or
- it is after 07:30 Europe/Amsterdam.

If your context is getting long, finish the current task cleanly and push before continuing, so a context reset loses nothing.

## 3. Finish

1. Make sure the game builds: `npm run build -w apps/web` (once `apps/web` exists). Note in the pull request how to run it locally.
2. Take screenshots of every screen that exists and commit them to `agent-logs/assets/`.
3. Write the run log `agent-logs/YYYY-MM-DD.md`: start and end time, each task with its outcome, decisions made and why, blockers, what the owner should look at first. Commit and push it last.
4. Update the pull request description: what you can play now and how, each task with a one-line summary and how it was tested, screenshots, open questions. Mark it ready for review.

## Never

- Merge the pull request, push to `main`, force-push, or delete branches.
- Weaken or delete tests to make them pass.
- Change `docs/spec/rules.md` unless a task says so.
- Add secrets, tokens or real credentials.
