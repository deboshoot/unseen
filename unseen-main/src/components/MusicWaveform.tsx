import { useEffect, useRef, useState } from "react";
import type { MusicSignal } from "@/hooks/useMusicAnalyser";

const BAR_COUNT = 65;

export default function MusicWaveform({ signal }: { signal: MusicSignal | null }) {
  const barsRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const bars = Array.from(barsRef.current?.children ?? []) as HTMLElement[];
    const reset = () => bars.forEach((bar) => { bar.style.height = "2px"; bar.style.opacity = ".35"; });
    reset();
    setPlaying(false);
    if (!signal) return;

    const { audio, analyser } = signal;
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    const samples = new Uint8Array(analyser.fftSize);
    const heights = new Float32Array(BAR_COUNT);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
    const maxFrequency = Math.min(16000, analyser.context.sampleRate / 2);
    // Mirror logarithmic bands: bass at the centre, treble at the outer edges.
    const middle = (BAR_COUNT - 1) / 2;
    const bands = bars.map((_, index) => {
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
        lastDraw = timestamp;
        analyser.getByteFrequencyData(frequencies);
        analyser.getByteTimeDomainData(samples);
        let power = 0;
        for (const sample of samples) power += ((sample - 128) / 128) ** 2;
        const envelope = audio.muted || audio.volume === 0 ? 0 : Math.min(1, Math.sqrt(power / samples.length) * 6);
        bars.forEach((bar, index) => {
          const [start, end] = bands[index];
          let energy = 0;
          for (let bin = start; bin < end; bin++) energy += frequencies[bin];
          const level = (energy / (end - start) / 255) ** .85 * envelope;
          heights[index] += (level - heights[index]) * (level > heights[index] ? .8 : .35);
          bar.style.height = `${(2 + heights[index] * 62).toFixed(2)}px`;
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
  }, [signal]);

  return <div ref={barsRef} className={`music-waveform ${playing ? "is-active" : ""}`} aria-hidden="true">{Array.from({ length: BAR_COUNT }, (_, index) => <span key={index} />)}</div>;
}
