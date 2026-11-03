/**
 * Sounds synthesised with Web Audio: no audio files. The context is created
 * on first use (after a tap, so browsers allow it) and nothing plays while
 * muted.
 */

export type SoundName = 'select' | 'pour' | 'clink' | 'reject' | 'complete' | 'unlock' | 'win';

/** A city's background sound. Returns a stop function. */
export type Ambience = (ctx: AudioContext, out: AudioNode) => () => void;

type Ctor = new () => AudioContext;

export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stopAmbience: (() => void) | null = null;
  private readonly ambiences = new Map<string, Ambience>();
  muted = false;

  constructor(private readonly factory: () => Ctor | undefined = () => globalThis.AudioContext) {}

  /** Registers background sound for a city (hook for later; none are on by default). */
  registerAmbience(city: string, fn: Ambience): void {
    this.ambiences.set(city, fn);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.ambience(null);
    if (this.master && this.ctx) this.master.gain.setValueAtTime(muted ? 0 : 0.6, this.ctx.currentTime);
  }

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const C = this.factory();
      if (!C) return null;
      try {
        this.ctx = new C();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume?.();
    return this.ctx;
  }

  /** Starts the ambience for a city, or stops it with null. */
  ambience(city: string | null): void {
    this.stopAmbience?.();
    this.stopAmbience = null;
    if (!city) return;
    const fn = this.ambiences.get(city);
    const ctx = fn && this.context();
    if (fn && ctx && this.master) this.stopAmbience = fn(ctx, this.master);
  }

  play(name: SoundName, detail = 0): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'select':
        this.tone(ctx, 660, t, 0.06, 0.12, 'triangle');
        break;
      case 'pour': {
        // A few falling "glugs", more for bigger pours.
        const glugs = 2 + Math.min(4, detail);
        for (let i = 0; i < glugs; i++) this.glug(ctx, t + i * 0.07, 420 - i * 30);
        break;
      }
      case 'clink':
        this.tone(ctx, 2400, t, 0.25, 0.12, 'sine');
        this.tone(ctx, 3610, t, 0.18, 0.06, 'sine');
        break;
      case 'reject':
        this.tone(ctx, 140, t, 0.12, 0.25, 'square', 90);
        break;
      case 'complete':
        [784, 988, 1175].forEach((f, i) => this.tone(ctx, f, t + i * 0.07, 0.22, 0.14, 'triangle'));
        this.tone(ctx, 2400, t + 0.22, 0.3, 0.08, 'sine');
        break;
      case 'unlock':
        this.tone(ctx, 1200, t, 0.05, 0.15, 'square');
        this.tone(ctx, 900, t + 0.06, 0.08, 0.12, 'square');
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(ctx, f, t + i * 0.11, 0.35, 0.16, 'triangle'));
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    at: number,
    length: number,
    volume: number,
    type: OscillatorType,
    endFreq?: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + length);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(this.master!);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  private glug(ctx: AudioContext, at: number, freq: number): void {
    this.tone(ctx, freq, at, 0.09, 0.18, 'sine', freq * 1.6);
  }
}

/** The game's sound board. */
export const sfx = new SoundBoard();
