# Verifica del progetto Supabase

Verifica del 7 ottobre 2026, tramite terminale e Management API. Progetto `mpqphroecgfwonclmkyb` (`Firstproject`), attivo e sano, regione `eu-west-1`.

La ricognizione iniziale è stata eseguita in sola lettura. Successivamente è stata applicata la migrazione `20261007193504`, `unseen_access_hardening`, descritta sotto. Lo script `scripts/audit-supabase.ps1` usa l'endpoint dedicato `/database/query/read-only`. I risultati completi e il ripristino della configurazione originale sono in `../debug.local/supabase-audit`, esclusi da Git. La credenziale è in `.env.supabase.local`, anch'esso escluso da Git. La fotografia della configurazione non sostituisce un backup completo dei dati.

## Dimensioni e contenuti prima della migrazione

| Voce | Valore osservato |
| --- | --- |
| Dimensione logica del database | 21.908.627 byte, circa 21,9 MB |
| Tabelle pubbliche, inclusi indici | 901.120 byte, circa 0,9 MB |
| Spazio usato sul filesystem del database | 330.469.376 byte; include componenti diversi dalle sole tabelle |
| Utenti Auth e profili | 534 per entrambi |
| Fotografie registrate | 67: 46 pending, 18 rejected, 3 accepted |
| Duelli fotografici | 17 |
| Voti duelli | 960 |
| Arene finali | 3 |
| Voti arene finali | 261 |
| Gallerie mensili registrate | 0 |
| File nello Storage | 127, tutti nel bucket `galleria` |
| Dimensione totale file | 206.202.749 byte, circa 206,2 MB |
| File più grande | 17.337.764 byte, circa 17,3 MB |
| Formati | 112 JPEG, 11 PNG, 4 WebP |

Il database è piccolo rispetto al volume dei media. La migrazione R2 deve concentrarsi su file, ottimizzazione e letture; non è necessario dividere adesso il database.

Sessanta oggetti, per circa 84,3 MB, non hanno un riferimento esatto nella colonna `opere.immagine_url` usando l'URL pubblico attuale del bucket. Sono candidati alla verifica, non file da eliminare automaticamente: potrebbero essere usati esternamente o avere riferimenti in formati diversi. Non è stato eliminato alcun oggetto.

Le tabelle `music_tracks`, `music_duels` e `music_votes` e i bucket musicali non esistono nel progetto remoto. La sezione musicale del codice locale ha quindi ancora bisogno della configurazione backend prevista. La nuova configurazione dovrebbe collegare i media a R2 senza creare prima una dipendenza permanente dallo Storage Supabase.

## Dashboard e amministratori

La dashboard locale consente l'accesso a `deboshoot@gmail.com`. Questo account esiste ed è confermato. Alcune vecchie policy SQL riconoscono invece l'UUID `b01c6977-ded3-43f7-98de-8dbfd45d07d7`; questo identifica un altro account esistente. Le policy nuove riconoscono l'email della dashboard. Non si tratta dello stesso utente.

L'utente ha indicato esplicitamente `deboshoot@gmail.com` come unico amministratore. La migrazione conserva l'altro account come utente normale, senza eliminarlo.

La soluzione applicata è un elenco di amministratori gestito dal server in `unseen_private.admin_accounts`, collegato a `auth.users.id`, e la funzione `is_unseen_admin()`. Il codice locale della dashboard ora usa questo controllo. Non è stato eseguito un deploy del frontend su Vercel. L'utente non può promuovere se stesso modificando il proprio profilo o i metadati.

L'amministratore deve mantenere tutte le operazioni della dashboard su opere, moderazione, galleria, duelli, finali, premi, profili e statistiche; la nuova area deve includere gestione dei brani e dei file R2. Il ruolo admin dell'app non implica esporre al browser credenziali di servizio o accesso SQL illimitato.

| Operazione | Pubblico | Utente autenticato | Admin dell'app |
| --- | --- | --- | --- |
| Leggere contenuti approvati | Sì | Sì | Sì, anche bozze e rifiutati |
| Leggere email e statistiche nominative | No | Solo eventuali dati propri previsti | Sì |
| Inviare contenuti | Percorso fotografico attuale da mantenere finché non viene sostituito | Propri contenuti, con quote nel nuovo upload | Sì |
| Approvare, rifiutare, gestire galleria | No | No | Sì |
| Creare e gestire duelli, finali e premi | No | No | Sì |
| Votare | No | Solo tramite RPC con identità verificata e vincolo unico | Stesso percorso di voto; eventuali correzioni amministrative separate |
| Pubblicare o eliminare file R2 | No | Solo nei casi previsti dalla propria candidatura | API server con controllo admin |

## Problemi rilevati e corretti

**Policy vecchie e nuove si sommano.** Le policy permissive PostgreSQL sono combinate con OR: una condizione `true` rimasta attiva rende inefficace una nuova policy più restrittiva sulla stessa operazione. [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html).

- `profiles`: la policy `Lettura pubblica profili` espone tutte le righe a `anon` e `authenticated`, incluso il campo email. La dashboard admin deve continuare a leggerle; il pubblico non ne ha bisogno.
- `opere`: `Enable read access` espone anche pending e rejected. `Enable insert for anonymous` consente inserimenti senza i controlli su `status` e `is_in_gallery` aggiunti nelle policy più recenti. La revisione deve mantenere l'invio pubblico attuale senza consentire auto-approvazione.
- `votes`: `Solo utenti registrati votano` usa `with check (true)`, mentre l'altra policy controlla `user_id = auth.uid()`. Sono entrambe permissive, quindi la seconda non vincola gli inserimenti. Il frontend usa già `cast_vote`: bloccare gli inserimenti ordinari diretti e lasciare la RPC come unico percorso del voto.
- `storage.objects`: `Consenti caricamento pubblico 15ewtwf_0` ammette insert senza vincolo di bucket. Il bucket `galleria` non ha `file_size_limit` né `allowed_mime_types`. Il controllo frontend da solo non impone questi limiti sul server.
- `duels`: la policy pubblica `duelli` usa `true`, quindi espone anche record futuri o inattivi nonostante una policy aggiuntiva per i duelli attivi.
- Le RPC di voto risultano eseguibili anche da anon. Il corpo verifica l'autenticazione, quindi il warning dell'advisor da solo non prova una possibilità di voto anonimo; i permessi vanno comunque allineati al percorso effettivo.
- `cast_vote` remoto non controlla `start_at` e non rifiuta esplicitamente un parametro slot NULL. La riscrittura deve verificare inizio/fine/slot e confermare il voto e il contatore nella stessa transazione.

## Programmazione e prestazioni

Il job `activate-scheduled-duel` esiste già ed è attivo ogni minuto. La chiamata della pagina pubblica a `activate_scheduled_duel` può essere rimossa dopo la verifica del comportamento alla partenza, preservando il controllo dalla dashboard e il job. Non serve attivare un secondo scheduler.

Esiste un trigger attivo `on_duel_activated`, BEFORE INSERT OR UPDATE su `duels`, che richiama `start_duel_logic`. Quando attiva un duello può scegliere opere casuali e sovrascrivere partecipanti, contatori e durata a 24 ore. Questo può interferire con le scelte manuali della dashboard: testare e correggere il comportamento preservando la programmazione impostata dall'admin.

Il vincolo unico di voto esiste già, insieme a un secondo indice unico identico. L'advisor conferma l'indice duplicato su `votes`. Mantenere il vincolo e rimuovere solo l'indice ridondante quando si applicherà la migrazione verificata.

L'advisor segnala inoltre 13 foreign key senza indice, 12 avvisi relativi alle chiamate Auth nelle policy e 16 avvisi per policy permissive multiple. Non aggiungere indici indiscriminatamente: partire da `votes.duel_id`, elenchi per stato delle opere e query realmente usate, misurandone il piano.

La dashboard scarica attualmente tutti i profili e tutti i voti e costruisce le statistiche nel browser. Con la crescita serviranno statistiche aggregate sul server e liste paginate mantenendo i dati dettagliati accessibili all'admin.

## Risultato della migrazione e verifica

Sono state sostituite le policy obsolete, preservando tutte le operazioni amministrative sulle tabelle dell'app. I profili sono leggibili dal proprietario e dall'admin, non dal pubblico. Le opere non pubblicate sono visibili all'admin; gli invii fotografici attuali restano consentiti soltanto in stato pending. I voti ordinari passano dalle RPC, con controllo di slot, inizio/fine e unicità; l'admin mantiene accesso ai dettagli.

Il bucket fotografico ora impone 5 MB per nuovo file e MIME JPG/PNG/WebP. Gli oggetti esistenti, anche più grandi, non sono stati eliminati o convertiti. Il bucket rimane pubblico per compatibilità: nascondere i record pending con RLS non rende privati gli URL dei file già pubblici. Per i nuovi invii riservati servirà il bucket privato R2.

Il trigger dei duelli ora preserva partecipanti e orari forniti dalla dashboard e assegna valori predefiniti solo quando mancano. Il job cron esistente resta attivo; la RPC di attivazione è riservata all'admin e al job. La chiamata dalla pagina pubblica è stata rimossa nel codice locale, pronta per il prossimo deploy.

Sono stati aggiunti gli indici per voti per duello e moderazione per stato/data, mantenendo il vincolo unico ed eliminando l'indice unico duplicato.

Prima del commit sono state provate le modifiche in una transazione annullata. Una seconda transazione annullata ha verificato che il ripristino ricrea policy e definizioni delle funzioni originali. Dopo il commit gli stessi scenari di accesso sono stati verificati direttamente sulla configurazione applicata, senza riapplicare la migrazione; tutti i dati temporanei sono stati annullati.

Le prove coprono visitatore, utente normale, vecchio account admin e admin scelto; lettura dei profili, auto-promozione vietata, invio pending, moderazione, programmazione e modifica dei duelli, finali, premi, galleria, voto diretto vietato, RPC, doppio voto, slot NULL, voto anticipato/scaduto e job cron. Sono passati anche 15 test frontend, TypeScript, lint dei file modificati e build. Non è stata effettuata una sessione browser dell'admin reale: il controllo dei permessi è stato eseguito in SQL con ruoli PostgREST e identità corrispondenti.

Una lettura dopo l'applicazione conferma gli stessi conteggi di utenti, profili, opere, duelli, voti, finali e file riportati sopra. La configurazione Auth non è stata modificata. L'advisor segnala ancora le funzioni SECURITY DEFINER e alcune policy sovrapposte: i percorsi admin/pubblici sono intenzionali e sono stati verificati con i test; non si afferma di avere azzerato tutti gli avvisi. Gli avvisi su search_path e indice duplicato sono risolti.

Il primo endpoint di applicazione migrazioni non rispondeva normalmente da Windows PowerShell. Il tentativo è stato interrotto dopo aver verificato che non fosse applicato; il commit è stato eseguito tramite l'endpoint SQL e lo storico è stato registrato e verificato successivamente. Gli script di commit ora usano Node con timeout espliciti.

## Integrazione R2 applicata

Sono applicati lo schema musicale, `media_assets`, sessioni upload, quote atomiche, blocchi e coda di eliminazione. La funzione `r2-media` verifica i JWT Supabase e il controllo admin centralizzato, firma upload diretti e gestisce la pubblicazione. R2 conserva file privati e approvati in due bucket; il Worker serve solo quelli approvati con CORS e Range, e attiva la pulizia ogni ora.

Le prove reali hanno verificato upload fotografico e musicale, dimensioni firmate, replay della conferma, riservatezza dei pending, pubblicazione/rifiuto, lettura audio parziale, permessi admin e doppio voto. Le fixture sono state eliminate: restano 67 opere e 534 profili; nessun brano o asset di test. Sono passati 22 test frontend, TypeScript, lint mirato e build. La configurazione Auth permette anche i redirect dell'anteprima locale.

I 127 file precedenti restano in Supabase e conservano i propri URL. Il deploy GitHub → Vercel è riuscito: il frontend aggiornato è disponibile dal dominio originale `https://unseen-virid.vercel.app`. Il link Cloudflare porta allo stesso sito tramite redirect 308, mantenendo percorsi e query. Sono verificati routing, chiave pubblica Supabase effettiva della build Vercel, CORS, redirect di login e flusso R2.

La prima chiusura dei vecchi upload era stata prematura. `unseen_legacy_upload_compatibility` li aveva ripristinati temporaneamente; dopo la verifica di entrambi gli indirizzi è stato applicato `unseen_r2_cutover_after_redirect`, che li ha chiusi definitivamente senza eliminare i file precedenti. Il cutover ora impone la verifica pubblica prima di cambiare le policy. Gli upload nuovi dell'app usano R2. Dettagli in [R2.md](./R2.md).

Restano da realizzare il selettore degli estratti audio, miniature e statistiche aggregate della dashboard fotografica. La dashboard musicale usa già liste paginate. Non è stata eseguita una migrazione dei file precedenti.
