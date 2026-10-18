import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Trash2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';

export default function SubmissionMoreActions({ senderId, busy, onDelete }: {
  senderId: string | null;
  busy: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const email = useQuery({
    queryKey: ['admin', 'submission-sender', senderId],
    enabled: open && Boolean(senderId),
    queryFn: async ({ signal }) => {
      if (!senderId) return null;
      const { data, error } = await supabase.from('profiles').select('email').eq('id', senderId).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data?.email?.trim() || null;
    },
    staleTime: 60000,
    retry: false,
  });

  return <details className="admin-more-actions" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary aria-label="Altre azioni">•••</summary>
    {open && <div className="admin-more-menu">
      <div className="admin-submission-sender">
        <span className="admin-submission-sender-label"><Mail size={14} />Email mittente</span>
        {!senderId ? <p className="admin-submission-message">Email non disponibile</p>
          : email.isPending ? <p className="admin-submission-message" role="status">Caricamento email…</p>
          : email.isError ? <div role="alert"><p className="admin-submission-message">Non riesco a caricare l’email.</p><button type="button" className="admin-sender-retry" disabled={email.isFetching} onClick={() => void email.refetch()}>Riprova</button></div>
          : <p className={email.data ? 'admin-submission-email' : 'admin-submission-message'}>{email.data || 'Email non disponibile'}</p>}
      </div>
      <button type="button" className="admin-more-delete" disabled={busy} onClick={onDelete}><Trash2 size={13} />Elimina</button>
    </div>}
  </details>;
}
