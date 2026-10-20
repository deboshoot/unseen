import { describe, expect, it } from 'vitest';
import { isAdminDestination, loginDestination } from './auth-redirect';

describe('OAuth return destinations', () => {
  it.each([null, '', 'https://other.example/admin', '//other.example/admin', '/\\other.example/admin', '/auth/callback', '/missing', '/%zz', '/%0aadmin'])('rejects unsafe or unknown destination %s', value => {
    expect(loginDestination(value)).toBe('/arena');
  });
  it('preserves the public vote destination and its query', () => {
    expect(loginDestination('/arena/fotografica?duelId=match-1')).toBe('/arena/fotografica?duelId=match-1');
  });
  it.each(['/ADMIN/', '/%61dmin', '/arena/../admin'])('normalizes private routes before authorization: %s', value => {
    const target = loginDestination(value);
    expect(target).toBe('/admin');
    expect(isAdminDestination(target)).toBe(true);
  });
  it('requires authorization for the music demo but not the public arena', () => {
    expect(isAdminDestination(loginDestination('/arena/musicale/demo?preview=1'))).toBe(true);
    expect(isAdminDestination('/arena/musicale')).toBe(false);
  });
});
