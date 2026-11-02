import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MusicArenaVote from './MusicArenaVote';

vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('framer-motion', () => ({ useReducedMotion: () => true }));
afterEach(cleanup);
const choices = [{ id: 'a', artist: 'BRAMBO' }, { id: 'b', artist: 'PERTU' }];
const defaults = { choices, selectedId: 'b', selectedLabel: 'Voto registrato', onChoose: vi.fn(), disabled: true };

describe('post-vote percentages', () => {
  it('keeps results hidden until the voter has chosen, even when cached data contains them', () => {
    render(<MusicArenaVote {...defaults} selectedId={null} disabled={false} percentages={{ slot_1: 38, slot_2: 62 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Vota' }));
    expect(screen.queryByText('Il voto del pubblico')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reveals the actual leader even when the voter chose the other artist', () => {
    const { container } = render(<MusicArenaVote {...defaults} percentages={{ slot_1: 62, slot_2: 38 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('BRAMBO: 62%. PERTU: 38%. BRAMBO · in vantaggio');
    expect(screen.getByRole('button', { name: 'Vota BRAMBO' })).toHaveClass('is-leading');
    expect(screen.getByRole('button', { name: 'Vota PERTU' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.arena-vote-percentage')).toHaveTextContent('62%');
    expect(container.querySelector('.arena-vote-balance > span')).toHaveStyle({ width: '62%' });
  });

  it('shows a tie and handles a one-sided vote without inventing a winner', () => {
    const { container, rerender } = render(<MusicArenaVote {...defaults} percentages={{ slot_1: 50, slot_2: 50 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Il duello è in parità');
    expect(container.querySelector('.is-leading')).toBeNull();
    rerender(<MusicArenaVote {...defaults} percentages={{ slot_1: 0, slot_2: 100 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('BRAMBO: 0%. PERTU: 100%. PERTU · in vantaggio');
  });

  it('uses the unrounded leader from the server when percentages round to 50/50', () => {
    render(<MusicArenaVote {...defaults} percentages={{ slot_1: 50, slot_2: 50, leading_slot: 2 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('PERTU · in vantaggio');
  });

  it('offers a refresh when results are unavailable and never substitutes made-up percentages', () => {
    const refresh = vi.fn();
    const { rerender } = render(<MusicArenaVote {...defaults} resultsPending onRefreshResults={refresh} />);
    expect(screen.getByRole('status')).toHaveTextContent('Sveliamo le preferenze');
    rerender(<MusicArenaVote {...defaults} onRefreshResults={refresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Il voto del pubblico')).not.toBeInTheDocument();
  });
});
