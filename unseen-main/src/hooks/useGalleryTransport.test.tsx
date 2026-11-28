import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGalleryTransport } from './useGalleryTransport';

const works = [{ audio: '/one.wav' }, { audio: '/two.wav' }, { audio: '/three.wav' }];

function Player() {
  const player = useGalleryTransport(works, 0, false, 'Audio unavailable');
  return <>
    <audio ref={player.audio} src={works[player.index].audio} {...player.mediaEvents} />
    <output>{player.index} {player.phase}</output>
    <button onClick={player.toggle}>{player.wantsPlay ? 'Pause' : 'Play'}</button>
    <button onClick={() => player.skip(1)}>Next</button>
  </>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const click = (name: string) => act(() => screen.getByRole('button', { name }).click());
const nextPhase = () => act(() => { vi.runOnlyPendingTimers(); });

it('commits the latest selection at insertion and resumes only the final record', () => {
  render(<Player />);
  click('Play');
  click('Next');
  click('Next');
  expect(screen.getByRole('status')).toHaveTextContent('0 lifting');
  nextPhase();
  expect(screen.getByRole('status')).toHaveTextContent('0 ejecting');
  nextPhase();
  expect(screen.getByRole('status')).toHaveTextContent('2 inserting');
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  nextPhase();
  nextPhase();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  expect(document.querySelectorAll('audio')).toHaveLength(1);
  expect(document.querySelector('audio')).toHaveAttribute('src', '/three.wav');
});

it('honors a pause during insertion even when another selection is queued', () => {
  render(<Player />);
  click('Play');
  click('Next');
  nextPhase();
  nextPhase();
  click('Next');
  click('Pause');
  nextPhase();
  nextPhase();
  expect(screen.getByRole('status')).toHaveTextContent('1 lifting');
  for (let i = 0; i < 4; i++) nextPhase();
  expect(screen.getByRole('status')).toHaveTextContent('2 paused');
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
});
