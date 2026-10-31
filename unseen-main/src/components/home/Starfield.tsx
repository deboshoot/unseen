import { useEffect, useRef, type CSSProperties } from 'react';
import { useHomeReducedMotion } from './useHomeReducedMotion';

// A fixed seed keeps the sky stable across renders and route changes.
let seed = 83;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const stars = Array.from({ length: 156 }, (_, index) => {
  const bright = index % 13 === 0;
  return {
    bright,
    warm: index % 9 === 0,
    style: {
      left: `${(random() * 100).toFixed(3)}%`,
      top: `${(random() * 100).toFixed(3)}%`,
      width: `${bright ? 2 : 0.8 + random() * 0.8}px`,
      height: `${bright ? 2 : 0.8 + random() * 0.8}px`,
      '--star-opacity': (bright ? 0.65 + random() * 0.25 : 0.2 + random() * 0.4).toFixed(2),
      '--star-duration': `${6 + random() * 6}s`,
      '--star-delay': `${-random() * 12}s`,
    } as CSSProperties,
  };
});

export default function Starfield() {
  const sky = useRef<HTMLDivElement>(null);
  const reduced = useHomeReducedMotion();

  useEffect(() => {
    const element = sky.current;
    if (!element || reduced) return;
    const mobile = window.matchMedia('(max-width: 700px)');
    // Bounded travel leaves ample overscan, even on very long pages.
    const offset = () => 56 * (1 - Math.exp(-Math.max(0, window.scrollY) / 1800));
    let target = offset(), position = target, frame = 0, previousTime = 0;
    const paint = () => { element.style.transform = `translate3d(0,${position.toFixed(3)}px,0)`; };
    const tick = (time: number) => {
      frame = 0;
      if (!mobile.matches || document.hidden) { previousTime = 0; return; }
      const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
      previousTime = time;
      position += (target - position) * (1 - Math.exp(-9 * dt));
      if (Math.abs(target - position) < 0.01) { position = target; previousTime = 0; }
      else frame = requestAnimationFrame(tick);
      paint();
    };
    const update = () => {
      target = offset();
      if (mobile.matches && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    };
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0; previousTime = 0;
      target = position = offset();
      if (mobile.matches) paint(); else element.style.removeProperty('transform');
    };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; } else reset(); };
    reset();
    window.addEventListener('scroll', update, { passive: true });
    mobile.addEventListener('change', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      mobile.removeEventListener('change', reset);
      document.removeEventListener('visibilitychange', visibility);
      element.style.removeProperty('transform');
    };
  }, [reduced]);

  return <div className="home-starfield" aria-hidden="true">
    <div ref={sky} className="home-starfield-sky">
      {stars.map((star, index) => <i
        key={index}
        className={`home-star${star.bright ? ' is-bright' : ''}${star.warm ? ' is-warm' : ''}`}
        style={star.style}
      />)}
    </div>
  </div>;
}
