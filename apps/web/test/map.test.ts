import { describe, expect, it } from 'vitest';
import { MAP_SPACING, mapLayout, pathX, scrollFor } from '../src/map/path.js';

describe('map layout', () => {
  it('runs level 1 at the bottom up to level 100 at the top, on the path', () => {
    const m = mapLayout(100);
    expect(m.nodes).toHaveLength(100);
    expect(m.nodes[0]!.y).toBeGreaterThan(m.nodes[99]!.y);
    expect(m.nodes[0]!.y - m.nodes[1]!.y).toBe(MAP_SPACING);
    for (const n of m.nodes) {
      expect(n.x).toBeCloseTo(pathX(n.y, m.height));
      expect(n.x).toBeGreaterThan(100);
      expect(n.x).toBeLessThan(290);
    }
  });

  it('puts a gate between each pair of bars', () => {
    const m = mapLayout(100);
    expect(m.gates).toHaveLength(4);
    expect(m.gates[0]).toBeLessThan(m.nodes[19]!.y);
    expect(m.gates[0]).toBeGreaterThan(m.nodes[20]!.y);
  });

  it('clamps scrolling to the world', () => {
    const m = mapLayout(100);
    expect(scrollFor(m.nodes[0]!.y, 844, m.height)).toBe(m.height - 844);
    expect(scrollFor(0, 844, m.height)).toBe(0);
  });
});
