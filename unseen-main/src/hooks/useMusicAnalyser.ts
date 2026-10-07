import { useCallback, useEffect, useRef, useState } from "react";

export type MusicSignal = { audio: HTMLAudioElement; analyser: AnalyserNode };

export function useMusicAnalyser() {
  const contextRef = useRef<AudioContext | null>(null);
  const sources = useRef(new Map<HTMLAudioElement, { source: MediaElementAudioSourceNode; signal: MusicSignal }>());
  const [signal, setSignal] = useState<MusicSignal | null>(null);

  // Called directly by the Play gesture so browsers can unlock Web Audio.
  const prepareAudio = useCallback((audio: HTMLAudioElement) => {
    const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const context = contextRef.current ?? (contextRef.current = new AudioContextClass());
      if (context.state === "suspended") void context.resume().catch(() => {});
      let entry = sources.current.get(audio);
      if (!entry) {
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.minDecibels = -85;
        analyser.maxDecibels = -20;
        analyser.smoothingTimeConstant = .55;
        const source = context.createMediaElementSource(audio);
        // Keep playback independent from the visualisation branch.
        source.connect(context.destination);
        source.connect(analyser);
        entry = { source, signal: { audio, analyser } };
        sources.current.set(audio, entry);
      }
      setSignal(entry.signal);
    } catch {
      // Unsupported analysis leaves the bars flat, without simulated music.
      setSignal(null);
    }
  }, []);

  useEffect(() => {
    const connected = sources.current;
    return () => {
      connected.forEach(({ source, signal }) => {
        signal.audio.pause();
        source.disconnect();
        signal.analyser.disconnect();
      });
      connected.clear();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, []);

  return { signal, prepareAudio };
}
