import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Camera, Check, Copyright, Flag, Gavel, ShieldCheck, Trophy, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const articles = [
  {
    number: "01",
    title: "Oggetto della piattaforma",
    icon: Camera,
    content: (
      <p>
        <strong>Unseen</strong> è una piattaforma digitale aperta a fotografi amatoriali e professionisti. Il servizio si basa su duelli fotografici 1v1 a eliminazione diretta, con votazione della community registrata, organizzati in fasi mensili.
      </p>
    ),
  },
  {
    number: "02",
    title: "Candidature e requisiti",
    icon: Flag,
    content: (
      <div className="space-y-4">
        <Rule label="Partecipazione gratuita">La partecipazione e il caricamento delle fotografie sono completamente gratuiti.</Rule>
        <Rule label="Una foto al mese">Le candidature sono aperte 365 giorni all'anno. Ogni fotografo può partecipare a più mesi o stagioni, con il limite di una sola foto al mese.</Rule>
        <Rule label="Specifiche tecniche">Il file della fotografia caricata non deve superare la dimensione massima di 5 MB.</Rule>
        <Rule label="Proprietà intellettuale">L'utente garantisce di essere l'unico autore e titolare dei diritti d'autore sulla fotografia inviata.</Rule>
        <Rule label="Contenuti vietati">Non è consentito caricare immagini offensive, diffamatorie, pornografiche o che violino la privacy e i diritti di terzi.</Rule>
      </div>
    ),
  },
  {
    number: "03",
    title: "La fase dei duelli",
    icon: Gavel,
    eyebrow: "Dal 15 alla fine del mese",
    content: (
      <div className="space-y-4">
        <Rule label="Struttura 1v1">Dal giorno 15 di ogni mese fino all'ultimo giorno, le fotografie ammesse competono in duelli diretti tra due opere della durata di 24 ore.</Rule>
        <Rule label="Passaggio del turno">Alla scadenza, la fotografia con più voti passa al duello successivo. L'opera sconfitta viene eliminata dal tabellone principale.</Rule>
        <Rule label="Votazione">Può votare chi è regolarmente registrato alla piattaforma Unseen. La registrazione è gratuita e immediata.</Rule>
      </div>
    ),
  },
  {
    number: "04",
    title: "I tre vincitori della stagione",
    icon: Trophy,
    content: (
      <div className="space-y-5">
        <Winner number="01" title="Vincitore dell'ultimo duello">La fotografia che vince l'ultimo duello della fase eliminatoria.</Winner>
        <Winner number="02" title="Campione di vittorie consecutive">La fotografia che registra la striscia più lunga di vittorie consecutive durante il mese. In caso di parità, prevale l'opera con il maggior numero di voti totali.</Winner>
        <Winner number="03" title="Premio della piattaforma">L'immagine selezionata a insindacabile giudizio del team editoriale di Unseen per merito tecnico, artistico o compositivo.</Winner>
      </div>
    ),
  },
  {
    number: "05",
    title: "Arena dei Campioni e Galleria",
    icon: Trophy,
    eyebrow: "Dal 1° al 14 del mese",
    content: (
      <div className="space-y-4">
        <Rule label="Arena dei Campioni">I tre vincitori della stagione precedente si sfidano nell'Arena dei Campioni sotto il voto degli utenti registrati.</Rule>
        <Rule label="Foto del Mese">La fotografia prima classificata ottiene il titolo ufficiale di “Foto del Mese” e la posizione d'onore principale nella Galleria Digitale.</Rule>
        <Rule label="Le altre finaliste">Le altre due fotografie vincitrici vengono posizionate nello spazio immediatamente sottostante.</Rule>
      </div>
    ),
  },
  {
    number: "06",
    title: "Fair play e anti-bot",
    icon: ShieldCheck,
    content: (
      <div className="space-y-4">
        <Rule label="Account registrato">Può votare solo chi possiede un account registrato su Unseen.</Rule>
        <Rule label="Un voto per duello">Ogni account può esprimere un solo voto per ciascun duello.</Rule>
        <Rule label="Divieto di manipolazione">Sono vietati bot, account falsi o multipli, script automatizzati e gruppi di scambio voti artificiali. Unseen può annullare voti sospetti o squalificare gli utenti che violano il fair play.</Rule>
      </div>
    ),
  },
  {
    number: "07",
    title: "Diritti d'autore e licenza d'uso",
    icon: Copyright,
    content: (
      <div className="space-y-4">
        <Rule label="Titolarità">L'autore conserva il 100% del copyright e della proprietà intellettuale della propria fotografia.</Rule>
        <Rule label="Licenza di promozione">Caricando una foto, l'utente concede a Unseen una licenza non esclusiva e gratuita per mostrare l'immagine sul sito e promuovere la community sui canali social ufficiali, citando sempre i crediti dell'autore.</Rule>
        <Rule label="Nessuna cessione">Unseen non venderà né cederà a terzi le fotografie degli utenti senza una preventiva autorizzazione scritta.</Rule>
      </div>
    ),
  },
];

const Regolamento = () => (
  <RegolamentoContent />
);

const RegolamentoContent = () => {
  const { t, list } = useI18n();
  const articleTitles = list<{ title: string }>("rules.articles");
  return <main className="min-h-screen bg-background px-4 pb-20 pt-28 sm:px-6 sm:pt-36">
    <div className="mx-auto max-w-5xl">
      <motion.header initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mb-14 max-w-3xl">
        <p className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("rules.eyebrow")}</p>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground sm:text-6xl">{t("rules.title")}</h1>
        <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-muted-foreground sm:text-lg">{t("rules.intro")}</p>
      </motion.header>

      <section className="mb-16 grid gap-3 sm:grid-cols-3">
        <Highlight icon={Users} title={t("rules.account")} text={t("rules.accountText")} />
        <Highlight icon={Camera} title={t("rules.monthlyPhoto")} text={t("rules.monthlyPhotoText")} />
        <Highlight icon={Check} title={t("rules.oneVote")} text={t("rules.oneVoteText")} />
      </section>

      <nav aria-label="Indice del regolamento" className="mb-16 border-y border-border/60 py-6">
        <p className="mb-4 font-body text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">{t("rules.index")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {articles.map((article, index) => <a key={article.number} href={`#articolo-${article.number}`} className="font-display text-sm text-muted-foreground transition-colors hover:text-primary">{article.number} · {articleTitles[index]?.title ?? article.title}</a>)}
        </div>
      </nav>

      <div className="space-y-5">
        {articles.map((article, index) => {
          const Icon = article.icon;
          return (
            <motion.article key={article.number} id={`articolo-${article.number}`} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.03 }} className="scroll-mt-28 rounded-2xl border border-border/60 bg-card/45 p-6 shadow-sm sm:p-9">
              <div className="flex gap-5 sm:gap-8">
                <div className="flex shrink-0 flex-col items-center gap-3"><span className="font-display text-sm font-bold text-primary">{article.number}</span><span className="h-full w-px bg-border/70" /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-6 flex items-start justify-between gap-4"><div><p className="mb-2 font-body text-[10px] uppercase tracking-[0.22em] text-primary/80">Articolo {article.number}{article.eyebrow ? ` · ${article.eyebrow}` : ""}</p><h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{articleTitles[index]?.title ?? article.title}</h2></div><Icon className="hidden h-7 w-7 shrink-0 text-primary/70 sm:block" strokeWidth={1.5} /></div>
                  <div className="font-body text-sm leading-7 text-muted-foreground sm:text-base">{article.content}</div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <footer className="mt-14 border-t border-border/60 pt-8 text-sm text-muted-foreground"><p>{t("rules.accepted")}</p><a href="/submit" className="mt-4 inline-flex items-center gap-2 font-display font-semibold text-primary transition-colors hover:text-foreground">{t("rules.sendPhoto")} <ArrowUpRight size={16} /></a></footer>
    </div>
  </main>;
};

function Rule({ label, children }: { label: string; children: ReactNode }) {
  return <div className="border-l-2 border-primary/30 pl-4"><p className="font-display text-sm font-semibold text-foreground">{label}</p><p className="mt-1">{children}</p></div>;
}

function Winner({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <div className="flex gap-4"><span className="font-display text-sm font-bold text-primary">{number}</span><div><p className="font-display font-semibold text-foreground">{title}</p><p className="mt-1">{children}</p></div></div>;
}
const Highlight = ({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) => <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-5"><Icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.7} /><p className="font-display font-semibold text-foreground">{title}</p><p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground">{text}</p></div>;

export default Regolamento;
