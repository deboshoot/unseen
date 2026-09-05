import { motion } from "framer-motion";
import { Camera, Swords, Trophy, Image, Medal, Star } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "Invia la tua opera",
    description: "Ogni fotografo può inviare la propria opera migliore. Carica la tua foto con titolo, descrizione e il tuo profilo social.",
  },
  {
    icon: Swords,
    title: "Il duello quotidiano",
    description: "Ogni giorno, due fotografie vengono selezionate dal nostro team e messe una contro l'altra nell'Arena. Il pubblico vota.",
  },
  {
    icon: Trophy,
    title: "Il vincitore sfida il prossimo",
    description: "L'opera con più voti rimane e si scontra con un nuovo sfidante il giorno seguente. La catena continua per tutto il mese.",
  },
  {
    icon: Image,
    title: "Galleria permanente",
    description: "L'opera che vince l'ultima domenica del mese entra nella Galleria permanente di UNSEEN — esposta come un vero capolavoro digitale.",
  },
];

const awards = [
  {
    icon: Trophy,
    label: "01 · Campione finale",
    title: "Vincitore del campionato",
    description: "Il premio va all'opera che arriva fino alla fine del campionato e vince l'ultimo duello del mese.",
  },
  {
    icon: Medal,
    label: "02 · Resistenza",
    title: "Vincitore delle vittorie consecutive",
    description: "Riconosciamo l'opera che costruisce la serie più lunga di vittorie consecutive nell'Arena durante il mese.",
  },
  {
    icon: Star,
    label: "03 · Scelta editoriale",
    title: "Scelto da Unseen",
    description: "Il team Unseen assegna un premio speciale all'opera che interpreta meglio la nostra visione artistica.",
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen marble-bg pt-24 pb-20 px-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-[0.2em] text-foreground">
            COME FUNZIONA
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mt-3 font-body">
            Quattro passi verso la galleria
          </p>
        </motion.div>

        <div className="relative">
          {/* Vertical line connector */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-primary/20 to-transparent hidden md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-start gap-8 mb-16 ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                <div className={`glass rounded-xl p-8 glow-primary ${i % 2 === 0 ? "md:mr-12" : "md:ml-12"}`}>
                  <step.icon className="w-8 h-8 text-primary mb-4" strokeWidth={1.5} />
                  <h3 className="font-display text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>

              {/* Step number */}
              <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full glass border border-primary/30 text-primary font-display font-bold text-sm flex-shrink-0">
                {i + 1}
              </div>

              <div className="flex-1 hidden md:block" />
            </motion.div>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mt-8"
        >
          <div className="mb-8 text-center">
            <p className="text-primary text-xs font-body uppercase tracking-[0.3em]">Ogni mese</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3">Tre vincitori, tre storie</h2>
            <p className="text-muted-foreground font-body text-sm leading-relaxed max-w-xl mx-auto mt-4">
              Il campionato premia risultati, costanza e sensibilità artistica. Le tre opere entrano insieme nell'archivio della Galleria Unseen.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {awards.map((award, index) => (
              <motion.article
                key={award.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass rounded-xl border border-primary/15 p-6"
              >
                <award.icon className="mb-5 h-8 w-8 text-primary" strokeWidth={1.5} />
                <p className="font-body text-[10px] uppercase tracking-[0.22em] text-primary/80">{award.label}</p>
                <h3 className="mt-3 font-display text-xl font-bold text-foreground">{award.title}</h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">{award.description}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default HowItWorks;
