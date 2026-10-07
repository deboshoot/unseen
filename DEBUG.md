# Anteprima e debug UNSEEN

Apri questa cartella in VS Code e premi F5 con la configurazione **UNSEEN: avvia e debug**. Il server parte su http://127.0.0.1:8080 e il browser si apre con il debugger collegato. Puoi mettere breakpoint nei file di `unseen-main/src`.

Per la sola anteprima, fai doppio clic su `avvia-debug.cmd`. Mantieni aperto il terminale; salvataggi a componenti e stili aggiornano automaticamente la pagina. Ctrl+C ferma il server. Il primo avvio installa le dipendenze se necessario.

Serve Node.js LTS. Su questo computer lo script usa anche il runtime locale in `%LOCALAPPDATA%/UnseenTools`.

Su questo computer `unseen-main/.env.development.local` è collegato al progetto Supabase reale: login, voti e upload agiscono sui dati reali. Gli upload nuovi usano R2; vedi `unseen-main/R2.md`. La precedente configurazione dimostrativa è conservata nel file locale `.env.demo.local`.

Su un nuovo computer usa `unseen-main/.env.example` come riferimento e riavvia il server dopo aver inserito URL e chiave pubblica in `.env.development.local`. Non inserire chiavi `service_role` o segreti R2 nelle variabili `VITE_*`.

La versione aggiornata online è su https://unseen-virid.vercel.app, aggiornata dal repository GitHub. Anche il link Cloudflare porta automaticamente a questo sito, mantenendo la pagina richiesta. I nuovi invii usano R2 su entrambi i percorsi di accesso.
