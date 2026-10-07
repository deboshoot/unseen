import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { championshipFixture, fixtureNow } from '@/test/championship-fixture';
import ChampionshipBracket from './ChampionshipBracket';
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
afterEach(cleanup);
describe('public championship bracket', () => {
  it('hides unresolved counts even when the supplied data has admin scores, then reveals a resolved result', () => {
    const data = championshipFixture(); data.matches[0].votes_1 = 532; data.matches[0].votes_2 = 341;
    const { rerender } = render(<MemoryRouter><ChampionshipBracket data={data} kind="photo" now={fixtureNow} /></MemoryRouter>);
    expect(screen.queryByText('532')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Voti segreti fino alla fine del duello')).toHaveLength(16);
    data.matches[0].resolved_at = new Date(fixtureNow + 48 * 3600000).toISOString();
    rerender(<MemoryRouter><ChampionshipBracket data={data} kind="photo" now={fixtureNow + 48 * 3600000} /></MemoryRouter>);
    expect(screen.getByText('532')).toBeInTheDocument();
    expect(screen.getByText('341')).toBeInTheDocument();
  });
  it('allows scores explicitly in the administrator view', () => {
    const data = championshipFixture(); data.matches[0].votes_1 = 532;
    render(<MemoryRouter><ChampionshipBracket data={data} kind="photo" now={fixtureNow} admin /></MemoryRouter>);
    expect(screen.getByText('532')).toBeInTheDocument();
  });
  it('shows 15 scheduled matches, forwards a winner and marks only its losing opponent', () => {
    const data = championshipFixture(); data.matches[0].winner_id = 'entry-2'; data.matches[0].resolved_at = new Date(fixtureNow).toISOString(); data.matches[8].entry_1_id = 'entry-2';
    const { container } = render(<MemoryRouter><ChampionshipBracket data={data} kind="photo" now={fixtureNow + 48 * 3600000} /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(15);
    expect(screen.getAllByText('Work 2')).toHaveLength(2);
    expect(container.querySelectorAll('.champ-entry.is-lost')).toHaveLength(1);
    expect(container.querySelector('.champ-entry.is-lost')).toHaveTextContent('Work 1');
    expect(screen.getByRole('link', { name: 'Apri duello 2' })).toHaveClass('is-live');
    expect(screen.getByRole('link', { name: 'Apri duello 9' })).toHaveAttribute('href', '/arena/fotografica?campionato=championship-1&match=match-9');
  });
  it('shows a full empty bracket without inventing competing entries', () => {
    const { container } = render(<MemoryRouter><ChampionshipBracket kind="music" now={fixtureNow} /></MemoryRouter>);
    expect(container.querySelectorAll('.champ-match')).toHaveLength(15);
    expect(screen.getAllByText(/^Posizione /)).toHaveLength(16);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
