const routes = new Set([
  '/', '/arena', '/arena/fotografica', '/arena/musicale', '/campionato',
  '/archivio/arena/fotografica', '/archivio/arena/musicale', '/gallery',
  '/regolamento', '/submit', '/admin', '/arena/musicale/demo',
]);

/** Keep OAuth return destinations on a known application route. */
export function loginDestination(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/arena';
  if ([...value].some(character => character === '\\' || character.charCodeAt(0) < 32)) return '/arena';
  try {
    const url = new URL(value, 'https://unseen.invalid');
    const pathname = decodeURIComponent(url.pathname).toLowerCase().replace(/\/+$/, '') || '/';
    if (url.origin !== 'https://unseen.invalid' || !routes.has(pathname)) return '/arena';
    return pathname + url.search + url.hash;
  } catch { return '/arena'; }
}

export function isAdminDestination(destination: string): boolean {
  const { pathname } = new URL(destination, 'https://unseen.invalid');
  return pathname === '/admin' || pathname === '/arena/musicale/demo';
}
