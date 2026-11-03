import { cloneBottles, isComplete, isDeadEnd, isWon, legalMoves, pour, settle, stateKey, topRun } from './rules.js';
import { solve, verifySolution, type SolveResult } from './solver.js';
import type { Bottle, Move } from './types.js';

/**
 * Lower-bound-ish estimate of pours left: every run that is not sitting at
 * the bottom of a bottle must move at least once, and each drink spread over
 * several bottles needs its parts joined.
 */
export function heuristic(bottles: readonly Bottle[]): number {
  let h = 0;
  const bottoms = new Map<string, number>();
  for (const b of bottles) {
    if (b.units.length === 0 || isComplete(b)) continue;
    let runs = 1;
    for (let i = 1; i < b.units.length; i++) if (b.units[i]!.drink !== b.units[i - 1]!.drink) runs++;
    h += runs - 1;
    const bottom = b.units[0]!.drink;
    bottoms.set(bottom, (bottoms.get(bottom) ?? 0) + 1);
  }
  for (const n of bottoms.values()) h += n - 1;
  return h;
}

/** Pours that can never help: moving a whole single-drink bottle into an empty one. */
function pointless(bottles: readonly Bottle[], m: Move): boolean {
  const a = bottles[m.from]!;
  const b = bottles[m.to]!;
  return b.units.length === 0 && b.only === undefined && topRun(a) === a.units.length;
}

class MinHeap<T> {
  private items: { p: number; v: T }[] = [];
  get size(): number {
    return this.items.length;
  }
  push(p: number, v: T): void {
    const a = this.items;
    a.push({ p, v });
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent]!.p <= a[i]!.p) break;
      [a[parent], a[i]] = [a[i]!, a[parent]!];
      i = parent;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0]!.v;
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]!.p < a[m]!.p) m = l;
        if (r < a.length && a[r]!.p < a[m]!.p) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

export interface BestFirstOptions {
  maxNodes?: number;
  /** Weight on the heuristic. 1 is A*; higher is faster and less optimal. Default 2. */
  weight?: number;
}

/**
 * Weighted A* for big levels. Finds a verified solution quickly, not always
 * the shortest. Plays with full information, like `solve`.
 */
export function solveBestFirst(start: readonly Bottle[], options: BestFirstOptions = {}): SolveResult {
  const maxNodes = options.maxNodes ?? 300_000;
  const w = options.weight ?? 2;
  const initial = cloneBottles(start);
  settle(initial);
  if (isWon(initial)) return { solvable: true, exhaustive: true, moves: [], nodes: 0 };
  interface Node {
    bottles: Bottle[];
    g: number;
    parent: Node | null;
    move: Move | null;
  }
  const bestG = new Map<string, number>([[stateKey(initial), 0]]);
  const open = new MinHeap<Node>();
  open.push(w * heuristic(initial), { bottles: initial, g: 0, parent: null, move: null });
  let nodes = 0;
  while (open.size > 0) {
    const node = open.pop()!;
    nodes++;
    if (nodes > maxNodes) return { solvable: false, exhaustive: false, nodes };
    for (const move of legalMoves(node.bottles)) {
      if (pointless(node.bottles, move)) continue;
      const { bottles } = pour(node.bottles, move);
      const g = node.g + 1;
      const key = stateKey(bottles);
      const known = bestG.get(key);
      if (known !== undefined && known <= g) continue;
      bestG.set(key, g);
      const child: Node = { bottles, g, parent: node, move };
      if (isWon(bottles)) {
        const moves: Move[] = [];
        for (let n: Node | null = child; n && n.move; n = n.parent) moves.unshift(n.move);
        return { solvable: true, exhaustive: false, moves, nodes };
      }
      open.push(g + w * heuristic(bottles), child);
    }
  }
  // The open list ran dry: every reachable position was seen, so this is a proof.
  return { solvable: false, exhaustive: true, nodes };
}

export interface AutoSolveOptions {
  /** Budget for the breadth-first (optimal) search. Default 150 000. */
  bfsNodes?: number;
  /** Budget for the best-first fallback. Default 300 000. */
  fallbackNodes?: number;
}

export interface AutoSolveResult extends SolveResult {
  /** True when `moves` is proven shortest (breadth-first finished). */
  optimal: boolean;
}

/** Breadth-first for the optimum; weighted A* when that runs over budget. Solutions are always verified. */
export function solveAuto(start: readonly Bottle[], options: AutoSolveOptions = {}): AutoSolveResult {
  const bfs = solve(start, { maxNodes: options.bfsNodes ?? 150_000 });
  if (bfs.exhaustive) return { ...bfs, optimal: bfs.solvable };
  const fast = solveBestFirst(start, { maxNodes: options.fallbackNodes ?? 300_000 });
  if (fast.solvable && !verifySolution(start, fast.moves!))
    throw new Error('Best-first search returned a wrong solution');
  return { ...fast, nodes: bfs.nodes + fast.nodes, optimal: false };
}

export interface Analysis {
  solvable: boolean;
  /** Fewest pours found. Proven optimal when `optimal`. */
  best: number;
  optimal: boolean;
  solution: Move[];
  /** Average number of useful pours available along the solution. */
  branching: number;
  /** Number of distinct first pours. */
  firstMoves: number;
  /** First pours from which the level can still be won. */
  winningFirstMoves: number;
  /** Share of first pours after which the level can no longer be won (0–1). */
  deadEndShare: number;
  /** Pours in the solution that go into an empty glass. */
  emptyPours: number;
}

/** Solver metrics for level design (step 3 of the pipeline in `docs/spec/levels.md`). */
export function analyse(start: readonly Bottle[], options: AutoSolveOptions = {}): Analysis {
  const initial = cloneBottles(start);
  settle(initial);
  const r = solveAuto(initial, options);
  const first = legalMoves(initial);
  if (!r.solvable) {
    return {
      solvable: false,
      best: 0,
      optimal: false,
      solution: [],
      branching: first.length,
      firstMoves: first.length,
      winningFirstMoves: 0,
      deadEndShare: 1,
      emptyPours: 0,
    };
  }
  let branching = 0;
  let emptyPours = 0;
  let pos = initial;
  for (const m of r.moves!) {
    branching += legalMoves(pos).length;
    if (pos[m.to]!.units.length === 0) emptyPours++;
    pos = pour(pos, m).bottles;
  }
  let winning = 0;
  for (const m of first) {
    const next = pour(initial, m).bottles;
    if (isDeadEnd(next)) continue;
    // Only solvability matters here, so the fast search goes first.
    const quick = solveBestFirst(next, { maxNodes: 20_000 });
    if (quick.solvable) winning++;
    else if (!quick.exhaustive && solve(next, { maxNodes: 60_000 }).solvable) winning++;
  }
  return {
    solvable: true,
    best: r.moves!.length,
    optimal: r.optimal,
    solution: r.moves!,
    branching: r.moves!.length ? branching / r.moves!.length : 0,
    firstMoves: first.length,
    winningFirstMoves: winning,
    deadEndShare: first.length ? (first.length - winning) / first.length : 0,
    emptyPours,
  };
}
