import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { supabase } from '@/supabaseClient';

type Access = 'checking' | 'allowed' | 'login' | 'denied';

export default function AdminPreviewGate({ path, fallbackPath, children }: {
  path: string;
  fallbackPath: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { search, hash } = useLocation();
  const [access, setAccess] = useState<Access>('checking');
  const [revision, setRevision] = useState(0);
  const validation = useRef(0);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      validation.current++;
      setAccess(session ? 'checking' : 'login');
      setRevision(value => value + 1);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    const version = ++validation.current;
    const isCurrent = () => mounted && version === validation.current;
    const update = (next: Access) => { if (isCurrent()) setAccess(next); };
    update('checking');
    const timeout = window.setTimeout(() => {
      if (!isCurrent()) return;
      setAccess('denied');
      validation.current++;
    }, 10000);
    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isCurrent()) return;
        if (error) throw error;
        if (!session) { update('login'); return; }
        const { data: admin, error: roleError } = await supabase.rpc('is_unseen_admin');
        update(!roleError && admin === true ? 'allowed' : 'denied');
      } catch { update('denied'); }
      finally { window.clearTimeout(timeout); }
    })();
    return () => { mounted = false; window.clearTimeout(timeout); };
  }, [revision]);

  if (access === 'login') return <Navigate replace to={`/auth?${new URLSearchParams({ redirect: path + search + hash })}`} />;
  if (access === 'denied') return <Navigate replace to={fallbackPath} />;
  const waiting = <main className="min-h-screen flex items-center justify-center"><p role="status">{t('auth.loading')}</p></main>;
  if (access === 'checking') return waiting;
  return <Suspense fallback={waiting}>{children}</Suspense>;
}
