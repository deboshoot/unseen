import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InviaOpera from './InviaOpera';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), navigate: vi.fn(), info: vi.fn() }));

vi.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_target, tag: string) => tag }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('sonner', () => ({ toast: { info: mocks.info, error: vi.fn(), success: vi.fn() } }));
vi.mock('@/supabaseClient', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/optimize-image', () => ({ optimizeImage: async (file: File) => file }));
vi.mock('@/lib/media-upload', () => ({ uploadSubmission: vi.fn() }));
vi.mock('@/lib/instagram', () => ({ getInstagramProfile: () => null }));

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('photo submissions', () => {
  it('requires login before opening the photo file picker', async () => {
    const { container } = render(<InviaOpera />);
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());

    expect(fireEvent.click(container.querySelector('input[type="file"]')!)).toBe(false);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/auth?redirect=%2Fsubmit'));
  });
});