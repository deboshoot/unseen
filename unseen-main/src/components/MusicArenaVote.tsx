import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { musicDemoCopy } from '@/i18n/music-demo-copy';

type Props = {
  choices: { id: string; artist: string }[];
  selectedId: string | null;
  selectedLabel: string;
  onChoose: (id: string) => void;
  disabled?: boolean;
};

export default function MusicArenaVote({ choices, selectedId, selectedLabel, onChoose, disabled = false }: Props) {
  const { locale } = useI18n();
  const text = musicDemoCopy[locale];
  const [open, setOpen] = useState(false);
  const choicesId = useId();
  return <div className="music-demo-vote-area">
    {!open && !selectedId
      ? <button type="button" className="music-vote" disabled={disabled} aria-expanded="false" aria-controls={choicesId} onClick={() => setOpen(true)}>{text.vote}</button>
      : <div className="music-demo-vote-choices" id={choicesId} role="group" aria-label={text.voteChoices}>
        {choices.map(choice => <button type="button" key={choice.id} disabled={disabled} className={`music-demo-vote-choice${selectedId === choice.id ? ' is-selected' : ''}`} aria-label={`${text.vote} ${choice.artist}`} aria-pressed={selectedId === choice.id} onClick={() => onChoose(choice.id)}>
          {selectedId === choice.id && <Check size={16} aria-hidden="true" />}
          <span>{choice.artist}</span>
          <small>{selectedId === choice.id ? selectedLabel : text.voteFor}</small>
        </button>)}
      </div>}
  </div>;
}
