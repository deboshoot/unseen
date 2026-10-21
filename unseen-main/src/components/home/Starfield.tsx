import type { CSSProperties } from 'react';

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
  return <div className="home-starfield" aria-hidden="true">
    {stars.map((star, index) => <i
      key={index}
      className={`home-star${star.bright ? ' is-bright' : ''}${star.warm ? ' is-warm' : ''}`}
      style={star.style}
    />)}
  </div>;
}
