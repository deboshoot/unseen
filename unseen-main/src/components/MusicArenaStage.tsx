import { Fragment, useState, type ReactNode } from 'react';
import { ArrowUpRight, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMusicAnalyser } from '@/hooks/useMusicAnalyser';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import type { MusicTrack } from '@/lib/music';
import MusicRecord from './MusicRecord';
import MusicWaveform from './MusicWaveform';
import '@/championship.css';
import '@/music-demo.css';

type Props = {
  tracks: (MusicTrack | null)[];
  timerValue: string;
  timerLabel: string;
  navigation: ReactNode;
  duelLabel: string;
  bracketUrl: string;
  children: ReactNode;
  countdownExtra?: ReactNode;
  startsAt?: string;
  renderTrackFooter?: (index: number) => ReactNode;
  renderWaiting?: (index: number) => ReactNode;
};

/** Shared presentation for the administrator preview and the real music matches. */
export default function MusicArenaStage({ tracks, timerValue, timerLabel, navigation, duelLabel, bracketUrl, children, countdownExtra, startsAt, renderTrackFooter, renderWaiting }: Props) {
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const text = musicDemoCopy[locale];
  const [activeId, setActiveId] = useState<string | null>(null);
  const { signal, prepareAudio } = useMusicAnalyser();

  return <main className="champ-page music-arena music-demo-page">
    <div className="champ-container champ-arena-container">
      {navigation}
      <header className="champ-hero music-demo-hero">
        <h1>ARENA DIGITALE</h1>
        <p className="music-demo-tagline">framing the unseen</p>
        <section className="music-demo-countdown" aria-label={timerLabel}>
          <strong role="timer" aria-label={`${timerLabel}: ${timerValue}`}>
            {timerValue.split(' : ').map((group, groupIndex) => <Fragment key={`${group}-${groupIndex}`}>
              {groupIndex > 0 && ' : '}
              <span className="music-demo-clock-group">
                {Array.from(group, (digit, digitIndex) => <span className="music-demo-clock-digit" key={`${digit}-${digitIndex}`}>{digit}</span>)}
              </span>
            </Fragment>)}
          </strong>
          {countdownExtra}
        </section>
        {startsAt && <p className="music-demo-starts">{text.starts} {new Date(startsAt).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
      </header>
      <MusicWaveform signal={signal} appearance="arena" />
      <section className="music-duel" aria-label={duelLabel}>
        {tracks.map((track, index) => <article className={`music-challenger music-challenger-${index + 1}`} key={track?.id ?? index}>
          {track ? <>
            <MusicRecord track={track} slot={index + 1} activeId={activeId} demoTransport onPrepareAudio={prepareAudio} onActiveChange={id => {
              setActiveId(previous => id ?? (previous === track.id ? null : previous));
            }} />
            {renderTrackFooter?.(index)}
          </> : renderWaiting?.(index)}
        </article>)}
      </section>
      {children}
      <footer className="music-footer"><Headphones size={18} /><p>{copy.submitIntro}</p><Link to="/submit?tipo=musica">{copy.submit}<ArrowUpRight size={14} /></Link><Link to={bracketUrl}>{text.bracket}<ArrowUpRight size={14} /></Link></footer>
    </div>
  </main>;
}
