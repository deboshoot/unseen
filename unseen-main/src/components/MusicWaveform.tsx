import { useEffect, useRef, useState } from "react";
import type { MusicSignal } from "@/hooks/useMusicAnalyser";

const BAR_COUNT = 65;
const ARENA_BAR_COUNT = 21;

export default function MusicWaveform({ signal, appearance = "default" }: { signal: MusicSignal | null; appearance?: "default" | "arena" }) {
  const barsRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const barCount = appearance === "arena" ? ARENA_BAR_COUNT : BAR_COUNT;

  useEffect(() => {
    const bars = Array.from(barsRef.current?.children ?? []) as HTMLElement[];
    const reset = () => bars.forEach((bar) => {
      if (appearance === "arena") {
        bar.style.height = "1px";
        bar.style.opacity = ".28";
      } else {
        bar.style.height = "2px";
        bar.style.opacity = ".35";
      }
    });
    reset();
    setPlaying(false);
    if (!signal) return;

    const { audio, analyser } = signal;
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    const samples = new Uint8Array(analyser.fftSize);
    const heights = new Float32Array(barCount);
    const levels = new Float32Array(barCount);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
    const maxFrequency = Math.min(16000, analyser.context.sampleRate / 2);
    const firstBin = Math.max(1, Math.floor(40 / hzPerBin));
    const lastBin = Math.min(frequencies.length, Math.ceil(maxFrequency / hzPerBin));
    const bands = bars.map((_, index) => {
      if (appearance === "arena") {
        const range = lastBin / firstBin;
        const band = (index * 8) % barCount;
        const start = Math.min(lastBin - 1, Math.floor(firstBin * range ** (band / barCount)));
        const end = Math.min(lastBin, Math.max(start + 1, Math.floor(firstBin * range ** ((band + 1) / barCount))));
        return [start, end];
      }
      const middle = (BAR_COUNT - 1) / 2;
      const band = Math.abs(index - middle);
      const start = Math.max(1, Math.floor(40 * (maxFrequency / 40) ** (band / (middle + 1)) / hzPerBin));
      const end = Math.min(frequencies.length, Math.max(start + 1, Math.ceil(40 * (maxFrequency / 40) ** ((band + 1) / (middle + 1)) / hzPerBin)));
      return [start, end];
    });
    let frame = 0;
    let running = false;
    let lastDraw = -Infinity;

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      heights.fill(0);
      reset();
      setPlaying(false);
    };
    const draw = (timestamp: number) => {
      if (!running || audio.paused || audio.ended) { stop(); return; }
      // Reduce visual motion while still showing measurements from the track.
      if (timestamp - lastDraw >= (reducedMotion.matches ? 100 : 16)) {
        const elapsed = Number.isFinite(lastDraw) ? Math.min((timestamp - lastDraw) / 1000, .1) : 1 / 60;
        lastDraw = timestamp;
        analyser.getByteFrequencyData(frequencies);
        analyser.getByteTimeDomainData(samples);
        let power = 0;
        for (const sample of samples) power += ((sample - 128) / 128) ** 2;
        const envelope = audio.muted || audio.volume === 0 ? 0 : Math.min(1, Math.sqrt(power / samples.length) * 6);
        bars.forEach((_, index) => {
          const [start, end] = bands[index];
          let energy = 0;
          for (let bin = start; bin < end; bin++) energy += frequencies[bin] ** 2;
          const bandLevel = Math.sqrt(energy / (end - start)) / 255;
          levels[index] = Math.min(1, bandLevel ** .72 * 1.2) * envelope;
        });
        bars.forEach((bar, index) => {
          const level = appearance === "arena"
            ? levels[Math.max(0, index - 1)] * .2 + levels[index] * .6 + levels[Math.min(barCount - 1, index + 1)] * .2
            : levels[index];
          const smoothing = appearance === "arena"
            ? 1 - Math.exp(-elapsed / (level > heights[index] ? .18 : .3))
            : (level > heights[index] ? .8 : .35);
          heights[index] += (level - heights[index]) * smoothing;
          const height = 2 + heights[index] * (appearance === "arena" ? 40 : 62);
          bar.style.height = `${height.toFixed(2)}px`;
          bar.style.opacity = String(.35 + heights[index] * .65);
        });
      }
      frame = requestAnimationFrame(draw);
    };
    const start = () => {
      if (running || audio.paused || audio.ended || document.visibilityState === "hidden") return;
      running = true;
      lastDraw = -Infinity;
      setPlaying(true);
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => { if (document.visibilityState === "hidden") stop(); else start(); };
    const starts = ["playing", "seeked"];
    const stops = ["pause", "ended", "waiting", "seeking", "error", "emptied"];
    starts.forEach((event) => audio.addEventListener(event, start));
    stops.forEach((event) => audio.addEventListener(event, stop));
    document.addEventListener("visibilitychange", visibility);
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) start();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      starts.forEach((event) => audio.removeEventListener(event, start));
      stops.forEach((event) => audio.removeEventListener(event, stop));
      document.removeEventListener("visibilitychange", visibility);
      reset();
    };
  }, [appearance, barCount, signal]);

  return <div ref={barsRef} className={`music-waveform${appearance === "arena" ? " music-waveform-arena" : ""}${playing ? " is-active" : ""}`} aria-hidden="true">{Array.from({ length: barCount }, (_, index) => <span key={index} />)}</div>;
}
