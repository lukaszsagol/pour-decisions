/**
 * Core data model for the sort puzzle.
 *
 * A level is a set of bottles (glasses). Each bottle is a stack of units,
 * listed bottom to top. All data is plain JSON so levels can be stored in
 * level packs and states can be cloned and hashed cheaply.
 */

/** Drink id, e.g. "yuzu". Display colour and name come from the city theme. */
export type DrinkId = string;

export interface Unit {
  drink: DrinkId;
  /** Hidden units show as "?" until they become the top unit of their bottle. */
  hidden: boolean;
}

export interface Bottle {
  /** Units bottom to top. */
  units: Unit[];
  /** Number of units the bottle holds. Default levels use 4. */
  capacity: number;
  /** If set, this bottle only accepts this drink ("bottle keep", "velvet rope"). */
  only?: DrinkId;
  /**
   * If set, the bottle is locked until a bottle is completed with this drink
   * (chains and padlock, Art Deco door, shutter). Locked bottles cannot be
   * poured from or into.
   */
  lockedUntil?: DrinkId;
}

export interface Level {
  id: string;
  bottles: Bottle[];
  /** Fewest pours that solve the level, as found by the solver. */
  best?: number;
  /** Optional metadata written by the generator. */
  meta?: Record<string, unknown>;
}

export interface Move {
  from: number;
  to: number;
}

export interface PourResult {
  bottles: Bottle[];
  /** Number of units moved. */
  amount: number;
}
