import type { AnchorHTMLAttributes } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InviaOpera from './InviaOpera';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), navigate: vi.fn(), info: vi.fn(), error: vi.fn(), upload: vi.fn() }));

vi.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_target, tag: string) => tag }) }));
vi.mock('react-router-dom', () => ({
  Link: ({ to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => <a href={to} {...props} />,
  useNavigate: () => mocks.navigate,
}));
vi.mock('sonner', () => ({ toast: { info: mocks.info, error: mocks.error, success: vi.fn() } }));
vi.mock('@/supabaseClient', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ t: (key: string) => key, locale: 'it' }) }));
vi.mock('@/lib/optimize-image', () => ({ optimizeImage: async (file: File) => file }));
vi.mock('@/lib/media-upload', () => ({ uploadSubmission: mocks.upload }));
vi.mock('@/lib/instagram', () => ({ getInstagramProfile: () => null }));

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('photo submissions', () => {
  it('requires login before opening the photo file picker', async () => {
    const { container } = render(<InviaOpera />);
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());

    expect(fireEvent.click(container.querySelector('input[type="file"]')!)).toBe(false);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/auth?redirect=%2Fsubmit'));
  });

  it('requires age and rights consent before uploading a photo', async () => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(file: File) { return `blob:preview/${file.name}`; }
      static revokeObjectURL = vi.fn();
    });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    mocks.upload.mockResolvedValue({ id: 'submission-1' });
    const { container } = render(<InviaOpera />);
    const inputs = container.querySelectorAll('input[type="text"]');
    fireEvent.change(inputs[0], { target: { value: 'Titolo' } });
    fireEvent.change(inputs[1], { target: { value: 'Autore' } });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
    });

    const form = container.querySelector('form')!;
    const consent = screen.getByRole('checkbox', { name: /più di 16 anni/ });
    const terms = screen.getByRole('checkbox', { name: /Termini di servizio/ });
    expect(consent).toBeRequired();
    expect(consent).toHaveAccessibleName(/più di 16 anni/);
    expect(terms).toBeRequired();
    expect(screen.getByRole('link', { name: /Leggi i Termini di servizio/ })).toHaveAttribute('href', '/termini');

    fireEvent.submit(form);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('più di 16 anni'));

    fireEvent.click(consent);
    fireEvent.submit(form);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenLastCalledWith(expect.stringContaining('Termini di servizio'));

    fireEvent.click(terms);
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
  });
});