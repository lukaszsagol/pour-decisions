import type { CompleteData } from './complete/screen.js';

/** Hand-over between screens that does not belong in the save (lost on reload). */
export const session: { complete: CompleteData | null } = { complete: null };
