import { createRng } from '@pour/engine';
import type { KeyValueStore } from '../economy/save.js';
import type { DailyResult, FamilyBackend, Group, Member } from './backend.js';

const KEY = 'pour-decisions:family-fake';
const COLORS = ['#5EC3F0', '#B49CF0', '#F4B860', '#7FD1A8', '#F49AC1'];

interface FakeState {
  group: Group | null;
  me: string | null;
  daily: Record<string, DailyResult[]>;
  levels: Record<string, { memberId: string; moves: number }[]>;
}

/**
 * A family backend that lives on this device: invite codes, three pretend
 * relatives who play along, daily results and level comparisons. For trying
 * the family features before the real server exists.
 */
export class FakeFamilyBackend implements FamilyBackend {
  private state: FakeState;

  constructor(private readonly store: KeyValueStore) {
    let s: FakeState | null = null;
    try {
      s = JSON.parse(store.getItem(KEY) ?? 'null') as FakeState | null;
    } catch {
      s = null;
    }
    this.state = s ?? { group: null, me: null, daily: {}, levels: {} };
  }

  private save(): void {
    this.store.setItem(KEY, JSON.stringify(this.state));
  }

  me(): string | null {
    return this.state.me;
  }

  async group(): Promise<Group | null> {
    return this.state.group;
  }

  private relatives(seed: string): Member[] {
    const rng = createRng(seed);
    return ['Ola', 'Piotr', 'Sam'].map((name, i) => ({
      id: `fake-${name.toLowerCase()}`,
      name,
      color: COLORS[i]!,
      current: 2 + rng.int(30),
      stars: 0,
      weekStars: rng.int(40),
    }));
  }

  private start(groupName: string, playerName: string, code: string): Group {
    const me: Member = { id: 'me', name: playerName, color: COLORS[4]!, current: 1, stars: 0, weekStars: 0 };
    const others = this.relatives(code).map((m) => ({ ...m, stars: m.current * 2 }));
    this.state = {
      group: { id: code, name: groupName, inviteCode: code, members: [me, ...others] },
      me: 'me',
      daily: {},
      levels: {},
    };
    this.save();
    return this.state.group!;
  }

  async createGroup(groupName: string, playerName: string): Promise<Group> {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    return this.start(groupName, playerName, code);
  }

  async joinGroup(inviteCode: string, playerName: string): Promise<Group> {
    const code = inviteCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Invite codes have six letters or numbers');
    return this.start('Family', playerName, code);
  }

  async leave(): Promise<void> {
    this.state = { group: null, me: null, daily: {}, levels: {} };
    this.save();
  }

  async pushProgress(current: number, stars: number, weekStars: number): Promise<void> {
    const me = this.state.group?.members.find((m) => m.id === this.state.me);
    if (!me) return;
    Object.assign(me, { current, stars, weekStars });
    this.save();
  }

  async pushDaily(date: string, stars: number, moves: number): Promise<void> {
    if (!this.state.group) return;
    const list = (this.state.daily[date] ??= this.pretendDaily(date));
    if (!list.some((r) => r.memberId === 'me')) list.push({ memberId: 'me', stars, moves });
    this.save();
  }

  async daily(date: string): Promise<DailyResult[]> {
    if (!this.state.group) return [];
    return (this.state.daily[date] ??= this.pretendDaily(date));
  }

  async levelResults(level: number): Promise<{ memberId: string; moves: number }[]> {
    const g = this.state.group;
    if (!g) return [];
    const rng = createRng(`${g.id}-${level}`);
    return g.members
      .filter((m) => m.id !== 'me' && m.current > level)
      .map((m) => ({ memberId: m.id, moves: 8 + rng.int(20) }));
  }

  /** Two of three relatives play each day, with made-up results. */
  private pretendDaily(date: string): DailyResult[] {
    const rng = createRng(`${this.state.group?.id}-${date}`);
    return this.relatives(this.state.group!.id)
      .filter(() => rng.next() < 0.67)
      .map((m) => ({ memberId: m.id, stars: 1 + rng.int(3), moves: 16 + rng.int(12) }));
  }
}
