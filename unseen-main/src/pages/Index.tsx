import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { homeExperienceCopy } from '@/i18n/home-experience-copy';
import PortalScene from '@/components/home/PortalScene';
import WorldCard from '@/components/home/WorldCard';
import { useHomeReducedMotion } from '@/components/home/useHomeReducedMotion';
import '@/home-experience.css';

const ease = [0.22, 1, 0.36, 1] as const;
export default function Index() {
  const { t, locale } = useI18n();
  const copy = homeExperienceCopy[locale];
  const reduce = useHomeReducedMotion();
  return <main className="home-experience">
    <section className="home-immersive-hero" aria-labelledby="home-title">
      <div className="home-hero-topline"><span><i />{copy.universe}</span><span className="home-edition">UNSEEN / INDEPENDENT CULTURE</span></div>
      <div className="home-hero-layout">
        <div className="home-hero-visual"><PortalScene label={copy.scene} /></div>
        <div className="home-hero-center">
          <p className="home-hero-intro">{copy.intro}</p>
          <h1 id="home-title" className="home-sculpture-title">UNSEEN</h1>
          <p className="home-hero-description">{t('home.tagline')}</p>
          <div className="home-hero-actions">
            <Link to="/gallery" className="home-enter-link">{t('home.galleryCta')}<ArrowUpRight size={17} /></Link>
            <Link to="/arena" className="home-arena-link">{t('home.arenaCta')}<ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </div>
      <div className="home-hero-bottomline">
        <a href="#unseen-world" className="home-scroll-link"><span className="home-scroll-icon"><ArrowDown size={15} /></span>{copy.discover}</a>
        <span className="home-scene-number" aria-hidden="true">01 / UNSEEN SPACE</span>
      </div>
    </section>
    <section className="home-world" id="unseen-world" aria-labelledby="home-world-title">
      <motion.header className="home-world-heading" initial={reduce ? false : { opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, ease }}>
        <p className="home-section-label"><i />{copy.collection}</p><h2 id="home-world-title">{t('home.headline')}</h2><p>{t('home.subheadline')}</p>
      </motion.header>
      <div className="home-world-pair">
        <WorldCard kind="photo" title={copy.photo} description={copy.photoText} enter={copy.enter} />
        <WorldCard kind="music" title={copy.music} description={copy.musicText} enter={copy.enter} />
      </div>
    </section>
    <motion.section className="home-invitation" initial={reduce ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, ease }}>
      <p className="home-section-label">UNSEEN / OPEN CALL</p><h2>{copy.closing}</h2><p>{copy.closingText}</p><Link to="/submit">{copy.submit}<ArrowUpRight size={22} /></Link><div className="home-invitation-footer"><span>UNSEEN</span><Link to="/regolamento">{t('nav.rules')}<ArrowUpRight size={13} /></Link></div>
    </motion.section>
  </main>;
}
