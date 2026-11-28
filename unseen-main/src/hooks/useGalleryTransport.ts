import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMusicAnalyser } from './useMusicAnalyser';

const movementTime = { lifting: 320, ejecting: 650, inserting: 680, lowering: 260 };
type Movement = keyof typeof movementTime;
type Phase = Movement | 'idle' | 'playing' | 'paused';
const moving = (phase: Phase): phase is Movement => phase in movementTime;

export function useGalleryTransport(works: readonly { audio?: string }[], start: number, reduced: boolean, errorMessage: string) {
  const audio = useRef<HTMLAudioElement>(null);
  const target = useRef(start);
  const current = useRef(start);
  const phaseRef = useRef<Phase>('idle');
  const intent = useRef(false);
  const request = useRef(0);
  const [index, setIndex] = useState(start);
  const [phase, setPhase] = useState<Phase>('idle');
  const [wantsPlay, setWantsPlay] = useState(false);
  const { signal, prepareAudio } = useMusicAnalyser();

  const move = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const want = useCallback((next: boolean) => {
    intent.current = next;
    setWantsPlay(next);
  }, []);
  const stop = useCallback(() => {
    request.current++;
    want(false);
    audio.current?.pause();
    if (!moving(phaseRef.current)) move('paused');
  }, [move, want]);
  const play = useCallback(() => {
    const media = audio.current;
    if (!media || !works[current.current].audio) return;
    const token = ++request.current;
    want(true);
    void media.play().catch(error => {
      if (token !== request.current || audio.current !== media) return;
      stop();
      if (error.name !== 'AbortError') toast.error(errorMessage);
    });
  }, [works, errorMessage, stop, want]);

  function toggle() {
    if (intent.current) { stop(); return; }
    if (!audio.current || !works[target.current].audio) return;
    prepareAudio(audio.current);
    want(true);
    if (!moving(phaseRef.current)) play();
  }

  function select(next: number) {
    if (target.current === next) return;
    target.current = next;
    if (moving(phaseRef.current)) return;
    request.current++;
    move('lifting');
    audio.current?.pause();
  }
  function skip(direction: number) {
    select((target.current + direction + works.length) % works.length);
  }

  useEffect(() => {
    if (!moving(phase)) return;
    const timer = window.setTimeout(() => {
      if (phase === 'lifting') move('ejecting');
      else if (phase === 'ejecting') {
        current.current = target.current;
        setIndex(current.current);
        move('inserting');
      } else if (phase === 'inserting') move('lowering');
      else if (target.current !== current.current) move('lifting');
      else {
        move('paused');
        if (intent.current && works[current.current].audio) play();
        else want(false);
      }
    }, reduced ? 0 : movementTime[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, reduced, works, move, want, play]);

  useEffect(() => {
    const media = audio.current;
    return () => media?.pause();
  }, []);

  const mediaEvents = {
    onPlaying() {
      if (intent.current && !audio.current?.paused && !moving(phaseRef.current)) move('playing');
    },
    onWaiting() {
      if (phaseRef.current === 'playing') move('paused');
    },
    onPause() {
      if (audio.current?.paused && !moving(phaseRef.current)) { want(false); move('paused'); }
    },
    onEnded() { if (audio.current?.ended) stop(); },
    onError() {
      if (!audio.current?.error || !works[current.current].audio) return;
      stop();
      toast.error(errorMessage);
    },
  };
  return { audio, index, phase, wantsPlay, signal, select, skip, stop, toggle, mediaEvents };
}
