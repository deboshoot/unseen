import { useState, type ReactNode } from 'react';
import { useMusicAnalyser } from '@/hooks/useMusicAnalyser';
import type { MusicTrack } from '@/lib/music';
import ArenaStage from './ArenaStage';
import MusicRecord from './MusicRecord';
import MusicWaveform from './MusicWaveform';

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

export function MusicArenaMedia({ tracks, duelLabel, renderTrackFooter, renderWaiting }: Pick<Props, 'tracks' | 'duelLabel' | 'renderTrackFooter' | 'renderWaiting'>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { signal, prepareAudio } = useMusicAnalyser();

  return <>
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
  </>;
}

export default function MusicArenaStage({ tracks, duelLabel, renderTrackFooter, renderWaiting, children, ...stage }: Props) {
  return <ArenaStage kind="music" {...stage}>
    <MusicArenaMedia tracks={tracks} duelLabel={duelLabel} renderTrackFooter={renderTrackFooter} renderWaiting={renderWaiting} />
    {children}
  </ArenaStage>;
}
