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
