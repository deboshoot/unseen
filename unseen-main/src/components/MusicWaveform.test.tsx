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
  const samples = { frequency: 0, waveform: 128 };
  const analyser = {
    fftSize: 2048, frequencyBinCount: 1024, context: { sampleRate: 48000 },
    getByteFrequencyData: vi.fn((data: Uint8Array) => data.fill(samples.frequency)),
    getByteTimeDomainData: vi.fn((data: Uint8Array) => data.fill(samples.waveform)),
  } as unknown as AnalyserNode;
  return { signal: { audio, analyser } satisfies MusicSignal, samples };
}

function tick(timestamp: number) {
  const pending = Array.from(callbacks.values()); callbacks.clear();
  act(() => pending.forEach((callback) => callback(timestamp)));
}

describe("live music visualisation", () => {
  it("uses actual sample energy and stays flat for silence rather than animating a preset", () => {
    const { signal, samples } = sampleSignal();
    const { container } = render(<MusicWaveform signal={signal} />);
    tick(0);
    const bar = container.querySelector("span")!;
    expect(bar.style.height).toBe("2.00px");
    samples.frequency = 220; samples.waveform = 148;
    tick(100);
    expect(parseFloat(bar.style.height)).toBeGreaterThan(30);
    expect(signal.analyser.getByteFrequencyData).toHaveBeenCalledTimes(2);
    expect(signal.analyser.getByteTimeDomainData).toHaveBeenCalledTimes(2);
  });

  it("cancels updates and resets on pause or end, then resumes from the audio", () => {
    const { signal, samples } = sampleSignal(); samples.frequency = 220; samples.waveform = 148;
    const { container, unmount } = render(<MusicWaveform signal={signal} />);
    tick(0);
    fireEvent.pause(signal.audio);
    expect(callbacks.size).toBe(0);
    expect(container.querySelector("span")!.style.height).toBe("2px");
    expect(container.firstChild).not.toHaveClass("is-active");
    fireEvent.playing(signal.audio);
    tick(100);
    expect(parseFloat(container.querySelector("span")!.style.height)).toBeGreaterThan(30);
    fireEvent.ended(signal.audio);
    expect(callbacks.size).toBe(0);
    expect(container.querySelector("span")!.style.height).toBe("2px");
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
    expect(parseFloat(container.querySelector("span")!.style.height)).toBeGreaterThan(30);
    rerender(<MusicWaveform signal={second.signal} />);
    tick(100);
    expect(container.querySelector("span")!.style.height).toBe("2.00px");
    fireEvent.pause(first.signal.audio);
    expect(callbacks.size).toBe(1);
    expect(second.signal.analyser.getByteFrequencyData).toHaveBeenCalledTimes(1);
  });
});
