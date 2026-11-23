import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import '@/terms.css';

const documentLines = [
  '# Termini di Servizio e Informativa Privacy — UNSEEN',
  '**Versione:** 2026-11-23 · **Data di entrata in vigore:** 23 novembre 2026',
  '*Documento redatto in lingua italiana. In caso di traduzioni in altre lingue, la versione italiana costituisce l\'unico testo giuridicamente vincolante e di riferimento.*',
  '## Parte I — Termini di Servizio',
  '### 1. Identificazione del Titolare e Oggetto',
  'Il presente documento disciplina l\'accesso e l\'utilizzo della piattaforma digitale **UNSEEN** nonché le condizioni applicabili all\'invio di candidature artistiche (fotografie, brani musicali, estratti audio, copertine e relativi dati descrittivi) da parte degli utenti.',
  'Il gestore della piattaforma e Titolare del servizio è **Matteo De Bellis**, co-fondatore del progetto **UNSEEN**, operante a **Milano (MI), Italia**.',
  'Per qualsiasi comunicazione, segnalazione o richiesta di assistenza è disponibile l\'indirizzo email ufficiale: **unseenfoundation@gmail.com** *(eventuali recapiti postali completi per notifiche formali vengono forniti su richiesta motivata agli aventi diritto)*.',
  '### 2. Requisiti di Accesso, Età e Dichiarazioni dell\'Utente',
  'L\'invio di una candidatura su UNSEEN è consentito esclusivamente agli utenti che:',
  '- abbiano compiuto almeno **16 anni di età**;',
  '- effettuino l\'autenticazione tramite un account **Google** valido;',
  '- forniscano informazioni veritiere, accurate e aggiornate.',
  'L\'età dichiarata in fase di registrazione e invio ricade sotto la diretta responsabilità dell\'utente. Con l\'invio di qualsiasi materiale, l\'utente dichiara e garantisce sotto la propria esclusiva responsabilità:',
  '- di essere l\'unico autore e titolare dei diritti d\'autore e connessi sulle opere inviate (fotografia, brano musicale, registrazione audio, testo e copertina), oppure di aver ottenuto tutte le licenze, liberatorie e autorizzazioni necessarie dai rispettivi aventi diritto (inclusi eventuali produttori di basi musicali, co-autori, grafici o fotografi);',
  '- di aver acquisito il consenso esplicito di eventuali soggetti terzi ritratti o riconoscibili nelle fotografie o nelle copertine inviate;',
  '- che i contenuti trasmessi non violano leggi vigenti, diritti di proprietà intellettuale o industriale, diritti all\'immagine, alla riservatezza o alla reputazione di terzi, né contengono materiale illecito, diffamatorio, discriminatorio o lesivo della dignità umana.',
  'L\'utente si impegna a manlevare e tenere indenne UNSEEN e il suo Titolare da qualsiasi contestazione, pretesa risarcitoria, sanzione o spesa legale derivante dalla non veridicità delle dichiarazioni rese o dalla violazione di diritti di terzi connessa ai contenuti caricati.',
  '### 3. Revisione, Selezione e Partecipazione all\'Arena',
  'Ogni candidatura inviata viene esaminata dal team di UNSEEN, che decide a propria insindacabile discrezione, in conformità al regolamento dell\'edizione in corso, se ammettere o rifiutare l\'opera. L\'invio della candidatura non comporta alcun obbligo di selezione o pubblicazione né garantisce visibilità, permanenza o vittoria nella competizione.',
  'Accettando i presenti Termini al momento dell\'invio, l\'utente autorizza preventivamente UNSEEN, in caso di esito positivo della selezione, a pubblicare l\'opera nell\'area competitiva della piattaforma (*Arena*) e nei canali collegati all\'edizione, senza necessità di un\'ulteriore richiesta di consenso.',
  'L\'utente conserva integralmente la proprietà e la titolarità del copyright sulle proprie opere: l\'invio e la partecipazione a UNSEEN non comportano alcuna cessione definitiva dei diritti d\'autore o dei master.',
  '### 4. Licenza Limitata sui Contenuti Ammessi',
  'Limitatamente alle candidature selezionate e ammesse, l\'utente concede a UNSEEN una **licenza non esclusiva, gratuita, trasferibile ai soli fornitori tecnici necessari all\'erogazione del servizio e valida in tutto il mondo**, avente per oggetto il diritto di:',
  '- ospitare, archiviare, riprodurre e comunicare al pubblico l\'opera (fotografia, copertina e traccia/estratto audio) sul sito web e sui canali social ufficiali di UNSEEN;',
  '- effettuare gli adattamenti tecnici strettamente necessari alla pubblicazione e all\'anteprima sulle interfacce digitali (a titolo esemplificativo: ridimensionamento o compressione delle immagini, ottimizzazione dei formati e ritaglio di un estratto audio fino a **40 secondi**);',
  '- utilizzare l\'opera e i relativi crediti dell\'autore per promuovere la specifica edizione della competizione.',
  'La presente licenza non autorizza UNSEEN alla vendita diretta delle opere né al loro sfruttamento commerciale autonomo estraneo alla competizione. La licenza ha efficacia per l\'intera durata dell\'edizione di riferimento e per i **24 mesi successivi** alla sua conclusione, esclusivamente per finalità di archivio storico e documentazione dell\'edizione stessa sui canali UNSEEN.',
  'UNSEEN adotta misure tecniche ragionevoli per la pubblicazione dei contenuti, ma non può controllare né risponde di eventuali condivisioni, download o riutilizzi non autorizzati effettuati autonomamente da utenti terzi al di fuori della piattaforma, fermo restando l\'impegno a gestire tempestivamente le segnalazioni di violazione secondo la normativa applicabile.',
  '### 5. Moderazione, Sospensione e Rimozione',
  'UNSEEN si riserva il diritto di richiedere chiarimenti o documentazione integrativa (quali licenze di basi musicali o liberatorie), nonché di non ammettere, sospendere o rimuovere in qualsiasi momento una candidatura già pubblicata qualora ciò si renda necessario per il rispetto del regolamento, per ragioni di sicurezza, a seguito di reclami o contestazioni sui diritti di terzi, o per ottemperare a un obbligo di legge o a un ordine dell\'Autorità.',
  'Per segnalare presunte violazioni del copyright, richiedere la rimozione di contenuti o ricevere assistenza, è possibile scrivere a **unseenfoundation@gmail.com** indicando i riferimenti della candidatura e il motivo della richiesta.',
  '### 6. Limitazione di Responsabilità e Aggiornamento dei Termini',
  'Il servizio è fornito nello stato in cui si trova, nei limiti massimi consentiti dalla legge italiana ed europea vigente, senza esclusione dei diritti inderogabili spettanti agli utenti.',
  'UNSEEN si riserva la facoltà di aggiornare o modificare i presenti Termini e il regolamento delle edizioni future. Ogni aggiornamento sarà contraddistinto dalla relativa data e numero di versione; in caso di modifiche sostanziali, sarà richiesta una nuova accettazione espressa prima dell\'invio di ulteriori candidature.',
  '## Parte II — Informativa sul Trattamento dei Dati Personali (Art. 13 Regolamento UE 2016/679 – GDPR)',
  '### 1. Titolare del Trattamento',
  'Il Titolare del trattamento dei dati personali è **Matteo De Bellis**, co-fondatore del progetto **UNSEEN**, operante a **Milano (MI), Italia**.',
  'Email di contatto per questioni relative alla privacy: **unseenfoundation@gmail.com**.',
  '### 2. Tipologie di Dati Trattati',
  'Nell\'ambito dell\'utilizzo della piattaforma e dell\'invio delle candidature, UNSEEN tratta le seguenti categorie di dati:',
  '- **Dati di autenticazione:** indirizzo email, identificativo univoco dell\'account e nome/immagine profilo associati all\'account Google utilizzato per l\'accesso;',
  '- **Dati della candidatura:** nome d\'arte o nome dell\'autore, titolo dell\'opera, descrizione, username e link ai profili social (questi ultimi facoltativi);',
  '- **Contenuti multimediali:** file fotografici, copertine e file o estratti audio caricati dall\'utente;',
  '- **Dati tecnici e preferenze locali:** log di accesso e sicurezza, indirizzo IP, registro tecnico dell\'accettazione dei Termini e della presente Informativa (versione, data e ora), preferenze di lingua e tema grafico memorizzate nel browser, nonché statistiche aggregate e anonime di traffico.',
  '### 3. Finalità e Basi Giuridiche del Trattamento',
  'I dati personali sono trattati esclusivamente per le seguenti finalità e in forza delle corrispondenti basi giuridiche previste dall\'art. 6 del GDPR:',
  '1. **Gestione dell\'account, ricezione e valutazione delle candidature, pubblicazione delle opere ammesse e gestione delle votazioni:** il trattamento è necessario all\'esecuzione del servizio richiesto dall\'utente e delle relative misure precontrattuali (*art. 6, par. 1, lett. b GDPR*).',
  '2. **Sicurezza informatica, prevenzione di abusi, frodi nelle votazioni o violazioni di diritti di terzi, nonché tutela dei diritti del Titolare in sede stragiudiziale o giudiziaria:** il trattamento si fonda sul legittimo interesse del Titolare a garantire l\'integrità e la regolarità della piattaforma (*art. 6, par. 1, lett. f GDPR*).',
  '3. **Adempimento di obblighi legali, fiscali, regolamentari o di ordini delle Autorità competenti:** il trattamento è necessario per adempiere a un obbligo legale al quale è soggetto il Titolare (*art. 6, par. 1, lett. c GDPR*).',
  '*Nota:* La licenza d\'uso sui contenuti creativi disciplinata nella Parte I riguarda esclusivamente i diritti di proprietà intellettuale sulle opere inviate e non costituisce base giuridica per il trattamento dei dati personali.',
  '### 4. Natura del Conferimento, Modalità e Visibilità Pubblica',
  'Il conferimento dei dati di autenticazione, del titolo, dell\'autore, dei file dell\'opera e delle conferme di accettazione è necessario per inoltrare la candidatura: il mancato conferimento comporta l\'impossibilità di completare l\'invio. L\'inserimento di link ai profili social è invece facoltativo.',
  'Il trattamento avviene con strumenti elettronici e misure di sicurezza adeguate. La valutazione artistica delle candidature è svolta dal team di UNSEEN senza ricorrere a processi decisionali automatizzati né a profilazione con effetti giuridici sull\'utente.',
  'In caso di ammissione, l\'opera e i relativi dati identificativi pubblici indicati nella candidatura (nome dell\'autore/artista, titolo, descrizione ed eventuali link social inseriti) saranno resi visibili al pubblico sul sito web e sui canali ufficiali di UNSEEN. Si invita l\'utente a non includere nei campi testuali o nei file caricati dati personali non necessari o riferiti a soggetti terzi privi di consenso.',
  '### 5. Destinatari dei Dati, Fornitori Tecnici e Trasferimenti Extra-UE',
  'I dati personali non sono venduti né ceduti a terzi per finalità di marketing. Per il funzionamento tecnico della piattaforma, i dati possono essere trattati da fornitori selezionati, nominati Responsabili del trattamento ai sensi dell\'art. 28 GDPR:',
  '- **Google LLC** (autenticazione tramite Google Sign-In);',
  '- **Supabase Inc.** (gestione database applicativo e autenticazione);',
  '- **Cloudflare Inc. / Cloudflare R2** (archiviazione ed erogazione sicura dei file multimediali);',
  '- **Vercel Inc.** (hosting dell\'infrastruttura web e misurazione aggregata del traffico).',
  'Qualora alcuni di tali fornitori trattino dati al di fuori dello Spazio Economico Europeo (in particolare negli Stati Uniti), il trasferimento avviene nel rispetto del Capo V del GDPR, sulla base di decisioni di adeguatezza della Commissione Europea (quale l\'**EU–U.S. Data Privacy Framework**) oppure tramite l\'adozione delle **Clausole Contrattuali Tipo (SCC)** accompagnate da misure tecniche supplementari.',
  '### 6. Strumenti Locali nel Browser e Analisi del Traffico',
  'La piattaforma memorizza localmente nel browser dell\'utente (*Local Storage* / strumenti tecnici equivalenti) esclusivamente le preferenze di **lingua** e **tema grafico** selezionate, al fine di garantire la corretta visualizzazione dell\'interfaccia. Tali strumenti hanno natura strettamente tecnica e non richiedono consenso preventivo.',
  'Sui domini pubblici configurati è inoltre attivo **Vercel Analytics**, configurato per raccogliere metriche statistiche aggregate e prive di identificativi personali o cookie di profilazione di terze parti, al solo scopo di monitorare le prestazioni e il traffico generale del sito.',
  '### 7. Tempi di Conservazione dei Dati',
  'I dati personali sono conservati nel rispetto del principio di limitazione della conservazione secondo i seguenti termini:',
  '- **Candidature non ammesse:** i file multimediali e i dati specifici della candidatura vengono eliminati entro **90 giorni** dalla conclusione della fase di selezione;',
  '- **Candidature ammesse e pubblicate:** conservate per l\'intera durata dell\'edizione e fino a **24 mesi** successivi per finalità di archivio e documentazione dell\'edizione, fatta salva la rimozione anticipata su richiesta legittima dell\'interessato o per motivi di moderazione;',
  '- **Dati dell\'account:** conservati per tutto il periodo di attività dell\'account e cancellati su richiesta dell\'utente oppure decorsi **24 mesi** dall\'ultimo accesso;',
  '- **Registro tecnico delle accettazioni:** i log attestanti l\'accettazione dei Termini e dell\'Informativa (identificativo account, candidatura, versione del documento e marca temporale) sono conservati per **5 anni** esclusivamente per finalità di tutela legale e prova della conformità.',
  'Alcune copie tecniche possono permanere temporaneamente nei sistemi di backup cifrati per il tempo strettamente necessario al ciclo di sovrascrittura automatica.',
  '### 8. Diritti dell\'Interessato e Reclamo',
  'In qualità di interessato, l\'utente può esercitare in qualsiasi momento i diritti previsti dagli articoli 15–22 del GDPR, e in particolare il diritto di:',
  '- ottenere conferma dell\'esistenza di dati personali che lo riguardano e accedervi (**diritto di accesso**);',
  '- ottenere la rettifica dei dati inesatti o l\'integrazione di quelli incompleti (**diritto di rettifica**);',
  '- ottenere la cancellazione dei dati nei casi previsti dall\'art. 17 GDPR (**diritto all\'oblio**);',
  '- ottenere la limitazione del trattamento o opporsi allo stesso per motivi connessi alla propria situazione particolare (**diritti di limitazione e opposizione**);',
  '- ricevere i dati in un formato strutturato e leggibile da dispositivo automatico (**diritto alla portabilità**).',
  'Le richieste possono essere inviate gratuitamente all\'indirizzo **unseenfoundation@gmail.com** e saranno riscontrate entro i termini di legge (30 giorni). L\'utente ha inoltre il diritto di proporre reclamo all\'Autorità di controllo competente (**Garante per la protezione dei dati personali**, Piazza Venezia 11, 00187 Roma – [www.garanteprivacy.it](https://www.garanteprivacy.it)).',
];

function renderInline(text: string) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    }
    return part;
  });
}

export default function Terms() {
  const { t } = useI18n();
  let sectionId = 'condizioni';

  return (
    <main className="terms-page">
      <div className="terms-container">
        <Link to="/submit" className="terms-back"><ArrowLeft size={16} />{t('submit.title')}</Link>
        <header className="terms-header">
          <span className="terms-eyebrow"><ShieldCheck size={14} />UNSEEN / DOCUMENTI</span>
          <h1>Termini di servizio <span>e</span> privacy</h1>
        </header>
        <nav className="terms-index" aria-label="Indice dei documenti">
          <a href="#condizioni">Termini di servizio</a>
          <a href="#privacy">Informativa privacy</a>
        </nav>
        <article className="terms-document">
          {documentLines.map((line, index) => {
            if (line.startsWith('# ')) return null;
            if (line.startsWith('## Parte I')) {
              sectionId = 'condizioni';
              return <section key={index} id={sectionId}><h2>{line.slice(3)}</h2></section>;
            }
            if (line.startsWith('## Parte II')) {
              sectionId = 'privacy';
              return <section key={index} id={sectionId}><h2>{line.slice(3)}</h2></section>;
            }
            if (line.startsWith('### ')) return <h3 key={index} className="terms-section-heading">{renderInline(line.slice(4))}</h3>;
            if (line.startsWith('- ')) return <p key={index} className="terms-list-item">{renderInline(line.slice(2))}</p>;
            if (/^\d+\.\s/.test(line)) return <p key={index} className="terms-list-item">{renderInline(line)}</p>;
            if (line === '') return null;
            return <p key={index}>{renderInline(line)}</p>;
          })}
        </article>
      </div>
    </main>
  );
}
