import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AudioClipEditor from './AudioClipEditor';
import type { AudioSource } from '@/lib/audio-clip';

vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/lib/audio-clip', () => ({ MAX_CLIP_SECONDS: 40, waveformPeaks: () => [.2, .8, .5] }));
const onChange = vi.fn();

function Editor({ from = 20, to = 60, duration = 120, disabled = false } = {}) {
  const [range, setRange] = useState([from, to]);
  return <AudioClipEditor buffer={{ duration } as AudioSource} start={range[0]} end={range[1]} onChange={(start, end) => { onChange(start, end); setRange([start, end]); }} clipUrl="blob:clip" activeId={null} onActiveChange={() => {}} disabled={disabled} />;
}

beforeEach(() => {
  // jsdom has no native PointerEvent or pointer capture.
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number; isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true;
    }
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); onChange.mockClear(); });

function setup(props = {}) {
  const { container } = render(<Editor {...props} />);
  const waveform = container.querySelector<HTMLDivElement>('.audio-clip-waveform')!;
  vi.spyOn(waveform, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 600 } as DOMRect);
  Object.defineProperty(waveform, 'clientWidth', { value: 600 });
  waveform.setPointerCapture = vi.fn(); waveform.releasePointerCapture = vi.fn(); waveform.hasPointerCapture = () => true;
  return { waveform, selection: screen.getByRole('slider', { name: 'Sposta l’estratto' }), start: screen.getByRole('slider', { name: 'Sposta l’inizio dell’estratto' }), end: screen.getByRole('slider', { name: 'Sposta la fine dell’estratto' }) };
}
function gesture(target: HTMLElement, waveform: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(target, { clientX: from, pointerId: 1, button: 0, isPrimary: true });
  fireEvent.pointerMove(waveform, { clientX: to, pointerId: 1 });
  fireEvent.pointerUp(waveform, { pointerId: 1 });
}

describe('direct excerpt selection', () => {
  it('drags the whole excerpt without changing its duration and clamps at both track boundaries', () => {
    const { selection, waveform } = setup();
    gesture(selection, waveform, 100, 200);
    expect(onChange).toHaveBeenLastCalledWith(40, 80);
    gesture(selection, waveform, 200, 1000);
    expect(onChange).toHaveBeenLastCalledWith(80, 120);
    gesture(selection, waveform, 400, -1000);
    expect(onChange).toHaveBeenLastCalledWith(0, 40);
  });

  it('moves to a tapped point and supports dragging from outside the selection', () => {
    const { waveform } = setup();
    gesture(waveform, waveform, 450, 500);
    expect(onChange).toHaveBeenNthCalledWith(1, 70, 110);
    expect(onChange).toHaveBeenLastCalledWith(80, 120);
  });

  it('resizes either edge independently without crossing or exceeding 40 seconds', () => {
    const { waveform, start, end } = setup();
    gesture(start, waveform, 100, 200);
    expect(onChange).toHaveBeenLastCalledWith(40, 60);
    gesture(end, waveform, 300, 600);
    expect(onChange).toHaveBeenLastCalledWith(40, 80);
    gesture(start, waveform, 200, -600);
    expect(onChange).toHaveBeenLastCalledWith(40, 80);
    gesture(end, waveform, 400, 0);
    const [from, to] = onChange.mock.lastCall!;
    expect(from).toBe(40); expect(to - from).toBeCloseTo(.1);
  });

  it('handles touch dragging and cancellation without leaving a stuck drag', () => {
    const { selection, waveform } = setup();
    fireEvent.pointerDown(selection, { clientX: 100, pointerType: 'touch', pointerId: 7 });
    fireEvent.pointerMove(waveform, { clientX: 150, pointerId: 7 });
    expect(onChange).toHaveBeenLastCalledWith(30, 70);
    fireEvent.pointerCancel(waveform, { pointerId: 7 });
    onChange.mockClear();
    fireEvent.pointerMove(waveform, { clientX: 300, pointerId: 7 });
    expect(onChange).not.toHaveBeenCalled();
    expect(waveform).not.toHaveClass('is-dragging');
  });

  it('scrolls horizontally and with Shift + wheel while preserving vertical page scrolling', () => {
    const { waveform } = setup();
    expect(fireEvent.wheel(waveform, { deltaX: 50, deltaY: 0 })).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(30, 70);
    expect(fireEvent.wheel(waveform, { deltaY: 50, shiftKey: true })).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(40, 80);
    onChange.mockClear();
    expect(fireEvent.wheel(waveform, { deltaY: 100 })).toBe(true);
    expect(fireEvent.wheel(waveform, { deltaX: 50, ctrlKey: true })).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports keyboard movement, larger steps, resizing, and track boundaries', () => {
    const { selection, start, end } = setup();
    fireEvent.keyDown(selection, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(25, 65);
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(26, 65);
    fireEvent.keyDown(end, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(26, 64);
    fireEvent.keyDown(selection, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(82, 120);
    fireEvent.keyDown(selection, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(0, 38);
  });

  it('keeps short tracks valid and ignores input when disabled', () => {
    const { waveform, selection, end } = setup({ from: 0, to: .05, duration: .05, disabled: true });
    gesture(selection, waveform, 0, 400);
    fireEvent.keyDown(end, { key: 'ArrowLeft' });
    fireEvent.wheel(waveform, { deltaX: 50 });
    expect(onChange).not.toHaveBeenCalled();
    expect(selection).toHaveAttribute('tabindex', '-1');
  });

  it('keeps precise edits available behind the disclosure', () => {
    setup();
    const disclosure = screen.getByText('Regola i secondi esatti').closest('details')!;
    expect(disclosure.open).toBe(false);
    fireEvent.click(screen.getByText('Regola i secondi esatti'));
    expect(disclosure.open).toBe(true);
    fireEvent.change(screen.getByLabelText('Inizio (secondi)'), { target: { value: '25.25' } });
    expect(onChange).toHaveBeenLastCalledWith(25.25, 65.25);
  });
});
