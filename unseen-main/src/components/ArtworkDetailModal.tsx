import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export type ArtworkDetailModalProps = {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
  titleId?: string;
  children: React.ReactNode;
  /** Area fissa in basso nel pannello (es. voto) — resta visibile mentre si scrolla il testo sopra */
  footer?: React.ReactNode;
};

/**
 * Desktop: immagine grande a sinistra, contenuto in pannello glass a destra.
 * Mobile: stesso stile, foto sopra e scroll per le info sotto (glass).
 */
export function ArtworkDetailModal({
  open,
  onClose,
  imageSrc,
  imageAlt,
  titleId = "artwork-detail-title",
  children,
  footer,
}: ArtworkDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex min-h-full flex-col items-stretch justify-start overflow-y-auto overscroll-contain p-3 pb-10 pt-14 sm:p-4 sm:pt-16 md:items-center md:justify-center md:p-6 md:py-10"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/82 backdrop-blur-2xl" aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mx-auto my-auto w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-10 right-1 z-30 rounded-full border border-border/80 bg-background/85 px-3 py-1.5 font-body text-xs tracking-wider text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background sm:-top-11 sm:right-0 sm:text-sm"
            >
              CHIUDI ✕
            </button>

            <div className="flex flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-black/30 shadow-[0_32px_90px_-28px_rgba(0,0,0,0.85)] backdrop-blur-sm md:max-h-[min(90vh,920px)] md:flex-row md:items-stretch">
              {/* Immagine: sopra su mobile, sinistra su desktop (più spazio) */}
              <div className="relative flex min-h-[min(38vh,360px)] w-full flex-shrink-0 items-center justify-center bg-neutral-950/95 px-3 py-5 sm:min-h-[min(42vh,400px)] md:min-h-0 md:min-w-0 md:flex-[1.2] md:self-stretch md:px-5 md:py-8">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  decoding="async"
                  className="h-auto w-full max-h-[min(52vh,520px)] object-contain md:max-h-[min(90vh,920px)] md:w-auto md:max-w-full"
                />
              </div>

              {/* Pannello glass: contenuto scrollabile + footer fisso in basso */}
              <div className="glass-apple flex min-h-0 w-full flex-col md:max-h-[min(90vh,920px)] md:w-[min(420px,40%)] md:flex-shrink-0 lg:w-[min(440px,38%)]">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-5 p-6 sm:p-8 md:py-9">{children}</div>
                </div>
                {footer ? (
                  <div className="shrink-0 border-t border-border/40 bg-background/40 p-4 backdrop-blur-md md:rounded-br-[1.35rem]">
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
