import { motion } from "framer-motion";
import { Camera, Swords, Trophy, Image } from "lucide-react";

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
      </div>
    </div>
  );
};

export default HowItWorks;
