import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { advanceInstrument, createInstrumentState, drawAperture } from './instrument-motion';
import './home-instruments.css';

type Props = { kind: 'photo' | 'music'; progress: MotionValue<number>; reduced: boolean };

export default function WorldInstrument({ kind, progress, reduced }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const subject = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const iris = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current, object = subject.current;
    if (!element || !object || !ready) return;
    const state = createInstrumentState(reduced ? 0.5 : progress.get());
    const context = iris.current?.getContext('2d');
    let frame = 0, last = 0, visible = false, previousOpening = -1;
    const paint = () => {
      const p = state.position, travel = Math.max(0, Math.min(1, (p - 0.08) / 0.84));
      if (kind === 'photo') {
        object.style.transform = `translate3d(${(travel - 0.5) * 12}px,${(0.5 - travel) * 26}px,0) rotateX(${(0.5 - travel) * 4}deg) rotateY(${(travel - 0.5) * 8}deg) rotateZ(${(travel - 0.5) * 4}deg)`;
        const opening = Math.max(0, Math.min(1, (p - 0.2) / 0.47));
        const smooth = opening * opening * (3 - 2 * opening);
        if (lens.current) lens.current.style.transform = `translate3d(0,0,${smooth * 18}px) scale(${1 + smooth * 0.018})`;
        if (context && Math.abs(smooth - previousOpening) > 0.00001) { drawAperture(context, smooth); previousOpening = smooth; }
      } else {
        const sway = state.angle * 180 / Math.PI + Math.sin(travel * Math.PI * 1.6) * 1.3;
        object.style.transform = `translate3d(0,${(0.5 - travel) * 26}px,0) rotateZ(${sway}deg)`;
      }
      if (import.meta.env.DEV) element.dataset.progress = p.toFixed(4);
    };
    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.hidden) { last = 0; return; }
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60; last = time;
      const moving = advanceInstrument(state, reduced ? 0.5 : progress.get(), dt, kind === 'music' && !reduced);
      paint();
      if (moving && !reduced) frame = requestAnimationFrame(tick); else last = 0;
    };
    const schedule = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; last = 0; }
    }, { rootMargin: '100px' }); observer.observe(element);
    const unsubscribe = progress.on('change', () => { if (!reduced) schedule(); });
    document.addEventListener('visibilitychange', schedule);
    paint();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); unsubscribe(); document.removeEventListener('visibilitychange', schedule); };
  }, [kind, progress, ready, reduced]);

  const image = kind === 'photo' ? '/images/home/rangefinder-camera-photo.png' : '/images/home/vintage-microphone-photo.png';
  return <div ref={host} className={`home-instrument home-instrument-${kind}${ready ? ' is-ready' : ''}`} aria-hidden="true">
    <div ref={subject} className="home-instrument-subject">
      {kind === 'music' && <svg className="home-mic-cable" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="home-cable-metal"><stop stopColor="#111"/><stop offset=".45" stopColor="#484946"/><stop offset="1" stopColor="#101111"/></linearGradient></defs><path d="M50 -20 C49 12 52 42 50 98" fill="none" stroke="url(#home-cable-metal)" strokeWidth=".65" /></svg>}
      <div className="home-instrument-product">
        <img className={`home-instrument-photo-image${kind === 'music' ? ' home-microphone-image' : ''}`} src={image} width={kind === 'photo' ? 1536 : 1024} height={kind === 'photo' ? 1024 : 1536} loading="lazy" decoding="async" onLoad={() => setReady(true)} alt="" draggable={false}/>
        {kind === 'photo' && <div ref={lens} className="home-camera-lens">
          <img src={image} width="1536" height="1024" decoding="async" alt="" draggable={false}/>
          <div className="home-camera-optics"><canvas ref={iris} width="384" height="384"/><span className="home-camera-coating"/></div>
        </div>}
      </div>
    </div>
  </div>;
}
