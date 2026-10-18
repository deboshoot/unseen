# Anteprima e debug UNSEEN

Apri questa cartella in VS Code e premi F5 con la configurazione **UNSEEN: avvia e debug**. Il server parte su http://127.0.0.1:8080 e il browser si apre con il debugger collegato. Puoi mettere breakpoint nei file di `unseen-main/src`.

Per la sola anteprima, fai doppio clic su `avvia-debug.cmd`. Mantieni aperto il terminale; salvataggi a componenti e stili aggiornano automaticamente la pagina. Ctrl+C ferma il server. Il primo avvio installa le dipendenze se necessario.

Serve Node.js LTS. Su questo computer lo script usa anche il runtime locale in `%LOCALAPPDATA%/UnseenTools`.

Su questo computer `unseen-main/.env.development.local` è collegato al progetto Supabase reale: login, voti e upload agiscono sui dati reali. Gli upload nuovi usano R2; vedi `unseen-main/R2.md`. La precedente configurazione dimostrativa è conservata nel file locale `.env.demo.local`.

Su un nuovo computer usa `unseen-main/.env.example` come riferimento e riavvia il server dopo aver inserito URL e chiave pubblica in `.env.development.local`. Non inserire chiavi `service_role` o segreti R2 nelle variabili `VITE_*`.

La versione aggiornata online è su https://unseen-virid.vercel.app, aggiornata dal repository GitHub. Anche il link Cloudflare porta automaticamente a questo sito, mantenendo la pagina richiesta. I nuovi invii usano R2 su entrambi i percorsi di accesso.

## Demo dell'arena musicale riservata agli admin

La demo è disponibile su https://unseen-virid.vercel.app/arena/musicale/demo solo per gli account amministratore già autorizzati dal progetto. Si apre anche dal collegamento «Demo musicale» nello studio admin. Il ruolo viene verificato con la funzione server `is_unseen_admin` prima di caricare l'anteprima. Chi non ha effettuato l'accesso viene indirizzato al login; gli utenti senza ruolo admin tornano all'arena pubblica. Durante la verifica o in caso di errore la demo non viene mostrata. Un cambio di account o la disconnessione ne revoca subito la visualizzazione.

Per lavorare alla grafica dal proprio computer, scarica la repository e avvia l'anteprima come descritto sopra, poi apri http://127.0.0.1:8080/arena/musicale/demo. Per vedere l'anteprima bisogna accedere con un account admin anche in locale. Le modifiche si fanno sui file della propria copia del progetto.

- `unseen-main/src/pages/AdminMusicArenaDemo.tsx`: verifica dell'accesso amministratore.
- `unseen-main/src/pages/MusicArenaDemo.tsx`: struttura della demo.
- `unseen-main/src/music-demo.css`: stile specifico della demo.
- `unseen-main/src/i18n/music-demo-copy.ts`: avvisi e testi nelle lingue disponibili.
- `unseen-main/src/components/MusicRecord.tsx` e `unseen-main/src/music.css`: dischi, animazioni e controlli condivisi anche con l'arena ufficiale e l'anteprima di invio.

La demo usa artisti immaginari e loop originali già inclusi nel progetto. La preferenza di prova resta solo nella pagina e si azzera quando la si ricarica; non legge o scrive voti nel database. L'accesso alla pagina richiede comunque un account amministratore. Gli eventuali link di invio del brano e del campionato portano alle rispettive pagine reali.
