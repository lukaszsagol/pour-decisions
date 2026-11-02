# Unattended build protocol

How agents build the game without supervision. A scheduled task starts a run every few hours until the backlog is finished; each run continues where the last one stopped. The owner reviews when it is done. Follow every step; do not ask questions, because nobody is there to answer. Make reasonable decisions and write them down.

**The goal: every task in `TASKS.md` that does not need a person is built.** The game must be playable from the start as a new player (Amsterdam, level 1) as early as possible, and stay runnable after every task.

## 1. Start

1. Read `AGENTS.md`, this file, `TASKS.md`, the specs in `docs/spec/`, and the newest file in `agent-logs/`.
2. **Check the lock.** Look for an open pull request labelled `overnight`. If it exists, fetch its branch and read `agent-logs/LOCK` on that branch. If the lock's timestamp is less than 90 minutes old, another run is still working: **stop immediately** and report "another run is active" as your final message. Do not touch anything.
3. **Check whether the work is finished.** If the open pull request's branch has every task that is not `needs-human` at `in-review`, `done` or `blocked`, and the finishing steps (section 4) are done, the build is complete: disable the scheduled task (see section 5) and stop.
4. Otherwise pick the branch:
   - If the `overnight` pull request exists, check out its branch and continue on it. Never redo work that is already there.
   - If not, create `overnight/YYYY-MM-DD` (today's date in Europe/Amsterdam) from `main`, push it, and open a **draft** pull request into `main` titled `Unattended build`, labelled `overnight` (create the label if needed).
5. Write the current time (ISO 8601, UTC) to `agent-logs/LOCK`, commit and push. Refresh it after every task.
6. `npm ci` and `npm run check`. If the branch is broken, your first job is the smallest fix that makes it pass.

## 2. Work through the backlog

Repeat:

1. Take the first task in `TASKS.md` with status `todo` whose dependencies are `done` or `in-review`. For `needs-human` tasks, do only the parts their description says an agent may do, then leave them `needs-human`.
2. Set it to `in-progress`.
3. Do the work. Run `npm run check` often. For UI tasks, compare your result with the reference image in `docs/design/screens/` by taking a Playwright screenshot and looking at both.
4. When every acceptance criterion is met and `npm run check` passes: tick the criteria, set the status to `in-review`, refresh `agent-logs/LOCK`, commit with a message starting with the task id (`T08: render the Amsterdam level screen`), and **push**.
5. Add a line for the task to the pull request description (what changed, how it was tested, screenshot link for UI work), so the owner can follow progress at any time.
6. If you cannot finish a task: set it to `blocked`, write the reason under it, commit what is useful (only if `npm run check` still passes), and move on to the next task you can do.

Use sub-agents if you have them: for example a reviewer that checks a finished task against its acceptance criteria and the design reference before you mark it `in-review`. Do not run two tasks that touch the same files in parallel.

**Order**: playable Amsterdam levels from level 1 (T02, T08, T09) come before anything that is not their dependency.

Keep going until no task is left that you can do. There is no time limit. If your context is getting long, finish the current task cleanly and push, so nothing is lost if the run ends; the next run will continue.

Before your run ends for any reason, write the run log (section 3) and delete `agent-logs/LOCK`, commit and push.

## 3. Run log

Append to `agent-logs/YYYY-MM-DD.md` (the date the run started): start and end time, each task with its outcome, decisions made and why, blockers, what the owner should look at first.

## 4. Finishing the build

When no task is left that you can do:

1. Make sure the game builds: `npm run build -w apps/web`. Note in the pull request how to run it locally.
2. Take screenshots of every screen and commit them to `agent-logs/assets/`.
3. Rewrite the pull request description as a final summary: what you can play now and how, each task with its outcome, what needs the owner (the `needs-human` tasks and anything `blocked`), screenshots. Mark it ready for review.
4. Delete `agent-logs/LOCK`, commit and push.

## 5. Stopping the schedule

When the build is complete (section 4 done), disable the scheduled task that started you, using `update_trigger` with `enabled: false` and the task id given in your prompt. Say so in your final message.

## Never

- Merge the pull request, push to `main`, force-push, or delete branches.
- Weaken or delete tests to make them pass.
- Change `docs/spec/rules.md` unless a task says so.
- Add secrets, tokens or real credentials.
