import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, FlaskConical, Headphones, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import MusicRecord from '@/components/MusicRecord';
import MusicWaveform from '@/components/MusicWaveform';
import { useMusicAnalyser } from '@/hooks/useMusicAnalyser';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import { demoTracks } from '@/lib/music';
import '@/championship.css';
import '@/music-demo.css';

export default function MusicArenaDemo({ startsAt }: { startsAt?: string }) {
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const text = musicDemoCopy[locale];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { signal, prepareAudio } = useMusicAnalyser();

  return <main className="champ-page music-arena music-demo-page">
    <div className="champ-container champ-arena-container">
      <nav className="music-demo-navigation" aria-label={text.back}>
        <Link className="music-back" to="/admin"><ArrowLeft size={15} />{text.back}</Link>
        <Link to="/arena/musicale/demo">{text.permanentLink}<ArrowUpRight size={13} /></Link>
      </nav>
      <aside className="music-demo-banner" aria-labelledby="music-demo-badge">
        <FlaskConical size={22} aria-hidden="true" />
        <div><strong id="music-demo-badge">{text.badge}</strong><p>{text.intro}</p></div>
      </aside>
      <header className="champ-hero music-demo-hero">
        <p className="champ-eyebrow">{text.eyebrow}</p>
        <h1>ARENA<span>.</span></h1>
        <p>{text.tagline}</p>
        <MusicWaveform signal={signal} />
        <p className="music-demo-description">{copy.demoNote}</p>
        {startsAt && <p className="music-demo-starts">{text.starts} {new Date(startsAt).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
      </header>
      <section className="music-duel" aria-label={copy.demo}>
        {demoTracks.map((track, index) => <article className={`music-challenger music-challenger-${index + 1}`} key={track.id}>
          <MusicRecord track={track} slot={index + 1} activeId={activeId} onPrepareAudio={prepareAudio} onActiveChange={id => setActiveId(previous => id ?? (previous === track.id ? null : previous))} />
          <button type="button" className={`music-vote ${selectedId === track.id ? 'is-selected' : ''}`} aria-pressed={selectedId === track.id} aria-describedby="music-demo-vote-hint" onClick={() => setSelectedId(track.id)}>{selectedId === track.id ? <><Check size={16} />{copy.demoVoted}</> : text.vote}</button>
        </article>)}
        <span className="music-vs" aria-hidden="true">VS</span>
      </section>
      <div className="music-demo-vote-note"><p id="music-demo-vote-hint">{text.voteHint}</p>{selectedId && <button type="button" onClick={() => setSelectedId(null)}><RotateCcw size={13} />{text.reset}</button>}</div>
      <footer className="music-footer"><Headphones size={18} /><p>{copy.submitIntro}</p><Link to="/submit?tipo=musica">{copy.submit}<ArrowUpRight size={14} /></Link><Link to="/campionato?tipo=musica">{text.bracket}<ArrowUpRight size={14} /></Link></footer>
    </div>
  </main>;
}
