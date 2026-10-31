import { useRef } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Arena from "./Arena";
import { useI18n } from "@/i18n/I18nProvider";
import { musicCopy } from "@/i18n/music-copy";
import { musicArtworkCopy, photoArtworkCopy } from "@/i18n/arena-artwork-copy";
import Starfield from "@/components/home/Starfield";
import WorldInstrument from "@/components/home/WorldInstrument";
import { useHomeReducedMotion } from "@/components/home/useHomeReducedMotion";
import "@/home-experience.css";
import "@/arena-choice.css";

const ease = [0.22, 1, 0.36, 1] as const;
type DoorProps = { kind: 'photo' | 'music'; title: string; category: string; description: string; enter: string; badge?: string };

function ArenaDoor({ kind, title, category, description, enter, badge }: DoorProps) {
  const visual = useRef<HTMLDivElement>(null);
  const engaged = useRef(false);
  const reduced = useHomeReducedMotion();
  const { scrollYProgress } = useScroll({ target: visual, offset: ['start end', 'end start'] });
  const progress = useMotionValue(0.35);
  useMotionValueEvent(scrollYProgress, 'change', value => { if (!engaged.current) progress.set(0.12 + value * 0.7); });
  const activate = () => { engaged.current = true; progress.set(0.86); };
  const reset = () => { engaged.current = false; progress.set(0.12 + scrollYProgress.get() * 0.7); };
  const id = `arena-entry-${kind}`;

  return <motion.div className={`arena-entry arena-entry-${kind}`}
    initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.85, ease, delay: kind === 'music' ? 0.1 : 0 }}>
    <Link className="arena-entry-link" to={kind === 'photo' ? '/arena/fotografica' : '/arena/musicale'}
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onPointerEnter={event => { if (event.pointerType !== 'touch') activate(); }} onPointerLeave={reset}
      onFocus={activate} onBlur={reset}>
      <div className="arena-entry-meta"><span><b>{kind === 'photo' ? '01' : '02'}</b><i/>{category}</span>{badge && <span className="arena-entry-badge"><i/>{badge}</span>}</div>
      <div ref={visual} className="arena-entry-visual" aria-hidden="true">
        <span className="arena-entry-light"/>
        <WorldInstrument kind={kind} progress={progress} reduced={reduced}/>
      </div>
      <div className="arena-entry-copy">
        <div className="arena-entry-title"><h2 id={`${id}-title`}>{title}<span>.</span></h2><span className="arena-entry-arrow"><ArrowUpRight size={26} strokeWidth={1.3}/></span></div>
        <p id={`${id}-description`}>{description}</p>
        <span className="arena-entry-enter">{enter}<ArrowUpRight size={14}/></span>
      </div>
    </Link>
  </motion.div>;
}

export default function ArenaChoice() {
  const [params] = useSearchParams();
  const { locale, t } = useI18n();
  const copy = musicCopy[locale];
  const reduced = useHomeReducedMotion();
  // Preserve links to existing photographic duels and shared photographs.
  if (params.has("duelId") || params.has("photoId")) return <Arena />;

  const words = copy.choose.split(' '), finalWord = words.pop();
  return <main className="arena-gateway" aria-labelledby="arena-gateway-title">
    <Starfield/>
    <div className="arena-gateway-inner">
      <motion.header className="arena-gateway-heading" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease }}>
        <p className="arena-gateway-eyebrow"><i/>UNSEEN / ARENA</p>
        <div className="arena-gateway-intro"><h1 id="arena-gateway-title">{words.join(' ')} <em>{finalWord}.</em></h1><p>{copy.chooseIntro}</p></div>
      </motion.header>
      <section className="arena-gateway-doors" aria-label={copy.choose}>
        <ArenaDoor kind="photo" title={copy.photography} category={photoArtworkCopy[locale].category} description={copy.photoDescription} enter={copy.enter}/>
        <ArenaDoor kind="music" title={copy.music} category={musicArtworkCopy[locale].category} description={copy.musicDescription} enter={copy.enter} badge={copy.new}/>
      </section>
      <footer className="arena-gateway-footer"><span>UNSEEN / INDEPENDENT CULTURE</span><Link to="/regolamento">{t('nav.rules')}<ArrowUpRight size={13}/></Link></footer>
    </div>
  </main>;
}
