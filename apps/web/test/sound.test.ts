import { describe, expect, it } from 'vitest';
import { SoundBoard } from '../src/sound.js';

/** Just enough of AudioContext to count the nodes a sound creates. */
class FakeContext {
  static created = 0;
  oscillators = 0;
  currentTime = 0;
  state = 'running';
  destination = {};
  constructor() {
    FakeContext.created++;
  }
  private param() {
    return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  }
  createGain() {
    return { gain: this.param(), connect: (n: unknown) => n };
  }
  createOscillator() {
    this.oscillators++;
    return { type: 'sine', frequency: this.param(), connect: (n: unknown) => n, start() {}, stop() {} };
  }
}

describe('sound', () => {
  it('synthesises every sound without audio files', () => {
    const board = new SoundBoard(() => FakeContext as unknown as new () => AudioContext);
    for (const s of ['select', 'pour', 'clink', 'reject', 'complete', 'unlock', 'win'] as const) board.play(s, 2);
    const ctx = (board as unknown as { ctx: FakeContext }).ctx;
    expect(ctx.oscillators).toBeGreaterThan(10);
  });

  it('stays silent and creates no context while muted', () => {
    FakeContext.created = 0;
    const board = new SoundBoard(() => FakeContext as unknown as new () => AudioContext);
    board.setMuted(true);
    board.play('win');
    expect(FakeContext.created).toBe(0);
  });

  it('does nothing where Web Audio is missing', () => {
    expect(() => new SoundBoard(() => undefined).play('pour')).not.toThrow();
  });

  it('runs a registered city ambience and stops it', () => {
    const board = new SoundBoard(() => FakeContext as unknown as new () => AudioContext);
    let running = false;
    board.registerAmbience('tokyo', () => {
      running = true;
      return () => (running = false);
    });
    board.ambience('tokyo');
    expect(running).toBe(true);
    board.ambience(null);
    expect(running).toBe(false);
  });
});
