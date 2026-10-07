import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Camera, Music2, Trophy, X } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useChampionship } from '@/hooks/useChampionship';
import { arenaPath, currentMatch, type Championship as ChampionshipType, type ChampionshipKind } from '@/lib/championship';
import { championshipCopy } from '@/i18n/championship-copy';
import { useI18n } from '@/i18n/I18nProvider';
import ChampionshipBracket from '@/components/ChampionshipBracket';
import '@/championship.css';

export default function Championship() {
  const [params, setParams] = useSearchParams();
  const kind: ChampionshipKind = params.get('tipo') === 'musica' ? 'music' : 'photo';
  const id = params.get('id');
  const { locale } = useI18n();
  const copy = championshipCopy[locale];
  const { data, isLoading, error, refetch, now } = useChampionship(kind, id);
  const [history, setHistory] = useState<ChampionshipType[]>([]);
  useEffect(() => {
    let mounted = true;
    void supabase.from('championships').select('id,kind,name,start_at,end_at,status,winner_id').eq('kind', kind).order('start_at', { ascending: false }).limit(24).then(({ data }) => { if (mounted) setHistory(data ?? []); });
    return () => { mounted = false; };
  }, [kind, data?.championship?.id]);
  const championship = data?.championship;
  const live = data ? currentMatch(data, now) : null;
  const finished = data?.matches.filter(match => match.winner_id).length ?? 0;
  const winner = data?.entries.find(entry => entry.id === championship?.winner_id);
  const eliminated = new Set(data?.matches.filter(match => match.winner_id).map(match => match.entry_1_id === match.winner_id ? match.entry_2_id : match.entry_1_id));
  const date = (value: string) => new Date(value).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return <main className="champ-page">
    <div className="champ-container">
      <header className="champ-hero">
        <p className="champ-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}<span>.</span></h1>
        <p>{copy.intro}</p>
        <div className="champ-kind-tabs" aria-label={copy.title}>
          <button className={kind === 'photo' ? 'is-selected' : ''} onClick={() => setParams({ tipo: 'foto' })}><Camera size={16} />{copy.photo}</button>
          <button className={kind === 'music' ? 'is-selected' : ''} onClick={() => setParams({ tipo: 'musica' })}><Music2 size={16} />{copy.music}</button>
        </div>
      </header>
      {isLoading ? <p role="status" className="champ-notice">{copy.loading}</p> : error ? <div role="alert" className="champ-notice"><p>{copy.error}</p><button className="champ-button" onClick={() => void refetch()}>{copy.retry}</button></div> : <>
        {championship ? <section className="champ-summary">
          <div><span className={`champ-status ${championship.status}`}>{copy[championship.status]}</span><h2>{championship.name}</h2><p>{copy.starts} {date(championship.start_at)} · {copy.ends} {date(championship.end_at)}</p></div>
          <div className="champ-progress"><strong>{String(finished).padStart(2, '0')}<span>/15</span></strong><p>{copy.progress}</p><div><span style={{ width: `${finished / 15 * 100}%` }} /></div></div>
          {live && <Link className="champ-button" to={`${arenaPath(kind)}?campionato=${championship.id}`}>{copy.live} · #{live.number}<ArrowUpRight size={16} /></Link>}
        </section> : <section className="champ-empty"><Trophy size={28} /><h2>{copy.empty}</h2><p>{copy.emptyText}</p><Link className="champ-button" to={`/submit?tipo=${kind === 'music' ? 'musica' : 'foto'}`}>{copy.submit}<ArrowUpRight size={16} /></Link></section>}
        {winner && <section className="champ-winner"><img src={winner.image_url} alt={winner.title} /><div><p><Trophy size={16} />{copy.champion}</p><h2>{winner.title}</h2><span>{winner.artist} · #{winner.seed}</span></div></section>}
        <div className="champ-board-heading"><h2>{copy.bracket}</h2><span>{copy.scroll}</span></div>
        <ChampionshipBracket data={data} kind={kind} now={now} />
        <div className="champ-rule"><p>{copy.duration}</p><p>{copy.tieRule}</p></div>
        {data?.entries.length > 0 && <section className="champ-participants"><h2>16 {copy.participants}</h2><div>{data.entries.map(entry => <article key={entry.id} className={eliminated.has(entry.id) ? 'is-lost' : ''}><div><img src={entry.image_url} alt={entry.title} loading="lazy" />{eliminated.has(entry.id) && <X aria-label={copy.lost} size={38} />}</div><span>#{entry.seed} · {entry.artist}</span><h3>{entry.title}</h3></article>)}</div></section>}
      </>}
      {history.length > 1 && <label className="champ-history">{copy.history}<select value={id || championship?.id || ''} onChange={event => setParams({ tipo: kind === 'music' ? 'musica' : 'foto', id: event.target.value })}>{history.map(item => <option key={item.id} value={item.id}>{item.name} · {copy[item.status]}</option>)}</select></label>}
    </div>
  </main>;
}
