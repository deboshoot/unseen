import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Share2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { useChampionship } from '@/hooks/useChampionship';
import { arenaPath, countdown, currentMatch, isMatchOpen, type ChampionshipKind } from '@/lib/championship';
import { useI18n } from '@/i18n/I18nProvider';
import { championshipCopy } from '@/i18n/championship-copy';
import MusicRecord from '@/components/MusicRecord';
import MusicWaveform from '@/components/MusicWaveform';
import { useMusicAnalyser } from '@/hooks/useMusicAnalyser';
import '@/championship.css';

export default function ChampionshipArena({ kind }: { kind: ChampionshipKind }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const copy = championshipCopy[locale];
  const { data, now, isLoading, error, refetch, userId } = useChampionship(kind, params.get('campionato'));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [localVote, setLocalVote] = useState<{ matchId: string; slot: number; userId: string } | null>(null);
  const { signal, prepareAudio } = useMusicAnalyser();
  const championship = data?.championship;
  const live = data ? currentMatch(data, now) : null;
  const requested = params.get('match');
  const match = requested ? data?.matches.find(item => item.id === requested) : live;
  const canVote = Boolean(championship && match && isMatchOpen(match, championship, now));
  const chosen = data?.my_votes.find(vote => vote.match_id === match?.id)?.vote_slot ?? (localVote?.matchId === match?.id && localVote.userId === userId ? localVote.slot : null);
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
  return <main className={`champ-page ${kind === 'music' ? 'music-arena' : ''}`}><div className="champ-container champ-arena-container">
    <Link className="music-back" to="/arena"><ArrowLeft size={15} />Arena</Link>
    <header className="champ-hero"><p className="champ-eyebrow">UNSEEN · {kind === 'music' ? copy.music : copy.photo} · {copy.title}</p><h1>ARENA<span>.</span></h1><p>{championship?.name ?? copy.intro}</p>
      {match && <div className="champ-arena-countdown"><span>{copy.rounds[match.round - 1]} · #{match.number}/15</span><strong>{canVote ? countdown(match.end_at, now) : match.winner_id ? copy.completed : copy.scheduled}</strong><span>{canVote ? copy.remaining : new Date(match.start_at).toLocaleString(locale)}</span></div>}
      {kind === 'music' && <MusicWaveform signal={signal} />}
      <div className="champ-arena-actions"><Link className="champ-button" to={bracketUrl}><Trophy size={16} />{copy.bracket}</Link>{match && <button className="music-share" onClick={() => void share()}><Share2 size={15} />{copy.share}</button>}</div>
    </header>
    {isLoading ? <p role="status" className="champ-notice">{copy.loading}</p> : error ? <div role="alert" className="champ-notice"><p>{copy.error}</p><button className="champ-button" onClick={() => void refetch()}>{copy.retry}</button></div> : !match ? <section className="champ-empty"><Trophy size={30} /><h2>{championship?.status === 'scheduled' ? copy.scheduled : copy.noMatch}</h2><p>{championship?.status === 'scheduled' ? `${copy.starts} ${new Date(championship.start_at).toLocaleString(locale)}` : championship ? copy[championship.status] : copy.emptyText}</p><Link to={bracketUrl} className="champ-button">{copy.title}</Link>{live && <Link to={`${arenaPath(kind)}?campionato=${championship?.id}`}>{copy.live}</Link>}</section> : <>
      <section className={kind === 'music' ? 'music-duel' : 'champ-photo-duel'}>
        {[match.entry_1_id, match.entry_2_id].map((id, index) => {
          const entry = data.entries.find(entry => entry.id === id);
          const lost = Boolean(match.winner_id && match.winner_id !== id);
          return <article key={`${match.id}-${index}`} className={kind === 'music' ? `music-challenger music-challenger-${index + 1}` : 'champ-photo-challenger'}>
            {entry ? <>
              {kind === 'music' ? <MusicRecord track={{ id: entry.id, title: entry.title, artist: entry.artist, cover_url: entry.image_url, audio_url: entry.audio_url ?? '' }} slot={index + 1} activeId={activeId} onActiveChange={setActiveId} onPrepareAudio={prepareAudio} /> : <><div className={`champ-photo-frame ${lost ? 'is-lost' : ''}`}><img src={entry.image_url} alt={entry.title} />{lost && <span aria-label={copy.lost}>×</span>}</div><div className="champ-photo-caption"><span>#{entry.seed} · {entry.artist}</span><h2>{entry.title}</h2></div></>}
              <p className="champ-arena-result">{index === 0 ? match.votes_1 : match.votes_2} {copy.votes}{match.winner_id && <span>{lost ? copy.lost : copy.qualified}</span>}</p>
              <button className={`music-vote ${chosen === index + 1 ? 'is-selected' : ''}`} disabled={!canVote || busy || Boolean(chosen)} onClick={() => void vote(index + 1)}>{chosen === index + 1 ? <><Check size={16} />{copy.voted}</> : !userId && canVote ? copy.login : copy.vote}</button>
            </> : <div className="champ-empty">{copy.waiting} #{(match.round === 2 ? (match.position - 1) * 2 : match.round === 3 ? 8 + (match.position - 1) * 2 : 12) + index + 1}</div>}
          </article>;
        })}
        <span className={kind === 'music' ? 'music-vs' : 'champ-photo-vs'} aria-hidden="true">VS</span>
      </section>
      {match.tie_break && <p className="champ-rule">{copy.tie}</p>}
      {!canVote && live && live.id !== match.id && <Link className="champ-button" to={`${arenaPath(kind)}?campionato=${championship.id}`}>{copy.live} · #{live.number}</Link>}
      <p className="champ-rule">{copy.tieRule}</p>
    </>}
  </div></main>;
}
