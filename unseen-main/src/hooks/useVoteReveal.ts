import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** One timeline keeps the two counters and their bars in sync. */
export function useVoteReveal(first: number | undefined, second: number | undefined) {
  const reducedMotion = useReducedMotion();
  const [values, setValues] = useState([0, 0]);
  useEffect(() => {
    if (first === undefined || second === undefined) { setValues([0, 0]); return; }
    if (reducedMotion) { setValues([first, second]); return; }
    let frame: number;
    let start: number;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, Math.max(0, (time - start - 120) / 1100));
      const eased = 1 - (1 - progress) ** 3;
      setValues([first * eased, second * eased]);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [first, second, reducedMotion]);
  return values;
}
