# Ripristino dopo una restrizione Supabase

Il 7 novembre 2026 le API pubbliche di entrambe le arene e i download Storage
rispondevano HTTP 402 con `exceed_cached_egress_quota`. Il database era sano
(circa 31 MB), con 351 voti registrati e scheduler dei campionati attivo.
Il limite riguarda il traffico già servito, non lo spazio occupato dalla cache.

## Vincolo senza nuovi costi

L'utente ha escluso upgrade e nuovi costi. Non modificare piano o tetto di spesa.
La documentazione Supabase indica lo sblocco al rinnovo del ciclo oppure con un
upgrade/rimozione dello spend cap. Cancellare dati o svuotare cache non riduce
retroattivamente il traffico. La data del prossimo rinnovo deve essere verificata
nel pannello dell'organizzazione; la credenziale locale non accede alla fatturazione.

Fonte: https://supabase.com/docs/guides/platform/manage-your-usage/egress

## Controlli e salvataggio

```powershell
node scripts/check-service-availability.mjs --backup
```

Il comando verifica entrambe le API pubbliche, la dimensione del database,
il numero dei voti, lo scheduler e i riferimenti alle foto precedenti.
Con `--backup` salva anche dati, tabelloni, voti e metadati dei media in
`../debug.local/supabase-egress/`, esclusa da Git. Non scarica i file originali.
Restituisce codice 2 finché almeno un'API è indisponibile.

Il frontend distingue la restrizione dagli altri errori, spiega che il voto non è
disponibile e interrompe retry, polling e aggiornamenti al focus o alla riconnessione
per quella richiesta. Il pulsante Riprova consente un controllo esplicito; una
risposta valida ripristina il polling normale. Il blocco non viene aggirato.

## Traffico dei file da ridurre dopo lo sblocco

67 fotografie precedenti hanno ancora URL Supabase Storage; 15 immagini del
tabellone fotografico usano quegli URL. Le copertine e gli audio musicali usano
già R2. Anche gli originali precedenti rispondono 402, quindi il trasferimento
non è eseguibile durante la restrizione.

Dopo lo sblocco, trasferire i file su R2 verificando byte e checksum prima di
aggiornare i riferimenti. Approvati nel bucket pubblico; pending e rifiutati nel
bucket privato. Registrare ogni file in `media_assets` e collegarlo a `opere` per
mantenere anteprime, moderazione e pulizia. Aggiornare anche `image_url` nelle
copie di `championship_entries`, conservando identificativi, posizioni e risultati.
Conservare gli originali finché la verifica è completata.

Lo scheduler continua a rispettare le scadenze anche durante il blocco delle API.
Una sospensione o riprogrammazione del torneo richiede una decisione esplicita:
questo intervento non ha modificato calendario, voti o risultati.

## Riduzione del traffico applicata il 7 novembre

Il Worker `https://unseen-data.unseen-deboshoot.workers.dev` conserva per 15
secondi le letture anonime di `get_championship` e per cinque minuti le letture
pubbliche della galleria e del relativo archivio. Usa esclusivamente la chiave
pubblica e le normali API Supabase, con RLS anonimo. Non usa la Management API
per servire il sito e non rimuove la restrizione per quota.

Le risposte dei campionati scadono entro il prossimo inizio/fine duello; il tempo
server viene aggiornato quando una risposta viene letta dalla cache. Richieste
autenticate, voti, login, upload e amministrazione restano diretti. Il Worker
rifiuta token e cookie e non conserva errori, voti personali o conteggi live.
Le pagine della galleria e il totale dei risultati hanno chiavi di cache distinte.
La galleria non effettua più polling ogni minuto e ferma i retry su HTTP 402.

```text
node scripts/deploy-public-data.mjs
node scripts/verify-public-data.mjs
node scripts/migrate-legacy-media.mjs
node scripts/migrate-legacy-media.mjs --rehearse
node scripts/migrate-legacy-media.mjs --apply
```

Il trasferimento prevede 67 foto: 41 approvate pubbliche, 26 private e 15
riferimenti nei tabelloni. Il piano e i verbali restano in
`../debug.local/legacy-media/`, esclusa da Git. `--rehearse` verifica in transazioni
annullate sia una foto privata sia una foto pubblica collegata al tabellone.
`--apply` scarica dal normale endpoint Storage autenticato, copia su R2 e controlla
byte, SHA-256, MIME e accessibilità pubblica/privata prima di aggiornare dati e
tabelloni nella stessa transazione. Blocca la riga e controlla che la moderazione
non sia cambiata nel frattempo. Gli originali non vengono cancellati. Il comando
è riprendibile; gli elementi completati non vengono trasferiti nuovamente.

Durante l'intervento il primo download ha risposto HTTP 402: nessuna foto è stata
trasferita e nessun URL è stato modificato. Ripetere `--apply` dopo lo sblocco,
poi controllare `legacy_photos=0` e `legacy_bracket_images=0` con il controllo
disponibilità. Finché il trasferimento non è eseguito, le vecchie foto dipendono
ancora da Supabase e rimangono la principale causa da eliminare. Nessun sistema
di cache o storage offre consumi illimitati: verificare le quote dei due servizi.
