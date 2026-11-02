import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { musicDemoCopy } from '@/i18n/music-demo-copy';
import { voteResultsCopy } from '@/i18n/vote-results-copy';
import { useVoteReveal } from '@/hooks/useVoteReveal';
import type { VotePercentages } from '@/lib/championship';

type Props = {
  choices: { id: string; artist: string }[];
  selectedId: string | null;
  selectedLabel: string;
  onChoose: (id: string) => void;
  disabled?: boolean;
  percentages?: VotePercentages | null;
  resultsPending?: boolean;
  onRefreshResults?: () => void;
  showResultsHint?: boolean;
};

export default function MusicArenaVote({ choices, selectedId, selectedLabel, onChoose, disabled = false, percentages, resultsPending = false, onRefreshResults, showResultsHint = false }: Props) {
  const { locale } = useI18n();
  const text = musicDemoCopy[locale];
  const resultsText = voteResultsCopy[locale];
  const [open, setOpen] = useState(false);
  const choicesId = useId();
  const showResults = Boolean(selectedId && percentages && choices.length === 2);
  const targets = showResults ? [percentages!.slot_1, percentages!.slot_2] : undefined;
  const animated = useVoteReveal(targets?.[0], targets?.[1]);
  const leader = showResults && percentages!.leading_slot !== undefined
    ? (percentages!.leading_slot === null ? null : percentages!.leading_slot - 1)
    : targets && targets[0] !== targets[1] ? (targets[0] > targets[1] ? 0 : 1) : null;
  const summary = targets ? (leader === null ? (targets[0] + targets[1] === 0 ? resultsText.empty : resultsText.tied) : `${choices[leader].artist} · ${resultsText.leading.toLocaleLowerCase(locale)}`) : '';
  return <div className={`music-demo-vote-area${showResults ? ' has-results' : ''}`}>
    {showResults && <div className="arena-vote-results-heading" aria-hidden="true"><span>{resultsText.title}</span></div>}
    {!open && !selectedId
      ? <button type="button" className="music-vote" disabled={disabled} aria-expanded="false" aria-controls={choicesId} onClick={() => setOpen(true)}>{text.vote}</button>
      : <div className="music-demo-vote-choices" id={choicesId} role="group" aria-label={text.voteChoices}>
        {choices.map((choice, index) => <button type="button" key={choice.id} disabled={disabled} className={`music-demo-vote-choice${selectedId === choice.id ? ' is-selected' : ''}${showResults && leader === index ? ' is-leading' : ''}`} aria-label={`${text.vote} ${choice.artist}`} aria-pressed={selectedId === choice.id} onClick={() => onChoose(choice.id)}>
          {selectedId === choice.id && <Check size={16} aria-hidden="true" />}
          <span>{choice.artist}</span>
          {showResults && <strong className="arena-vote-percentage" aria-hidden="true">{Math.round(animated[index])}<em>%</em></strong>}
          {(selectedId === choice.id || !showResults) && <small>{selectedId === choice.id ? selectedLabel : text.voteFor}</small>}
          {showResults && <span className="arena-vote-card-fill" style={{ transform: `scaleX(${animated[index] / 100})` }} aria-hidden="true" />}
        </button>)}
      </div>}
    {showResultsHint && !selectedId && <p className="arena-vote-hint">{resultsText.hint}</p>}
    {showResults && <div className="arena-vote-results-footer">
      <div className="arena-vote-balance" aria-hidden="true">
        <span className={leader === 0 ? 'is-leading' : ''} style={{ width: `${animated[0]}%` }} />
        <span className={leader === 1 ? 'is-leading' : ''} style={{ width: `${animated[1]}%` }} />
      </div>
      <p aria-hidden="true">{leader !== null && <span className="arena-vote-leader-dot" />}{summary}</p>
      <p className="sr-only" role="status">{resultsText.title}. {choices[0].artist}: {targets![0]}%. {choices[1].artist}: {targets![1]}%. {summary}.</p>
    </div>}
    {selectedId && !showResults && onRefreshResults && <p className="arena-vote-results-pending" role="status">
      {resultsPending ? resultsText.loading : <>{resultsText.unavailable} <button type="button" onClick={onRefreshResults}>{resultsText.retry}</button></>}
    </p>}
  </div>;
}
