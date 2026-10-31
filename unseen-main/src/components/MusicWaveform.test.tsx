import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MusicWaveform from "./MusicWaveform";
import type { MusicSignal } from "@/hooks/useMusicAnalyser";

let callbacks: Map<number, FrameRequestCallback>;
let nextId: number;

beforeEach(() => {
  callbacks = new Map(); nextId = 0;
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callbacks.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function sampleSignal() {
  const audio = document.createElement("audio");
  Object.defineProperty(audio, "paused", { configurable: true, value: false });
  Object.defineProperty(audio, "readyState", { value: 4 });
  const samples = { frequency: 0, waveform: 128, frequencyAt: null as ((index: number) => number) | null };
  const analyser = {
    fftSize: 2048, frequencyBinCount: 1024, context: { sampleRate: 48000 },
    getByteFrequencyData: vi.fn((data: Uint8Array) => {
      const frequencyAt = samples.frequencyAt;
      if (frequencyAt) data.forEach((_, index) => { data[index] = frequencyAt(index); });
      else data.fill(samples.frequency);
    }),
    getByteTimeDomainData: vi.fn((data: Uint8Array) => data.fill(samples.waveform)),
  } as unknown as AnalyserNode;
  return { signal: { audio, analyser } satisfies MusicSignal, samples };
}

function tick(timestamp: number) {
  const pending = Array.from(callbacks.values()); callbacks.clear();
  act(() => pending.forEach((callback) => callback(timestamp)));
}

function barHeight(bar: HTMLElement) {
  return parseFloat(bar.style.height) * Number(bar.style.transform.match(/scaleY\(([^)]+)\)/)![1]);
}

describe("live music visualisation", () => {
  it("keeps the demo waveform still when no track is active", () => {
    const { container } = render(<MusicWaveform signal={null} appearance="arena" />);
    const bars = Array.from(container.querySelectorAll("span"));
    expect(bars).toHaveLength(21);
    expect(container.firstChild).not.toHaveClass("is-active");
    expect(new Set(bars.map(barHeight))).toEqual(new Set([1]));
    expect(new Set(bars.map((bar) => bar.style.opacity))).toEqual(new Set(["0.28"]));
  });

  it("keeps the demo waveform compact and smooth while a track is active", () => {
    const { signal, samples } = sampleSignal();
    samples.frequency = 220;
    samples.waveform = 148;
    const { container } = render(<MusicWaveform signal={signal} appearance="arena" />);
    tick(0);
    const bars = Array.from(container.querySelectorAll("span"));
    const heights = bars.map(barHeight);
    expect(new Set(bars.map(bar => bar.style.height))).toEqual(new Set(['42px']));
    expect(container.firstChild).toHaveClass("is-active");
    expect(heights).toHaveLength(21);
    expect(Math.max(...heights)).toBeLessThanOrEqual(42);
    expect(Math.max(...heights)).toBeGreaterThan(2);
    const initialHeight = heights[0];
    tick(16);
    const nextHeight = barHeight(bars[0]);
    expect(new Set(bars.map(bar => bar.style.height))).toEqual(new Set(['42px']));
    expect(nextHeight).toBeGreaterThan(initialHeight);
    expect(nextHeight - initialHeight).toBeLessThan(5);
  });

  it("gives each demo bar its own response across the music spectrum", () => {
    const { signal, samples } = sampleSignal();
    samples.waveform = 148;
    samples.frequencyAt = (bin) => (bin % 8 < 2 ? 220 : 24);
    const { container } = render(<MusicWaveform signal={signal} appearance="arena" />);
    tick(0);
    const heights = Array.from(container.querySelectorAll("span"), barHeight);
    const changes = heights.slice(1).filter((height, index) => height !== heights[index]).length;
    expect(new Set(heights).size).toBeGreaterThan(2);
    expect(changes).toBeGreaterThan(heights.length / 2);
  });

  it("uses actual sample energy and stays flat for silence rather than animating a preset", () => {
    const { signal, samples } = sampleSignal();
    const { container } = render(<MusicWaveform signal={signal} />);
    tick(0);
    const bar = container.querySelector("span")!;
    expect(barHeight(bar)).toBe(2);
    samples.frequency = 220; samples.waveform = 148;
    tick(100);
    expect(barHeight(bar)).toBeGreaterThan(30);
    expect(signal.analyser.getByteFrequencyData).toHaveBeenCalledTimes(2);
    expect(signal.analyser.getByteTimeDomainData).toHaveBeenCalledTimes(2);
  });

  it("cancels updates and resets on pause or end, then resumes from the audio", () => {
    const { signal, samples } = sampleSignal(); samples.frequency = 220; samples.waveform = 148;
    const { container, unmount } = render(<MusicWaveform signal={signal} />);
    tick(0);
    fireEvent.pause(signal.audio);
    expect(callbacks.size).toBe(0);
    expect(barHeight(container.querySelector("span")!)).toBe(2);
    expect(container.firstChild).not.toHaveClass("is-active");
    fireEvent.playing(signal.audio);
    tick(100);
    expect(barHeight(container.querySelector("span")!)).toBeGreaterThan(30);
    fireEvent.ended(signal.audio);
    expect(callbacks.size).toBe(0);
    expect(barHeight(container.querySelector("span")!)).toBe(2);
    fireEvent.playing(signal.audio);
    unmount();
    expect(callbacks.size).toBe(0);
    fireEvent.playing(signal.audio);
    expect(callbacks.size).toBe(0);
  });

  it("switches to the second track's signal and removes listeners from the first", () => {
    const first = sampleSignal(); const second = sampleSignal();
    first.samples.frequency = 220; first.samples.waveform = 148;
    const { container, rerender } = render(<MusicWaveform signal={first.signal} />);
    tick(0);
    expect(barHeight(container.querySelector("span")!)).toBeGreaterThan(30);
    rerender(<MusicWaveform signal={second.signal} />);
    tick(100);
    expect(barHeight(container.querySelector("span")!)).toBe(2);
    fireEvent.pause(first.signal.audio);
    expect(callbacks.size).toBe(1);
    expect(second.signal.analyser.getByteFrequencyData).toHaveBeenCalledTimes(1);
  });
});
