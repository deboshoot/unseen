import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Headphones, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import MusicRecord from '@/components/MusicRecord';
import MusicWaveform from '@/components/MusicWaveform';
import { useMusicAnalyser } from '@/hooks/useMusicAnalyser';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import { countdown, currentMatch } from '@/lib/championship';
import { demoTracks } from '@/lib/music';
import { useChampionship } from '@/hooks/useChampionship';
import '@/championship.css';
import '@/music-demo.css';

export default function MusicArenaDemo({ startsAt }: { startsAt?: string }) {
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const text = musicDemoCopy[locale];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const { signal, prepareAudio } = useMusicAnalyser();
  const { data: schedule, now, isLoading: scheduleLoading, error: scheduleError, refetch } = useChampionship('music');
  const activeMatch = schedule ? currentMatch(schedule, now) : null;
  const nextMatch = schedule?.championship && ['scheduled', 'running'].includes(schedule.championship.status)
    ? schedule.matches
      .filter(match => !match.winner_id && match.entry_1_id && match.entry_2_id && Date.parse(match.start_at) > now)
      .sort((first, second) => Date.parse(first.start_at) - Date.parse(second.start_at))[0]
    : null;
  const timerMatch = activeMatch ?? nextMatch ?? null;
  const timerTarget = activeMatch?.end_at ?? nextMatch?.start_at;
  const timerLabel = activeMatch ? text.duelDeadline : nextMatch ? text.nextDuelStarts : text.duelDeadline;

  return <main className="champ-page music-arena music-demo-page">
    <div className="champ-container champ-arena-container">
      <nav className="music-demo-navigation" aria-label={text.back}>
        <Link className="music-back" to="/admin"><ArrowLeft size={15} />{text.back}</Link>
        <Link to="/arena/musicale/demo">{text.permanentLink}<ArrowUpRight size={13} /></Link>
      </nav>
      <header className="champ-hero music-demo-hero">
        <p className="champ-eyebrow">{text.eyebrow}</p>
        <h1>ARENA<span>.</span></h1>
        <p>{text.tagline}</p>
        <MusicWaveform signal={signal} />
        {startsAt && <p className="music-demo-starts">{text.starts} {new Date(startsAt).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
      </header>
      <section className="music-demo-countdown" aria-label={text.duelDeadline}>
        <span>{timerLabel}</span>
        <strong role="timer" aria-label={`${timerLabel}: ${timerTarget ? countdown(timerTarget, now) : '00 : 00 : 00'}`}>
          {timerTarget ? countdown(timerTarget, now) : '00 : 00 : 00'}
        </strong>
        {timerMatch && <small>#{timerMatch.number} / 15</small>}
        {scheduleLoading && <span className="sr-only" role="status">{text.scheduleLoading}</span>}
        {scheduleError && <div role="alert"><span>{text.scheduleError}</span><button type="button" onClick={() => void refetch()}>{text.retry}</button></div>}
      </section>
      <section className="music-duel" aria-label={copy.demo}>
        {demoTracks.map((track, index) => <article className={`music-challenger music-challenger-${index + 1}`} key={track.id}>
          <MusicRecord track={track} slot={index + 1} activeId={activeId} demoTransport onPrepareAudio={prepareAudio} onActiveChange={id => {
            setActiveId(previous => id ?? (previous === track.id ? null : previous));
          }} />
        </article>)}
        <span className="music-vs" aria-hidden="true">VS</span>
      </section>
      <div className="music-demo-vote-area">
        {!voteOpen
          ? <button type="button" className="music-vote" aria-expanded="false" aria-controls="music-demo-vote-choices" onClick={() => setVoteOpen(true)}>{text.vote}</button>
          : <div className="music-demo-vote-choices" id="music-demo-vote-choices" role="group" aria-label={text.voteChoices}>
            {demoTracks.map(track => <button type="button" key={track.id} className={`music-demo-vote-choice${selectedId === track.id ? ' is-selected' : ''}`} aria-label={`${text.vote} ${track.artist}`} aria-pressed={selectedId === track.id} onClick={() => setSelectedId(track.id)}>
              {selectedId === track.id && <Check size={16} aria-hidden="true" />}
              <span>{track.artist}</span>
              <small>{selectedId === track.id ? copy.demoVoted : text.voteFor}</small>
            </button>)}
          </div>}
      </div>
      {selectedId && <div className="music-demo-vote-note"><button type="button" onClick={() => setSelectedId(null)}><RotateCcw size={13} />{text.reset}</button></div>}
      <footer className="music-footer"><Headphones size={18} /><p>{copy.submitIntro}</p><Link to="/submit?tipo=musica">{copy.submit}<ArrowUpRight size={14} /></Link><Link to="/campionato?tipo=musica">{text.bracket}<ArrowUpRight size={14} /></Link></footer>
    </div>
  </main>;
}
