import { describe, expect, it } from 'vitest';
import { advanceInstrument, createInstrumentState } from './instrument-motion';

describe('instrument scroll response', () => {
  it('follows the same timeline on 60, 120 and 144 Hz screens', () => {
    const samples = [60, 120, 144].map(hz => {
      const state = createInstrumentState(0.15);
      for (let i = 0; i < hz / 2; i++) advanceInstrument(state, 0.8, 1 / hz, true);
      return state;
    });
    for (const state of samples.slice(1)) {
      expect(state.position).toBeCloseTo(samples[0].position, 10);
      expect(state.angle).toBeCloseTo(samples[0].angle, 2);
    }
  });

  it('starts smoothly and preserves momentum on a scroll reversal', () => {
    const state = createInstrumentState(0.2);
    advanceInstrument(state, 0.8, 1 / 60, true);
    expect(state.position).toBeGreaterThan(0.2);
    expect(state.position).toBeLessThan(0.23);
    for (let i = 0; i < 12; i++) advanceInstrument(state, 0.8, 1 / 60, true);
    const before = { ...state };
    advanceInstrument(state, 0.1, 1 / 144, true);
    expect(Math.abs(state.position - before.position)).toBeLessThan(0.02);
    expect(Math.abs(state.angle - before.angle)).toBeLessThan(0.01);
    for (let i = 0; i < 240; i++) advanceInstrument(state, 0.1, 1 / 60, true);
    expect(state.position).toBeCloseTo(0.1, 5);
    expect(Math.abs(state.angle)).toBeLessThan(0.0001);
  });

  it('settles and releases the animation loop when scrolling stops', () => {
    const state = createInstrumentState(0.1);
    let moving = true;
    for (let i = 0; i < 360; i++) moving = advanceInstrument(state, 0.7, 1 / 60, true);
    expect(moving).toBe(false);
    expect(state.position).toBeCloseTo(0.7, 5);
    expect(Math.abs(state.velocity)).toBeLessThan(0.0001);
  });

  it('stays bounded during repeated rapid direction changes', () => {
    const state = createInstrumentState(0.5);
    for (let i = 0; i < 600; i++) {
      advanceInstrument(state, Math.floor(i / 8) % 2, 1 / 120, true);
      expect(state.position).toBeGreaterThanOrEqual(0);
      expect(state.position).toBeLessThanOrEqual(1);
      expect(Math.abs(state.angle)).toBeLessThan(0.18);
    }
  });
});
