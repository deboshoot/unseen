import { ArrowLeft, ArrowUpRight, Camera, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { musicComingCopy } from '@/i18n/music-coming-copy';
import { photoComingCopy } from '@/i18n/photo-coming-copy';
import type { ChampionshipKind } from '@/lib/championship';
import photoShoes from '@/assets/photo-coming-shoes.jpg';
import photoWindow from '@/assets/photo-coming-window.jpg';
import '@/music-coming-soon.css';

export default function ArenaComingSoon({ kind, startsAt }: { kind: ChampionshipKind; startsAt?: string }) {
  const { locale } = useI18n();
  const isMusic = kind === 'music';
  const copy = (isMusic ? musicComingCopy : photoComingCopy)[locale];
  const submissionType = isMusic ? 'musica' : 'foto';
  const SubmitIcon = isMusic ? Music2 : Camera;
  return <main className="music-coming-page">
    <div className="music-coming-inner">
      <Link to="/arena" className="music-coming-back"><ArrowLeft size={14} />{copy.back}</Link>
      <section className="music-coming-hero">
        <div className="music-coming-content">
          <p className="music-coming-status"><span />{copy.status}</p>
          <p className="music-coming-eyebrow">{copy.eyebrow}</p>
          <h1 className="font-display">{copy.title}<br /><span>{copy.accent}</span></h1>
          <p className="music-coming-intro">{copy.intro}</p>
          <div className="music-coming-actions">
            <Link to={`/submit?tipo=${submissionType}`} className="music-coming-submit"><SubmitIcon size={17} />{copy.submit}<ArrowUpRight size={17} /></Link>
            <Link to={`/campionato?tipo=${submissionType}`} className="music-coming-championship">{copy.bracket}<ArrowUpRight size={15} /></Link>
          </div>
          <p className="music-coming-note">{copy.note}</p>
          {startsAt && <p className="music-coming-date">{copy.starts} {new Date(startsAt).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
        {isMusic ? <div className="music-coming-art" aria-hidden="true">
          <span className="music-coming-orbit" />
          <div className="music-coming-disc"><div className="music-coming-disc-label"><span>UNSEEN</span><small>SOUND / VOL. 01</small><i /></div></div>
          <div className="music-coming-sleeve">
            <div className="music-coming-sleeve-top"><span>UNSEEN</span><span>SOUND SERIES</span></div>
            <div className="music-coming-sleeve-design"><span /><span /><span /><span /><span /></div>
            <div className="music-coming-sleeve-bottom"><strong>YOUR<br />NEXT SOUND.</strong><span>16 ARTISTS<br />ONE STAGE</span></div>
          </div>
          <p>UNSEEN / INDEPENDENT SOUND</p>
        </div> : <div className="music-coming-art photo-coming-art" aria-hidden="true">
          <span className="music-coming-orbit" />
          <div className="photo-coming-print photo-coming-print-back"><img src={photoWindow} alt="" /><span>UNSEEN / CITY STUDIES</span></div>
          <div className="photo-coming-print photo-coming-print-front"><div className="photo-coming-print-top"><span>UNSEEN</span><span>PHOTO SERIES / 01</span></div><img src={photoShoes} alt="" /><div className="photo-coming-print-bottom"><strong>YOUR<br />NEXT FRAME.</strong><span>16 ARTISTS<br />ONE PERSPECTIVE</span></div></div>
          <p>UNSEEN / INDEPENDENT VISION</p>
        </div>}
      </section>
      <section className="music-coming-facts" aria-label={copy.bracket}>
        <div><strong>16</strong><span>{copy.artists}</span></div>
        <div><strong>48<span>h</span></strong><span>{copy.duel}</span></div>
        <div><strong>30<span> {copy.days}</span></strong><span>{copy.championship}</span></div>
      </section>
      <footer className="music-coming-footer"><p>{copy.footer}</p><ol>{copy.steps.map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol></footer>
    </div>
  </main>;
}
