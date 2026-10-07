import { Link } from 'react-router-dom';
import { LockKeyhole, Plus, Trophy, X } from 'lucide-react';
import { arenaPath, feederNumbers, isMatchOpen, matchCenter, type ChampionshipData, type ChampionshipKind, type ChampionshipMatch } from '@/lib/championship';
import { useI18n } from '@/i18n/I18nProvider';
import { championshipCopy } from '@/i18n/championship-copy';

export default function ChampionshipBracket({ data, kind, now, admin = false, onSeedClick, activeSeed }: { data?: ChampionshipData; kind: ChampionshipKind; now: number; admin?: boolean; onSeedClick?: (seed: number) => void; activeSeed?: number | null }) {
  const { locale } = useI18n();
  const copy = championshipCopy[locale];
  const entries = new Map(data?.entries.map(entry => [entry.id, entry]));
  const matches: ChampionshipMatch[] = data?.matches?.length ? data.matches : Array.from({ length: 15 }, (_, i) => {
    const number = i + 1;
    const round = number <= 8 ? 1 : number <= 12 ? 2 : number <= 14 ? 3 : 4;
    return { id: `placeholder-${number}`, number, round, position: number - [0, 0, 8, 12, 14][round], championship_id: '', entry_1_id: null, entry_2_id: null, winner_id: null, votes_1: 0, votes_2: 0, start_at: '', end_at: '', resolved_at: null, tie_break: null };
  });
  return <div className="champ-bracket-scroll" tabIndex={0} role="region" aria-label={copy.bracket}>
    <div className="champ-bracket">
      {copy.rounds.map((label, i) => <h3 key={label} className="champ-round-label" style={{ left: i * 270 }}>{label}<span>{[8, 4, 2, 1][i]} {[8, 4, 2, 1][i] === 1 ? copy.match : copy.matches}</span></h3>)}
      <svg className="champ-connectors" viewBox="0 0 1044 942" aria-hidden="true">
        {matches.filter(match => match.round < 4).map(match => {
          const parentPosition = Math.ceil(match.position / 2);
          const fromX = (match.round - 1) * 270 + 218;
          const toX = match.round * 270;
          const fromY = matchCenter(match.round, match.position);
          const toY = matchCenter(match.round + 1, parentPosition);
          return <path key={match.id} className={match.winner_id ? 'is-filled' : ''} d={`M ${fromX} ${fromY} H ${fromX + 26} V ${toY} H ${toX}`} />;
        })}
      </svg>
      {matches.map(match => {
        const live = data?.championship && isMatchOpen(match, data.championship, now);
        const feeders = feederNumbers(match);
        const url = data?.championship && !onSeedClick ? `${arenaPath(kind)}?campionato=${data.championship.id}&match=${match.id}` : null;
        const content = <>
          <div className="champ-match-label"><span>#{String(match.number).padStart(2, '0')}</span><span>{live ? copy.live : match.winner_id ? '✓' : match.start_at ? new Date(match.start_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '48h'}</span></div>
          {[match.entry_1_id, match.entry_2_id].map((id, slot) => {
            const entry = id ? entries.get(id) : null;
            const lost = Boolean(entry && match.winner_id && match.winner_id !== id);
            const won = entry && match.winner_id === id;
            const seed = (match.position - 1) * 2 + slot + 1;
            const body = <>
              <div className="champ-entry-image">{entry ? <img src={entry.image_url} alt="" loading="lazy" /> : <span>{match.round === 1 ? String((match.position - 1) * 2 + slot + 1).padStart(2, '0') : '·'}</span>}{lost && <X size={22} aria-label={copy.lost} />}</div>
              <div className="champ-entry-text"><strong>{entry?.title || (match.round === 1 ? `${copy.slot} ${(match.position - 1) * 2 + slot + 1}` : `${copy.waiting} #${feeders[slot]}`)}</strong><span>{entry ? `#${entry.seed} · ${entry.artist}` : '—'}</span></div>
              {onSeedClick && match.round === 1 ? <Plus size={13} /> : entry && <span className="champ-entry-votes">{admin || match.resolved_at ? (slot === 0 ? match.votes_1 : match.votes_2) ?? '—' : <LockKeyhole size={12} aria-label={copy.secretVotes} />}{won && <Trophy size={10} />}</span>}
            </>;
            const className = `champ-entry ${lost ? 'is-lost' : ''} ${won ? 'is-winner' : ''} ${activeSeed === seed && match.round === 1 ? 'is-editing' : ''}`;
            return onSeedClick && match.round === 1 ? <button key={slot} type="button" className={`${className} champ-seed-button`} onClick={() => onSeedClick(seed)} aria-label={`Scegli partecipante posizione ${seed}${entry ? `: ${entry.title}` : ''}`}>{body}</button> : <div key={slot} className={className}>{body}</div>;
          })}
          {match.tie_break && <span className="champ-tie" title={copy.tie}>{copy.tie}</span>}
        </>;
        const style = { left: (match.round - 1) * 270, top: matchCenter(match.round, match.position) - 44 };
        return url ? <Link key={match.id} to={url} style={style} className={`champ-match ${live ? 'is-live' : ''}`} aria-label={`${copy.view} ${match.number}`}>{content}</Link> : <div key={match.id} style={style} className="champ-match is-placeholder">{content}</div>;
      })}
    </div>
  </div>;
}
