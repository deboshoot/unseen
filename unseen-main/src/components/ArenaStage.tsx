import { Fragment, type ReactNode } from 'react';
import { ArrowUpRight, Camera, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import { photoComingCopy } from '@/i18n/photo-coming-copy';
import type { ChampionshipKind } from '@/lib/championship';
import '@/championship.css';
import '@/music-demo.css';

type Props = {
  kind: ChampionshipKind;
  timerValue: string;
  timerLabel: string;
  navigation: ReactNode;
  bracketUrl: string;
  children: ReactNode;
  countdownExtra?: ReactNode;
  startsAt?: string;
};

/** One presentation for both public arenas and the administrator music preview. */
export default function ArenaStage({ kind, timerValue, timerLabel, navigation, bracketUrl, children, countdownExtra, startsAt }: Props) {
  const { locale } = useI18n();
  const text = musicDemoCopy[locale];
  const isMusic = kind === 'music';
  const footer = isMusic ? musicCopy[locale].submitIntro : photoComingCopy[locale].footer;
  const submit = isMusic ? musicCopy[locale].submit : photoComingCopy[locale].submit;
  const SubmitIcon = isMusic ? Headphones : Camera;
  return <main className={`champ-page music-arena music-demo-page${isMusic ? '' : ' photo-arena'}`}>
    <div className="champ-container champ-arena-container">
      {navigation}
      <header className="champ-hero music-demo-hero">
        <h1>ARENA DIGITALE</h1>
        <p className="music-demo-tagline">framing the unseen</p>
        <section className="music-demo-countdown" aria-label={timerLabel}>
          <span className="music-demo-clock-caption" aria-hidden="true">{timerLabel}</span>
          <strong role="timer" aria-live="off" aria-label={`${timerLabel}: ${timerValue}`}>
            {timerValue.split(' : ').map((group, groupIndex) => <Fragment key={groupIndex}>
              {groupIndex > 0 && <span className="music-demo-clock-separator" aria-hidden="true"><span>{' : '}</span></span>}
              <span className="music-demo-clock-unit" data-unit={text.timeUnits[groupIndex]}>
                <span className="music-demo-clock-group">
                  {Array.from(group, (digit, digitIndex) => <span className="music-demo-clock-digit" key={digitIndex}><span className="music-demo-clock-value" key={digit}>{digit}</span></span>)}
                </span>
              </span>
            </Fragment>)}
          </strong>
          {countdownExtra}
        </section>
        {startsAt && <p className="music-demo-starts">{text.starts} {new Date(startsAt).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
      </header>
      {children}
      <footer className="music-footer"><SubmitIcon size={18} /><p>{footer}</p><Link to={`/submit?tipo=${isMusic ? 'musica' : 'foto'}`}>{submit}<ArrowUpRight size={14} /></Link><Link to={bracketUrl}>{text.bracket}<ArrowUpRight size={14} /></Link></footer>
    </div>
  </main>;
}
