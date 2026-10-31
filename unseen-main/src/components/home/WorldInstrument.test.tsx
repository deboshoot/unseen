import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorldInstrument from './WorldInstrument';
import { drawAperture } from './instrument-motion';

vi.mock('./instrument-motion', async importOriginal => ({
  ...await importOriginal<typeof import('./instrument-motion')>(),
  drawAperture: vi.fn(),
}));

let frames: Map<number, FrameRequestCallback>;
let setVisible: (visible: boolean) => void;
let clock: number;

beforeEach(() => {
  frames = new Map();
  clock = 0;
  let nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) {
      setVisible = visible => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function step() {
  act(() => {
    clock += 1000 / 60;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(clock));
  });
}

function mount(kind: 'photo' | 'music', reduced: boolean) {
  const progress = motionValue(0.2);
  const view = render(<WorldInstrument kind={kind} progress={progress} reduced={reduced} />);
  fireEvent.load(view.container.querySelector('img')!);
  act(() => setVisible(true));
  step();
  return { ...view, progress, subject: view.container.querySelector<HTMLElement>('.home-instrument-subject')! };
}

describe('home instrument animation', () => {
  it('keeps the aperture responsive to scrolling when Windows requests reduced motion', () => {
    const { progress, subject } = mount('photo', true);
    expect(vi.mocked(drawAperture).mock.lastCall?.[1]).toBe(0);

    act(() => progress.set(0.7));
    step();
    expect(vi.mocked(drawAperture).mock.lastCall?.[1]).toBe(1);
    expect(subject.style.transform).toBe('none');
    expect(frames.size).toBe(0);

    act(() => progress.set(0.2));
    step();
    expect(vi.mocked(drawAperture).mock.lastCall?.[1]).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('lets the microphone follow scroll with reduced movement and no continuing swing', () => {
    const { progress, subject } = mount('music', true);
    const initial = subject.style.transform;
    act(() => progress.set(0.7));
    step();
    expect(subject.style.transform).not.toBe(initial);
    expect(subject.style.transform).toMatch(/^rotateZ\(/);
    expect(frames.size).toBe(0);
  });

  it('preserves the smooth desktop animation and settles after scrolling stops', () => {
    const { progress, subject } = mount('music', false);
    const initial = subject.style.transform;
    act(() => progress.set(0.7));
    step();
    expect(subject.style.transform).not.toBe(initial);
    expect(subject.style.transform).toContain('translate3d');
    expect(frames.size).toBe(1);
    for (let i = 0; i < 360 && frames.size; i++) step();
    expect(frames.size).toBe(0);
  });

  it('stops work offscreen and catches up to the latest scroll on reentry', () => {
    const { progress } = mount('photo', true);
    act(() => setVisible(false));
    vi.mocked(drawAperture).mockClear();
    act(() => progress.set(0.7));
    expect(frames.size).toBe(0);
    expect(drawAperture).not.toHaveBeenCalled();

    act(() => setVisible(true));
    step();
    expect(vi.mocked(drawAperture).mock.lastCall?.[1]).toBe(1);
  });
});
