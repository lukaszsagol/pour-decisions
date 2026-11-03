import { Progress } from './economy/save.js';
import { PlayLog } from './playlog.js';

/** The player's saved progress, shared by every screen. */
export const progress = new Progress();

/** Local play log (see `docs/spec/levels.md`). */
export const playLog = new PlayLog();
