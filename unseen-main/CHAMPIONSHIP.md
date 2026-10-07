# Campionati UNSEEN

La modalità principale è un campionato indipendente per fotografia e musica. Gli amministratori `deboshoot@gmail.com` e `irushadissanayake2@gmail.com` scelgono 16 opere approvate di partecipanti diversi, assegnano le posizioni da 1 a 16 e scelgono l'inizio. Il nome è facoltativo. Non viene avviato nessun campionato di prova in produzione.

## Calendario e regole

- Duelli 1–8: ottavi; 9–12: quarti; 13–14: semifinali; 15: finale.
- Ogni duello occupa esattamente 48 ore; si gioca una sfida alla volta per categoria.
- Fine del campionato = inizio + 720 ore. Le durate restano esatte anche al cambio dell'ora. La programmazione nella dashboard usa sempre Europa/Roma, anche da un dispositivo all'estero; gli orari inesistenti al cambio dell'ora vengono rifiutati.
- Un voto per account autenticato per duello. Nessuna votazione fuori finestra, nessuna scrittura diretta dei punteggi dal browser.
- I conteggi restano segreti fino alla risoluzione del duello. Il pubblico riceve valori nulli per le sfide non concluse; la lettura e i filtri REST sui contatori sono vietati. Gli admin vedono i conteggi e il registro nella dashboard. Anche un admin che apre la pagina pubblica vede la stessa presentazione senza punteggi in corso.
- Più voti = qualificazione; in parità, anche senza voti, passa il numero iniziale più basso. Il risultato registra `tie_break=seed` e il tabellone lo segnala.
- Il calendario viene generato integralmente all'avvio. Tutti i passaggi sono automatici; non occorre scegliere le opere dei turni successivi.

## Database e automatismo

`championships` conserva categoria, calendario e stato. `championship_entries` conserva posizione, collegamento all'opera originale e una copia dei dati pubblici per il tabellone. `championship_matches` conserva le 15 sfide e i punteggi; `championship_votes` conserva il voto unico del singolo account. I file restano su R2 e sono richiamati dai rispettivi URL; nessuna copia nello Storage Supabase.

`create_championship` è riservata all'admin: verifica 16 opere approvate distinte, identità dei partecipanti e una sola competizione aperta per categoria. `cast_championship_vote` blocca prima il campionato e poi il duello e ricontrolla l'orologio del server dopo i blocchi. Inserimento voto e incremento contatore avvengono nella stessa transazione. Le identità dei votanti sono accessibili solo al proprietario e all'admin; il tabellone pubblico restituisce i conteggi soltanto dei duelli risolti e i propri voti.

Il job Supabase `advance-championships` controlla le scadenze ogni minuto; `get_championship` recupera inoltre eventuali passaggi scaduti quando viene caricata una pagina. Non dipende da Vercel, da un browser aperto o da un cron a pagamento. La chiusura dei voti è al timestamp esatto; l'elaborazione periodica del risultato può arrivare nel minuto successivo. I passaggi saltati vengono recuperati in ordine, senza spostare la fine del campionato.

Le pagine aggiornano i dati ogni 60 secondi in primo piano, al ritorno alla scheda e alla scadenza del duello. L'orologio visualizzato è sincronizzato con il server. Il tabellone è scorrevole sui telefoni, mostra le frecce tra turni e oscura con una X le opere eliminate.

`cancel_championship` ferma la gara mantenendo storico e voti; sblocca la creazione della successiva. Per rifiutare o eliminare un'opera in un campionato aperto occorre prima annullare quel campionato. Le modifiche ai metadati originali non cambiano le posizioni o il risultato già pubblicati.

`championship_gallery` pubblica automaticamente un solo vincitore per campionato, fotografico o musicale, alla risoluzione della finale. Un trigger verifica la finale e usa il mese di **inizio** in Europa/Roma, anche quando la finale termina nel mese successivo. Ripetere lo scheduler non duplica la pubblicazione. I vincitori esposti non possono essere eliminati o rifiutati, così la galleria mantiene disponibili i file su R2. Le raccolte precedenti in `gallery_months` sono conservate nella galleria pubblica.

## Dashboard

- **Campionati**: 16 blocchi cliccabili negli ottavi, selezione tra opere approvate con ricerca e pagine da 40, sostituzione/rimozione/spostamento delle posizioni. Le bozze di entrambe le categorie restano nella scheda del browser, separate per account admin. Dopo la programmazione: tabellone, registro voti (pagine da 100) e calendario completo. La fine e il mese della galleria sono mostrati prima dell'avvio.
- **Contenuti**: fotografie/brani, da revisionare/approvati/rifiutati, ricerca e pagine da 20. Anteprime dei file R2 privati, approvazione/rifiuto e azioni di eliminazione secondarie.
- **Galleria**: vincitori pubblicati automaticamente, senza assegnazioni manuali dei premi.
- **Community**: utenti e votanti, con pagine da 100. Il riepilogo usa conteggi dal server senza scaricare tutti gli utenti o tutte le opere.

I controlli e i dati admin sono caricati solo dopo la verifica del ruolo sul server. L'uscita dall'account svuota la cache admin. I vecchi pannelli di arena e arena finale non fanno parte della nuova dashboard.

`get_admin_community` include i voti nuovi e quelli delle precedenti modalità, con pagine da 100 account/votanti. Il registro del singolo duello è disponibile nella scheda Campionati.

## Migrazione, verifica e pubblicazione

```powershell
node scripts/setup-control-room.mjs --rehearse
node scripts/setup-control-room.mjs --apply
node scripts/setup-control-room.mjs --verify
npm.cmd run test
npx.cmd tsc --noEmit -p tsconfig.app.json
npm.cmd run build
```

Lo script applica soltanto SQL già verificato in una transazione annullata e registra la migrazione. I test coprono calendario, tabellone, parità, voti unici, finestre temporali, ruoli, recupero dei turni, annullamento e categorie indipendenti. I duelli quotidiani, le precedenti finali e i relativi voti non vengono eliminati; il vecchio scheduler e gli endpoint di voto precedenti sono disattivati. I vecchi link con `duelId` rimandano all'archivio, con voto disabilitato.

Pubblicazione: push su `main` → Vercel. URL pubblico: https://unseen-virid.vercel.app/campionato. Dashboard: https://unseen-virid.vercel.app/admin → Campionati.
