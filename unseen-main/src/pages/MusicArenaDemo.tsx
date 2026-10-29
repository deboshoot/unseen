import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import MusicArenaStage from '@/components/MusicArenaStage';
import MusicArenaVote from '@/components/MusicArenaVote';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import { countdown, currentMatch } from '@/lib/championship';
import { demoTracks } from '@/lib/music';
import { useChampionship } from '@/hooks/useChampionship';

export default function MusicArenaDemo({ startsAt }: { startsAt?: string }) {
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const text = musicDemoCopy[locale];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: schedule, now, isLoading: scheduleLoading, error: scheduleError, refetch } = useChampionship('music');
  const activeMatch = schedule ? currentMatch(schedule, now) : null;
  const nextMatch = schedule?.championship && ['scheduled', 'running'].includes(schedule.championship.status)
    ? schedule.matches
      .filter(match => !match.winner_id && match.entry_1_id && match.entry_2_id && Date.parse(match.start_at) > now)
      .sort((first, second) => Date.parse(first.start_at) - Date.parse(second.start_at))[0]
    : null;
  const timerTarget = activeMatch?.end_at ?? nextMatch?.start_at;
  const timerLabel = activeMatch ? text.duelDeadline : nextMatch ? text.nextDuelStarts : text.duelDeadline;
  const timerValue = timerTarget ? countdown(timerTarget, now) : '00 : 00 : 00';

  return <MusicArenaStage tracks={demoTracks} timerValue={timerValue} timerLabel={timerLabel} startsAt={startsAt} duelLabel={copy.demo} bracketUrl="/campionato?tipo=musica"
    navigation={<nav className="music-demo-navigation" aria-label={text.back}>
      <Link className="music-back" to="/admin"><ArrowLeft size={15} />{text.back}</Link>
      <Link to="/arena/musicale/demo">{text.permanentLink}<ArrowUpRight size={13} /></Link>
    </nav>}
    countdownExtra={<>
      {scheduleLoading && <span className="sr-only" role="status">{text.scheduleLoading}</span>}
      {scheduleError && <div role="alert"><span>{text.scheduleError}</span><button type="button" onClick={() => void refetch()}>{text.retry}</button></div>}
    </>}>
    <MusicArenaVote choices={demoTracks} selectedId={selectedId} selectedLabel={copy.demoVoted} onChoose={setSelectedId} />
    {selectedId && <div className="music-demo-vote-note"><button type="button" onClick={() => setSelectedId(null)}><RotateCcw size={13} />{text.reset}</button></div>}
  </MusicArenaStage>;
}
