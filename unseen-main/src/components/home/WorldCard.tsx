import { useRef } from 'react';
import { motion, useScroll } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHomeReducedMotion } from './useHomeReducedMotion';
import WorldInstrument from './WorldInstrument';

type Props = { kind: 'photo' | 'music'; title: string; description: string; enter: string };
const ease = [0.22, 1, 0.36, 1] as const;

export default function WorldCard({ kind, title, description, enter }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const reduce = useHomeReducedMotion();
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'end start'] });

  return <motion.article className={`home-world-item home-world-item-${kind}`}
    initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }}
    viewport={{ once: true, amount: 0.1 }} transition={{ duration: 1.05, ease }}>
    <Link to={kind === 'photo' ? '/arena/fotografica' : '/arena/musicale'} className={`home-world-card home-world-${kind}`}>
      <div ref={target} className="home-world-art">
        <WorldInstrument kind={kind} progress={scrollYProgress} reduced={reduce} />
        <span className="home-art-index">{kind === 'photo' ? '01 — PHOTO' : '02 — SOUND'}</span>
        <span className="home-art-corner"><ArrowUpRight size={24} /></span>
      </div>
      <motion.div className="home-world-copy" initial={reduce ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease, delay: 0.08 }}>
        <h3>{title}</h3><p>{description}</p><span>{enter}<ArrowUpRight size={15} /></span>
      </motion.div>
    </Link>
  </motion.article>;
}
