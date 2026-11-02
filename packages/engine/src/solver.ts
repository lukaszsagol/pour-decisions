import { cloneBottles, isWon, legalMoves, pour, settle, stateKey } from './rules.js';
import type { Bottle, Move } from './types.js';

export interface SolveOptions {
  /** Stop after expanding this many positions. Default 500 000. */
  maxNodes?: number;
}

export interface SolveResult {
  solvable: boolean;
  /** True when the search finished within its budget, so `solvable` is certain. */
  exhaustive: boolean;
  /** Shortest solution found (fewest pours), when solvable. */
  moves?: Move[];
  nodes: number;
}

/**
 * Breadth-first search for the fewest pours. Plays with full information:
 * hidden units are treated as known, which is what level design needs.
 *
 * Fine for the level sizes in this game (up to ~12 bottles of 4). Larger
 * searches should use the budget and fall back to a best-effort result.
 */
export function solve(start: readonly Bottle[], options: SolveOptions = {}): SolveResult {
  const maxNodes = options.maxNodes ?? 500_000;
  const initial = cloneBottles(start);
  settle(initial);
  if (isWon(initial)) return { solvable: true, exhaustive: true, moves: [], nodes: 0 };

  interface Node {
    bottles: Bottle[];
    parent: Node | null;
    move: Move | null;
  }
  const seen = new Set<string>([stateKey(initial)]);
  let frontier: Node[] = [{ bottles: initial, parent: null, move: null }];
  let nodes = 0;

  while (frontier.length > 0) {
    const next: Node[] = [];
    for (const node of frontier) {
      nodes++;
      if (nodes > maxNodes) return { solvable: false, exhaustive: false, nodes };
      for (const move of legalMoves(node.bottles)) {
        const { bottles } = pour(node.bottles, move);
        const key = stateKey(bottles);
        if (seen.has(key)) continue;
        seen.add(key);
        const child: Node = { bottles, parent: node, move };
        if (isWon(bottles)) {
          const moves: Move[] = [];
          for (let n: Node | null = child; n && n.move; n = n.parent) moves.unshift(n.move);
          return { solvable: true, exhaustive: true, moves, nodes };
        }
        next.push(child);
      }
    }
    frontier = next;
  }
  return { solvable: false, exhaustive: true, nodes };
}

/** Replays a move list and reports whether it solves the level. */
export function verifySolution(start: readonly Bottle[], moves: readonly Move[]): boolean {
  let bottles = cloneBottles(start);
  settle(bottles);
  for (const m of moves) {
    try {
      bottles = pour(bottles, m).bottles;
    } catch {
      return false;
    }
  }
  return isWon(bottles);
}
