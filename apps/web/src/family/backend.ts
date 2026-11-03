/**
 * The family backend as the client sees it. The real one (Supabase) needs a
 * project and keys from the owner (TASKS.md, T20); until then a fake backend
 * on the device stands in, behind the `family` feature flag.
 */

export interface Member {
  id: string;
  name: string;
  /** Avatar colour. */
  color: string;
  /** Highest level reached. */
  current: number;
  stars: number;
  /** Stars earned this week, for the weekly board. */
  weekStars: number;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: Member[];
}

export interface DailyResult {
  memberId: string;
  stars: number;
  moves: number;
}

export interface FamilyBackend {
  /** The group this device belongs to, if any. */
  group(): Promise<Group | null>;
  createGroup(groupName: string, playerName: string): Promise<Group>;
  joinGroup(inviteCode: string, playerName: string): Promise<Group>;
  leave(): Promise<void>;
  /** Publishes this player's progress (called after wins). */
  pushProgress(current: number, stars: number, weekStars: number): Promise<void>;
  pushDaily(date: string, stars: number, moves: number): Promise<void>;
  daily(date: string): Promise<DailyResult[]>;
  /** Other members' fewest moves on a level. */
  levelResults(level: number): Promise<{ memberId: string; moves: number }[]>;
  /** This device's member id. */
  me(): string | null;
}

/** Initial of a name, for avatars. */
export const initial = (name: string): string => (name.trim()[0] ?? '?').toUpperCase();
