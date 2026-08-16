import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

/**
 * CoachMark — one-time creator guidance. A quiet glass card with a 1–2
 * sentence tip that shows once per `id` and never again after dismissal
 * (localStorage). Drop it at the top of any surface where a creator is
 * about to do the thing the tip is about.
 */
export function CoachMark({ id, children }: { id: string; children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(`coachmark:${id}`)) setShow(true);
  }, [id]);

  function dismiss() {
    try { localStorage.setItem(`coachmark:${id}`, '1'); } catch {}
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="mb-4 rounded-2xl border border-accent-cyan/25 bg-accent-cyan/[0.07] backdrop-blur-xl px-4 py-3 flex items-start gap-2.5"
        >
          <Sparkles className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
          <p className="text-white/80 text-[13px] leading-relaxed flex-1">{children}</p>
          <button
            onClick={dismiss}
            aria-label="Dismiss tip"
            className="w-8 h-8 -mr-1 -mt-1 rounded-full flex items-center justify-center flex-shrink-0 text-white/40 hover:text-white/70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
