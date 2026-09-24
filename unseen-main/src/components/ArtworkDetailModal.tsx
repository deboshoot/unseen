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
  immersive?: boolean;
  /** Area fissa in basso nel pannello (es. voto) — resta visibile mentre si scrolla il testo sopra */
  footer?: React.ReactNode;
};

/**
 * Desktop: immagine grande a sinistra, contenuto in pannello ad alto contrasto a destra.
 * Mobile: stesso stile, foto sopra e scroll per le info sotto.
 */
export function ArtworkDetailModal({
  open,
  onClose,
  imageSrc,
  imageAlt,
  titleId = "artwork-detail-title",
  children,
  immersive = false,
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
          className={`fixed inset-0 z-[80] flex min-h-full flex-col items-stretch justify-start overflow-y-auto overscroll-contain ${immersive ? "p-0" : "p-3 pb-10 pt-14 sm:p-4 sm:pt-16 md:items-center md:justify-center md:p-6 md:py-10"}`}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/82 backdrop-blur-2xl" aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={immersive ? "relative z-10 flex min-h-full w-full items-start justify-center" : "relative z-10 mx-auto my-auto w-full max-w-6xl"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className={immersive ? "absolute right-4 top-4 z-30 rounded-full bg-black/55 px-3 py-1.5 font-body text-xs tracking-wider text-white backdrop-blur-md transition-colors hover:bg-black/75 sm:right-6 sm:top-6 sm:text-sm" : "absolute -top-10 right-1 z-30 rounded-full border border-border/80 bg-background/85 px-3 py-1.5 font-body text-xs tracking-wider text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background sm:-top-11 sm:right-0 sm:text-sm"}
            >
              CHIUDI ✕
            </button>

            {immersive ? (
              <div className="flex min-h-full w-full flex-col bg-black/90 text-white">
                <div className="flex w-full items-center justify-center px-3 pb-4 pt-16 sm:px-8 sm:pb-5">
                  <img
                    src={imageSrc}
                    alt={imageAlt}
                    decoding="async"
                    className="max-h-[calc(100dvh-8rem)] max-w-full object-contain"
                  />
                </div>
                <div className="w-full bg-[#080d16] px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-6">
                  <div className="mx-auto max-w-2xl space-y-4">{children}{footer}</div>
                </div>
              </div>
            ) : (
            <div className="artwork-detail-shell flex flex-col overflow-hidden rounded-[1.35rem] md:max-h-[min(90vh,920px)] md:flex-row md:items-stretch">
              {/* Immagine: sopra su mobile, sinistra su desktop (più spazio) */}
              <div className="relative flex min-h-[min(38vh,360px)] w-full flex-shrink-0 items-center justify-center bg-neutral-950/95 px-3 py-5 sm:min-h-[min(42vh,400px)] md:min-h-0 md:min-w-0 md:flex-[1.2] md:self-stretch md:px-5 md:py-8">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  decoding="async"
                  className="h-auto w-full max-h-[min(52vh,520px)] object-contain md:max-h-[min(90vh,920px)] md:w-auto md:max-w-full"
                />
              </div>

              {/* Pannello ad alto contrasto: contenuto scrollabile + footer fisso in basso */}
              <div className="artwork-detail-panel flex min-h-0 w-full flex-col md:max-h-[min(90vh,920px)] md:w-[min(420px,40%)] md:flex-shrink-0 lg:w-[min(440px,38%)]">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-5 p-6 sm:p-8 md:py-9">{children}</div>
                </div>
                {footer ? (
                  <div className="artwork-detail-footer shrink-0 p-4 md:rounded-br-[1.35rem]">
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
