import { describe, expect, it } from 'vitest';
import { FakeFamilyBackend } from '../src/family/fake.js';

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

describe('fake family backend', () => {
  it('creates a group with an invite code and relatives, and remembers it', async () => {
    const store = memory();
    const b = new FakeFamilyBackend(store);
    expect(await b.group()).toBeNull();
    const g = await b.createGroup('Sągols', 'Łukasz');
    expect(g.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(g.members.map((m) => m.name)).toEqual(['Łukasz', 'Ola', 'Piotr', 'Sam']);
    expect((await new FakeFamilyBackend(store).group())?.inviteCode).toBe(g.inviteCode);
  });

  it('joins by code, rejects bad codes, and leaves', async () => {
    const b = new FakeFamilyBackend(memory());
    await expect(b.joinGroup('no', 'Ana')).rejects.toThrow();
    const g = await b.joinGroup('abc123', 'Ana');
    expect(g.inviteCode).toBe('ABC123');
    await b.leave();
    expect(await b.group()).toBeNull();
  });

  it('shares progress, daily results and level comparisons', async () => {
    const b = new FakeFamilyBackend(memory());
    await b.createGroup('Family', 'Me');
    await b.pushProgress(12, 30, 9);
    expect((await b.group())!.members[0]).toMatchObject({ current: 12, stars: 30, weekStars: 9 });
    await b.pushDaily('2026-11-03', 3, 14);
    const daily = await b.daily('2026-11-03');
    expect(daily.find((r) => r.memberId === 'me')).toEqual({ memberId: 'me', stars: 3, moves: 14 });
    expect(await b.daily('2026-11-03')).toEqual(daily);
    const results = await b.levelResults(1);
    expect(results.every((r) => r.memberId !== 'me')).toBe(true);
  });
});
