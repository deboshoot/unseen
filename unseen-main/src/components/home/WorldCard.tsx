import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import photo from '@/assets/photo-coming-window.jpg';
import { useHomeReducedMotion } from './useHomeReducedMotion';

type Props = { kind: 'photo' | 'music'; title: string; description: string; enter: string };
const ease = [0.22, 1, 0.36, 1] as const;

export default function WorldCard({ kind, title, description, enter }: Props) {
  const target = useRef<HTMLElement>(null);
  const reduce = useHomeReducedMotion();
  const { scrollYProgress: rawProgress } = useScroll({ target, offset: ['start end', 'end start'] });
  const scrollYProgress = useSpring(rawProgress, { stiffness: 220, damping: 36, mass: 0.5 });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.14, 1.03]);
  const recordX = useTransform(scrollYProgress, [0.05, 0.8], ['-6%', '18%']);
  const recordRotate = useTransform(scrollYProgress, [0, 1], [-25, 80]);
  const sleeveRotate = useTransform(scrollYProgress, [0, 1], [-12, -5]);
  const sleeveY = useTransform(scrollYProgress, [0, 1], [18, -16]);

  return <motion.article ref={target} className={`home-world-item home-world-item-${kind}`}
    initial={reduce ? false : { opacity: 0, y: 64 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }} transition={{ duration: 1.05, ease }}>
    <Link to={kind === 'photo' ? '/arena/fotografica' : '/arena/musicale'} className={`home-world-card home-world-${kind}`}>
      <div className="home-world-art">
        {kind === 'photo'
          ? <motion.img src={photo} alt="" loading="lazy" style={reduce ? undefined : { y: imageY, scale: imageScale }} />
          : <>
            <motion.div className="home-record-sleeve" aria-hidden="true" style={reduce ? undefined : { rotate: sleeveRotate, y: sleeveY }}><span>UNSEEN<br />SOUND<br /><em>SELECTION</em></span><i /></motion.div>
            <motion.div className="home-record-disc" aria-hidden="true" style={reduce ? undefined : { x: recordX, rotate: recordRotate }}><span>U<span>33⅓ RPM</span></span></motion.div>
          </>}
        <motion.div className="home-art-reveal" aria-hidden="true" initial={reduce ? false : { scaleY: 1 }} whileInView={{ scaleY: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 1.25, ease }} />
        <span className="home-art-index">{kind === 'photo' ? '01 — PHOTO' : '02 — SOUND'}</span>
        <span className="home-art-corner"><ArrowUpRight size={24} /></span>
      </div>
      <motion.div className="home-world-copy" initial={reduce ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease, delay: 0.08 }}>
        <h3>{title}</h3><p>{description}</p><span>{enter}<ArrowUpRight size={15} /></span>
      </motion.div>
    </Link>
  </motion.article>;
}
