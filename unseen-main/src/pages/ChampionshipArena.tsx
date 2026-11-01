import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Share2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { useChampionship } from '@/hooks/useChampionship';
import { arenaPath, countdown, currentMatch, isMatchOpen, type ChampionshipKind } from '@/lib/championship';
import { useI18n } from '@/i18n/I18nProvider';
import { championshipCopy } from '@/i18n/championship-copy';
import ArenaStage from '@/components/ArenaStage';
import { MusicArenaMedia } from '@/components/MusicArenaStage';
import MusicArenaVote from '@/components/MusicArenaVote';
import PhotoArenaWork from '@/components/PhotoArenaWork';
import ArenaComingSoon from '@/components/ArenaComingSoon';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import '@/championship.css';
import '@/photo-arena.css';

export default function ChampionshipArena({ kind }: { kind: ChampionshipKind }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const copy = championshipCopy[locale];
  const { data, now, isLoading, error, refetch, userId } = useChampionship(kind, params.get('campionato'));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [localVote, setLocalVote] = useState<{ matchId: string; slot: number; userId: string } | null>(null);
  const championship = data?.championship;
  const requested = params.get('match');
  // A shared URL cannot select a past or future duel outside its 48-hour window.
  const match = data ? currentMatch(data, now) : null;
  const canVote = Boolean(championship && match && isMatchOpen(match, championship, now));
  const chosen = data?.my_votes.find(vote => vote.match_id === match?.id)?.vote_slot ?? (localVote && localVote.matchId === match?.id && localVote.userId === userId ? localVote.slot : null);
  const bracketUrl = `/campionato?tipo=${kind === 'music' ? 'musica' : 'foto'}${championship ? `&id=${championship.id}` : ''}`;
  const matchUrl = championship && match ? `${arenaPath(kind)}?campionato=${championship.id}&match=${match.id}` : arenaPath(kind);
  const vote = async (slot: number) => {
    if (!canVote || !match || chosen || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(`/auth?redirect=${encodeURIComponent(matchUrl)}`); return; }
      const { error } = await supabase.rpc('cast_championship_vote', { p_match_id: match.id, p_vote_slot: slot });
      if (error) throw error;
      setLocalVote({ matchId: match.id, slot, userId: session.user.id }); toast.success(copy.voted); await refetch();
    } catch (error) { toast.error(copy.voteError, { description: error instanceof Error ? error.message : undefined }); void refetch(); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const share = async () => {
    try {
      const url = `${window.location.origin}${matchUrl}`;
      if (navigator.share) await navigator.share({ title: championship?.name ?? 'UNSEEN', url });
      else { await navigator.clipboard.writeText(url); toast.success(copy.copied); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error(copy.error); }
  };
  if (params.get('duelId')) return <Navigate replace to={`/archivio${arenaPath(kind)}?${params.toString()}`} />;
  // Resolve loading and errors before mounting the arena layout.
  if (isLoading || error) return <main className="champ-page" aria-busy={isLoading}><div className="champ-container champ-arena-container">
    <Link className="music-back" to="/arena"><ArrowLeft size={15} />Arena</Link>
    {isLoading ? <p role="status" className="champ-notice">{copy.loading}</p> : <div role="alert" className="champ-notice"><p>{copy.error}</p><button className="champ-button" onClick={() => void refetch()}>{copy.retry}</button></div>}
  </div></main>;
  const showOpening = !championship || championship.status === 'scheduled';
  if (showOpening) return <ArenaComingSoon kind={kind} startsAt={championship?.status === 'scheduled' ? championship.start_at : undefined} />;
  if (championship.status === 'completed' || championship.status === 'cancelled') return <Navigate replace to={bracketUrl} />;
  if (requested && requested !== match?.id) return <Navigate replace to={match ? matchUrl : `${arenaPath(kind)}?campionato=${championship.id}`} />;
  if (championship && match && data) {
    const text = musicDemoCopy[locale];
    const entries = [match.entry_1_id, match.entry_2_id].map(id => data.entries.find(entry => entry.id === id) ?? null);
    const tracks = entries.map(entry => entry ? { ...entry, cover_url: entry.image_url, audio_url: entry.audio_url ?? '' } : null);
    const waiting = (index: number) => <div className="champ-empty">{copy.waiting} #{(match.round === 2 ? (match.position - 1) * 2 : match.round === 3 ? 8 + (match.position - 1) * 2 : 12) + index + 1}</div>;
    const duelLabel = `${championship.name} · ${copy.rounds[match.round - 1]} · #${match.number}/15`;
    const result = () => <p className="sr-only">{copy.secretVotes}</p>;
    return <ArenaStage key={`${championship.id}:${match.id}:${userId ?? 'anon'}`} kind={kind}
      timerValue={countdown(match.end_at, now)} timerLabel={text.duelDeadline}
      bracketUrl={bracketUrl}
      navigation={<nav className="music-demo-navigation" aria-label="Arena">
        <Link className="music-back" to="/arena"><ArrowLeft size={15} />Arena</Link>
      </nav>}>
      {kind === 'music' ? <MusicArenaMedia tracks={tracks} duelLabel={duelLabel} renderWaiting={waiting} renderTrackFooter={result} />
        : <section className="music-duel photo-arena-duel" aria-label={duelLabel}>
          {entries.map((entry, index) => <article className={`music-challenger photo-arena-challenger photo-arena-challenger-${index + 1}`} key={`${match.id}-${index}`}>
            {entry ? <>
              <PhotoArenaWork entry={entry} />
              {result()}
            </> : waiting(index)}
          </article>)}
        </section>}
      <MusicArenaVote choices={entries.flatMap(entry => entry ? [entry] : [])} selectedId={chosen ? entries[chosen - 1]?.id ?? null : null}
        selectedLabel={copy.voted} disabled={!canVote || busy || Boolean(chosen)}
        onChoose={id => void vote(entries.findIndex(entry => entry?.id === id) + 1)} />
      <div className="champ-arena-share"><button type="button" className="music-share" onClick={() => void share()}><Share2 size={15} />{copy.share}</button></div>
      <p className="sr-only">{copy.rounds[match.round - 1]} · #{match.number}/15 · {championship.name}</p>
    </ArenaStage>;
  }
  return <main className={`champ-page ${kind === 'music' ? 'music-arena' : ''}`}><div className="champ-container champ-arena-container">
    <Link className="music-back" to="/arena"><ArrowLeft size={15} />Arena</Link>
    <header className="champ-hero"><p className="champ-eyebrow">UNSEEN · {kind === 'music' ? copy.music : copy.photo} · {copy.title}</p><h1>ARENA<span>.</span></h1><p>{championship?.name ?? copy.intro}</p>
      <div className="champ-arena-actions"><Link className="champ-button" to={bracketUrl}><Trophy size={16} />{copy.bracket}</Link></div>
    </header>
    <section className="champ-empty"><Trophy size={30} /><h2>{copy.noMatch}</h2><p>{championship ? copy[championship.status] : copy.emptyText}</p><Link to={bracketUrl} className="champ-button">{copy.title}</Link></section>
  </div></main>;
}
