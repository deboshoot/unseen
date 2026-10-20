import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Auth from './Auth';

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { auth: { signInWithOAuth: mocks.signIn } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
beforeEach(() => { vi.resetAllMocks(); mocks.signIn.mockResolvedValue({ error: null }); });
afterEach(cleanup);

describe('Google login destination', () => {
  it.each(['/admin', '/arena/fotografica?duelId=match-1'])('returns through the authorization callback for %s', async destination => {
    render(<MemoryRouter initialEntries={[`/auth?${new URLSearchParams({ redirect: destination })}`]}><Auth /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /auth.signInGoogle/ }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledOnce());
    const options = mocks.signIn.mock.calls[0][0];
    const callback = new URL(options.options.redirectTo);
    expect(options.provider).toBe('google');
    expect(callback.origin).toBe(window.location.origin);
    expect(callback.pathname).toBe('/auth/callback');
    expect(callback.searchParams.get('redirect')).toBe(destination);
  });
});
